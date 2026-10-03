import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  CloudRain,
  Download,
  Droplets,
  Euro,
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
import { fetchTasks } from '../services/db';
import { currentHarvestSeason, harvestSeasonForDate } from '../services/harvestSeason';
import { fetchSeasonReportSnapshot, type SeasonReportSnapshot } from '../services/seasonReport';

type WeatherSeasonSummary = {
  rain?: number;
  et0?: number;
  deficit?: number;
  hottestDay?: number;
  coldestDay?: number;
  dryDays?: number;
  startDate?: string;
  endDate?: string;
};

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function eur(value: number): string {
  return '€' + Math.round(value).toLocaleString('no-NO');
}

function kg(value: number): string {
  return Math.round(value).toLocaleString('no-NO') + ' kg';
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

function seasonBounds(season: string) {
  const match = /^(\d{4})\/(\d{2})$/.exec(season);
  if (!match) {
    const year = Number(season) || new Date().getFullYear();
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
    };
  }
  const startYear = Number(match[1]);
  return {
    start: new Date(startYear, 7, 1),
    end: new Date(startYear + 1, 6, 31),
  };
}

async function fetchWeatherSeasonSummary(season: string): Promise<WeatherSeasonSummary> {
  const lat = 38.6294;
  const lon = -0.7667;
  const bounds = seasonBounds(season);
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const effectiveEnd = bounds.end.getTime() > today.getTime() ? today : bounds.end;
  if (bounds.start.getTime() > effectiveEnd.getTime()) return {};

  const startDate = fmtDate(bounds.start);
  const endDate = fmtDate(effectiveEnd);
  const url =
    'https://archive-api.open-meteo.com/v1/archive?latitude=' + lat +
    '&longitude=' + lon +
    '&elevation=650&start_date=' + startDate +
    '&end_date=' + endDate +
    '&daily=precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min&timezone=auto&cell_selection=land';

  const response = await fetch(url);
  if (!response.ok) return {};
  const json = await response.json();
  const daily = json?.daily;
  if (!daily) return {};

  const rainSeries = (daily.precipitation_sum || []).map(Number).filter(Number.isFinite);
  const et0Series = (daily.et0_fao_evapotranspiration || []).map(Number).filter(Number.isFinite);
  const maxTemps = (daily.temperature_2m_max || []).map(Number).filter(Number.isFinite);
  const minTemps = (daily.temperature_2m_min || []).map(Number).filter(Number.isFinite);
  const rain = rainSeries.reduce((acc: number, value: number) => acc + value, 0);
  const et0 = et0Series.reduce((acc: number, value: number) => acc + value, 0);

  return {
    rain: Math.round(rain),
    et0: Math.round(et0),
    deficit: Math.round(et0 - rain),
    hottestDay: maxTemps.length ? Math.round(Math.max(...maxTemps)) : undefined,
    coldestDay: minTemps.length ? Math.round(Math.min(...minTemps)) : undefined,
    dryDays: rainSeries.filter((value: number) => value < 1).length,
    startDate,
    endDate,
  };
}

