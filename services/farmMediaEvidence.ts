import { supabase, isSupabaseConfigured } from './supabaseClient';
import { FIELD_OBSERVATION_IMAGE_BUCKET } from './fieldObservationStorage';
import type { FarmGeoContext } from './farmGeo';

export type FarmMediaSourceModule=
  |'field_observation'
  |'field_consultant'
  |'pruning'
  |'pruning_outcome'
  |'variety_reference'
  |'farm_journal'
  |string;

function makeId(prefix:string){
  if(typeof crypto!=='undefined'&&'randomUUID' in crypto)return prefix+'-'+crypto.randomUUID();
  return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
}

function safePart(value?:string|null){
  return String(value||'farm')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9-_]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,70)||'farm';
}

async function dataUrlToBlob(dataUrl:string){
  const match=dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/);
  if(!match)throw new Error('Ugyldig bildeformat.');
  const mime=match[1]||'image/jpeg';
  const binary=atob(match[2]);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}

export async function uploadDataUrlFarmMedia(input:{
  images:string[];
  sourceModule:FarmMediaSourceModule;
  sourceRef:string;
  parcelId?:string;
}):Promise<string[]>{
  if(!input.images.length)return[];
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const dateFolder=new Date().toISOString().slice(0,10);
  const urls:string[]=[];
  for(let i=0;i<Math.min(input.images.length,8);i++){
    const value=input.images[i];
    if(/^https?:\/\//i.test(value)){urls.push(value);continue;}
    const blob=await dataUrlToBlob(value);
    const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
    const path='agent-evidence/'+dateFolder+'/'+safePart(input.sourceModule)+'/'+safePart(input.parcelId)+'/'+safePart(input.sourceRef)+'/'+String(i+1).padStart(2,'0')+'-'+makeId('img')+'.'+ext;
    const {error}=await supabase.storage.from(FIELD_OBSERVATION_IMAGE_BUCKET).upload(path,blob,{
      contentType:blob.type||'image/jpeg',
      cacheControl:'86400',
      upsert:false,
    });
    if(error)throw new Error('Kunne ikke lagre gårdsbilde: '+error.message);
    const {data}=supabase.storage.from(FIELD_OBSERVATION_IMAGE_BUCKET).getPublicUrl(path);
    if(data.publicUrl)urls.push(data.publicUrl);
  }
  return urls;
}

export async function registerFarmMediaEvidence(input:{
  urls:string[];
  sourceModule:FarmMediaSourceModule;
  sourceRef?:string;
  parcelId?:string;
  zoneId?:string;
  geo?:FarmGeoContext|null;
  metadata?:Record<string,unknown>;
  createdBy?:string;
}){
  if(!input.urls.length||!isSupabaseConfigured)return;
  const parcelId=input.parcelId||input.geo?.parcelId||null;
  const rows=input.urls.map((url,index)=>({
    id:makeId('media'),
    media_url:url,
    media_kind:'photo',
    source_module:input.sourceModule,
    source_ref:input.sourceRef||null,
    parcel_id:parcelId,
    zone_id:input.zoneId||null,
    lat:input.geo?.lat??null,
    lon:input.geo?.lon??null,
    accuracy_m:input.geo?.accuracyM??null,
    altitude_m:input.geo?.altitudeM??null,
    heading_deg:input.geo?.headingDeg??null,
    geo_captured_at:input.geo?.capturedAt??null,
    geo_source:input.geo?.source||'none',
    match_method:input.geo?.matchMethod||'unmatched',
    match_distance_m:input.geo?.matchDistanceM??null,
    match_confidence:input.geo?.matchConfidence??null,
    metadata:{imageIndex:index,...(input.metadata||{})},
    created_by:input.createdBy||null,
  }));
  const {error}=await supabase.from('farm_media_evidence').insert(rows);
  if(error)throw new Error(error.message);
}

export function geoContextToDb(geo?:FarmGeoContext|null){
  if(!geo)return null;
  return{
    lat:geo.lat,
    lon:geo.lon,
    accuracy_m:geo.accuracyM,
    altitude_m:geo.altitudeM??null,
    heading_deg:geo.headingDeg??null,
    captured_at:geo.capturedAt,
    source:geo.source,
    parcel_id:geo.parcelId??null,
    parcel_name:geo.parcelName??null,
    match_method:geo.matchMethod,
    match_distance_m:geo.matchDistanceM??null,
    match_confidence:geo.matchConfidence,
    ambiguous_parcel_ids:geo.ambiguousParcelIds||[],
  };
}
