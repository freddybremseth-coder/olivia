import { supabase } from './supabaseClient';
import { fileToBase64 } from './expenseCapture';
import { createFarmQuestion } from './farmIntelligence';

export type FarmDocumentKind =
  | 'invoice'|'receipt'|'quote'|'proforma'|'agronomy_plan'|'message'
  | 'photo'|'video'|'lab'|'rain_record'|'work_order'|'other';

export type FarmEvidenceStatus =
  | 'completed'|'planned'|'recommended'|'ordered'|'purchased'|'observed'|'unknown';

export type FarmEventStatus =
  | 'completed'|'planned'|'recommended'|'ordered'|'purchased'|'observed';

export type FarmEventType =
  | 'spraying'|'pruning'|'cultivation'|'desuckering'|'young_tree_care'|'planting'
  | 'fertilization'|'irrigation'|'rain'|'inspection'|'maintenance'|'harvest'
  | 'purchase'|'soil_work'|'pest_control'|'disease_control'|'training'|'other';

export type FarmProductEvidence = {
  name:string;
  composition?:string;
  purpose?:string;
  dose?:string;
  quantity?:number|null;
  unit?:string;
  organicNote?:string;
};

export type FarmScannedEvent = {
  eventType:FarmEventType;
  eventStatus:FarmEventStatus;
  title:string;
  description?:string;
  occurredOn?:string|null;
  plannedFor?:string|null;
  periodLabel?:string;
  datePrecision?:'exact'|'month'|'window'|'invoice_date_only'|'unknown';
  parcelHint?:string;
  sourceRef?:string;
  vendor?:string;
  amount?:number;
  currency?:string;
  treeCountDelta?:number|null;
  recurrenceCandidate?:boolean;
  recurrenceReason?:string;
  products?:FarmProductEvidence[];
  confidence?:number;
};

export type FarmKnowledgeCandidate={
  knowledgeKey:string;
  subjectType:'farm'|'parcel'|'well'|'product'|'supplier'|'operation'|'other';
  category:string;
  statement:string;
  value?:any;
  confidence?:number;
  requiresConfirmation?:boolean;
  question?:string;
};

export type FarmQuestionCandidate={
  question:string;
  reason?:string;
  priority?:'low'|'medium'|'high'|'critical';
  relatedKnowledgeKey?:string;
};

export type FarmScanResult = {
  documentKind:FarmDocumentKind;
  evidenceStatus:FarmEvidenceStatus;
  documentDate?:string|null;
  sourceName?:string;
  title:string;
  summary:string;
  confidence?:number;
  events:FarmScannedEvent[];
  products:FarmProductEvidence[];
  facts:FarmKnowledgeCandidate[];
  questions:FarmQuestionCandidate[];
  warnings:string[];
};

export type FarmDocument = {
  id:string;
  title:string;
  document_kind:FarmDocumentKind;
  evidence_status:FarmEvidenceStatus;
  document_date?:string|null;
  source_name?:string|null;
  parcel_id?:string|null;
  storage_bucket:string;
  storage_path?:string|null;
  original_filename?:string|null;
  mime_type?:string|null;
  file_size_bytes?:number|null;
  plain_text?:string|null;
  extracted_summary?:string|null;
  scan_json?:FarmScanResult|null;
  confidence?:number|null;
  review_status:'needs_review'|'verified'|'rejected';
  notes?:string|null;
  created_at:string;
};

export type FarmEvent = {
  id:string;
  title:string;
  event_type:FarmEventType;
  event_status:FarmEventStatus;
  occurred_on?:string|null;
  planned_for?:string|null;
  period_label?:string|null;
  date_precision:'exact'|'month'|'window'|'invoice_date_only'|'unknown';
  parcel_id?:string|null;
  scope:'farm'|'parcel';
  description?:string|null;
  source_document_id?:string|null;
  source_kind?:string|null;
  source_ref?:string|null;
  vendor?:string|null;
  products:FarmProductEvidence[];
  amount?:number|null;
  currency?:string|null;
  tree_count_delta?:number|null;
  recurrence_candidate:boolean;
  recurrence_reason?:string|null;
  confidence?:number|null;
  verified:boolean;
  created_at:string;
};

