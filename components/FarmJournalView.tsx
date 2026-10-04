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
  completeYearWheelItem,
  confirmFarmInputUsage,
  fetchFarmDocuments,
  fetchFarmEvents,
  fetchFarmInputs,
  fetchFarmInputEvidenceLines,
  fetchFarmTruthSummary,
  fetchRainMeasurements,
  fetchYearWheel,
  getFarmDocumentUrl,
  saveFarmEvidenceImage,
  saveFarmSource,
  updateYearWheelStatus,
  type FarmDocument,
  type FarmEvent,
  type FarmScanResult,
  type FarmYearWheelItem,
  type FarmInputEvidenceLine,
  type RainMeasurement,
} from '../services/farmJournal';
import FarmQuestionsPanel from './FarmQuestionsPanel';
import { fetchFarmIntelligenceSummary, fetchFarmKnowledge, type FarmKnowledgeItem } from '../services/farmIntelligence';

export type FarmJournalTab='timeline'|'inbox'|'yearwheel'|'rain'|'photos'|'inputs'|'learning';
type Tab=FarmJournalTab;

const MONTHS=['Januar','Februar','Mars','April','Mai','Juni','Juli','August','September','Oktober','November','Desember'];
const inputClass='w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus:border-green-500/50';

function badge(status:string){
  if(status==='completed'||status==='verified'||status==='done')return'border-green-500/25 bg-green-500/10 text-green-300';
  if(status==='recommended'||status==='suggested')return'border-blue-500/25 bg-blue-500/10 text-blue-300';
  if(status==='planned'||status==='approved'||status==='postponed')return'border-amber-300/25 bg-amber-300/10 text-amber-200';
  if(status==='in_progress')return'border-cyan-500/25 bg-cyan-500/10 text-cyan-300';
  if(status==='ordered'||status==='purchased')return'border-purple-500/25 bg-purple-500/10 text-purple-300';
  if(status==='observed')return'border-cyan-500/25 bg-cyan-500/10 text-cyan-300';
  return'border-white/10 bg-white/5 text-slate-400';
}

function statusLabel(status:string){
  const map:Record<string,string>={
    completed:'Utført',planned:'Planlagt',recommended:'Anbefalt',ordered:'Bestilt',
    purchased:'Innkjøpt',observed:'Observert',verified:'Verifisert',needs_review:'Må kontrolleres',
    suggested:'Forslag',approved:'I årshjul',in_progress:'Pågår',postponed:'Utsatt',done:'Utført',skipped:'Ikke nødvendig'
  };
  return map[status]||status;
}

