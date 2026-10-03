import React,{useEffect,useMemo,useState}from'react';
import{CheckCircle2,Factory,FlaskConical,Loader2,Save,Scale,X}from'lucide-react';
import type{Batch,ProductionStage}from'../types';
import{upsertBatch}from'../services/db';
import CostSuggestionReview from './CostSuggestionReview';

const input='w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white outline-none focus:border-green-500/50';
const OIL_STAGES:ProductionStage[]=['MOTTATT','PRESSING','DEKANTERING','LAGRING_TANK','ANALYSE','PAKKING','SALG'];
const TABLE_STAGES:ProductionStage[]=['PLUKKING','LAKE','SKYLLING','MARINERING','LAGRING','PAKKING','SALG'];
const label=(s?:ProductionStage)=>({MOTTATT:'Mottatt',PRESSING:'Pressing',DEKANTERING:'Dekantering',LAGRING_TANK:'Tanklagring',ANALYSE:'Analyse',PLUKKING:'Plukking',LAKE:'Lake',SKYLLING:'Skylling',MARINERING:'Marinering',LAGRING:'Lagring',PAKKING:'Pakking',SALG:'Klar for salg'} as any)[s||'']||s||'Ikke startet';

const BatchProductionWorkflow:React.FC<{
 batches:Batch[];
 onSaved:()=>void;
 initialBatchId?:string|null;
 onContextConsumed?:()=>void;
}>=({batches,onSaved,initialBatchId,onContextConsumed})=>{
 const active=useMemo(()=>batches.filter(b=>b.status==='ACTIVE'),[batches]);
 const [selected,setSelected]=useState<Batch|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [handledInitialBatchId,setHandledInitialBatchId]=useState('');
 const [stage,setStage]=useState<ProductionStage>('MOTTATT'),[oilLiters,setOilLiters]=useState(''),[tableKg,setTableKg]=useState('');
 const [quality,setQuality]=useState<Batch['quality']>('Standard'),[score,setScore]=useState(''),[acidity,setAcidity]=useState(''),[peroxide,setPeroxide]=useState(''),[phenols,setPhenols]=useState(''),[k232,setK232]=useState(''),[k270,setK270]=useState(''),[deltaK,setDeltaK]=useState('');
 const [location,setLocation]=useState(''),[tank,setTank]=useState(''),[processDate,setProcessDate]=useState(new Date().toISOString().slice(0,10)),[notes,setNotes]=useState('');

 const open=(b:Batch)=>{setSelected(b);setStage(b.currentStage||(b.yieldType==='Oil'?'MOTTATT':'PLUKKING'));setOilLiters(b.oilYieldLiters==null?'':String(b.oilYieldLiters));setTableKg(b.tableOliveYieldKg==null?'':String(b.tableOliveYieldKg));setQuality(b.quality||'Standard');setScore(b.qualityScore==null?'':String(b.qualityScore));setAcidity(b.qualityMetrics?.acidity==null?'':String(b.qualityMetrics.acidity));setPeroxide(b.qualityMetrics?.peroxide==null?'':String(b.qualityMetrics.peroxide));setPhenols(b.qualityMetrics?.phenols==null?'':String(b.qualityMetrics.phenols));setK232(b.qualityMetrics?.k232==null?'':String(b.qualityMetrics.k232));setK270(b.qualityMetrics?.k270==null?'':String(b.qualityMetrics.k270));setDeltaK(b.qualityMetrics?.deltaK==null?'':String(b.qualityMetrics.deltaK));setLocation(String(b.metadata?.processing_location||''));setTank(String(b.metadata?.tank_id||''));setProcessDate(String(b.metadata?.last_process_date||new Date().toISOString().slice(0,10)));setNotes('');setError('');};
 useEffect(()=>{
  if(!initialBatchId||initialBatchId===handledInitialBatchId)return;
  const batch=active.find(item=>item.id===initialBatchId);
  if(!batch)return;
  open(batch);
  setHandledInitialBatchId(initialBatchId);
  onContextConsumed?.();
 },[initialBatchId,handledInitialBatchId,active,onContextConsumed]);
 const n=(v:string)=>v.trim()===''?undefined:Number(v);
 const save=async()=>{if(!selected)return;setSaving(true);setError('');try{
   const metrics={...selected.qualityMetrics,acidity:n(acidity),peroxide:n(peroxide),phenols:n(phenols),k232:n(k232),k270:n(k270),deltaK:n(deltaK)};
   Object.keys(metrics).forEach(k=>{if((metrics as any)[k]===undefined)delete(metrics as any)[k];});
   const completed=Array.from(new Set([...(selected.completedStages||[]),...(selected.currentStage&&selected.currentStage!==stage?[selected.currentStage]:[])]));
   const updated:Batch={...selected,currentStage:stage,stageStartDate:processDate,completedStages:completed,quality,qualityScore:n(score),oilYieldLiters:selected.yieldType==='Oil'?n(oilLiters):selected.oilYieldLiters,tableOliveYieldKg:selected.yieldType==='Table'?n(tableKg):selected.tableOliveYieldKg,qualityMetrics:Object.keys(metrics).length?metrics:undefined,metadata:{...(selected.metadata||{}),processing_location:location||undefined,tank_id:tank||undefined,last_process_date:processDate},logs:[...(selected.logs||[]),{stage,startDate:processDate,notes:notes||('Status oppdatert til '+label(stage))}]};
   await upsertBatch(updated);setSelected(null);await onSaved();
 }catch(e:any){setError(e?.message||'Kunne ikke lagre produksjonsdata.');}finally{setSaving(false);}};

 return <div className="rounded-[2rem] border border-blue-500/20 bg-blue-500/[0.05] p-6">
  <div className="flex items-start gap-3"><Factory className="text-blue-400 shrink-0"/><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-400">Produksjonsflyt</p><h3 className="text-xl font-black text-white mt-1">Mottatt råvare → prosess → analyse → pakking</h3><p className="text-xs text-slate-500 mt-2">Oppdater bare når steget faktisk er utført. Labverdier og utbytte blir en del av sporbarheten når de er registrert.</p></div></div>
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-5">{active.map(b=><button key={b.id} onClick={()=>open(b)} className="text-left rounded-2xl border border-white/10 bg-black/20 p-4 hover:border-blue-500/30"><div className="flex justify-between gap-3"><div><p className="font-black text-white">{b.traceabilityCode||b.id}</p><p className="text-xs text-slate-500 mt-1">{b.oliveType||'Sort ikke satt'} · {b.yieldType==='Oil'?'Olje':'Bordoliven'} · {b.weight} kg</p></div><span className="text-xs font-bold text-blue-300">{label(b.currentStage)}</span></div><div className="flex gap-4 mt-3 text-xs text-slate-500">{b.oilYieldLiters!=null&&<span>{b.oilYieldLiters} L olje</span>}{b.tableOliveYieldKg!=null&&<span>{b.tableOliveYieldKg} kg bordoliven</span>}{b.qualityMetrics&&<span className="text-green-400"><CheckCircle2 size={12} className="inline mr-1"/>Analyse registrert</span>}</div></button>)}</div>
  {!active.length&&<p className="text-sm text-slate-500 mt-4">Ingen aktive produksjonsbatcher. Opprett batch fra et mottatt høsteparti først.</p>}

  {selected&&<div className="fixed inset-0 z-[2350] flex items-end md:items-start justify-center bg-black/80 p-0 md:px-4 md:pt-14 md:pb-4 backdrop-blur-md"><div className="w-full md:max-w-4xl max-h-[calc(100dvh-4.5rem)] overflow-y-auto rounded-t-[2rem] md:rounded-[2rem] border border-white/15 bg-[#0b0f0c] p-6 shadow-2xl">
   <div className="flex justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest text-blue-400 font-black">{selected.traceabilityCode||selected.id}</p><h3 className="text-2xl font-black text-white mt-1">Registrer produksjon</h3><p className="text-xs text-slate-500 mt-1">{selected.oliveType} · {selected.weight} kg inn · {selected.yieldType==='Oil'?'olje':'bordoliven'}</p></div><button onClick={()=>setSelected(null)} className="p-2 text-slate-400"><X/></button></div>
   {error&&<div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>}
   <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5"><label className="text-xs text-slate-400">Steg<select value={stage} onChange={e=>setStage(e.target.value as ProductionStage)} className={input+' mt-1'}>{(selected.yieldType==='Oil'?OIL_STAGES:TABLE_STAGES).map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label><label className="text-xs text-slate-400">Dato<input type="date" value={processDate} onChange={e=>setProcessDate(e.target.value)} className={input+' mt-1'}/></label><label className="text-xs text-slate-400">Kvalitetsklasse<select value={quality} onChange={e=>setQuality(e.target.value as Batch['quality'])} className={input+' mt-1'}><option>Premium</option><option>Good</option><option>Standard</option><option>Commercial</option></select></label></div>
   <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">{selected.yieldType==='Oil'?<label className="text-xs text-slate-400">Produsert olje, liter<input type="number" step="0.01" value={oilLiters} onChange={e=>setOilLiters(e.target.value)} className={input+' mt-1'}/></label>:<label className="text-xs text-slate-400">Bordoliven etter sortering, kg<input type="number" step="0.01" value={tableKg} onChange={e=>setTableKg(e.target.value)} className={input+' mt-1'}/></label>}<label className="text-xs text-slate-400">Prosesseringssted<input value={location} onChange={e=>setLocation(e.target.value)} className={input+' mt-1'} placeholder="Fylles bare hvis dokumentert"/></label><label className="text-xs text-slate-400">Tank / beholder<input value={tank} onChange={e=>setTank(e.target.value)} className={input+' mt-1'} placeholder="Valgfritt"/></label></div>
   <div className="mt-6 flex items-center gap-2"><FlaskConical className="text-purple-400"/><h4 className="font-black text-white">Analyse / kvalitet</h4></div><p className="text-xs text-slate-500 mt-1">La feltene stå tomme til laboratorieresultat eller faktisk måling finnes.</p>
   <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3"><label className="text-xs text-slate-400">Syre %<input type="number" step="0.01" value={acidity} onChange={e=>setAcidity(e.target.value)} className={input+' mt-1'}/></label><label className="text-xs text-slate-400">Peroksid<input type="number" step="0.01" value={peroxide} onChange={e=>setPeroxide(e.target.value)} className={input+' mt-1'}/></label><label className="text-xs text-slate-400">Polyfenoler mg/kg<input type="number" step="0.1" value={phenols} onChange={e=>setPhenols(e.target.value)} className={input+' mt-1'}/></label><label className="text-xs text-slate-400">Kvalitetsscore<input type="number" step="0.1" value={score} onChange={e=>setScore(e.target.value)} className={input+' mt-1'}/></label></div>
   <div className="grid grid-cols-3 gap-3 mt-3"><label className="text-xs text-slate-400">K232<input type="number" step="0.001" value={k232} onChange={e=>setK232(e.target.value)} className={input+' mt-1'}/></label><label className="text-xs text-slate-400">K270<input type="number" step="0.001" value={k270} onChange={e=>setK270(e.target.value)} className={input+' mt-1'}/></label><label className="text-xs text-slate-400">ΔK<input type="number" step="0.001" value={deltaK} onChange={e=>setDeltaK(e.target.value)} className={input+' mt-1'}/></label></div>
   <label className="block text-xs text-slate-400 mt-3">Notat<textarea value={notes} onChange={e=>setNotes(e.target.value)} className={input+' mt-1 min-h-[90px]'} placeholder="Pressing, temperatur, levering, sensorikk, avvik eller annen faktisk produksjonsinfo."/></label>
   <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-center gap-3"><Scale className="text-green-400"/><div><p className="text-xs text-slate-500">Råvare inn</p><p className="font-black text-white">{selected.weight} kg</p></div></div>
   <div className="mt-4">
    <CostSuggestionReview targetType="batch" targetId={selected.id} eventDate={processDate} stage={stage} compact />
   </div>
   <button onClick={save} disabled={saving} className="mt-5 w-full rounded-2xl bg-blue-500 py-4 font-black text-black disabled:opacity-40 flex items-center justify-center gap-2">{saving?<Loader2 size={18} className="animate-spin"/>:<Save size={18}/>} Lagre produksjonssteg</button>
  </div></div>}
 </div>;
};
export default BatchProductionWorkflow;