export type FarmYearWheelItem = {
  id:string;
  title:string;
  activity_type:string;
  target_year:number;
  target_month:number;
  target_day?:number|null;
  period_label?:string|null;
  parcel_id?:string|null;
  source_event_id?:string|null;
  basis:string;
  status:'suggested'|'approved'|'in_progress'|'postponed'|'done'|'skipped';
  notes?:string|null;
  started_at?:string|null;
  postponed_until?:string|null;
  postponed_reason?:string|null;
  status_changed_at?:string|null;
};

export type RainMeasurement = {
  id:string;
  measured_on:string;
  mm:number;
  source:'manual_gauge'|'weather_station'|'sensor'|'document'|'other';
  parcel_id?:string|null;
  notes?:string|null;
  source_document_id?:string|null;
  created_at:string;
};

const allowedKinds:FarmDocumentKind[]=['invoice','receipt','quote','proforma','agronomy_plan','message','photo','video','lab','rain_record','work_order','other'];
const allowedEvidence:FarmEvidenceStatus[]=['completed','planned','recommended','ordered','purchased','observed','unknown'];
const allowedStatuses:FarmEventStatus[]=['completed','planned','recommended','ordered','purchased','observed'];
const allowedEventTypes:FarmEventType[]=['spraying','pruning','cultivation','desuckering','young_tree_care','planting','fertilization','irrigation','rain','inspection','maintenance','harvest','purchase','soil_work','pest_control','disease_control','training','other'];
const datePrecisions=['exact','month','window','invoice_date_only','unknown'] as const;

function enumValue<T extends string>(value:unknown, allowed:readonly T[], fallback:T):T{
  const raw=String(value||'') as T;
  return allowed.includes(raw)?raw:fallback;
}
function numberOrUndefined(value:unknown){
  const num=Number(value);
  return Number.isFinite(num)?num:undefined;
}
function isoOrNull(value:unknown){
  const raw=String(value||'');
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)?raw:null;
}
function safeFilename(name:string){
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-150);
}
function normalizeName(value:string){
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().slice(0,180);
}

function normalizeProduct(raw:any):FarmProductEvidence{
  return{
    name:String(raw?.name||'').trim(),
    composition:String(raw?.composition||'').trim()||undefined,
    purpose:String(raw?.purpose||'').trim()||undefined,
    dose:String(raw?.dose||'').trim()||undefined,
    quantity:raw?.quantity==null?null:numberOrUndefined(raw.quantity),
    unit:String(raw?.unit||'').trim()||undefined,
    organicNote:String(raw?.organicNote||'').trim()||undefined,
  };
}

