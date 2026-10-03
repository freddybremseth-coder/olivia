import { supabase } from './supabaseClient';
import { currentHarvestSeason, harvestSeasonForDate } from './harvestSeason';

export type ParcelExecutionStage =
  | 'no_plan'
  | 'plan_pending'
  | 'approved_waiting_harvest'
  | 'harvested'
  | 'received'
  | 'production'
  | 'ready_to_pack'
  | 'packed'
  | 'cooperative_received';

export type ParcelExecutionRow = {
  parcelId: string;
  parcelName: string;
  variety?: string;
  treeCount: number;
  season: string;
  stage: ParcelExecutionStage;
  stageLabel: string;
  nextAction: string;
  targetTab: 'harvest_planner'|'production'|'traceability_batches';
  planCount: number;
  approvedPlanCount: number;
  plannedKg: number;
  actualKg: number;
  intakeCount: number;
  batchCount: number;
  activeBatchCount: number;
  packedLotCount: number;
  packedUnits: number;
  details: string[];
};

export type SeasonExecution = {
  season: string;
  parcels: ParcelExecutionRow[];
  productiveParcelCount: number;
  plannedParcelCount: number;
  approvedParcelCount: number;
  startedParcelCount: number;
  packedParcelCount: number;
};

const n=(value:unknown)=>Number(value||0);

function shortParcelName(name:string){
  const match=name.match(/Parcela\s+(\d+)/i);
  return match ? 'Parcela '+match[1] : name;
}

function stageLabel(stage:ParcelExecutionStage){
  if(stage==='no_plan')return'Ingen plan';
  if(stage==='plan_pending')return'Plan må godkjennes';
  if(stage==='approved_waiting_harvest')return'Godkjent · venter høsting';
  if(stage==='harvested')return'Høstet · ikke mottatt';
  if(stage==='received')return'Mottatt · mangler batch';
  if(stage==='production')return'I produksjon';
  if(stage==='ready_to_pack')return'Klar for pakking';
  if(stage==='packed')return'Pakket';
  return'Kooperativ mottatt';
}

