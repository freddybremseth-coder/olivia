import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Droplets,
  Gauge,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sun,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Waves,
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

type ClimateDaily = {
  time: string[];
  precipitation_sum: Array<number | null>;
  rain_sum?: Array<number | null>;
  et0_fao_evapotranspiration: Array<number | null>;
  temperature_2m_max: Array<number | null>;
  temperature_2m_min: Array<number | null>;
  temperature_2m_mean?: Array<number | null>;
  sunshine_duration?: Array<number | null>;
  shortwave_radiation_sum?: Array<number | null>;
  wind_gusts_10m_max?: Array<number | null>;
  wind_speed_10m_max?: Array<number | null>;
  relative_humidity_2m_mean?: Array<number | null>;
  vapor_pressure_deficit_max?: Array<number | null>;
  soil_moisture_0_to_7cm_mean?: Array<number | null>;
  soil_moisture_7_to_28cm_mean?: Array<number | null>;
  soil_moisture_28_to_100cm_mean?: Array<number | null>;
  soil_temperature_0_to_7cm_mean?: Array<number | null>;
  soil_temperature_7_to_28cm_mean?: Array<number | null>;
  soil_temperature_28_to_100cm_mean?: Array<number | null>;
};

type ClimateResponse = {
  daily?: ClimateDaily;
  error?: boolean;
  reason?: string;
};

type MonthlyStats = {
  month: string;
  rainThisYear: number;
  rainLastYear: number;
  et0ThisYear: number;
  et0LastYear: number;
  deficitThisYear: number;
  deficitLastYear: number;
};

type Insight = {
  title: string;
  value: string;
  description: string;
  status: 'good' | 'watch' | 'warning' | 'critical';
  icon: React.ReactNode;
};

const BIAR_DEFAULT = { lat: 38.6294, lon: -0.7667, elevation: 650 };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce((acc, value) => acc + (Number(value) || 0), 0);
}