function normalizeScan(raw:any):FarmScanResult{
  const events=(Array.isArray(raw?.events)?raw.events:[]).map((event:any):FarmScannedEvent=>({
    eventType:enumValue(event?.eventType,allowedEventTypes,'other'),
    eventStatus:enumValue(event?.eventStatus,allowedStatuses,'observed'),
    title:String(event?.title||'Hendelse').trim().slice(0,240),
    description:String(event?.description||'').trim()||undefined,
    occurredOn:isoOrNull(event?.occurredOn),
    plannedFor:isoOrNull(event?.plannedFor),
    periodLabel:String(event?.periodLabel||'').trim()||undefined,
    datePrecision:enumValue(event?.datePrecision,datePrecisions,'unknown'),
    parcelHint:String(event?.parcelHint||'').trim()||undefined,
    sourceRef:String(event?.sourceRef||'').trim()||undefined,
    vendor:String(event?.vendor||'').trim()||undefined,
    amount:numberOrUndefined(event?.amount),
    currency:String(event?.currency||'EUR').toUpperCase(),
    treeCountDelta:event?.treeCountDelta==null?null:numberOrUndefined(event.treeCountDelta),
    recurrenceCandidate:Boolean(event?.recurrenceCandidate),
    recurrenceReason:String(event?.recurrenceReason||'').trim()||undefined,
    products:(Array.isArray(event?.products)?event.products:[]).map(normalizeProduct).filter((p:FarmProductEvidence)=>p.name),
    confidence:Math.max(0,Math.min(1,numberOrUndefined(event?.confidence)??0)),
  }));
  return{
    documentKind:enumValue(raw?.documentKind,allowedKinds,'other'),
    evidenceStatus:enumValue(raw?.evidenceStatus,allowedEvidence,'unknown'),
    documentDate:isoOrNull(raw?.documentDate),
    sourceName:String(raw?.sourceName||'').trim()||undefined,
    title:String(raw?.title||'Nytt gårdsdokument').trim().slice(0,240),
    summary:String(raw?.summary||'').trim(),
    confidence:Math.max(0,Math.min(1,numberOrUndefined(raw?.confidence)??0)),
    events,
    products:(Array.isArray(raw?.products)?raw.products:[]).map(normalizeProduct).filter((p:FarmProductEvidence)=>p.name),
    facts:(Array.isArray(raw?.facts)?raw.facts:[]).map((fact:any):FarmKnowledgeCandidate=>({
      knowledgeKey:String(fact?.knowledgeKey||'').trim().slice(0,220),
      subjectType:enumValue(fact?.subjectType,['farm','parcel','well','product','supplier','operation','other'] as const,'farm'),
      category:String(fact?.category||'general').trim().slice(0,120),
      statement:String(fact?.statement||'').trim().slice(0,1000),
      value:fact?.value??null,
      confidence:Math.max(0,Math.min(1,numberOrUndefined(fact?.confidence)??0)),
      requiresConfirmation:Boolean(fact?.requiresConfirmation),
      question:String(fact?.question||'').trim()||undefined,
    })).filter((fact:FarmKnowledgeCandidate)=>fact.knowledgeKey&&fact.statement).slice(0,30),
    questions:(Array.isArray(raw?.questions)?raw.questions:[]).map((q:any):FarmQuestionCandidate=>({
      question:String(q?.question||'').trim().slice(0,700),
      reason:String(q?.reason||'').trim().slice(0,1000)||undefined,
      priority:enumValue(q?.priority,['low','medium','high','critical'] as const,'medium'),
      relatedKnowledgeKey:String(q?.relatedKnowledgeKey||'').trim().slice(0,220)||undefined,
    })).filter((q:FarmQuestionCandidate)=>q.question).slice(0,20),
    warnings:(Array.isArray(raw?.warnings)?raw.warnings:[]).map(String).filter(Boolean).slice(0,12),
  };
}

export async function analyzeFarmSource(input:{file?:File|null;text?:string}):Promise<FarmScanResult>{
  const file=input.file||null;
  const body:any={};
  if(file){
    if(file.type.startsWith('video/')){
      return{
        documentKind:'video',
        evidenceStatus:'observed',
        documentDate:null,
        title:file.name||'Feltvideo',
        summary:'Video lagres som visuell dokumentasjon. Automatisk videotolkning er ikke aktivert; legg inn en kort beskrivelse før lagring.',
        confidence:1,
        events:[],
        products:[],
        facts:[],
        questions:[{question:'Hvilken parsell og hva viser denne videoen?',reason:'Video lagres som bevis, men videotolkning er ikke aktivert.',priority:'medium'}],
        warnings:['Video er ikke automatisk tolket. Beskrivelse og parsell må bekreftes manuelt.'],
      };
    }
    body.file=await fileToBase64(file);
    body.mimeType=file.type||(file.name.toLowerCase().endsWith('.pdf')?'application/pdf':'application/octet-stream');
  }
  if(input.text?.trim())body.text=input.text.trim();
  const {data,error}=await supabase.functions.invoke('olivia-farm-scan',{body});
  if(error)throw new Error(error.message||'AI-skanning av gårdskilde feilet.');
  if(data?.error)throw new Error(String(data.error)+(Array.isArray(data.details)?' · '+data.details.join(' | '):''));
  return normalizeScan(data?.result||{});
}

async function uploadFarmFile(file:File):Promise<{bucket:string;path:string}>{
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)throw new Error('Du må være innlogget i Olivia OS.');
  const bucket='olivia-farm-documents';
  const dateFolder=new Date().toISOString().slice(0,10);
  const path=auth.user.id+'/'+dateFolder+'/'+Date.now()+'-'+safeFilename(file.name||'farm-document');
  const {error}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type||undefined,upsert:false});
  if(error)throw new Error('Kunne ikke lagre gårdsdokumentet: '+error.message);
  return{bucket,path};
}

