import React,{useEffect,useMemo,useState}from'react';
import{CheckCircle2,Lightbulb,Loader2,RefreshCcw,ThumbsDown}from'lucide-react';
import{
  approveCostSuggestion,dismissCostSuggestion,fetchCostSuggestions,
  type CostSuggestion,type CostSuggestionTarget
}from'../services/costSuggestions';

const input='w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/50';
const money=(value:number,currency='EUR')=>new Intl.NumberFormat('nb-NO',{style:'currency',currency}).format(value||0);

const CostSuggestionReview:React.FC<{
  targetType:CostSuggestionTarget;
  targetId:string;
  eventDate?:string;
  stage?:string;
  compact?:boolean;
  onChanged?:()=>Promise<void>|void;
}>=({targetType,targetId,eventDate,stage,compact=false,onChanged})=>{
  const[rows,setRows]=useState<CostSuggestion[]>([]);
  const[amounts,setAmounts]=useState<Record<string,string>>({});
  const[loading,setLoading]=useState(false);
  const[busy,setBusy]=useState('');
  const[error,setError]=useState('');

  const load=async()=>{
    if(!targetId)return;
    setLoading(true);setError('');
    try{
      setRows(await fetchCostSuggestions({targetType,targetId,eventDate,stage}));
    }catch(e:any){
      setError(e?.message||'Kunne ikke hente kostnadsforslag.');
    }finally{setLoading(false);}
  };

  useEffect(()=>{load();},[targetType,targetId,eventDate,stage]);

  const approve=async(row:CostSuggestion)=>{
    const amount=Number(amounts[row.expense.id]);
    if(!Number.isFinite(amount)||amount<=0){setError('Skriv inn beløpet som faktisk skal fordeles før du godkjenner.');return;}
    setBusy('approve-'+row.expense.id);setError('');
    try{
      await approveCostSuggestion({targetType,targetId,suggestion:row,amount,stage});
      setAmounts(prev=>({...prev,[row.expense.id]:''}));
      await load();
      await onChanged?.();
    }catch(e:any){setError(e?.message||'Kunne ikke godkjenne kostnadsfordelingen.');}
    finally{setBusy('');}
  };

  const dismiss=async(row:CostSuggestion)=>{
    setBusy('dismiss-'+row.expense.id);setError('');
    try{
      await dismissCostSuggestion(targetType,targetId,row.expense.id);
      await load();
    }catch(e:any){setError(e?.message||'Kunne ikke skjule forslaget.');}
    finally{setBusy('');}
  };

  const high=useMemo(()=>rows.filter(r=>r.confidence==='high').length,[rows]);

  return <div className={"rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] "+(compact?'p-4':'p-5')}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex gap-3">
        <Lightbulb size={18} className="text-amber-300 mt-0.5 shrink-0"/>
        <div>
          <p className="text-sm font-black text-white">Mulige kostnader å koble</p>
          <p className="text-[11px] text-slate-500 mt-1">Forslag er bare kandidater. Olivia fordeler ingenting før du skriver beløp og godkjenner.</p>
        </div>
      </div>
      <button onClick={load} className="rounded-lg bg-white/5 p-2 text-amber-300">{loading?<Loader2 size={14} className="animate-spin"/>:<RefreshCcw size={14}/>}</button>
    </div>

    {error&&<div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-100">{error}</div>}

    {!loading&&rows.length===0&&<p className="mt-4 text-xs text-slate-500">Ingen dokumenterte bilag matcher dato, parsell og produksjonssteg godt nok akkurat nå. Det er bedre enn å gjette.</p>}

    {rows.length>0&&<div className="mt-4 space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{rows.length} kandidat{rows.length===1?'':'er'} · {high} med høy samsvarsscore</p>
      {rows.map(row=>{
        const tone=row.confidence==='high'?'text-green-300':row.confidence==='medium'?'text-amber-200':'text-slate-300';
        const label=row.confidence==='high'?'Høyt samsvar':row.confidence==='medium'?'Middels samsvar':'Bør vurderes';
        const value=amounts[row.expense.id]||'';
        return <div key={row.expense.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={"text-[10px] font-black uppercase "+tone}>{label}</span>
                <span className="text-[10px] text-slate-600">score {row.score}</span>
              </div>
              <p className="text-sm font-bold text-white mt-1">{row.expense.description}</p>
              <p className="text-[11px] text-slate-500 mt-1">{row.expense.date} · {row.expense.vendor||row.expense.category} · ufordelt {money(row.remaining,row.expense.currency)}</p>
              <p className="text-[10px] text-slate-600 mt-2">{row.reasons.join(' · ')}</p>
            </div>
            <span className="text-xs font-bold text-slate-300">{row.suggestedType}</span>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
            <input className={input} type="number" min="0" step="0.01" placeholder="Beløp som faktisk tilhører denne produksjonen" value={value} onChange={e=>setAmounts(prev=>({...prev,[row.expense.id]:e.target.value}))}/>
            <button onClick={()=>setAmounts(prev=>({...prev,[row.expense.id]:String(row.remaining)}))} className="rounded-xl bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-300">Bruk rest</button>
            <button disabled={busy==='approve-'+row.expense.id||!Number(value)} onClick={()=>approve(row)} className="rounded-xl bg-green-500 px-3 py-2.5 text-xs font-black text-black disabled:opacity-35 flex items-center justify-center gap-1">{busy==='approve-'+row.expense.id?<Loader2 size={14} className="animate-spin"/>:<CheckCircle2 size={14}/>}Godkjenn</button>
            <button disabled={busy==='dismiss-'+row.expense.id} onClick={()=>dismiss(row)} className="rounded-xl bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-400 flex items-center justify-center gap-1"><ThumbsDown size={14}/>Ikke relevant</button>
          </div>
        </div>;
      })}
    </div>}
  </div>;
};
export default CostSuggestionReview;
