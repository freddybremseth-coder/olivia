import React, { useEffect, useState } from 'react';
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
import type { Sensor, SensorType } from '../types';
import {
  DONA_ANNA_BIAR_SEASON_SETTINGS,
  type SensorAlert,
  type SensorDevice,
  type SensorReading as FarmSensorReading,
} from '../types/farmIoT';
import {
  buildDonaAnnaDecisionAdvice,
  fetchLatestSensorReadings,
  fetchOpenSensorAlerts,
  fetchSensorDevices,
  insertSensorReading,
  upsertSensorDevice,
  type FarmDecisionAdvice,
} from '../services/farmIoT';

type SensorStatus = 'optimal' | 'warning' | 'critical';

type SensorRange = {
  label: string;
  unit: string;
  min: number;
  max: number;
  optMin: number;
  optMax: number;
  description: string;
};

interface ExtendedSensor extends Sensor {
  lastUpdated?: string;
}

const LEGACY_TYPE_MAP: Partial<Record<SensorType, SensorType>> = {
  Moisture: 'soil_moisture',
  Temperature: 'soil_temperature',
  PH: 'soil_ph',
  NPK: 'soil_ec',
};

const normalizeSensorType = (type: SensorType): SensorType => LEGACY_TYPE_MAP[type] || type;

