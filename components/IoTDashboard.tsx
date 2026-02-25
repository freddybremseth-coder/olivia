
import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Plus, X, Wifi, WifiOff, Battery, BatteryLow, AlertTriangle,
  Thermometer, Droplets, FlaskConical, Leaf, MapPin, Edit3, Trash2,
  TrendingUp, TrendingDown, Minus, RefreshCcw, ChevronRight, Bell,
  CheckCircle2, Loader2, Settings2, BarChart3, Zap, Save
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { Sensor, Parcel } from '../types';

// Extended sensor type with history
interface SensorReading {
  time: string;
  value: number;
}

interface ExtendedSensor extends Sensor {
  history?: SensorReading[];
  minThreshold?: number;
  maxThreshold?: number;
  lastUpdated?: string;
}

const SENSOR_COLORS: Record<string, string> = {
  Moisture: '#3b82f6',
  Temperature: '#f97316',
  PH: '#a855f7',
  NPK: '#22c55e'
};

const SENSOR_ICONS: Record<string, React.ReactNode> = {
  Moisture: <Droplets size={20} />,
  Temperature: <Thermometer size={20} />,
  PH: <FlaskConical size={20} />,
  NPK: <Leaf size={20} />
};

const SENSOR_RANGES: Record<string, { min: number; max: number; unit: string; optMin: number; optMax: number }> = {
  Moisture: { min: 0, max: 100, unit: '%', optMin: 40, optMax: 70 },
  Temperature: { min: 0, max: 50, unit: '°C', optMin: 18, optMax: 32 },
  PH: { min: 4.0, max: 9.0, unit: 'pH', optMin: 6.0, optMax: 7.5 },
  NPK: { min: 0, max: 500, unit: 'mg/kg', optMin: 100, optMax: 300 }
};

function generateHistory(baseValue: number, count = 24): SensorReading[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const t = new Date(now.getTime() - (count - i) * 3600 * 1000);
    const noise = (Math.random() - 0.5) * baseValue * 0.12;
    return {
      time: t.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
      value: Math.round((baseValue + noise) * 10) / 10
    };
  });
}

function getSensorStatus(sensor: ExtendedSensor): 'optimal' | 'warning' | 'critical' {
  const val = parseFloat(sensor.value);
  const range = SENSOR_RANGES[sensor.type];
  if (!range) return 'optimal';
  if (val >= range.optMin && val <= range.optMax) return 'optimal';
  const margin = (range.max - range.min) * 0.15;
  if (val >= range.optMin - margin && val <= range.optMax + margin) return 'warning';
  return 'critical';
}

const DEFAULT_SENSORS: ExtendedSensor[] = [
  { id: 's1', name: 'Sone A - Fuktighet', type: 'Moisture', value: '58', unit: '%', parcelId: '', status: 'Online', lastUpdated: '2 min siden' },
  { id: 's2', name: 'Sone A - Temperatur', type: 'Temperature', value: '24', unit: '°C', parcelId: '', status: 'Online', lastUpdated: '2 min siden' },
  { id: 's3', name: 'Sone B - pH', type: 'PH', value: '6.8', unit: 'pH', parcelId: '', status: 'Online', lastUpdated: '5 min siden' },
  { id: 's4', name: 'Sone B - NPK', type: 'NPK', value: '185', unit: 'mg/kg', parcelId: '', status: 'Low Battery', lastUpdated: '15 min siden' },
  { id: 's5', name: 'Sone C - Fuktighet', type: 'Moisture', value: '31', unit: '%', parcelId: '', status: 'Online', lastUpdated: '3 min siden' },
  { id: 's6', name: 'Sone C - pH', type: 'PH', value: '5.2', unit: 'pH', parcelId: '', status: 'Offline', lastUpdated: '2 t siden' },
];

