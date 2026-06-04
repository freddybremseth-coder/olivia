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
} from 'lucide-react';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import OrganicCertificationCaecvPackage from './OrganicCertificationCaecvPackage';
import type { Parcel, Task } from '../types';
import { fetchTasks } from '../services/db';
import { fetchOliviaParcels, fetchOliviaSubsidies, type SubsidyIncome } from '../services/oliviaSchemaData';

type OrganicStatus = 'unknown' | 'in_transition' | 'certified' | 'needs_review' | 'non_compliant';

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
};

function areaHa(areaM2?: number): string {
  if (!areaM2) return '—';
  return `${(areaM2 / 10000).toLocaleString('no-NO', { maximumFractionDigits: 2 })} ha`;
}

function statusLabel(status: OrganicStatus): string {
  const labels: Record<OrganicStatus, string> = {
    unknown: 'Ukjent',
    in_transition: 'Overgang / avklares',
    certified: 'Sertifisert',
    needs_review: 'Må kontrolleres',
    non_compliant: 'Avvik',
  };
  return labels[status];
}

function statusClass(status: OrganicStatus): string {
  if (status === 'certified') return 'border-green-500/30 bg-green-500/10 text-green-400';
  if (status === 'in_transition') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  if (status === 'needs_review') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (status === 'non_compliant') return 'border-red-500/30 bg-red-500/10 text-red-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function taskPriorityClass(priority?: Task['priority']): string {
  if (priority === 'Kritisk') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (priority === 'Høy') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (priority === 'Middels') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function parcelToOrganic(parcel: Parcel): OrganicParcel {
  const registry = parcel.registryDetails || '';
  const polygonMatch = registry.match(/pol[ií]gono\s*([\w-]+)/i);
  const parcelMatch = registry.match(/parcela\s*([\w-]+)/i);
  const isOlive = `${parcel.crop || ''} ${parcel.cropType || ''}`.toLowerCase().includes('oliv');
  return {
    id: parcel.id,
    location: parcel.municipality || 'Biar, Alicante',
    polygon: polygonMatch?.[1] || '—',
    parcela: parcelMatch?.[1] || parcel.name || '—',
    area_m2: parcel.area,
    crop: parcel.crop || parcel.cropType || 'Oliven',
    status: isOlive ? 'needs_review' : 'unknown',
    owner_name: 'Anna Bremseth / Freddy Bremseth',
    cadastral_id: parcel.cadastralId,
    notes: parcel.registryDetails || 'Hentet fra olivia.parcels. Kontroller økologisk status mot sertifiseringsorgan og dokumentasjon.',
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [parcelRows, taskRows, subsidyRows] = await Promise.all([
        fetchOliviaParcels(),
        fetchTasks(),
        fetchOliviaSubsidies(),
      ]);
      setParcels(parcelRows.map(parcelToOrganic));
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
    const review = parcels.filter(p => p.status === 'needs_review' || p.status === 'unknown').length;
    const openTasks = tasks.filter(t => t.status !== 'DONE').length;
    const totalSubsidy = subsidies.reduce((acc, s) => acc + s.amount, 0);
    return { area, review, openTasks, totalSubsidy };
  }, [parcels, tasks, subsidies]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
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
            <p className="text-white font-bold">Denne modulen bruker ekte gårdsdata og viser nå også CAECV-dokumentpakken for eierskifte.</p>
            <p className="text-xs text-slate-500 mt-2">Parseller og Catastro-info hentes fra olivia.parcels. Støtte/kompensasjon hentes fra olivia.subsidy_income. Relaterte oppgaver filtreres fra olivia.tasks.</p>
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
              {parcel.notes && <p className="text-sm text-slate-400 mt-3 leading-relaxed">{parcel.notes}</p>}
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