async function upsertProducts(products:FarmProductEvidence[],documentId:string){
  const unique=new Map<string,FarmProductEvidence>();
  for(const product of products){
    const key=normalizeName(product.name);
    if(key&&!unique.has(key))unique.set(key,product);
  }
  for(const [key,product] of unique){
    const {data:existing}=await supabase.from('farm_inputs').select('id,composition,intended_use,dose,organic_note,first_source_document_id').eq('normalized_name',key).maybeSingle();
    const row={
      id:existing?.id||'input-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
      normalized_name:key,
      name:product.name,
      composition:product.composition||existing?.composition||null,
      intended_use:product.purpose||existing?.intended_use||null,
      dose:product.dose||existing?.dose||null,
      organic_note:product.organicNote||existing?.organic_note||null,
      first_source_document_id:existing?.first_source_document_id||documentId,
      last_source_document_id:documentId,
      last_seen_at:new Date().toISOString(),
    };
    const {error}=await supabase.from('farm_inputs').upsert(row,{onConflict:'normalized_name'});
    if(error)console.warn('[farmJournal] input upsert failed',product.name,error);
  }
}

export async function saveFarmEvidenceImage(input:{
  file:File;
  title:string;
  documentDate:string;
  parcelId?:string|null;
  notes?:string;
}):Promise<string>{
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)throw new Error('Du må være innlogget i Olivia OS.');
  const storage=await uploadFarmFile(input.file);
  const documentId='farmdoc-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  const {error}=await supabase.from('farm_documents').insert({
    id:documentId,
    title:input.title,
    document_kind:'photo',
    evidence_status:'completed',
    document_date:input.documentDate,
    source_name:'Olivia årshjul',
    parcel_id:input.parcelId||null,
    storage_bucket:storage.bucket,
    storage_path:storage.path,
    original_filename:input.file.name||null,
    mime_type:input.file.type||null,
    file_size_bytes:input.file.size||null,
    plain_text:null,
    extracted_summary:'Bilde lagt ved som dokumentasjon på utført arbeid.',
    scan_json:null,
    confidence:1,
    review_status:'verified',
    notes:input.notes?.trim()||null,
    created_by:auth.user.id,
  });
  if(error){
    await supabase.storage.from(storage.bucket).remove([storage.path]).catch(()=>undefined);
    throw new Error(error.message);
  }
  return documentId;
}

