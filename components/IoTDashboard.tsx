import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryLow,
  Bell,
  Droplets,
  FlaskConical,
  Gauge,
  Leaf,
  Plus,
  RefreshCcw,
  Thermometer,
  Trash2,
  Waves,
  Wifi,
  WifiOff,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Parcel, Sensor, SensorType } from '../types';
import { DONA_ANNA_BIAR_SEASON_SETTINGS } from '../types/farmIoT';
import type { SensorAlert, SensorDevice, SensorReading as FarmSensorReading } from '../types/farmIoT';
import {
  buildDonaAnnaDecisionAdvice,
  fetchLatestSensorReadings,
  fetchOpenSensorAlerts,
  fetchSensorDevices,
  insertSensorReading,
  upsertSensorDevice,
  type FarmDecisionAdvice,
} from '../services/farmIoT';

interface SensorReadingPoint {
  time: string;
  value: number;
}

interface ExtendedSensor extends Sensor {
  history?: SensorReadingPoint[];
  minThreshold?: number;
  maxThreshold?: number;
  lastUpdated?: string;
}

type SensorRange = {
  label: string;
  unit: string;
  min: number;
  max: number;
  optMin: number;
  optMax: number;
  description: string;
};

const LEGACY_TYPE_MAP: Partial<Record<SensorType, SensorType>> = {
  Moisture: 'soil_moisture',
  Temperature: 'soil_temperature',
  PH: 'soil_ph',
  NPK: 'soil_ec',
};

const normalizeSensorType = (type: SensorType): SensorType => LEGACY_TYPE_MAP[type] || type;

const SENSOR_RANGES: Record<string, SensorRange> = {
  soil_moisture: { label: 'Jordfuktighet', unit: '%', min: 0, max: 100, optMin: 35, optMax: 65, description: 'Viktigste styringsverdi for vanning. Må tolkes etter jordtype, dybde og alder på trærne.' },
  soil_temperature: { label: 'Jordtemperatur', unit: '°C', min: 0, max: 50, optMin: 16, optMax: 30, description: 'Påvirker rotaktivitet, næringsopptak og vannrespons.' },
  soil_ec: { label: 'Jord EC / salt', unit: 'dS/m', min: 0, max: 8, optMin: 0.4, optMax: 2.0, description: 'Brukes til å følge saltoppbygging i jorden, spesielt ved dryppvanning.' },
  soil_ph: { label: 'Jord pH', unit: 'pH', min: 4, max: 9, optMin: 6, optMax: 7.8, description: 'Oliven tåler en del variasjon, men pH påvirker næringstilgang og jordhelse.' },
  water_ec: { label: 'Vann EC / salt', unit: 'dS/m', min: 0, max: 6, optMin: 0.2, optMax: 1.5, description: 'Kontrollerer saltnivå i vanningsvannet før det bygger seg opp i jorden.' },
  water_ph: { label: 'Vann pH', unit: 'pH', min: 4, max: 9, optMin: 6, optMax: 7.8, description: 'Viktig for vannkvalitet, gjødsling og langsiktig jordbalanse.' },
  flow: { label: 'Flow', unit: 'L/min', min: 0, max: 200, optMin: 10, optMax: 120, description: 'Viser om vann faktisk går ut i vanningssektoren.' },
  pressure: { label: 'Trykk', unit: 'bar', min: 0, max: 8, optMin: 1, optMax: 3.5, description: 'Avslører lekkasjer, tette dryppslanger eller pumpeproblemer.' },
  rain: { label: 'Regn', unit: 'mm', min: 0, max: 100, optMin: 0, optMax: 25, description: 'Brukes sammen med jordfuktighet for å justere vanning.' },
  air_temperature: { label: 'Lufttemperatur', unit: '°C', min: -10, max: 50, optMin: 12, optMax: 34, description: 'Viktig for tørkestress, frostfare, blomstring og modning.' },
  air_humidity: { label: 'Luftfuktighet', unit: '%', min: 0, max: 100, optMin: 35, optMax: 75, description: 'Brukes med temperatur og bladfukt for sykdomsrisiko.' },
  leaf_wetness: { label: 'Bladfukt', unit: '%', min: 0, max: 100, optMin: 0, optMax: 40, description: 'Høy bladfukt over tid kan indikere økt sykdomsrisiko.' },
  battery: { label: 'Batteri', unit: '%', min: 0, max: 100, optMin: 30, optMax: 100, description: 'Brukes til drift og vedlikehold av sensorer.' },
};

