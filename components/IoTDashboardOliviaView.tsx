import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BatteryLow,
  Bell,
  Droplets,
  FlaskConical,
  Gauge,
  Leaf,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Thermometer,
  Waves,
  Wifi,
  WifiOff,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import type { SensorType } from '../types';
import type { SensorAlert, SensorDevice, SensorReading } from '../types/farmIoT';
import { DONA_ANNA_BIAR_SEASON_SETTINGS } from '../types/farmIoT';
import {
  buildDonaAnnaDecisionAdvice,
  fetchLatestSensorReadings,
  fetchOpenSensorAlerts,
  fetchSensorDevices,
  insertSensorReading,
  upsertSensorDevice,
} from '../services/farmIoT';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

type SensorRange = {
  label: string;
  unit: string;
  min: number;
  max: number;
  optMin: number;
  optMax: number;
  description: string;
};

type ManualReadingForm = {
  sensor_id: string;
  value: string;
  measured_at: string;
  battery_percent: string;
  signal_rssi: string;
};

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
  humidity: { label: 'Luftfuktighet', unit: '%', min: 0, max: 100, optMin: 35, optMax: 75, description: 'Brukes med bladfukt for sykdomsrisiko.' },
  leaf_wetness: { label: 'Bladfukt', unit: '%', min: 0, max: 100, optMin: 0, optMax: 40, description: 'Høy bladfukt kan gi sykdomsrisiko.' },
  battery: { label: 'Batteri', unit: '%', min: 0, max: 100, optMin: 30, optMax: 100, description: 'Drift og vedlikehold av sensorer.' },
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
  humidity: <Waves size={20} />,
  leaf_wetness: <Leaf size={20} />,
  battery: <BatteryLow size={20} />,
};

const SENSOR_TYPES = Object.keys(SENSOR_RANGES) as SensorType[];
const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60';
const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1';
const helpClass = 'text-[11px] text-slate-600 block mb-2';