export async function saveFarmSource(params:{
  scan:FarmScanResult;
  file?:File|null;
  text?:string;
  parcelId?:string;
  notes?:string;
  verify?:boolean;
}):Promise<string>{
  const {data:auth}=await supabase.auth.getUser();
  if(!auth.user)throw new Error('Du må være innlogget i Olivia OS.');

  let storage:{bucket:string;path:string}|null=null;
  if(params.file)storage=await uploadFarmFile(params.file);

  const documentId='farmdoc-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  const scan=params.scan;
  const {error:docError}=await supabase.from('farm_documents').insert({
    id:documentId,
    title:scan.title,
    document_kind:scan.documentKind,
    evidence_status:scan.evidenceStatus,
    document_date:scan.documentDate||null,
    source_name:scan.sourceName||null,
    parcel_id:params.parcelId||null,
    storage_bucket:storage?.bucket||'olivia-farm-documents',
    storage_path:storage?.path||null,
    original_filename:params.file?.name||null,
    mime_type:params.file?.type||null,
    file_size_bytes:params.file?.size||null,
    plain_text:params.text?.trim()||null,
    extracted_summary:scan.summary||null,
    scan_json:scan,
    confidence:scan.confidence??null,
    review_status:'needs_review',
    notes:params.notes||null,
    created_by:auth.user.id,
  });
  if(docError){
    if(storage)await supabase.storage.from(storage.bucket).remove([storage.path]).catch(()=>undefined);
    throw new Error(docError.message);
  }

  const sourceEvents:FarmScannedEvent[]=scan.events.length?scan.events:[{
    eventType:'inspection' as FarmEventType,
    eventStatus:(scan.evidenceStatus==='completed'?'completed':scan.evidenceStatus==='planned'?'planned':scan.evidenceStatus==='recommended'?'recommended':scan.evidenceStatus==='ordered'?'ordered':scan.evidenceStatus==='purchased'?'purchased':'observed') as FarmEventStatus,
    title:scan.title,
    description:scan.summary,
    occurredOn:scan.evidenceStatus==='observed'||scan.evidenceStatus==='completed'?scan.documentDate:null,
    plannedFor:scan.evidenceStatus==='planned'||scan.evidenceStatus==='recommended'?scan.documentDate:null,
    periodLabel:scan.documentDate?undefined:'Dato ikke dokumentert',
    datePrecision:scan.documentDate?'exact':'unknown',
    recurrenceCandidate:false,
    products:scan.products,
    confidence:scan.confidence,
  }];
  const events=sourceEvents.map((event,index)=>({
    id:'farmevent-'+Date.now()+'-'+index+'-'+Math.random().toString(36).slice(2,6),
    title:event.title,
    event_type:event.eventType,
    event_status:event.eventStatus,
    occurred_on:event.occurredOn||null,
    planned_for:event.plannedFor||null,
    period_label:event.periodLabel||null,
    date_precision:event.datePrecision||'unknown',
    parcel_id:params.parcelId||null,
    scope:params.parcelId?'parcel':'farm',
    description:event.description||null,
    source_document_id:documentId,
    source_kind:scan.documentKind,
    source_ref:event.sourceRef||null,
    vendor:event.vendor||scan.sourceName||null,
    products:event.products||[],
    amount:event.amount??null,
    currency:event.currency||'EUR',
    tree_count_delta:event.treeCountDelta??null,
    recurrence_candidate:Boolean(event.recurrenceCandidate),
    recurrence_reason:event.recurrenceReason||null,
    confidence:event.confidence??scan.confidence??null,
    verified:false,
  }));

  if(events.length){
    const {error:eventError}=await supabase.from('farm_events').insert(events);
    if(eventError)throw new Error(eventError.message);
  }

  const allProducts=[
    ...scan.products,
    ...scan.events.flatMap(event=>event.products||[]),
  ];
  await upsertProducts(allProducts,documentId);

  if(scan.facts?.length){
    const rows=scan.facts.map((fact,index)=>({
      id:'knowledge-'+documentId+'-'+index,
      knowledge_key:fact.knowledgeKey,
      subject_type:fact.subjectType,
      subject_id:fact.subjectType==='parcel'?(params.parcelId||null):null,
      category:fact.category||'general',
      statement:fact.statement,
      value_json:fact.value??null,
      confidence:fact.confidence??scan.confidence??0.5,
      status:fact.requiresConfirmation?'provisional':'verified',
      learned_from:'document',
      source_document_id:documentId,
      source_ref:scan.title,
      last_confirmed_at:fact.requiresConfirmation?null:new Date().toISOString(),
      notes:fact.requiresConfirmation?'AI fant et mulig faktum som må avklares før det brukes som bekreftet kunnskap.':null,
    }));
    const {error:knowledgeError}=await supabase.from('farm_knowledge_items').insert(rows);
    if(knowledgeError)console.warn('[farmJournal] knowledge insert failed',knowledgeError);
  }

  if(params.verify!==false)await verifyFarmDocument(documentId);

  for(const fact of scan.facts||[]){
    if(!fact.requiresConfirmation&&!fact.question)continue;
    await createFarmQuestion({
      question:fact.question||('Kan du bekrefte dette: '+fact.statement),
      reason:'Olivia fant et mulig faktum i kilden, men sikkerheten er ikke høy nok til å bruke det som fasit uten avklaring.',
      questionType:'confirmation',
      priority:'medium',
      parcelId:params.parcelId,
      agentType:'source_scanner',
      sourceDocumentId:documentId,
      relatedKnowledgeKey:fact.knowledgeKey,
      dedupeKey:'source-fact:'+documentId+':'+normalizeName(fact.knowledgeKey),
    }).catch(()=>null);
  }

  for(const question of scan.questions||[]){
    await createFarmQuestion({
      question:question.question,
      reason:question.reason||'Kildeskanneren trenger avklaring før informasjonen kan brukes sikkert.',
      questionType:'clarification',
      priority:question.priority||'medium',
      parcelId:params.parcelId,
      agentType:'source_scanner',
      sourceDocumentId:documentId,
      relatedKnowledgeKey:question.relatedKnowledgeKey,
      dedupeKey:'source-question:'+documentId+':'+normalizeName(question.question),
    }).catch(()=>null);
  }

  for(const warning of scan.warnings||[]){
    await createFarmQuestion({
      question:'Kan du avklare dette fra «'+scan.title+'»: '+warning,
      reason:'Kildeskanneren markerte dette som usikkert. Olivia lagrer heller et spørsmål enn å gjøre en antakelse.',
      questionType:'clarification',
      priority:'medium',
      parcelId:params.parcelId,
      agentType:'source_scanner',
      sourceDocumentId:documentId,
      dedupeKey:'source-warning:'+documentId+':'+normalizeName(warning),
    }).catch(()=>null);
  }

  if(!params.parcelId&&sourceEvents.some(event=>event.eventType==='planting'||event.treeCountDelta!=null)){
    await createFarmQuestion({
      question:'Hvilken parsell eller sone gjelder «'+scan.title+'»?',
      reason:'Kilden inneholder planting eller treantall, men ingen parsell er bekreftet. Olivia skal ikke flytte tredata til feil parsell.',
      questionType:'missing_fact',
      priority:'high',
      agentType:'source_scanner',
      sourceDocumentId:documentId,
      relatedKnowledgeKey:'source.'+documentId+'.parcel_scope',
      dedupeKey:'source-parcel:'+documentId,
    }).catch(()=>null);
  }

  return documentId;
}

