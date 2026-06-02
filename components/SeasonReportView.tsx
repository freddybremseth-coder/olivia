import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CloudRain,
  Download,
  Droplets,
  Factory,
  FileText,
  FlaskConical,
  Leaf,
  Loader2,
  Mountain,
  PackageCheck,
  RefreshCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { IrrigationEvent, SensorReading } from '../types/farmIoT';
import { DONA_ANNA_BIAR_SEASON_SETTINGS } from '../types/farmIoT';
import { fetchLatestSensorReadings, fetchRecentIrrigationEvents } from '../services/farmIoT';
import { fetchTasks } from '../services/db';
import type { Task } from '../types';

type DataSource = 'supabase' | 'local_demo';

type WeatherSeasonSummary = {
  rainYtd?: number;
  et0Ytd?: number;
  deficitYtd?: number;
  rainLast30?: number;
  et0Last30?: number;
  hottestDay?: number;
  coldestDay?: number;
  dryDaysYtd?: number;
};

type LocalBatch = {
  id: string;
  batch_code: string;
  type: 'evoo' | 'table_olives' | 'raw_olives';
  kg_harvested: number;
  liters_oil?: number;
  yield_percent?: number;
  acidity_percent?: number;
  polyphenols_mg_kg?: number;
};

const demoReadings: SensorReading[] = [
  { id: 'demo-m', sensor_id: 'DA-BIAR-M-30', parcel_id: 'biar-main', zone_id: 'zone-a', depth_cm: 30, type: 'soil_moisture', value: 34, unit: '%', measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-ec', sensor_id: 'DA-BIAR-EC', parcel_id: 'biar-main', zone_id: 'zone-b', depth_cm: 40, type: 'soil_ec', value: 2.4, unit: 'dS/m', measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-ph', sensor_id: 'DA-BIAR-PH', parcel_id: 'biar-main', zone_id: 'zone-b', depth_cm: 40, type: 'soil_ph', value: 7.8, unit: 'pH', measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-water-ec', sensor_id: 'DA-BIAR-WATER-EC', parcel_id: 'biar-main', zone_id: 'pump-house', type: 'water_ec', value: 1.2, unit: 'dS/m', measured_at: new Date().toISOString(), source: 'simulation' },
];

const demoIrrigation: IrrigationEvent[] = [
  { id: 'demo-ir-1', parcel_id: 'biar-main', zone_id: 'zone-a', started_at: new Date(Date.now() - 9 * 24 * 36e5).toISOString(), duration_minutes: 120, estimated_liters: 3360, flow_l_min: 28, pressure_bar: 1.8, trigger: 'recommendation' },
  { id: 'demo-ir-2', parcel_id: 'biar-main', zone_id: 'zone-b', started_at: new Date(Date.now() - 18 * 24 * 36e5).toISOString(), duration_minutes: 90, estimated_liters: 2700, flow_l_min: 30, pressure_bar: 2.1, trigger: 'manual' },
];

const demoTasks: Task[] = [
  { id: 'demo-task-1', title: 'Sjekk dryppslange/filter i zone-a', priority: 'Kritisk', status: 'TODO', category: 'Vanning', user: 'Olivia' } as Task,
  { id: 'demo-task-2', title: 'Forbered økologisk dokumentpakke', priority: 'Høy', status: 'IN_PROGRESS', category: 'Økologisk', user: 'Freddy' } as Task,
  { id: 'demo-task-3', title: 'Registrer modenhetskontroll', priority: 'Middels', status: 'DONE', category: 'Innhøsting', user: 'Freddy' } as Task,
];

const demoWeather: WeatherSeasonSummary = {
  rainYtd: 238,
  et0Ytd: 712,
  deficitYtd: 474,
  rainLast30: 18,
  et0Last30: 122,
  hottestDay: 36,
  coldestDay: 2,
  dryDaysYtd: 118,
};

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getLocalBatches(): LocalBatch[] {
  try {
    const raw = localStorage.getItem('olivia_traceability_batches');
    if (!raw) return [];
    return JSON.parse(raw) as LocalBatch[];
  } catch {
    return [];
  }
}

function getLocalObservationsCount(): number {
  try {
    const raw = localStorage.getItem('olivia_farm_observations');
    if (!raw) return 0;
    const rows = JSON.parse(raw) as unknown[];
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

async function fetchWeatherSeasonSummary(): Promise<WeatherSeasonSummary> {
  const lat = 38.6294;
  const lon = -0.7667;
  const end = new Date();
  const start = new Date(end.getFullYear(), 0, 1);
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&elevation=650&start_date=${fmtDate(start)}&end_date=${fmtDate(end)}&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min&timezone=auto&cell_selection=land`;
  const response = await fetch(url);
  const json = await response.json();
  const daily = json?.daily;
  if (!daily) return demoWeather;

  const rainSeries = (daily.precipitation_sum || []).map(Number).filter(Number.isFinite);
  const et0Series = (daily.et0_fao_evapotranspiration || []).map(Number).filter(Number.isFinite);
  const maxTemps = (daily.temperature_2m_max || []).map(Number).filter(Number.isFinite);
  const minTemps = (daily.temperature_2m_min || []).map(Number).filter(Number.isFinite);
  const dates = daily.time || [];
  const rainYtd = rainSeries.reduce((acc: number, value: number) => acc + value, 0);
  const et0Ytd = et0Series.reduce((acc: number, value: number) => acc + value, 0);
  const last30Start = fmtDate(last30);
  const last30Indexes = dates.map((d: string, i: number) => d >= last30Start ? i : -1).filter((i: number) => i >= 0);
  const rainLast30 = last30Indexes.reduce((acc: number, i: number) => acc + (rainSeries[i] || 0), 0);
  const et0Last30 = last30Indexes.reduce((acc: number, i: number) => acc + (et0Series[i] || 0), 0);

  return {
    rainYtd: Math.round(rainYtd),
    et0Ytd: Math.round(et0Ytd),
    deficitYtd: Math.round(et0Ytd - rainYtd),
    rainLast30: Math.round(rainLast30),
    et0Last30: Math.round(et0Last30),
    hottestDay: maxTemps.length ? Math.round(Math.max(...maxTemps)) : undefined,
    coldestDay: minTemps.length ? Math.round(Math.min(...minTemps)) : undefined,
    dryDaysYtd: rainSeries.filter(v => v < 1).length,
  };
}

function avg(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const SeasonReportView: React.FC = () => {
  const [readings, setReadings] = useState<SensorReading[]>(demoReadings);
  const [irrigation, setIrrigation] = useState<IrrigationEvent[]>(demoIrrigation);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [weather, setWeather] = useState<WeatherSeasonSummary>(demoWeather);
  const [dataSource, setDataSource] = useState<DataSource>('local_demo');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sensorRows, irrigationRows, taskRows, weatherSummary] = await Promise.all([
        fetchLatestSensorReadings(2000),
        fetchRecentIrrigationEvents(500),
        fetchTasks(),
        fetchWeatherSeasonSummary(),
      ]);
      setReadings(sensorRows.length ? sensorRows : demoReadings);
      setIrrigation(irrigationRows.length ? irrigationRows : demoIrrigation);
      setTasks(taskRows.length ? taskRows : demoTasks);
      setWeather(weatherSummary);
      setDataSource(sensorRows.length || irrigationRows.length || taskRows.length ? 'supabase' : 'local_demo');
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('[SeasonReportView] Could not load live report data. Using demo.', error);
      setReadings(demoReadings);
      setIrrigation(demoIrrigation);
      setTasks(demoTasks);
      setWeather(demoWeather);
      setDataSource('local_demo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const batches = getLocalBatches();
  const observationsCount = getLocalObservationsCount();

  const report = useMemo(() => {
    const soilMoisture = readings.filter(r => r.type === 'soil_moisture').map(r => r.value);
    const soilEc = readings.filter(r => r.type === 'soil_ec').map(r => r.value);
    const soilPh = readings.filter(r => r.type === 'soil_ph').map(r => r.value);
    const waterEc = readings.filter(r => r.type === 'water_ec').map(r => r.value);
    const totalWater = irrigation.reduce((acc, event) => acc + (event.estimated_liters || ((event.duration_minutes || 0) * (event.flow_l_min || 0))), 0);
    const irrigationMinutes = irrigation.reduce((acc, event) => acc + (event.duration_minutes || 0), 0);
    const kgHarvested = batches.reduce((acc, batch) => acc + (batch.kg_harvested || 0), 0);
    const litersOil = batches.reduce((acc, batch) => acc + (batch.liters_oil || 0), 0);
    const avgYield = avg(batches.map(b => b.yield_percent || 0).filter(Boolean));
    const avgPolyphenols = avg(batches.map(b => b.polyphenols_mg_kg || 0).filter(Boolean));
    const openTasks = tasks.filter(t => t.status !== 'DONE').length;
    const doneTasks = tasks.filter(t => t.status === 'DONE').length;
    const waterPerKg = kgHarvested ? Math.round(totalWater / kgHarvested) : undefined;
    const waterPerLiterOil = litersOil ? Math.round(totalWater / litersOil) : undefined;

    const strengths: string[] = [];
    const risks: string[] = [];
    const nextActions: string[] = [];

    if (weather.deficitYtd && weather.deficitYtd > 350) risks.push('Høyt klimatisk vannunderskudd: vanningsstrategi og rotsonemålinger bør følges tett.');
    if ((avg(soilEc) || 0) > 2.2) risks.push('Jord-EC er forhøyet i gjennomsnitt: bekreft med jordprøve og vurder drenering/vannkvalitet.');
    if (openTasks > doneTasks) risks.push('Flere åpne enn fullførte oppgaver: prioriter kritiske vannings-, sensor- og øko-oppgaver.');
    if (batches.length > 0) strengths.push('Batch/sporbarhet er etablert, som gir bedre grunnlag for QR, merkevarehistorie og kvalitet.');
    if (observationsCount > 0) strengths.push('Feltlogg brukes, som gir praktisk forklaring på sensor- og værdata.');
    if (avgPolyphenols && avgPolyphenols > 350) strengths.push('Polyfenolnivå i registrerte batcher indikerer premium-posisjonering.');
    if (!strengths.length) strengths.push('Systemet samler nå data fra sensorer, vær, oppgaver og produksjon. Neste sesong kan bli langt mer datadrevet.');

    nextActions.push('Koble batcher og høsteplan til Supabase for permanent historikk.');
    nextActions.push('Legg inn faktiske farm_zones-polygoner slik at Sonekart blir et ekte kartlag.');
    nextActions.push('Kalibrer EC/pH-sensorer mot jord- og vannprøver før store agronomiske beslutninger.');
    nextActions.push('Bruk Auto-oppgaver ukentlig for å omsette data til praktisk arbeid.');

    return {
      avgSoilMoisture: avg(soilMoisture),
      avgSoilEc: avg(soilEc),
      avgSoilPh: avg(soilPh),
      avgWaterEc: avg(waterEc),
      totalWater: Math.round(totalWater),
      irrigationMinutes,
      kgHarvested,
      litersOil,
      avgYield,
      avgPolyphenols,
      openTasks,
      doneTasks,
      waterPerKg,
      waterPerLiterOil,
      strengths,
      risks,
      nextActions,
    };
  }, [readings, irrigation, tasks, batches, observationsCount, weather]);

  const exportReport = () => {
    const content = `DonaAnna sesongrapport ${new Date().getFullYear()}\n\nBiar, Alicante · ${DONA_ANNA_BIAR_SEASON_SETTINGS.altitude_m} moh.\n\nVÆR OG KLIMA\nRegn YTD: ${weather.rainYtd ?? '—'} mm\nET0 YTD: ${weather.et0Ytd ?? '—'} mm\nVannunderskudd YTD: ${weather.deficitYtd ?? '—'} mm\nRegn siste 30 dager: ${weather.rainLast30 ?? '—'} mm\nET0 siste 30 dager: ${weather.et0Last30 ?? '—'} mm\n\nVANNING\nTotalt vann logget: ${report.totalWater} L\nVanningstid: ${report.irrigationMinutes} min\nVann per kg oliven: ${report.waterPerKg ?? '—'} L/kg\n\nSENSORER\nSnitt jordfukt: ${report.avgSoilMoisture ?? '—'}%\nSnitt jord-EC: ${report.avgSoilEc ?? '—'} dS/m\nSnitt jord-pH: ${report.avgSoilPh ?? '—'}\nSnitt vann-EC: ${report.avgWaterEc ?? '—'} dS/m\n\nPRODUKSJON\nKg høstet: ${report.kgHarvested}\nLiter olje: ${report.litersOil}\nSnitt oljeutbytte: ${report.avgYield ?? '—'}%\nSnitt polyfenoler: ${report.avgPolyphenols ?? '—'} mg/kg\n\nOPPGAVER\nÅpne: ${report.openTasks}\nFullført: ${report.doneTasks}\n\nSTYRKER\n- ${report.strengths.join('\n- ')}\n\nRISIKO\n- ${report.risks.join('\n- ')}\n\nNESTE TILTAK\n- ${report.nextActions.join('\n- ')}\n`;
    downloadText(`donaanna-sesongrapport-${new Date().getFullYear()}.txt`, content);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FileText className="text-green-400" /> Sesongrapport</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">DonaAnna · Biar 650 moh. · års- og læringsrapport · {dataSource === 'supabase' ? 'Supabase' : 'Lokal demo'} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <button onClick={exportReport} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Download size={20} /> Eksporter TXT</button>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4"><Mountain className="text-green-400 mt-1" /><div><p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-2">Sesongprofil</p><p className="text-white font-bold">Biar, Alicante · {DONA_ANNA_BIAR_SEASON_SETTINGS.altitude_m} moh. · senere modning enn kyst/lavland.</p><p className="text-xs text-slate-500 mt-2">Rapporten er laget for å lære fra sesongen: vann, klima, salt, høsting, batcher, oppgaver og økologisk drift.</p></div></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Regn YTD', value: `${weather.rainYtd ?? '—'} mm`, icon: <CloudRain size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Vannunderskudd', value: `${weather.deficitYtd ?? '—'} mm`, icon: <TrendingUp size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Vanning', value: `${report.totalWater.toLocaleString('no-NO')} L`, icon: <Droplets size={18} />, cls: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400' },
          { label: 'Høstet', value: `${report.kgHarvested.toLocaleString('no-NO')} kg`, icon: <Scale size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-2xl md:text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass rounded-[2rem] p-6 border border-white/10"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 size={14} /> Sensorer</h3><div className="space-y-3 text-sm"><p className="text-slate-400">Snitt jordfukt: <strong className="text-white">{report.avgSoilMoisture ?? '—'}%</strong></p><p className="text-slate-400">Snitt jord-EC: <strong className="text-white">{report.avgSoilEc ?? '—'} dS/m</strong></p><p className="text-slate-400">Snitt jord-pH: <strong className="text-white">{report.avgSoilPh ?? '—'}</strong></p><p className="text-slate-400">Snitt vann-EC: <strong className="text-white">{report.avgWaterEc ?? '—'} dS/m</strong></p></div></div>
        <div className="glass rounded-[2rem] p-6 border border-white/10"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Factory size={14} /> Produksjon</h3><div className="space-y-3 text-sm"><p className="text-slate-400">Liter olje: <strong className="text-white">{report.litersOil.toLocaleString('no-NO')} L</strong></p><p className="text-slate-400">Snitt utbytte: <strong className="text-white">{report.avgYield ?? '—'}%</strong></p><p className="text-slate-400">Snitt polyfenoler: <strong className="text-white">{report.avgPolyphenols ?? '—'} mg/kg</strong></p><p className="text-slate-400">Batcher: <strong className="text-white">{batches.length}</strong></p></div></div>
        <div className="glass rounded-[2rem] p-6 border border-white/10"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><ClipboardList size={14} /> Arbeid</h3><div className="space-y-3 text-sm"><p className="text-slate-400">Åpne oppgaver: <strong className="text-white">{report.openTasks}</strong></p><p className="text-slate-400">Fullførte oppgaver: <strong className="text-white">{report.doneTasks}</strong></p><p className="text-slate-400">Feltobservasjoner: <strong className="text-white">{observationsCount}</strong></p><p className="text-slate-400">Vann per kg: <strong className="text-white">{report.waterPerKg ?? '—'} L/kg</strong></p></div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5"><h3 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CheckCircle2 size={14} /> Styrker</h3><div className="space-y-2">{report.strengths.map(item => <p key={item} className="text-sm text-slate-300 leading-relaxed">• {item}</p>)}</div></div>
        <div className="glass rounded-[2rem] p-6 border border-yellow-500/20 bg-yellow-500/5"><h3 className="text-xs font-bold text-yellow-400 uppercase tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14} /> Risiko</h3><div className="space-y-2">{report.risks.length ? report.risks.map(item => <p key={item} className="text-sm text-slate-300 leading-relaxed">• {item}</p>) : <p className="text-sm text-slate-500">Ingen tydelige risikopunkter i rapportgrunnlaget.</p>}</div></div>
        <div className="glass rounded-[2rem] p-6 border border-blue-500/20 bg-blue-500/5"><h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Sparkles size={14} /> Neste sesong</h3><div className="space-y-2">{report.nextActions.map(item => <p key={item} className="text-sm text-slate-300 leading-relaxed">• {item}</p>)}</div></div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-3"><PackageCheck size={18} className="text-green-400 mt-0.5" /><div><p className="text-sm text-white font-bold">Hva rapporten bør brukes til</p><p className="text-xs text-slate-500 mt-2 leading-relaxed">Denne siden gir ikke bare status, men læring: hva fungerte, hvor var risikoen, hvor mye vann ble brukt, hvordan var kvaliteten, og hvilke tiltak bør prioriteres før neste sesong.</p></div></div>
      </div>
    </div>
  );
};

export default SeasonReportView;