const FarmJournalView:React.FC<{
  parcels:Parcel[];
  initialTab?:FarmJournalTab;
  initialParcelId?:string;
  onInitialTabConsumed?:()=>void;
  onInitialParcelConsumed?:()=>void;
}>=({parcels,initialTab,initialParcelId,onInitialTabConsumed,onInitialParcelConsumed})=>{
  const [tab,setTab]=useState<Tab>(initialTab||'timeline');
  const [documents,setDocuments]=useState<FarmDocument[]>([]);
  const [events,setEvents]=useState<FarmEvent[]>([]);
  const [yearWheel,setYearWheel]=useState<FarmYearWheelItem[]>([]);
  const [yearWheelParcelFilter,setYearWheelParcelFilter]=useState('');
  const [rain,setRain]=useState<RainMeasurement[]>([]);
  const [inputs,setInputs]=useState<any[]>([]);
  const [inputEvidence,setInputEvidence]=useState<FarmInputEvidenceLine[]>([]);
  const [inputSeasonFilter,setInputSeasonFilter]=useState('');
  const [usageSourceRows,setUsageSourceRows]=useState<FarmInputEvidenceLine[]>([]);
  const [usageDate,setUsageDate]=useState('');
  const [usageParcel,setUsageParcel]=useState('');
  const [usageEventType,setUsageEventType]=useState<'spraying'|'fertilization'>('spraying');
  const [usageNotes,setUsageNotes]=useState('');
  const [usageProducts,setUsageProducts]=useState<Array<{key:string;selected:boolean;name:string;quantity:string;unit:string;composition?:string;purpose?:string;dose?:string}>>([]);
  const [usageSaving,setUsageSaving]=useState(false);
  const [observations,setObservations]=useState<any[]>([]);
  const [summary,setSummary]=useState<any>(null);
  const [knowledge,setKnowledge]=useState<FarmKnowledgeItem[]>([]);
  const [intelligence,setIntelligence]=useState<any>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [yearWheelSaving,setYearWheelSaving]=useState('');
  const [completionItem,setCompletionItem]=useState<FarmYearWheelItem|null>(null);
  const [completionDate,setCompletionDate]=useState(new Date().toISOString().slice(0,10));
  const [completionParcel,setCompletionParcel]=useState('');
  const [completionNotes,setCompletionNotes]=useState('');
  const [completionProduct,setCompletionProduct]=useState('');
  const [completionQuantity,setCompletionQuantity]=useState('');
  const [completionUnit,setCompletionUnit]=useState('');
  const [completionImage,setCompletionImage]=useState<File|null>(null);
  const [postponeItem,setPostponeItem]=useState<FarmYearWheelItem|null>(null);
  const [postponeUntil,setPostponeUntil]=useState('');
  const [postponeReason,setPostponeReason]=useState('');
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
  const [wheelYear,setWheelYear]=useState(currentYear);

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const [docs,ev,wheel,rainRows,inputRows,inputEvidenceRows,obs,truth,knowledgeRows,intelligenceSummary]=await Promise.all([
        fetchFarmDocuments(100),
        fetchFarmEvents(250),
        fetchYearWheel(wheelYear),
        fetchRainMeasurements(365),
        fetchFarmInputs(),
        fetchFarmInputEvidenceLines(),
        fetchRecentFarmObservations(100).catch(()=>[]),
        fetchFarmTruthSummary(),
        fetchFarmKnowledge({limit:100}),
        fetchFarmIntelligenceSummary(),
      ]);
      setDocuments(docs);setEvents(ev);setYearWheel(wheel);setRain(rainRows);setInputs(inputRows);setInputEvidence(inputEvidenceRows);setObservations(obs);setSummary(truth);setKnowledge(knowledgeRows);setIntelligence(intelligenceSummary);
    }catch(e:any){setError(e?.message||'Kunne ikke hente driftsjournalen.');}
    finally{setLoading(false);}
  };

  useEffect(()=>{load();},[]);

  useEffect(()=>{
    if(!initialTab)return;
    setTab(initialTab);
    onInitialTabConsumed?.();
  },[initialTab]);

  useEffect(()=>{
    if(!initialParcelId)return;
    setYearWheelParcelFilter(initialParcelId);
    onInitialParcelConsumed?.();
  },[initialParcelId]);

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

  const changeYearWheelStatus=async(item:FarmYearWheelItem,status:'approved'|'in_progress'|'skipped')=>{
    setYearWheelSaving(item.id);setError('');setNotice('');
    try{
      await updateYearWheelStatus(item.id,status);
      setNotice(status==='approved'?'Lagt i årshjulet. Dette er planlagt, ikke registrert som utført.':status==='in_progress'?'Markert som pågår. Starttidspunktet er lagret, men ingen utført driftshendelse er opprettet ennå.':'Markert som ikke nødvendig. Ingen utført driftshendelse ble opprettet.');
      await load();
    }catch(e:any){setError(e?.message||'Kunne ikke oppdatere årshjulet.');}
    finally{setYearWheelSaving('');}
  };

  const openPostpone=(item:FarmYearWheelItem)=>{
    const defaultDate=new Date();
    defaultDate.setDate(defaultDate.getDate()+3);
    setPostponeItem(item);
    setPostponeUntil(item.postponed_until||defaultDate.toISOString().slice(0,10));
    setPostponeReason(item.postponed_reason||'');
    setError('');setNotice('');
  };

  const savePostpone=async()=>{
    if(!postponeItem)return;
    if(!postponeUntil){setError('Velg dato for ny oppfølging.');return;}
    if(!postponeReason.trim()){setError('Skriv kort hvorfor arbeidet utsettes.');return;}
    setYearWheelSaving(postponeItem.id);setError('');setNotice('');
    try{
      await updateYearWheelStatus(postponeItem.id,'postponed',{postponedUntil:postponeUntil,postponedReason});
      setNotice('Arbeidet er utsatt til '+postponeUntil+'. Grunnen er lagret slik at Olivia ikke tolker forsinkelsen som glemt arbeid.');
      setPostponeItem(null);
      await load();
    }catch(e:any){setError(e?.message||'Kunne ikke utsette årshjulspunktet.');}
    finally{setYearWheelSaving('');}
  };

  const openCompletion=async(item:FarmYearWheelItem)=>{
    setCompletionItem(item);
    setCompletionDate(new Date().toISOString().slice(0,10));
    setCompletionParcel(item.parcel_id||'');
    setCompletionNotes('');
    setCompletionProduct('');
    setCompletionQuantity('');
    setCompletionUnit('');
    setCompletionImage(null);
    setError('');setNotice('');
  };

  const completeYearWheel=async()=>{
    if(!completionItem)return;
    const quantity=completionQuantity.trim()===''?null:Number(completionQuantity);
    if(quantity!=null&&(!Number.isFinite(quantity)||quantity<0)){setError('Mengde må være 0 eller mer.');return;}
    setYearWheelSaving(completionItem.id);setError('');setNotice('');
    try{
      let evidenceDocumentId:string|null=null;
      if(completionImage){
        evidenceDocumentId=await saveFarmEvidenceImage({
          file:completionImage,
          title:'Dokumentasjon · '+completionItem.title,
          documentDate:completionDate,
          parcelId:completionParcel||null,
          notes:completionNotes||undefined,
        });
      }
      await completeYearWheelItem(completionItem,{
        occurredOn:completionDate,
        parcelId:completionParcel||null,
        notes:completionNotes||undefined,
        productName:completionProduct||undefined,
        productQuantity:quantity,
        productUnit:completionUnit||undefined,
        evidenceDocumentId,
      });
      setNotice('Utført er lagret som verifisert driftshendelse i Driftsjournalen'+(evidenceDocumentId?' med bilde som dokumentasjon.':'.'));
      setCompletionItem(null);
      await load();
    }catch(e:any){setError(e?.message||'Kunne ikke registrere arbeidet som utført.');}
    finally{setYearWheelSaving('');}
  };

  const openDoc=async(doc:FarmDocument)=>{
    try{
      const url=await getFarmDocumentUrl(doc);
      if(url)window.open(url,'_blank','noopener,noreferrer');
      else setError('Denne kilden har ingen lagret fil.');
    }catch(e:any){setError(e?.message||'Kunne ikke åpne dokumentet.');}
  };

  const openUsageConfirmation=(rows:FarmInputEvidenceLine[])=>{
    const unique=new Map<string,{key:string;selected:boolean;name:string;quantity:string;unit:string;composition?:string;purpose?:string;dose?:string}>();
    rows.forEach((row,index)=>{
      if(row.detailsMissing)return;
      const name=String(row.productName||row.name||'').trim();
      if(!name)return;
      const key=name.toLowerCase().replace(/[^a-z0-9æøå]+/gi,' ').trim();
      if(unique.has(key))return;
      unique.set(key,{
        key:key||String(index),
        selected:false,
        name,
        quantity:'',
        unit:row.unit||'',
        composition:row.composition||undefined,
        purpose:row.intendedUse||undefined,
        dose:row.dose||undefined,
      });
    });
    setUsageSourceRows(rows);
    setUsageProducts(Array.from(unique.values()));
    setUsageDate('');
    setUsageParcel('');
    setUsageNotes('');
    setUsageEventType(rows.some(row=>String(row.category||'').toLowerCase().includes('gjød'))?'fertilization':'spraying');
    setError('');setNotice('');
  };

  const closeUsageConfirmation=()=>{
    if(usageSaving)return;
    setUsageSourceRows([]);
    setUsageProducts([]);
    setUsageDate('');
    setUsageParcel('');
    setUsageNotes('');
  };

  const saveConfirmedUsage=async()=>{
    const selected=usageProducts.filter(product=>product.selected);
    if(!usageDate){setError('Velg faktisk dato for behandlingen.');return;}
    if(!selected.length){setError('Velg minst ett middel som faktisk ble brukt.');return;}
    setUsageSaving(true);setError('');setNotice('');
    try{
      const source=usageSourceRows[0];
      await confirmFarmInputUsage({
        occurredOn:usageDate,
        parcelId:usageParcel||null,
        eventType:usageEventType,
        sourceDocumentId:source?.sourceDocumentId||null,
        sourceTitle:source?.sourceTitle||'Sprøytemidler og gjødsel',
        supplier:source?.supplier||null,
        notes:usageNotes||undefined,
        products:selected.map(product=>({
          name:product.name,
          quantity:product.quantity.trim()===''?null:Number(product.quantity),
          unit:product.unit||undefined,
          composition:product.composition,
          purpose:product.purpose,
          dose:product.dose,
        })),
      });
      setNotice('Bruken er lagret som verifisert driftshendelse og vises nå under «Bekreftet brukt».');
      setUsageSourceRows([]);setUsageProducts([]);setUsageDate('');setUsageParcel('');setUsageNotes('');
      await load();
      setTab('inputs');
    }catch(e:any){setError(e?.message||'Kunne ikke bekrefte bruken av innsatsmidlene.');}
    finally{setUsageSaving(false);}
  };

  const yearWheelAttention=useMemo(()=>{
    const today=new Date();today.setHours(12,0,0,0);
    return yearWheel
      .filter(item=>!yearWheelParcelFilter||item.parcel_id===yearWheelParcelFilter)
      .map(item=>{
        const hasExactDay=Boolean(item.target_day);
        const target=hasExactDay
          ?new Date(item.target_year,item.target_month-1,item.target_day as number)
          :new Date(item.target_year,item.target_month,0);
        target.setHours(12,0,0,0);
        const days=Math.round((target.getTime()-today.getTime())/86400000);

        let level=0;
        let message='';
        if(item.status==='in_progress'){
          const started=item.started_at?new Date(String(item.started_at).slice(0,10)+'T12:00:00'):null;
          const activeDays=started&&!Number.isNaN(started.getTime())?Math.max(0,Math.round((today.getTime()-started.getTime())/86400000)):null;
          level=days<0?3:2;
          message=(activeDays!=null?'Pågår i '+activeDays+' dag'+(activeDays===1?'':'er')+'. ':'')+(days<0?(hasExactDay?Math.abs(days)+' dag'+(Math.abs(days)===1?'':'er')+' etter planlagt dato.':'Planlagt måned er passert.'):'');
        }else if(item.status==='postponed'){
          const followUp=item.postponed_until?new Date(item.postponed_until+'T12:00:00'):null;
          const followUpDays=followUp&&!Number.isNaN(followUp.getTime())?Math.round((followUp.getTime()-today.getTime())/86400000):null;
          level=followUpDays!=null&&followUpDays<0?3:1;
          message=followUpDays!=null&&followUpDays<0?'Oppfølgingsdato passert med '+Math.abs(followUpDays)+' dag'+(Math.abs(followUpDays)===1?'':'er')+'.':item.postponed_until?'Utsatt til '+item.postponed_until+'.':'Utsatt.';
        }else if(item.status==='approved'&&days<0){
          level=hasExactDay&&Math.abs(days)>=3?3:2;
          message=hasExactDay?Math.abs(days)+' dag'+(Math.abs(days)===1?'':'er')+' forsinket.':'Planlagt måned er passert.';
        }

        return{item,level,message};
      })
      .filter(row=>row.level>0)
      .sort((a,b)=>b.level-a.level||a.item.target_month-b.item.target_month||(a.item.target_day||31)-(b.item.target_day||31))
      .slice(0,8);
  },[yearWheel,yearWheelParcelFilter]);

  const rain30=useMemo(()=>{
    const threshold=new Date();threshold.setDate(threshold.getDate()-30);threshold.setHours(0,0,0,0);
    return rain.filter(r=>new Date(r.measured_on+'T12:00:00')>=threshold).reduce((s,r)=>s+Number(r.mm||0),0);
  },[rain]);

  const photoObservations=observations.filter(obs=>Array.isArray(obs.image_urls)&&obs.image_urls.length);
  const photoDocs=documents.filter(doc=>doc.document_kind==='photo'||doc.document_kind==='video');
  const inputSeasons=Array.from(new Set(inputEvidence.map(row=>row.season).filter(Boolean))).sort((a,b)=>b.localeCompare(a));
  const activeInputSeason=inputSeasonFilter||(inputSeasons[0]||'');
  const visibleInputEvidence=inputEvidence.filter(row=>!activeInputSeason||row.season===activeInputSeason);
  const usedInputLines=visibleInputEvidence.filter(row=>row.evidenceKind==='used');
  const applicationLines=visibleInputEvidence.filter(row=>row.evidenceKind==='application');
  const documentInputLines=visibleInputEvidence.filter(row=>row.evidenceKind==='document_line');
  const inputDocumentGroups=Array.from(documentInputLines.reduce((map,row)=>{
    const key=row.sourceDocumentId||row.sourceTitle;
    const existing=map.get(key)||{key,title:row.sourceTitle,sourceDocumentId:row.sourceDocumentId||null,rows:[] as FarmInputEvidenceLine[]};
    existing.rows.push(row);
    map.set(key,existing);
    return map;
  },new Map<string,{key:string;title:string;sourceDocumentId:string|null;rows:FarmInputEvidenceLine[]}>()).values());

  return <div className="space-y-7 pb-24 animate-in fade-in duration-500">
    {usageSourceRows.length>0&&<div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] border border-green-500/25 bg-[#080b09] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-black text-green-300">Bekreft faktisk brukt</p>
            <h3 className="text-2xl font-black text-white mt-1">{usageSourceRows[0]?.sourceTitle}</h3>
            <p className="text-xs text-slate-500 mt-2">Bare det du aktivt velger her blir gårdens fasit. Dokumentet alene beviser ikke at et produkt ble brukt.</p>
          </div>
          <button onClick={closeUsageConfirmation} disabled={usageSaving} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 disabled:opacity-40"><X size={18}/></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          <label className="text-xs text-slate-400">Faktisk dato<input type="date" className={inputClass+' mt-1'} value={usageDate} onChange={e=>setUsageDate(e.target.value)}/></label>
          <label className="text-xs text-slate-400">Område<select className={inputClass+' mt-1'} value={usageParcel} onChange={e=>setUsageParcel(e.target.value)}><option value="">Hele gården</option>{parcels.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label className="text-xs text-slate-400">Type<select className={inputClass+' mt-1'} value={usageEventType} onChange={e=>setUsageEventType(e.target.value as 'spraying'|'fertilization')}><option value="spraying">Sprøyting / behandling</option><option value="fertilization">Gjødsling</option></select></label>
        </div>

        <div className="mt-5">
          <p className="text-xs font-black text-white">Hvilke midler ble faktisk brukt?</p>
          <div className="space-y-2 mt-3">
            {usageProducts.map((product,index)=><div key={product.key} className={'rounded-xl border p-3 '+(product.selected?'border-green-500/25 bg-green-500/[0.06]':'border-white/10 bg-black/20')}>
              <div className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-green-500" checked={product.selected} onChange={e=>setUsageProducts(current=>current.map((item,i)=>i===index?{...item,selected:e.target.checked}:item))}/>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white">{product.name}</p>
                  {product.composition&&<p className="text-[10px] text-purple-300 mt-1">{product.composition}</p>}
                  {product.dose&&<p className="text-[10px] text-slate-500 mt-1">Dokumentert dose: {product.dose}</p>}
                  {product.selected&&<div className="grid grid-cols-2 gap-2 mt-3">
                    <input type="number" min="0" step="0.01" className={inputClass} value={product.quantity} onChange={e=>setUsageProducts(current=>current.map((item,i)=>i===index?{...item,quantity:e.target.value}:item))} placeholder="Faktisk mengde (valgfritt)"/>
                    <input className={inputClass} value={product.unit} onChange={e=>setUsageProducts(current=>current.map((item,i)=>i===index?{...item,unit:e.target.value}:item))} placeholder="Enhet, f.eks. L / kg"/>
                  </div>}
                </div>
              </div>
            </div>)}
          </div>
        </div>

        <label className="block text-xs text-slate-400 mt-4">Notat<textarea className={inputClass+' mt-1 min-h-[80px]'} value={usageNotes} onChange={e=>setUsageNotes(e.target.value)} placeholder="For eksempel behandling 1, hele gården, 2000 L tank, avvik eller hvem som utførte arbeidet…"/></label>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-5">
          <button onClick={closeUsageConfirmation} disabled={usageSaving} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300 disabled:opacity-40">Avbryt</button>
          <button onClick={saveConfirmedUsage} disabled={usageSaving||!usageDate||!usageProducts.some(product=>product.selected)} className="rounded-xl bg-green-500 px-5 py-3 text-xs font-black text-black disabled:opacity-40 flex items-center justify-center gap-2">{usageSaving?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>} Bekreft som faktisk brukt</button>
        </div>
      </div>
    </div>}
    {postponeItem&&<div className="fixed inset-0 z-[91] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-amber-300/20 bg-[#0a0d0b] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] uppercase tracking-widest font-black text-amber-300">Utsett med grunn</p><h3 className="text-xl font-black text-white mt-1">{postponeItem.title}</h3><p className="text-xs text-slate-500 mt-2">Olivia må vite om arbeid er utsatt med vilje eller faktisk glemt.</p></div>
          <button onClick={()=>setPostponeItem(null)} disabled={yearWheelSaving===postponeItem.id} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400"><X size={18}/></button>
        </div>
        <label className="block text-xs text-slate-400 mt-5">Ny dato for oppfølging<input type="date" className={inputClass+' mt-1'} value={postponeUntil} onChange={e=>setPostponeUntil(e.target.value)}/></label>
        <label className="block text-xs text-slate-400 mt-3">Hvorfor utsettes arbeidet?<textarea className={inputClass+' mt-1 min-h-[90px]'} value={postponeReason} onChange={e=>setPostponeReason(e.target.value)} placeholder="For eksempel: venter på regn, frukten er ikke moden, jord for våt, agronom anbefaler å vente…"/></label>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-5">
          <button onClick={()=>setPostponeItem(null)} disabled={yearWheelSaving===postponeItem.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300 disabled:opacity-40">Avbryt</button>
          <button onClick={savePostpone} disabled={yearWheelSaving===postponeItem.id||!postponeUntil||!postponeReason.trim()} className="rounded-xl bg-amber-300 px-5 py-3 text-xs font-black text-black disabled:opacity-40">{yearWheelSaving===postponeItem.id?'Lagrer…':'Utsett og følg opp'}</button>
        </div>
      </div>
    </div>}
    {completionItem&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-[#d9b657]/25 bg-[#0a0d0b] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[10px] uppercase tracking-widest font-black text-[#d9b657]">Registrer faktisk utført arbeid</p><h3 className="text-2xl font-black text-white mt-1">{completionItem.title}</h3><p className="text-xs text-slate-500 mt-2">Dette blir gårdens fasit. Bare det du bekrefter her lagres som utført.</p></div>
          <button onClick={()=>setCompletionItem(null)} disabled={yearWheelSaving===completionItem.id} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400"><X size={18}/></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
          <label className="text-xs text-slate-400">Dato<input type="date" className={inputClass+' mt-1'} value={completionDate} onChange={e=>setCompletionDate(e.target.value)}/></label>
          <label className="text-xs text-slate-400">Parsell<select className={inputClass+' mt-1'} value={completionParcel} onChange={e=>setCompletionParcel(e.target.value)}><option value="">Hele gården</option>{parcels.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        </div>
        <label className="block text-xs text-slate-400 mt-3">Hva ble faktisk gjort?<textarea className={inputClass+' mt-1 min-h-[90px]'} value={completionNotes} onChange={e=>setCompletionNotes(e.target.value)} placeholder="Kort kommentar, avvik, resultat eller observasjon…"/></label>
        <div className="mt-4 rounded-2xl border border-purple-500/15 bg-purple-500/[0.04] p-4">
          <p className="text-xs font-black text-purple-200">Produkt / middel brukt <span className="font-normal text-slate-500">(valgfritt)</span></p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
            <input className={inputClass} value={completionProduct} onChange={e=>setCompletionProduct(e.target.value)} placeholder="Produktnavn"/>
            <input type="number" min="0" step="0.01" className={inputClass} value={completionQuantity} onChange={e=>setCompletionQuantity(e.target.value)} placeholder="Mengde"/>
            <input className={inputClass} value={completionUnit} onChange={e=>setCompletionUnit(e.target.value)} placeholder="Enhet, f.eks. L / kg"/>
          </div>
          <p className="text-[10px] text-slate-600 mt-2">Tomt felt betyr at Olivia ikke registrerer at et produkt ble brukt.</p>
        </div>
        <label className="block mt-4 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-4 text-center cursor-pointer hover:border-green-500/30">
          <ImageIcon className="mx-auto text-cyan-300" size={22}/>
          <p className="text-sm font-bold text-white mt-2">{completionImage?completionImage.name:'Legg ved bilde som dokumentasjon'}</p>
          <p className="text-xs text-slate-600 mt-1">Valgfritt · bildet lagres sammen med driftshendelsen</p>
          <input type="file" accept="image/*" className="hidden" onChange={e=>setCompletionImage(e.target.files?.[0]||null)}/>
        </label>
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-5">
          <button onClick={()=>setCompletionItem(null)} disabled={yearWheelSaving===completionItem.id} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300 disabled:opacity-40">Avbryt</button>
          <button onClick={completeYearWheel} disabled={yearWheelSaving===completionItem.id||!completionDate} className="rounded-xl bg-green-500 px-5 py-3 text-xs font-black text-black disabled:opacity-40 flex items-center justify-center gap-2">{yearWheelSaving===completionItem.id?<Loader2 size={15} className="animate-spin"/>:<CheckCircle2 size={15}/>}Lagre som utført</button>
        </div>
      </div>
    </div>}
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
    {notice&&<div className="rounded-2xl border border-green-500/20 bg-green-500/[0.06] p-4 text-sm text-green-100 flex gap-2"><CheckCircle2 size={18}/>{notice}</div>}

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
        ['rain','Regn',CloudRain],['photos','Bilder / video',ImageIcon],['inputs','Sprøytemidler & gjødsel',PackageSearch],['learning','Spørsmål / læring',Brain]
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
          {scan.facts?.length>0&&<div className="space-y-2"><p className="text-[10px] uppercase tracking-widest text-purple-300 font-black">Kunnskap Olivia vil ta med videre</p>{scan.facts.map((fact,i)=><div key={fact.knowledgeKey+'-'+i} className="rounded-xl border border-purple-500/15 bg-purple-500/[0.05] p-3"><div className="flex gap-2 items-center"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+(fact.requiresConfirmation?'border-amber-300/20 bg-amber-300/10 text-amber-200':'border-green-500/20 bg-green-500/10 text-green-300')}>{fact.requiresConfirmation?'Må bekreftes':'Kildebasert'}</span><span className="text-[9px] text-slate-600">{Math.round(Number(fact.confidence||0)*100)}%</span></div><p className="text-xs text-white mt-2">{fact.statement}</p></div>)}</div>}
          {scan.questions?.length>0&&<div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3"><p className="text-[10px] uppercase tracking-widest font-black text-blue-300">Olivia vil spørre</p>{scan.questions.map((q,i)=><p key={i} className="text-xs text-blue-100 mt-2">• {q.question}</p>)}</div>}
          <button onClick={approveSource} disabled={saving} className="w-full rounded-2xl bg-green-500 py-4 font-black text-black disabled:opacity-40 flex items-center justify-center gap-2">{saving?<Loader2 className="animate-spin" size={18}/>:<CheckCircle2 size={18}/>} Godkjenn og lagre som fasit</button>
        </div>}
      </div>

      <div className="xl:col-span-2 space-y-3">
        <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">Siste kilder</p>
        {documents.slice(0,12).map(doc=><button key={doc.id} onClick={()=>openDoc(doc)} className="w-full text-left rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-green-500/20"><div className="flex justify-between gap-3"><div><div className="flex gap-2 flex-wrap"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+badge(doc.review_status)}>{statusLabel(doc.review_status)}</span><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+badge(doc.evidence_status)}>{statusLabel(doc.evidence_status)}</span></div><p className="font-bold text-white mt-2">{doc.title}</p><p className="text-xs text-slate-500 mt-1">{doc.document_date||'dato ukjent'} · {doc.source_name||doc.original_filename||doc.document_kind}</p></div><FileText className="text-slate-500" size={18}/></div></button>)}
      </div>
    </div>}

    {tab==='yearwheel'&&<div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest font-black text-blue-300">Årshjul {wheelYear}</p><h3 className="text-xl font-black text-white">Forslag bygget fra verifisert historikk</h3><p className="text-xs text-slate-500 mt-2">Historikk gir tidspunkt for vurdering — ikke automatisk sprøyteordre. «Legg i årshjul» betyr planlagt/akseptert, ikke utført. Først når arbeidet faktisk er gjort skal du trykke «Marker utført». Vær, fenologi og faktisk behov må bekreftes.</p></div><div className="flex flex-col sm:flex-row gap-2"><select value={yearWheelParcelFilter} onChange={e=>setYearWheelParcelFilter(e.target.value)} className={inputClass+' md:w-auto'}><option value="">Alle parseller</option>{parcels.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select value={wheelYear} onChange={e=>setWheelYear(Number(e.target.value))} className={inputClass+' md:w-auto'}><option value={currentYear}>{currentYear}</option><option value={currentYear+1}>{currentYear+1}</option><option value={currentYear+2}>{currentYear+2}</option></select></div></div>
      {yearWheelAttention.length>0&&<div className="rounded-[2rem] border border-red-500/20 bg-red-500/[0.035] p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-red-300 mt-0.5" size={18}/>
          <div><p className="text-[10px] uppercase tracking-widest font-black text-red-300">Krever oppfølging</p><h4 className="text-lg font-black text-white mt-1">Forsinket, pågår eller utsatt</h4><p className="text-xs text-slate-500 mt-1">Disse vises før månedsoversikten fordi de trenger en avklaring.</p></div>
        </div>
        <div className="space-y-2 mt-4">
          {yearWheelAttention.map(({item,level,message})=><div key={'attention-'+item.id} className={'rounded-xl border p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 '+(level===3?'border-red-500/25 bg-red-500/10':level===2?'border-amber-400/20 bg-amber-400/[0.07]':'border-white/10 bg-black/20')}>
            <div><div className="flex flex-wrap gap-2"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+badge(item.status)}>{statusLabel(item.status)}</span><span className="text-[9px] uppercase tracking-widest text-slate-500">{parcelName(item.parcel_id)}</span></div><p className="text-sm font-black text-white mt-2">{item.title}</p><p className="text-xs text-slate-400 mt-1">{message}</p>{item.postponed_reason&&<p className="text-[10px] text-amber-200 mt-1">Grunn: {item.postponed_reason}</p>}</div>
            <div className="flex flex-wrap gap-2">{item.status==='approved'&&<><button disabled={yearWheelSaving===item.id} onClick={()=>changeYearWheelStatus(item,'in_progress')} className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-40">Start arbeid</button><button disabled={yearWheelSaving===item.id} onClick={()=>openCompletion(item)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Marker utført</button><button disabled={yearWheelSaving===item.id} onClick={()=>openPostpone(item)} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 disabled:opacity-40">Utsett</button></>}{item.status==='in_progress'&&<><button disabled={yearWheelSaving===item.id} onClick={()=>openCompletion(item)} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black disabled:opacity-40">Fullfør</button><button disabled={yearWheelSaving===item.id} onClick={()=>openPostpone(item)} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 disabled:opacity-40">Utsett</button></>}{item.status==='postponed'&&<><button disabled={yearWheelSaving===item.id} onClick={()=>changeYearWheelStatus(item,'approved')} className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-40">Aktiver igjen</button><button disabled={yearWheelSaving===item.id} onClick={()=>openCompletion(item)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Marker utført</button></>}</div>
          </div>)}
        </div>
      </div>}
      {MONTHS.map((month,index)=>{
        const rows=yearWheel.filter(item=>item.target_month===index+1&&(!yearWheelParcelFilter||item.parcel_id===yearWheelParcelFilter));
        if(!rows.length)return null;
        return <div key={month} className="glass rounded-2xl border border-white/10 p-5"><h4 className="font-black text-white">{month}</h4><div className="space-y-2 mt-3">{rows.map(item=><div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3 flex flex-col md:flex-row md:items-center justify-between gap-3"><div><div className="flex gap-2 flex-wrap"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+badge(item.status)}>{statusLabel(item.status)}</span><span className="text-[9px] uppercase text-slate-600">{item.basis}</span></div><p className="text-white font-bold mt-2">{item.title}</p><p className="text-xs text-slate-500 mt-1">{item.target_day?item.target_day+'. '+month.toLowerCase():item.period_label||month} · {parcelName(item.parcel_id)}</p>{item.status==='in_progress'&&item.started_at&&<p className="text-[10px] text-cyan-300 mt-2">Pågår siden {String(item.started_at).slice(0,10)}</p>}{item.status==='postponed'&&<p className="text-[10px] text-amber-200 mt-2">Utsatt{item.postponed_until?' til '+item.postponed_until:''}{item.postponed_reason?' · '+item.postponed_reason:''}</p>}{item.notes&&<p className="text-xs text-slate-400 mt-2">{item.notes}</p>}</div><div className="flex flex-wrap gap-2">{item.status==='suggested'&&<><button disabled={yearWheelSaving===item.id} onClick={()=>changeYearWheelStatus(item,'approved')} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black disabled:opacity-40">{yearWheelSaving===item.id?'Lagrer…':'Legg i årshjul'}</button><button disabled={yearWheelSaving===item.id} onClick={()=>changeYearWheelStatus(item,'skipped')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 disabled:opacity-40">Ikke nødvendig</button></>}{item.status==='approved'&&<><button disabled={yearWheelSaving===item.id} onClick={()=>changeYearWheelStatus(item,'in_progress')} className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-40">Start arbeid</button><button disabled={yearWheelSaving===item.id} onClick={()=>openCompletion(item)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Marker utført</button><button disabled={yearWheelSaving===item.id} onClick={()=>openPostpone(item)} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 disabled:opacity-40">Utsett</button><button disabled={yearWheelSaving===item.id} onClick={()=>changeYearWheelStatus(item,'skipped')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-400 disabled:opacity-40">Ikke nødvendig</button></>}{item.status==='in_progress'&&<><button disabled={yearWheelSaving===item.id} onClick={()=>openCompletion(item)} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black disabled:opacity-40">Fullfør og dokumenter</button><button disabled={yearWheelSaving===item.id} onClick={()=>openPostpone(item)} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 disabled:opacity-40">Utsett</button></>}{item.status==='postponed'&&<><button disabled={yearWheelSaving===item.id} onClick={()=>changeYearWheelStatus(item,'approved')} className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 disabled:opacity-40">Aktiver igjen</button><button disabled={yearWheelSaving===item.id} onClick={()=>openCompletion(item)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Marker utført</button><button disabled={yearWheelSaving===item.id} onClick={()=>changeYearWheelStatus(item,'skipped')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-400 disabled:opacity-40">Ikke nødvendig</button></>}</div></div>)}</div></div>;
      })}
      {!yearWheel.filter(item=>!yearWheelParcelFilter||item.parcel_id===yearWheelParcelFilter).length&&<Empty icon={<CalendarDays/>} title={yearWheelParcelFilter?'Ingen årshjulspunkter for denne parsellen':'Årshjulet bygges fra historikken'} text={yearWheelParcelFilter?'Bytt til «Alle parseller» for å se resten av årshjulet.':'Når et verifisert tilbakevendende arbeid har en dato, lager Olivia et forslag til samme periode neste år.'}/>} 
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

    {tab==='inputs'&&<div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div><p className="text-[10px] uppercase tracking-widest font-black text-purple-300">Sprøytemidler & gjødsel</p><h3 className="text-xl font-black text-white">Hva er faktisk brukt — og hva står bare i dokumentene?</h3><p className="text-xs text-slate-500 mt-2">Olivia skiller mellom bekreftet bruk, utført behandling uten dokumentert middel, og produktlinjer som bare er tilbudt, anbefalt eller bestilt.</p></div>
        <select value={activeInputSeason} onChange={e=>setInputSeasonFilter(e.target.value)} className={inputClass+' md:w-auto'}>
          {inputSeasons.map(season=><option key={season} value={season}>{season} · høst {season.slice(0,4)}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<CheckCircle2 size={18}/>} label="Bekreftet brukt" value={usedInputLines.length}/>
        <Stat icon={<ShieldCheck size={18}/>} label="Utført behandling" value={applicationLines.length}/>
        <Stat icon={<FileText size={18}/>} label="Dokumentlinjer" value={documentInputLines.length}/>
        <Stat icon={<PackageSearch size={18}/>} label="Produktregister" value={inputs.length}/>
      </div>

      <div className="rounded-[2rem] border border-green-500/20 bg-green-500/[0.04] p-5">
        <p className="text-[10px] uppercase tracking-widest font-black text-green-300">Faktisk brukt</p>
        <h4 className="text-lg font-black text-white mt-1">Middel registrert på utført driftshendelse</h4>
        {usedInputLines.length?<div className="space-y-2 mt-4">{usedInputLines.map(row=><InputEvidenceRow key={row.id} row={row} documents={documents} onOpenDoc={openDoc}/>)}</div>:<div className="mt-4 rounded-xl border border-dashed border-green-500/20 p-4 text-sm text-slate-400">Ingen konkrete produktnavn er ennå bekreftet som brukt i verifiserte driftshendelser for {activeInputSeason||'valgt sesong'}. Det betyr ikke at det ikke er sprøytet — bare at middelet ikke er koblet til utført-hendelsen ennå.</div>}
      </div>

      <div className="rounded-[2rem] border border-cyan-500/20 bg-cyan-500/[0.04] p-5">
        <p className="text-[10px] uppercase tracking-widest font-black text-cyan-300">Utført behandling</p>
        <h4 className="text-lg font-black text-white mt-1">Arbeidslinjer som dokumenterer at sprøyting faktisk ble gjort</h4>
        {applicationLines.length?<div className="space-y-2 mt-4">{applicationLines.map(row=><InputEvidenceRow key={row.id} row={row} documents={documents} onOpenDoc={openDoc}/>)}</div>:<p className="text-sm text-slate-500 mt-4">Ingen utførte sprøyte-/behandlingslinjer funnet for valgt sesong.</p>}
        {applicationLines.length>0&&<p className="text-[10px] text-slate-500 mt-3">En arbeidsfaktura kan bekrefte at «sulfatar» er utført uten å dokumentere hvilket kjemisk/biologisk middel som var i tanken. Olivia markerer derfor ikke produktet som brukt uten egen kilde.</p>}
      </div>

      <div className="rounded-[2rem] border border-purple-500/20 bg-purple-500/[0.035] p-5">
        <p className="text-[10px] uppercase tracking-widest font-black text-purple-300">Faktiske dokumentlinjer</p>
        <h4 className="text-lg font-black text-white mt-1">Tilbud, proforma og agronomplan — ordrett varelinjegrunnlag</h4>
        <div className="space-y-4 mt-4">{inputDocumentGroups.map(group=><div key={group.key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div><p className="text-sm font-black text-white">{group.title}</p><p className="text-[10px] text-slate-600 mt-1">{group.rows.length} relevant{group.rows.length===1?' linje':'e linjer'} · {group.rows[0]?.truthLabel}</p></div>
            {group.rows.some(row=>row.productName&&!row.detailsMissing)&&<button onClick={()=>openUsageConfirmation(group.rows)} className="rounded-xl bg-green-500 px-4 py-2.5 text-xs font-black text-black whitespace-nowrap flex items-center gap-2"><CheckCircle2 size={14}/> Bekreft brukt</button>}
          </div>
          <div className="space-y-2 mt-3">{group.rows.map(row=><InputEvidenceRow key={row.id} row={row} documents={documents} onOpenDoc={openDoc}/>)}</div>
        </div>)}</div>
        {!documentInputLines.length&&<p className="text-sm text-slate-500 mt-3">Ingen relevante produktlinjer funnet for valgt sesong.</p>}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest font-black text-slate-500">Produktregister</p>
        <h4 className="text-lg font-black text-white mt-1">Sammensetning og dose fra verifiserte dokumenter</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">{inputs.map((p:any)=><div key={p.id} className="glass rounded-2xl border border-white/10 p-4"><p className="font-black text-white">{p.name}</p>{p.composition&&<p className="text-xs text-purple-300 mt-2">Sammensetning: {p.composition}</p>}{p.intended_use&&<p className="text-xs text-slate-400 mt-2">Bruksområde: {p.intended_use}</p>}{p.dose&&<p className="text-xs text-slate-500 mt-1">Dose: {p.dose}</p>}{p.organic_note&&<p className="text-[10px] text-green-300 mt-2">{p.organic_note}</p>}</div>)}</div>
        {!inputs.length&&<Empty icon={<PackageSearch/>} title="Ingen produkter registrert" text="Når produktnavn, sammensetning eller dose finnes i et verifisert dokument, bygges registeret automatisk."/>}
      </div>
    </div>}
  </div>;
};

const InputEvidenceRow:React.FC<{row:FarmInputEvidenceLine;documents:FarmDocument[];onOpenDoc:(doc:FarmDocument)=>void}>=({row,documents,onOpenDoc})=>{
  const doc=row.sourceDocumentId?documents.find(item=>item.id===row.sourceDocumentId):undefined;
  const tone=row.confirmedUsed?'border-green-500/20 bg-green-500/[0.06] text-green-300':row.evidenceKind==='application'?'border-cyan-500/20 bg-cyan-500/[0.06] text-cyan-200':row.evidenceStatus==='ordered'||row.evidenceStatus==='purchased'?'border-purple-500/20 bg-purple-500/[0.06] text-purple-200':'border-amber-300/20 bg-amber-300/[0.05] text-amber-200';
  const qty=row.quantity!=null?String(row.quantity)+(row.unit?' '+row.unit:''):'';
  const price=row.unitPrice!=null?' · '+Number(row.unitPrice).toLocaleString('no-NO',{maximumFractionDigits:2})+' '+(row.currency||'EUR')+(row.unit?'/'+row.unit:''):'';
  const amount=row.amount!=null?' · '+Number(row.amount).toLocaleString('no-NO',{maximumFractionDigits:2})+' '+(row.currency||'EUR'):'';
  return <div className="rounded-xl border border-white/10 bg-black/20 p-4">
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2 items-center"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+tone}>{row.truthLabel}</span>{row.season&&<span className="text-[9px] text-slate-600 uppercase">{row.season}</span>}</div>
        <p className="font-black text-white mt-2">{row.name}</p>
        <p className="text-xs text-slate-500 mt-1">{row.date||'Dato ikke spesifisert'}{row.supplier?' · '+row.supplier:''}</p>
        {(qty||price||amount)&&<p className="text-xs text-slate-300 mt-2">{qty}{price}{amount}</p>}
        {row.composition&&<p className="text-[10px] text-purple-300 mt-2">Sammensetning: {row.composition}</p>}
        {row.intendedUse&&<p className="text-[10px] text-slate-400 mt-1">Bruksområde: {row.intendedUse}{row.dose?' · dokumentert dose '+row.dose:''}</p>}
        {row.detailsMissing&&<p className="text-[10px] text-amber-200 mt-2">Varelinjer mangler i dette eldre bilaget. Beløp/beskrivelse er registrert, men produktnavn må kompletteres fra originaldokumentet.</p>}
        <p className="text-[10px] text-slate-600 mt-2">Kilde: {row.sourceTitle}{row.filename?' · '+row.filename:''}</p>
      </div>
      {doc&&<button onClick={()=>onOpenDoc(doc)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white whitespace-nowrap">Åpne kilde</button>}
    </div>
  </div>;
};

const Stat:React.FC<{label:string;value:React.ReactNode;icon:React.ReactNode}>=({label,value,icon})=><div className="glass rounded-2xl border border-white/10 p-4"><div className="text-green-400">{icon}</div><p className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">{label}</p><p className="text-xl font-black text-white mt-1">{value}</p></div>;
const Empty:React.FC<{icon:React.ReactNode;title:string;text:string}>=({icon,title,text})=><div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-slate-500"><div className="mx-auto w-fit text-[#d9b657]">{icon}</div><p className="text-white font-bold mt-3">{title}</p><p className="text-sm mt-2 max-w-xl mx-auto">{text}</p></div>;

export default FarmJournalView;
