import React,{useEffect,useMemo,useState}from'react';
import{CheckCircle2,Euro,Factory,Loader2,PackageCheck,RefreshCcw,RotateCcw,Trash2}from'lucide-react';
import{
  addBatchCostAllocation,addLotDirectCost,confirmProductLotCost,deleteBatchCostAllocation,deleteLotDirectCost,
  expenseAllocatedAmount,fetchProductionCostData,reopenProductLotCost,
  type BatchCostAllocation,type CostBatch,type CostExpense,type CostLot,type LotCostSummary,type LotDirectCost
}from'../services/productionCosts';

const field='w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500/50';
const eur=(n:number)=>new Intl.NumberFormat('nb-NO',{style:'currency',currency:'EUR'}).format(n||0);

const ProductionCostAllocationPanel:React.FC=()=>{
 const[expenses,setExpenses]=useState<CostExpense[]>([]),[batches,setBatches]=useState<CostBatch[]>([]),[batchAllocations,setBatchAllocations]=useState<BatchCostAllocation[]>([]),[lots,setLots]=useState<CostLot[]>([]),[lotCosts,setLotCosts]=useState<LotDirectCost[]>([]),[lotSummaries,setLotSummaries]=useState<LotCostSummary[]>([]);
 const[loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState('');
 const[batchForm,setBatchForm]=useState({batchId:'',expenseId:'',allocationType:'direct',description:'',amount:''});
 const[lotForm,setLotForm]=useState({lotId:'',expenseId:'',costType:'packaging',description:'',amount:''});

 const load=async()=>{setLoading(true);setError('');try{const d=await fetchProductionCostData();setExpenses(d.expenses);setBatches(d.batches);setBatchAllocations(d.batchAllocations);setLots(d.lots);setLotCosts(d.lotCosts);setLotSummaries(d.lotSummaries);setBatchForm(f=>({...f,batchId:f.batchId||d.batches.find(b=>b.status==='ACTIVE')?.id||d.batches[0]?.id||''}));setLotForm(f=>({...f,lotId:f.lotId||d.lots[0]?.id||''}));}catch(e:any){setError(e?.message||'Kunne ikke hente produksjonskostnader.');}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 const act=async(key:string,fn:()=>Promise<unknown>)=>{setBusy(key);setError('');try{await fn();await load();}catch(e:any){setError(e?.message||'Handlingen kunne ikke fullføres.');}finally{setBusy('');}};

 const expenseRemaining=(id:string)=>{const e=expenses.find(x=>x.id===id);return e?Math.max(0,e.amount-expenseAllocatedAmount(id,batchAllocations,lotCosts)):0;};
 const unallocatedTotal=useMemo(()=>expenses.reduce((s,e)=>s+Math.max(0,e.amount-expenseAllocatedAmount(e.id,batchAllocations,lotCosts)),0),[expenses,batchAllocations,lotCosts]);
 const batchCostTotal=useMemo(()=>batchAllocations.reduce((s,a)=>s+a.amount,0),[batchAllocations]);
 const lotDirectTotal=useMemo(()=>lotCosts.reduce((s,a)=>s+a.amount,0),[lotCosts]);

 const saveBatch=()=>act('save-batch',async()=>{await addBatchCostAllocation({batchId:batchForm.batchId,expenseId:batchForm.expenseId||undefined,allocationType:batchForm.allocationType,description:batchForm.description,amount:Number(batchForm.amount),currency:'EUR'});setBatchForm(f=>({...f,expenseId:'',description:'',amount:''}));});
 const saveLot=()=>act('save-lot',async()=>{await addLotDirectCost({lotId:lotForm.lotId,expenseId:lotForm.expenseId||undefined,costType:lotForm.costType,description:lotForm.description,amount:Number(lotForm.amount),currency:'EUR'});setLotForm(f=>({...f,expenseId:'',description:'',amount:''}));});

 return <div className="space-y-5">
  <div className="rounded-[2rem] border border-purple-500/20 bg-purple-500/[0.04] p-6">
   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.24em] font-black text-purple-300">Sporbar varekost</p><h3 className="text-xl font-black text-white mt-1">Bilag → batch → pakkelot → ordre</h3><p className="text-xs text-slate-500 mt-2">Ingenting fordeles automatisk. Et bilag kan splittes mellom batcher, men Olivia stopper total fordeling over originalbeløpet.</p></div><button onClick={load} className="rounded-xl bg-white/5 p-2.5 text-purple-300">{loading?<Loader2 size={16} className="animate-spin"/>:<RefreshCcw size={16}/>}</button></div>
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
    <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Ikke fordelt fra bilag</p><p className="text-xl font-black text-white mt-2">{eur(unallocatedTotal)}</p></div>
    <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Fordelt til batch</p><p className="text-xl font-black text-white mt-2">{eur(batchCostTotal)}</p></div>
    <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Direkte lotkost</p><p className="text-xl font-black text-white mt-2">{eur(lotDirectTotal)}</p></div>
    <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Bekreftede pakkelot</p><p className="text-xl font-black text-white mt-2">{lotSummaries.filter(x=>x.cost_complete).length}</p></div>
   </div>
  </div>

  {error&&<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>}

  <div className="grid gap-5 xl:grid-cols-2">
   <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex items-center gap-2"><Factory size={18} className="text-blue-300"/><h4 className="font-black text-white">1. Fordel kostnad til produksjonsbatch</h4></div>
    <p className="text-xs text-slate-500 mt-2">Bruk bare beløp du faktisk kan dokumentere hører til batchen. Gårdskostnader kan stå ufordelt til grunnlaget er klart.</p>
    <div className="grid gap-3 mt-4">
     <select className={field} value={batchForm.batchId} onChange={e=>setBatchForm(f=>({...f,batchId:e.target.value}))}><option value="">Velg batch</option>{batches.map(b=><option key={b.id} value={b.id}>{b.traceability_code||b.id} · {b.olive_type||'sort'} · {b.harvest_date} · {b.status}</option>)}</select>
     <select className={field} value={batchForm.expenseId} onChange={e=>{const id=e.target.value;const ex=expenses.find(x=>x.id===id);setBatchForm(f=>({...f,expenseId:id,description:ex?ex.description:f.description,amount:id?String(expenseRemaining(id)):f.amount}));}}><option value="">Ingen eksisterende utgift / manuell dokumentert kost</option>{expenses.filter(e=>expenseRemaining(e.id)>0.005).map(e=><option key={e.id} value={e.id}>{e.date} · {e.description.slice(0,55)} · igjen {eur(expenseRemaining(e.id))}</option>)}</select>
     <div className="grid grid-cols-2 gap-3"><select className={field} value={batchForm.allocationType} onChange={e=>setBatchForm(f=>({...f,allocationType:e.target.value}))}><option value="direct">Direkte</option><option value="labor">Arbeid</option><option value="processing">Prosessering</option><option value="transport">Transport</option><option value="other">Annet</option></select><input className={field} type="number" min="0" step="0.01" placeholder="Beløp €" value={batchForm.amount} onChange={e=>setBatchForm(f=>({...f,amount:e.target.value}))}/></div>
     <input className={field} placeholder="Beskrivelse" value={batchForm.description} onChange={e=>setBatchForm(f=>({...f,description:e.target.value}))}/>
     <button disabled={busy==='save-batch'||!batchForm.batchId||Number(batchForm.amount)<=0} onClick={saveBatch} className="rounded-xl bg-blue-500 px-4 py-3 text-xs font-black text-black disabled:opacity-40">{busy==='save-batch'?'Lagrer…':'Fordel kostnad til batch'}</button>
    </div>
    <div className="space-y-2 mt-5">{batchAllocations.slice(0,12).map(a=>{const b=batches.find(x=>x.id===a.batch_id);const ex=expenses.find(x=>x.id===a.expense_id);return <div key={a.id} className="rounded-xl border border-white/10 bg-black/20 p-3 flex justify-between gap-3"><div><p className="text-sm font-bold text-white">{b?.traceability_code||a.batch_id}</p><p className="text-xs text-slate-500 mt-1">{a.description||ex?.description||a.allocation_type} · {eur(a.amount)}</p></div><button onClick={()=>act('del-'+a.id,()=>deleteBatchCostAllocation(a.id))} className="text-red-300"><Trash2 size={15}/></button></div>})}{!batchAllocations.length&&<p className="text-sm text-slate-500">Ingen batchkostnader er fordelt ennå.</p>}</div>
   </section>

   <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
    <div className="flex items-center gap-2"><PackageCheck size={18} className="text-green-300"/><h4 className="font-black text-white">2. Pakkelot og kost per enhet</h4></div>
    <p className="text-xs text-slate-500 mt-2">Råvarekost beregnes fra faktisk brukt kg/liter og dokumentert batchkost. Emballasje, arbeid og andre lotkostnader legges separat.</p>
    {!lots.length?<div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-500 mt-4">Ingen pakkelot finnes ennå. Denne delen aktiveres når første produksjon pakkes i Olivia.</div>:<>
     <div className="grid gap-3 mt-4">
      <select className={field} value={lotForm.lotId} onChange={e=>setLotForm(f=>({...f,lotId:e.target.value}))}>{lots.map(l=><option key={l.id} value={l.id}>{l.lot_code} · {l.initial_units} enheter</option>)}</select>
      <select className={field} value={lotForm.expenseId} onChange={e=>{const id=e.target.value;const ex=expenses.find(x=>x.id===id);setLotForm(f=>({...f,expenseId:id,description:ex?ex.description:f.description,amount:id?String(expenseRemaining(id)):f.amount}));}}><option value="">Ingen eksisterende utgift / manuell dokumentert kost</option>{expenses.filter(e=>expenseRemaining(e.id)>0.005).map(e=><option key={e.id} value={e.id}>{e.date} · {e.description.slice(0,55)} · igjen {eur(expenseRemaining(e.id))}</option>)}</select>
      <div className="grid grid-cols-2 gap-3"><select className={field} value={lotForm.costType} onChange={e=>setLotForm(f=>({...f,costType:e.target.value}))}><option value="packaging">Emballasje</option><option value="labor">Arbeid</option><option value="processing">Prosessering</option><option value="transport">Transport</option><option value="storage">Lagring</option><option value="other">Annet</option></select><input className={field} type="number" min="0" step="0.01" placeholder="Beløp €" value={lotForm.amount} onChange={e=>setLotForm(f=>({...f,amount:e.target.value}))}/></div>
      <input className={field} placeholder="Beskrivelse" value={lotForm.description} onChange={e=>setLotForm(f=>({...f,description:e.target.value}))}/>
      <button disabled={busy==='save-lot'||!lotForm.lotId||Number(lotForm.amount)<=0} onClick={saveLot} className="rounded-xl bg-green-500 px-4 py-3 text-xs font-black text-black disabled:opacity-40">{busy==='save-lot'?'Lagrer…':'Legg kostnad på pakkelot'}</button>
     </div>
     <div className="space-y-3 mt-5">{lotSummaries.map(s=><div key={s.lot_id} className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="flex flex-col md:flex-row md:items-start justify-between gap-3"><div><p className="font-black text-white">{s.lot_code}</p><p className="text-xs text-slate-500 mt-1">{s.initial_units} enheter · råvare {eur(s.allocated_source_cost)} · direkte lotkost {eur(s.direct_lot_cost)}</p></div><div className="text-left md:text-right"><p className="text-[9px] uppercase tracking-widest text-slate-500">Dokumentert kost / enhet</p><p className="text-xl font-black text-white">{s.documented_unit_cost==null?'—':eur(s.documented_unit_cost)}</p></div></div><div className="flex flex-wrap gap-2 mt-3">{s.cost_complete?<><span className="rounded-xl bg-green-500/10 px-3 py-2 text-xs font-bold text-green-300 flex items-center gap-1"><CheckCircle2 size={14}/>Bekreftet kost</span><button onClick={()=>act('reopen-'+s.lot_id,()=>reopenProductLotCost(s.lot_id))} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 flex items-center gap-1"><RotateCcw size={14}/>Åpne for korrigering</button></>:<button disabled={!s.source_cost_ready||busy==='confirm-'+s.lot_id} onClick={()=>act('confirm-'+s.lot_id,()=>confirmProductLotCost(s.lot_id))} className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-black disabled:opacity-35">Bekreft lotkost</button>} {!s.source_cost_ready&&<span className="rounded-xl bg-amber-300/10 px-3 py-2 text-xs text-amber-200">Mangler batchkost og/eller faktisk produksjonsutbytte</span>}</div></div>)}</div>
     <div className="space-y-2 mt-4">{lotCosts.slice(0,12).map(a=>{const lot=lots.find(x=>x.id===a.lot_id);return <div key={a.id} className="rounded-xl border border-white/10 bg-black/20 p-3 flex justify-between gap-3"><div><p className="text-sm font-bold text-white">{lot?.lot_code||a.lot_id}</p><p className="text-xs text-slate-500 mt-1">{a.description||a.cost_type} · {eur(a.amount)}</p></div><button onClick={()=>act('del-lot-'+a.id,()=>deleteLotDirectCost(a.id))} className="text-red-300"><Trash2 size={15}/></button></div>})}</div>
    </>}
   </section>
  </div>
 </div>;
};
export default ProductionCostAllocationPanel;
