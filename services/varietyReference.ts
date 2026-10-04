import { supabase, isSupabaseConfigured } from './supabaseClient';
import { FIELD_OBSERVATION_IMAGE_BUCKET } from './fieldObservationStorage';
import type { OliveInspectionResult } from './geminiService';

export type OliveVarietyReference={
  id:string;
  parcel_id?:string|null;
  tree_label?:string|null;
  variety_name:string;
  status:'confirmed'|'provisional'|'rejected';
  confidence:number;
  inspection_json:OliveInspectionResult|Record<string,unknown>;
  image_urls:string[];
  source_assessment_id?:string|null;
  notes?:string|null;
  confirmed_at:string;
  created_at:string;
  updated_at:string;
};

export type VarietyReferenceQuality={
  score:number;
  grade:'strong'|'usable'|'weak';
  eligibleForVisualMatching:boolean;
  strengths:string[];
  missing:string[];
};

export function canonicalVarietyName(value:string){
  const normalized=String(value||'')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .trim();
  if(normalized==='gordal'||normalized==='gordal sevillana')return'Gordal Sevillana';
  if(normalized==='genovesa'||normalized==='genoesa')return'Genovesa';
  if(normalized==='changlot'||normalized==='changlot real')return'Changlot Real';
  if(normalized==='picual')return'Picual';
  return String(value||'').trim();
}

export function scoreReferenceEvidence(
  inspectionInput?:Partial<OliveInspectionResult>|Record<string,unknown>|null,
  imageCount=0,
):VarietyReferenceQuality{
  const inspection=(inspectionInput||{}) as Partial<OliveInspectionResult>;
  const visible=inspection.visibleOrgans||{} as OliveInspectionResult['visibleOrgans'];
  const observations=Array.isArray(inspection.observations)?inspection.observations:[];
  const fruitTraits=Array.isArray(inspection.fruitTraits)?inspection.fruitTraits:[];
  const endocarpTraits=Array.isArray(inspection.endocarpTraits)?inspection.endocarpTraits:[];

  let score=0;
  const strengths:string[]=[];
  const missing:string[]=[];

  if(inspection.imageQuality==='GOOD'){score+=20;strengths.push('god bildekvalitet');}
  else if(inspection.imageQuality==='LIMITED'){score+=8;}
  else missing.push('bedre skarpe bilder');

  if(imageCount>=3){score+=15;strengths.push('flere vinkler');}
  else if(imageCount>=1){score+=5;missing.push('minst 3 komplementære bilder');}
  else missing.push('referansebilder');

  if(visible.wholeTree){score+=5;strengths.push('heltre');}
  else missing.push('heltre');

  if(visible.trunk){score+=5;}
  if(visible.leaves){score+=15;strengths.push('bladverk');}
  else missing.push('tydelig bladverk');

  if(visible.fruit){score+=20;strengths.push('frukt');}
  if(visible.endocarp){score+=25;strengths.push('stein/endokarp');}

  if(observations.length>=3)score+=5;
  if(fruitTraits.length>=2)score+=5;
  if(endocarpTraits.length>=1)score+=5;

  if(!visible.fruit&&!visible.endocarp)missing.push('frukt eller stein/endokarp for sikker sortsammenligning');

  score=Math.max(0,Math.min(100,score));
  const eligibleForVisualMatching=
    score>=60
    && Boolean(visible.leaves)
    && Boolean(visible.fruit||visible.endocarp)
    && imageCount>=1;

  const grade:VarietyReferenceQuality['grade']=
    eligibleForVisualMatching&&score>=75?'strong'
      :score>=45?'usable'
      :'weak';

  return{
    score,
    grade,
    eligibleForVisualMatching,
    strengths:Array.from(new Set(strengths)).slice(0,8),
    missing:Array.from(new Set(missing)).slice(0,8),
  };
}

export function scoreVarietyReference(ref:OliveVarietyReference):VarietyReferenceQuality{
  return scoreReferenceEvidence(
    ref.inspection_json as Partial<OliveInspectionResult>,
    Array.isArray(ref.image_urls)?ref.image_urls.length:0,
  );
}

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
    .slice(0,60)||'farm';
}

async function dataUrlToBlob(dataUrl:string):Promise<Blob>{
  const match=dataUrl.match(/^data:([^;,]+)?;base64,(.+)$/);
  if(!match)throw new Error('Ugyldig bildeformat for sortsreferanse.');
  const mime=match[1]||'image/jpeg';
  const binary=atob(match[2]);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}

async function uploadReferenceImages(dataUrls:string[],referenceId:string,parcelId?:string){
  if(!dataUrls.length)return[];
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const dateFolder=new Date().toISOString().slice(0,10);
  const parcelFolder=safePart(parcelId);
  const urls:string[]=[];
  for(let i=0;i<Math.min(dataUrls.length,5);i++){
    const blob=await dataUrlToBlob(dataUrls[i]);
    const ext=blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg';
    const path=`variety-references/${dateFolder}/${parcelFolder}/${safePart(referenceId)}/${String(i+1).padStart(2,'0')}.${ext}`;
    const {error}=await supabase.storage.from(FIELD_OBSERVATION_IMAGE_BUCKET).upload(path,blob,{
      contentType:blob.type||'image/jpeg',
      cacheControl:'86400',
      upsert:false,
    });
    if(error)throw new Error('Kunne ikke lagre referansebilde: '+error.message);
    const {data}=supabase.storage.from(FIELD_OBSERVATION_IMAGE_BUCKET).getPublicUrl(path);
    if(data.publicUrl)urls.push(data.publicUrl);
  }
  return urls;
}

