import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  Gauge,
  Loader2,
  MapPin,
  RefreshCcw,
  Snowflake,
  Sun,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Parcel, Language } from '../types';
import { fetchSettings } from '../services/db';

type WeatherTab = 'forecast' | 'history' | 'yearly';

interface WeatherViewProps {
  initialData: any;
  initialLocationName: string;
  initialCoords: { lat: number; lon: number };
  language: Language;
  parcels: Parcel[];
  onParcelSelect: (parcel: Parcel) => void;
  selectedParcel: Parcel | null;
}

const WMO_CODES: Record<number, { label: string; icon: React.ReactNode }> = {
  0: { label: 'Klarvær', icon: <Sun size={46} className="text-yellow-300" /> },
  1: { label: 'Stort sett klart', icon: <CloudSun size={46} className="text-yellow-200" /> },
  2: { label: 'Delvis skyet', icon: <CloudSun size={46} className="text-slate-300" /> },
  3: { label: 'Overskyet', icon: <Cloud size={46} className="text-slate-400" /> },
  45: { label: 'Tåke', icon: <Cloud size={46} className="text-slate-500" /> },
  48: { label: 'Rimtåke', icon: <Cloud size={46} className="text-slate-500" /> },
  51: { label: 'Lett yr', icon: <Droplets size={46} className="text-blue-300" /> },
  53: { label: 'Yr', icon: <Droplets size={46} className="text-blue-400" /> },
  55: { label: 'Yr', icon: <Droplets size={46} className="text-blue-500" /> },
  61: { label: 'Lett regn', icon: <CloudRain size={46} className="text-blue-300" /> },
  63: { label: 'Regn', icon: <CloudRain size={46} className="text-blue-400" /> },
  65: { label: 'Kraftig regn', icon: <CloudRain size={46} className="text-blue-500" /> },
  71: { label: 'Lett snø', icon: <Snowflake size={46} className="text-sky-200" /> },
  73: { label: 'Snø', icon: <Snowflake size={46} className="text-sky-300" /> },
  75: { label: 'Kraftig snø', icon: <Snowflake size={46} className="text-sky-400" /> },
  80: { label: 'Regnbyger', icon: <CloudRain size={46} className="text-blue-300" /> },
  81: { label: 'Regnbyger', icon: <CloudRain size={46} className="text-blue-400" /> },
  82: { label: 'Kraftige regnbyger', icon: <CloudRain size={46} className="text-blue-500" /> },
  95: { label: 'Tordenvær', icon: <CloudLightning size={46} className="text-yellow-400" /> },
  96: { label: 'Tordenvær m/hagl', icon: <CloudLightning size={46} className="text-yellow-500" /> },
  99: { label: 'Tordenvær m/hagl', icon: <CloudLightning size={46} className="text-yellow-500" /> },
};

const wmoInfo = (code?: number) => WMO_CODES[Number(code)] ?? { label: 'Ukjent', icon: <Sun size={46} className="text-slate-400" /> };
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const noDate = (date: string) => new Date(date).toLocaleDateString('no-NO', { weekday: 'short', day: '2-digit', month: '2-digit' });

