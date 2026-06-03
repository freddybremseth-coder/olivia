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
  Leaf,
  Loader2,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import type { SensorAlert, SensorReading } from '../types/farmIoT';
import { fetchLatestSensorReadings, fetchOpenSensorAlerts } from '../services/farmIoT';
import { fetchTasks, upsertTask } from '../services/db';
import {
  autoSuggestionToTask,
  buildAutoTaskSuggestions,
  type AutoTaskSuggestion,
} from '../services/autoTaskAdvisor';
import { fetchOliviaHarvests, fetchOliviaParcels, fetchOliviaSubsidies } from '../services/oliviaSchemaData';

type WeatherSignal = {
  rainNext7d?: number;
  minTempNext7d?: number;
  hotDaysNext7d?: number;
  deficit7d?: number;
};

type DataHealth = {
  parcels: number;
  sensors: number;
  alerts: number;
  existingTasks: number;
  harvestRows: number;
  subsidyRows: number;
};

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
  } catch {
    // Weather archive is optional. Forecast still gives useful signals.
  }

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

function enhanceWithBusinessSuggestions(params: {
  suggestions: AutoTaskSuggestion[];
  dataHealth: DataHealth;
  weather: WeatherSignal;
}): AutoTaskSuggestion[] {
  const result = [...params.suggestions];
  const today = new Date();
  const month = today.getMonth() + 1;
  const due = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  if (params.dataHealth.subsidyRows === 0 && (month === 6 || month === 7)) {
    result.push({
      id: 'auto-organic-subsidy-data-check',
      title: 'Kontroller støtte-/kompensasjonsdata for økologisk drift',
      priority: 'Høy',
      category: 'Økologisk',
      dueDate: due(7),
      source: 'organic_certification',
      reason: 'Ingen støtteposter er registrert i olivia.subsidy_income, samtidig som sommerperioden er viktig for øko-/befaringsoppfølging.',
      suggestedAction: 'Kontroller om støtte/kompensasjon er søkt, innvilget eller mangler registrering i databasen.',
      confidence: 0.7,
    });
  }

  if (params.dataHealth.harvestRows === 0 && month >= 10 && month <= 12) {
    result.push({
      id: 'auto-harvest-records-missing',
      title: 'Registrer høstedata for sesongen',
      priority: 'Høy',
      category: 'Innhøsting',
      dueDate: due(2),
      source: 'harvest',
      reason: 'Det finnes ingen høsteregistreringer i olivia.harvest_records for datagrunnlaget som ble hentet.',
      suggestedAction: 'Registrer sort, parsell, kg, dato, kanal og pris slik at økonomi, produksjon og sesongrapport blir riktig.',
      confidence: 0.72,
    });
  }

  return result;
}

