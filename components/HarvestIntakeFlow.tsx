import React,{useEffect,useMemo,useState}from'react';
import{CheckCircle2,ExternalLink,Factory,FileUp,Loader2,PackageCheck,Plus,RefreshCcw,Scale,Truck,X}from'lucide-react';
import type{Parcel}from'../types';
import{fetchHarvestPlans,type HarvestPlanRecord}from'../services/harvestPlanning';
import{createBatchFromHarvest,createHarvestIntake,fetchHarvestIntakes,getHarvestDocumentUrl,markHarvestReceived,type HarvestDestination,type HarvestIntake}from'../services/harvestFlow';
import{currentHarvestSeason,harvestSeasonForDate}from'../services/harvestSeason';

const input='w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white outline-none focus:border-green-500/50';
const today=()=>new Date().toISOString().slice(0,10);
function destLabel(v?:HarvestDestination){return v==='oil'?'Olje':v==='table_olives'?'Bordoliven':v==='cooperative'?'Kooperativ':v==='other'?'Annet':'—';}
function statusLabel(v?:string){return v==='harvested'?'Høstet':v==='received'?'Mottatt':v==='processing'?'I produksjon':v==='completed'?'Ferdig':'—';}

const HarvestIntakeFlow:React.FC<{parcels:Parcel[];onChanged?:()=>void;initialPlanId?:string|null;onPlanConsumed?:()=>void}>=({parcels,onChanged,initialPlanId,onPlanConsumed})=>{
 const [rows,setRows]=useState<HarvestIntake[]>([]),[plans,setPlans]=useState<HarvestPlanRecord[]>([]);
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [open,setOpen]=useState(false),[file,setFile]=useState<File|null>(null);
 const [consumedInitialPlanId,setConsumedInitialPlanId]=useState('');
 const [form,setForm]=useState({parcelId:'',date:today(),variety:'',destination:'oil' as HarvestDestination,status:'harvested' as 'harvested'|'received',grossKg:'',tareKg:'0',containerCount:'',weighTicketNumber:'',harvestPlanId:'',notes:''});

 const load=async()=>{setLoading(true);setError('');try{const[r,p]=await Promise.all([fetchHarvestIntakes(),fetchHarvestPlans()]);setRows(r);setPlans(p.filter(x=>x.status==='approved'&&harvestSeasonForDate(x.planned_date)===currentHarvestSeason()));}catch(e:any){setError(e?.message||'Kunne ikke hente høsteflyt.');}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 useEffect(()=>{
  if(!initialPlanId||initialPlanId===consumedInitialPlanId)return;
  const plan=plans.find(p=>p.id===initialPlanId&&p.status==='approved');
  if(!plan)return;
  const parcel=parcels.find(p=>p.id===plan.parcel_id);
  setForm({
    parcelId:plan.parcel_id,
    date:today(),
    variety:plan.variety||parcel?.treeVariety||'',
    destination:destinationForPlan(plan),
    status:'harvested',
    grossKg:'',
    tareKg:'0',
    containerCount:'',
    weighTicketNumber:'',
    harvestPlanId:plan.id,
    notes:'',
  });
  setFile(null);
  setOpen(true);
  setConsumedInitialPlanId(initialPlanId);
  onPlanConsumed?.();
 },[initialPlanId,plans,parcels,consumedInitialPlanId,onPlanConsumed]);
 const net=Math.max(0,Number(form.grossKg||0)-Number(form.tareKg||0));
 const season=harvestSeasonForDate(form.date);
 const currentRows=useMemo(()=>rows.filter(r=>r.season===currentHarvestSeason()),[rows]);
 const openNew=()=>{const p=parcels[0];setForm({parcelId:p?.id||'',date:today(),variety:p?.treeVariety||'',destination:'oil',status:'harvested',grossKg:'',tareKg:'0',containerCount:'',weighTicketNumber:'',harvestPlanId:'',notes:''});setFile(null);setOpen(true);};
 const destinationForPlan=(plan?:HarvestPlanRecord):HarvestDestination=>plan?.purpose==='table_olives'?'table_olives':plan?.purpose==='oil'?'oil':'other';
 const selectPlan=(id:string)=>{const plan=plans.find(p=>p.id===id);const parcel=parcels.find(p=>p.id===plan?.parcel_id);setForm(f=>({...f,harvestPlanId:id,parcelId:plan?.parcel_id||f.parcelId,variety:plan?.variety||parcel?.treeVariety||f.variety,destination:plan?destinationForPlan(plan):f.destination}));};
 const save=async()=>{setSaving(true);setError('');try{await createHarvestIntake({parcelId:form.parcelId,season,date:form.date,variety:form.variety,destination:form.destination,status:form.status,grossKg:Number(form.grossKg),tareKg:Number(form.tareKg||0),containerCount:form.containerCount?Number(form.containerCount):undefined,weighTicketNumber:form.weighTicketNumber||undefined,harvestPlanId:form.harvestPlanId||undefined,notes:form.notes||undefined},file);setOpen(false);await load();onChanged?.();}catch(e:any){setError(e?.message||'Kunne ikke lagre høstingen.');}finally{setSaving(false);}};
 const receive=async(id:string)=>{setError('');try{await markHarvestReceived(id);await load();onChanged?.();}catch(e:any){setError(e?.message||'Kunne ikke markere mottak.');}};
 const makeBatch=async(id:string)=>{setError('');try{await createBatchFromHarvest(id);await load();onChanged?.();}catch(e:any){setError(e?.message||'Kunne ikke opprette produksjonsbatch.');}};
 const openTicket=async(path?:string)=>{try{const url=await getHarvestDocumentUrl(path);if(url)window.open(url,'_blank','noopener,noreferrer');}catch(e:any){setError(e?.message||'Kunne ikke åpne veieseddel.');}};

 return <div className="space-y-4">
  <div className="rounded-[2rem] border border-green-500/20 bg-green-500/[0.05] p-6">
   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest font-black text-green-400">Sesong {currentHarvestSeason()} · høsteflyt</p><h3 className="text-xl font-black text-white mt-1">Parsell → veiing → mottak → produksjonsbatch</h3><p className="text-xs text-slate-500 mt-2">Registrer det som faktisk skjer. Veieseddel kan være bilde eller PDF. Ingen produksjonsbatch opprettes før råvaren er mottatt.</p></div><div className="flex gap-2"><button onClick={load} className="p-3 rounded-xl bg-white/10 text-green-400">{loading?<Loader2 size={17} className="animate-spin"/>:<RefreshCcw size={17}/>}</button><button onClick={openNew} className="rounded-xl bg-green-500 px-4 py-3 text-sm font-black text-black flex items-center gap-2"><Plus size={17}/> Registrer høsting</button></div></div>
  </div>
  {error&&<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}
  <div className="space-y-3">{currentRows.map(r=>{const parcel=parcels.find(p=>p.id===r.parcel_id);return <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-black uppercase text-green-400">{statusLabel(r.workflow_status)}</span><span className="text-xs text-slate-500">{r.date} · {destLabel(r.destination)}</span></div><h4 className="text-lg font-black text-white mt-2">{r.variety} · {parcel?.name||r.parcel_id}</h4><p className="text-xs text-slate-500 mt-1">{r.container_count?r.container_count+' kasser · ':''}{r.weigh_ticket_number?'Veieseddel '+r.weigh_ticket_number:r.weigh_ticket_path?'Veieseddel vedlagt':'Ingen veieseddel vedlagt'}</p></div><div className="text-left md:text-right"><p className="text-[9px] uppercase tracking-widest text-slate-500">Netto</p><p className="text-3xl font-black text-white">{Number(r.net_kg||r.kg).toLocaleString('no-NO')} kg</p>{r.gross_kg!=null&&<p className="text-xs text-slate-600">Brutto {r.gross_kg} · tara {r.tare_kg||0}</p>}</div></div>
   <div className="flex flex-wrap gap-2 mt-4">{r.weigh_ticket_path&&<button onClick={()=>openTicket(r.weigh_ticket_path)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white flex items-center gap-1"><ExternalLink size={14}/> Veieseddel</button>}{r.workflow_status==='harvested'&&<button onClick={()=>receive(r.id)} className="rounded-xl bg-blue-500/15 px-3 py-2 text-xs font-bold text-blue-300 flex items-center gap-1"><Truck size={14}/> Marker mottatt</button>}{r.workflow_status==='received'&&r.destination!=='cooperative'&&<button onClick={()=>makeBatch(r.id)} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black flex items-center gap-1"><Factory size={14}/> Opprett produksjonsbatch</button>}{r.workflow_status==='processing'&&<span className="rounded-xl bg-purple-500/10 px-3 py-2 text-xs font-bold text-purple-300 flex items-center gap-1"><PackageCheck size={14}/> Batch {r.batch_id}</span>}{r.workflow_status==='received'&&r.destination==='cooperative'&&<span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-400"><CheckCircle2 size={14} className="inline mr-1"/> Mottatt for kooperativlevering</span>}</div>
  </div>})}{!currentRows.length&&!loading&&<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-500">Ingen nye høstemottak registrert for denne sesongen ennå. Historiske oppgjørsrader beholdes separat.</div>}</div>

  {open&&<div className="fixed inset-0 z-[2300] flex items-end md:items-start justify-center bg-black/80 p-0 md:px-4 md:pt-14 md:pb-4 backdrop-blur-md"><div className="w-full md:max-w-3xl max-h-[calc(100dvh-4.5rem)] overflow-y-auto rounded-t-[2rem] md:rounded-[2rem] border border-white/15 bg-[#0b0f0c] p-6 shadow-2xl">
   <div className="flex justify-between gap-4"><div><h3 className="text-2xl font-black text-white">Registrer høsting</h3><p className="text-xs text-slate-500 mt-1">Sesong {season} · netto beregnes fra brutto minus tara.</p></div><button onClick={()=>setOpen(false)} className="p-2 text-slate-400"><X/></button></div>
   {plans.length>0&&<label className="block text-xs text-slate-400 mt-5">Koble til godkjent høsteplan<select value={form.harvestPlanId} onChange={e=>selectPlan(e.target.value)} className={input+' mt-1'}><option value="">Ingen / direkte registrering</option>{plans.map(p=><option key={p.id} value={p.id}>{p.planned_date} planlagt · {p.variety} · {p.parcel_name} · {p.estimated_kg} kg</option>)}</select><span className="block text-[10px] text-slate-600 mt-1">Planen fyller parsell, sort og formål. Faktisk høstedato beholdes separat.</span></label>}
   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"><label className="text-xs text-slate-400">Parsell<select value={form.parcelId} onChange={e=>{const p=parcels.find(x=>x.id===e.target.value);setForm(f=>({...f,parcelId:e.target.value,variety:p?.treeVariety||f.variety}));}} className={input+' mt-1'}><option value="">Velg parsell</option>{parcels.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="text-xs text-slate-400">Dato<input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} className={input+' mt-1'}/></label></div>
   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3"><label className="text-xs text-slate-400">Sort<input value={form.variety} onChange={e=>setForm(f=>({...f,variety:e.target.value}))} className={input+' mt-1'}/></label><label className="text-xs text-slate-400">Destinasjon<select value={form.destination} onChange={e=>setForm(f=>({...f,destination:e.target.value as HarvestDestination}))} className={input+' mt-1'}><option value="oil">Egen oljeproduksjon</option><option value="table_olives">Bordoliven</option><option value="cooperative">Kooperativ</option><option value="other">Annet</option></select></label></div>
   <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3"><label className="text-xs text-slate-400">Brutto kg<input type="number" step="0.01" value={form.grossKg} onChange={e=>setForm(f=>({...f,grossKg:e.target.value}))} className={input+' mt-1'}/></label><label className="text-xs text-slate-400">Tara kg<input type="number" step="0.01" value={form.tareKg} onChange={e=>setForm(f=>({...f,tareKg:e.target.value}))} className={input+' mt-1'}/></label><div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3"><p className="text-[9px] uppercase text-slate-500">Netto</p><p className="text-xl font-black text-white mt-2">{net.toLocaleString('no-NO')} kg</p></div><label className="text-xs text-slate-400">Kasser<input type="number" value={form.containerCount} onChange={e=>setForm(f=>({...f,containerCount:e.target.value}))} className={input+' mt-1'}/></label></div>
   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3"><label className="text-xs text-slate-400">Veieseddel nr.<input value={form.weighTicketNumber} onChange={e=>setForm(f=>({...f,weighTicketNumber:e.target.value}))} className={input+' mt-1'} placeholder="Valgfritt"/></label><label className="text-xs text-slate-400">Bilde/PDF av veieseddel<div className="mt-1 rounded-xl border border-dashed border-white/15 bg-white/5 p-3"><input type="file" accept="application/pdf,image/*" onChange={e=>setFile(e.target.files?.[0]||null)} className="text-xs text-slate-400"/>{file&&<p className="text-xs text-green-400 mt-2"><FileUp size={13} className="inline mr-1"/>{file.name}</p>}</div></label></div>
   <div className="grid grid-cols-2 gap-3 mt-3"><button onClick={()=>setForm(f=>({...f,status:'harvested'}))} className={'rounded-xl border py-3 text-sm font-bold '+(form.status==='harvested'?'border-green-500 bg-green-500/15 text-green-300':'border-white/10 bg-white/5 text-slate-400')}>Høstet – ikke mottatt</button><button onClick={()=>setForm(f=>({...f,status:'received'}))} className={'rounded-xl border py-3 text-sm font-bold '+(form.status==='received'?'border-blue-500 bg-blue-500/15 text-blue-300':'border-white/10 bg-white/5 text-slate-400')}>Mottatt og veid</button></div>
   <label className="block text-xs text-slate-400 mt-3">Notat<textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className={input+' mt-1 min-h-[90px]'} placeholder="Kvalitet, skade, transport, tidspunkt eller annet som bør følge partiet."/></label>
   <button onClick={save} disabled={saving||!form.parcelId||!form.variety||net<=0} className="mt-5 w-full rounded-2xl bg-green-500 py-4 font-black text-black disabled:opacity-40 flex items-center justify-center gap-2">{saving?<Loader2 size={18} className="animate-spin"/>:<Scale size={18}/>} Lagre høsting</button>
  </div></div>}
 </div>;
};
export default HarvestIntakeFlow;