export async function verifyFarmDocument(documentId:string){
  const {error}=await supabase.rpc('verify_farm_document',{p_document_id:documentId});
  if(error)throw new Error(error.message);
}

export async function rejectFarmDocument(documentId:string){
  const {error}=await supabase.from('farm_documents').update({review_status:'rejected'}).eq('id',documentId);
  if(error)throw new Error(error.message);
}

export async function fetchFarmDocuments(limit=100):Promise<FarmDocument[]>{
  const {data,error}=await supabase.from('farm_documents').select('*').order('created_at',{ascending:false}).limit(limit);
  if(error)throw new Error(error.message);
  return(data||[]) as FarmDocument[];
}

export async function fetchFarmEvents(limit=200):Promise<FarmEvent[]>{
  const {data,error}=await supabase.from('farm_events').select('*').eq('verified',true).order('occurred_on',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(limit);
  if(error)throw new Error(error.message);
  return(data||[]) as FarmEvent[];
}

export async function fetchFarmInputs(){
  const {data,error}=await supabase.from('farm_inputs').select('*').order('name');
  if(error)throw new Error(error.message);
  return data||[];
}

export async function fetchYearWheel(year:number):Promise<FarmYearWheelItem[]>{
  const {data,error}=await supabase.from('farm_year_wheel_items').select('*').eq('target_year',year).order('target_month').order('target_day');
  if(error)throw new Error(error.message);
  return(data||[]) as FarmYearWheelItem[];
}

export async function updateYearWheelStatus(
  id:string,
  status:FarmYearWheelItem['status'],
  input:{postponedUntil?:string|null;postponedReason?:string|null}={}
){
  const now=new Date().toISOString();
  const patch:any={status,updated_at:now,status_changed_at:now};

  if(status==='in_progress'){
    const {data:existing,error:readError}=await supabase.from('farm_year_wheel_items').select('started_at').eq('id',id).maybeSingle();
    if(readError)throw new Error(readError.message);
    patch.started_at=existing?.started_at||now;
    patch.postponed_until=null;
    patch.postponed_reason=null;
  }else if(status==='postponed'){
    patch.postponed_until=input.postponedUntil||null;
    patch.postponed_reason=input.postponedReason?.trim()||null;
  }else if(status==='approved'){
    patch.postponed_until=null;
    patch.postponed_reason=null;
  }else if(status==='done'||status==='skipped'){
    patch.postponed_until=null;
    patch.postponed_reason=null;
  }

  const {error}=await supabase.from('farm_year_wheel_items').update(patch).eq('id',id);
  if(error)throw new Error(error.message);
}

export async function completeYearWheelItem(item:FarmYearWheelItem, input:{
  occurredOn?:string;
  notes?:string;
  parcelId?:string|null;
  productName?:string;
  productQuantity?:number|null;
  productUnit?:string;
  evidenceDocumentId?:string|null;
}={}){
  const occurredOn=input.occurredOn||new Date().toISOString().slice(0,10);
  const sourceRef='year-wheel:'+item.id;
  const parcelId=input.parcelId===undefined?(item.parcel_id||null):input.parcelId;
  const cleanProductName=String(input.productName||'').trim();
  const productQuantity=input.productQuantity==null?null:Number(input.productQuantity);
  if(productQuantity!=null&&(!Number.isFinite(productQuantity)||productQuantity<0))throw new Error('Mengde må være 0 eller mer.');
  const products:FarmProductEvidence[]=cleanProductName?[{
    name:cleanProductName,
    quantity:productQuantity,
    unit:String(input.productUnit||'').trim()||undefined,
  }]:[];

  const existing=await supabase.from('farm_events').select('id').eq('source_ref',sourceRef).eq('event_status','completed').maybeSingle();
  if(existing.error)throw new Error(existing.error.message);

  if(!existing.data){
    const eventType=allowedEventTypes.includes(item.activity_type as FarmEventType)?item.activity_type as FarmEventType:'other';
    const {error:eventError}=await supabase.from('farm_events').insert({
      id:'farmevent-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
      title:item.title,
      event_type:eventType,
      event_status:'completed',
      occurred_on:occurredOn,
      planned_for:null,
      period_label:null,
      date_precision:'exact',
      parcel_id:parcelId,
      scope:parcelId?'parcel':'farm',
      description:[item.notes,input.notes].filter(Boolean).join(' · ')||'Utført fra Olivia årshjul.',
      source_document_id:input.evidenceDocumentId||null,
      source_kind:input.evidenceDocumentId?'photo':'year_wheel',
      source_ref:sourceRef,
      vendor:null,
      products,
      amount:null,
      currency:'EUR',
      tree_count_delta:null,
      recurrence_candidate:true,
      recurrence_reason:'Bekreftet utført aktivitet fra årshjulet.',
      confidence:1,
      verified:true,
    });
    if(eventError)throw new Error(eventError.message);
    if(products.length)await upsertProducts(products,input.evidenceDocumentId||sourceRef);
  }

  await updateYearWheelStatus(item.id,'done');
}

export async function addRainMeasurement(input:{measuredOn:string;mm:number;parcelId?:string;notes?:string;source?:RainMeasurement['source']}){
  if(!Number.isFinite(input.mm)||input.mm<0)throw new Error('Regnmengde må være 0 mm eller mer.');
  const {data:auth}=await supabase.auth.getUser();
  const {error}=await supabase.from('rain_measurements').insert({
    id:'rain-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
    measured_on:input.measuredOn,
    mm:input.mm,
    source:input.source||'manual_gauge',
    parcel_id:input.parcelId||null,
    notes:input.notes||null,
    created_by:auth.user?.id||null,
  });
  if(error)throw new Error(error.message);
}

export async function fetchRainMeasurements(limit=365):Promise<RainMeasurement[]>{
  const {data,error}=await supabase.from('rain_measurements').select('*').order('measured_on',{ascending:false}).limit(limit);
  if(error)throw new Error(error.message);
  return(data||[]) as RainMeasurement[];
}

export async function fetchFarmContextImages(parcelId?:string,limit=6):Promise<Array<{url:string;title:string;observedAt:string;parcelId?:string}>>{
  let query=supabase.from('farm_observations').select('title,observed_at,parcel_id,image_urls').not('image_urls','is',null).order('observed_at',{ascending:false}).limit(30);
  if(parcelId)query=query.or('parcel_id.eq.'+parcelId+',parcel_id.is.null');
  const {data,error}=await query;
  if(error)throw new Error(error.message);
  const out:Array<{url:string;title:string;observedAt:string;parcelId?:string}>=[];
  for(const row of data||[]){
    for(const url of Array.isArray((row as any).image_urls)?(row as any).image_urls:[]){
      if(!url)continue;
      out.push({url:String(url),title:String((row as any).title||'Feltbilde'),observedAt:String((row as any).observed_at||''),parcelId:(row as any).parcel_id||undefined});
      if(out.length>=limit)return out;
    }
  }
  return out;
}

export async function getFarmDocumentUrl(doc:Pick<FarmDocument,'storage_bucket'|'storage_path'>):Promise<string|null>{
  if(!doc.storage_path)return null;
  const {data,error}=await supabase.storage.from(doc.storage_bucket||'olivia-farm-documents').createSignedUrl(doc.storage_path,900);
  if(error)throw new Error(error.message);
  return data.signedUrl;
}

export async function fetchFarmTruthSummary(){
  const currentYear=new Date().getFullYear();
  const [docs,events,currentWheel,nextWheel,rain,parcelsRes]=await Promise.all([
    fetchFarmDocuments(50),
    fetchFarmEvents(100),
    fetchYearWheel(currentYear),
    fetchYearWheel(currentYear+1),
    fetchRainMeasurements(120),
    supabase.from('parcels').select('id,name,tree_count,tree_variety').order('name'),
  ]);
  const wheel=[...currentWheel,...nextWheel];
  const today=new Date();
  today.setHours(12,0,0,0);
  const since30=new Date(today);since30.setDate(since30.getDate()-30);
  const rain30=rain.filter(row=>new Date(row.measured_on+'T12:00:00')>=since30).reduce((sum,row)=>sum+Number(row.mm||0),0);
  const upcoming=wheel.filter(item=>item.status!=='done'&&item.status!=='skipped').filter(item=>{
    const target=new Date(item.target_year,item.target_month-1,item.target_day||15);
    const diff=(target.getTime()-today.getTime())/86400000;
    return diff>=-14&&diff<=180;
  });
  return{
    documents:docs,
    events,
    yearWheel:wheel,
    rain,
    parcels:parcelsRes.data||[],
    needsReview:docs.filter(doc=>doc.review_status==='needs_review').length,
    completedEvents:events.filter(event=>event.event_status==='completed').length,
    upcoming,
    rain30,
    treeCount:(parcelsRes.data||[]).reduce((sum:number,row:any)=>sum+Number(row.tree_count||0),0),
  };
}

export async function buildFarmContext(parcelId?:string):Promise<string>{
  const [eventsRes,obsRes,rainRes,parcelRes]=await Promise.all([
    supabase.from('farm_events').select('title,event_type,event_status,occurred_on,planned_for,period_label,description,products,tree_count_delta').eq('verified',true).or(parcelId?'parcel_id.eq.'+parcelId+',parcel_id.is.null':'parcel_id.is.null').order('created_at',{ascending:false}).limit(30),
    supabase.from('farm_observations').select('title,category,notes,observed_at').or(parcelId?'parcel_id.eq.'+parcelId+',parcel_id.is.null':'parcel_id.is.null').order('observed_at',{ascending:false}).limit(12),
    supabase.from('rain_measurements').select('measured_on,mm,source').order('measured_on',{ascending:false}).limit(30),
    parcelId?supabase.from('parcels').select('id,name,tree_count,tree_variety,irrigation_status').eq('id',parcelId).maybeSingle():Promise.resolve({data:null,error:null} as any),
  ]);
  const lines:string[]=[];
  const parcel:any=parcelRes.data;
  if(parcel)lines.push('PARSELL: '+parcel.name+' · registrert treantall '+(parcel.tree_count??'ukjent')+' · sort '+(parcel.tree_variety||'ukjent')+' · vanning '+(parcel.irrigation_status||'ukjent'));
  const events=(eventsRes.data||[]) as any[];
  if(events.length){
    lines.push('VERIFISERT DRIFTSHISTORIKK:');
    events.slice(0,15).forEach(event=>lines.push('- '+(event.occurred_on||event.planned_for||event.period_label||'dato ukjent')+' · '+event.event_status+' · '+event.title+(event.description?' · '+event.description:'')));
  }
  const observations=(obsRes.data||[]) as any[];
  if(observations.length){
    lines.push('FELTOBSERVASJONER:');
    observations.slice(0,8).forEach(obs=>lines.push('- '+String(obs.observed_at).slice(0,10)+' · '+obs.category+' · '+obs.title+(obs.notes?' · '+obs.notes:'')));
  }
  const rain=(rainRes.data||[]) as any[];
  if(rain.length){
    lines.push('MANUELLE/REGISTRERTE REGNMÅLINGER:');
    rain.slice(0,12).forEach(row=>lines.push('- '+row.measured_on+' · '+row.mm+' mm · '+row.source));
  }
  return lines.join('\n').slice(0,12000);
}
