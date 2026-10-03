import { supabase } from './supabaseClient';
import { harvestSeasonForDate } from './harvestSeason';

export type HarvestWorkflowStatus='harvested'|'received'|'processing'|'completed';
export type HarvestDestination='oil'|'table_olives'|'cooperative'|'other';

export type HarvestIntake={
  id:string;
  parcel_id:string;
  season:string;
  date:string;
  variety:string;
  kg:number;
  channel:'cooperativa'|'bordoliven'|'olje_premier'|'olje_export';
  price_per_kg:number;
  notes?:string;
  harvest_plan_id?:string;
  workflow_status?:HarvestWorkflowStatus;
  harvested_at?:string;
  received_at?:string;
  gross_kg?:number;
  tare_kg?:number;
  net_kg?:number;
  container_count?:number;
  weigh_ticket_number?:string;
  weigh_ticket_path?:string;
  weigh_ticket_filename?:string;
  weigh_ticket_mime_type?:string;
  destination?:HarvestDestination;
  batch_id?:string;
  source?:string;
};

export type HarvestIntakeDraft={
  parcelId:string;
  season:string;
  date:string;
  variety:string;
  destination:HarvestDestination;
  status:'harvested'|'received';
  grossKg:number;
  tareKg:number;
  containerCount?:number;
  weighTicketNumber?:string;
  harvestPlanId?:string;
  notes?:string;
};

const safeFilename=(name:string)=>name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-140);

function channelFor(destination:HarvestDestination):HarvestIntake['channel']{
  if(destination==='table_olives')return 'bordoliven';
  if(destination==='cooperative')return 'cooperativa';
  return 'olje_premier';
}

export async function fetchHarvestIntakes():Promise<HarvestIntake[]>{
  const {data,error}=await supabase.from('harvest_records').select('*').not('workflow_status','is',null).order('date',{ascending:false}).order('created_at',{ascending:false});
  if(error)throw error;
  return (data||[]).map((r:any)=>({
    ...r,
    kg:Number(r.kg||0),
    price_per_kg:Number(r.price_per_kg||0),
    gross_kg:r.gross_kg==null?undefined:Number(r.gross_kg),
    tare_kg:r.tare_kg==null?undefined:Number(r.tare_kg),
    net_kg:r.net_kg==null?undefined:Number(r.net_kg),
    container_count:r.container_count==null?undefined:Number(r.container_count),
  })) as HarvestIntake[];
}

export async function createHarvestIntake(draft:HarvestIntakeDraft,file?:File|null):Promise<HarvestIntake>{
  const {data:auth,error:authError}=await supabase.auth.getUser();
  if(authError||!auth.user)throw new Error('Du må være innlogget i Olivia OS.');
  const gross=Number(draft.grossKg||0),tare=Number(draft.tareKg||0),net=Math.round((gross-tare)*100)/100;
  if(!draft.parcelId||!draft.date||!draft.variety)throw new Error('Parsell, dato og sort må fylles ut.');
  if(!Number.isFinite(net)||net<=0)throw new Error('Netto vekt må være større enn 0 kg.');

  let documentPath:string|null=null;
  if(file){
    documentPath=`${auth.user.id}/${Date.now()}-${safeFilename(file.name||'veieseddel')}`;
    const {error}=await supabase.storage.from('olivia-harvest-documents').upload(documentPath,file,{contentType:file.type||undefined,upsert:false});
    if(error)throw new Error(`Kunne ikke lagre veieseddelen: ${error.message}`);
  }

  const id=`harvest-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const now=new Date().toISOString();
  const row={
    id,parcel_id:draft.parcelId,season:draft.season,date:draft.date,variety:draft.variety,
    kg:net,channel:channelFor(draft.destination),price_per_kg:0,currency:'EUR',notes:draft.notes||null,
    harvest_plan_id:draft.harvestPlanId||null,workflow_status:draft.status,
    harvested_at:`${draft.date}T12:00:00`,received_at:draft.status==='received'?now:null,
    gross_kg:gross,tare_kg:tare,net_kg:net,container_count:draft.containerCount||null,
    weigh_ticket_number:draft.weighTicketNumber||null,weigh_ticket_path:documentPath,
    weigh_ticket_filename:file?.name||null,weigh_ticket_mime_type:file?.type||null,
    destination:draft.destination,batch_id:null,source:file?'weigh_ticket':'manual',updated_at:now,
  };
  const {data,error}=await supabase.from('harvest_records').insert(row).select('*').single();
  if(error){
    if(documentPath)await supabase.storage.from('olivia-harvest-documents').remove([documentPath]).catch(()=>undefined);
    throw error;
  }

  return data as HarvestIntake;
}

export async function markHarvestReceived(id:string):Promise<void>{
  const {error}=await supabase.from('harvest_records').update({workflow_status:'received',received_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id);
  if(error)throw error;
}

export async function createBatchFromHarvest(id:string):Promise<string>{
  const {data:row,error}=await supabase.from('harvest_records').select('*').eq('id',id).single();
  if(error||!row)throw error||new Error('Høsteregistreringen ble ikke funnet.');
  if(row.workflow_status!=='received')throw new Error('Råvaren må være markert som mottatt før produksjonsbatch opprettes.');
  if(row.batch_id)return row.batch_id;
  if(row.destination==='cooperative')throw new Error('Kooperativlevering går ut av egen produksjon og skal ikke bli produksjonsbatch.');
  if(!['oil','table_olives'].includes(row.destination))throw new Error('Velg olje eller bordoliven som destinasjon før batch opprettes.');

  const batchId=`harvest-batch-${row.id}`;
  const compactDate=String(row.date||'').replace(/-/g,'');
  const traceCode=`DA-${compactDate}-${String(row.id).slice(-5).toUpperCase()}`;
  const {error:batchError}=await supabase.from('batches').insert({
    id:batchId,parcel_id:row.parcel_id,olive_type:row.variety,harvest_date:row.date,
    weight:Number(row.net_kg||row.kg||0),quality:'Standard',status:'ACTIVE',
    yield_type:row.destination==='table_olives'?'Table':'Oil',
    traceability_code:traceCode,current_stage:null,logs:[],
    metadata:{
      source:'harvest_intake',source_harvest_record_id:row.id,harvest_plan_id:row.harvest_plan_id||null,
      weigh_ticket_number:row.weigh_ticket_number||null,weigh_ticket_path:row.weigh_ticket_path||null,
      gross_kg:row.gross_kg||null,tare_kg:row.tare_kg||null,net_kg:row.net_kg||row.kg||null,
      harvest_season:row.season||harvestSeasonForDate(row.date),
    },
  });
  if(batchError)throw batchError;

  const {error:updateError}=await supabase.from('harvest_records').update({
    workflow_status:'processing',batch_id:batchId,updated_at:new Date().toISOString(),
  }).eq('id',id);
  if(updateError)throw updateError;
  return batchId;
}

export async function getHarvestDocumentUrl(path?:string|null):Promise<string|null>{
  if(!path)return null;
  const {data,error}=await supabase.storage.from('olivia-harvest-documents').createSignedUrl(path,900);
  if(error)throw error;
  return data.signedUrl;
}
