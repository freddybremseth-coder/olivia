import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Euro,
  FileCheck2,
  Leaf,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sprout,
  Save,
  X,
} from 'lucide-react';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import OrganicCertificationCaecvPackage from './OrganicCertificationCaecvPackage';
import type { Parcel, Task } from '../types';
import { fetchTasks } from '../services/db';
import { fetchOliviaParcels, fetchOliviaSubsidies, type SubsidyIncome } from '../services/oliviaSchemaData';
import {
  certificationStatusLabel,
  fetchCurrentCaecvCase,
  fetchOrganicParcelCertifications,
  upsertOrganicParcelCertification,
  type CaecvCaseSummary,
  type OrganicParcelCertification,
  type OrganicParcelCertificationStatus,
} from '../services/organicCertificationStatus';

type OrganicStatus = OrganicParcelCertificationStatus;

type OrganicParcel = {
  id: string;
  location: string;
  polygon: string;
  parcela: string;
  area_m2?: number;
  crop: string;
  status: OrganicStatus;
  owner_name: string;
  cadastral_id?: string;
  notes?: string;
  certification?: OrganicParcelCertification;
};

function areaHa(areaM2?: number): string {
  if (!areaM2) return '—';
  return `${(areaM2 / 10000).toLocaleString('no-NO', { maximumFractionDigits: 2 })} ha`;
}

function statusLabel(status: OrganicStatus): string {
  return certificationStatusLabel(status);
}

