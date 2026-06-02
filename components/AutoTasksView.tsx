import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BatteryLow,
  CheckCircle2,
  ClipboardList,
  CloudRain,
  Droplets,
  FlaskConical,
  Gauge,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { SensorAlert, SensorReading } from '../types/farmIoT';
import { fetchLatestSensorReadings, fetchOpenSensorAlerts } from '../services/farmIoT';
import { upsertTask } from '../services/db';
import {
  autoSuggestionToTask,
  buildAutoTaskSuggestions,
  type AutoTaskSuggestion,
} from '../services/autoTaskAdvisor';

type DataSource = 'supabase' | 'local_demo';

type WeatherSignal = {
  rainNext7d?: number;
  minTempNext7d?: number;
  hotDaysNext7d?: number;
  deficit7d?: number;
};

const demoReadings: SensorReading[] = [
  { id: 'demo-a-m60', sensor_id: 'DA-BIAR-SOIL-M-60-A', parcel_id: 'biar-main', zone_id: 'zone-a', tree_group: 'Unge Gordal', depth_cm: 60, type: 'soil_moisture', value: 27, unit: '%', battery_percent: 87, measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-a-flow', sensor_id: 'DA-BIAR-FLOW-A', parcel_id: 'biar-main', zone_id: 'zone-a', type: 'flow', value: 28, unit: 'L/min', battery_percent: 65, measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-a-pressure', sensor_id: 'DA-BIAR-PRESSURE-A', parcel_id: 'biar-main', zone_id: 'zone-a', type: 'pressure', value: 0.6, unit: 'bar', battery_percent: 22, measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-b-ec', sensor_id: 'DA-BIAR-SOIL-EC-B', parcel_id: 'biar-main', zone_id: 'zone-b', tree_group: 'Eldre blanding', depth_cm: 40, type: 'soil_ec', value: 2.7, unit: 'dS/m', battery_percent: 74, measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-water-ec', sensor_id: 'DA-BIAR-WATER-EC', parcel_id: 'biar-main', zone_id: 'pump-house', type: 'water_ec', value: 1.2, unit: 'dS/m', battery_percent: 100, measured_at: new Date().toISOString(), source: 'simulation' },
];

const demoAlerts: SensorAlert[] = [];

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchWeatherSignal(): Promise<WeatherSignal> {
  const lat = 38.6294;
  const lon = -0.7667;
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&elevation=650&daily=precipitation_sum,temperature_2m_min,temperature_2m_max&forecast_days=7&timezone=auto`;
  const response = await fetch(forecastUrl);
  const json = await response.json();
  const daily = json?.daily;
  if (!daily) return {};

  const rainNext7d = (daily.precipitation_sum || []).reduce((acc: number, value: number) => acc + (Number(value) || 0), 0);
  const minTemps = (daily.temperature_2m_min || []).map(Number).filter(Number.isFinite);
  const maxTemps = (daily.temperature_2m_max || []).map(Number).filter(Number.isFinite);
  const hotDaysNext7d = maxTemps.filter((value: number) => value >= 32).length;

  let deficit7d: number | undefined;
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&elevation=650&start_date=${fmtDate(start)}&end_date=${fmtDate(yesterday)}&daily=precipitation_sum,et0_fao_evapotranspiration&timezone=auto&cell_selection=land`;
    const archiveResponse = await fetch(archiveUrl);
    const archive = await archiveResponse.json();
    const rain = (archive?.daily?.precipitation_sum || []).reduce((acc: number, value: number) => acc + (Number(value) || 0), 0);
    const et0 = (archive?.daily?.et0_fao_evapotranspiration || []).reduce((acc: number, value: number) => acc + (Number(value) || 0), 0);
    deficit7d = Math.round(et0 - rain);
  } catch { /* optional */ }

  return {
    rainNext7d: Math.round(rainNext7d),
    minTempNext7d: minTemps.length ? Math.min(...minTemps) : undefined,
    hotDaysNext7d,
    deficit7d,
  };
}

function sourceIcon(source: AutoTaskSuggestion['source']) {
  if (source === 'soil_moisture') return <Droplets size={18} />;
  if (source === 'salinity') return <FlaskConical size={18} />;
  if (source === 'irrigation_system') return <Gauge size={18} />;
  if (source === 'sensor_health') return <BatteryLow size={18} />;
  if (source === 'weather') return <CloudRain size={18} />;
  if (source === 'harvest') return <Sparkles size={18} />;
  return <ShieldCheck size={18} />;
}