const IoTDashboard: React.FC = () => {
  const [sensors, setSensors] = useState<ExtendedSensor[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<ExtendedSensor | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newSensor, setNewSensor] = useState<Partial<ExtendedSensor>>({
    type: 'Moisture', status: 'Online', unit: '%'
  });
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = () => {
    const savedSensors = localStorage.getItem('olivia_sensors');
    const savedParcels = localStorage.getItem('olivia_parcels');
    if (savedParcels) setParcels(JSON.parse(savedParcels));

    let loadedSensors: ExtendedSensor[];
    if (savedSensors) {
      loadedSensors = JSON.parse(savedSensors);
    } else {
      loadedSensors = DEFAULT_SENSORS;
      localStorage.setItem('olivia_sensors', JSON.stringify(DEFAULT_SENSORS));
    }

    // Attach simulated history
    loadedSensors = loadedSensors.map(s => ({
      ...s,
      history: generateHistory(parseFloat(s.value))
    }));
    setSensors(loadedSensors);
  };

  const simulateUpdate = () => {
    setSensors(prev => prev.map(s => {
      if (s.status === 'Offline') return s;
      const base = parseFloat(s.value);
      const noise = (Math.random() - 0.5) * base * 0.04;
      const newVal = Math.round((base + noise) * 10) / 10;
      const range = SENSOR_RANGES[s.type];
      const clamped = Math.min(range.max, Math.max(range.min, newVal));
      const newReading: SensorReading = {
        time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        value: clamped
      };
      return {
        ...s,
        value: clamped.toString(),
        lastUpdated: 'Akkurat nå',
        history: [...(s.history || []).slice(-23), newReading]
      };
    }));
    setLastRefresh(new Date());
  };

  useEffect(() => {
    loadData();
    autoRefreshRef.current = setInterval(simulateUpdate, 30000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    simulateUpdate();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleAddSensor = () => {
    if (!newSensor.name) return;
    const range = SENSOR_RANGES[newSensor.type || 'Moisture'];
    const defaultVal = ((range.optMin + range.optMax) / 2).toString();
    const sensor: ExtendedSensor = {
      id: 'S' + Date.now(),
      name: newSensor.name || 'Ny sensor',
      type: newSensor.type as any || 'Moisture',
      value: defaultVal,
      unit: range.unit,
      parcelId: newSensor.parcelId || '',
      status: 'Online',
      lastUpdated: 'Akkurat nå',
      history: generateHistory(parseFloat(defaultVal))
    };
    const updated = [...sensors, sensor];
    setSensors(updated);
    const toSave = updated.map(({ history, ...s }) => s);
    localStorage.setItem('olivia_sensors', JSON.stringify(toSave));
    setIsAddModalOpen(false);
    setNewSensor({ type: 'Moisture', status: 'Online', unit: '%' });
  };

  const handleDeleteSensor = (id: string) => {
    if (!confirm('Slette denne sensoren?')) return;
    const updated = sensors.filter(s => s.id !== id);
    setSensors(updated);
    const toSave = updated.map(({ history, ...s }) => s);
    localStorage.setItem('olivia_sensors', JSON.stringify(toSave));
    if (selectedSensor?.id === id) setSelectedSensor(null);
  };

  const onlineSensors = sensors.filter(s => s.status === 'Online').length;
  const warningSensors = sensors.filter(s => getSensorStatus(s) === 'warning').length;
  const criticalSensors = sensors.filter(s => getSensorStatus(s) === 'critical').length;
  const offlineSensors = sensors.filter(s => s.status === 'Offline').length;

  const statusColor = (st: 'optimal' | 'warning' | 'critical') => {
    if (st === 'optimal') return 'text-green-400';
    if (st === 'warning') return 'text-yellow-400';
    return 'text-red-400';
  };

  const statusBg = (st: 'optimal' | 'warning' | 'critical') => {
    if (st === 'optimal') return 'border-green-500/20 bg-green-500/5';
    if (st === 'warning') return 'border-yellow-500/30 bg-yellow-500/5';
    return 'border-red-500/30 bg-red-500/5';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Activity className="text-green-400" /> IoT Sensorkontroll
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Sanntidsovervåkning · {sensors.length} Sensorer · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all"
          >
            <RefreshCcw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"
          >
            <Plus size={20} /> Legg til sensor
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tilkoblet', value: onlineSensors, icon: <Wifi size={20} />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Kritisk', value: criticalSensors, icon: <AlertTriangle size={20} />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Advarsel', value: warningSensors, icon: <Bell size={20} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Offline', value: offlineSensors, icon: <WifiOff size={20} />, color: 'text-slate-400', bg: 'bg-white/5 border-white/10' }
        ].map(s => (
          <div key={s.label} className={`glass rounded-[2rem] p-6 border ${s.bg}`}>
            <div className={`${s.color} mb-2`}>{s.icon}</div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{s.label}</p>
            <p className={`text-4xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sensor Grid */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aktive Sensorer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sensors.map(sensor => {
              const st = sensor.status === 'Offline' ? 'critical' : getSensorStatus(sensor);
              const range = SENSOR_RANGES[sensor.type];
              const val = parseFloat(sensor.value);
              const pct = range ? ((val - range.min) / (range.max - range.min)) * 100 : 50;
              const color = SENSOR_COLORS[sensor.type] || '#22c55e';
              const isSelected = selectedSensor?.id === sensor.id;
              const parcel = parcels.find(p => p.id === sensor.parcelId);

              return (
                <div
                  key={sensor.id}
                  onClick={() => setSelectedSensor(isSelected ? null : sensor)}
                  className={`glass rounded-[2rem] p-6 border cursor-pointer transition-all hover:scale-[1.01] ${isSelected ? 'border-green-500/50 bg-green-500/5' : statusBg(st)}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl" style={{ background: color + '18', color }}>
                        {SENSOR_ICONS[sensor.type]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{sensor.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                          {sensor.type} {parcel ? `· ${parcel.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {sensor.status === 'Low Battery' && <BatteryLow size={14} className="text-yellow-400" />}
                      {sensor.status === 'Online' && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                      {sensor.status === 'Offline' && <WifiOff size={14} className="text-red-400" />}
                      <span className={`text-[9px] font-bold uppercase tracking-widest ${sensor.status === 'Online' ? 'text-green-400' : sensor.status === 'Offline' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {sensor.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-4xl font-bold text-white">{sensor.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sensor.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-bold uppercase ${statusColor(st)}`}>
                        {st === 'optimal' ? '✓ Optimalt' : st === 'warning' ? '⚠ Advarsel' : '✗ Kritisk'}
                      </p>
                      {range && (
                        <p className="text-[9px] text-slate-600 mt-0.5">
                          Opt: {range.optMin}–{range.optMax} {range.unit}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: st === 'optimal' ? color : st === 'warning' ? '#f59e0b' : '#ef4444' }}
                    />
                  </div>

                  {/* Mini sparkline */}
                  {sensor.history && sensor.history.length > 0 && (
                    <div className="h-10 mt-3 opacity-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sensor.history.slice(-12)}>
                          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                    <span className="text-[9px] text-slate-600">{sensor.lastUpdated}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteSensor(sensor.id); }}
                      className="p-1 text-slate-700 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-5 space-y-6">
          {selectedSensor ? (
            <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6 animate-in slide-in-from-right-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-lg">{selectedSensor.name}</h3>
                <button onClick={() => setSelectedSensor(null)} className="text-slate-500 hover:text-white p-1"><X size={20} /></button>
              </div>

              {/* 24h Chart */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">24-timers historikk</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={selectedSensor.history}>
                      <defs>
                        <linearGradient id={`grad-${selectedSensor.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={SENSOR_COLORS[selectedSensor.type]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={SENSOR_COLORS[selectedSensor.type]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} interval={3} />
                      <YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px', fontSize: '11px' }} />
                      {SENSOR_RANGES[selectedSensor.type] && (
                        <>
                          <ReferenceLine y={SENSOR_RANGES[selectedSensor.type].optMin} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} />
                          <ReferenceLine y={SENSOR_RANGES[selectedSensor.type].optMax} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} />
                        </>
                      )}
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={SENSOR_COLORS[selectedSensor.type]}
                        fill={`url(#grad-${selectedSensor.id})`}
                        strokeWidth={2}
                        name={selectedSensor.unit}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[9px] text-slate-600 text-center mt-1">Grønne stipler = Optimalt område</p>
              </div>

              {/* Sensor Details */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Nåværende', value: `${selectedSensor.value} ${selectedSensor.unit}` },
                  { label: 'Status', value: selectedSensor.status },
                  { label: 'Type', value: selectedSensor.type },
                  { label: 'Sist oppdatert', value: selectedSensor.lastUpdated || '—' }
                ].map(d => (
                  <div key={d.label} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{d.label}</p>
                    <p className="text-sm font-bold text-white mt-1">{d.value}</p>
                  </div>
                ))}
              </div>

              {/* Optimal Range Info */}
              {SENSOR_RANGES[selectedSensor.type] && (
                <div className="p-5 bg-green-500/5 rounded-2xl border border-green-500/20">
                  <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-3">Optimal Rekkevidde (Oliven)</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[9px] text-slate-500">Min</p>
                      <p className="text-sm font-bold text-white">{SENSOR_RANGES[selectedSensor.type].min}</p>
                    </div>
                    <div className="border-x border-white/10">
                      <p className="text-[9px] text-green-400">Optimalt</p>
                      <p className="text-sm font-bold text-green-400">{SENSOR_RANGES[selectedSensor.type].optMin}–{SENSOR_RANGES[selectedSensor.type].optMax}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500">Maks</p>
                      <p className="text-sm font-bold text-white">{SENSOR_RANGES[selectedSensor.type].max}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Sensorguide – Oliven</h3>
              <div className="space-y-4">
                {[
                  { type: 'Moisture', icon: <Droplets size={16} />, title: 'Jordfuktighet', desc: 'Optimal 40–70%. Under 35% gir stress, over 75% rotråte-risiko. Reduser vanning 6 uker før høst.' },
                  { type: 'PH', icon: <FlaskConical size={16} />, title: 'Jordsyre (pH)', desc: 'Oliven trives ved pH 6.0–7.5. Kalktilskudd ved pH < 5.8. Svovel ved pH > 7.8.' },
                  { type: 'Temperature', icon: <Thermometer size={16} />, title: 'Jordtemperatur', desc: 'Optimal rotaktivitet 18–32°C. Under 10°C stopper næringsopptak. Over 38°C skader røtter.' },
                  { type: 'NPK', icon: <Leaf size={16} />, title: 'Næringsstoffer', desc: 'N: 100–200 mg/kg. P: 50–150 mg/kg. K: 150–300 mg/kg. Gjødsle etter blomstring og etter høst.' }
                ].map(g => (
                  <div key={g.type} className="flex gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="p-2 rounded-xl shrink-0" style={{ background: SENSOR_COLORS[g.type] + '18', color: SENSOR_COLORS[g.type] }}>
                      {g.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{g.title}</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{g.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts Panel */}
          {(criticalSensors > 0 || warningSensors > 0) && (
            <div className="glass rounded-[2.5rem] p-6 border border-red-500/20 bg-red-500/5 space-y-3">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={14} /> Aktive Varsler ({criticalSensors + warningSensors})
              </h3>
              {sensors
                .filter(s => getSensorStatus(s) !== 'optimal' || s.status === 'Offline')
                .map(s => {
                  const st = s.status === 'Offline' ? 'critical' : getSensorStatus(s);
                  return (
                    <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border ${st === 'critical' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}>
                      <div>
                        <p className="text-xs font-bold text-white">{s.name}</p>
                        <p className={`text-[9px] font-bold ${st === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {s.status === 'Offline' ? 'Ingen tilkobling' : `${s.value}${s.unit} – ${st === 'critical' ? 'Kritisk utenfor rekkevidde' : 'Utenfor optimalt område'}`}
                        </p>
                      </div>
                      <AlertTriangle size={16} className={st === 'critical' ? 'text-red-400' : 'text-yellow-400'} />
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Add Sensor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-[2.5rem] p-10 border border-white/20 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">Legg til sensor</h3>
                <p className="text-xs text-slate-500 mt-1">Konfigurer IoT-sensor</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-500"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sensornavn</label>
                <input
                  type="text"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none"
                  placeholder="Eks: Sone A - Fuktighet"
                  value={newSensor.name || ''}
                  onChange={e => setNewSensor({ ...newSensor, name: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label>
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none"
                  value={newSensor.type}
                  onChange={e => {
                    const t = e.target.value as 'Moisture' | 'Temperature' | 'NPK' | 'PH';
                    setNewSensor({ ...newSensor, type: t, unit: SENSOR_RANGES[t].unit });
                  }}
                >
                  <option value="Moisture">Jordfuktighet</option>
                  <option value="Temperature">Temperatur</option>
                  <option value="PH">pH</option>
                  <option value="NPK">NPK (Næringsstoffer)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Parsell (valgfritt)</label>
                <select
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none"
                  value={newSensor.parcelId || ''}
                  onChange={e => setNewSensor({ ...newSensor, parcelId: e.target.value })}
                >
                  <option value="">Ingen parsell</option>
                  {parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleAddSensor}
              className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all"
            >
              Legg til sensor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IoTDashboard;
