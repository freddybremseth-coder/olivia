import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Gauge,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Waves,
} from 'lucide-react';
import type { SensorReading, IrrigationEvent } from '../types/farmIoT';
import {
  fetchLatestSensorReadings,
  fetchRecentIrrigationEvents,
} from '../services/farmIoT';
import {
  buildIrrigationAdvice,
  type ClimateWaterInput,
  type IrrigationZoneAdvice,
} from '../services/irrigationAdvisor';

type DataSource = 'supabase' | 'local_demo';

const BIAR_DEFAULT = { lat: 38.6294, lon: -0.7667, elevation: 650 };

const demoReadings: SensorReading[] = [
  { id: 'demo-m30-a', sensor_id: 'DA-BIAR-SOIL-M-30-A', parcel_id: 'biar-main', zone_id: 'zone-a', tree_group: 'Unge Gordal', depth_cm: 30, type: 'soil_moisture', value: 32, unit: '%', measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-m60-a', sensor_id: 'DA-BIAR-SOIL-M-60-A', parcel_id: 'biar-main', zone_id: 'zone-a', tree_group: 'Unge Gordal', depth_cm: 60, type: 'soil_moisture', value: 27, unit: '%', measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-ec-b', sensor_id: 'DA-BIAR-SOIL-EC-B', parcel_id: 'biar-main', zone_id: 'zone-b', tree_group: 'Eldre blanding', depth_cm: 40, type: 'soil_ec', value: 2.3, unit: 'dS/m', measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-water-ec', sensor_id: 'DA-BIAR-WATER-EC', parcel_id: 'biar-main', zone_id: 'pump-house', type: 'water_ec', value: 1.2, unit: 'dS/m', measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-flow-a', sensor_id: 'DA-BIAR-FLOW-A', parcel_id: 'biar-main', zone_id: 'zone-a', type: 'flow', value: 28, unit: 'L/min', measured_at: new Date().toISOString(), source: 'simulation' },
  { id: 'demo-pressure-a', sensor_id: 'DA-BIAR-PRESSURE-A', parcel_id: 'biar-main', zone_id: 'zone-a', type: 'pressure', value: 0.6, unit: 'bar', measured_at: new Date().toISOString(), source: 'simulation' },
];

function getFarmCoords() {
  try {
    const settings = JSON.parse(localStorage.getItem('olivia_settings') || '{}');
    if (settings.farmLat && settings.farmLon) {
      return {
        lat: Number(settings.farmLat),
        lon: Number(settings.farmLon),
        elevation: Number(settings.farmElevation || BIAR_DEFAULT.elevation),
      };
    }
  } catch { /* ignore */ }
  return BIAR_DEFAULT;
}

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce((acc, value) => acc + (Number(value) || 0), 0);
}

async function fetchClimateWaterInput(): Promise<ClimateWaterInput> {
  const coords = getFarmCoords();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const start = new Date(today);
  start.setDate(today.getDate() - 30);

  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&elevation=${coords.elevation}&start_date=${fmtDate(start)}&end_date=${fmtDate(yesterday)}&daily=precipitation_sum,et0_fao_evapotranspiration,vapor_pressure_deficit_max,temperature_2m_max&timezone=auto&cell_selection=land`;
  const response = await fetch(url);
  const archive = await response.json();
  const daily = archive?.daily;
  if (!daily?.time) return {};

  const rain30 = sum(daily.precipitation_sum || []);
  const et030 = sum(daily.et0_fao_evapotranspiration || []);
  const rain7 = sum((daily.precipitation_sum || []).slice(-7));
  const et07 = sum((daily.et0_fao_evapotranspiration || []).slice(-7));
  const vpdValues = (daily.vapor_pressure_deficit_max || []).slice(-7).map(Number).filter((value: number) => Number.isFinite(value));
  const hotDays7 = (daily.temperature_2m_max || []).slice(-7).map(Number).filter((value: number) => value >= 32).length;

  let forecastRain7d: number | undefined;
  try {
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&elevation=${coords.elevation}&daily=precipitation_sum&forecast_days=7&timezone=auto`;
    const forecastResponse = await fetch(forecastUrl);
    const forecast = await forecastResponse.json();
    if (forecast?.daily?.precipitation_sum) forecastRain7d = sum(forecast.daily.precipitation_sum);
  } catch { /* forecast is optional */ }

  return {
    rain7d: Math.round(rain7),
    rain30d: Math.round(rain30),
    et0_7d: Math.round(et07),
    et0_30d: Math.round(et030),
    deficit7d: Math.round(et07 - rain7),
    deficit30d: Math.round(et030 - rain30),
    vpdAvg7d: vpdValues.length ? Math.round((vpdValues.reduce((a: number, b: number) => a + b, 0) / vpdValues.length) * 100) / 100 : undefined,
    hotDays7,
    forecastRain7d: typeof forecastRain7d === 'number' ? Math.round(forecastRain7d) : undefined,
  };
}

