import { isSupabaseConfigured, supabase } from './supabaseClient';

export type CostExpense={
  id:string;date:string;season:string;category:string;description:string;amount:number;currency:string;vendor?:string;parcel_id?:string;
};
export type CostBatch={
  id:string;parcel_id?:string;olive_type?:string;harvest_date:string;weight:number;yield_type:'Oil'|'Table';oil_yield_liters?:number;table_olive_yield_kg?:number;traceability_code?:string;status:string;
};
export type BatchCostAllocation={
  id:string;batch_id:string;expense_id?:string;allocation_type:string;description:string;amount:number;currency:string;notes?:string;created_at:string;
};
export type LotDirectCost={
  id:string;lot_id:string;expense_id?:string;cost_type:string;description:string;amount:number;currency:string;notes?:string;created_at:string;
};
export type LotCostSummary={
  lot_id:string;product_id:string;lot_code:string;initial_units:number;cost_confirmed:boolean;cost_confirmed_at?:string;source_count:number;source_cost_ready:boolean;allocated_source_cost:number;direct_lot_cost:number;total_documented_cost:number;documented_unit_cost?:number;cost_complete:boolean;
};
export type CostLot={
  id:string;product_id:string;lot_code:string;status:string;initial_units:number;packed_at?:string;cost_confirmed:boolean;cost_confirmed_at?:string;cost_notes?:string;
};

const n=(v:unknown)=>Number(v||0);

export async function fetchProductionCostData(){
  if(!isSupabaseConfigured)return{expenses:[],batches:[],batchAllocations:[],lots:[],lotCosts:[],lotSummaries:[]};

  const [e,b,ba,l,lc,ls]=await Promise.all([
    supabase.from('farm_expenses').select('id,date,season,category,description,amount,currency,vendor,parcel_id').eq('accounting_status','posted').order('date',{ascending:false}),
    supabase.from('batches').select('id,parcel_id,olive_type,harvest_date,weight,yield_type,oil_yield_liters,table_olive_yield_kg,traceability_code,status').order('harvest_date',{ascending:false}),
    supabase.from('batch_cost_allocations').select('*').order('created_at',{ascending:false}),
    supabase.from('product_lots').select('id,product_id,lot_code,status,initial_units,packed_at,cost_confirmed,cost_confirmed_at,cost_notes').order('created_at',{ascending:false}),
    supabase.from('product_lot_costs').select('*').order('created_at',{ascending:false}),
    supabase.from('product_lot_cost_summary').select('*').order('lot_code'),
  ]);
  const err=e.error||b.error||ba.error||l.error||lc.error||ls.error;
  if(err)throw err;
  return{
    expenses:(e.data||[]).map((r:any)=>({...r,amount:n(r.amount)})) as CostExpense[],
    batches:(b.data||[]).map((r:any)=>({...r,weight:n(r.weight),oil_yield_liters:r.oil_yield_liters==null?undefined:n(r.oil_yield_liters),table_olive_yield_kg:r.table_olive_yield_kg==null?undefined:n(r.table_olive_yield_kg)})) as CostBatch[],
    batchAllocations:(ba.data||[]).map((r:any)=>({...r,amount:n(r.amount)})) as BatchCostAllocation[],
    lots:(l.data||[]).map((r:any)=>({...r,initial_units:n(r.initial_units)})) as CostLot[],
    lotCosts:(lc.data||[]).map((r:any)=>({...r,amount:n(r.amount)})) as LotDirectCost[],
    lotSummaries:(ls.data||[]).map((r:any)=>({...r,initial_units:n(r.initial_units),source_count:n(r.source_count),allocated_source_cost:n(r.allocated_source_cost),direct_lot_cost:n(r.direct_lot_cost),total_documented_cost:n(r.total_documented_cost),documented_unit_cost:r.documented_unit_cost==null?undefined:n(r.documented_unit_cost),cost_confirmed:Boolean(r.cost_confirmed),source_cost_ready:Boolean(r.source_cost_ready),cost_complete:Boolean(r.cost_complete)})) as LotCostSummary[],
  };
}

export function expenseAllocatedAmount(expenseId:string,batchAllocations:BatchCostAllocation[],lotCosts:LotDirectCost[]){
  return batchAllocations.filter(a=>a.expense_id===expenseId).reduce((s,a)=>s+a.amount,0)+lotCosts.filter(a=>a.expense_id===expenseId).reduce((s,a)=>s+a.amount,0);
}

export async function addBatchCostAllocation(input:{batchId:string;expenseId?:string;allocationType:string;description:string;amount:number;currency?:string;notes?:string}){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  if(!input.batchId)throw new Error('Velg produksjonsbatch.');
  if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error('Beløpet må være større enn 0.');
  if(!input.expenseId&&!input.description.trim())throw new Error('Beskriv kostnaden når den ikke er koblet til et eksisterende bilag.');
  const {error}=await supabase.from('batch_cost_allocations').insert({
    id:'batch-cost-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
    batch_id:input.batchId,expense_id:input.expenseId||null,allocation_type:input.allocationType,
    description:input.description.trim(),amount:input.amount,currency:input.currency||'EUR',notes:input.notes?.trim()||null,
  });
  if(error)throw error;
}

export async function deleteBatchCostAllocation(id:string){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const {error}=await supabase.from('batch_cost_allocations').delete().eq('id',id);
  if(error)throw error;
}

export async function addLotDirectCost(input:{lotId:string;expenseId?:string;costType:string;description:string;amount:number;currency?:string;notes?:string}){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  if(!input.lotId)throw new Error('Velg pakkelot.');
  if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error('Beløpet må være større enn 0.');
  if(!input.expenseId&&!input.description.trim())throw new Error('Beskriv kostnaden når den ikke er koblet til et eksisterende bilag.');
  const {error}=await supabase.from('product_lot_costs').insert({
    id:'lot-cost-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),
    lot_id:input.lotId,expense_id:input.expenseId||null,cost_type:input.costType,
    description:input.description.trim(),amount:input.amount,currency:input.currency||'EUR',notes:input.notes?.trim()||null,
  });
  if(error)throw error;
}

export async function deleteLotDirectCost(id:string){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const {error}=await supabase.from('product_lot_costs').delete().eq('id',id);
  if(error)throw error;
}

export async function confirmProductLotCost(lotId:string,notes?:string){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const {error}=await supabase.rpc('confirm_product_lot_cost',{p_lot_id:lotId,p_notes:notes||null});
  if(error)throw error;
}

export async function reopenProductLotCost(lotId:string){
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const {error}=await supabase.rpc('reopen_product_lot_cost',{p_lot_id:lotId});
  if(error)throw error;
}
