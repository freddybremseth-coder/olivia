import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Brain, CalendarDays, CheckCircle2, CloudRain, FileText, HelpCircle, Image as ImageIcon,
  Leaf, Loader2, MessageSquareText, PackageSearch, Plus, RefreshCcw, ScanLine,
  ShieldCheck, Sprout, Trees, Upload, Video, X
} from 'lucide-react';
import type { Parcel } from '../types';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import { fetchRecentFarmObservations } from '../services/farmIoT';
import {
  addRainMeasurement,
  analyzeFarmSource,
  fetchFarmDocuments,
  fetchFarmEvents,
  fetchFarmInputs,
  fetchFarmTruthSummary,
  fetchRainMeasurements,
  fetchYearWheel,
  getFarmDocumentUrl,
  saveFarmSource,
  updateYearWheelStatus,
  type FarmDocument,
  type FarmEvent,
  type FarmScanResult,
  type FarmYearWheelItem,
  type RainMeasurement,
} from '../services/farmJournal';
import FarmQuestionsPanel from './FarmQuestionsPanel';
import { fetchFarmIntelligenceSummary, fetchFarmKnowledge, type FarmKnowledgeItem } from '../services/farmIntelligence';

type Tab='timeline'|'inbox'|'yearwheel'|'rain'|'photos'|'inputs'|'learning';

const MONTHS=['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'];
const inputClass='w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-green-500/50';

function badge(status:string){
  if(status==='completed'||status==='verified'||status==='done')return'border-green-500/25 bg-green-500/10 text-green-300';
  if(status==='recommended'||status==='suggested')return'border-blue-500/25 bg-blue-500/10 text-blue-300';
  if(status==='planned'||status==='approved')return'border-amber-300/25 bg-amber-300/10 text-amber-200';
  if(status==='ordered'||status==='purchased')return'border-purple-500/25 bg-purple-500/10 text-purple-300';
  if(status==='observed')return'border-cyan-500/25 bg-cyan-500/10 text-cyan-300';
  return'border-white/10 bg-white/5 text-slate-400';
}

function statusLabel(status:string){
  const map:Record<string,string>={
    completed:'Utført',planned:'Planlagt',recommended:'Anbefalt',ordered:'Bestilt',
    purchased:'Innkjøpt',observed:'Observert',verified:'Verifisert',needs_review:'Må kontrolleres',
    suggested:'Forslag',approved:'Godkjent',done:'Utført',skipped:'Hoppet over'
  };
  return map[status]||status;
}