function priorityClass(priority: AutoTaskSuggestion['priority']): string {
  if (priority === 'Kritisk') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (priority === 'Høy') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (priority === 'Middels') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

const AutoTasksView: React.FC = () => {
  const [readings, setReadings] = useState<SensorReading[]>(demoReadings);
  const [alerts, setAlerts] = useState<SensorAlert[]>(demoAlerts);
  const [weather, setWeather] = useState<WeatherSignal>({});
  const [dataSource, setDataSource] = useState<DataSource>('local_demo');
  const [isLoading, setIsLoading] = useState(false);
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sensorRows, alertRows, weatherSignal] = await Promise.all([
        fetchLatestSensorReadings(1000),
        fetchOpenSensorAlerts(),
        fetchWeatherSignal(),
      ]);
      if (sensorRows.length || alertRows.length) {
        setReadings(sensorRows.length ? sensorRows : demoReadings);
        setAlerts(alertRows);
        setDataSource('supabase');
      } else {
        setReadings(demoReadings);
        setAlerts(demoAlerts);
        setDataSource('local_demo');
      }
      setWeather(weatherSignal);
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('[AutoTasksView] Could not load live data. Using demo.', error);
      setReadings(demoReadings);
      setAlerts(demoAlerts);
      setWeather({ rainNext7d: 0, minTempNext7d: 8, hotDaysNext7d: 0, deficit7d: 18 });
      setDataSource('local_demo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const suggestions = useMemo(() => buildAutoTaskSuggestions({ readings, alerts, weather, includeSeasonal: true }), [readings, alerts, weather]);
  const critical = suggestions.filter(s => s.priority === 'Kritisk').length;
  const high = suggestions.filter(s => s.priority === 'Høy').length;
  const sensorCount = readings.length;
  const createdCount = createdIds.length;

  const createTask = async (suggestion: AutoTaskSuggestion) => {
    const task = autoSuggestionToTask(suggestion);
    await upsertTask(task);
    setCreatedIds(prev => [...prev, suggestion.id]);
    window.dispatchEvent(new Event('storage'));
  };

  const createAllHighPriority = async () => {
    const important = suggestions.filter(s => (s.priority === 'Kritisk' || s.priority === 'Høy') && !createdIds.includes(s.id));
    for (const suggestion of important) {
      await upsertTask(autoSuggestionToTask(suggestion));
    }
    setCreatedIds(prev => [...prev, ...important.map(s => s.id)]);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Sparkles className="text-green-400" /> Auto-oppgaver</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Olivia foreslår arbeid basert på sensorer, vær, sesong og varsler · {dataSource === 'supabase' ? 'Supabase' : 'Lokal demo'} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <button onClick={createAllHighPriority} disabled={!suggestions.some(s => (s.priority === 'Kritisk' || s.priority === 'Høy') && !createdIds.includes(s.id))} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2 disabled:opacity-40"><Plus size={20} /> Opprett viktige</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Forslag', value: suggestions.length, icon: <ClipboardList size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Kritiske', value: critical, icon: <AlertTriangle size={18} />, cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
          { label: 'Høy prioritet', value: high, icon: <ShieldCheck size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Opprettet nå', value: createdCount, icon: <CheckCircle2 size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <p className="text-sm text-white font-bold">Datagrunnlag</p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">Bruker {sensorCount} sensorlesninger, {alerts.length} åpne varsler og værsignal for Biar 650 moh. Forslagene er beslutningsstøtte — de bør bekreftes i felt før store tiltak.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {suggestions.map(suggestion => {
          const created = createdIds.includes(suggestion.id);
          return (
            <div key={suggestion.id} className={`glass rounded-[2rem] p-6 border ${priorityClass(suggestion.priority)}`}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-white/5">{sourceIcon(suggestion.source)}</div>
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{suggestion.priority} · {suggestion.category}</p>
                    <h3 className="text-lg text-white font-bold">{suggestion.title}</h3>
                    {suggestion.zone_id && <p className="text-xs text-slate-500 mt-1">Sone: {suggestion.zone_id}</p>}
                  </div>
                </div>
                <div className="text-right"><p className="text-[10px] text-slate-500">Tillit</p><p className="text-2xl text-white font-black">{Math.round(suggestion.confidence * 100)}%</p></div>
              </div>

              <p className="text-sm text-slate-400 mt-5 leading-relaxed"><strong className="text-white">Årsak:</strong> {suggestion.reason}</p>
              <p className="text-sm text-slate-400 mt-3 leading-relaxed"><strong className="text-white">Anbefalt handling:</strong> {suggestion.suggestedAction}</p>
              <p className="text-xs text-slate-500 mt-3">Frist: {suggestion.dueDate} · Kilde: {suggestion.source}</p>

              <button onClick={() => createTask(suggestion)} disabled={created} className="mt-5 w-full bg-white/10 hover:bg-green-500 hover:text-black text-white font-bold py-3.5 rounded-2xl transition-all disabled:opacity-50 disabled:hover:bg-white/10 disabled:hover:text-white flex items-center justify-center gap-2">
                {created ? <><CheckCircle2 size={18} /> Oppgave opprettet</> : <><Plus size={18} /> Opprett oppgave</>}
              </button>
            </div>
          );
        })}
      </div>

      {suggestions.length === 0 && (
        <div className="glass rounded-[2rem] p-8 border border-white/10 text-center text-slate-500">
          Ingen automatiske oppgaveforslag akkurat nå.
        </div>
      )}
    </div>
  );
};

export default AutoTasksView;