function weatherProxyUrl(endpoint: 'forecast' | 'archive', params: Record<string, string | number>) {
  const search = new URLSearchParams({ endpoint });
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  return `/api/weather/open-meteo?${search.toString()}`;
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Værdata kunne ikke hentes (${response.status}). ${body.slice(0, 120)}`.trim());
  }
  return response.json();
}

const WeatherView: React.FC<WeatherViewProps> = ({
  initialData,
  initialLocationName,
  initialCoords,
  parcels,
  onParcelSelect,
  selectedParcel,
}) => {
  const [locationSource, setLocationSource] = useState<string>('farm');
  const [activeCoords, setActiveCoords] = useState(initialCoords);
  const [activeLocationName, setActiveLocationName] = useState(initialLocationName || 'Gård');
  const [forecastData, setForecastData] = useState<any>(initialData);
  const [archiveData, setArchiveData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WeatherTab>('forecast');

  useEffect(() => {
    let cancelled = false;
    fetchSettings()
      .then(settings => {
        if (cancelled || !settings) return;
        const lat = Number(settings.farm_lat);
        const lon = Number(settings.farm_lon);
        if (Number.isFinite(lat) && Number.isFinite(lon)) setActiveCoords({ lat, lon });
        setActiveLocationName(settings.farm_name || settings.farm_address || initialLocationName || 'Gård');
      })
      .catch(err => console.warn('[WeatherView] Could not load farm settings', err));
    return () => { cancelled = true; };
  }, [initialLocationName]);

  const fetchAll = useCallback(async (lat: number, lon: number) => {
    setIsLoading(true);
    setIsLoadingArchive(true);
    setError(null);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const archiveStart = `${today.getFullYear() - 1}-01-01`;

    try {
      const [forecast, archive] = await Promise.all([
        fetchJson(weatherProxyUrl('forecast', {
          latitude: lat,
          longitude: lon,
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,weather_code,is_day,precipitation,surface_pressure',
          hourly: 'temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code',
          daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,sunrise,sunset',
          timezone: 'auto',
          forecast_days: 14,
        })),
        fetchJson(weatherProxyUrl('archive', {
          latitude: lat,
          longitude: lon,
          start_date: archiveStart,
          end_date: fmt(yesterday),
          daily: 'precipitation_sum,et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min',
          timezone: 'auto',
        })),
      ]);
      setForecastData(forecast);
      setArchiveData(archive);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch værdata. Prøv refresh, eller sjekk at /api/weather/open-meteo bygger i Vercel.');
    } finally {
      setIsLoading(false);
      setIsLoadingArchive(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(activeCoords.lat, activeCoords.lon);
  }, [activeCoords, fetchAll]);

  useEffect(() => {
    if (selectedParcel && locationSource === selectedParcel.id) {
      const lat = selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0];
      const lon = selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1];
      if (lat && lon) {
        setActiveCoords({ lat, lon });
        setActiveLocationName(selectedParcel.name);
      }
    }
  }, [selectedParcel, locationSource]);

  const handleLocationChange = (value: string) => {
    setLocationSource(value);
    if (value === 'farm') {
      fetchSettings().then(settings => {
        const lat = Number(settings?.farm_lat || initialCoords.lat);
        const lon = Number(settings?.farm_lon || initialCoords.lon);
        setActiveCoords({ lat, lon });
        setActiveLocationName(settings?.farm_name || settings?.farm_address || initialLocationName || 'Gård');
      }).catch(() => {
        setActiveCoords(initialCoords);
        setActiveLocationName(initialLocationName || 'Gård');
      });
      return;
    }
    const parcel = parcels.find(p => p.id === value);
    if (!parcel) return;
    const lat = parcel.lat ?? parcel.coordinates?.[0]?.[0];
    const lon = parcel.lon ?? parcel.coordinates?.[0]?.[1];
    if (lat && lon) {
      setActiveCoords({ lat, lon });
      setActiveLocationName(parcel.name);
      onParcelSelect(parcel);
    }
  };

  const cur = forecastData?.current;
  const daily = forecastData?.daily;

  const hourlyData = useMemo(() => {
    if (!forecastData?.hourly?.time) return [];
    return forecastData.hourly.time.slice(0, 48).map((time: string, i: number) => ({
      time: new Date(time).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      temp: forecastData.hourly.temperature_2m?.[i],
      nedbørSjanse: forecastData.hourly.precipitation_probability?.[i],
      nedbør: forecastData.hourly.precipitation?.[i],
    }));
  }, [forecastData]);

  const forecastDays = useMemo(() => {
    if (!daily?.time) return [];
    return daily.time.slice(0, 7).map((date: string, i: number) => ({
      date,
      label: i === 0 ? 'I dag' : i === 1 ? 'I morgen' : noDate(date),
      code: daily.weather_code?.[i],
      max: daily.temperature_2m_max?.[i],
      min: daily.temperature_2m_min?.[i],
      rain: daily.precipitation_sum?.[i] ?? 0,
      rainProb: daily.precipitation_probability_max?.[i] ?? 0,
      wind: daily.wind_speed_10m_max?.[i] ?? 0,
      et0: daily.et0_fao_evapotranspiration?.[i] ?? 0,
    }));
  }, [daily]);

  const waterBalance30d = useMemo(() => {
    if (!archiveData?.daily?.time) return null;
    const total = archiveData.daily.time.length;
    const start = Math.max(0, total - 30);
    const rain = archiveData.daily.precipitation_sum.slice(start).reduce((a: number, b: number | null) => a + (b ?? 0), 0);
    const et0 = archiveData.daily.et0_fao_evapotranspiration.slice(start).reduce((a: number, b: number | null) => a + (b ?? 0), 0);
    return { rain: Math.round(rain), et0: Math.round(et0), deficit: Math.round(et0 - rain) };
  }, [archiveData]);

  const historyChartData = useMemo(() => {
    if (!archiveData?.daily?.time) return [];
    const total = archiveData.daily.time.length;
    const start = Math.max(0, total - 90);
    return archiveData.daily.time.slice(start).map((date: string, i: number) => ({
      dato: date.slice(5).replace('-', '/'),
      Nedbør: +(archiveData.daily.precipitation_sum[start + i] ?? 0).toFixed(1),
      ET0: +(archiveData.daily.et0_fao_evapotranspiration[start + i] ?? 0).toFixed(1),
    }));
  }, [archiveData]);

  const yearlyChartData = useMemo(() => {
    if (!archiveData?.daily?.time) return [];
    const thisYear = new Date().getFullYear().toString();
    const lastYear = (new Date().getFullYear() - 1).toString();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
    const ty = Array(12).fill(0);
    const ly = Array(12).fill(0);
    archiveData.daily.time.forEach((date: string, i: number) => {
      const m = parseInt(date.slice(5, 7), 10) - 1;
      const rain = archiveData.daily.precipitation_sum[i] ?? 0;
      if (date.startsWith(thisYear)) ty[m] += rain;
      if (date.startsWith(lastYear)) ly[m] += rain;
    });
    return months.map((month, i) => ({ month, 'I år': Math.round(ty[i]), 'I fjor': Math.round(ly[i]) }));
  }, [archiveData]);

  const deficitStatus = waterBalance30d
    ? waterBalance30d.deficit > 60 ? 'critical'
      : waterBalance30d.deficit > 25 ? 'warning'
      : waterBalance30d.deficit > 5 ? 'mild'
      : 'ok'
    : 'ok';

  const deficitStyle = {
    critical: { text: 'text-red-400', border: 'border-red-500/40', bg: 'bg-red-500/10', label: 'Kritisk tørke' },
    warning: { text: 'text-orange-400', border: 'border-orange-500/40', bg: 'bg-orange-500/10', label: 'Vanningsbehov' },
    mild: { text: 'text-yellow-400', border: 'border-yellow-500/40', bg: 'bg-yellow-500/10', label: 'Lite underskudd' },
    ok: { text: 'text-green-400', border: 'border-green-500/40', bg: 'bg-green-500/10', label: 'Tilstrekkelig nedbør' },
  }[deficitStatus];

  const tooltipStyle = {
    contentStyle: { background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', fontSize: '12px' },
    labelStyle: { fontWeight: 'bold', color: '#fff' },
  };

  return (
    <div className="glass rounded-[2.5rem] p-6 md:p-8 border border-white/10 text-white min-h-[500px] flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-green-400 flex-shrink-0" />
            <div className="relative flex-1">
              <select value={locationSource} onChange={e => handleLocationChange(e.target.value)} className="bg-transparent text-xl font-bold focus:outline-none appearance-none cursor-pointer pr-8 w-full">
                <option value="farm" className="bg-slate-800">{activeLocationName}</option>
                {parcels.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>)}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={18} />
            </div>
          </div>
          <p className="text-xs text-slate-500 font-mono pl-6">
            {activeCoords.lat.toFixed(4)}, {activeCoords.lon.toFixed(4)} · via Olivia weather proxy
          </p>
        </div>
        <button onClick={() => fetchAll(activeCoords.lat, activeCoords.lon)} disabled={isLoading} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 flex-shrink-0">
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl text-sm flex items-center gap-3"><AlertTriangle size={16} /> {error}</div>}

      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl">
        {([
          { key: 'forecast', label: 'Prognose' },
          { key: 'history', label: 'Regnhistorikk' },
          { key: 'yearly', label: 'Årsstatistikk' },
        ] as { key: WeatherTab; label: string }[]).map(tab => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${activeTab === tab.key ? 'bg-green-500 text-black shadow' : 'text-slate-400 hover:text-white'}`}>{tab.label}</button>)}
      </div>

      {activeTab === 'forecast' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {cur ? <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950/60 to-slate-900/60 border border-white/10 p-6 md:p-8"><div className="flex flex-col md:flex-row items-center md:items-start gap-6"><div className="flex flex-col items-center md:items-start gap-2">{wmoInfo(cur.weather_code).icon}<div className="text-7xl font-black tracking-tighter leading-none">{Math.round(cur.temperature_2m)}°</div><div className="text-slate-300 font-medium text-base">{wmoInfo(cur.weather_code).label}</div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 w-full"><Metric icon={<Thermometer size={18} />} label="Føles som" value={`${Math.round(cur.apparent_temperature ?? cur.temperature_2m)}°`} /><Metric icon={<Droplets size={18} />} label="Fukt" value={`${cur.relative_humidity_2m ?? '—'}%`} /><Metric icon={<Wind size={18} />} label="Vind" value={`${Math.round(cur.wind_speed_10m ?? 0)} km/t`} /><Metric icon={<Gauge size={18} />} label="Trykk" value={`${Math.round(cur.surface_pressure ?? 0)} hPa`} /></div></div></div> : <EmptyWeather isLoading={isLoading} />}

          {waterBalance30d && <div className={`rounded-3xl border ${deficitStyle.border} ${deficitStyle.bg} p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4`}><div><p className={`text-xs font-black uppercase tracking-widest ${deficitStyle.text}`}>{deficitStyle.label}</p><h3 className="text-2xl font-bold mt-1">30 dagers vannbalanse</h3><p className="text-sm text-slate-400 mt-1">Nedbør {waterBalance30d.rain} mm · ET0 {waterBalance30d.et0} mm</p></div><div className={`text-4xl font-black ${deficitStyle.text}`}>{waterBalance30d.deficit > 0 ? '-' : '+'}{Math.abs(waterBalance30d.deficit)} mm</div></div>}

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {forecastDays.map(day => <div key={day.date} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 text-center"><p className="text-xs text-slate-500 font-bold uppercase mb-2">{day.label}</p><div className="flex justify-center scale-75 h-12">{wmoInfo(day.code).icon}</div><p className="text-lg font-bold mt-2">{Math.round(day.max)}° / {Math.round(day.min)}°</p><p className="text-xs text-blue-300 mt-2">{day.rain} mm · {day.rainProb}%</p><p className="text-[10px] text-slate-500 mt-1">ET0 {Number(day.et0).toFixed(1)} mm</p></div>)}
          </div>

          <ChartCard title="Neste 48 timer"><ResponsiveContainer width="100%" height={260}><BarChart data={hourlyData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" /><XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} /><YAxis stroke="#64748b" tick={{ fontSize: 10 }} /><Tooltip {...tooltipStyle} /><Legend /><Bar dataKey="nedbør" fill="#38bdf8" name="Nedbør mm" /><Line type="monotone" dataKey="temp" stroke="#facc15" name="Temp °C" dot={false} /></BarChart></ResponsiveContainer></ChartCard>
        </div>
      )}

      {activeTab === 'history' && <ChartCard title="Regn og ET0 siste 90 dager" loading={isLoadingArchive}><ResponsiveContainer width="100%" height={320}><BarChart data={historyChartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" /><XAxis dataKey="dato" stroke="#64748b" tick={{ fontSize: 10 }} /><YAxis stroke="#64748b" tick={{ fontSize: 10 }} /><Tooltip {...tooltipStyle} /><Legend /><Bar dataKey="Nedbør" fill="#38bdf8" /><Bar dataKey="ET0" fill="#f97316" /></BarChart></ResponsiveContainer></ChartCard>}

      {activeTab === 'yearly' && <ChartCard title="Nedbør per måned"><ResponsiveContainer width="100%" height={320}><BarChart data={yearlyChartData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" /><XAxis dataKey="month" stroke="#64748b" /><YAxis stroke="#64748b" /><Tooltip {...tooltipStyle} /><Legend /><Bar dataKey="I år" fill="#22c55e" /><Bar dataKey="I fjor" fill="#64748b" /></BarChart></ResponsiveContainer></ChartCard>}
    </div>
  );
};

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="bg-black/20 border border-white/10 rounded-2xl p-4"><div className="text-green-400 mb-2">{icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-lg font-bold text-white mt-1">{value}</p></div>;
}

function ChartCard({ title, children, loading }: { title: string; children: React.ReactNode; loading?: boolean }) {
  return <div className="bg-black/20 border border-white/10 rounded-3xl p-5"><div className="flex items-center justify-between mb-4"><h3 className="font-bold flex items-center gap-2"><BarChart2 size={18} className="text-green-400" /> {title}</h3>{loading && <Loader2 size={16} className="animate-spin text-slate-500" />}</div>{children}</div>;
}

function EmptyWeather({ isLoading }: { isLoading: boolean }) {
  return <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-slate-400">{isLoading ? <Loader2 className="mx-auto animate-spin mb-3" /> : <AlertTriangle className="mx-auto mb-3" />}Ingen værdata lastet ennå.</div>;
}

export default WeatherView;