const SENSOR_RANGES: Record<string, SensorRange> = {
  soil_moisture: { label: 'Jordfuktighet', unit: '%', min: 0, max: 100, optMin: 35, optMax: 65, description: 'Viktigste styringsverdi for vanning.' },
  soil_temperature: { label: 'Jordtemperatur', unit: '°C', min: 0, max: 50, optMin: 16, optMax: 30, description: 'Påvirker rotaktivitet og næringsopptak.' },
  soil_ec: { label: 'Jord EC / salt', unit: 'dS/m', min: 0, max: 8, optMin: 0.4, optMax: 2.0, description: 'Følger saltoppbygging i jorden.' },
  soil_ph: { label: 'Jord pH', unit: 'pH', min: 4, max: 9, optMin: 6, optMax: 7.8, description: 'Påvirker næringstilgang og jordhelse.' },
  water_ec: { label: 'Vann EC / salt', unit: 'dS/m', min: 0, max: 6, optMin: 0.2, optMax: 1.5, description: 'Kontrollerer salt i vanningsvann.' },
  water_ph: { label: 'Vann pH', unit: 'pH', min: 4, max: 9, optMin: 6, optMax: 7.8, description: 'Viktig for vannkvalitet og gjødsling.' },
  flow: { label: 'Flow', unit: 'L/min', min: 0, max: 200, optMin: 10, optMax: 120, description: 'Viser om vann faktisk går ut.' },
  pressure: { label: 'Trykk', unit: 'bar', min: 0, max: 8, optMin: 1, optMax: 3.5, description: 'Avslører lekkasjer eller tette dryppslanger.' },
  rain: { label: 'Regn', unit: 'mm', min: 0, max: 100, optMin: 0, optMax: 25, description: 'Brukes sammen med jordfuktighet.' },
  air_temperature: { label: 'Lufttemperatur', unit: '°C', min: -10, max: 50, optMin: 12, optMax: 34, description: 'Viktig for stress, frostfare og modning.' },
  air_humidity: { label: 'Luftfuktighet', unit: '%', min: 0, max: 100, optMin: 35, optMax: 75, description: 'Brukes med bladfukt for sykdomsrisiko.' },
  leaf_wetness: { label: 'Bladfukt', unit: '%', min: 0, max: 100, optMin: 0, optMax: 40, description: 'Høy bladfukt kan gi sykdomsrisiko.' },
  battery: { label: 'Batteri', unit: '%', min: 0, max: 100, optMin: 30, optMax: 100, description: 'Drift og vedlikehold av sensorer.' },
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

const SENSOR_TYPE_OPTIONS: SensorType[] = [
  'soil_moisture',
  'soil_temperature',
  'soil_ec',
  'soil_ph',
  'water_ec',
  'water_ph',
  'flow',
  'pressure',
  'rain',
  'air_temperature',
  'air_humidity',
  'leaf_wetness',
  'battery',
];

const DEFAULT_SENSORS: ExtendedSensor[] = [
  { id: 'local-1', sensor_id: 'DA-BIAR-SOIL-M-30-A', name: 'Sone A - Jordfukt 30 cm', type: 'soil_moisture', value: '42', unit: '%', parcelId: 'biar-main', parcel_id: 'biar-main', zone_id: 'zone-a', tree_group: 'Unge Gordal', depth_cm: 30, status: 'Online', battery_percent: 88, signal_rssi: -76, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: 'Demo' },
  { id: 'local-2', sensor_id: 'DA-BIAR-SOIL-EC-B', name: 'Sone B - Jord EC / salt', type: 'soil_ec', value: '2.3', unit: 'dS/m', parcelId: 'biar-main', parcel_id: 'biar-main', zone_id: 'zone-b', tree_group: 'Eldre blanding', depth_cm: 40, status: 'Online', battery_percent: 74, signal_rssi: -81, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: 'Demo' },
  { id: 'local-3', sensor_id: 'DA-BIAR-WATER-EC', name: 'Vanningsvann - EC', type: 'water_ec', value: '1.2', unit: 'dS/m', parcelId: 'biar-main', parcel_id: 'biar-main', zone_id: 'pump-house', status: 'Online', battery_percent: 100, signal_rssi: -60, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: 'Demo' },
  { id: 'local-4', sensor_id: 'DA-BIAR-FLOW-A', name: 'Sektor A - Flow', type: 'flow', value: '28', unit: 'L/min', parcelId: 'biar-main', parcel_id: 'biar-main', zone_id: 'zone-a', status: 'Online', battery_percent: 65, signal_rssi: -79, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: 'Demo' },
  { id: 'local-5', sensor_id: 'DA-BIAR-PRESSURE-A', name: 'Sektor A - Trykk', type: 'pressure', value: '0.6', unit: 'bar', parcelId: 'biar-main', parcel_id: 'biar-main', zone_id: 'zone-a', status: 'Online', battery_percent: 22, signal_rssi: -84, source: 'simulation', measured_at: new Date().toISOString(), lastUpdated: 'Demo' },
];

function defaultValueForType(type: SensorType): string {
  const range = SENSOR_RANGES[normalizeSensorType(type)];
  if (!range) return '0';
  return String(Math.round(((range.optMin + range.optMax) / 2) * 10) / 10);
}

function getSensorStatus(sensor: ExtendedSensor): SensorStatus {
  if (sensor.status === 'Offline') return 'critical';
  if (typeof sensor.battery_percent === 'number' && sensor.battery_percent < 15) return 'critical';
  if (typeof sensor.battery_percent === 'number' && sensor.battery_percent < 30) return 'warning';

  const range = SENSOR_RANGES[normalizeSensorType(sensor.type)];
  const value = Number(sensor.value);
  if (!range || !Number.isFinite(value)) return 'warning';
  if (value >= range.optMin && value <= range.optMax) return 'optimal';
  const margin = (range.max - range.min) * 0.12;
  if (value >= range.optMin - margin && value <= range.optMax + margin) return 'warning';
  return 'critical';
}

function localSensorsToReadings(sensors: ExtendedSensor[]): FarmSensorReading[] {
  return sensors.map(sensor => ({
    id: sensor.id,
    sensor_id: sensor.sensor_id || sensor.id,
    parcel_id: sensor.parcel_id || sensor.parcelId,
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
    source: sensor.source || 'simulation',
    quality_score: 0.75,
  }));
}

function buildSensorsFromSupabase(devices: SensorDevice[], readings: FarmSensorReading[]): ExtendedSensor[] {
  return devices.map(device => {
    const sensorReadings = readings
      .filter(reading => reading.sensor_id === device.sensor_id)
      .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
    const latest = sensorReadings[0];
    return {
      id: device.id || device.sensor_id,
      sensor_id: device.sensor_id,
      name: device.name,
      type: normalizeSensorType(device.type),
      value: String(latest?.value ?? 0),
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
    };
  });
}

const IoTDashboard: React.FC = () => {
  const [sensors, setSensors] = useState<ExtendedSensor[]>(DEFAULT_SENSORS);
  const [selectedSensor, setSelectedSensor] = useState<ExtendedSensor | null>(null);
  const [openAlerts, setOpenAlerts] = useState<SensorAlert[]>([]);
  const [decisionAdvice, setDecisionAdvice] = useState<FarmDecisionAdvice>(() => buildDonaAnnaDecisionAdvice(localSensorsToReadings(DEFAULT_SENSORS)));
  const [dataSource, setDataSource] = useState<'supabase' | 'local_demo'>('local_demo');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSensor, setNewSensor] = useState<Partial<ExtendedSensor>>({ type: 'soil_moisture', unit: '%', status: 'Online', source: 'manual' });

  const loadLocalDemo = () => {
    setSensors(DEFAULT_SENSORS);
    setDecisionAdvice(buildDonaAnnaDecisionAdvice(localSensorsToReadings(DEFAULT_SENSORS)));
    setDataSource('local_demo');
    setLastRefresh(new Date());
  };

  const loadSupabaseData = async () => {
    try {
      const [devices, readings, alerts] = await Promise.all([
        fetchSensorDevices(),
        fetchLatestSensorReadings(500),
        fetchOpenSensorAlerts(),
      ]);

      if (!devices.length) {
        loadLocalDemo();
        return;
      }

      const dashboardSensors = buildSensorsFromSupabase(devices, readings);
      setSensors(dashboardSensors);
      setOpenAlerts(alerts);
      setDecisionAdvice(buildDonaAnnaDecisionAdvice(readings, alerts));
      setDataSource('supabase');
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('[IoTDashboard] Could not load Supabase IoT data. Falling back to local demo.', error);
      loadLocalDemo();
    }
  };

  useEffect(() => {
    loadSupabaseData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSupabaseData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddSensor = async () => {
    if (!newSensor.name) return;

    const type = normalizeSensorType((newSensor.type || 'soil_moisture') as SensorType);
    const range = SENSOR_RANGES[type];
    const now = new Date().toISOString();
    const sensorId = newSensor.sensor_id || `DA-BIAR-${Date.now()}`;
    const value = newSensor.value || defaultValueForType(type);

    const sensor: ExtendedSensor = {
      id: sensorId,
      sensor_id: sensorId,
      name: newSensor.name,
      type,
      value,
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
    };

    const updated = [...sensors, sensor];
    setSensors(updated);
    setDecisionAdvice(buildDonaAnnaDecisionAdvice(localSensorsToReadings(updated), openAlerts));

    if (dataSource === 'supabase') {
      try {
        await upsertSensorDevice({
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
        console.warn('[IoTDashboard] Sensor added locally but Supabase save failed.', error);
      }
    }

    setNewSensor({ type: 'soil_moisture', unit: '%', status: 'Online', source: 'manual' });
    setIsAddModalOpen(false);
  };

  const handleDeleteSensor = (id: string) => {
    if (!confirm('Slette denne sensoren fra visningen?')) return;
    const updated = sensors.filter(sensor => sensor.id !== id);
    setSensors(updated);
    setDecisionAdvice(buildDonaAnnaDecisionAdvice(localSensorsToReadings(updated), openAlerts));
    if (selectedSensor?.id === id) setSelectedSensor(null);
  };

  const onlineSensors = sensors.filter(sensor => sensor.status === 'Online').length;
  const warningSensors = sensors.filter(sensor => getSensorStatus(sensor) === 'warning').length;
  const criticalSensors = sensors.filter(sensor => getSensorStatus(sensor) === 'critical').length;
  const offlineSensors = sensors.filter(sensor => sensor.status === 'Offline').length;

  const statCards = [
    { label: 'Tilkoblet', value: onlineSensors, icon: <Wifi size={20} />, className: 'text-green-400 bg-green-500/10 border-green-500/20' },
    { label: 'Kritisk', value: criticalSensors, icon: <AlertTriangle size={20} />, className: 'text-red-400 bg-red-500/10 border-red-500/20' },
    { label: 'Advarsel', value: warningSensors, icon: <Bell size={20} />, className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    { label: 'Offline', value: offlineSensors, icon: <WifiOff size={20} />, className: 'text-slate-400 bg-white/5 border-white/10' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Activity className="text-green-400" /> IoT Sensorkontroll
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            DonaAnna · Biar {DONA_ANNA_BIAR_SEASON_SETTINGS.altitude_m} moh. · {sensors.length} sensorer · {dataSource === 'supabase' ? 'Supabase' : 'Lokal demo'} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all">
            <RefreshCcw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2">
            <Plus size={20} /> Legg til sensor
          </button>
        </div>
      </div>

      <div className={`glass rounded-[2rem] p-6 border ${decisionAdvice.severity === 'critical' ? 'border-red-500/20 bg-red-500/5' : decisionAdvice.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-green-500/20 bg-green-500/5'}`}>
        <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">Dagens beslutning</p>
        <p className="text-white font-bold">{decisionAdvice.title}: {decisionAdvice.message}</p>
        {decisionAdvice.reasons.length > 0 && (
          <p className="text-xs text-slate-500 mt-2">Grunnlag: {decisionAdvice.reasons.join(' ')}</p>
        )}
        <p className="text-xs text-slate-500 mt-2">
          Biar-profilen bruker senere høstevindu for fjell-/innlandsklima. Kalender er veiledende; modenhet, vær, sort og ønsket oljeprofil bestemmer faktisk høsting.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className={`glass rounded-[2rem] p-6 border ${card.className}`}>
            <div className="mb-2">{card.icon}</div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p>
            <p className="text-4xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aktive sensorer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sensors.map(sensor => {
              const type = normalizeSensorType(sensor.type);
              const range = SENSOR_RANGES[type];
              const status = getSensorStatus(sensor);
              const color = SENSOR_COLORS[type] || '#22c55e';
              const pct = range ? ((Number(sensor.value) - range.min) / (range.max - range.min)) * 100 : 50;
              return (
                <div key={sensor.id} onClick={() => setSelectedSensor(sensor)} className={`glass rounded-[2rem] p-6 border cursor-pointer transition-all hover:scale-[1.01] ${status === 'critical' ? 'border-red-500/30 bg-red-500/5' : status === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-green-500/20 bg-green-500/5'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl" style={{ background: `${color}18`, color }}>
                        {SENSOR_ICONS[type] || <Activity size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{sensor.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                          {range?.label || type} {sensor.depth_cm ? `· ${sensor.depth_cm} cm` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(sensor.status === 'Low Battery' || (sensor.battery_percent ?? 100) < 30) && <BatteryLow size={14} className="text-yellow-400" />}
                      {sensor.status === 'Online' && <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
                      {sensor.status === 'Offline' && <WifiOff size={14} className="text-red-400" />}
                    </div>
                  </div>

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-4xl font-bold text-white">{sensor.value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sensor.unit}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-bold uppercase ${status === 'critical' ? 'text-red-400' : status === 'warning' ? 'text-yellow-400' : 'text-green-400'}`}>
                        {status === 'optimal' ? '✓ Optimalt' : status === 'warning' ? '⚠ Advarsel' : '✗ Kritisk'}
                      </p>
                      {range && <p className="text-[9px] text-slate-600 mt-0.5">Opt: {range.optMin}–{range.optMax} {range.unit}</p>}
                    </div>
                  </div>

                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: status === 'optimal' ? color : status === 'warning' ? '#f59e0b' : '#ef4444' }} />
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                    <span className="text-[9px] text-slate-600">{sensor.lastUpdated || sensor.measured_at || '—'}</span>
                    <button onClick={event => { event.stopPropagation(); handleDeleteSensor(sensor.id); }} className="p-1 text-slate-700 hover:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          {selectedSensor ? (
            <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-white text-lg">{selectedSensor.name}</h3>
                <button onClick={() => setSelectedSensor(null)} className="text-slate-500 hover:text-white p-1"><X size={20} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Nåværende', value: `${selectedSensor.value} ${selectedSensor.unit}` },
                  { label: 'Type', value: SENSOR_RANGES[normalizeSensorType(selectedSensor.type)]?.label || selectedSensor.type },
                  { label: 'Sone', value: selectedSensor.zone_id || '—' },
                  { label: 'Tregruppe', value: selectedSensor.tree_group || '—' },
                  { label: 'Dybde', value: selectedSensor.depth_cm ? `${selectedSensor.depth_cm} cm` : '—' },
                  { label: 'Batteri', value: selectedSensor.battery_percent !== undefined ? `${selectedSensor.battery_percent}%` : '—' },
                  { label: 'Signal', value: selectedSensor.signal_rssi !== undefined ? `${selectedSensor.signal_rssi} RSSI` : '—' },
                  { label: 'Kilde', value: selectedSensor.source || '—' },
                ].map(item => (
                  <div key={item.label} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{item.label}</p>
                    <p className="text-sm font-bold text-white mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Sensorguide – DonaAnna</h3>
              {['soil_moisture', 'soil_ec', 'water_ec', 'flow', 'pressure', 'leaf_wetness'].map(type => {
                const range = SENSOR_RANGES[type];
                return (
                  <div key={type} className="flex gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="p-2 rounded-xl shrink-0" style={{ background: `${SENSOR_COLORS[type]}18`, color: SENSOR_COLORS[type] }}>
                      {SENSOR_ICONS[type]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{range.label}</p>
                      <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{range.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(openAlerts.length > 0 || criticalSensors > 0 || warningSensors > 0) && (
            <div className="glass rounded-[2.5rem] p-6 border border-red-500/20 bg-red-500/5 space-y-3">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={14} /> Aktive varsler
              </h3>
              {openAlerts.length > 0 && dataSource === 'supabase' ? openAlerts.map(alert => (
                <div key={alert.id} className="p-3 rounded-xl border bg-yellow-500/10 border-yellow-500/20">
                  <p className="text-xs font-bold text-white">{alert.title}</p>
                  <p className="text-[9px] font-bold text-yellow-400">{alert.message}</p>
                </div>
              )) : sensors.filter(sensor => getSensorStatus(sensor) !== 'optimal').map(sensor => (
                <div key={sensor.id} className="p-3 rounded-xl border bg-yellow-500/10 border-yellow-500/20">
                  <p className="text-xs font-bold text-white">{sensor.name}</p>
                  <p className="text-[9px] font-bold text-yellow-400">{sensor.value}{sensor.unit} utenfor ønsket område</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-[2.5rem] p-10 border border-white/20 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">Legg til sensor</h3>
                <p className="text-xs text-slate-500 mt-1">Konfigurer IoT-sensor for DonaAnna</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-500"><X size={24} /></button>
            </div>

            <div className="space-y-4">
              <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none" placeholder="Sensornavn" value={newSensor.name || ''} onChange={event => setNewSensor({ ...newSensor, name: event.target.value })} />
              <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none" placeholder="Sensor-ID, f.eks. DA-BIAR-SOIL-M-30-A" value={newSensor.sensor_id || ''} onChange={event => setNewSensor({ ...newSensor, sensor_id: event.target.value })} />
              <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none" value={newSensor.type} onChange={event => { const type = event.target.value as SensorType; setNewSensor({ ...newSensor, type, unit: SENSOR_RANGES[type].unit, value: defaultValueForType(type) }); }}>
                {SENSOR_TYPE_OPTIONS.map(type => <option key={type} value={type}>{SENSOR_RANGES[type].label}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Sone" value={newSensor.zone_id || ''} onChange={event => setNewSensor({ ...newSensor, zone_id: event.target.value })} />
                <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Dybde cm" value={newSensor.depth_cm || ''} onChange={event => setNewSensor({ ...newSensor, depth_cm: event.target.value ? Number(event.target.value) : undefined })} />
              </div>
              <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none" placeholder="Tregruppe, f.eks. Unge Gordal" value={newSensor.tree_group || ''} onChange={event => setNewSensor({ ...newSensor, tree_group: event.target.value })} />
            </div>

            <button onClick={handleAddSensor} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all">
              Legg til sensor
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IoTDashboard;