const SENSOR_COLORS: Record<string, string> = {
  soil_moisture: '#3b82f6',
  soil_temperature: '#f97316',
  soil_ec: '#a855f7',
  soil_ph: '#22c55e',
  water_ec: '#06b6d4',
  water_ph: '#14b8a6',
  flow: '#0ea5e9',
  pressure: '#f59e0b',
  rain: '#60a5fa',
  air_temperature: '#ef4444',
  air_humidity: '#38bdf8',
  leaf_wetness: '#84cc16',
  battery: '#eab308',
};

const SENSOR_ICONS: Record<string, React.ReactNode> = {
  soil_moisture: <Droplets size={20} />,
  soil_temperature: <Thermometer size={20} />,
  soil_ec: <Zap size={20} />,
  soil_ph: <FlaskConical size={20} />,
  water_ec: <Waves size={20} />,
  water_ph: <FlaskConical size={20} />,
  flow: <Wind size={20} />,
  pressure: <Gauge size={20} />,
  rain: <Droplets size={20} />,
  air_temperature: <Thermometer size={20} />,
  air_humidity: <Waves size={20} />,
  leaf_wetness: <Leaf size={20} />,
  battery: <BatteryLow size={20} />,
};

const SENSOR_TYPE_OPTIONS: SensorType[] = ['soil_moisture', 'soil_temperature', 'soil_ec', 'soil_ph', 'water_ec', 'water_ph', 'flow', 'pressure', 'rain', 'air_temperature', 'air_humidity', 'leaf_wetness', 'battery'];

const defaultValueForType = (type: SensorType): string => {
  const range = SENSOR_RANGES[normalizeSensorType(type)];
  if (!range) return '0';
  return String(Math.round(((range.optMin + range.optMax) / 2) * 10) / 10);
};

function generateHistory(baseValue: number, count = 24): SensorReadingPoint[] {
  const now = new Date();
  const safeBase = Number.isFinite(baseValue) ? baseValue : 1;
  return Array.from({ length: count }, (_, i) => {
    const t = new Date(now.getTime() - (count - i) * 3600 * 1000);
    const noise = (Math.random() - 0.5) * Math.max(Math.abs(safeBase), 1) * 0.12;
    return { time: t.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }), value: Math.round((safeBase + noise) * 10) / 10 };
  });
}

function getSensorStatus(sensor: ExtendedSensor): 'optimal' | 'warning' | 'critical' {
  if (sensor.status === 'Offline') return 'critical';
  if (typeof sensor.battery_percent === 'number' && sensor.battery_percent < 15) return 'critical';
  if (typeof sensor.battery_percent === 'number' && sensor.battery_percent < 30) return 'warning';
  const val = parseFloat(sensor.value);
  const range = SENSOR_RANGES[normalizeSensorType(sensor.type)];
  if (!range || !Number.isFinite(val)) return 'warning';
  if (val >= range.optMin && val <= range.optMax) return 'optimal';
  const margin = (range.max - range.min) * 0.12;
  if (val >= range.optMin - margin && val <= range.optMax + margin) return 'warning';
  return 'critical';
}