function statusClass(status: OrganicStatus): string {
  if (status === 'certified') return 'border-green-500/30 bg-green-500/10 text-green-400';
  if (status === 'in_conversion') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  if (status === 'application_pending') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (status === 'suspended' || status === 'non_compliant') return 'border-red-500/30 bg-red-500/10 text-red-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function taskPriorityClass(priority?: Task['priority']): string {
  if (priority === 'Kritisk') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (priority === 'Høy') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (priority === 'Middels') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function parcelToOrganic(parcel: Parcel, certification?:OrganicParcelCertification): OrganicParcel {
  const registry = parcel.registryDetails || '';
  const polygonMatch = registry.match(/pol[ií]gono\s*([\w-]+)/i);
  const parcelMatch = registry.match(/parcela\s*([\w-]+)/i);
  return {
    id: parcel.id,
    location: parcel.municipality || 'Biar, Alicante',
    polygon: polygonMatch?.[1] || '—',
    parcela: parcelMatch?.[1] || parcel.name || '—',
    area_m2: parcel.area,
    crop: parcel.crop || parcel.cropType || 'Oliven',
    status: certification?.status || 'unknown',
    owner_name: 'Anna Bremseth',
    cadastral_id: parcel.cadastralId,
    notes: certification?.notes || parcel.registryDetails || 'Ingen dokumentert økologisk parsellstatus er lagret ennå.',
    certification,
  };
}

function isOrganicTask(task: Task): boolean {
  const haystack = `${task.title || ''} ${task.category || ''}`.toLowerCase();
  return haystack.includes('øko') || haystack.includes('organic') || haystack.includes('sertif') || haystack.includes('støtte') || haystack.includes('kompensasjon') || haystack.includes('catastro') || haystack.includes('befaring') || haystack.includes('caecv');
}

function subsidyLabel(type: SubsidyIncome['type']): string {
  if (type === 'eu_okologisk') return 'EU økologisk';
  if (type === 'eu_pao') return 'EU produksjon/olje';
  return 'Annet';
}

const OrganicCertificationOliviaView: React.FC = () => {
  const [parcels, setParcels] = useState<OrganicParcel[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subsidies, setSubsidies] = useState<SubsidyIncome[]>([]);
  const [certifications,setCertifications]=useState<OrganicParcelCertification[]>([]);
  const [caecvCase,setCaecvCase]=useState<CaecvCaseSummary|null>(null);
  const [editing,setEditing]=useState<OrganicParcel|null>(null);
  const [editStatus,setEditStatus]=useState<OrganicStatus>('unknown');
  const [editCertificate,setEditCertificate]=useState('');
  const [editValidFrom,setEditValidFrom]=useState('');
  const [editValidUntil,setEditValidUntil]=useState('');
  const [editConversionStart,setEditConversionStart]=useState('');
  const [editLastInspection,setEditLastInspection]=useState('');
  const [editNextInspection,setEditNextInspection]=useState('');
  const [editNotes,setEditNotes]=useState('');
  const [isSavingStatus,setIsSavingStatus]=useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [parcelRows, taskRows, subsidyRows, certificationRows, currentCase] = await Promise.all([
        fetchOliviaParcels(),
        fetchTasks(),
        fetchOliviaSubsidies(),
        fetchOrganicParcelCertifications(),
        fetchCurrentCaecvCase(),
      ]);
      const byParcel=new Map(certificationRows.map(item=>[item.parcel_id,item]));
      setCertifications(certificationRows);
      setCaecvCase(currentCase);
      setParcels(parcelRows.map(parcel=>parcelToOrganic(parcel,byParcel.get(parcel.id))));
      setTasks(taskRows.filter(isOrganicTask));
      setSubsidies(subsidyRows);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente øko/støtte-data fra olivia schema.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const area = parcels.reduce((acc, p) => acc + (p.area_m2 || 0), 0);
    const review = parcels.filter(p => ['unknown','application_pending','suspended','non_compliant'].includes(p.status)).length;
    const openTasks = tasks.filter(t => t.status !== 'DONE').length;
    const totalSubsidy = subsidies.reduce((acc, s) => acc + s.amount, 0);
    return { area, review, openTasks, totalSubsidy };
  }, [parcels, tasks, subsidies]);

  const openStatusEditor=(parcel:OrganicParcel)=>{
    setEditing(parcel);
    setEditStatus(parcel.certification?.status||'unknown');
    setEditCertificate(parcel.certification?.certificate_number||'');
    setEditValidFrom(parcel.certification?.valid_from||'');
    setEditValidUntil(parcel.certification?.valid_until||'');
    setEditConversionStart(parcel.certification?.conversion_start||'');
    setEditLastInspection(parcel.certification?.last_inspection_at||'');
    setEditNextInspection(parcel.certification?.next_inspection_due||'');
    setEditNotes(parcel.certification?.notes||'');
    setError(null);
  };

  const saveStatus=async()=>{
    if(!editing)return;
    setIsSavingStatus(true);setError(null);
    try{
      const saved=await upsertOrganicParcelCertification({
        parcelId:editing.id,
        status:editStatus,
        sourceCaseId:caecvCase?.id||null,
        certificateNumber:editCertificate,
        validFrom:editValidFrom,
        validUntil:editValidUntil,
        conversionStart:editConversionStart,
        lastInspectionAt:editLastInspection,
        nextInspectionDue:editNextInspection,
        notes:editNotes,
      });
      setCertifications(current=>[saved,...current.filter(item=>item.parcel_id!==saved.parcel_id)]);
      setParcels(current=>current.map(parcel=>parcel.id===saved.parcel_id?{...parcel,status:saved.status,certification:saved,notes:saved.notes||parcel.notes}:parcel));
      setEditing(null);
      window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
    }catch(err:any){
      setError(err?.message||'Kunne ikke lagre dokumentert økologisk status.');
    }finally{setIsSavingStatus(false);}
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      {editing&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[2rem] border border-green-500/20 bg-[#080b09] p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] uppercase tracking-widest font-black text-green-400">Dokumentert parsellstatus</p><h3 className="text-xl font-black text-white mt-1">{editing.location} · Parcela {editing.parcela}</h3><p className="text-xs text-slate-500 mt-1">Lagre bare status som kan dokumenteres eller bekreftes. «Ikke dokumentert» er bedre enn antakelser.</p></div>
            <button onClick={()=>setEditing(null)} disabled={isSavingStatus} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400"><X size={18}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            <label className="text-xs text-slate-400">Status<select value={editStatus} onChange={e=>setEditStatus(e.target.value as OrganicStatus)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white">
              <option value="unknown">Ikke dokumentert</option>
              <option value="application_pending">Søknad / avklaring pågår</option>
              <option value="in_conversion">I overgang</option>
              <option value="certified">Sertifisert</option>
              <option value="suspended">Suspendert</option>
              <option value="non_compliant">Avvik / ikke compliant</option>
            </select></label>
            <label className="text-xs text-slate-400">Sertifikatnummer<input value={editCertificate} onChange={e=>setEditCertificate(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white" placeholder="Kun når dokumentert"/></label>
            <label className="text-xs text-slate-400">Gyldig fra<input type="date" value={editValidFrom} onChange={e=>setEditValidFrom(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"/></label>
            <label className="text-xs text-slate-400">Gyldig til<input type="date" value={editValidUntil} onChange={e=>setEditValidUntil(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"/></label>
            <label className="text-xs text-slate-400">Overgang startet<input type="date" value={editConversionStart} onChange={e=>setEditConversionStart(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"/></label>
            <label className="text-xs text-slate-400">Siste inspeksjon<input type="date" value={editLastInspection} onChange={e=>setEditLastInspection(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"/></label>
            <label className="text-xs text-slate-400">Neste inspeksjon / kontroll<input type="date" value={editNextInspection} onChange={e=>setEditNextInspection(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"/></label>
          </div>
          <label className="block text-xs text-slate-400 mt-3">Dokumentgrunnlag / notat<textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} className="mt-1 min-h-[100px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white" placeholder="Hva dokumenterer statusen? CAECV-sak, sertifikat, inspeksjon eller annen bekreftelse."/></label>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={()=>setEditing(null)} disabled={isSavingStatus} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300">Avbryt</button>
            <button onClick={saveStatus} disabled={isSavingStatus} className="rounded-xl bg-green-500 px-5 py-3 text-xs font-black text-black disabled:opacity-40 flex items-center gap-2">{isSavingStatus?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Lagre dokumentert status</button>
          </div>
        </div>
      </div>}
      <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/5">
        <DonaAnnaBrandMark variant="symbol" size="md" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Leaf className="text-green-400" /> Øko / støtte</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">olivia.parcels · olivia.subsidy_income · olivia.tasks · CAECV søknadspakke</p>
        </div>
        <button onClick={load} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
        </button>
      </div>

      {error && <div className="glass rounded-[2rem] p-5 border border-red-500/30 bg-red-500/10 text-red-100 text-sm flex gap-3"><AlertTriangle size={18} className="flex-shrink-0" /> <span>{error}</span></div>}

      <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4">
          <ShieldCheck className="text-green-400 mt-1" />
          <div>
            <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-2">Viktig kontekst</p>
            <p className="text-white font-bold">Økologisk status vises nå bare når den er eksplisitt dokumentert per parsell.</p>
            <p className="text-xs text-slate-500 mt-2">Ingen olivenparsell blir lenger antatt sertifisert eller «i overgang» fra avlingstype alene. Manglende fasit vises som «Ikke dokumentert».</p>
            {caecvCase&&<div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest font-black text-slate-500">Aktiv CAECV-sak · {caecvCase.status}</p><p className="text-xs text-slate-300 mt-1">{caecvCase.current_step||caecvCase.certification_scope||'Ingen neste handling registrert.'}</p>{!caecvCase.certified_at&&<p className="text-[10px] text-amber-200 mt-2">Denne saken dokumenterer ikke ferdig sertifisering ennå.</p>}</div>}
          </div>
        </div>
      </div>

      <OrganicCertificationCaecvPackage />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Areal', value: areaHa(stats.area), icon: <Sprout size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Parceller å sjekke', value: stats.review, icon: <AlertTriangle size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Åpne oppgaver', value: stats.openTasks, icon: <ClipboardCheck size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Registrert støtte', value: `€${stats.totalSubsidy.toLocaleString('no-NO', { maximumFractionDigits: 0 })}`, icon: <Euro size={18} />, cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-2xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Parceller fra olivia.parcels</h3>
          {parcels.map(parcel => (
            <div key={parcel.id} className={`glass rounded-[2rem] p-5 border ${statusClass(parcel.status)}`}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{statusLabel(parcel.status)}</p>
                  <h3 className="text-lg text-white font-bold">{parcel.location} · Polígono {parcel.polygon} · Parcela {parcel.parcela}</h3>
                  <p className="text-xs text-slate-500 mt-1">{parcel.crop} · {areaHa(parcel.area_m2)}</p>
                </div>
                <Sprout size={22} />
              </div>
              <p className="text-xs text-slate-400 mt-4"><strong className="text-white">Eier:</strong> {parcel.owner_name}</p>
              {parcel.cadastral_id && <p className="text-xs text-slate-400 mt-2"><strong className="text-white">Catastro:</strong> {parcel.cadastral_id}</p>}
              {parcel.certification?.certificate_number&&<p className="text-xs text-slate-400 mt-2"><strong className="text-white">Sertifikat:</strong> {parcel.certification.certificate_number}</p>}
              {parcel.certification?.valid_until&&<p className="text-xs text-slate-400 mt-2"><strong className="text-white">Gyldig til:</strong> {parcel.certification.valid_until}</p>}
              {parcel.certification?.last_inspection_at&&<p className="text-xs text-slate-400 mt-2"><strong className="text-white">Siste inspeksjon:</strong> {parcel.certification.last_inspection_at}</p>}
              {parcel.notes && <p className="text-sm text-slate-400 mt-3 leading-relaxed">{parcel.notes}</p>}
              <button onClick={()=>openStatusEditor(parcel)} className="mt-4 w-full rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-xs font-black text-green-300">{parcel.certification?'Oppdater dokumentert status':'Bekreft parsellstatus'}</button>
            </div>
          ))}
          {!parcels.length && <div className="glass rounded-[2rem] p-6 border border-white/10 text-slate-500">Ingen parceller funnet i olivia.parcels.</div>}
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Øko-/støtteoppgaver fra olivia.tasks</h3>
          {tasks.map(task => (
            <div key={task.id} className={`glass rounded-[2rem] p-5 border ${taskPriorityClass(task.priority)}`}>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{task.priority || 'Middels'} · {task.status}</p>
                  <h3 className="text-lg text-white font-bold">{task.title}</h3>
                  {task.dueDate && <p className="text-xs text-slate-500 mt-1">Frist: {task.dueDate}</p>}
                </div>
                {task.status === 'DONE' ? <CheckCircle2 className="text-green-400" /> : <CalendarDays className="text-blue-400" />}
              </div>
              <p className="text-xs text-slate-500 mt-3">Kategori: {task.category || '—'} · Ansvarlig: {task.user || '—'}</p>
            </div>
          ))}
          {!tasks.length && <div className="glass rounded-[2rem] p-6 border border-white/10 text-slate-500">Ingen øko-/støtteoppgaver funnet. Opprett oppgaver med kategori/tittel som inneholder øko, CAECV, sertifisering, støtte, kompensasjon, Catastro eller befaring.</div>}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Støtte og kompensasjon fra olivia.subsidy_income</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {subsidies.map(subsidy => (
            <div key={subsidy.id} className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{subsidyLabel(subsidy.type)} · {subsidy.date}</p>
                  <h3 className="text-lg text-white font-bold">{subsidy.description}</h3>
                </div>
                <Euro className="text-green-400" />
              </div>
              <p className="text-2xl text-green-400 font-black mt-4">€{subsidy.amount.toLocaleString('no-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          ))}
          {!subsidies.length && <div className="glass rounded-[2rem] p-6 border border-white/10 text-slate-500">Ingen støtte/kompensasjon registrert i olivia.subsidy_income ennå.</div>}
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <FileCheck2 size={18} className="text-green-400 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">Dokumentkontroll</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Koble dokumenter direkte til parceller/batcher: copia simple, nota simple, Catastro, økologisk sertifikat, CAECV-søknadspakke, befaringsrapport og søknad/vedtak om støtte.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganicCertificationOliviaView;
