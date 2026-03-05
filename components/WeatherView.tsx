
import React, { useEffect, useState, useMemo } from 'react';
import {
  Sun, Wind, Droplets, MapPin, RefreshCcw, Waves, Zap, Loader2,
  Cloud, CloudRain, CloudLightning, Navigation, Thermometer,
  ChevronRight, CalendarDays, Clock, CloudSun, Brain, Locate,
  Layers, History, TrendingUp, AlertTriangle, Snowflake, TrendingDown,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid,
  BarChart, Bar, YAxis, Legend, ComposedChart, Line, ReferenceLine
} from 'recharts';
import { Parcel } from '../types';
import GlossaryText from './GlossaryText';

type WeatherTab = 'forecast' | 'history' | 'yearly';

const WeatherView: React.FC = () => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [yearlyHistoricalData, setYearlyHistoricalData] = useState<any[]>([]);
  const [climateNormals, setClimateNormals] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingYearlyHistory, setLoadingYearlyHistory] = useState(false);
  const [locationName, setLocationName] = useState('Biar, Spain');
  const [coords, setCoords] = useState<{lat: number, lon: number}>({ lat: 38.6294, lon: -0.7667 });
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>('default');
  const [activeWeatherTab, setActiveWeatherTab] = useState<WeatherTab>('forecast');

  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
        '&hourly=temperature_2m,precipitation,wind_speed_10m,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration' +
        '&timezone=auto'
      );
      const data = await res.json();

      const hourly = data.hourly.time.slice(0, 24).map((t: string, i: number) => ({
        time: new Date(t).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        temp: data.hourly.temperature_2m[i],
        rain: data.hourly.precipitation[i],
        wind: data.hourly.wind_speed_10m[i],
        code: data.hourly.weather_code[i]
      }));

      const daily = data.daily.time.map((t: string, i: number) => ({
        date: new Date(t).toLocaleDateString('no-NO', { weekday: 'short', day: 'numeric', month: 'short' }),
        maxTemp: data.daily.temperature_2m_max[i],
        minTemp: data.daily.temperature_2m_min[i],
        rainSum: data.daily.precipitation_sum[i],
        rainProb: data.daily.precipitation_probability_max[i],
        maxWind: data.daily.wind_speed_10m_max[i],
        evap: data.daily.et0_fao_evapotranspiration[i],
        code: data.daily.weather_code[i]
      }));

      setWeatherData({ current: data.current, hourly, daily });
    } catch (err) {
      console.error("Weather fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoricalWeather = async (lat: number, lon: number) => {
    setLoadingHistory(true);
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 89); // 90 days
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      const res = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
        `&start_date=${fmt(startDate)}&end_date=${fmt(endDate)}` +
        '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration' +
        '&timezone=auto'
      );
      const data = await res.json();

      if (data.daily) {
        const hist = data.daily.time.map((t: string, i: number) => ({
          date: new Date(t).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' }),
          dateRaw: t,
          maxTemp: data.daily.temperature_2m_max[i],
          minTemp: data.daily.temperature_2m_min[i],
          rain: data.daily.precipitation_sum[i] ?? 0,
          evap: data.daily.et0_fao_evapotranspiration[i] ?? 0
        }));
        setHistoricalData(hist);
      }
    } catch (err) {
      console.error("Historical weather error:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchYearlyHistoricalWeather = async (lat: number, lon: number) => {
    setLoadingYearlyHistory(true);
    try {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 1); // Yesterday
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 10); // 10 years ago
        const fmt = (d: Date) => d.toISOString().split('T')[0];

        const res = await fetch(
            `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
            `&start_date=${fmt(startDate)}&end_date=${fmt(endDate)}` +
            '&daily=precipitation_sum' +
            '&timezone=auto'
        );
        const data = await res.json();

        if (data.daily) {
            const last12MonthsData: any[] = [];
            const normals: Record<number, number[]> = {};
            for (let i = 0; i < 12; i++) normals[i] = [];

            const today = new Date();
            const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());

            data.daily.time.forEach((t: string, i: number) => {
                const date = new Date(t);
                const rain = data.daily.precipitation_sum[i] ?? 0;

                if (date >= oneYearAgo) {
                    last12MonthsData.push({ dateRaw: t, rain });
                }

                const month = date.getMonth();
                normals[month].push(rain);
            });

            const calculatedNormals = Object.keys(normals).map(monthKey => {
                const monthNum = parseInt(monthKey);
                const totalRain = (normals[monthNum] || []).reduce((sum, r) => sum + r, 0);
                const yearCount = Math.max(1, new Set(data.daily.time.map((t: string) => new Date(t).getFullYear())).size - 1); // Avoid dividing by zero
                return { month: monthNum, normal: totalRain / yearCount };
            });
            
            setClimateNormals(calculatedNormals);
            setYearlyHistoricalData(last12MonthsData);
        }
    } catch (err) {
        console.error("Yearly historical weather error:", err);
    } finally {
        setLoadingYearlyHistory(false);
    }
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
      const data = await res.json();
      if (data && data.address) {
        const city = data.address.city || data.address.town || data.address.village || data.address.municipality || 'Unknown';
        const country = data.address.country || '';
        return `${city}, ${country}`;
      }
    } catch (err) {
      console.error("Geocoding error:", err);
    }
    return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation støttes ikke av din nettleser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords = { lat: latitude, lon: longitude };
        setCoords(newCoords);
        setSelectedParcelId('geolocation');
        const name = await reverseGeocode(latitude, longitude);
        setLocationName(name);
        await fetchWeather(latitude, longitude);
        fetchHistoricalWeather(latitude, longitude);
        fetchYearlyHistoricalWeather(latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLoading(false);
        alert("Kunne ikke hente posisjon. Bruker standardlokasjon.");
        setSelectedParcelId('default');
        setCoords({ lat: 38.6294, lon: -0.7667 });
        setLocationName('Biar, Spain');
        fetchWeather(38.6294, -0.7667);
        fetchHistoricalWeather(38.6294, -0.7667);
        fetchYearlyHistoricalWeather(38.6294, -0.7667);
      }
    );
  };

  const handleParcelSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedParcelId(val);

    if (val === 'default') {
      const newCoords = { lat: 38.6294, lon: -0.7667 };
      setCoords(newCoords);
      setLocationName('Biar, Spain');
      await fetchWeather(newCoords.lat, newCoords.lon);
      fetchHistoricalWeather(newCoords.lat, newCoords.lon);
      fetchYearlyHistoricalWeather(newCoords.lat, newCoords.lon);
    } else if (val === 'geolocation') {
      handleGetLocation();
    } else {
      const parcel = parcels.find(p => p.id === val);
      if (parcel && parcel.coordinates && parcel.coordinates.length > 0) {
        const [lat, lon] = parcel.coordinates[0];
        const newCoords = { lat, lon };
        setCoords(newCoords);
        setLocationName(`Parsell: ${parcel.name}`);
        await fetchWeather(lat, lon);
        fetchHistoricalWeather(lat, lon);
        fetchYearlyHistoricalWeather(lat, lon);
      }
    }
  };

  useEffect(() => {
    const savedP = localStorage.getItem('olivia_parcels');
    if (savedP) setParcels(JSON.parse(savedP));

    fetchWeather(coords.lat, coords.lon);
    fetchHistoricalWeather(coords.lat, coords.lon);
    fetchYearlyHistoricalWeather(coords.lat, coords.lon);
  }, []);

  const getWeatherIcon = (code: number, size = 24) => {
    if (code === 0) return <Sun size={size} className="text-yellow-400" />;
    if (code <= 3) return <Cloud size={size} className="text-slate-400" />;
    if (code <= 67) return <CloudRain size={size} className="text-blue-400" />;
    if (code <= 99) return <CloudLightning size={size} className="text-purple-400" />;
    return <Sun size={size} className="text-yellow-400" />;
  };

  const generateAIAnalysis = (weather: any, location: string): string => {
    if (!weather) return "Laster AI analyse...";
  
    const insights = [];
  
    const todayEvap = weather.daily[0]?.evap;
    const avgEvap = weather.daily.slice(0, 3).reduce((sum: number, day: any) => sum + day.evap, 0) / 3;
    if (todayEvap > 4) {
      insights.push(`høy fordamping (ET0 på ${todayEvap.toFixed(1)}mm)`);
    } else if (avgEvap > 3.5) {
      insights.push(`moderat fordamping (ET0) de neste dagene`);
    }
  
    const optimalSprayTime = weather.hourly.find((h: any) => {
      const hour = parseInt(h.time.split(':')[0]);
      return h.wind < 10 && h.rain === 0 && hour > 4 && hour < 11;
    });
    if (optimalSprayTime) {
      insights.push(`optimale sprøyteforhold i morgen tidlig rundt kl. ${optimalSprayTime.time}`);
    } else {
        const nextBestTime = weather.hourly.find((h: any) => h.wind < 15 && h.rain === 0);
        if(nextBestTime) insights.push(`vindfulle forhold, men mulig sprøytevindu rundt kl. ${nextBestTime.time}`);
    }

    const hotDays = weather.daily.slice(0, 4).filter((d: any) => d.maxTemp > 30);
    if (hotDays.length >= 3) {
        const maxTemp = Math.max(...hotDays.map(d => d.maxTemp));
        insights.push(`en hetebølge med temperaturer opp mot ${maxTemp.toFixed(0)}°C er på vei, vurder tiltak for å redusere stress`);
    }

    const nextRainDay = weather.daily.find((d: any) => d.rainProb > 40);
    if (nextRainDay) {
        insights.push(`det er ${nextRainDay.rainProb}% sjanse for ${nextRainDay.rainSum}mm nedbør på ${nextRainDay.date.split(' ')[0]}`);
    }

    if (insights.length === 0) {
        return `Forholdene ved ${location} ser stabile ut. Ingen spesielle varsler for de kommende dagene.`
    }

    return `Lokale forhold ved ${location} indikerer ${insights.join(', ')}.`;
  }

  const monthlyChartData = useMemo(() => {
    if (!yearlyHistoricalData || yearlyHistoricalData.length === 0 || !climateNormals) return [];

    const monthly = yearlyHistoricalData.reduce((acc, day) => {
        const month = new Date(day.dateRaw).toLocaleString('no-NO', { month: 'short', year: '2-digit' });
        const monthDate = new Date(day.dateRaw.substring(0, 7) + '-01');
        if (!acc[month]) {
            acc[month] = { name: month, rain: 0, date: monthDate };
        }
        acc[month].rain += day.rain;
        return acc;
    }, {} as Record<string, { name: string; rain: number; date: Date }>);

    const sortedMonthly = Object.values(monthly).sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return sortedMonthly.map(m => {
      const monthIndex = m.date.getMonth();
      const normalData = climateNormals.find((n: any) => n.month === monthIndex);
      return {
        ...m,
        normal: normalData ? normalData.normal : 0
      };
    });
}, [yearlyHistoricalData, climateNormals]);

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-green-400" size={48} />
      <p className="text-slate-500 italic">Henter sanntids meteorologiske data...</p>
    </div>
  );

  const isSprayingSafe = weatherData.current.wind_speed_10m < 15;
  const aiAnalysisText = generateAIAnalysis(weatherData, locationName);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <CloudSun className="text-yellow-400" /> Meteorologisk Oversikt
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
            <MapPin size={14} /> {locationName} • Gårdskontroll
          </p>
          <div className="flex gap-3 mt-4 overflow-x-auto">
            <button
              onClick={() => setActiveWeatherTab('forecast')}
              className={`text-xs whitespace-nowrap font-bold uppercase tracking-widest pb-1.5 border-b-2 transition-all ${activeWeatherTab === 'forecast' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}
            >
              Prognose (7 dager)
            </button>
            <button
              onClick={() => setActiveWeatherTab('history')}
              className={`text-xs whitespace-nowrap font-bold uppercase tracking-widest pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${activeWeatherTab === 'history' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}
            >
              <History size={13} /> Nærhistorikk (90 dager)
            </button>
             <button
              onClick={() => setActiveWeatherTab('yearly')}
              className={`text-xs whitespace-nowrap font-bold uppercase tracking-widest pb-1.5 border-b-2 transition-all flex items-center gap-1.5 ${activeWeatherTab === 'yearly' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}
            >
              <CalendarDays size={13} /> Årsoversikt (Klima)
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
             <select 
               value={selectedParcelId}
               onChange={handleParcelSelect}
               className="w-full glass bg-black/40 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-white text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-green-500/50 appearance-none transition-all"
             >
               <option value="default">Standard (Biar, ES)</option>
               <option value="geolocation">Min posisjon (GPS)</option>
               {parcels.length > 0 && <optgroup label="Mine Parseller">
                 {parcels.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                 ))}
               </optgroup>}
             </select>
          </div>
          <button 
            onClick={() => fetchWeather(coords.lat, coords.lon)} 
            className="p-3.5 glass rounded-2xl hover:bg-white/10 transition-all border border-white/10 text-green-400"
            title="Oppdater vær"
          >
            <RefreshCcw size={18} />
          </button>
        </div>
      </div>

      {activeWeatherTab === 'yearly' && (
        <div className="space-y-8">
          {loadingYearlyHistory ? (
            <div className="flex items-center justify-center h-40 gap-3">
              <Loader2 className="animate-spin text-green-400" size={32} />
              <span className="text-slate-500">Henter 10-års klimadata...</span>
            </div>
          ) : monthlyChartData.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const totalRain = monthlyChartData.reduce((s, d) => s + (d.rain || 0), 0);
                  const totalNormal = monthlyChartData.reduce((s, d) => s + (d.normal || 0), 0);
                  const diff = totalNormal > 0 ? ((totalRain / totalNormal) - 1) * 100 : 0;
                  const diffColor = diff >= 0 ? 'text-blue-400' : 'text-orange-400';
                  return [
                    { label: 'Total nedbør (12 mnd)', value: `${totalRain.toFixed(0)} mm`, icon: <Droplets size={18} />, color: 'text-blue-400' },
                    { label: 'Avvik fra normal', value: `${diff.toFixed(0)}%`, icon: <BarChart2 size={18} />, color: diffColor },
                    { label: 'Normal nedbør (10-år)', value: `${totalNormal.toFixed(0)} mm`, icon: <History size={18} />, color: 'text-slate-500' },
                  ].map(s => (
                    <div key={s.label} className="glass rounded-[2rem] p-6 border border-white/10">
                      <div className={`${s.color} mb-2`}>{s.icon}</div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color} mt-1`}>{s.value}</p>
                    </div>
                  ));
                })()}
              </div>

              <div className="glass rounded-[2.5rem] p-8 border border-white/10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <CloudRain size={14} className="text-blue-400" /> Nedbør: Siste 12 mnd vs. Klimanormal
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} label={{ value: 'mm', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10, dy: 10 }} />
                      <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px', fontSize: '11px' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                      <Bar dataKey="rain" name="Siste 12 mnd" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="normal" name="Normal (10-år snitt)" fill="#475569" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500">Ingen 12-måneders data tilgjengelig.</div>
          )}
        </div>
      )}

      {activeWeatherTab === 'history' && (
        <div className="space-y-8">
          {loadingHistory ? (
            <div className="flex items-center justify-center h-40 gap-3">
              <Loader2 className="animate-spin text-green-400" size={32} />
              <span className="text-slate-500">Henter historiske data...</span>
            </div>
          ) : historicalData.length > 0 ? (
            <>
              {/* 90-day Rain Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(() => {
                  const totalRain = historicalData.reduce((s, d) => s + (d.rain || 0), 0);
                  const avgTemp = historicalData.reduce((s, d) => s + (d.maxTemp || 0), 0) / historicalData.length;
                  const maxRainDay = historicalData.reduce((a, b) => (b.rain > a.rain ? b : a), historicalData[0]);
                  const frostDays = historicalData.filter(d => d.minTemp < 0).length;
                  return [
                    { label: 'Total nedbør (90d)', value: `${totalRain.toFixed(0)} mm`, icon: <Droplets size={18} />, color: 'text-blue-400' },
                    { label: 'Snitt maks temp', value: `${avgTemp.toFixed(1)}°C`, icon: <Thermometer size={18} />, color: 'text-orange-400' },
                    { label: 'Mest nedbør', value: `${maxRainDay?.rain?.toFixed(1) || 0} mm (${maxRainDay?.date || '—'})`, icon: <CloudRain size={18} />, color: 'text-blue-300' },
                    { label: 'Frostdager', value: `${frostDays} dager`, icon: <Snowflake size={18} />, color: 'text-cyan-400' }
                  ].map(s => (
                    <div key={s.label} className="glass rounded-[2rem] p-6 border border-white/10">
                      <div className={`${s.color} mb-2`}>{s.icon}</div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{s.label}</p>
                      <p className={`text-lg font-bold ${s.color} mt-1`}>{s.value}</p>
                    </div>
                  ));
                })()}
              </div>

              <div className="glass rounded-[2.5rem] p-8 border border-white/10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <CloudRain size={14} className="text-blue-400" /> Nedbørshistorikk – Siste 90 dager
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historicalData} barSize={4}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} interval={13} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} label={{ value: 'mm', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 9, dy: 10 }} />
                      <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px', fontSize: '11px' }} />
                      <Bar dataKey="rain" fill="#3b82f6" name="Nedbør (mm)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass rounded-[2.5rem] p-8 border border-white/10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <Thermometer size={14} className="text-orange-400" /> Temperaturhistorikk – Siste 90 dager
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="histTempGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="histMinGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} interval={13} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px', fontSize: '11px' }} />
                      <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                      <Area type="monotone" dataKey="maxTemp" stroke="#f97316" fill="url(#histTempGrad)" strokeWidth={2} name="Maks temp (°C)" />
                      <Area type="monotone" dataKey="minTemp" stroke="#3b82f6" fill="url(#histMinGrad)" strokeWidth={1.5} name="Min temp (°C)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass rounded-[2.5rem] p-8 border border-white/10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <TrendingUp size={14} className="text-green-400" /> Vekstsummer (GDD) – Oliven grunntemp 10°C
                </h3>
                <p className="text-[10px] text-slate-600 mb-6">GDD = Σ (Maks+Min)/2 - 10°C per dag. Kritisk for blomstring og oljeutvikling.</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historicalData.reduce((acc: any[], d, i) => {
                      const gdd = Math.max(0, ((d.maxTemp + d.minTemp) / 2) - 10);
                      const cumGDD = i === 0 ? gdd : (acc[i - 1]?.cumGDD || 0) + gdd;
                      return [...acc, { ...d, cumGDD: Math.round(cumGDD) }];
                    }, [])}>
                      <defs>
                        <linearGradient id="gddGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} interval={13} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px', fontSize: '11px' }} formatter={(v: any) => [`${v} GDD`, 'Kumulativ GDD']} />
                      <Area type="monotone" dataKey="cumGDD" stroke="#22c55e" fill="url(#gddGrad)" strokeWidth={2} name="Kumulativ GDD" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500">Ingen historiske data tilgjengelig.</div>
          )}
        </div>
      )}

      {activeWeatherTab === 'forecast' && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="glass rounded-[2.5rem] p-10 border border-white/10 relative overflow-hidden bg-gradient-to-br from-white/5 to-transparent">
            <div className="flex flex-col md:flex-row justify-between items-start gap-10 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  {getWeatherIcon(weatherData.current.weather_code, 64)}
                  <p className="text-8xl font-bold text-white tracking-tighter">{Math.round(weatherData.current.temperature_2m)}°</p>
                </div>
                <p className="text-2xl text-slate-300 font-medium">{locationName}</p>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full md:w-auto">
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
                  <Wind size={24} className={`${isSprayingSafe ? 'text-green-400' : 'text-red-400'} mb-2`} />
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Vindstyrke</p>
                  <p className="text-xl font-bold text-white">{weatherData.current.wind_speed_10m} <span className="text-xs font-normal">km/t</span></p>
                </div>
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
                  <Droplets size={24} className="text-blue-400 mb-2" />
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Fuktighet</p>
                  <p className="text-xl font-bold text-white">{weatherData.current.relative_humidity_2m}%</p>
                </div>
                <div className="p-5 rounded-3xl bg-white/5 border border-white/10">
                  <Waves size={24} className="text-purple-400 mb-2" />
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Dagens ET0</p>
                  <p className="text-xl font-bold text-white">{weatherData.daily[0].evap} <span className="text-xs font-normal">mm</span></p>
                </div>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-white/10">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Clock size={14} /> Neste 24 timer
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                {weatherData.hourly.map((h: any, i: number) => (
                  <div key={i} className="flex flex-col items-center gap-3 min-w-[70px] p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-all">
                    <span className="text-[10px] text-slate-500 font-bold">{h.time}</span>
                    {getWeatherIcon(h.code, 20)}
                    <span className="text-sm font-bold text-white">{Math.round(h.temp)}°</span>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1 text-[9px] text-blue-400 font-bold">
                        <Droplets size={8} /> {h.rain}mm
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold">
                        <Navigation size={8} className="rotate-45" /> {Math.round(h.wind)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass rounded-[2.5rem] p-8 border border-white/10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2">
              <CalendarDays size={14} /> Temperaturtrend (7 dager)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weatherData.daily}>
                  <defs>
                    <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="maxTemp" stroke="#f97316" fill="url(#colorMax)" strokeWidth={3} name="Maks Temp" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-[2.5rem] p-8 border border-white/10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2">
              <CloudRain size={14} className="text-blue-400" /> Nedbørsprognose (7 dager)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weatherData.daily}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis 
                    yAxisId="left" 
                    stroke="#3b82f6" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    label={{ value: 'mm', angle: -90, position: 'insideLeft', fill: '#3b82f6', fontSize: 10, dy: 10 }} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false} 
                    label={{ value: '%', angle: 90, position: 'insideRight', fill: '#94a3b8', fontSize: 10, dy: -10 }} 
                  />
                  <Tooltip 
                    contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px' }} 
                    itemStyle={{ fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                  <Bar 
                    yAxisId="left" 
                    dataKey="rainSum" 
                    fill="#3b82f6" 
                    name="Mengde (mm)" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20} 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="rainProb" 
                    stroke="#94a3b8" 
                    name="Sannsynlighet (%)" 
                    strokeWidth={2} 
                    dot={{ r: 4, fill: '#94a3b8', strokeWidth: 0 }} 
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="glass rounded-[2.5rem] border border-white/10 overflow-hidden">
            <div className="p-6 bg-white/5 border-b border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <CalendarDays size={16} className="text-green-400" /> Utvidet Prognose
              </h3>
            </div>
            <div className="divide-y divide-white/5">
              {weatherData.daily.map((d: any, i: number) => (
                <div key={i} className="p-5 hover:bg-white/5 transition-all group">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-bold text-white group-hover:text-green-400 transition-colors w-20">{d.date}</span>
                    <div className="flex items-center gap-4">
                       <div className="flex flex-col items-center">
                         <span className="text-xs font-bold text-white">{Math.round(d.maxTemp)}°</span>
                         <span className="text-[10px] text-slate-500">{Math.round(d.minTemp)}°</span>
                       </div>
                       {getWeatherIcon(d.code, 24)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <Droplets size={12} className="text-blue-400" />
                      <span>{d.rainSum}mm ({d.rainProb}%)</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <Wind size={12} className="text-slate-400" />
                      <span>{d.maxWind}km/t</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                      <Waves size={12} className="text-purple-400" />
                      <span>{d.evap} ET0</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-[2.5rem] p-8 border border-green-500/20 bg-green-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
              <Zap size={64} className="text-green-400" />
            </div>
            <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Brain size={16} /> AI Mikroklima Analyse
            </h3>
            <p className="text-xs text-slate-300 italic leading-relaxed relative z-10">
              "<GlossaryText text={aiAnalysisText} />"
            </p>
            <button className="mt-6 flex items-center gap-2 text-[10px] font-bold text-green-400 uppercase tracking-widest group-hover:gap-3 transition-all">
              Se full rapport <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default WeatherView;