function nowLocalDateTime(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function rangeStatus(type: SensorType, value?: number): 'optimal' | 'warning' | 'critical' | 'unknown' {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'unknown';
  const range = SENSOR_RANGES[type];
  if (!range) return 'unknown';
  if (value >= range.optMin && value <= range.optMax) return 'optimal';
  const margin = (range.max - range.min) * 0.12;
  if (value >= range.optMin - margin && value <= range.optMax + margin) return 'warning';
  return 'critical';
}

function statusClass(status: string): string {
  if (status === 'critical') return 'border-red-500/30 bg-red-500/5';
  if (status === 'warning') return 'border-yellow-500/30 bg-yellow-500/5';
  if (status === 'optimal') return 'border-green-500/20 bg-green-500/5';
  return 'border-white/10 bg-white/[0.02]';
}

function latestBySensorId(sensorId: string, readings: SensorReading[]): SensorReading | undefined {
  return readings
    .filter(reading => reading.sensor_id === sensorId)
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
}

const IoTDashboardOliviaView: React.FC = () => {
  const [devices, setDevices] = useState<SensorDevice[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [openAlerts, setOpenAlerts] = useState<SensorAlert[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [isSavingReading, setIsSavingReading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState<Partial<SensorDevice>>({ type: 'soil_moisture', unit: '%', status: 'Online', source: 'manual' });
  const [manualReading, setManualReading] = useState<ManualReadingForm>({ sensor_id: '', value: '', measured_at: nowLocalDateTime(), battery_percent: '', signal_rssi: '' });

  const decisionAdvice = useMemo(() => buildDonaAnnaDecisionAdvice(readings, openAlerts), [readings, openAlerts]);
  const onlineDevices = devices.filter(device => device.status === 'Online').length;
  const offlineDevices = devices.filter(device => device.status === 'Offline').length;
  const lowBattery = devices.filter(device => device.status === 'Low Battery' || (device.battery_percent || 100) < 30).length;
  const criticalReadings = devices.filter(device => rangeStatus(device.type, latestBySensorId(device.sensor_id, readings)?.value) === 'critical').length;

  const loadSupabaseData = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const [deviceRows, readingRows, alertRows] = await Promise.all([
        fetchSensorDevices(),
        fetchLatestSensorReadings(500),
        fetchOpenSensorAlerts(),
      ]);
      setDevices(deviceRows);
      setReadings(readingRows);
      setOpenAlerts(alertRows);
      setLoadState(deviceRows.length || readingRows.length || alertRows.length ? 'supabase' : 'empty');
      setLastRefresh(new Date());
    } catch (error) {
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente IoT-data fra Supabase.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => { loadSupabaseData(); }, []);

  const updateType = (type: SensorType) => {
    const range = SENSOR_RANGES[type];
    setNewDevice(prev => ({ ...prev, type, unit: range?.unit || prev.unit || '' }));
  };

  const saveDevice = async () => {
    setErrorMessage(null);
    if (!newDevice.sensor_id?.trim() || !newDevice.name?.trim() || !newDevice.type || !newDevice.unit) {
      setErrorMessage('Sensor-ID, navn, type og enhet må fylles ut.');
      return;
    }

    const device: SensorDevice = {
      sensor_id: newDevice.sensor_id.trim(),
      name: newDevice.name.trim(),
      type: newDevice.type,
      parcel_id: newDevice.parcel_id || undefined,
      zone_id: newDevice.zone_id || undefined,
      tree_group: newDevice.tree_group || undefined,
      depth_cm: Number(newDevice.depth_cm || 0) || undefined,
      unit: newDevice.unit,
      source: newDevice.source || 'manual',
      status: newDevice.status || 'Online',
      battery_percent: Number(newDevice.battery_percent || 0) || undefined,
      signal_rssi: Number(newDevice.signal_rssi || 0) || undefined,
      installed_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      notes: newDevice.notes || undefined,
    };

    setIsSavingDevice(true);
    try {
      const saved = await upsertSensorDevice(device);
      setDevices(prev => prev.some(item => item.sensor_id === saved.sensor_id) ? prev.map(item => item.sensor_id === saved.sensor_id ? saved : item) : [saved, ...prev]);
      setLoadState('supabase');
      setIsAddModalOpen(false);
      setNewDevice({ type: 'soil_moisture', unit: '%', status: 'Online', source: 'manual' });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sensoren ble ikke lagret i Supabase.');
    } finally {
      setIsSavingDevice(false);
    }
  };

  const saveReading = async () => {
    setErrorMessage(null);
    const device = devices.find(item => item.sensor_id === manualReading.sensor_id);
    if (!device || !manualReading.value) {
      setErrorMessage('Velg sensor og legg inn måleverdi.');
      return;
    }

    setIsSavingReading(true);
    try {
      const saved = await insertSensorReading({
        sensor_id: device.sensor_id,
        parcel_id: device.parcel_id,
        zone_id: device.zone_id,
        tree_group: device.tree_group,
        depth_cm: device.depth_cm,
        type: device.type,
        value: Number(manualReading.value),
        unit: device.unit,
        battery_percent: Number(manualReading.battery_percent || 0) || undefined,
        signal_rssi: Number(manualReading.signal_rssi || 0) || undefined,
        measured_at: new Date(manualReading.measured_at).toISOString(),
        received_at: new Date().toISOString(),
        source: device.source || 'manual',
        quality_score: 0.9,
      });
      setReadings(prev => [saved, ...prev]);
      setLoadState('supabase');
      setIsReadingModalOpen(false);
      setManualReading({ sensor_id: device.sensor_id, value: '', measured_at: nowLocalDateTime(), battery_percent: '', signal_rssi: '' });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Målingen ble ikke lagret i Supabase.');
    } finally {
      setIsSavingReading(false);
    }
  };

  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen data ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,0.12),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><Activity className="text-green-400" /> IoT Sensorkontroll</h2>
              <p className="text-slate-400 text-sm mt-2">Supabase-basert sensoroversikt. Ingen demo-sensorer og ingen simulert fallback.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Biar {DONA_ANNA_BIAR_SEASON_SETTINGS.altitude_m} moh. · {devices.length} sensorer · {sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadSupabaseData} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all"><RefreshCcw size={18} className={isRefreshing ? 'animate-spin' : ''} /></button>
            <button onClick={() => setIsReadingModalOpen(true)} disabled={!devices.length} className="bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white px-5 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-2"><Save size={18} /> Ny måling</button>
            <button onClick={() => setIsAddModalOpen(true)} className="bg-[#d9b657] hover:bg-[#f0cf70] text-black px-5 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-[#d9b657]/20 flex items-center gap-2"><Plus size={20} /> Legg til sensor</button>
          </div>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      <div className={`glass rounded-[2rem] p-6 border ${decisionAdvice.severity === 'critical' ? 'border-red-500/20 bg-red-500/5' : decisionAdvice.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-green-500/20 bg-green-500/5'}`}>
        <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">Dagens beslutning</p>
        <p className="text-white font-bold">{decisionAdvice.title}: {decisionAdvice.message}</p>
        {decisionAdvice.reasons.length > 0 && <p className="text-xs text-slate-500 mt-2">Grunnlag: {decisionAdvice.reasons.join(' ')}</p>}
        <p className="text-xs text-slate-500 mt-2">Biar-profilen bruker senere høstevindu for fjell-/innlandsklima. Kalender er veiledende; modenhet, vær, sort og ønsket oljeprofil bestemmer faktisk høsting.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tilkoblet', value: onlineDevices, icon: <Wifi size={20} />, className: 'text-green-400 bg-green-500/10 border-green-500/20' },
          { label: 'Kritisk måling', value: criticalReadings, icon: <AlertTriangle size={20} />, className: 'text-red-400 bg-red-500/10 border-red-500/20' },
          { label: 'Lavt batteri', value: lowBattery, icon: <Bell size={20} />, className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Offline', value: offlineDevices, icon: <WifiOff size={20} />, className: 'text-slate-400 bg-white/5 border-white/10' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-6 border ${card.className}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-4xl font-bold mt-1">{card.value}</p></div>)}
      </div>

      {!devices.length && !readings.length && !isRefreshing ? (
        <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center">
          <Activity className="mx-auto text-[#d9b657] mb-3" size={34} />
          <h4 className="text-white font-bold text-lg">Ingen IoT-data ennå</h4>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">Registrer en sensor eller legg inn en manuell måling. Olivia viser ikke demo-sensorer eller simulerte verdier.</p>
          <button onClick={() => setIsAddModalOpen(true)} className="mt-5 bg-[#d9b657] hover:bg-[#f0cf70] text-black px-5 py-3 rounded-2xl font-bold inline-flex items-center gap-2"><Plus size={18} /> Registrer første sensor</button>
        </div>
      ) : isRefreshing && !devices.length ? (
        <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter sensorer fra Supabase...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Aktive sensorer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {devices.map(device => {
                const latest = latestBySensorId(device.sensor_id, readings);
                const range = SENSOR_RANGES[device.type];
                const status = rangeStatus(device.type, latest?.value);
                const pct = latest && range ? Math.max(0, Math.min(100, ((latest.value - range.min) / (range.max - range.min)) * 100)) : 0;
                return <div key={device.sensor_id} className={`glass rounded-[2rem] p-6 border ${statusClass(status)}`}>
                  <div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-white/5 text-green-400">{SENSOR_ICONS[device.type] || <Activity size={20} />}</div><div><h4 className="text-white font-bold">{device.name}</h4><p className="text-xs text-slate-500">{range?.label || device.type}</p></div></div><span className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-slate-400">{device.status}</span></div>
                  <div className="flex items-end gap-2 mb-4"><span className="text-4xl font-bold text-white">{latest ? latest.value : '—'}</span><span className="text-slate-500 mb-1">{latest?.unit || device.unit}</span></div>
                  {latest && range && <div className="h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-green-400" style={{ width: `${pct}%` }} /></div>}
                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs"><Metric label="Batteri" value={`${latest?.battery_percent ?? device.battery_percent ?? '—'}%`} /><Metric label="Kilde" value={latest?.source || device.source || '—'} /></div>
                  <p className="text-[10px] text-slate-600 mt-3">{latest ? `Målt ${new Date(latest.measured_at).toLocaleString('no-NO')}` : 'Ingen målinger registrert ennå'}</p>
                </div>;
              })}
            </div>
          </div>
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Åpne varsler</h3>
            <div className="glass rounded-[2rem] p-6 border border-white/10 space-y-3">
              {openAlerts.length ? openAlerts.map(alert => <div key={alert.id} className="rounded-2xl bg-white/5 p-4 border border-white/10"><p className="text-white font-bold text-sm">{alert.title}</p><p className="text-xs text-slate-400 mt-1">{alert.message}</p><p className="text-[10px] text-slate-600 mt-2 uppercase font-bold tracking-widest">{alert.severity}</p></div>) : <p className="text-sm text-slate-500 italic">Ingen åpne sensorvarsler.</p>}
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full max-w-2xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"><ModalHeader title="Legg til sensor" onClose={() => setIsAddModalOpen(false)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Sensor-ID *" help="Unik ID fra sensor eller intern ID."><input className={inputClass} value={newDevice.sensor_id || ''} onChange={e => setNewDevice(p => ({ ...p, sensor_id: e.target.value }))} placeholder="DA-BIAR-SOIL-M-30-A" /></Field><Field label="Navn *" help="Lesbart navn i dashboardet."><input className={inputClass} value={newDevice.name || ''} onChange={e => setNewDevice(p => ({ ...p, name: e.target.value }))} placeholder="Jordfukt 30 cm" /></Field></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Type" help="Hva sensoren måler."><select className={inputClass} value={newDevice.type} onChange={e => updateType(e.target.value as SensorType)}>{SENSOR_TYPES.map(type => <option key={type} className="bg-slate-900" value={type}>{SENSOR_RANGES[type]?.label || type}</option>)}</select></Field><Field label="Enhet" help="Måleenhet."><input className={inputClass} value={newDevice.unit || ''} onChange={e => setNewDevice(p => ({ ...p, unit: e.target.value }))} /></Field><Field label="Status" help="Driftsstatus."><select className={inputClass} value={newDevice.status} onChange={e => setNewDevice(p => ({ ...p, status: e.target.value as SensorDevice['status'] }))}><option className="bg-slate-900">Online</option><option className="bg-slate-900">Offline</option><option className="bg-slate-900">Low Battery</option></select></Field></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Parsell-ID" help="Valgfritt, men anbefalt for senere sonekart."><input className={inputClass} value={newDevice.parcel_id || ''} onChange={e => setNewDevice(p => ({ ...p, parcel_id: e.target.value }))} placeholder="parcel_id" /></Field><Field label="Sone-ID" help="Valgfritt."><input className={inputClass} value={newDevice.zone_id || ''} onChange={e => setNewDevice(p => ({ ...p, zone_id: e.target.value }))} placeholder="zone_id" /></Field></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Dybde cm" help="Valgfritt."><input type="number" className={inputClass} value={newDevice.depth_cm || ''} onChange={e => setNewDevice(p => ({ ...p, depth_cm: Number(e.target.value) }))} /></Field><Field label="Batteri %" help="Valgfritt."><input type="number" className={inputClass} value={newDevice.battery_percent || ''} onChange={e => setNewDevice(p => ({ ...p, battery_percent: Number(e.target.value) }))} /></Field><Field label="Kilde" help="manual, lorawan, wifi eller api."><input className={inputClass} value={newDevice.source || ''} onChange={e => setNewDevice(p => ({ ...p, source: e.target.value }))} /></Field></div>
          <button onClick={saveDevice} disabled={isSavingDevice} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isSavingDevice ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Lagre sensor</button>
        </div></div>
      )}

      {isReadingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full max-w-lg rounded-[2.5rem] p-8 border border-white/20 shadow-2xl space-y-5"><ModalHeader title="Ny manuell måling" onClose={() => setIsReadingModalOpen(false)} />
          <Field label="Sensor" help="Velg sensor som målingen gjelder."><select className={inputClass} value={manualReading.sensor_id} onChange={e => setManualReading(p => ({ ...p, sensor_id: e.target.value }))}><option className="bg-slate-900" value="">Velg sensor</option>{devices.map(device => <option key={device.sensor_id} className="bg-slate-900" value={device.sensor_id}>{device.name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Verdi" help="Faktisk målt verdi."><input type="number" className={inputClass} value={manualReading.value} onChange={e => setManualReading(p => ({ ...p, value: e.target.value }))} /></Field><Field label="Målt tidspunkt" help="Når målingen ble tatt."><input type="datetime-local" className={inputClass} value={manualReading.measured_at} onChange={e => setManualReading(p => ({ ...p, measured_at: e.target.value }))} /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Batteri %" help="Valgfritt."><input type="number" className={inputClass} value={manualReading.battery_percent} onChange={e => setManualReading(p => ({ ...p, battery_percent: e.target.value }))} /></Field><Field label="Signal RSSI" help="Valgfritt."><input type="number" className={inputClass} value={manualReading.signal_rssi} onChange={e => setManualReading(p => ({ ...p, signal_rssi: e.target.value }))} /></Field></div>
          <button onClick={saveReading} disabled={isSavingReading} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isSavingReading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Lagre måling</button>
        </div></div>
      )}
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/5 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</p><p className="text-white font-bold mt-1 truncate">{value}</p></div>;
}

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span><span className={helpClass}>{help}</span>{children}</label>;
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return <div className="flex justify-between items-start gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Supabase · olivia IoT</p><h3 className="text-2xl font-bold text-white mt-1">{title}</h3></div><button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button></div>;
}

export default IoTDashboardOliviaView;