export async function fetchSeasonExecution():Promise<SeasonExecution>{
  const season=currentHarvestSeason();

  const [parcelsRes,plansRes,intakesRes,batchesRes,lotSourcesRes,lotsRes]=await Promise.all([
    supabase.from('parcels').select('id,name,tree_variety,tree_count').order('name'),
    supabase.from('harvest_plans').select('id,parcel_id,status,estimated_kg,actual_kg,planned_date,purpose').neq('status','cancelled'),
    supabase.from('harvest_records').select('id,parcel_id,season,date,harvest_plan_id,workflow_status,net_kg,kg,destination,batch_id').not('workflow_status','is',null),
    supabase.from('batches').select('id,parcel_id,harvest_date,status,current_stage,metadata'),
    supabase.from('product_lot_sources').select('lot_id,batch_id'),
    supabase.from('product_lots').select('id,packed_at,status,initial_units'),
  ]);

  const error=parcelsRes.error||plansRes.error||intakesRes.error||batchesRes.error||lotSourcesRes.error||lotsRes.error;
  if(error)throw error;

  const parcels=(parcelsRes.data||[]).filter((row:any)=>n(row.tree_count)>0);
  const plans=(plansRes.data||[]).filter((row:any)=>harvestSeasonForDate(row.planned_date)===season);
  const intakes=(intakesRes.data||[]).filter((row:any)=>row.season===season||harvestSeasonForDate(row.date)===season);
  const batches=(batchesRes.data||[]).filter((row:any)=>{
    const explicit=row.metadata?.harvest_season;
    return explicit===season||harvestSeasonForDate(row.harvest_date)===season;
  });

  const lotMap=new Map((lotsRes.data||[]).map((lot:any)=>[lot.id,lot]));
  const lotSources=(lotSourcesRes.data||[]).filter((source:any)=>lotMap.has(source.lot_id));

  const rows:ParcelExecutionRow[]=parcels.map((parcel:any)=>{
    const parcelPlans=plans.filter((plan:any)=>plan.parcel_id===parcel.id);
    const parcelIntakes=intakes.filter((row:any)=>row.parcel_id===parcel.id);
    const parcelBatches=batches.filter((batch:any)=>batch.parcel_id===parcel.id);
    const parcelBatchIds=new Set(parcelBatches.map((batch:any)=>batch.id));
    const parcelLotIds=new Set(
      lotSources
        .filter((source:any)=>parcelBatchIds.has(source.batch_id))
        .map((source:any)=>source.lot_id)
    );
    const parcelLots=Array.from(parcelLotIds)
      .map(id=>lotMap.get(id) as any)
      .filter(Boolean);

    const approvedPlans=parcelPlans.filter((plan:any)=>['approved','done'].includes(plan.status));
    const pendingPlans=parcelPlans.filter((plan:any)=>plan.status==='planned');
    const planIdsWithIntake=new Set(parcelIntakes.map((row:any)=>row.harvest_plan_id).filter(Boolean));
    const approvedWithoutIntake=approvedPlans.filter((plan:any)=>!planIdsWithIntake.has(plan.id));

    const harvested=parcelIntakes.filter((row:any)=>row.workflow_status==='harvested');
    const received=parcelIntakes.filter((row:any)=>row.workflow_status==='received');
    const processing=parcelIntakes.filter((row:any)=>['processing','completed'].includes(row.workflow_status));
    const cooperativeReceived=received.filter((row:any)=>row.destination==='cooperative');
    const receivedNeedsBatch=received.filter((row:any)=>row.destination!=='cooperative'&&!row.batch_id);

    const activeBatches=parcelBatches.filter((batch:any)=>batch.status==='ACTIVE');
    const activeBeforePacking=activeBatches.filter((batch:any)=>!['PAKKING','SALG'].includes(String(batch.current_stage||'').toUpperCase()));
    const packableBatches=activeBatches.filter((batch:any)=>['PAKKING','SALG'].includes(String(batch.current_stage||'').toUpperCase()));
    const batchIdsWithLots=new Set(lotSources.filter((source:any)=>parcelBatchIds.has(source.batch_id)).map((source:any)=>source.batch_id));
    const packableWithoutLot=packableBatches.filter((batch:any)=>!batchIdsWithLots.has(batch.id));

    let stage:ParcelExecutionStage='no_plan';
    let nextAction='Lag første høsteplan for denne parsellen.';
    let targetTab:ParcelExecutionRow['targetTab']='harvest_planner';

    if(parcelPlans.length===0){
      stage='no_plan';
    }else if(pendingPlans.length>0){
      stage='plan_pending';
      nextAction='Kontroller estimatgrunnlag og godkjenn høsteplanen.';
      targetTab='harvest_planner';
    }else if(approvedWithoutIntake.length>0){
      stage='approved_waiting_harvest';
      nextAction='Registrer faktisk høsting når arbeidet starter.';
      targetTab='production';
    }else if(harvested.length>0){
      stage='harvested';
      nextAction='Marker høstet råvare som mottatt etter faktisk mottak/veiing.';
      targetTab='production';
    }else if(receivedNeedsBatch.length>0){
      stage='received';
      nextAction='Opprett produksjonsbatch fra mottatt råvare.';
      targetTab='production';
    }else if(activeBeforePacking.length>0||processing.length>0){
      stage='production';
      nextAction='Fortsett registrert produksjonssteg for aktive batcher.';
      targetTab='production';
    }else if(packableWithoutLot.length>0){
      stage='ready_to_pack';
      nextAction='Opprett pakkelot med faktisk brukt kg/liter fra ferdig batch.';
      targetTab='traceability_batches';
    }else if(parcelLots.length>0){
      stage='packed';
      nextAction='Pakkelot er registrert. Fortsett lager/salg når varen faktisk flyttes.';
      targetTab='traceability_batches';
    }else if(cooperativeReceived.length>0&&cooperativeReceived.length===parcelIntakes.length){
      stage='cooperative_received';
      nextAction='Kooperativlevering er mottatt. Følg opp faktisk oppgjør når det foreligger.';
      targetTab='production';
    }else if(approvedPlans.length>0){
      stage='approved_waiting_harvest';
      nextAction='Registrer neste faktiske hendelse på parsellen.';
      targetTab='production';
    }

    const plannedKg=parcelPlans.reduce((sum:number,plan:any)=>sum+n(plan.estimated_kg),0);
    const actualKg=parcelIntakes.reduce((sum:number,row:any)=>sum+n(row.net_kg??row.kg),0);
    const packedUnits=parcelLots.reduce((sum:number,lot:any)=>sum+n(lot.initial_units),0);
    const details:string[]=[];
    if(parcelPlans.length)details.push(parcelPlans.length+' plan'+(parcelPlans.length===1?'':'er')+' · '+Math.round(plannedKg).toLocaleString('no-NO')+' kg planlagt');
    if(parcelIntakes.length)details.push(parcelIntakes.length+' mottaksrad'+(parcelIntakes.length===1?'':'er')+' · '+Math.round(actualKg).toLocaleString('no-NO')+' kg faktisk');
    if(parcelBatches.length)details.push(parcelBatches.length+' batch'+(parcelBatches.length===1?'':'er')+' · '+activeBatches.length+' aktive');
    if(parcelLots.length)details.push(parcelLots.length+' pakkelot · '+packedUnits.toLocaleString('no-NO')+' enheter');

    return{
      parcelId:parcel.id,
      parcelName:shortParcelName(parcel.name),
      variety:parcel.tree_variety||undefined,
      treeCount:n(parcel.tree_count),
      season,
      stage,
      stageLabel:stageLabel(stage),
      nextAction,
      targetTab,
      planCount:parcelPlans.length,
      approvedPlanCount:approvedPlans.length,
      plannedKg,
      actualKg,
      intakeCount:parcelIntakes.length,
      batchCount:parcelBatches.length,
      activeBatchCount:activeBatches.length,
      packedLotCount:parcelLots.length,
      packedUnits,
      details,
    };
  });

  return{
    season,
    parcels:rows,
    productiveParcelCount:rows.length,
    plannedParcelCount:rows.filter(row=>row.planCount>0).length,
    approvedParcelCount:rows.filter(row=>row.approvedPlanCount>0).length,
    startedParcelCount:rows.filter(row=>row.intakeCount>0).length,
    packedParcelCount:rows.filter(row=>row.packedLotCount>0).length,
  };
}