export async function saveConfirmedVarietyReference(input:{
  varietyName:string;
  parcelId?:string;
  treeLabel?:string;
  inspection?:OliveInspectionResult;
  images:string[];
  sourceAssessmentId?:string|null;
  notes?:string;
}):Promise<OliveVarietyReference>{
  const varietyName=input.varietyName.trim();
  if(!varietyName)throw new Error('Velg eller skriv inn bekreftet olivensort.');
  const id=makeId('variety-ref');
  const imageUrls=await uploadReferenceImages(input.images,id,input.parcelId);
  const row={
    id,
    parcel_id:input.parcelId||null,
    tree_label:input.treeLabel?.trim()||null,
    variety_name:varietyName,
    status:'confirmed',
    confidence:1,
    inspection_json:input.inspection||{},
    image_urls:imageUrls,
    source_assessment_id:input.sourceAssessmentId||null,
    notes:input.notes?.trim()||null,
    confirmed_at:new Date().toISOString(),
    updated_at:new Date().toISOString(),
  };
  const {data,error}=await supabase.from('olive_variety_references').insert(row).select('*').single();
  if(error)throw new Error(error.message);
  return data as OliveVarietyReference;
}

export async function fetchConfirmedVarietyReferences(limit=80):Promise<OliveVarietyReference[]>{
  const {data,error}=await supabase.from('olive_variety_references')
    .select('*')
    .eq('status','confirmed')
    .order('confirmed_at',{ascending:false})
    .limit(limit);
  if(error)throw new Error(error.message);
  return(data||[]) as OliveVarietyReference[];
}

export async function fetchVarietyReferences(params:{status?:OliveVarietyReference['status']|'all';limit?:number}={}):Promise<OliveVarietyReference[]>{
  let query=supabase.from('olive_variety_references')
    .select('*')
    .order('confirmed_at',{ascending:false})
    .limit(params.limit||200);
  if(params.status&&params.status!=='all')query=query.eq('status',params.status);
  const {data,error}=await query;
  if(error)throw new Error(error.message);
  return(data||[]) as OliveVarietyReference[];
}

export async function updateVarietyReference(id:string,input:{
  varietyName?:string;
  treeLabel?:string|null;
  notes?:string|null;
  status?:OliveVarietyReference['status'];
}):Promise<OliveVarietyReference>{
  const patch:any={updated_at:new Date().toISOString()};
  if(input.varietyName!==undefined){
    const clean=input.varietyName.trim();
    if(!clean)throw new Error('Sort kan ikke være tom.');
    patch.variety_name=clean;
  }
  if(input.treeLabel!==undefined)patch.tree_label=input.treeLabel?.trim()||null;
  if(input.notes!==undefined)patch.notes=input.notes?.trim()||null;
  if(input.status!==undefined){
    patch.status=input.status;
    if(input.status==='confirmed'){
      patch.confidence=1;
      patch.confirmed_at=new Date().toISOString();
    }
  }
  const {data,error}=await supabase.from('olive_variety_references')
    .update(patch)
    .eq('id',id)
    .select('*')
    .single();
  if(error)throw new Error(error.message);
  return data as OliveVarietyReference;
}

export async function buildVarietyReferenceContext(parcelId?:string):Promise<string>{
  const rows=await fetchConfirmedVarietyReferences(60);
  if(!rows.length)return'';
  const ranked=[...rows].sort((a,b)=>{
    const aLocal=a.parcel_id&&parcelId&&a.parcel_id===parcelId?1:0;
    const bLocal=b.parcel_id&&parcelId&&b.parcel_id===parcelId?1:0;
    const aq=scoreVarietyReference(a).score;
    const bq=scoreVarietyReference(b).score;
    return bLocal-aLocal||bq-aq||String(b.confirmed_at).localeCompare(String(a.confirmed_at));
  }).slice(0,20);
  const lines=['BEKREFTET SORTSREFERANSER FRA DOÑA ANNA (bruk som gårdsspesifikk prior, men krev fortsatt synlige trekk):'];
  for(const row of ranked){
    const inspection=(row.inspection_json||{}) as OliveInspectionResult;
    const quality=scoreVarietyReference(row);
    const traits=[
      ...(Array.isArray(inspection.fruitTraits)?inspection.fruitTraits.slice(0,3):[]),
      ...(Array.isArray(inspection.endocarpTraits)?inspection.endocarpTraits.slice(0,3):[]),
      ...(Array.isArray(inspection.observations)?inspection.observations.slice(0,2):[]),
    ].filter(Boolean);
    const scope=row.parcel_id===parcelId?'SAMME PARSELL':'GÅRDSREFERANSE';
    const visual=quality.eligibleForVisualMatching?'VISUELL STERK':'KJENT SORT, SVAKERE BILDEGRUNNLAG';
    lines.push('- ['+scope+' · '+visual+' · '+quality.score+'/100] '+canonicalVarietyName(row.variety_name)+(row.tree_label?' · '+row.tree_label:'')+(traits.length?' · trekk: '+traits.join('; '):''));
  }
  lines.push('REGEL: Bekreftet sort er menneskelig gårdskunnskap. Visuelle trekk fra svake referansebilder skal ikke brukes som sterkt bildebevis. Direkte bilde-mot-bilde-sammenligning skal bare bruke referanser som består kvalitetsporten.');
  return lines.join('\n').slice(0,10000);
}
