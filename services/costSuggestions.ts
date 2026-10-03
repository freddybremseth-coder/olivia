import { isSupabaseConfigured, supabase } from './supabaseClient';
import {
  addBatchCostAllocation,
  addLotDirectCost,
  expenseAllocatedAmount,
  fetchProductionCostData,
  type CostExpense,
} from './productionCosts';

export type CostSuggestionTarget='batch'|'lot';

export type CostSuggestion={
  expense:CostExpense;
  remaining:number;
  score:number;
  confidence:'high'|'medium'|'review';
  reasons:string[];
  suggestedType:string;
};

type SuggestionContext={
  targetType:CostSuggestionTarget;
  targetId:string;
  eventDate?:string;
  stage?:string;
};

const textOf=(expense:CostExpense)=>(expense.category+' '+expense.description+' '+(expense.vendor||'')).toLowerCase();

function dateDiffDays(a?:string,b?:string){
  if(!a||!b)return undefined;
  const da=new Date(a+'T12:00:00');
  const db=new Date(b+'T12:00:00');
  if(Number.isNaN(da.getTime())||Number.isNaN(db.getTime()))return undefined;
  return Math.abs(Math.round((da.getTime()-db.getTime())/86400000));
}

function containsAny(text:string,words:string[]){
  return words.some(word=>text.includes(word));
}

function relevanceForBatch(text:string,stage:string){
  const s=stage.toUpperCase();
  const general=['innhøst','høst','transport','levering','prosess','produksjon','almazara','mølle','molino'];
  const pressing=['press','almazara','molienda','mølle','molino','transport','levering','oljeproduksjon'];
  const packing=['emball','flask','etikett','label','glass','kanne','boks','kartong','pakking','packaging','tapning','fylling'];
  const analysis=['analyse','laborator','lab','kvalitet','syre','peroksid','polyfenol'];
  const table=['lake','salt','mariner','eddik','krydder','glass','emball','pakking'];
  let words=general;
  if(s==='PRESSING'||s==='DEKANTERING'||s==='LAGRING_TANK')words=[...general,...pressing];
  if(s==='PAKKING')words=[...general,...packing];
  if(s==='ANALYSE')words=[...general,...analysis];
  if(['LAKE','SKYLLING','MARINERING','LAGRING'].includes(s))words=[...general,...table];
  return containsAny(text,words);
}

function relevanceForLot(text:string){
  return containsAny(text,[
    'emball','flask','etikett','label','glass','kanne','boks','kartong','pakking',
    'packaging','tapning','fylling','kork','lokk','transport','frakt','lagring'
  ]);
}

function suggestedBatchType(text:string,stage:string){
  if(containsAny(text,['transport','frakt','levering']))return'transport';
  if(containsAny(text,['arbeid','labor','mano de obra']))return'labor';
  if(containsAny(text,['press','almazara','molienda','prosess','produksjon']))return'processing';
  if(stage.toUpperCase()==='PRESSING')return'processing';
  return'direct';
}

function suggestedLotType(text:string){
  if(containsAny(text,['transport','frakt']))return'transport';
  if(containsAny(text,['arbeid','labor','mano de obra']))return'labor';
  if(containsAny(text,['lagring','storage']))return'storage';
  if(containsAny(text,['press','prosess','produksjon','tapning','fylling']))return'processing';
  return'packaging';
}