const FarmJournalView:React.FC<{parcels:Parcel[]}>=({parcels})=>{
  const [tab,setTab]=useState<Tab>('timeline');
  const [documents,setDocuments]=useState<FarmDocument[]>([]);
  const [events,setEvents]=useState<FarmEvent[]>([]);
  const [yearWheel,setYearWheel]=useState<FarmYearWheelItem[]>([]);
  const [rain,setRain]=useState<RainMeasurement[]>([]);
  const [inputs,setInputs]=useState<any[]>([]);
  const [observations,setObservations]=useState<any[]>([]);
  const [summary,setSummary]=useState<any>(null);
  const [knowledge,setKnowledge]=useState<FarmKnowledgeItem[]>([]);
  const [intelligence,setIntelligence]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [messageText,setMessageText]=useState('');
  const [parcelId,setParcelId]=useState('');
  const [sourceNote,setSourceNote]=useState('');
  const [scan,setScan]=useState<FarmScanResult|null>(null);
  const [scanning,setScanning]=useState(false);
  const [saving,setSaving]=useState(false);
  const [rainDate,setRainDate]=useState(new Date().toISOString().slice(0,10));
  const [rainMm,setRainMm]=useState('');
  const [rainParcel,setRainParcel]=useState('');
  const [rainNotes,setRainNotes]=useState('');
  const [rainSaving,setRainSaving]=useState(false);
  const currentYear=new Date().getFullYear();
  const [wheelYear,setWheelYear]=useState(currentYear+1);

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const [docs,ev,wheel,rainRows,inputRows,obs,truth,knowledgeRows,intelligenceSummary]=await Promise.all([
        fetchFarmDocuments(100),
        fetchFarmEvents(250),
        fetchYearWheel(wheelYear),
        fetchRainMeasurements(365),
        fetchFarmInputs(),
        fetchRecentFarmObservations(100).catch(()=>[]),
        fetchFarmTruthSummary(),
        fetchFarmKnowledge({limit:100}),
        fetchFarmIntelligenceSummary(),
      ]);
      setDocuments(docs);setEvents(ev);setYearWheel(wheel);setRain(rainRows);setInputs(inputRows);setObservations(obs);setSummary(truth);setKnowledge(knowledgeRows);setIntelligence(intelligenceSummary);
    }catch(e:any){setError(e?.message||'Kunne ikke hente driftsjournalen.');}
    finally{setLoading(false);}
  };

  useEffect(()=>{load();},[]);

  useEffect(()=>{
    fetchYearWheel(wheelYear).then(setYearWheel).catch(e=>setError(e instanceof Error?e.message:'Kunne ikke hente årshjulet.'));
  },[wheelYear]);

  const parcelName=(id?:string|null)=>id?parcels.find(p=>p.id===id)?.name||id:'Hele gården';

  const runScan=async()=>{
    if(!file&&!messageText.trim()){setError('Velg fil/bilde/video eller lim inn en melding først.');return;}
    setScanning(true);setError('');setScan(null);
    try{
      const result=await analyzeFarmSource({file,text:messageText});
      setScan(result);
    }catch(e:any){setError(e?.message||'Kunne ikke analysere kilden.');}
    finally{setScanning(false);}
  };

  const approveSource=async()=>{
    if(!scan)return;
    setSaving(true);setError('');
    try{
      await saveFarmSource({scan,file,text:messageText,parcelId:parcelId||undefined,notes:sourceNote||undefined,verify:true});
      setFile(null);setMessageText('');setParcelId('');setSourceNote('');setScan(null);
      await load();
      setTab('timeline');
    }catch(e:any){setError(e?.message||'Kunne ikke lagre kilden som gårdens fasit.');}
    finally{setSaving(false);}
  };

  const saveRain=async()=>{
    const mm=Number(rainMm);
    if(!Number.isFinite(mm)||mm<0){setError('Skriv inn gyldig regnmengde i mm.');return;}
    setRainSaving(true);setError('');
    try{
      await addRainMeasurement({measuredOn:rainDate,mm,parcelId:rainParcel||undefined,notes:rainNotes||undefined});
      setRainMm('');setRainNotes('');await load();
    }catch(e:any){setError(e?.message||'Kunne ikke lagre regnmålingen.');}
    finally{setRainSaving(false);}
  };

  const openDoc=async(doc:FarmDocument)=>{
    try{
      const url=await getFarmDocumentUrl(doc);
      if(url)window.open(url,'_blank','noopener,noreferrer');
      else setError('Denne kilden har ingen lagret fil.');
    }catch(e:any){setError(e?.message||'Kunne ikke åpne dokumentet.');}
  };

  const rain30=useMemo(()=>{
    const threshold=new Date();threshold.setDate(threshold.getDate()-30);threshold.setHours(0,0,0,0);
    return rain.filter(r=>new Date(r.measured_on+'T12:00:00')>=threshold).reduce((s,r)=>s+Number(r.mm||0),0);
  },[rain]);

  const photoObservations=observations.filter(obs=>Array.isArray(obs.image_urls)&&obs.image_urls.length);
  const photoDocs=documents.filter(doc=>doc.document_kind==='photo'||doc.document_kind==='video');

  return <div className="space-y-7 pb-24 animate-in fade-in duration-500">
    <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,.11),transparent_35%)]"/>
      <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <DonaAnnaBrandMark variant="symbol" size="md" showText={false}/>
          <div>
            <p className="text-[10px] uppercase tracking-[.3em] font-black text-[#d9b657]">Doña Anna · gårdens hukommelse</p>
            <h2 className="text-3xl font-black text-white mt-1 flex items-center gap-2"><Leaf className="text-green-400"/> Driftsjournal</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-3xl">Dokumenter, meldinger, bilder, regn og faktisk arbeid blir én verifisert tidslinje. Olivia skiller mellom utført, planlagt, anbefalt, bestilt/innkjøpt og observert.</p>
          </div>
        </div>
        <button onClick={load} disabled={loading} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-green-400 disabled:opacity-40">{loading?<Loader2 className="animate-spin" size={18}/>:<RefreshCcw size={18}/>}</button>
      </div>
    </div>

    {error&&<div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100 flex gap-2"><AlertTriangle size={18}/>{error}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <Stat icon={<Trees size={18}/>} label="Registrerte trær" value={(summary?.treeCount||0).toLocaleString('no-NO')}/>
      <Stat icon={<CheckCircle2 size={18}/>} label="Verifiserte hendelser" value={events.length}/>
      <Stat icon={<FileText size={18}/>} label="Dokumenter" value={documents.length}/>
      <Stat icon={<CloudRain size={18}/>} label="Regn 30 dager" value={rain30.toLocaleString('no-NO')+' mm'}/>
      <Stat icon={<CalendarDays size={18}/>} label="Årshjul-forslag" value={yearWheel.filter(i=>i.status==='suggested').length}/>
      <Stat icon={<HelpCircle size={18}/>} label="Åpne spørsmål" value={intelligence?.openQuestionCount||0}/>
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {([
        ['timeline','Driftstidslinje',ShieldCheck],['inbox','Dokumentskanning',ScanLine],['yearwheel','Årshjul',CalendarDays],
        ['rain','Regn',CloudRain],['photos','Bilder / video',ImageIcon],['inputs','Produkter',PackageSearch],['learning','Spørsmål / læring',Brain]
      ] as [Tab,string,any][]).map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={'whitespace-nowrap rounded-xl px-4 py-3 text-xs font-bold flex items-center gap-2 border '+(tab===id?'bg-green-500 text-black border-green-400':'bg-white/5 text-slate-300 border-white/10')}><Icon size={15}/>{label}</button>)}
    </div>

    {tab==='timeline'&&<div className="space-y-3">
      <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest font-black text-green-400">Fasit</p><h3 className="text-xl font-black text-white">Hva er gjort, observert og planlagt?</h3></div><button onClick={()=>setTab('inbox')} className="rounded-xl bg-green-500 px-4 py-2.5 text-xs font-black text-black flex items-center gap-2"><Plus size={14}/> Legg inn kilde</button></div>
      {events.map(event=><div key={event.id} className="glass rounded-2xl border border-white/10 p-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2 items-center"><span className={'rounded-full border px-2.5 py-1 text-[10px] font-black '+badge(event.event_status)}>{statusLabel(event.event_status)}</span><span className="text-[10px] uppercase tracking-widest text-slate-600">{event.event_type.replaceAll('_',' ')}</span></div>
            <h4 className="text-white font-black mt-2">{event.title}</h4>
            <p className="text-xs text-slate-500 mt-1">{event.occurred_on||event.planned_for||event.period_label||'Dato ikke dokumentert'} · {parcelName(event.parcel_id)}</p>
            {event.description&&<p className="text-sm text-slate-400 mt-3">{event.description}</p>}
            {event.tree_count_delta!=null&&<p className="text-xs text-cyan-300 mt-2">Treantall i kilden: {event.tree_count_delta>0?'+':''}{event.tree_count_delta} trær. Endrer ikke parsellregisteret før faktisk planting/felling er verifisert.</p>}
            {event.products?.length?<div className="flex flex-wrap gap-2 mt-3">{event.products.map((p,i)=><span key={(p.name||'p')+i} className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-200">{p.name}{p.dose?' · '+p.dose:''}</span>)}</div>:null}
          </div>
          {event.recurrence_candidate&&<div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[10px] text-blue-200 max-w-xs">Kan brukes som sammenligningspunkt i neste årshjul. Ikke automatisk ordre.</div>}
        </div>
      </div>)}
      {!events.length&&!loading&&<Empty icon={<Sprout/>} title="Ingen verifisert driftshistorikk ennå" text="Last opp første faktura, arbeidsbeskrivelse, behandling, melding eller bilde."/>}
      {summary?.parcels?.length>0&&<div className="glass rounded-2xl border border-white/10 p-5 mt-5">
        <p className="text-[10px] uppercase tracking-widest font-black text-cyan-300">Tregrunnlag</p>
        <h4 className="text-lg font-black text-white mt-1">Registrert bestand per parsell</h4>
        <p className="text-xs text-slate-500 mt-1">Dette er fasit for treantall inntil faktisk planting, felling eller telling er verifisert og registeret oppdateres.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-4">{summary.parcels.map((parcel:any)=><div key={parcel.id} className="rounded-xl bg-black/20 border border-white/10 p-3"><p className="font-bold text-white">{parcel.name}</p><p className="text-xs text-slate-500 mt-1">{parcel.tree_variety||'Sort ikke registrert'}</p><p className="text-xl font-black text-cyan-300 mt-2">{Number(parcel.tree_count||0).toLocaleString('no-NO')} trær</p></div>)}</div>
      </div>}
    </div>}

    {tab==='inbox'&&<div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      <div className="glass rounded-[2rem] border border-white/10 p-6 space-y-4">
        <div><p className="text-[10px] uppercase tracking-widest font-black text-[#d9b657]">Ny kilde</p><h3 className="text-xl font-black text-white">Dokument, melding, bilde eller video</h3><p className="text-xs text-slate-500 mt-2">AI foreslår hva kilden beviser. Ingenting blir fasit før du trykker «Godkjenn og lagre».</p></div>
        <label className="block rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-5 text-center cursor-pointer hover:border-green-500/30">
          <Upload className="mx-auto text-green-400"/>
          <p className="text-sm font-bold text-white mt-2">{file?file.name:'Velg PDF, bilde eller video'}</p>
          <p className="text-xs text-slate-600 mt-1">PDF · JPG/PNG/WEBP/HEIC · MP4/WEBM</p>
          <input type="file" className="hidden" accept="application/pdf,image/*,video/mp4,video/webm,text/plain" onChange={e=>{setFile(e.target.files?.[0]||null);setScan(null);}}/>
        </label>
        <div className="text-center text-[10px] uppercase tracking-widest text-slate-600">eller lim inn en melding</div>
        <textarea className={inputClass+' min-h-[130px]'} value={messageText} onChange={e=>{setMessageText(e.target.value);setScan(null);}} placeholder="For eksempel WhatsApp-melding fra agronom, arbeider eller leverandør..."/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <select className={inputClass} value={parcelId} onChange={e=>setParcelId(e.target.value)}><option value="">Hele gården / parsell ukjent</option>{parcels.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <input className={inputClass} value={sourceNote} onChange={e=>setSourceNote(e.target.value)} placeholder="Eget notat (valgfritt)"/>
        </div>
        <button onClick={runScan} disabled={scanning||(!file&&!messageText.trim())} className="w-full rounded-2xl bg-[#d9b657] py-4 font-black text-black disabled:opacity-40 flex items-center justify-center gap-2">{scanning?<Loader2 className="animate-spin" size={18}/>:<ScanLine size={18}/>} Analyser kilde</button>
      </div>

      <div className="glass rounded-[2rem] border border-white/10 p-6">
        {!scan?<Empty icon={<ScanLine/>} title="Analyse vises her" text="Olivia skal aldri anta at et kjøpt produkt faktisk er brukt. Kilden må støtte hendelsen."/>:<div className="space-y-4">
          <div className="flex flex-wrap gap-2"><span className={'rounded-full border px-2.5 py-1 text-[10px] font-black '+badge(scan.evidenceStatus)}>{statusLabel(scan.evidenceStatus)}</span><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-300">{scan.documentKind}</span><span className="text-[10px] text-slate-600">Sikkerhet {Math.round((scan.confidence||0)*100)}%</span></div>
          <div><h3 className="text-xl font-black text-white">{scan.title}</h3><p className="text-sm text-slate-400 mt-2">{scan.summary}</p></div>
          {scan.warnings.length>0&&<div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">{scan.warnings.map(w=><p key={w} className="text-xs text-amber-100">• {w}</p>)}</div>}
          <div className="space-y-2"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Foreslåtte hendelser</p>{scan.events.map((event,i)=><div key={i} className="rounded-xl border border-white/10 bg-black/20 p-3"><div className="flex gap-2 flex-wrap"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+badge(event.eventStatus)}>{statusLabel(event.eventStatus)}</span><span className="text-[9px] text-slate-600 uppercase">{event.eventType}</span></div><p className="text-sm font-bold text-white mt-2">{event.title}</p><p className="text-xs text-slate-500 mt-1">{event.occurredOn||event.plannedFor||event.periodLabel||'Dato ikke dokumentert'}</p>{event.description&&<p className="text-xs text-slate-400 mt-2">{event.description}</p>}</div>)}</div>
          <button onClick={approveSource} disabled={saving} className="w-full rounded-2xl bg-green-500 py-4 font-black text-black disabled:opacity-40 flex items-center justify-center gap-2">{saving?<Loader2 className="animate-spin" size={18}/>:<CheckCircle2 size={18}/>} Godkjenn og lagre som fasit</button>
        </div>}
      </div>

      <div className="xl:col-span-2 space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">Siste kilder</p>
        {documents.slice(0,12).map(doc=><button key={doc.id} onClick={()=>openDoc(doc)} className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-green-500/20"><div className="flex justify-between gap-3"><div><div className="flex gap-2 flex-wrap"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+badge(doc.review_status)}>{statusLabel(doc.review_status)}</span><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+badge(doc.evidence_status)}>{statusLabel(doc.evidence_status)}</span></div><p className="font-bold text-white mt-2">{doc.title}</p><p className="text-xs text-slate-500 mt-1">{doc.document_date||'dato ukjent'} · {doc.source_name||doc.original_filename||doc.document_kind}</p></div><FileText className="text-slate-500" size={18}/></div></button>)}
      </div>
    </div>}

    {tab==='yearwheel'&&<div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-300">Årshjul {wheelYear}</p><h3 className="text-xl font-black text-white">Forslag bygget fra verifisert historikk</h3><p className="text-xs text-slate-500 mt-2">Historikk gir tidspunkt for vurdering — ikke automatisk sprøyteordre. Vær, fenologi og faktisk behov må bekreftes.</p></div><select value={wheelYear} onChange={e=>setWheelYear(Number(e.target.value))} className={inputClass+' md:w-auto'}><option value={currentYear}>{currentYear}</option><option value={currentYear+1}>{currentYear+1}</option><option value={currentYear+2}>{currentYear+2}</option></select></div>
      {MONTHS.map((month,index)=>{
        const rows=yearWheel.filter(item=>item.target_month===index+1);
        if(!rows.length)return null;
        return <div key={month} className="glass rounded-2xl border border-white/10 p-5"><h4 className="font-black text-white">{month}</h4><div className="space-y-2 mt-3">{rows.map(item=><div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="flex gap-2 flex-wrap"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+badge(item.status)}>{statusLabel(item.status)}</span><span className="text-[9px] uppercase text-slate-600">{item.basis}</span></div><p className="text-white font-bold mt-2">{item.title}</p><p className="text-xs text-slate-500 mt-1">{item.target_day?item.target_day+'. '+month.toLowerCase():item.period_label||month} · {parcelName(item.parcel_id)}</p>{item.notes&&<p className="text-xs text-slate-400 mt-2">{item.notes}</p>}</div><div className="flex gap-2">{item.status==='suggested'&&<button onClick={async()=>{await updateYearWheelStatus(item.id,'approved');await load();}} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black">Godkjenn</button>}{item.status==='approved'&&<button onClick={async()=>{await updateYearWheelStatus(item.id,'done');await load();}} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white">Utført</button>}</div></div>)}</div></div>;
      })}
      {!yearWheel.length&&<Empty icon={<CalendarDays/>} title="Årshjulet bygges fra historikken" text="Når et verifisert tilbakevendende arbeid har en dato, lager Olivia et forslag til samme periode neste år."/>}
    </div>}

    {tab==='rain'&&<div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      <div className="glass rounded-[2rem] border border-blue-500/20 bg-blue-500/[0.04] p-6 space-y-3">
        <CloudRain className="text-blue-300"/>
        <h3 className="text-xl font-black text-white">Registrer regn</h3>
        <p className="text-xs text-slate-500">Manuell regnmåler er verdifull fordi den beskriver akkurat gården, ikke bare en ekstern værgrid.</p>
        <input type="date" className={inputClass} value={rainDate} onChange={e=>setRainDate(e.target.value)}/>
        <input type="number" min="0" step="0.1" className={inputClass} value={rainMm} onChange={e=>setRainMm(e.target.value)} placeholder="mm regn"/>
        <select className={inputClass} value={rainParcel} onChange={e=>setRainParcel(e.target.value)}><option value="">Hele gården</option>{parcels.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <input className={inputClass} value={rainNotes} onChange={e=>setRainNotes(e.target.value)} placeholder="Notat / måler"/>
        <button onClick={saveRain} disabled={rainSaving} className="w-full rounded-xl bg-blue-400 py-3 font-black text-black disabled:opacity-40">{rainSaving?'Lagrer…':'Lagre regnmåling'}</button>
      </div>
      <div className="xl:col-span-2 glass rounded-[2rem] border border-white/10 p-6">
        <div className="grid grid-cols-3 gap-3"><Stat label="30 dager" value={rain30.toLocaleString('no-NO')+' mm'} icon={<CloudRain size={18}/>}/><Stat label="Målinger" value={rain.length} icon={<ShieldCheck size={18}/>}/><Stat label="Siste" value={rain[0]?rain[0].mm+' mm':'—'} icon={<CloudRain size={18}/>}/></div>
        <div className="space-y-2 mt-5">{rain.slice(0,20).map(row=><div key={row.id} className="rounded-xl border border-white/10 bg-black/20 p-3 flex justify-between gap-3"><div><p className="font-bold text-white">{row.measured_on}</p><p className="text-xs text-slate-500">{row.source} · {parcelName(row.parcel_id)}{row.notes?' · '+row.notes:''}</p></div><p className="text-xl font-black text-blue-300">{row.mm} mm</p></div>)}</div>
      </div>
    </div>}

    {tab==='photos'&&<div className="space-y-5">
      <div><p className="text-[10px] uppercase tracking-widest font-black text-cyan-300">Visuell historikk</p><h3 className="text-xl font-black text-white">Hvordan gården faktisk så ut</h3><p className="text-xs text-slate-500 mt-2">Feltbilder kan senere brukes av Feltkonsulent og Beskjæringsassistent sammen med verifisert driftsdata.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {photoObservations.map(obs=><div key={obs.id} className="glass rounded-2xl border border-white/10 overflow-hidden">{obs.image_urls?.[0]&&<img src={obs.image_urls[0]} className="h-56 w-full object-cover" alt={obs.title}/>}<div className="p-4"><p className="font-bold text-white">{obs.title}</p><p className="text-xs text-slate-500 mt-1">{String(obs.observed_at).slice(0,10)} · {parcelName(obs.parcel_id)}</p>{obs.notes&&<p className="text-xs text-slate-400 mt-2">{obs.notes}</p>}</div></div>)}
        {photoDocs.map(doc=><button key={doc.id} onClick={()=>openDoc(doc)} className="glass rounded-2xl border border-white/10 p-5 text-left"><div className="flex gap-3 items-center">{doc.document_kind==='video'?<Video className="text-purple-300"/>:<ImageIcon className="text-cyan-300"/>}<div><p className="font-bold text-white">{doc.title}</p><p className="text-xs text-slate-500 mt-1">{doc.document_date||String(doc.created_at).slice(0,10)} · {parcelName(doc.parcel_id)}</p></div></div><p className="text-xs text-slate-400 mt-3">{doc.extracted_summary||'Visuell dokumentasjon'}</p></button>)}
      </div>
      {!photoObservations.length&&!photoDocs.length&&<Empty icon={<ImageIcon/>} title="Ingen visuell historikk ennå" text="Bruk Feltlogg for bilder med observasjon, eller Dokumentskanning for foto/video som dokumentkilde."/>}
    </div>}

    {tab==='learning'&&<div className="space-y-5">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-black text-blue-300">Olivia Intelligence</p>
        <h3 className="text-xl font-black text-white">Spør når noe er uklart — lær av svaret</h3>
        <p className="text-xs text-slate-500 mt-2">Bekreftede brukersvar og verifiserte dokumenter veier høyere enn tidligere AI-vurderinger. Foreløpig kunnskap merkes tydelig og kan erstattes når bedre kilder kommer.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Brain size={18}/>} label="Kunnskapspunkter" value={intelligence?.knowledgeCount||0}/>
        <Stat icon={<HelpCircle size={18}/>} label="Åpne spørsmål" value={intelligence?.openQuestionCount||0}/>
        <Stat icon={<AlertTriangle size={18}/>} label="Høy/kritisk" value={intelligence?.highQuestionCount||0}/>
        <Stat icon={<ShieldCheck size={18}/>} label="Agentanalyser" value={intelligence?.assessmentCount||0}/>
      </div>
      <FarmQuestionsPanel title="Dette vil Olivia avklare" onAnswered={load}/>
      <div className="glass rounded-[2rem] border border-white/10 p-5">
        <div className="flex items-center gap-2"><Brain size={18} className="text-purple-300"/><div><p className="text-[10px] uppercase tracking-widest font-black text-purple-300">Kunnskapsbase</p><h4 className="text-lg font-black text-white">Hva Olivia mener den vet</h4></div></div>
        <div className="space-y-2 mt-4">
          {knowledge.map(item=><div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+(item.status==='verified'?'border-green-500/25 bg-green-500/10 text-green-300':item.status==='disputed'?'border-red-500/25 bg-red-500/10 text-red-300':'border-amber-300/25 bg-amber-300/10 text-amber-200')}>{item.status==='verified'?'Bekreftet':item.status==='disputed'?'Konflikt':'Foreløpig'}</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-600">{item.category}</span>
              <span className="text-[9px] text-slate-600">{Math.round(Number(item.confidence||0)*100)}%</span>
            </div>
            <p className="text-sm text-white mt-2">{item.statement}</p>
            {item.source_ref&&<p className="text-[10px] text-slate-600 mt-2">Kilde: {item.source_ref}</p>}
          </div>)}
          {!knowledge.length&&<p className="text-sm text-slate-600">Ingen kunnskapspunkter registrert ennå.</p>}
        </div>
      </div>
    </div>}

    {tab==='inputs'&&<div className="space-y-4">
      <div><p className="text-[10px] uppercase tracking-widest font-black text-purple-300">Innsatsmidler og produkter</p><h3 className="text-xl font-black text-white">Hva er kjøpt, anbefalt og hva brukes det til?</h3><p className="text-xs text-slate-500 mt-2">Produktregisteret fylles fra dokumentene, men «kjøpt» betyr ikke «brukt».</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{inputs.map((p:any)=><div key={p.id} className="glass rounded-2xl border border-white/10 p-4"><p className="font-black text-white">{p.name}</p>{p.composition&&<p className="text-xs text-purple-300 mt-2">Sammensetning: {p.composition}</p>}{p.intended_use&&<p className="text-xs text-slate-400 mt-2">Bruksområde: {p.intended_use}</p>}{p.dose&&<p className="text-xs text-slate-500 mt-1">Dose: {p.dose}</p>}{p.organic_note&&<p className="text-[10px] text-green-300 mt-2">{p.organic_note}</p>}</div>)}</div>
      {!inputs.length&&<Empty icon={<PackageSearch/>} title="Ingen produkter registrert" text="Når produktnavn, sammensetning eller dose finnes i et verifisert dokument, bygges registeret automatisk."/>}
    </div>}
  </div>;
};

const Stat:React.FC<{label:string;value:React.ReactNode;icon:React.ReactNode}>=({label,value,icon})=><div className="glass rounded-2xl border border-white/10 p-4"><div className="text-green-400">{icon}</div><p className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">{label}</p><p className="text-xl font-black text-white mt-1">{value}</p></div>;
const Empty:React.FC<{icon:React.ReactNode;title:string;text:string}>=({icon,title,text})=><div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500"><div className="mx-auto w-fit text-[#d9b657]">{icon}</div><p className="text-white font-bold mt-3">{title}</p><p className="text-sm mt-2 max-w-xl mx-auto">{text}</p></div>;

export default FarmJournalView;
