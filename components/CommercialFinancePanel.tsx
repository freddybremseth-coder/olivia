import React,{useEffect,useState}from'react';
import{AlertTriangle,Clock3,Euro,Loader2,RefreshCcw,TrendingUp}from'lucide-react';
import{fetchCommercialFinanceSnapshot,type CommercialFinanceSnapshot}from'../services/commercialFinance';

const eur=(n:number)=>new Intl.NumberFormat('nb-NO',{style:'currency',currency:'EUR'}).format(n||0);

const CommercialFinancePanel:React.FC=()=>{
  const[data,setData]=useState<CommercialFinanceSnapshot|null>(null);
  const[loading,setLoading]=useState(true);
  const[error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{setData(await fetchCommercialFinanceSnapshot());}catch(e:any){setError(e?.message||'Kunne ikke hente kommersiell økonomi.');}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);

  if(loading&&!data)return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-slate-400 flex items-center gap-2"><Loader2 size={17} className="animate-spin"/>Henter kundefordringer og margin…</div>;
  if(error)return <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">{error}</div>;
  if(!data)return null;

  return <div className="space-y-5">
    <div className="rounded-[2rem] border border-blue-500/20 bg-blue-500/[0.04] p-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div><p className="text-[10px] uppercase tracking-[0.24em] font-black text-blue-300">Kundefordringer</p><h3 className="text-xl font-black text-white mt-1">Hva kundene skylder akkurat nå</h3><p className="text-xs text-slate-500 mt-2">Kun reelle fakturaer med beløp. Betalte fakturaer holdes utenfor utestående.</p></div>
        <button onClick={load} className="rounded-xl bg-white/5 p-2.5 text-blue-300">{loading?<Loader2 size={16} className="animate-spin"/>:<RefreshCcw size={16}/>}</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <div className="rounded-2xl bg-black/20 p-4"><Euro className="text-blue-300" size={18}/><p className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Utestående</p><p className="text-2xl font-black text-white">{eur(data.openReceivables)}</p></div>
        <div className="rounded-2xl bg-black/20 p-4"><Clock3 className="text-red-300" size={18}/><p className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">Forfalt</p><p className="text-2xl font-black text-white">{eur(data.overdueReceivables)}</p></div>
        <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Åpne fakturaer</p><p className="text-2xl font-black text-white mt-2">{data.unpaidInvoices}</p></div>
        <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Betalte fakturaer</p><p className="text-2xl font-black text-white mt-2">{data.paidInvoices}</p></div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">{data.aging.map(bucket=><div key={bucket.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">{bucket.label}</p><p className="font-black text-white mt-1">{eur(bucket.amount)}</p><p className="text-[10px] text-slate-600 mt-1">{bucket.invoices} faktura</p></div>)}</div>
    </div>

    <div className="rounded-[2rem] border border-green-500/20 bg-green-500/[0.04] p-6">
      <div className="flex items-start gap-3"><TrendingUp className="text-green-400 shrink-0"/><div><p className="text-[10px] uppercase tracking-[0.24em] font-black text-green-400">Dokumentert bruttomargin</p><h3 className="text-xl font-black text-white mt-1">Margin beregnes bare når kostpris er bekreftet</h3><p className="text-xs text-slate-500 mt-2">Ingen nullkost og ingen antatte produksjonskostnader. Ordre med manglende kostpris vises separat.</p></div></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Netto salg med kjent kost</p><p className="text-xl font-black text-white mt-2">{eur(data.documentedNetRevenue)}</p></div>
        <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Dokumentert varekost</p><p className="text-xl font-black text-white mt-2">{eur(data.documentedCost)}</p></div>
        <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Bruttomargin</p><p className="text-xl font-black text-green-300 mt-2">{eur(data.documentedGrossMargin)}</p><p className="text-[10px] text-slate-500 mt-1">{data.documentedGrossMarginPct==null?'—':data.documentedGrossMarginPct+'%'}</p></div>
        <div className="rounded-2xl bg-black/20 p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">Ordre uten kostgrunnlag</p><p className="text-xl font-black text-amber-300 mt-2">{data.ordersMissingCost}</p></div>
      </div>
      {data.margins.length>0&&<div className="space-y-2 mt-5">{data.margins.slice(0,10).map(row=><div key={row.orderId} className="rounded-xl border border-white/10 bg-black/20 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><p className="font-bold text-white">{row.orderNumber} · {row.customerName}</p><p className="text-xs text-slate-500 mt-1">Netto salg {eur(row.netRevenue)}{row.costComplete?' · kost '+eur(row.documentedCost||0):' · kost mangler: '+row.missingCostProducts.join(', ')}</p></div><div className="text-left md:text-right">{row.costComplete?<><p className="font-black text-green-300">{eur(row.grossMargin||0)}</p><p className="text-[10px] text-slate-500">{row.grossMarginPct}% bruttomargin</p></>:<span className="text-xs font-bold text-amber-300 flex items-center gap-1"><AlertTriangle size={14}/>Margin ukjent</span>}</div></div>)}</div>}
      {!data.margins.length&&<p className="text-sm text-slate-500 mt-5">Ingen reelle ordre med salgsverdi ennå.</p>}
    </div>
  </div>;
};
export default CommercialFinancePanel;