export async function fetchCostSuggestions(context:SuggestionContext):Promise<CostSuggestion[]>{
  if(!isSupabaseConfigured||!context.targetId)return[];
  const [data,dismissedRes]=await Promise.all([
    fetchProductionCostData(),
    supabase.from('cost_suggestion_dismissals')
      .select('expense_id')
      .eq('target_type',context.targetType)
      .eq('target_id',context.targetId),
  ]);
  if(dismissedRes.error)throw dismissedRes.error;

  const dismissed=new Set((dismissedRes.data||[]).map((row:any)=>row.expense_id));
  const targetBatch=context.targetType==='batch'?data.batches.find(b=>b.id===context.targetId):undefined;
  const targetLot=context.targetType==='lot'?data.lots.find(l=>l.id===context.targetId):undefined;
  const eventDate=context.eventDate||targetBatch?.harvest_date||targetLot?.packed_at?.slice(0,10);
  const eventYear=(eventDate||'').slice(0,4);
  const stage=context.stage||'';

  return data.expenses
    .map(expense=>{
      const remaining=Math.max(0,expense.amount-expenseAllocatedAmount(expense.id,data.batchAllocations,data.lotCosts));
      if(remaining<=0.005||dismissed.has(expense.id))return null;

      const alreadyOnTarget=context.targetType==='batch'
        ? data.batchAllocations.some(a=>a.batch_id===context.targetId&&a.expense_id===expense.id)
        : data.lotCosts.some(a=>a.lot_id===context.targetId&&a.expense_id===expense.id);
      if(alreadyOnTarget)return null;

      const days=dateDiffDays(expense.date,eventDate);
      if(days!=null&&days>180)return null;

      let score=0;
      const reasons:string[]=[];
      const text=textOf(expense);
      const relevant=context.targetType==='batch'?relevanceForBatch(text,stage):relevanceForLot(text);

      if(days!=null){
        if(days<=7){score+=35;reasons.push(String(days)+' dager fra registrert produksjonsdato');}
        else if(days<=30){score+=25;reasons.push(String(days)+' dager fra registrert produksjonsdato');}
        else if(days<=90){score+=12;reasons.push(String(days)+' dager fra registrert produksjonsdato');}
        else{score+=5;reasons.push(String(days)+' dager fra registrert produksjonsdato');}
      }

      if(eventYear&&expense.date.startsWith(eventYear)){score+=15;reasons.push('samme kalenderår');}

      if(context.targetType==='batch'){
        if(expense.parcel_id&&targetBatch?.parcel_id&&expense.parcel_id===targetBatch.parcel_id){
          score+=40;reasons.push('samme parsell');
        }else if(!expense.parcel_id){
          score+=5;reasons.push('registrert på hele gården');
        }
        if(relevant){score+=35;reasons.push('tekst/kategori matcher produksjonssteget');}
      }else{
        if(relevant){score+=45;reasons.push('tekst/kategori matcher pakking eller logistikk');}
      }

      if(score<50)return null;
      const confidence:CostSuggestion['confidence']=score>=80?'high':score>=60?'medium':'review';
      return{
        expense,remaining,score,confidence,reasons,
        suggestedType:context.targetType==='batch'?suggestedBatchType(text,stage):suggestedLotType(text),
      } satisfies CostSuggestion;
    })
    .filter(Boolean)
    .sort((a,b)=>(b as CostSuggestion).score-(a as CostSuggestion).score)
    .slice(0,8) as CostSuggestion[];
}

export async function approveCostSuggestion(input:{
  targetType:CostSuggestionTarget;
  targetId:string;
  suggestion:CostSuggestion;
  amount:number;
  stage?:string;
}){
  if(!Number.isFinite(input.amount)||input.amount<=0)throw new Error('Skriv inn beløpet som faktisk skal fordeles.');
  if(input.amount>input.suggestion.remaining+0.005)throw new Error('Beløpet er høyere enn ufordelt rest på bilaget.');

  if(input.targetType==='batch'){
    await addBatchCostAllocation({
      batchId:input.targetId,
      expenseId:input.suggestion.expense.id,
      allocationType:input.suggestion.suggestedType,
      description:input.suggestion.expense.description,
      amount:input.amount,
      currency:input.suggestion.expense.currency,
      notes:'Godkjent fra Olivia kostnadsforslag'+(input.stage?' ved '+input.stage:'')+'.',
    });
  }else{
    await addLotDirectCost({
      lotId:input.targetId,
      expenseId:input.suggestion.expense.id,
      costType:input.suggestion.suggestedType,
      description:input.suggestion.expense.description,
      amount:input.amount,
      currency:input.suggestion.expense.currency,
      notes:'Godkjent fra Olivia kostnadsforslag ved pakking.',
    });
  }
}

export async function dismissCostSuggestion(targetType:CostSuggestionTarget,targetId:string,expenseId:string,reason?:string){
  if(!isSupabaseConfigured)return;
  const {error}=await supabase.from('cost_suggestion_dismissals').upsert({
    id:'dismiss-'+targetType+'-'+targetId+'-'+expenseId,
    expense_id:expenseId,
    target_type:targetType,
    target_id:targetId,
    reason:reason||'Ikke relevant for denne produksjonen',
  },{onConflict:'expense_id,target_type,target_id'});
  if(error)throw error;
}
