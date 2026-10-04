import { supabase, isSupabaseConfigured } from './supabaseClient';
import { FIELD_OBSERVATION_IMAGE_BUCKET } from './fieldObservationStorage';
import { upsertPruningItem } from './db';
import type {
  PruningExecutionStatus,
  PruningHistoryItem,
  PruningOutcomeAIReview,
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

function extractJson<T>(text:string,fallback:T):T{
  const cleaned=String(text||'').trim().replace(/^\`\`\`(?:json)?/i,'').replace(/\`\`\`$/,'').trim();
  try{return JSON.parse(cleaned) as T;}catch{}
  const start=cleaned.indexOf('{');
  const end=cleaned.lastIndexOf('}');
  if(start>=0&&end>start){
    try{return JSON.parse(cleaned.slice(start,end+1)) as T;}catch{}
  }
  return fallback;
}

function normalizeAIReview(raw:any):PruningOutcomeAIReview{
  const quality:PruningOutcomeAIReview['observationQuality']=
    raw?.observationQuality==='GOOD'||raw?.observationQuality==='LIMITED'||raw?.observationQuality==='INSUFFICIENT'
      ?raw.observationQuality:'LIMITED';
  const stepEvidence=Array.isArray(raw?.stepEvidence)?raw.stepEvidence.slice(0,10).map((item:any)=>({
    index:Math.max(0,Math.floor(Number(item?.index)||0)),
    status:item?.status==='SUPPORTED'||item?.status==='NOT_VISIBLE'||item?.status==='CONTRADICTED'||item?.status==='UNCERTAIN'
      ?item.status:'UNCERTAIN',
    evidence:String(item?.evidence||'').slice(0,500),
  })):[];
  return{
    observationQuality:quality,
    confidence:Math.max(0,Math.min(100,Math.round(Number(raw?.confidence)||0))),
    summary:String(raw?.summary||'Ingen sikker visuell ettervurdering.').slice(0,1000),
    visibleChanges:Array.isArray(raw?.visibleChanges)?raw.visibleChanges.map(String).slice(0,10):[],
    canopyChange:String(raw?.canopyChange||'Ikke sikkert vurdert').slice(0,600),
    structuralBalance:String(raw?.structuralBalance||'Ikke sikkert vurdert').slice(0,600),
    lightPenetration:String(raw?.lightPenetration||'Ikke sikkert vurdert').slice(0,600),
    stepEvidence,
    concerns:Array.isArray(raw?.concerns)?raw.concerns.map(String).slice(0,8):[],
    nextObservations:Array.isArray(raw?.nextObservations)?raw.nextObservations.map(String).slice(0,8):[],
  };
}

function visionImage(value:string,label:string){
  return value.startsWith('data:')
    ?{data:value,mimeType:value.match(/^data:([^;,]+)/)?.[1]||'image/jpeg',label}
    :{url:value,mimeType:'image/jpeg',label};
}

async function analyzePruningBeforeAfter(
  item:PruningHistoryItem,
  afterUrls:string[],
):Promise<PruningOutcomeAIReview|undefined>{
  if(!isSupabaseConfigured||!afterUrls.length||!(item.images||[]).length)return undefined;

  const prompt=`Du er VISUELL ETTERKONTROLLØR for olivenbeskjæring. Du sammenligner FØR- og ETTER-bilder, men du har ikke lov til å fastslå hva som faktisk ble utført utover det som kan sees.

PLANEN SOM BLE FORESLÅTT:
${JSON.stringify(item.plan||{},null,2)}

Regler:
- Før-bilder og etter-bilder er eksplisitt merket.
- Beskriv kun synlige endringer mellom bildesettene.
- Ikke erklær beskjæringen "vellykket", "riktig utført" eller agronomisk korrekt alene. Menneskelig verifisert utfallsfasit er sannheten.
- Perspektiv, lys, zoom og sesong kan skape falske forskjeller. Marker slike begrensninger.
- For hvert foreslått pruningStep: SUPPORTED bare når etterbildet tydelig støtter at den synlige strukturen er endret i tråd med rådet. NOT_VISIBLE når området ikke kan kontrolleres. CONTRADICTED bare ved tydelig synlig motstrid. Ellers UNCERTAIN.
- Vurder kroneåpning, lysinnslipp og strukturell balanse forsiktig; ikke gjett på usynlige snitt.
- Gi konkrete forslag til neste observasjon/bilde dersom kontrollen er svak.

Returner KUN JSON:
{
  "observationQuality":"GOOD|LIMITED|INSUFFICIENT",
  "confidence":0,
  "summary":"kort nøytral sammenligning",
  "visibleChanges":["synlig endring"],
  "canopyChange":"...",
  "structuralBalance":"...",
  "lightPenetration":"...",
  "stepEvidence":[
    {"index":0,"status":"SUPPORTED|NOT_VISIBLE|CONTRADICTED|UNCERTAIN","evidence":"synlig grunnlag"}
  ],
  "concerns":["begrensning eller mulig problem"],
  "nextObservations":["konkret neste bilde/kontroll"]
}`;

  const images=[
    ...(item.images||[]).slice(0,3).map((value,index)=>visionImage(value,'FØR · bilde '+(index+1))),
    ...afterUrls.slice(0,3).map((value,index)=>visionImage(value,'ETTER · bilde '+(index+1))),
  ];
  const {data,error}=await supabase.functions.invoke('olivia-vision',{body:{prompt,images}});
  if(error)throw new Error(error.message||'Visuell etterkontroll feilet.');
  if(data?.error)throw new Error(Array.isArray(data.details)?data.details.join(' | '):String(data.error));
  const parsed=extractJson<any>(String(data?.text||''),{});
  return normalizeAIReview(parsed);
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

  const allAfterUrls=[...(item.afterImages||[]),...afterUrls].slice(-6);
  let outcomeAiReview=item.outcomeAiReview;
  if(input.executionStatus!=='cancelled'&&allAfterUrls.length){
    try{
      outcomeAiReview=await analyzePruningBeforeAfter(item,allAfterUrls);
    }catch(error){
      console.warn('[pruningOutcome] visual after-review unavailable; human outcome remains authoritative',error);
    }
  }else if(input.executionStatus==='cancelled'){
    outcomeAiReview=undefined;
  }

  const updated:PruningHistoryItem={
    ...item,
    executionStatus:input.executionStatus,
    completedAt,
    afterImages:allAfterUrls,
    outcomeRating:input.executionStatus==='cancelled'?undefined:input.outcomeRating,
    outcomeNotes:input.outcomeNotes?.trim()||undefined,
    stepFeedback:(input.stepFeedback||[]).filter(entry=>entry.status),
    outcomeVerifiedAt:verifiedAt,
    outcomeAiReview,
  };

  await upsertPruningItem(updated);
  await syncFarmTruth(updated);
  return updated;
}