function avg(values: number[]): number | undefined {
  if (!values.length) return undefined;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

const SeasonReportOliviaView: React.FC = () => {
  const [snapshot, setSnapshot] = useState<SeasonReportSnapshot | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [irrigation, setIrrigation] = useState<IrrigationEvent[]>([]);
  const [weather, setWeather] = useState<WeatherSeasonSummary>({});
  const [season, setSeason] = useState(currentHarvestSeason());
  const [isLoading, setIsLoading] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (requestedSeason = season) => {
    setIsLoading(true);
    setError(null);
    try {
      const [report, taskRows, sensorRows, irrigationRows] = await Promise.all([
        fetchSeasonReportSnapshot(requestedSeason),
        fetchTasks().catch(() => []),
        fetchLatestSensorReadings(1000).catch(() => []),
        fetchRecentIrrigationEvents(250).catch(() => []),
      ]);
      setSnapshot(report);
      setSeason(report.season);
      setTasks(taskRows);
      setReadings(sensorRows);
      setIrrigation(irrigationRows);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente sesongrapport fra Olivia.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(currentHarvestSeason()); }, []);

  useEffect(() => {
    let cancelled = false;
    setWeatherLoading(true);
    fetchWeatherSeasonSummary(season)
      .then(result => { if (!cancelled) setWeather(result); })
      .catch(() => { if (!cancelled) setWeather({}); })
      .finally(() => { if (!cancelled) setWeatherLoading(false); });
    return () => { cancelled = true; };
  }, [season]);

  const sensorStats = useMemo(() => ({
    soilMoisture: avg(readings.filter(r => r.type === 'soil_moisture').map(r => Number(r.value))),
    soilEc: avg(readings.filter(r => r.type === 'soil_ec').map(r => Number(r.value))),
    soilPh: avg(readings.filter(r => r.type === 'soil_ph').map(r => Number(r.value))),
    battery: avg(readings.filter(r => typeof r.battery_percent === 'number').map(r => Number(r.battery_percent))),
  }), [readings]);

  const seasonIrrigation = useMemo(
    () => irrigation.filter(event => event.started_at && harvestSeasonForDate(String(event.started_at).slice(0, 10)) === season),
    [irrigation, season],
  );
  const irrigationLiters = seasonIrrigation.reduce((acc, event) => acc + (event.estimated_liters || 0), 0);
  const openTasks = tasks.filter(task => task.status !== 'DONE').length;

  const report = snapshot;
  const reportText = report ? [
    DONA_ANNA_BRAND.name + ' — Sesongrapport ' + report.season,
    DONA_ANNA_BRAND.location + ' · ' + DONA_ANNA_BRAND.altitude,
    '',
    'PLAN OG HØST',
    'Høsteplaner: ' + report.planCount + ' (' + report.approvedPlanCount + ' godkjent)',
    'Planlagt mengde: ' + kg(report.plannedKg),
    'Faktisk registrert høst: ' + kg(report.actualHarvestKg),
    'Avlingsverdi: ' + eur(report.harvestValue) + ' (kg × registrert pris; ikke det samme som mottatt betaling)',
    '',
    'ØKONOMI',
    'Mottatt inntekt: ' + eur(report.receivedIncome),
    'Fakturert, ikke mottatt: ' + eur(report.invoicedIncome),
    'Forventet inntekt: ' + eur(report.expectedIncome),
    'Tilskudd: ' + eur(report.subsidyIncome),
    'Utgifter: ' + eur(report.expenseTotal),
    'Kontantresultat: ' + eur(report.cashResult),
    'Ufordelt kostgrunnlag: ' + eur(report.unallocatedExpenseAmount) + ' på ' + report.unallocatedExpenseCount + ' bilag',
    '',
    'PRODUKSJON',
    'Produktive parceller: ' + report.productiveParcelCount,
    'Parceller med plan: ' + report.parcelsWithPlan,
    'Batcher: ' + report.batchCount + ' (' + report.activeBatchCount + ' aktive)',
    'Pakkelot: ' + report.lotCount,
    'Pakkede enheter: ' + report.packedUnits.toLocaleString('no-NO'),
    '',
    'KLIMA FOR SESONGPERIODEN',
    'Periode: ' + (weather.startDate || '—') + ' til ' + (weather.endDate || '—'),
    'Regn: ' + (weather.rain ?? '—') + ' mm',
    'ET0: ' + (weather.et0 ?? '—') + ' mm',
    'Regn minus ET0: ' + (weather.deficit == null ? '—' : -weather.deficit) + ' mm',
    '',
    'DRIFT NÅ',
    'Åpne oppgaver: ' + openTasks,
    'Sensorer i siste snapshot: ' + readings.length,
    'Vanningshendelser i hentet sesongutvalg: ' + seasonIrrigation.length,
    'Estimert vann i hentet utvalg: ' + Math.round(irrigationLiters).toLocaleString('no-NO') + ' liter',
  ].join('\n') : '';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/5">
        <DonaAnnaBrandMark variant="symbol" size="md" />
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FileText className="text-green-400" /> Sesongrapport</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Avlingssesong · faktisk inntekt · produksjon · kostgrunnlag</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={season}
            onChange={event => { const value = event.target.value; setSeason(value); load(value); }}
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold"
          >
            {(snapshot?.availableSeasons || [season]).map(value => <option key={value} value={value} className="bg-slate-900">{value}</option>)}
          </select>
          <button onClick={() => load(season)} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
          </button>
          <button
            onClick={() => downloadText('dona-anna-season-report-' + season.replace('/', '-') + '.txt', reportText)}
            disabled={!snapshot}
            className="bg-green-500 hover:bg-green-400 text-black px-5 py-3 rounded-2xl font-bold flex items-center gap-2 disabled:opacity-40"
          >
            <Download size={18} /> TXT
          </button>
        </div>
      </div>

      {error && <div className="glass rounded-[2rem] p-5 border border-red-500/30 bg-red-500/10 text-red-100 text-sm">{error}</div>}
      {!report && isLoading && <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Bygger sesongrapport fra registrerte data...</div>}

      {report && <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Planlagt', value: kg(report.plannedKg), icon: <Scale size={18} />, cls: 'border-slate-500/20 bg-slate-500/10 text-slate-300' },
            { label: 'Faktisk høst', value: kg(report.actualHarvestKg), icon: <Leaf size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
            { label: 'Mottatt inntekt', value: eur(report.receivedIncome + report.subsidyIncome), icon: <Euro size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
            { label: 'Kontantresultat', value: eur(report.cashResult), icon: <TrendingUp size={18} />, cls: report.cashResult >= 0 ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 'border-red-500/20 bg-red-500/10 text-red-400' },
          ].map(card => <div key={card.label} className={'glass rounded-[2rem] p-5 border ' + card.cls}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-2xl font-black text-white mt-1">{card.value}</p></div>)}
        </div>

        <div className="glass rounded-[2rem] p-6 border border-amber-300/20 bg-amber-300/[0.04]">
          <p className="text-[10px] uppercase tracking-widest font-black text-amber-300">Økonomisk sannhet</p>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-4">
            <Info label="Avlingsverdi" value={eur(report.harvestValue)} />
            <Info label="Mottatt" value={eur(report.receivedIncome)} />
            <Info label="Fakturert" value={eur(report.invoicedIncome)} />
            <Info label="Forventet" value={eur(report.expectedIncome)} />
            <Info label="Tilskudd" value={eur(report.subsidyIncome)} />
            <Info label="Utgifter" value={eur(report.expenseTotal)} />
          </div>
          <p className="text-xs text-slate-500 mt-3">Avlingsverdi er kg × registrert pris og brukes ikke som erstatning for faktisk mottatt betaling. Kontantresultatet bruker mottatt inntekt + registrerte tilskudd − utgifter.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <h3 className="text-sm text-white font-bold flex items-center gap-2"><Mountain size={18} className="text-[#d9b657]" /> Plan og gård</h3>
            <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <Info label="Produktive parceller" value={report.productiveParcelCount} />
              <Info label="Med plan" value={report.parcelsWithPlan} />
              <Info label="Høsteplaner" value={report.planCount} />
              <Info label="Godkjente planer" value={report.approvedPlanCount} />
            </div>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <h3 className="text-sm text-white font-bold flex items-center gap-2"><PackageCheck size={18} className="text-green-400" /> Produksjon</h3>
            <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <Info label="Batcher" value={report.batchCount} />
              <Info label="Aktive batcher" value={report.activeBatchCount} />
              <Info label="Pakkelot" value={report.lotCount} />
              <Info label="Pakkede enheter" value={report.packedUnits.toLocaleString('no-NO')} />
            </div>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <h3 className="text-sm text-white font-bold flex items-center gap-2"><BarChart3 size={18} className="text-red-300" /> Kostgrunnlag</h3>
            <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <Info label="Utgiftsbilag" value={report.expenseRows} />
              <Info label="Utgifter" value={eur(report.expenseTotal)} />
              <Info label="Ufordelte bilag" value={report.unallocatedExpenseCount} />
              <Info label="Ufordelt beløp" value={eur(report.unallocatedExpenseAmount)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <h3 className="text-sm text-white font-bold flex items-center gap-2"><CloudRain size={18} className="text-blue-400" /> Klima i valgt sesong</h3>
            <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <Info label="Periode" value={weatherLoading ? 'Laster…' : (weather.startDate && weather.endDate ? weather.startDate + ' – ' + weather.endDate : '—')} />
              <Info label="Regn" value={weather.rain == null ? '—' : weather.rain + ' mm'} />
              <Info label="ET0" value={weather.et0 == null ? '—' : weather.et0 + ' mm'} />
              <Info label="Tørre dager" value={weather.dryDays ?? '—'} />
            </div>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <h3 className="text-sm text-white font-bold flex items-center gap-2"><Droplets size={18} className="text-cyan-400" /> Vanning i hentet utvalg</h3>
            <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
              <Info label="Hendelser" value={seasonIrrigation.length} />
              <Info label="Estimert vann" value={Math.round(irrigationLiters).toLocaleString('no-NO') + ' L'} />
              <Info label="Åpne oppgaver nå" value={openTasks} />
              <Info label="Høsterader" value={report.harvestRows} />
            </div>
            <p className="text-[10px] text-slate-600 mt-3">Vanningsdelen bygger på de siste 250 hentede hendelsene og merkes derfor ikke som en komplett historisk total.</p>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <h3 className="text-sm text-white font-bold flex items-center gap-2"><FlaskConical size={18} className="text-purple-400" /> Nåværende sensorstatus</h3>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <Info label="Jordfukt" value={sensorStats.soilMoisture == null ? '—' : sensorStats.soilMoisture + '%'} />
              <Info label="Jord EC" value={sensorStats.soilEc ?? '—'} />
              <Info label="Jord pH" value={sensorStats.soilPh ?? '—'} />
              <Info label="Batteri" value={sensorStats.battery == null ? '—' : sensorStats.battery + '%'} />
            </div>
            <p className="text-[10px] text-slate-600 mt-3">Sensorverdiene er siste tilgjengelige snapshot og presenteres ikke som historisk sesonggjennomsnitt.</p>
          </div>
        </div>

        <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/5">
          <h3 className="text-lg text-white font-bold mb-3 flex items-center gap-2"><Leaf className="text-[#d9b657]" /> Rapporttekst</h3>
          <pre className="whitespace-pre-wrap text-sm text-slate-300 leading-relaxed bg-black/20 rounded-2xl p-5 border border-white/10">{reportText}</pre>
        </div>
      </>}
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