const AutoTasksOliviaView: React.FC = () => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [weather, setWeather] = useState<WeatherSignal>({});
  const [dataHealth, setDataHealth] = useState<DataHealth>({ parcels: 0, sensors: 0, alerts: 0, existingTasks: 0, harvestRows: 0, subsidyRows: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [createdIds, setCreatedIds] = useState<string[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sensorRows, alertRows, weatherSignal, parcelRows, existingTasks, harvestRows, subsidyRows] = await Promise.all([
        fetchLatestSensorReadings(1000).catch(() => []),
        fetchOpenSensorAlerts().catch(() => []),
        fetchWeatherSignal().catch(() => ({})),
        fetchOliviaParcels().catch(() => []),
        fetchTasks().catch(() => []),
        fetchOliviaHarvests().catch(() => []),
        fetchOliviaSubsidies().catch(() => []),
      ]);
      setReadings(sensorRows);
      setAlerts(alertRows);
      setWeather(weatherSignal);
      setDataHealth({
        parcels: parcelRows.length,
        sensors: sensorRows.length,
        alerts: alertRows.length,
        existingTasks: existingTasks.length,
        harvestRows: harvestRows.length,
        subsidyRows: subsidyRows.length,
      });
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente auto-oppgavegrunnlag fra olivia schema.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const suggestions = useMemo(() => {
    const base = buildAutoTaskSuggestions({ readings, alerts, weather, includeSeasonal: true });
    return enhanceWithBusinessSuggestions({ suggestions: base, dataHealth, weather });
  }, [readings, alerts, weather, dataHealth]);

  const critical = suggestions.filter(s => s.priority === 'Kritisk').length;
  const high = suggestions.filter(s => s.priority === 'Høy').length;
  const createdCount = createdIds.length;

  const createTask = async (suggestion: AutoTaskSuggestion) => {
    const task = autoSuggestionToTask(suggestion);
    await upsertTask(task);
    setCreatedIds(prev => [...prev, suggestion.id]);
    window.dispatchEvent(new Event('storage'));
  };

  const createAllHighPriority = async () => {
    const important = suggestions.filter(s => (s.priority === 'Kritisk' || s.priority === 'Høy') && !createdIds.includes(s.id));
    for (const suggestion of important) await upsertTask(autoSuggestionToTask(suggestion));
    setCreatedIds(prev => [...prev, ...important.map(s => s.id)]);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/5"><DonaAnnaBrandMark variant="symbol" size="md" /></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Sparkles className="text-green-400" /> Auto-oppgaver</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Ekte datagrunnlag · olivia schema · ingen demo · oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <button onClick={createAllHighPriority} disabled={!suggestions.some(s => (s.priority === 'Kritisk' || s.priority === 'Høy') && !createdIds.includes(s.id))} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2 disabled:opacity-40"><Plus size={20} /> Opprett viktige</button>
        </div>
      </div>

      {error && <div className="glass rounded-[2rem] p-5 border border-red-500/30 bg-red-500/10 text-red-100 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Forslag', value: suggestions.length, icon: <ClipboardList size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Kritiske', value: critical, icon: <AlertTriangle size={18} />, cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
          { label: 'Høy prioritet', value: high, icon: <ShieldCheck size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Opprettet nå', value: createdCount, icon: <CheckCircle2 size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <p className="text-sm text-white font-bold flex items-center gap-2"><Leaf size={16} className="text-green-400" /> Datagrunnlag</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
          {[
            ['Parceller', dataHealth.parcels],
            ['Sensorer', dataHealth.sensors],
            ['Varsler', dataHealth.alerts],
            ['Eksisterende oppgaver', dataHealth.existingTasks],
            ['Høsterader', dataHealth.harvestRows],
            ['Støtteposter', dataHealth.subsidyRows],
          ].map(([label, value]) => <div key={label} className="p-3 rounded-2xl bg-white/5 border border-white/10"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-white font-black mt-1">{value}</p></div>)}
        </div>
        <p className="text-xs text-slate-500 mt-4 leading-relaxed">Ingen demo-sensorer brukes. Dersom det ikke finnes sensordata, bygges forslag kun fra vær, sesong og forretningsdata.</p>
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

              <button onClick={() => createTask(suggestion)} disabled={created} className="mt-5 w-full bg-white/10 hover:bg-green-500 hover:text-black disabled:hover:bg-white/10 disabled:text-green-400 disabled:opacity-70 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2">
                {created ? <><CheckCircle2 size={18} /> Opprettet</> : <><Plus size={18} /> Opprett som oppgave</>}
              </button>
            </div>
          );
        })}
      </div>

      {suggestions.length === 0 && (
        <div className="glass rounded-[2rem] p-8 border border-white/10 text-center text-slate-500">
          Ingen automatiske oppgaveforslag akkurat nå basert på ekte data. Dette betyr at sensorer, vær, varsler og forretningsdata ikke gir tydelige tiltak akkurat nå.
        </div>
      )}
    </div>
  );
};

export default AutoTasksOliviaView;
