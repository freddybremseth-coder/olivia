import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  CloudRain,
  Download,
  Droplets,
  Euro,
  Factory,
  FileText,
  FlaskConical,
  Leaf,
  Loader2,
  Mountain,
  PackageCheck,
  RefreshCcw,
  Scale,
  TrendingUp,
} from 'lucide-react';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import { DONA_ANNA_BRAND } from '../services/donaAnnaBrand';
import type { SensorReading, IrrigationEvent } from '../types/farmIoT';
import type { Task } from '../types';
import { fetchLatestSensorReadings, fetchRecentIrrigationEvents } from '../services/farmIoT';
import { fetchTasks, fetchBatches } from '../services/db';
import {
  fetchOliviaExpenses,
  fetchOliviaHarvests,
  fetchOliviaParcels,
  fetchOliviaSubsidies,
  type FarmExpense,
  type HarvestRecord,
  type SubsidyIncome,
} from '../services/oliviaSchemaData';

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

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function eur(value: number): string {
  return `€${Math.round(value).toLocaleString('no-NO')}`;
}

function kg(value: number): string {
  return `${Math.round(value).toLocaleString('no-NO')} kg`;
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
  if (!daily) return {};

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

const SeasonReportOliviaView: React.FC = () => {
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [expenses, setExpenses] = useState<FarmExpense[]>([]);
  const [subsidies, setSubsidies] = useState<SubsidyIncome[]>([]);
  const [batchCount, setBatchCount] = useState(0);
  const [parcelsCount, setParcelsCount] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [irrigation, setIrrigation] = useState<IrrigationEvent[]>([]);
  const [weather, setWeather] = useState<WeatherSeasonSummary>({});
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [parcelRows, harvestRows, expenseRows, subsidyRows, batchRows, taskRows, sensorRows, irrigationRows, weatherRows] = await Promise.all([
        fetchOliviaParcels(),
        fetchOliviaHarvests(),
        fetchOliviaExpenses(),
        fetchOliviaSubsidies(),
        fetchBatches().catch(() => []),
        fetchTasks().catch(() => []),
        fetchLatestSensorReadings(1000).catch(() => []),
        fetchRecentIrrigationEvents(250).catch(() => []),
        fetchWeatherSeasonSummary().catch(() => ({})),
      ]);
      setParcelsCount(parcelRows.length);
      setHarvests(harvestRows);
      setExpenses(expenseRows);
      setSubsidies(subsidyRows);
      setBatchCount(batchRows.length);
      setTasks(taskRows);
      setReadings(sensorRows);
      setIrrigation(irrigationRows);
      setWeather(weatherRows);
      const detectedSeason = harvestRows[0]?.season || expenseRows[0]?.season || new Date().getFullYear().toString();
      setSeason(current => current || detectedSeason);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente sesongrapport fra olivia schema.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const seasons = useMemo(() => {
    const all = new Set([new Date().getFullYear().toString(), ...harvests.map(h => h.season), ...expenses.map(e => e.season), ...subsidies.map(s => s.season)]);
    return [...all].sort((a, b) => b.localeCompare(a));
  }, [harvests, expenses, subsidies]);

  const seasonHarvests = harvests.filter(h => h.season === season);
  const seasonExpenses = expenses.filter(e => e.season === season);
  const seasonSubsidies = subsidies.filter(s => s.season === season);
  const totalKg = seasonHarvests.reduce((acc, h) => acc + h.kg, 0);
  const harvestIncome = seasonHarvests.reduce((acc, h) => acc + h.kg * h.pricePerKg, 0);
  const expensesTotal = seasonExpenses.reduce((acc, e) => acc + e.amount, 0);
  const subsidyTotal = seasonSubsidies.reduce((acc, s) => acc + s.amount, 0);
  const net = harvestIncome + subsidyTotal - expensesTotal;
  const sensorStats = {
    soilMoisture: avg(readings.filter(r => r.type === 'soil_moisture').map(r => Number(r.value))),
    soilEc: avg(readings.filter(r => r.type === 'soil_ec').map(r => Number(r.value))),
    soilPh: avg(readings.filter(r => r.type === 'soil_ph').map(r => Number(r.value))),
    battery: avg(readings.filter(r => typeof r.battery_percent === 'number').map(r => Number(r.battery_percent))),
  };
  const irrigationLiters = irrigation.reduce((acc, event) => acc + (event.estimated_liters || 0), 0);
  const openTasks = tasks.filter(task => task.status !== 'DONE').length;

  const reportText = `${DONA_ANNA_BRAND.name} — Sesongrapport ${season}\n${DONA_ANNA_BRAND.location} · ${DONA_ANNA_BRAND.altitude}\n\nHøsting: ${kg(totalKg)}\nHøsteinntekt: ${eur(harvestIncome)}\nStøtte/tilskudd: ${eur(subsidyTotal)}\nUtgifter: ${eur(expensesTotal)}\nNetto: ${eur(net)}\n\nParceller: ${parcelsCount}\nBatcher: ${batchCount}\nSensorer lest: ${readings.length}\nVanningshendelser: ${irrigation.length}\nEstimert vann: ${Math.round(irrigationLiters).toLocaleString('no-NO')} liter\n\nKlima YTD:\nRegn: ${weather.rainYtd ?? '—'} mm\nET0: ${weather.et0Ytd ?? '—'} mm\nUnderskudd: ${weather.deficitYtd ?? '—'} mm\n\nÅpne oppgaver: ${openTasks}\n`;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/5"><DonaAnnaBrandMark variant="symbol" size="md" /></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FileText className="text-green-400" /> Sesongrapport</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Ekte data fra olivia schema · vær · IoT · økonomi · batcher</p>
        </div>
        <div className="flex gap-2">
          <select value={season} onChange={e => setSeason(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold">
            {seasons.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
          </select>
          <button onClick={load} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <button onClick={() => downloadText(`dona-anna-season-report-${season}.txt`, reportText)} className="bg-green-500 hover:bg-green-400 text-black px-5 py-3 rounded-2xl font-bold flex items-center gap-2"><Download size={18} /> TXT</button>
        </div>
      </div>

      {error && <div className="glass rounded-[2rem] p-5 border border-red-500/30 bg-red-500/10 text-red-100 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Høstet', value: kg(totalKg), icon: <Scale size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Inntekt', value: eur(harvestIncome + subsidyTotal), icon: <Euro size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Utgifter', value: eur(expensesTotal), icon: <BarChart3 size={18} />, cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
          { label: 'Netto', value: eur(net), icon: <TrendingUp size={18} />, cls: net >= 0 ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 'border-red-500/20 bg-red-500/10 text-red-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-2xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-sm text-white font-bold flex items-center gap-2"><Mountain size={18} className="text-[#d9b657]" /> Gård og produksjon</h3>
          <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
            <Info label="Parceller" value={parcelsCount} />
            <Info label="Batcher" value={batchCount} />
            <Info label="Høsterader" value={seasonHarvests.length} />
            <Info label="Støtteposter" value={seasonSubsidies.length} />
          </div>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-sm text-white font-bold flex items-center gap-2"><CloudRain size={18} className="text-blue-400" /> Klima</h3>
          <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
            <Info label="Regn YTD" value={`${weather.rainYtd ?? '—'} mm`} />
            <Info label="ET0 YTD" value={`${weather.et0Ytd ?? '—'} mm`} />
            <Info label="Underskudd" value={`${weather.deficitYtd ?? '—'} mm`} />
            <Info label="Tørre dager" value={weather.dryDaysYtd ?? '—'} />
          </div>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-sm text-white font-bold flex items-center gap-2"><Droplets size={18} className="text-cyan-400" /> Vanning og IoT</h3>
          <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
            <Info label="Sensorer" value={readings.length} />
            <Info label="Vanninger" value={irrigation.length} />
            <Info label="Vann liter" value={Math.round(irrigationLiters).toLocaleString('no-NO')} />
            <Info label="Åpne oppgaver" value={openTasks} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-sm text-white font-bold flex items-center gap-2"><FlaskConical size={18} className="text-purple-400" /> Sensorstatus</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <Info label="Jordfukt" value={sensorStats.soilMoisture ? `${sensorStats.soilMoisture}%` : '—'} />
            <Info label="Jord EC" value={sensorStats.soilEc ?? '—'} />
            <Info label="Jord pH" value={sensorStats.soilPh ?? '—'} />
            <Info label="Batteri" value={sensorStats.battery ? `${sensorStats.battery}%` : '—'} />
          </div>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-sm text-white font-bold flex items-center gap-2"><PackageCheck size={18} className="text-green-400" /> Datakilder</h3>
          <div className="space-y-2 mt-5 text-xs text-slate-400">
            <p><strong className="text-white">Produksjon:</strong> olivia.harvest_records og olivia.batches</p>
            <p><strong className="text-white">Økonomi:</strong> olivia.farm_expenses og olivia.subsidy_income</p>
            <p><strong className="text-white">Gård:</strong> olivia.parcels og olivia.tasks</p>
            <p><strong className="text-white">Drift:</strong> sensor_readings og irrigation_events via farmIoT-service</p>
          </div>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/5">
        <h3 className="text-lg text-white font-bold mb-3 flex items-center gap-2"><Leaf className="text-[#d9b657]" /> Rapporttekst</h3>
        <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed bg-black/20 rounded-2xl p-5 border border-white/10">{reportText}</pre>
      </div>
    </div>
  );
};

const Info: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p>
    <p className="text-white font-black mt-1">{value}</p>
  </div>
);

export default SeasonReportOliviaView;
