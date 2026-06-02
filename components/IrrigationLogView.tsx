import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Clock,
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
import type { IrrigationEvent } from '../types/farmIoT';
import {
  fetchRecentIrrigationEvents,
  insertIrrigationEvent,
} from '../services/farmIoT';

type DataSource = 'supabase' | 'local_demo';

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

const demoEvents: IrrigationEvent[] = [
  {
    id: 'demo-irrigation-1',
    parcel_id: 'biar-main',
    zone_id: 'zone-a',
    irrigation_sector_id: 'sector-a',
    started_at: new Date(Date.now() - 36e5 * 18).toISOString(),
    ended_at: new Date(Date.now() - 36e5 * 16).toISOString(),
    duration_minutes: 120,
    estimated_liters: 3360,
    flow_l_min: 28,
    pressure_bar: 1.8,
    trigger: 'recommendation',
    notes: 'Demo: vanning etter lav jordfukt i unge Gordal.',
  },
  {
    id: 'demo-irrigation-2',
    parcel_id: 'biar-main',
    zone_id: 'zone-b',
    irrigation_sector_id: 'sector-b',
    started_at: new Date(Date.now() - 36e5 * 72).toISOString(),
    ended_at: new Date(Date.now() - 36e5 * 70.5).toISOString(),
    duration_minutes: 90,
    estimated_liters: 2700,
    flow_l_min: 30,
    pressure_bar: 2.1,
    trigger: 'manual',
    notes: 'Demo: kontrollvanning eldre blanding.',
  },
];

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

function getLocalEvents(): IrrigationEvent[] {
  try {
    const raw = localStorage.getItem('olivia_irrigation_events');
    if (!raw) return demoEvents;
    const parsed = JSON.parse(raw) as IrrigationEvent[];
    return parsed.length ? parsed : demoEvents;
  } catch {
    return demoEvents;
  }
}

function saveLocalEvents(events: IrrigationEvent[]) {
  localStorage.setItem('olivia_irrigation_events', JSON.stringify(events));
}

function triggerLabel(trigger: IrrigationEvent['trigger']): string {
  if (trigger === 'manual') return 'Manuell';
  if (trigger === 'schedule') return 'Planlagt';
  if (trigger === 'recommendation') return 'Anbefalt';
  return 'Automatisk';
}