function severityClass(severity: IrrigationZoneAdvice['severity']): string {
  if (severity === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (severity === 'warning') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (severity === 'watch') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-green-500/20 bg-green-500/10 text-green-400';
}

function severityIcon(severity: IrrigationZoneAdvice['severity']) {
  if (severity === 'critical' || severity === 'warning') return <AlertTriangle size={18} />;
  if (severity === 'watch') return <Sparkles size={18} />;
  return <CheckCircle2 size={18} />;
}

const IrrigationAdvisorView: React.FC = () => {
  const [readings, setReadings] = useState<SensorReading[]>(demoReadings);
  const [irrigationEvents, setIrrigationEvents] = useState<IrrigationEvent[]>([]);
  const [climate, setClimate] = useState<ClimateWaterInput>({ rain7d: 0, rain30d: 0, et0_7d: 0, et0_30d: 0, deficit7d: 0, deficit30d: 0 });
  const [dataSource, setDataSource] = useState<DataSource>('local_demo');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadAdvisor = async () => {
    setIsLoading(true);
    try {
      const [latestReadings, recentIrrigation, climateInput] = await Promise.all([
        fetchLatestSensorReadings(500),
        fetchRecentIrrigationEvents(100),
        fetchClimateWaterInput(),
      ]);

      if (latestReadings.length) {
        setReadings(latestReadings);
        setIrrigationEvents(recentIrrigation);
        setDataSource('supabase');
      } else {
        setReadings(demoReadings);
        setIrrigationEvents([]);
        setDataSource('local_demo');
      }
      setClimate(climateInput);
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('[IrrigationAdvisorView] Could not load Supabase/climate data. Using local demo.', error);
      setReadings(demoReadings);
      setIrrigationEvents([]);
      setDataSource('local_demo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdvisor();
  }, []);

  const advice = useMemo(() => buildIrrigationAdvice({ readings, climate, irrigationEvents }), [readings, climate, irrigationEvents]);
  const topAdvice = advice[0];
  const needsIrrigation = advice.filter(item => item.action === 'irrigate_evening').length;
  const needsInspection = advice.filter(item => item.action === 'inspect_dripline').length;
  const salinityWatch = advice.filter(item => item.action === 'check_salinity').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Droplets className="text-green-400" /> Vanningsrådgiver 2.0
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            DonaAnna · Biar 650 moh. · {dataSource === 'supabase' ? 'Supabase' : 'Lokal demo'} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={loadAdvisor} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
        </button>
      </div>

      {topAdvice && (
        <div className={`glass rounded-[2rem] p-6 border ${severityClass(topAdvice.severity)}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2">Viktigste anbefaling</p>
          <div className="flex items-start gap-4">
            <div className="mt-1">{severityIcon(topAdvice.severity)}</div>
            <div>
              <p className="text-xl text-white font-bold">{topAdvice.zone_name}: {topAdvice.title}</p>
              <p className="text-sm text-slate-400 mt-2">{topAdvice.message}</p>
              {topAdvice.recommended_minutes && (
                <p className="text-sm text-white font-bold mt-3">
                  Anbefalt: ca. {topAdvice.recommended_minutes} minutter · {topAdvice.recommended_timing}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-3">Tillit: {Math.round(topAdvice.confidence * 100)}% · {topAdvice.reasons.join(' ')}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-[2rem] p-6 border border-blue-500/20 bg-blue-500/5">
          <Droplets className="text-blue-400 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Regn 7 / 30 dager</p>
          <p className="text-3xl font-black text-white mt-2">{climate.rain7d ?? '—'} / {climate.rain30d ?? '—'} mm</p>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-orange-500/20 bg-orange-500/5">
          <Gauge className="text-orange-400 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Underskudd 7 / 30 dager</p>
          <p className="text-3xl font-black text-white mt-2">{climate.deficit7d ?? '—'} / {climate.deficit30d ?? '—'} mm</p>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
          <Waves className="text-green-400 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Regnvarsel 7 dager</p>
          <p className="text-3xl font-black text-white mt-2">{climate.forecastRain7d ?? '—'} mm</p>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/5">
          <ShieldCheck className="text-slate-300 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Soner</p>
          <p className="text-3xl font-black text-white mt-2">{advice.length}</p>
          <p className="text-xs text-slate-500 mt-2">{needsIrrigation} vanning · {needsInspection} inspeksjon · {salinityWatch} salt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {advice.map(item => (
          <div key={item.zone_id} className={`glass rounded-[2rem] p-6 border ${severityClass(item.severity)}`}>
            <div className="flex justify-between gap-4 items-start mb-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{item.severity === 'critical' ? 'Kritisk' : item.severity === 'warning' ? 'Viktig' : item.severity === 'watch' ? 'Følg med' : 'OK'}</p>
                <h3 className="text-lg font-bold text-white">{item.zone_name}</h3>
                {item.tree_group && <p className="text-xs text-slate-500 mt-1">{item.tree_group}</p>}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Tillit</p>
                <p className="text-2xl font-black text-white">{Math.round(item.confidence * 100)}%</p>
              </div>
            </div>

            <p className="text-white font-bold">{item.title}</p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{item.message}</p>

            {item.recommended_minutes && (
              <div className="mt-4 p-4 rounded-2xl bg-black/20 border border-white/10">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Anbefalt vanning</p>
                <p className="text-white font-bold mt-1">Ca. {item.recommended_minutes} minutter · {item.recommended_timing}</p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-5">
              {[
                ['Fukt 30 cm', item.values.soil_moisture_30cm !== undefined ? `${item.values.soil_moisture_30cm}%` : '—'],
                ['Fukt 60 cm', item.values.soil_moisture_60cm !== undefined ? `${item.values.soil_moisture_60cm}%` : '—'],
                ['Jord EC', item.values.soil_ec !== undefined ? `${item.values.soil_ec} dS/m` : '—'],
                ['Vann EC', item.values.water_ec !== undefined ? `${item.values.water_ec} dS/m` : '—'],
                ['Flow', item.values.flow !== undefined ? `${item.values.flow} L/min` : '—'],
                ['Trykk', item.values.pressure !== undefined ? `${item.values.pressure} bar` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p>
                  <p className="text-sm text-white font-bold mt-1">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Grunnlag</p>
              <ul className="space-y-1">
                {item.reasons.map(reason => (
                  <li key={reason} className="text-xs text-slate-400 leading-relaxed">• {reason}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <p className="text-sm text-white font-bold">Bruk dette som beslutningsstøtte</p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Vanningsrådgiveren kombinerer sensorer, klimadata og Biar-profilen, men lokal kontroll er fortsatt viktig. Sjekk dryppslanger, jord, trær og EC-målinger før store endringer i vanningsstrategien.
        </p>
      </div>
    </div>
  );
};

export default IrrigationAdvisorView;
