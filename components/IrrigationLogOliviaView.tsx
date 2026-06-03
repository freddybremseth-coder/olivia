import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Droplets,
  Gauge,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Timer,
  Waves,
  X,
} from 'lucide-react';
import type { Parcel } from '../types';
import type { FarmZone, IrrigationEvent } from '../types/farmIoT';
import { fetchParcels } from '../services/db';
import { fetchFarmZones, fetchRecentIrrigationEvents, insertIrrigationEvent } from '../services/farmIoT';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

type IrrigationForm = {
  parcel_id: string;
  zone_id: string;
  irrigation_sector_id: string;
  started_at: string;
  duration_minutes: string;
  estimated_liters: string;
  flow_l_min: string;
  pressure_bar: string;
  trigger: IrrigationEvent['trigger'];
  notes: string;
};

function defaultStartedAt(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function toIsoFromLocal(localDateTime: string): string {
  if (!localDateTime) return new Date().toISOString();
  return new Date(localDateTime).toISOString();
}

function addMinutes(iso: string, minutes?: number): string | undefined {
  if (!minutes) return undefined;
  return new Date(new Date(iso).getTime() + minutes * 60000).toISOString();
}

function triggerLabel(trigger: IrrigationEvent['trigger']): string {
  if (trigger === 'manual') return 'Manuell';
  if (trigger === 'schedule') return 'Planlagt';
  if (trigger === 'recommendation') return 'Anbefalt';
  return 'Automatisk';
}

function emptyForm(firstParcelId = ''): IrrigationForm {
  return {
    parcel_id: firstParcelId,
    zone_id: '',
    irrigation_sector_id: '',
    started_at: defaultStartedAt(),
    duration_minutes: '',
    estimated_liters: '',
    flow_l_min: '',
    pressure_bar: '',
    trigger: 'manual',
    notes: '',
  };
}

const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60';
const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1';
const helpClass = 'text-[11px] text-slate-600 block mb-2';

const IrrigationLogOliviaView: React.FC = () => {
  const [events, setEvents] = useState<IrrigationEvent[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [zones, setZones] = useState<FarmZone[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<IrrigationForm>(() => emptyForm());

  const parcelNameById = useMemo(() => new Map(parcels.map(parcel => [parcel.id, parcel.name])), [parcels]);
  const zoneNameById = useMemo(() => new Map(zones.map(zone => [zone.id, zone.name])), [zones]);
  const filteredZones = useMemo(() => {
    if (!form.parcel_id) return zones;
    return zones.filter(zone => zone.parcel_id === form.parcel_id);
  }, [zones, form.parcel_id]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [parcelRows, zoneRows, eventRows] = await Promise.all([
        fetchParcels(),
        fetchFarmZones(),
        fetchRecentIrrigationEvents(200),
      ]);
      setParcels(parcelRows);
      setZones(zoneRows);
      setEvents(eventRows);
      setLoadState(eventRows.length ? 'supabase' : 'empty');
      setLastRefresh(new Date());
      setForm(prev => ({ ...prev, parcel_id: prev.parcel_id || parcelRows[0]?.id || '' }));
    } catch (error) {
      setEvents([]);
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente vanningslogg fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const last30 = events.filter(event => now - new Date(event.started_at).getTime() < 30 * 24 * 36e5);
    const totalMinutes = last30.reduce((acc, event) => acc + (event.duration_minutes || 0), 0);
    const totalLiters = last30.reduce((acc, event) => acc + (event.estimated_liters || ((event.duration_minutes || 0) * (event.flow_l_min || 0))), 0);
    const pressureValues = last30.map(event => event.pressure_bar).filter((value): value is number => typeof value === 'number');
    const avgPressure = pressureValues.length ? pressureValues.reduce((acc, value) => acc + value, 0) / pressureValues.length : undefined;
    const wateredZones = new Set(last30.map(event => event.zone_id || event.irrigation_sector_id || event.parcel_id).filter(Boolean));
    return {
      count30: last30.length,
      totalMinutes,
      totalLiters: Math.round(totalLiters),
      avgPressure: avgPressure !== undefined ? Math.round(avgPressure * 10) / 10 : undefined,
      zones: wateredZones.size,
    };
  }, [events]);

  const estimateLiters = () => {
    const duration = Number(form.duration_minutes || 0);
    const flow = Number(form.flow_l_min || 0);
    if (!duration || !flow) return '';
    return String(Math.round(duration * flow));
  };

  const handleSave = async () => {
    setErrorMessage(null);
    if (!form.parcel_id) {
      setErrorMessage('Velg parsell før du lagrer vanning.');
      return;
    }
    if (!form.started_at || !form.duration_minutes) {
      setErrorMessage('Legg inn starttid og varighet før du lagrer vanning.');
      return;
    }

    const startedAt = toIsoFromLocal(form.started_at);
    const duration = Number(form.duration_minutes || 0) || undefined;
    const estimatedLiters = Number(form.estimated_liters || estimateLiters() || 0) || undefined;
    const event: Omit<IrrigationEvent, 'id'> = {
      parcel_id: form.parcel_id,
      zone_id: form.zone_id || undefined,
      irrigation_sector_id: form.irrigation_sector_id || undefined,
      started_at: startedAt,
      ended_at: addMinutes(startedAt, duration),
      duration_minutes: duration,
      estimated_liters: estimatedLiters,
      flow_l_min: Number(form.flow_l_min || 0) || undefined,
      pressure_bar: Number(form.pressure_bar || 0) || undefined,
      trigger: form.trigger,
      notes: form.notes || undefined,
    };

    setIsSaving(true);
    try {
      const saved = await insertIrrigationEvent(event);
      setEvents(prev => [saved, ...prev]);
      setLoadState('supabase');
      setLastRefresh(new Date());
      setIsFormOpen(false);
      setForm(emptyForm(form.parcel_id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Vanningshendelsen ble ikke lagret i Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen data ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.12),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><Waves className="text-blue-400" /> Vanningslogg</h2>
              <p className="text-slate-400 text-sm mt-2">Faktisk vanning per parsell, sone og sektor. Ingen demo-data og ingen localStorage-lagring.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            </button>
            <button onClick={() => setIsFormOpen(true)} className="bg-[#d9b657] hover:bg-[#f0cf70] text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-[#d9b657]/20 flex items-center gap-2">
              <Plus size={20} /> Registrer vanning
            </button>
          </div>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Vanninger 30d', value: stats.count30, icon: <Droplets size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Minutter 30d', value: stats.totalMinutes, icon: <Timer size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Liter 30d', value: stats.totalLiters, icon: <Waves size={18} />, cls: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400' },
          { label: 'Snitt trykk', value: stats.avgPressure !== undefined ? `${stats.avgPressure} bar` : '—', icon: <Gauge size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Soner vannet', value: stats.zones, icon: <ShieldCheck size={18} />, cls: 'border-white/10 bg-white/5 text-slate-300' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]">
        <p className="text-sm text-white font-bold">Hvorfor vanningsloggen er viktig</p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">Når vanning kobles til parsell, sone, flow, trykk, vær, jordfukt og høsting kan Olivia etter hvert vise vann per sone, effekt på rotsonen og vann per kg oliven.</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Siste vanningshendelser</h3>
        {isLoading && !events.length ? (
          <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter vanningshendelser fra Supabase...</div>
        ) : !events.length ? (
          <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center">
            <Droplets className="mx-auto text-[#d9b657] mb-3" size={34} />
            <h4 className="text-white font-bold text-lg">Ingen vanningshendelser ennå</h4>
            <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">Registrer første faktiske vanning når dere vanner på gården. Det opprettes ikke demo-hendelser.</p>
            <button onClick={() => setIsFormOpen(true)} className="mt-5 bg-[#d9b657] hover:bg-[#f0cf70] text-black px-5 py-3 rounded-2xl font-bold inline-flex items-center gap-2"><Plus size={18} /> Registrer første vanning</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {events.map(event => {
              const liters = event.estimated_liters || ((event.duration_minutes || 0) * (event.flow_l_min || 0));
              const parcelLabel = event.parcel_id ? (parcelNameById.get(event.parcel_id) || event.parcel_id) : 'Ukjent parsell';
              const zoneLabel = event.zone_id ? (zoneNameById.get(event.zone_id) || event.zone_id) : event.irrigation_sector_id || 'Ingen sone';
              return <div key={event.id} className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]">
                <div className="flex justify-between items-start gap-4">
                  <div><p className="text-white font-bold">{zoneLabel}</p><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">{parcelLabel} · {triggerLabel(event.trigger)} · {new Date(event.started_at).toLocaleString('no-NO')}</p></div>
                  <div className="text-right"><p className="text-2xl font-black text-white">{event.duration_minutes || '—'}</p><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">min</p></div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-5">
                  <Metric label="Liter" value={`${Math.round(liters || 0)} L`} />
                  <Metric label="Flow" value={event.flow_l_min ? `${event.flow_l_min} L/min` : '—'} />
                  <Metric label="Trykk" value={event.pressure_bar ? `${event.pressure_bar} bar` : '—'} />
                </div>
                {event.notes && <p className="text-sm text-slate-400 mt-4 leading-relaxed">{event.notes}</p>}
              </div>;
            })}
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Supabase · olivia.irrigation_events</p><h3 className="text-2xl font-bold text-white mt-1">Registrer vanning</h3><p className="text-xs text-slate-500 mt-1">Legg inn faktisk vanning per parsell, sone og sektor.</p></div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Parsell *" help="Velg ekte parsell fra Supabase.">
                <select className={inputClass} value={form.parcel_id} onChange={event => setForm(prev => ({ ...prev, parcel_id: event.target.value, zone_id: '' }))}>
                  <option className="bg-slate-900" value="">Velg parsell</option>
                  {parcels.map(parcel => <option key={parcel.id} className="bg-slate-900" value={parcel.id}>{parcel.name}</option>)}
                </select>
              </Field>
              <Field label="Sone" help="Velg sone fra Supabase hvis den finnes.">
                {filteredZones.length ? (
                  <select className={inputClass} value={form.zone_id} onChange={event => setForm(prev => ({ ...prev, zone_id: event.target.value }))}>
                    <option className="bg-slate-900" value="">Ingen bestemt sone</option>
                    {filteredZones.map(zone => <option key={zone.id} className="bg-slate-900" value={zone.id}>{zone.name}</option>)}
                  </select>
                ) : (
                  <input className={inputClass} placeholder="Ingen soner registrert ennå" value={form.zone_id} onChange={event => setForm(prev => ({ ...prev, zone_id: event.target.value }))} />
                )}
              </Field>
            </div>

            <Field label="Sektor / ventil" help="Valgfritt. Brukes hvis sonen har flere vanningssektorer."><input className={inputClass} placeholder="F.eks. ventil 2 eller sektor nord" value={form.irrigation_sector_id} onChange={event => setForm(prev => ({ ...prev, irrigation_sector_id: event.target.value }))} /></Field>
            <Field label="Starttid *" help="Når vanningen startet."><input type="datetime-local" className={inputClass} value={form.started_at} onChange={event => setForm(prev => ({ ...prev, started_at: event.target.value }))} /></Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Varighet minutter *" help="Hvor lenge vanningen varte."><input type="number" className={inputClass} placeholder="90" value={form.duration_minutes} onChange={event => setForm(prev => ({ ...prev, duration_minutes: event.target.value }))} /></Field>
              <Field label="Liter" help="Kan estimeres fra varighet × flow."><input type="number" className={inputClass} placeholder={estimateLiters() ? `Est. ${estimateLiters()}` : 'Valgfritt'} value={form.estimated_liters} onChange={event => setForm(prev => ({ ...prev, estimated_liters: event.target.value }))} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Flow L/min" help="Valgfritt, men nyttig for liter-estimat."><input type="number" className={inputClass} placeholder="L/min" value={form.flow_l_min} onChange={event => setForm(prev => ({ ...prev, flow_l_min: event.target.value }))} /></Field>
              <Field label="Trykk bar" help="Valgfritt. Brukes for å oppdage trykkfall/lekkasje."><input type="number" step="0.1" className={inputClass} placeholder="bar" value={form.pressure_bar} onChange={event => setForm(prev => ({ ...prev, pressure_bar: event.target.value }))} /></Field>
            </div>

            <Field label="Årsak / trigger" help="Hvorfor vanningen ble utført.">
              <select className={inputClass} value={form.trigger} onChange={event => setForm(prev => ({ ...prev, trigger: event.target.value as IrrigationEvent['trigger'] }))}>
                <option className="bg-slate-900" value="manual">Manuell</option>
                <option className="bg-slate-900" value="schedule">Planlagt</option>
                <option className="bg-slate-900" value="recommendation">Anbefalt av Olivia</option>
                <option className="bg-slate-900" value="automation">Automatisk</option>
              </select>
            </Field>

            <Field label="Notat" help="Beskriv hvorfor, hva som ble vannet og eventuelle avvik."><textarea className="w-full min-h-[120px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60" placeholder="F.eks. vanning etter lav jordfukt, kontroll etter trykkfall eller nyplantede trær" value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} /></Field>

            <button onClick={handleSave} disabled={isSaving} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {isSaving ? 'Lagrer i Supabase...' : 'Lagre vanning'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-sm text-white font-bold mt-1">{value}</p></div>;
}

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span><span className={helpClass}>{help}</span>{children}</label>;
}

export default IrrigationLogOliviaView;
