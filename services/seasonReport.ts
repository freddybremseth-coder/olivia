import { supabase } from './supabaseClient';
import { fetchBatches } from './db';
import { currentHarvestSeason, harvestSeasonForDate, harvestSeasonForExpense } from './harvestSeason';
import { fetchHarvestPlans } from './harvestPlanning';
import {
  fetchOliviaExpenses,
  fetchOliviaHarvests,
  fetchOliviaIncome,
  fetchOliviaParcels,
  fetchOliviaSubsidies,
} from './oliviaSchemaData';
import { expenseAllocatedAmount, fetchProductionCostData } from './productionCosts';

export type SeasonReportSnapshot={
  season:string;
  availableSeasons:string[];
  parcelCount:number;
  productiveParcelCount:number;
  parcelsWithPlan:number;
  planCount:number;
  approvedPlanCount:number;
  plannedKg:number;
  actualHarvestKg:number;
  harvestValue:number;
  batchCount:number;
  activeBatchCount:number;
  lotCount:number;
  packedUnits:number;
  receivedIncome:number;
  invoicedIncome:number;
  expectedIncome:number;
  subsidyIncome:number;
  expenseTotal:number;
  cashResult:number;
  unallocatedExpenseCount:number;
  unallocatedExpenseAmount:number;
  harvestRows:number;
  expenseRows:number;
};

const n=(value:unknown)=>Number(value||0);

function normalizedSeason(explicit?:string,date?:string){
  if(explicit&&/^\d{4}\/\d{2}$/.test(explicit))return explicit;
  if(date)return harvestSeasonForDate(date);
  return explicit||currentHarvestSeason();
}

function incomeDate(row:any){
  if(row.earnedDate)return row.earnedDate;
  if(row.paymentDate)return row.paymentDate;
  if(row.paymentPeriod&&/^\d{4}-\d{2}$/.test(row.paymentPeriod))return row.paymentPeriod+'-01';
  return undefined;
}

function expenseSeason(row:any){
  return harvestSeasonForExpense(row.date,row.category,row.season);
}

export async function fetchSeasonReportSnapshot(requestedSeason?:string):Promise<SeasonReportSnapshot>{
  const [
    parcels,
    harvests,
    expenses,
    incomes,
    subsidies,
    batches,
    plans,
    productionCosts,
    lotsRes,
  ]=await Promise.all([
    fetchOliviaParcels(),
    fetchOliviaHarvests(),
    fetchOliviaExpenses(),
    fetchOliviaIncome(),
    fetchOliviaSubsidies(),
    fetchBatches().catch(()=>[]),
    fetchHarvestPlans().catch(()=>[]),
    fetchProductionCostData(),
    supabase.from('product_lots').select('id,packed_at,initial_units,status'),
  ]);

  if(lotsRes.error)throw lotsRes.error;
  const lots=lotsRes.data||[];

  const seasons=new Set<string>([currentHarvestSeason()]);
  harvests.forEach(row=>seasons.add(normalizedSeason(row.season,row.date)));
  expenses.forEach(row=>seasons.add(expenseSeason(row)));
  subsidies.forEach(row=>seasons.add(normalizedSeason(row.season,row.date)));
  incomes.forEach(row=>seasons.add(normalizedSeason(row.season,incomeDate(row))));
  batches.forEach(row=>seasons.add(harvestSeasonForDate(row.harvestDate)));
  plans.forEach(row=>seasons.add(harvestSeasonForDate(row.planned_date)));
  lots.forEach((row:any)=>{if(row.packed_at)seasons.add(harvestSeasonForDate(String(row.packed_at).slice(0,10)));});

  const availableSeasons=Array.from(seasons).filter(Boolean).sort((a,b)=>b.localeCompare(a));
  const season=requestedSeason&&availableSeasons.includes(requestedSeason)?requestedSeason:currentHarvestSeason();

  const seasonHarvests=harvests.filter(row=>normalizedSeason(row.season,row.date)===season);
  const seasonExpenses=expenses.filter(row=>expenseSeason(row)===season);
  const seasonSubsidies=subsidies.filter(row=>normalizedSeason(row.season,row.date)===season);
  const seasonIncomes=incomes.filter(row=>normalizedSeason(row.season,incomeDate(row))===season&&row.status!=='cancelled');
  const seasonBatches=batches.filter(row=>harvestSeasonForDate(row.harvestDate)===season);
  const seasonPlans=plans.filter(row=>row.status!=='cancelled'&&harvestSeasonForDate(row.planned_date)===season);
  const seasonLots=lots.filter((row:any)=>row.packed_at&&harvestSeasonForDate(String(row.packed_at).slice(0,10))===season);

  const plannedKg=seasonPlans.reduce((sum,row)=>sum+n(row.estimated_kg),0);
  const actualHarvestKg=seasonHarvests.reduce((sum,row)=>sum+n(row.kg),0);
  const harvestValue=seasonHarvests.reduce((sum,row)=>sum+n(row.kg)*n(row.pricePerKg),0);
  const receivedIncome=seasonIncomes.filter(row=>row.status==='received').reduce((sum,row)=>sum+n(row.amount),0);
  const invoicedIncome=seasonIncomes.filter(row=>row.status==='invoiced').reduce((sum,row)=>sum+n(row.amount),0);
  const expectedIncome=seasonIncomes.filter(row=>row.status==='expected').reduce((sum,row)=>sum+n(row.amount),0);
  const subsidyIncome=seasonSubsidies.reduce((sum,row)=>sum+n(row.amount),0);
  const expenseTotal=seasonExpenses.reduce((sum,row)=>sum+n(row.amount),0);

  const costExpenses=productionCosts.expenses.filter(row=>harvestSeasonForExpense(row.date,row.category,row.season)===season);
  const unallocated=costExpenses.map(expense=>({
    expense,
    remaining:Math.max(0,expense.amount-expenseAllocatedAmount(expense.id,productionCosts.batchAllocations,productionCosts.lotCosts)),
  })).filter(row=>row.remaining>0.005);

  return{
    season,
    availableSeasons,
    parcelCount:parcels.length,
    productiveParcelCount:parcels.filter(parcel=>n(parcel.treeCount)>0).length,
    parcelsWithPlan:new Set(seasonPlans.map(row=>row.parcel_id)).size,
    planCount:seasonPlans.length,
    approvedPlanCount:seasonPlans.filter(row=>['approved','done'].includes(row.status)).length,
    plannedKg,
    actualHarvestKg,
    harvestValue,
    batchCount:seasonBatches.length,
    activeBatchCount:seasonBatches.filter(row=>row.status==='ACTIVE').length,
    lotCount:seasonLots.length,
    packedUnits:seasonLots.reduce((sum:number,row:any)=>sum+n(row.initial_units),0),
    receivedIncome,
    invoicedIncome,
    expectedIncome,
    subsidyIncome,
    expenseTotal,
    cashResult:receivedIncome+subsidyIncome-expenseTotal,
    unallocatedExpenseCount:unallocated.length,
    unallocatedExpenseAmount:unallocated.reduce((sum,row)=>sum+row.remaining,0),
    harvestRows:seasonHarvests.length,
    expenseRows:seasonExpenses.length,
  };
}
