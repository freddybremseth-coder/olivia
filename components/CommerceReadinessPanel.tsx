import React,{useEffect,useState}from'react';
import{AlertTriangle,CheckCircle2,Loader2,PackageCheck,ReceiptText,RefreshCcw,ShieldAlert}from'lucide-react';
import{fetchCommercialReadiness,type CommercialReadiness}from'../services/commerceReadiness';

const CommerceReadinessPanel:React.FC=()=>{
 const[data,setData]=useState<CommercialReadiness|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{setData(await fetchCommercialReadiness());}catch(e:any){setError(e?.message||'Kunne ikke kontrollere kommersielt oppsett.');}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 if(loading&&!data)return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-slate-400 flex items-center gap-2"><Loader2 size={17} className="animate-spin"/>Kontrollerer B2B-oppsett…</div>;
 if(error)return <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">{error}</div>;
 if(!data)return null;
 const critical=data.issues.filter(i=>i.severity==='critical'),warnings=data.issues.filter(i=>i.severity==='warning');
 return <div className={"rounded-3xl border p-5 "+(data.ready?'border-green-500/20 bg-green-500/[0.05]':'border-amber-300/20 bg-amber-300/[0.05]')}>
  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
   <div><p className="text-[10px] uppercase tracking-widest font-black text-amber-300">Kommersiell klarhet</p><h3 className="text-xl font-black text-white mt-1">{data.ready?'Kritiske salgsfelt er klare':'Noe må fylles inn før reelt B2B-salg'}</h3><p className="text-xs text-slate-500 mt-2">Olivia blokkerer ordre og faktura der data mangler, i stedet for å gjette pris, IVA eller juridiske opplysninger.</p></div>
   <button onClick={load} className="p-2.5 rounded-xl bg-white/5 text-amber-300">{loading?<Loader2 size={16} className="animate-spin"/>:<RefreshCcw size={16}/>}</button>
  </div>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
   <div className="rounded-2xl bg-black/20 p-4"><PackageCheck className="text-green-400" size={18}/><p className="text-[9px] uppercase text-slate-500 mt-2">Produkter klare</p><p className="text-2xl font-black text-white">{data.productsReady}/{data.productCount}</p></div>
   <div className="rounded-2xl bg-black/20 p-4"><ShieldAlert className="text-amber-300" size={18}/><p className="text-[9px] uppercase text-slate-500 mt-2">Kritiske felt</p><p className="text-2xl font-black text-white">{critical.length}</p></div>
   <div className="rounded-2xl bg-black/20 p-4"><AlertTriangle className="text-yellow-300" size={18}/><p className="text-[9px] uppercase text-slate-500 mt-2">Advarsler</p><p className="text-2xl font-black text-white">{warnings.length}</p></div>
   <div className="rounded-2xl bg-black/20 p-4"><ReceiptText className={data.sellerReady?'text-green-400':'text-red-300'} size={18}/><p className="text-[9px] uppercase text-slate-500 mt-2">Faktura</p><p className="text-sm font-black text-white mt-1">{data.sellerReady?'Selgerdata klar':'Utkastmodus'}</p></div>
  </div>
  {data.issues.length>0?<div className="mt-5 grid gap-2 md:grid-cols-2">{data.issues.slice(0,8).map(issue=><div key={issue.id} className={"rounded-xl border p-3 "+(issue.severity==='critical'?'border-red-500/20 bg-red-500/10':'border-yellow-500/20 bg-yellow-500/10')}><p className="text-sm font-bold text-white">{issue.title}</p><p className="text-xs text-slate-400 mt-1">{issue.detail}</p></div>)}</div>:<div className="mt-5 rounded-xl bg-green-500/10 p-3 text-sm text-green-200 flex items-center gap-2"><CheckCircle2 size={16}/>Ingen kommersielle oppsettfeil funnet.</div>}
 </div>;
};
export default CommerceReadinessPanel;