const DEFAULT_SENSORS: ExtendedSensor[] = [
  { id: 's1', sensor_id: 'DA-BIAR-SOIL-M-30-A', name: 'Sone A - Jordfukt 30 cm', type: 'soil_moisture', value: '42', unit: '%', parcelId: '', parcel_id: '', zone_id: 'zone-a', tree_group: 'Unge Gordal', depth_cm: 30, status: 'Online', battery_percent: 88, signal_rssi: -76, source: 'simulation', calibrated_at: '2026-05-01T08:00:00Z', measured_at: new Date().toISOString(), lastUpdated: '2 min siden' },
  { id: 's2', sensor_id: 'DA-BIAR-SOIL-T-30-A', name: 'Sone A - Jordtemp 30 cm', type: 'soil_temperature', value: '21', unit: '°C', parcelId: '', parcel_id: '', zone_id: 'zone-a', tree_group: 'Unge Gordal', depth_cm: 30, status: 'Online', battery_percent: 91, signal_rssi: -72, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: '2 min siden' },
  { id: 's3', sensor_id: 'DA-BIAR-SOIL-EC-B', name: 'Sone B - Jord EC / salt', type: 'soil_ec', value: '2.3', unit: 'dS/m', parcelId: '', parcel_id: '', zone_id: 'zone-b', tree_group: 'Eldre blanding', depth_cm: 40, status: 'Online', battery_percent: 74, signal_rssi: -81, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: '5 min siden' },
  { id: 's4', sensor_id: 'DA-BIAR-WATER-EC', name: 'Vanningsvann - EC', type: 'water_ec', value: '1.2', unit: 'dS/m', parcelId: '', parcel_id: '', zone_id: 'pump-house', status: 'Online', battery_percent: 100, signal_rssi: -60, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: '8 min siden' },
  { id: 's5', sensor_id: 'DA-BIAR-FLOW-A', name: 'Sektor A - Flow', type: 'flow', value: '28', unit: 'L/min', parcelId: '', parcel_id: '', zone_id: 'zone-a', status: 'Online', battery_percent: 65, signal_rssi: -79, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: '1 min siden' },
  { id: 's6', sensor_id: 'DA-BIAR-PRESSURE-A', name: 'Sektor A - Trykk', type: 'pressure', value: '0.6', unit: 'bar', parcelId: '', parcel_id: '', zone_id: 'zone-a', status: 'Online', battery_percent: 22, signal_rssi: -84, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: '1 min siden' },
];

const migrateLegacySensor = (sensor: ExtendedSensor): ExtendedSensor => {
  const normalizedType = normalizeSensorType(sensor.type);
  const range = SENSOR_RANGES[normalizedType];
  return { ...sensor, type: normalizedType, sensor_id: sensor.sensor_id || sensor.id, parcel_id: sensor.parcel_id || sensor.parcelId, unit: sensor.unit || range?.unit || '', source: sensor.source || 'simulation', measured_at: sensor.measured_at || new Date().toISOString() };
};

const buildHistoryFromReadings = (readings: FarmSensorReading[]): SensorReadingPoint[] => readings
  .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
  .slice(-24)
  .map(reading => ({ time: new Date(reading.measured_at).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }), value: Number(reading.value) }));

const buildSensorsFromSupabase = (devices: SensorDevice[], readings: FarmSensorReading[]): ExtendedSensor[] => {
  const readingsBySensor = readings.reduce<Record<string, FarmSensorReading[]>>((acc, reading) => {
    acc[reading.sensor_id] = [...(acc[reading.sensor_id] || []), reading];
    return acc;
  }, {});

  return devices.map(device => {
    const deviceReadings = readingsBySensor[device.sensor_id] || [];
    const latest = [...deviceReadings].sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
    const value = latest?.value ?? 0;
    return {
      id: device.id,
      sensor_id: device.sensor_id,
      name: device.name,
      type: normalizeSensorType(device.type),
      value: String(value),
      unit: latest?.unit || device.unit,
      parcelId: device.parcel_id || '',
      parcel_id: device.parcel_id || '',
      zone_id: device.zone_id || '',
      tree_group: latest?.tree_group || device.tree_group || '',
      depth_cm: latest?.depth_cm ?? device.depth_cm,
      battery_percent: latest?.battery_percent ?? device.battery_percent,
      signal_rssi: latest?.signal_rssi ?? device.signal_rssi,
      calibrated_at: latest?.calibrated_at || device.calibrated_at,
      measured_at: latest?.measured_at || device.last_seen_at || device.installed_at || new Date().toISOString(),
      source: latest?.source || device.source,
      status: device.status,
      lastUpdated: latest?.measured_at ? new Date(latest.measured_at).toLocaleString('no-NO') : 'Ingen målinger',
      history: deviceReadings.length > 0 ? buildHistoryFromReadings(deviceReadings) : generateHistory(Number(value)),
    };
  });
};

