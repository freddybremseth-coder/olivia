import { supabase } from './supabaseClient';
import { currentHarvestSeason, harvestSeasonForDate } from './harvestSeason';
import { expenseAllocatedAmount, fetchProductionCostData } from './productionCosts';

export type SeasonReadinessStatus='ready'|'action'|'waiting'|'attention';

export type SeasonReadinessStep={
  id:'plan'|'intake'|'production'|'packing'|'cost'|'organic';
  label:string;
  status:SeasonReadinessStatus;
  value:string;
  detail:string;
};

export type SeasonReadiness={
  season:string;
  plannedHarvests:number;
  approvedHarvests:number;
  plannedKg:number;
  intakeCount:number;
  receivedKg:number;
  batchCount:number;
  activeBatchCount:number;
  lotCount:number;
  packedUnits:number;
  seasonExpenseCount:number;
  unallocatedExpenseCount:number;
  unallocatedExpenseAmount:number;
  openOrganicCases:number;
  steps:SeasonReadinessStep[];
  nextAction:string;
};

const n=(v:unknown)=>Number(v||0);
const isOpenCase=(status?:string)=>!['closed','done','completed','approved','archived'].includes(String(status||'').toLowerCase());

export async function fetchSeasonReadiness():Promise<SeasonReadiness>{
  const season=currentHarvestSeason();
  const [plansRes,intakesRes,batchesRes,lotsRes,organicRes,costData]=await Promise.all([
    supabase.from('harvest_plans').select('id,planned_date,status,estimated_kg,actual_kg'),
    supabase.from('harvest_records').select('id,season,date,workflow_status,net_kg,kg,destination').not('workflow_status','is',null),
    supabase.from('batches').select('id,harvest_date,status,current_stage,weight,oil_yield_liters,table_olive_yield_kg,metadata'),
    supabase.from('product_lots').select('id,packed_at,status,initial_units,cost_confirmed'),
    supabase.from('caecv_cases').select('id,status'),
    fetchProductionCostData(),
  ]);

  const error=plansRes.error||intakesRes.error||batchesRes.error||lotsRes.error||organicRes.error;
  if(error)throw error;

  const plans=(plansRes.data||[]).filter((row:any)=>harvestSeasonForDate(row.planned_date)===season&&row.status!=='cancelled');
  const approvedHarvests=plans.filter((row:any)=>['approved','done'].includes(row.status)).length;
  const plannedKg=plans.reduce((s:number,row:any)=>s+n(row.estimated_kg),0);

  const intakes=(intakesRes.data||[]).filter((row:any)=>row.season===season||harvestSeasonForDate(row.date)===season);
  const receivedKg=intakes
    .filter((row:any)=>['received','processing','completed'].includes(row.workflow_status))
    .reduce((s:number,row:any)=>s+n(row.net_kg??row.kg),0);

  const batches=(batchesRes.data||[]).filter((row:any)=>{
    const explicit=row.metadata?.harvest_season;
    return explicit===season||harvestSeasonForDate(row.harvest_date)===season;
  });
  const activeBatchCount=batches.filter((row:any)=>row.status==='ACTIVE').length;

  const lots=(lotsRes.data||[]).filter((row:any)=>row.packed_at&&harvestSeasonForDate(String(row.packed_at).slice(0,10))===season);
  const packedUnits=lots.reduce((s:number,row:any)=>s+n(row.initial_units),0);

  const seasonExpenses=costData.expenses.filter(expense=>harvestSeasonForDate(expense.date)===season);
  const unallocated=seasonExpenses.map(expense=>({
    expense,
    remaining:Math.max(0,expense.amount-expenseAllocatedAmount(expense.id,costData.batchAllocations,costData.lotCosts)),
  })).filter(row=>row.remaining>0.005);
  const unallocatedExpenseAmount=unallocated.reduce((s,row)=>s+row.remaining,0);

  const openOrganicCases=(organicRes.data||[]).filter((row:any)=>isOpenCase(row.status)).length;

  const steps:SeasonReadinessStep[]=[
    {
      id:'plan',
      label:'Høsteplan',
      status:plans.length?'ready':'action',
      value:plans.length?String(plans.length):'0',
      detail:plans.length
        ? (approvedHarvests?approvedHarvests+' godkjent · ':'')+Math.round(plannedKg).toLocaleString('no-NO')+' kg planlagt'
        : 'Ingen høsteplan for '+season+' ennå.',
    },
    {
      id:'intake',
      label:'Høstemottak',
      status:intakes.length?'ready':'waiting',
      value:String(intakes.length),
      detail:intakes.length
        ? Math.round(receivedKg).toLocaleString('no-NO')+' kg mottatt/videreført'
        : 'Venter på første faktiske høsting og veiing.',
    },
    {
      id:'production',
      label:'Produksjonsbatch',
      status:batches.length?'ready':'waiting',
      value:String(batches.length),
      detail:batches.length
        ? activeBatchCount+' aktive batcher i sesongen'
        : 'Opprettes først fra mottatt råvare.',
    },
    {
      id:'packing',
      label:'Pakkelot',
      status:lots.length?'ready':'waiting',
      value:String(lots.length),
      detail:lots.length
        ? packedUnits.toLocaleString('no-NO')+' ferdige enheter'
        : 'Ingen pakkelot før varen faktisk er pakket.',
    },
    {
      id:'cost',
      label:'Kostgrunnlag',
      status:unallocated.length?(batches.length?'attention':'waiting'):(seasonExpenses.length?'ready':'waiting'),
      value:String(seasonExpenses.length),
      detail:seasonExpenses.length
        ? unallocated.length+' bilag med '+new Intl.NumberFormat('nb-NO',{style:'currency',currency:'EUR'}).format(unallocatedExpenseAmount)+' ufordelt'
        : 'Ingen sesongbilag registrert ennå.',
    },
    {
      id:'organic',
      label:'Økologisk / CAECV',
      status:openOrganicCases?'attention':'ready',
      value:String(openOrganicCases),
      detail:openOrganicCases
        ? openOrganicCases+' åpen sak krever oppfølging eller dokumentasjon'
        : 'Ingen åpne CAECV-saker registrert.',
    },
  ];

  let nextAction='Sesongflyten er klar for neste faktiske hendelse.';
  if(!plans.length)nextAction='Lag første høsteplan for '+season+' med parsell, sort, forventet kg og planlagt dato.';
  else if(openOrganicCases)nextAction='Følg opp den åpne CAECV-saken før kommersiell bruk krever dokumentasjonen.';
  else if(unallocated.length&&batches.length)nextAction='Gå gjennom kostnadsforslagene på aktive batcher og fordel bare dokumenterte beløp.';
  else if(!intakes.length)nextAction='Registrer første høsting med veiing og veieseddel når råvaren tas inn.';
  else if(!batches.length)nextAction='Opprett produksjonsbatch fra mottatt råvare som skal videreforedles.';
  else if(!lots.length)nextAction='Opprett pakkelot når ferdig produkt faktisk pakkes, med brukt kg/liter fra kildebatch.';

  return{
    season,
    plannedHarvests:plans.length,
    approvedHarvests,
    plannedKg,
    intakeCount:intakes.length,
    receivedKg,
    batchCount:batches.length,
    activeBatchCount,
    lotCount:lots.length,
    packedUnits,
    seasonExpenseCount:seasonExpenses.length,
    unallocatedExpenseCount:unallocated.length,
    unallocatedExpenseAmount,
    openOrganicCases,
    steps,
    nextAction,
  };
}
