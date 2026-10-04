import { supabase, isSupabaseConfigured } from './supabaseClient';
import { FIELD_OBSERVATION_IMAGE_BUCKET } from './fieldObservationStorage';
import { upsertPruningItem } from './db';
import type {
  PruningExecutionStatus,
  PruningHistoryItem,
  PruningOutcomeRating,
  PruningStepFeedback,
} from '../types';

function safePart(value?:string|null){
  return String(value||'farm')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9-_]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,70)||'farm';
}

async function dataUrlToBlob(dataUrl:string):Promise<Blob>{
  const match=dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/);
  if(!match)throw new Error('Ugyldig etterbilde.');
  const mime=match[1]||'image/jpeg';
  const binary=atob(match[2]);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}

async function uploadOutcomeImages(
  dataUrls:string[],
  historyId:string,
  parcelId?:string,
):Promise<string[]>{
  if(!dataUrls.length)return[];
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const dateFolder=new Date().toISOString().slice(0,10);
  const urls:string[]=[];

  for(let i=0;i<Math.min(dataUrls.length,3);i++){
    const blob=await dataUrlToBlob(dataUrls[i]);
    const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
    const randomPart=typeof crypto!=='undefined'&&'randomUUID' in crypto
      ?crypto.randomUUID()
      :Date.now()+'-'+Math.random().toString(36).slice(2,8);
    const path='pruning-outcomes/'+dateFolder+'/'+safePart(parcelId)+'/'+safePart(historyId)+'/'+randomPart+'.'+ext;
    const {error}=await supabase.storage.from(FIELD_OBSERVATION_IMAGE_BUCKET).upload(path,blob,{
      contentType:blob.type||'image/jpeg',
      cacheControl:'86400',
      upsert:false,
    });
    if(error)throw new Error('Kunne ikke lagre etterbilde: '+error.message);
    const {data}=supabase.storage.from(FIELD_OBSERVATION_IMAGE_BUCKET).getPublicUrl(path);
    if(data.publicUrl)urls.push(data.publicUrl);
  }
  return urls;
}

function isoTimestampFromDate(value:string){
  const clean=String(value||'').slice(0,10);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(clean))throw new Error('Velg dato for utfallet.');
  return new Date(clean+'T12:00:00').toISOString();
}

function feedbackSummary(feedback:PruningStepFeedback[]){
  const count=(status:PruningStepFeedback['status'])=>feedback.filter(item=>item.status===status).length;
  const parts=[
    count('performed')?count('performed')+' utført som foreslått':'',
    count('corrected')?count('corrected')+' endret':'',
    count('skipped')?count('skipped')+' ikke utført':'',
    count('not_applicable')?count('not_applicable')+' ikke relevant':'',
  ].filter(Boolean);
  return parts.join(', ');
}

async function syncFarmTruth(item:PruningHistoryItem){
  const sourceRef='pruning-history:'+item.id;
  const existing=await supabase.from('farm_events')
    .select('id')
    .eq('source_ref',sourceRef)
    .maybeSingle();
  if(existing.error)throw new Error(existing.error.message);

  if(item.executionStatus==='cancelled'||item.executionStatus==='planned'){
    if(existing.data?.id){
      const {error}=await supabase.from('farm_events').delete().eq('id',existing.data.id);
      if(error)throw new Error(error.message);
    }
    return;
  }

  const occurredOn=String(item.completedAt||'').slice(0,10);
  if(!occurredOn)return;

  const partial=item.executionStatus==='partly_completed';
  const stepText=feedbackSummary(item.stepFeedback||[]);
  const description=[
    partial?'Beskjæring registrert som delvis utført.':'Beskjæring bekreftet utført.',
    stepText?('Tiltaksfasit: '+stepText+'.'):'',
    item.outcomeNotes||'',
  ].filter(Boolean).join(' ');

  const row={
    title:(partial?'Beskjæring delvis utført':'Beskjæring utført')+' · '+(item.treeType||'oliventre'),
    event_type:'pruning',
    event_status:partial?'observed':'completed',
    occurred_on:occurredOn,
    planned_for:null,
    period_label:null,
    date_precision:'exact',
    parcel_id:item.parcelId||null,
    scope:item.parcelId?'parcel':'farm',
    description,
    source_document_id:null,
    source_kind:'user_confirmation',
    source_ref:sourceRef,
    vendor:null,
    products:[],
    amount:null,
    currency:'EUR',
    tree_count_delta:null,
    recurrence_candidate:true,
    recurrence_reason:'Menneskelig verifisert beskjæringsutfall i Olivia.',
    confidence:1,
    verified:true,
  };

  if(existing.data?.id){
    const {error}=await supabase.from('farm_events').update(row).eq('id',existing.data.id);
    if(error)throw new Error(error.message);
  }else{
    const {error}=await supabase.from('farm_events').insert({
      id:'farmevent-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
      ...row,
    });
    if(error)throw new Error(error.message);
  }
}

export async function removePruningOutcomeTruth(historyId:string){
  const sourceRef='pruning-history:'+historyId;
  const {error}=await supabase.from('farm_events').delete().eq('source_ref',sourceRef);
  if(error)throw new Error(error.message);
}

export async function savePruningOutcome(
  item:PruningHistoryItem,
  input:{
    executionStatus:Exclude<PruningExecutionStatus,'planned'>;
    outcomeDate:string;
    outcomeRating?:PruningOutcomeRating;
    outcomeNotes?:string;
    stepFeedback?:PruningStepFeedback[];
    afterImageDataUrls?:string[];
  },
):Promise<PruningHistoryItem>{
  const verifiedAt=new Date().toISOString();
  const afterUrls=await uploadOutcomeImages(
    input.afterImageDataUrls||[],
    item.id,
    item.parcelId,
  );

  const completedAt=input.executionStatus==='cancelled'
    ?undefined
    :isoTimestampFromDate(input.outcomeDate);

  const updated:PruningHistoryItem={
    ...item,
    executionStatus:input.executionStatus,
    completedAt,
    afterImages:[...(item.afterImages||[]),...afterUrls].slice(-6),
    outcomeRating:input.executionStatus==='cancelled'?undefined:input.outcomeRating,
    outcomeNotes:input.outcomeNotes?.trim()||undefined,
    stepFeedback:(input.stepFeedback||[]).filter(entry=>entry.status),
    outcomeVerifiedAt:verifiedAt,
  };

  await upsertPruningItem(updated);
  await syncFarmTruth(updated);
  return updated;
}
