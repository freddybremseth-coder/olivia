import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  canonicalVarietyName,
  fetchVarietyReferences,
  scoreVarietyReference,
  type OliveVarietyReference,
} from './varietyReference';

export type OliveVarietyEvaluation={
  id:string;
  reference_id:string;
  expected_variety:string;
  predicted_variety:string;
  confidence:number;
  is_correct:boolean;
  result_json:any;
  reference_count:number;
  model_label:string;
  created_at:string;
};

function makeId(prefix:string){
  if(typeof crypto!=='undefined'&&'randomUUID' in crypto)return prefix+'-'+crypto.randomUUID();
  return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
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

function confidencePercent(value:unknown){
  const n=Number(value||0);
  if(!Number.isFinite(n))return 0;
  return Math.max(0,Math.min(100,Math.round(n<=1?n*100:n)));
}

function varietyKey(value:string){
  const cleaned=String(value||'')
    .replace(/\([^)]*\)/g,' ')
    .replace(/\b(mulig|possible|probable|likely)\b/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
  return canonicalVarietyName(cleaned).toLowerCase();
}

async function trainingReferences(excludeReferenceId:string,parcelId?:string){
  const rows=await fetchVarietyReferences({status:'confirmed',limit:150});
  const candidates=rows
    .filter(row=>row.id!==excludeReferenceId)
    .map(row=>({row,quality:scoreVarietyReference(row)}))
    .filter(item=>item.quality.eligibleForVisualMatching)
    .sort((a,b)=>{
      const ap=parcelId&&a.row.parcel_id===parcelId?1:0;
      const bp=parcelId&&b.row.parcel_id===parcelId?1:0;
      return bp-ap||b.quality.score-a.quality.score||String(b.row.confirmed_at).localeCompare(String(a.row.confirmed_at));
    });

  const perVariety=new Map<string,number>();
  const selected:Array<{url:string;label:string}>=[];

  for(const item of candidates){
    const variety=canonicalVarietyName(item.row.variety_name);
    const key=variety.toLowerCase();
    if((perVariety.get(key)||0)>=2)continue;
    const urls=Array.isArray(item.row.image_urls)?item.row.image_urls.filter(Boolean):[];
    if(!urls.length)continue;
    selected.push({
      url:String(urls[0]),
      label:'BEKREFTET TRENINGREFERANSE · '+variety+' · kvalitet '+item.quality.score+'/100',
    });
    perVariety.set(key,(perVariety.get(key)||0)+1);
    if(selected.length>=6)break;
  }
  return selected;
}

export async function runBlindVarietyEvaluation(reference:OliveVarietyReference):Promise<OliveVarietyEvaluation>{
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  if(reference.status!=='confirmed')throw new Error('Bare bekreftede trær kan blindtestes.');

  const quality=scoreVarietyReference(reference);
  if(!quality.eligibleForVisualMatching){
    throw new Error('Bildesettet er ikke sterkt nok for en rettferdig blindtest.');
  }

  const testUrls=Array.isArray(reference.image_urls)?reference.image_urls.filter(Boolean).slice(0,3):[];
  if(!testUrls.length)throw new Error('Referansen mangler bilder.');

  const training=await trainingReferences(reference.id,reference.parcel_id||undefined);
  const prompt=`Du er en blind evaluator for olivensorter. FASITEN til testtreet er med vilje skjult.

De første bildene er merket UKJENT TESTTRE. De skal klassifiseres.
Eventuelle øvrige bilder er BEKREFTET TRENINGREFERANSE og har sort i etiketten.

Regler:
- Ikke anta at testtreet er en av treningsreferansene.
- Vurder konkrete morfologiske trekk: fruktform/størrelse, bladproporsjon, bladspiss/base, endokarp/stein når synlig, og vekstform kun som støtte.
- Frukt og endokarp veier mer enn kroneform.
- Hvis bildene ikke støtter sikker identifikasjon, returner "Ukjent/annen sort" eller lav sikkerhet.
- Ikke gi helse- eller beskjæringsråd. Dette er kun en blind sortsprøve.
- Rangér inntil fire kandidater.

Returner KUN JSON:
{
  "predictedVariety":"...",
  "confidence":0,
  "candidates":[
    {"name":"...","confidence":0,"supportingTraits":["..."],"contradictingTraits":["..."]}
  ],
  "reasoning":"kort begrunnelse basert på synlige trekk",
  "neededEvidence":["eventuelle bilder/organer som mangler"]
}`;

  const images=[
    ...testUrls.map((url,index)=>({url:String(url),mimeType:'image/jpeg',label:'UKJENT TESTTRE · bilde '+(index+1)})),
    ...training.map(item=>({url:item.url,mimeType:'image/jpeg',label:item.label})),
  ];

  const {data,error}=await supabase.functions.invoke('olivia-vision',{body:{prompt,images}});
  if(error)throw new Error(error.message||'Blindtest feilet.');
  if(data?.error)throw new Error(Array.isArray(data.details)?data.details.join(' | '):String(data.error));

  const parsed=extractJson<any>(String(data?.text||''),{});
  const predicted=String(parsed.predictedVariety||parsed.bestCandidate||'Ukjent/annen sort').trim();
  const confidence=confidencePercent(parsed.confidence);
  const expected=canonicalVarietyName(reference.variety_name);
  const isCorrect=Boolean(varietyKey(predicted)&&varietyKey(predicted)===varietyKey(expected));

  const row={
    id:makeId('variety-eval'),
    reference_id:reference.id,
    expected_variety:expected,
    predicted_variety:predicted,
    confidence,
    is_correct:isCorrect,
    result_json:{
      ...parsed,
      provider:data?.provider||null,
      testImageCount:testUrls.length,
      trainingReferenceCount:training.length,
      referenceQuality:quality.score,
    },
    reference_count:training.length,
    model_label:'expert-engine-blind-v1',
  };

  const inserted=await supabase.from('olive_variety_evaluations').insert(row).select('*').single();
  if(inserted.error)throw new Error(inserted.error.message);
  return inserted.data as OliveVarietyEvaluation;
}

export async function fetchVarietyEvaluations(limit=500):Promise<OliveVarietyEvaluation[]>{
  const {data,error}=await supabase.from('olive_variety_evaluations')
    .select('*')
    .order('created_at',{ascending:false})
    .limit(limit);
  if(error)throw new Error(error.message);
  return(data||[]) as OliveVarietyEvaluation[];
}