const IrrigationLogView: React.FC = () => {
  const [events, setEvents] = useState<IrrigationEvent[]>(demoEvents);
  const [dataSource, setDataSource] = useState<DataSource>('local_demo');
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [form, setForm] = useState<IrrigationForm>({
    parcel_id: 'biar-main',
    zone_id: 'zone-a',
    irrigation_sector_id: 'sector-a',
    started_at: defaultStartedAt(),
    duration_minutes: '90',
    estimated_liters: '',
    flow_l_min: '28',
    pressure_bar: '1.8',
    trigger: 'manual',
    notes: '',
  });

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const rows = await fetchRecentIrrigationEvents(200);
      if (rows.length) {
        setEvents(rows);
        setDataSource('supabase');
      } else {
        setEvents(getLocalEvents());
        setDataSource('local_demo');
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('[IrrigationLogView] Could not load Supabase irrigation events. Using local data.', error);
      setEvents(getLocalEvents());
      setDataSource('local_demo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const last30 = events.filter(event => now - new Date(event.started_at).getTime() < 30 * 24 * 36e5);
    const totalMinutes = last30.reduce((acc, event) => acc + (event.duration_minutes || 0), 0);
    const totalLiters = last30.reduce((acc, event) => acc + (event.estimated_liters || ((event.duration_minutes || 0) * (event.flow_l_min || 0))), 0);
    const avgPressure = last30
      .map(event => event.pressure_bar)
      .filter((value): value is number => typeof value === 'number')
      .reduce((acc, value, _, arr) => acc + value / arr.length, 0);
    const zones = new Set(last30.map(event => event.zone_id || event.irrigation_sector_id || event.parcel_id));
    return {
      count30: last30.length,
      totalMinutes,
      totalLiters: Math.round(totalLiters),
      avgPressure: Number.isFinite(avgPressure) ? Math.round(avgPressure * 10) / 10 : undefined,
      zones: zones.size,
    };
  }, [events]);

  const estimateLiters = () => {
    const duration = Number(form.duration_minutes || 0);
    const flow = Number(form.flow_l_min || 0);
    if (!duration || !flow) return '';
    return String(Math.round(duration * flow));
  };

  const handleSave = async () => {
    const startedAt = toIsoFromLocal(form.started_at);
    const duration = Number(form.duration_minutes || 0) || undefined;
    const event: Omit<IrrigationEvent, 'id'> = {
      parcel_id: form.parcel_id || 'biar-main',
      zone_id: form.zone_id || undefined,
      irrigation_sector_id: form.irrigation_sector_id || undefined,
      started_at: startedAt,
      ended_at: addMinutes(startedAt, duration),
      duration_minutes: duration,
      estimated_liters: Number(form.estimated_liters || estimateLiters() || 0) || undefined,
      flow_l_min: Number(form.flow_l_min || 0) || undefined,
      pressure_bar: Number(form.pressure_bar || 0) || undefined,
      trigger: form.trigger,
      notes: form.notes || undefined,
    };

    let saved: IrrigationEvent = { ...event, id: `local-${Date.now()}` };
    if (dataSource === 'supabase') {
      try {
        saved = await insertIrrigationEvent(event);
      } catch (error) {
        console.warn('[IrrigationLogView] Supabase save failed. Keeping local irrigation event.', error);
      }
    }

    const updated = [saved, ...events];
    setEvents(updated);
    if (dataSource !== 'supabase') saveLocalEvents(updated);
    setIsFormOpen(false);
    setForm({
      parcel_id: 'biar-main',
      zone_id: 'zone-a',
      irrigation_sector_id: 'sector-a',
      started_at: defaultStartedAt(),
      duration_minutes: '90',
      estimated_liters: '',
      flow_l_min: '28',
      pressure_bar: '1.8',
      trigger: 'manual',
      notes: '',
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Waves className="text-green-400" /> Vanningslogg
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            DonaAnna · vann per sone · {dataSource === 'supabase' ? 'Supabase' : 'Lokal demo'} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadEvents} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
          </button>
          <button onClick={() => setIsFormOpen(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2">
            <Plus size={20} /> Registrer vanning
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Vanninger 30d', value: stats.count30, icon: <Droplets size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Minutter 30d', value: stats.totalMinutes, icon: <Timer size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Liter 30d', value: stats.totalLiters, icon: <Waves size={18} />, cls: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400' },
          { label: 'Snitt trykk', value: stats.avgPressure !== undefined ? `${stats.avgPressure} bar` : '—', icon: <Gauge size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Soner vannet', value: stats.zones, icon: <ShieldCheck size={18} />, cls: 'border-white/10 bg-white/5 text-slate-300' },
        ].map(card => (
          <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}>
            <div className="mb-2">{card.icon}</div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p>
            <p className="text-3xl font-black text-white mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]">
        <p className="text-sm text-white font-bold">Hvorfor vanningsloggen er viktig</p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Når du kobler vanning til jordfukt, EC, flow, trykk, vær og høsting kan Olivia etter hvert vise vann per sone, effekt av vanning på rotsonen og vann per kg oliven. Dette er grunnlaget for bedre drift og lavere vannkostnad.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Siste vanningshendelser</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {events.map(event => {
            const liters = event.estimated_liters || ((event.duration_minutes || 0) * (event.flow_l_min || 0));
            return (
              <div key={event.id} className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-white font-bold">{event.zone_id || event.irrigation_sector_id || event.parcel_id}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                      {triggerLabel(event.trigger)} · {new Date(event.started_at).toLocaleString('no-NO')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white">{event.duration_minutes || '—'}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">min</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Liter</p>
                    <p className="text-sm text-white font-bold mt-1">{Math.round(liters || 0)} L</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Flow</p>
                    <p className="text-sm text-white font-bold mt-1">{event.flow_l_min || '—'} L/min</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Trykk</p>
                    <p className="text-sm text-white font-bold mt-1">{event.pressure_bar || '—'} bar</p>
                  </div>
                </div>

                {event.notes && <p className="text-sm text-slate-400 mt-4 leading-relaxed">{event.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">Registrer vanning</h3>
                <p className="text-xs text-slate-500 mt-1">Legg inn faktisk vanning per sone/sektor</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Sone, f.eks. zone-a" value={form.zone_id} onChange={event => setForm(prev => ({ ...prev, zone_id: event.target.value }))} />
              <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Sektor, f.eks. sector-a" value={form.irrigation_sector_id} onChange={event => setForm(prev => ({ ...prev, irrigation_sector_id: event.target.value }))} />
            </div>

            <input type="datetime-local" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none" value={form.started_at} onChange={event => setForm(prev => ({ ...prev, started_at: event.target.value }))} />

            <div className="grid grid-cols-2 gap-3">
              <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Varighet min" value={form.duration_minutes} onChange={event => setForm(prev => ({ ...prev, duration_minutes: event.target.value }))} />
              <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder={`Liter ${estimateLiters() ? `(est. ${estimateLiters()})` : ''}`} value={form.estimated_liters} onChange={event => setForm(prev => ({ ...prev, estimated_liters: event.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Flow L/min" value={form.flow_l_min} onChange={event => setForm(prev => ({ ...prev, flow_l_min: event.target.value }))} />
              <input type="number" step="0.1" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Trykk bar" value={form.pressure_bar} onChange={event => setForm(prev => ({ ...prev, pressure_bar: event.target.value }))} />
            </div>

            <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none" value={form.trigger} onChange={event => setForm(prev => ({ ...prev, trigger: event.target.value as IrrigationEvent['trigger'] }))}>
              <option value="manual">Manuell</option>
              <option value="schedule">Planlagt</option>
              <option value="recommendation">Anbefalt av Olivia</option>
              <option value="automation">Automatisk</option>
            </select>

            <textarea className="w-full min-h-[120px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none" placeholder="Notat, f.eks. vanning etter lav jordfukt eller kontroll etter trykkfall" value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} />

            <button onClick={handleSave} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-2">
              <Save size={20} /> Lagre vanning
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IrrigationLogView;