function avg(values: Array<number | null | undefined>): number | null {
  const valid = values.map(Number).filter(value => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((acc, value) => acc + value, 0) / valid.length;
}

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

function sliceLastDays<T>(values: T[], days: number): T[] {
  return values.slice(Math.max(0, values.length - days));
}

function buildMonthlyStats(daily: ClimateDaily): MonthlyStats[] {
  const now = new Date();
  const thisYear = String(now.getFullYear());
  const lastYear = String(now.getFullYear() - 1);

  const rainThis = Array(12).fill(0);
  const rainLast = Array(12).fill(0);
  const et0This = Array(12).fill(0);
  const et0Last = Array(12).fill(0);

  daily.time.forEach((date, index) => {
    const month = Number(date.slice(5, 7)) - 1;
    const rain = Number(daily.precipitation_sum[index] || 0);
    const et0 = Number(daily.et0_fao_evapotranspiration[index] || 0);

    if (date.startsWith(thisYear)) {
      rainThis[month] += rain;
      et0This[month] += et0;
    } else if (date.startsWith(lastYear)) {
      rainLast[month] += rain;
      et0Last[month] += et0;
    }
  });

  return MONTHS.map((month, index) => ({
    month,
    rainThisYear: Math.round(rainThis[index]),
    rainLastYear: Math.round(rainLast[index]),
    et0ThisYear: Math.round(et0This[index]),
    et0LastYear: Math.round(et0Last[index]),
    deficitThisYear: Math.round(et0This[index] - rainThis[index]),
    deficitLastYear: Math.round(et0Last[index] - rainLast[index]),
  }));
}

function buildInsights(daily: ClimateDaily): Insight[] {
  const rain30 = sum(sliceLastDays(daily.precipitation_sum, 30));
  const et030 = sum(sliceLastDays(daily.et0_fao_evapotranspiration, 30));
  const deficit30 = et030 - rain30;

  const rain90 = sum(sliceLastDays(daily.precipitation_sum, 90));
  const et090 = sum(sliceLastDays(daily.et0_fao_evapotranspiration, 90));
  const deficit90 = et090 - rain90;

  const maxTemps30 = sliceLastDays(daily.temperature_2m_max, 30).map(Number);
  const hotDays30 = maxTemps30.filter(value => value >= 32).length;
  const veryHotDays30 = maxTemps30.filter(value => value >= 36).length;

  const minTemps60 = sliceLastDays(daily.temperature_2m_min, 60).map(Number);
  const coldRiskDays60 = minTemps60.filter(value => value <= 2).length;

  const windGusts30 = daily.wind_gusts_10m_max ? sliceLastDays(daily.wind_gusts_10m_max, 30).map(Number) : [];
  const windyDays30 = windGusts30.filter(value => value >= 45).length;

  const vpd30 = daily.vapor_pressure_deficit_max ? avg(sliceLastDays(daily.vapor_pressure_deficit_max, 30)) : null;
  const soilMoistureDeep30 = daily.soil_moisture_28_to_100cm_mean ? avg(sliceLastDays(daily.soil_moisture_28_to_100cm_mean, 30)) : null;
  const sunshine30 = daily.sunshine_duration ? sum(sliceLastDays(daily.sunshine_duration, 30)) / 3600 : null;

  const insights: Insight[] = [
    {
      title: 'Vannbalanse 30 dager',
      value: `${Math.round(deficit30)} mm`,
      description: `${Math.round(et030)} mm ET₀ mot ${Math.round(rain30)} mm regn. Positivt tall betyr at atmosfæren har tatt mer vann enn regnet har gitt.`,
      status: deficit30 > 80 ? 'critical' : deficit30 > 45 ? 'warning' : deficit30 > 15 ? 'watch' : 'good',
      icon: <Droplets size={18} />,
    },
    {
      title: 'Vannbalanse 90 dager',
      value: `${Math.round(deficit90)} mm`,
      description: `${Math.round(et090)} mm ET₀ mot ${Math.round(rain90)} mm regn. God for å se om sesongen bygger tørkestress.`,
      status: deficit90 > 180 ? 'critical' : deficit90 > 110 ? 'warning' : deficit90 > 50 ? 'watch' : 'good',
      icon: <Waves size={18} />,
    },
    {
      title: 'Varmedager siste 30 dager',
      value: `${hotDays30} dager`,
      description: `${veryHotDays30} dager over 36 °C. Relevans: stress, fruktstørrelse, vanningsbehov og unge trær.`,
      status: veryHotDays30 > 4 ? 'critical' : hotDays30 > 10 ? 'warning' : hotDays30 > 4 ? 'watch' : 'good',
      icon: <Thermometer size={18} />,
    },
    {
      title: 'Frostrisiko siste 60 dager',
      value: `${coldRiskDays60} dager`,
      description: 'Dager med minimumstemperatur nær frost. Biar 650 moh. bør følges særlig vinter/vår.',
      status: coldRiskDays60 > 2 ? 'warning' : coldRiskDays60 > 0 ? 'watch' : 'good',
      icon: <Gauge size={18} />,
    },
  ];

  if (vpd30 !== null) {
    insights.push({
      title: 'VPD / tørketrykk',
      value: `${vpd30.toFixed(2)} kPa`,
      description: 'Vapour Pressure Deficit viser hvor sterkt luften trekker vann fra blader/jord. Høy VPD øker stress og vanningsbehov.',
      status: vpd30 > 2.2 ? 'warning' : vpd30 > 1.6 ? 'watch' : 'good',
      icon: <Wind size={18} />,
    });
  }

  if (soilMoistureDeep30 !== null) {
    insights.push({
      title: 'Modellert jordfukt 28–100 cm',
      value: soilMoistureDeep30.toFixed(3),
      description: 'Nyttig trendindikator for rotsonen, men må kalibreres mot lokale jordfuktsensorer på tomten.',
      status: soilMoistureDeep30 < 0.16 ? 'warning' : soilMoistureDeep30 < 0.22 ? 'watch' : 'good',
      icon: <BarChart3 size={18} />,
    });
  }

  if (sunshine30 !== null) {
    insights.push({
      title: 'Soltimer siste 30 dager',
      value: `${Math.round(sunshine30)} t`,
      description: 'Nyttig for modning, blomstring/fruktsetting og forventet fordamping.',
      status: 'good',
      icon: <Sun size={18} />,
    });
  }

  if (windGusts30.length) {
    insights.push({
      title: 'Vindkast siste 30 dager',
      value: `${windyDays30} dager`,
      description: 'Dager med vindkast over 45 km/t. Relevans: sprøyting, fordamping, gren-/fruktskade og brannrisiko.',
      status: windyDays30 > 5 ? 'warning' : windyDays30 > 1 ? 'watch' : 'good',
      icon: <Wind size={18} />,
    });
  }

  return insights;
}

function statusClass(status: Insight['status']): string {
  if (status === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (status === 'warning') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (status === 'watch') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-green-500/20 bg-green-500/10 text-green-400';
}

const ClimateDecisionStats: React.FC = () => {
  const [daily, setDaily] = useState<ClimateDaily | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const coords = getFarmCoords();

  const fetchClimate = async () => {
    setIsLoading(true);
    setError(null);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const start = `${today.getFullYear() - 1}-01-01`;
    const end = fmtDate(yesterday);

    const dailyParams = [
      'precipitation_sum',
      'rain_sum',
      'et0_fao_evapotranspiration',
      'temperature_2m_max',
      'temperature_2m_min',
      'temperature_2m_mean',
      'sunshine_duration',
      'shortwave_radiation_sum',
      'wind_gusts_10m_max',
      'wind_speed_10m_max',
      'relative_humidity_2m_mean',
      'vapor_pressure_deficit_max',
      'soil_moisture_0_to_7cm_mean',
      'soil_moisture_7_to_28cm_mean',
      'soil_moisture_28_to_100cm_mean',
      'soil_temperature_0_to_7cm_mean',
      'soil_temperature_7_to_28cm_mean',
      'soil_temperature_28_to_100cm_mean',
    ].join(',');

    try {
      const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${coords.lat}&longitude=${coords.lon}&elevation=${coords.elevation}&start_date=${start}&end_date=${end}&daily=${dailyParams}&timezone=auto&cell_selection=land`;
      const response = await fetch(url);
      const json = await response.json() as ClimateResponse;
      if (json.error || !json.daily) throw new Error(json.reason || 'Kunne ikke hente klimadata');
      setDaily(json.daily);
      setLastRefresh(new Date());
    } catch (err: any) {
      setError(err?.message || 'Nettverksfeil ved henting av klimadata');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClimate();
  }, []);

  const monthly = useMemo(() => daily ? buildMonthlyStats(daily) : [], [daily]);
  const insights = useMemo(() => daily ? buildInsights(daily) : [], [daily]);

  const totals = useMemo(() => {
    if (!daily) return null;
    const nowYear = String(new Date().getFullYear());
    const lastYear = String(new Date().getFullYear() - 1);
    let rainThis = 0;
    let rainLast = 0;
    let et0This = 0;
    let et0Last = 0;
    daily.time.forEach((date, index) => {
      if (date.startsWith(nowYear)) {
        rainThis += Number(daily.precipitation_sum[index] || 0);
        et0This += Number(daily.et0_fao_evapotranspiration[index] || 0);
      } else if (date.startsWith(lastYear)) {
        rainLast += Number(daily.precipitation_sum[index] || 0);
        et0Last += Number(daily.et0_fao_evapotranspiration[index] || 0);
      }
    });
    return {
      rainThis: Math.round(rainThis),
      rainLast: Math.round(rainLast),
      et0This: Math.round(et0This),
      et0Last: Math.round(et0Last),
      deficitThis: Math.round(et0This - rainThis),
      deficitLast: Math.round(et0Last - rainLast),
    };
  }, [daily]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <BarChart3 className="text-green-400" /> Klima og beslutningsstatistikk
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            DonaAnna · Biar {coords.elevation} moh. · {coords.lat.toFixed(4)}, {coords.lon.toFixed(4)} {lastRefresh && `· Oppdatert ${lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <button onClick={fetchClimate} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
        </button>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 border border-red-500/30 bg-red-500/10 text-red-300 flex items-center gap-3">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {!daily && !error && (
        <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3">
          <Loader2 size={20} className="animate-spin" /> Henter historiske klima- og værdata...
        </div>
      )}

      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-[2rem] p-6 border border-blue-500/20 bg-blue-500/5">
            <Droplets className="text-blue-400 mb-3" />
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Regn i år</p>
            <p className="text-4xl font-black text-white mt-2">{totals.rainThis} mm</p>
            <p className="text-xs text-slate-500 mt-2">I fjor i datasettet: {totals.rainLast} mm</p>
          </div>
          <div className="glass rounded-[2rem] p-6 border border-orange-500/20 bg-orange-500/5">
            <Sun className="text-orange-400 mb-3" />
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">ET₀ i år</p>
            <p className="text-4xl font-black text-white mt-2">{totals.et0This} mm</p>
            <p className="text-xs text-slate-500 mt-2">Referansefordamping. I fjor: {totals.et0Last} mm</p>
          </div>
          <div className="glass rounded-[2rem] p-6 border border-red-500/20 bg-red-500/5">
            {totals.deficitThis > totals.deficitLast ? <TrendingUp className="text-red-400 mb-3" /> : <TrendingDown className="text-green-400 mb-3" />}
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Klimatisk vannunderskudd</p>
            <p className="text-4xl font-black text-white mt-2">{totals.deficitThis} mm</p>
            <p className="text-xs text-slate-500 mt-2">ET₀ minus regn. I fjor: {totals.deficitLast} mm</p>
          </div>
        </div>
      )}

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {insights.map(insight => (
            <div key={insight.title} className={`glass rounded-[2rem] p-5 border ${statusClass(insight.status)}`}>
              <div className="flex items-center gap-3 mb-3">
                {insight.icon}
                <p className="text-[10px] uppercase font-bold tracking-widest">{insight.status === 'good' ? 'OK' : insight.status === 'watch' ? 'Følg med' : insight.status === 'warning' ? 'Viktig' : 'Kritisk'}</p>
              </div>
              <p className="text-sm text-white font-bold">{insight.title}</p>
              <p className="text-3xl text-white font-black mt-2">{insight.value}</p>
              <p className="text-xs text-slate-500 mt-3 leading-relaxed">{insight.description}</p>
            </div>
          ))}
        </div>
      )}

      {monthly.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={16} className="text-blue-400" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Regn per måned</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `${v}mm`} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="rainThisYear" name="I år" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rainLastYear" name="I fjor" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Sun size={16} className="text-orange-400" />
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">ET₀ og vannunderskudd</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => `${v}mm`} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                  <Legend />
                  <Bar dataKey="deficitThisYear" name="Underskudd i år" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line dataKey="deficitLastYear" name="Underskudd i fjor" stroke="#f59e0b" strokeWidth={2} dot={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="text-green-400 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">Hvordan skal tallene brukes?</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Bruk regn, ET₀, VPD, varme-/frostdager og modellert jordfukt som beslutningsstøtte. De er gode til trend, sammenligning og tidlig varsling, men lokale IoT-sensorer, jordprøver og feltobservasjoner bør være fasit for vanning, salt og helsetilstand på DonaAnna-tomten.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClimateDecisionStats;
