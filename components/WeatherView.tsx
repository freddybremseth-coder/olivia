
import React, { useEffect, useState } from 'react';
import { 
  Sun, Wind, Droplets, MapPin, RefreshCcw, Waves, Zap, Loader2, 
  Cloud, CloudRain, CloudLightning, Navigation, Thermometer, 
  ChevronRight, CalendarDays, Clock, CloudSun, Brain, Locate,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid, 
  BarChart, Bar, YAxis, Legend, ComposedChart, Line 
} from 'recharts';
import { Parcel } from '../types';
import GlossaryText from './GlossaryText';

const WeatherView: React.FC = () => {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState('Biar, Spain');
  const [coords, setCoords] = useState<{lat: number, lon: number}>({ lat: 38.6294, lon: -0.7667 });
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>('default');

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
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLoading(false);
        alert("Kunne ikke hente posisjon. Bruker standardlokasjon.");
        setSelectedParcelId('default');
        setCoords({ lat: 38.6294, lon: -0.7667 });
        setLocationName('Biar, Spain');
        fetchWeather(38.6294, -0.7667);
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
      }
    }
  };

  useEffect(() => {
    const savedP = localStorage.getItem('olivia_parcels');
    if (savedP) setParcels(JSON.parse(savedP));
    
    fetchWeather(coords.lat, coords.lon);
  }, []);

  const getWeatherIcon = (code: number, size = 24) => {
    if (code === 0) return <Sun size={size} className="text-yellow-400" />;
    if (code <= 3) return <Cloud size={size} className="text-slate-400" />;
    if (code <= 67) return <CloudRain size={size} className="text-blue-400" />;
    if (code <= 99) return <CloudLightning size={size} className="text-purple-400" />;
    return <Sun size={size} className="text-yellow-400" />;
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-green-400" size={48} />
      <p className="text-slate-500 italic">Henter sanntids meteorologiske data...</p>
    </div>
  );

  const isSprayingSafe = weatherData.current.wind_speed_10m < 15;

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

          {/* New Precipitation Section */}
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
              "<GlossaryText text={`Lokale forhold ved ${locationName} indikerer økt fordamping (ET0) de neste dagene. Optimale sprøyteforhold er i morgen tidlig før kl. 09:00. Hold øye med polyfenol-nivået hvis varmen vedvarer.`} />"
            </p>
            <button className="mt-6 flex items-center gap-2 text-[10px] font-bold text-green-400 uppercase tracking-widest group-hover:gap-3 transition-all">
              Se full rapport <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherView;