const adviceFromLocalSensors = (sensors: ExtendedSensor[]): FarmDecisionAdvice => buildDonaAnnaDecisionAdvice(sensors.map(sensor => ({
  id: sensor.id,
  sensor_id: sensor.sensor_id || sensor.id,
  parcel_id: sensor.parcel_id,
  zone_id: sensor.zone_id,
  tree_group: sensor.tree_group,
  depth_cm: sensor.depth_cm,
  type: normalizeSensorType(sensor.type),
  value: Number(sensor.value),
  unit: sensor.unit,
  battery_percent: sensor.battery_percent,
  signal_rssi: sensor.signal_rssi,
  calibrated_at: sensor.calibrated_at,
  measured_at: sensor.measured_at || new Date().toISOString(),
  received_at: sensor.measured_at || new Date().toISOString(),
  source: sensor.source,
  quality_score: 0.75,
})) as FarmSensorReading[]);

const IoTDashboard: React.FC = () => {
  const [sensors, setSensors] = useState<ExtendedSensor[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<ExtendedSensor | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [decisionAdvice, setDecisionAdvice] = useState<FarmDecisionAdvice | null>(null);
  const [openAlerts, setOpenAlerts] = useState<SensorAlert[]>([]);
  const [dataSource, setDataSource] = useState<'supabase' | 'local_demo'>('local_demo');
  const [newSensor, setNewSensor] = useState<Partial<ExtendedSensor>>({ type: 'soil_moisture', status: 'Online', unit: '%', source: 'manual' });
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const persistSensors = (items: ExtendedSensor[]) => {
    const toSave = items.map(({ history, ...sensor }) => sensor);
    localStorage.setItem('olivia_sensors', JSON.stringify(toSave));
  };

  const loadLocalData = () => {
    const savedSensors = localStorage.getItem('olivia_sensors');
    const savedParcels = localStorage.getItem('olivia_parcels');
    if (savedParcels) setParcels(JSON.parse(savedParcels));
    let loadedSensors: ExtendedSensor[] = savedSensors ? JSON.parse(savedSensors) : DEFAULT_SENSORS;
    loadedSensors = loadedSensors.map(migrateLegacySensor).map(sensor => ({ ...sensor, history: sensor.history || generateHistory(parseFloat(sensor.value)) }));
    if (!savedSensors) persistSensors(loadedSensors);
    setSensors(loadedSensors);
    setDecisionAdvice(adviceFromLocalSensors(loadedSensors));
    setDataSource('local_demo');
    return loadedSensors;
  };

  const loadSupabaseData = async () => {
    try {
      const [devices, readings, alerts] = await Promise.all([
        fetchSensorDevices(),
        fetchLatestSensorReadings(500),
        fetchOpenSensorAlerts(),
      ]);

      if (devices.length === 0) {
        loadLocalData();
        return;
      }

      const loadedSensors = buildSensorsFromSupabase(devices, readings);
      setSensors(loadedSensors);
      setOpenAlerts(alerts);
      setDecisionAdvice(buildDonaAnnaDecisionAdvice(readings, alerts));
      setDataSource('supabase');
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('[IoTDashboard] Supabase-data kunne ikke hentes. Bruker lokal demo.', error);
      loadLocalData();
    }
  };

  const simulateUpdate = () => {
    setSensors(prev => {
      const updated = prev.map(sensor => {
        if (sensor.status === 'Offline') return sensor;
        const range = SENSOR_RANGES[normalizeSensorType(sensor.type)];
        if (!range) return sensor;
        const base = parseFloat(sensor.value);
        const noise = (Math.random() - 0.5) * Math.max(Math.abs(base), 1) * 0.04;
        const newVal = Math.round(Math.min(range.max, Math.max(range.min, base + noise)) * 10) / 10;
        const newReading: SensorReadingPoint = { time: new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }), value: newVal };
        return { ...sensor, value: String(newVal), measured_at: new Date().toISOString(), lastUpdated: 'Akkurat nå', history: [...(sensor.history || []).slice(-23), newReading] };
      });
      if (dataSource === 'local_demo') persistSensors(updated);
      setDecisionAdvice(adviceFromLocalSensors(updated));
      return updated;
    });
    setLastRefresh(new Date());
  };

  useEffect(() => {
    loadSupabaseData();
    autoRefreshRef.current = setInterval(() => {
      if (dataSource === 'supabase') loadSupabaseData();
      else simulateUpdate();
    }, 30000);
    return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (dataSource === 'supabase') await loadSupabaseData();
    else simulateUpdate();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleAddSensor = async () => {
    if (!newSensor.name) return;
    const type = (newSensor.type || 'soil_moisture') as SensorType;
    const normalizedType = normalizeSensorType(type);
    const range = SENSOR_RANGES[normalizedType];
    const defaultVal = newSensor.value || defaultValueForType(normalizedType);
    const now = new Date().toISOString();
    const sensor: ExtendedSensor = {
      id: 'S' + Date.now(),
      sensor_id: newSensor.sensor_id || 'DA-BIAR-' + Date.now(),
      name: newSensor.name || 'Ny sensor',
      type: normalizedType,
      value: defaultVal,
      unit: range.unit,
      parcelId: newSensor.parcelId || newSensor.parcel_id || 'biar-main',
      parcel_id: newSensor.parcel_id || newSensor.parcelId || 'biar-main',
      zone_id: newSensor.zone_id || '',
      tree_group: newSensor.tree_group || '',
      depth_cm: newSensor.depth_cm,
      battery_percent: newSensor.battery_percent ?? 100,
      signal_rssi: newSensor.signal_rssi,
      calibrated_at: newSensor.calibrated_at,
      measured_at: now,
      source: newSensor.source || 'manual',
      status: 'Online',
      lastUpdated: 'Akkurat nå',
      history: generateHistory(parseFloat(defaultVal)),
    };

    const updated = [...sensors, sensor];
    setSensors(updated);
    setDecisionAdvice(adviceFromLocalSensors(updated));
    if (dataSource === 'local_demo') persistSensors(updated);

    if (dataSource === 'supabase') {
      try {
        await upsertSensorDevice({
          id: sensor.id,
          sensor_id: sensor.sensor_id || sensor.id,
          name: sensor.name,
          type: sensor.type,
          parcel_id: sensor.parcel_id,
          zone_id: sensor.zone_id,
          tree_group: sensor.tree_group,
          depth_cm: sensor.depth_cm,
          unit: sensor.unit,
          source: sensor.source || 'manual',
          status: sensor.status,
          battery_percent: sensor.battery_percent,
          signal_rssi: sensor.signal_rssi,
          calibrated_at: sensor.calibrated_at,
          installed_at: now,
          last_seen_at: now,
        });
        await insertSensorReading({
          sensor_id: sensor.sensor_id || sensor.id,
          parcel_id: sensor.parcel_id,
          zone_id: sensor.zone_id,
          tree_group: sensor.tree_group,
          depth_cm: sensor.depth_cm,
          type: sensor.type,
          value: Number(sensor.value),
          unit: sensor.unit,
          battery_percent: sensor.battery_percent,
          signal_rssi: sensor.signal_rssi,
          calibrated_at: sensor.calibrated_at,
          measured_at: now,
          received_at: now,
          source: sensor.source,
          quality_score: 0.8,
        });
        await loadSupabaseData();
      } catch (error) {
        console.warn('[IoTDashboard] Sensor lagret lokalt, men ikke i Supabase.', error);
      }
    }

    setIsAddModalOpen(false);
    setNewSensor({ type: 'soil_moisture', status: 'Online', unit: '%', source: 'manual' });
  };

  const handleDeleteSensor = (id: string) => {
    if (!confirm('Slette denne sensoren?')) return;
    const updated = sensors.filter(sensor => sensor.id !== id);
    setSensors(updated);
    if (dataSource === 'local_demo') persistSensors(updated);
    if (selectedSensor?.id === id) setSelectedSensor(null);
    setDecisionAdvice(adviceFromLocalSensors(updated));
  };

  const onlineSensors = sensors.filter(sensor => sensor.status === 'Online').length;
  const warningSensors = sensors.filter(sensor => getSensorStatus(sensor) === 'warning').length;
  const criticalSensors = sensors.filter(sensor => getSensorStatus(sensor) === 'critical').length;
  const offlineSensors = sensors.filter(sensor => sensor.status === 'Offline').length;

  const statusColor = (st: 'optimal' | 'warning' | 'critical') => st === 'optimal' ? 'text-green-400' : st === 'warning' ? 'text-yellow-400' : 'text-red-400';
  const statusBg = (st: 'optimal' | 'warning' | 'critical') => st === 'optimal' ? 'border-green-500/20 bg-green-500/5' : st === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-red-500/30 bg-red-500/5';

  const decision = decisionAdvice || adviceFromLocalSensors(sensors);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Activity className="text-green-400" /> IoT Sensorkontroll</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            DonaAnna · Biar {DONA_ANNA_BIAR_SEASON_SETTINGS.altitude_m} moh. · {sensors.length} sensorer · {dataSource === 'supabase' ? 'Supabase' : 'Lokal demo'} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all"><RefreshCcw size={18} className={isRefreshing ? 'animate-spin' : ''} /></button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Plus size={20} /> Legg til sensor</button>
        </div>
      </div>

      <div className={`glass rounded-[2rem] p-6 border ${decision.severity === 'critical' ? 'border-red-500/20 bg-red-500/5' : decision.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-green-500/20 bg-green-500/5'}`}>
        <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">Dagens beslutning</p>
        <p className="text-white font-bold">{decision.title}: {decision.message}</p>
        {decision.reasons.length > 0 && <p className="text-xs text-slate-500 mt-2">Grunnlag: {decision.reasons.join(' ')}</p>}
        <p className="text-xs text-slate-500 mt-2">Biar-profilen bruker senere høstevindu for fjell-/innlandsklima. Kalender er veiledende; modenhet, vær, sort og ønsket oljeprofil bestemmer faktisk høsting.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tilkoblet', value: onlineSensors, icon: <Wifi size={20} />, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
          { label: 'Kritisk', value: criticalSensors, icon: <AlertTriangle size={20} />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
          { label: 'Advarsel', value: warningSensors, icon: <Bell size={20} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Offline', value: offlineSensors, icon: <WifiOff size={20} />, color: 'text-slate-400', bg: 'bg-white/5 border-white/10' },
        ].map(item => <div key={item.label} className={`glass rounded-[2rem] p-6 border ${item.bg}`}><div className={`${item.color} mb-2`}>{item.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{item.label}</p><p className={`text-4xl font-bold ${item.color} mt-1`}>{item.value}</p></div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aktive sensorer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sensors.map(sensor => {
              const normalizedType = normalizeSensorType(sensor.type);
              const st = getSensorStatus(sensor);
              const range = SENSOR_RANGES[normalizedType];
              const val = parseFloat(sensor.value);
              const pct = range ? ((val - range.min) / (range.max - range.min)) * 100 : 50;
              const color = SENSOR_COLORS[normalizedType] || '#22c55e';
              const isSelected = selectedSensor?.id === sensor.id;
              const parcel = parcels.find(parcelItem => parcelItem.id === sensor.parcelId || parcelItem.id === sensor.parcel_id);
              return (
                <div key={sensor.id} onClick={() => setSelectedSensor(isSelected ? null : sensor)} className={`glass rounded-[2rem] p-6 border cursor-pointer transition-all hover:scale-[1.01] ${isSelected ? 'border-green-500/50 bg-green-500/5' : statusBg(st)}`}>
                  <div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl" style={{ background: color + '18', color }}>{SENSOR_ICONS[normalizedType] || <Activity size={20} />}</div><div><p className="text-sm font-bold text-white">{sensor.name}</p><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{range?.label || normalizedType} {sensor.depth_cm ? `· ${sensor.depth_cm} cm` : ''} {parcel ? `· ${parcel.name}` : ''}</p></div></div><div className="flex items-center gap-1.5">{(sensor.status === 'Low Battery' || (sensor.battery_percent ?? 100) < 30) && <BatteryLow size={14} className="text-yellow-400" />}{sensor.status === 'Online' && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}{sensor.status === 'Offline' && <WifiOff size={14} className="text-red-400" />}</div></div>
                  <div className="flex items-end justify-between mb-3"><div><p className="text-4xl font-bold text-white">{sensor.value}</p><p className="text-xs text-slate-500 mt-0.5">{sensor.unit}</p></div><div className="text-right"><p className={`text-[10px] font-bold uppercase ${statusColor(st)}`}>{st === 'optimal' ? '✓ Optimalt' : st === 'warning' ? '⚠ Advarsel' : '✗ Kritisk'}</p>{range && <p className="text-[9px] text-slate-600 mt-0.5">Opt: {range.optMin}–{range.optMax} {range.unit}</p>}</div></div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: st === 'optimal' ? color : st === 'warning' ? '#f59e0b' : '#ef4444' }} /></div>
                  {sensor.history && sensor.history.length > 0 && <div className="h-10 mt-3 opacity-60"><ResponsiveContainer width="100%" height="100%"><LineChart data={sensor.history.slice(-12)}><Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} /></LineChart></ResponsiveContainer></div>}
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5"><span className="text-[9px] text-slate-600">{sensor.lastUpdated || sensor.measured_at || '—'}</span><button onClick={event => { event.stopPropagation(); handleDeleteSensor(sensor.id); }} className="p-1 text-slate-700 hover:text-red-400 transition-colors"><Trash2 size={12} /></button></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {selectedSensor ? (() => {
            const normalizedType = normalizeSensorType(selectedSensor.type);
            const range = SENSOR_RANGES[normalizedType];
            const color = SENSOR_COLORS[normalizedType] || '#22c55e';
            return <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6 animate-in slide-in-from-right-4"><div className="flex justify-between items-center"><h3 className="font-bold text-white text-lg">{selectedSensor.name}</h3><button onClick={() => setSelectedSensor(null)} className="text-slate-500 hover:text-white p-1"><X size={20} /></button></div><div><h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">24-timers historikk</h4><div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={selectedSensor.history}><defs><linearGradient id={`grad-${selectedSensor.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.3} /><stop offset="95%" stopColor={color} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" /><XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} interval={3} /><YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} domain={['auto', 'auto']} /><Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px', fontSize: '11px' }} />{range && <><ReferenceLine y={range.optMin} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} /><ReferenceLine y={range.optMax} stroke="#22c55e" strokeDasharray="4 4" strokeWidth={1} /></>}<Area type="monotone" dataKey="value" stroke={color} fill={`url(#grad-${selectedSensor.id})`} strokeWidth={2} name={selectedSensor.unit} /></AreaChart></ResponsiveContainer></div></div><div className="grid grid-cols-2 gap-4">{[{ label: 'Nåværende', value: `${selectedSensor.value} ${selectedSensor.unit}` }, { label: 'Type', value: range?.label || normalizedType }, { label: 'Sone', value: selectedSensor.zone_id || '—' }, { label: 'Tregruppe', value: selectedSensor.tree_group || '—' }, { label: 'Dybde', value: selectedSensor.depth_cm ? `${selectedSensor.depth_cm} cm` : '—' }, { label: 'Batteri', value: selectedSensor.battery_percent !== undefined ? `${selectedSensor.battery_percent}%` : '—' }, { label: 'Signal', value: selectedSensor.signal_rssi !== undefined ? `${selectedSensor.signal_rssi} RSSI` : '—' }, { label: 'Kilde', value: selectedSensor.source || '—' }].map(item => <div key={item.label} className="p-4 bg-white/5 rounded-2xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{item.label}</p><p className="text-sm font-bold text-white mt-1">{item.value}</p></div>)}</div>{range && <div className="p-5 bg-green-500/5 rounded-2xl border border-green-500/20"><p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-3">Optimalt område – DonaAnna/Biar</p><p className="text-xs text-slate-400 leading-relaxed mb-4">{range.description}</p><div className="grid grid-cols-3 gap-3 text-center"><div><p className="text-[9px] text-slate-500">Min</p><p className="text-sm font-bold text-white">{range.min}</p></div><div className="border-x border-white/10"><p className="text-[9px] text-green-400">Optimalt</p><p className="text-sm font-bold text-green-400">{range.optMin}–{range.optMax}</p></div><div><p className="text-[9px] text-slate-500">Maks</p><p className="text-sm font-bold text-white">{range.max}</p></div></div></div>}</div>;
          })() : <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6"><h3 className="text-sm font-bold text-white uppercase tracking-widest">Sensorguide – DonaAnna</h3><div className="space-y-4">{['soil_moisture', 'soil_ec', 'water_ec', 'flow', 'pressure', 'leaf_wetness'].map(type => { const range = SENSOR_RANGES[type]; return <div key={type} className="flex gap-3 p-4 rounded-2xl bg-white/5 border border-white/5"><div className="p-2 rounded-xl shrink-0" style={{ background: SENSOR_COLORS[type] + '18', color: SENSOR_COLORS[type] }}>{SENSOR_ICONS[type]}</div><div><p className="text-xs font-bold text-white">{range.label}</p><p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{range.description}</p></div></div>; })}</div></div>}
          {(criticalSensors > 0 || warningSensors > 0 || openAlerts.length > 0) && <div className="glass rounded-[2.5rem] p-6 border border-red-500/20 bg-red-500/5 space-y-3"><h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> Aktive varsler ({Math.max(criticalSensors + warningSensors, openAlerts.length)})</h3>{openAlerts.length > 0 && dataSource === 'supabase' ? openAlerts.map(alert => <div key={alert.id} className={`flex items-center justify-between p-3 rounded-xl border ${alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}><div><p className="text-xs font-bold text-white">{alert.title}</p><p className={`text-[9px] font-bold ${alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>{alert.message}</p></div><AlertTriangle size={16} className={alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'} /></div>) : sensors.filter(sensor => getSensorStatus(sensor) !== 'optimal' || sensor.status === 'Offline').map(sensor => { const st = getSensorStatus(sensor); const range = SENSOR_RANGES[normalizeSensorType(sensor.type)]; return <div key={sensor.id} className={`flex items-center justify-between p-3 rounded-xl border ${st === 'critical' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'}`}><div><p className="text-xs font-bold text-white">{sensor.name}</p><p className={`text-[9px] font-bold ${st === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>{sensor.status === 'Offline' ? 'Ingen tilkobling' : `${sensor.value}${sensor.unit} – ${range?.label || sensor.type} utenfor ønsket område`}</p></div><AlertTriangle size={16} className={st === 'critical' ? 'text-red-400' : 'text-yellow-400'} /></div>; })}</div>}
        </div>
      </div>

      {isAddModalOpen && <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full max-w-md rounded-[2.5rem] p-10 border border-white/20 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center"><div><h3 className="text-2xl font-bold text-white">Legg til sensor</h3><p className="text-xs text-slate-500 mt-1">Konfigurer IoT-sensor for DonaAnna</p></div><button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-500"><X size={24} /></button></div><div className="space-y-4"><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sensornavn</label><input className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none" placeholder="Eks: Sone A - Jordfukt 30 cm" value={newSensor.name || ''} onChange={event => setNewSensor({ ...newSensor, name: event.target.value })} /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sensor-ID</label><input className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none" placeholder="Eks: DA-BIAR-SOIL-M-30-A" value={newSensor.sensor_id || ''} onChange={event => setNewSensor({ ...newSensor, sensor_id: event.target.value })} /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none" value={newSensor.type} onChange={event => { const type = event.target.value as SensorType; const range = SENSOR_RANGES[normalizeSensorType(type)]; setNewSensor({ ...newSensor, type, unit: range.unit, value: defaultValueForType(type) }); }}>{SENSOR_TYPE_OPTIONS.map(type => <option key={type} value={type}>{SENSOR_RANGES[type].label}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Sone</label><input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="zone-a" value={newSensor.zone_id || ''} onChange={event => setNewSensor({ ...newSensor, zone_id: event.target.value })} /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dybde cm</label><input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="30" value={newSensor.depth_cm || ''} onChange={event => setNewSensor({ ...newSensor, depth_cm: event.target.value ? Number(event.target.value) : undefined })} /></div></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Tregruppe</label><input className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none" placeholder="Eks: Unge Gordal" value={newSensor.tree_group || ''} onChange={event => setNewSensor({ ...newSensor, tree_group: event.target.value })} /></div><div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Parsell</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none" value={newSensor.parcelId || ''} onChange={event => setNewSensor({ ...newSensor, parcelId: event.target.value, parcel_id: event.target.value })}><option value="biar-main">DonaAnna Biar hovedfelt</option><option value="">Ingen parsell</option>{parcels.map(parcel => <option key={parcel.id} value={parcel.id}>{parcel.name}</option>)}</select></div></div><button onClick={handleAddSensor} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all">Legg til sensor</button></div></div>}
    </div>
  );
};

export default IoTDashboard;
