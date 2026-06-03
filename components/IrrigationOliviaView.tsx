import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Battery,
  Brain,
  CheckCircle,
  Droplets,
  Gauge,
  Loader2,
  MapPin,
  Plus,
  Radio,
  RefreshCcw,
  Save,
  ShieldCheck,
  Thermometer,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import type { SensorType } from '../types';
import type { FarmZone, SensorAlert, SensorDevice, SensorReading } from '../types/farmIoT';
import { fetchParcels } from '../services/db';
import {
  buildDonaAnnaDecisionAdvice,
  fetchFarmZones,
  fetchLatestSensorReadings,
  fetchOpenSensorAlerts,
  fetchSensorDevices,
  upsertSensorDevice,
} from '../services/farmIoT';
import type { Parcel } from '../types';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

type SensorForm = {
  sensor_id: string;
  name: string;
  type: SensorType;
  parcel_id: string;
  zone_id: string;
  depth_cm: string;
  unit: string;
  source: SensorDevice['source'];
  status: SensorDevice['status'];
  notes: string;
};

const SENSOR_TYPES: { value: SensorType; label: string; unit: string }[] = [
  { value: 'soil_moisture', label: 'Jordfukt', unit: '%' },
  { value: 'soil_temperature', label: 'Jordtemperatur', unit: '°C' },
  { value: 'air_temperature', label: 'Lufttemperatur', unit: '°C' },
  { value: 'humidity', label: 'Luftfuktighet', unit: '%' },
  { value: 'soil_ec', label: 'Jord EC', unit: 'dS/m' },
  { value: 'water_ec', label: 'Vann EC', unit: 'dS/m' },
  { value: 'water_ph', label: 'Vann pH', unit: 'pH' },
  { value: 'flow', label: 'Flow', unit: 'L/min' },
  { value: 'pressure', label: 'Trykk', unit: 'bar' },
  { value: 'leaf_wetness', label: 'Bladfukt', unit: '%' },
];

const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60';
const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1';
const helpClass = 'text-[11px] text-slate-600 block mb-2';

function emptyForm(firstParcelId = ''): SensorForm {
  return {
    sensor_id: '',
    name: '',
    type: 'soil_moisture',
    parcel_id: firstParcelId,
    zone_id: '',
    depth_cm: '',
    unit: '%',
    source: 'manual',
    status: 'Online',
    notes: '',
  };
}

function latestForSensor(sensorId: string, readings: SensorReading[]): SensorReading | undefined {
  return readings
    .filter(reading => reading.sensor_id === sensorId)
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
}

function typeLabel(type: SensorType): string {
  return SENSOR_TYPES.find(item => item.value === type)?.label || type;
}

function severityClass(severity: string): string {
  if (severity === 'critical') return 'border-red-500/35 bg-red-500/10 text-red-300';
  if (severity === 'warning') return 'border-amber-500/35 bg-amber-500/10 text-amber-200';
  if (severity === 'watch') return 'border-blue-500/35 bg-blue-500/10 text-blue-200';
  return 'border-green-500/25 bg-green-500/10 text-green-300';
}

const IrrigationOliviaView: React.FC = () => {
  const [devices, setDevices] = useState<SensorDevice[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [zones, setZones] = useState<FarmZone[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<SensorForm>(() => emptyForm());

  const parcelNameById = useMemo(() => new Map(parcels.map(parcel => [parcel.id, parcel.name])), [parcels]);
  const zoneNameById = useMemo(() => new Map(zones.map(zone => [zone.id, zone.name])), [zones]);
  const filteredZones = useMemo(() => form.parcel_id ? zones.filter(zone => zone.parcel_id === form.parcel_id) : zones, [zones, form.parcel_id]);
  const advice = useMemo(() => buildDonaAnnaDecisionAdvice(readings, alerts), [readings, alerts]);

  const stats = useMemo(() => {
    const online = devices.filter(device => device.status === 'Online').length;
    const lowBattery = devices.filter(device => (device.battery_percent || 100) < 30 || device.status === 'Low Battery').length;
    const moisture = readings.find(reading => reading.type === 'soil_moisture');
    const pressure = readings.find(reading => reading.type === 'pressure');
    return { online, lowBattery, latestMoisture: moisture, latestPressure: pressure, alerts: alerts.length };
  }, [devices, readings, alerts]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [parcelRows, zoneRows, deviceRows, readingRows, alertRows] = await Promise.all([
        fetchParcels(),
        fetchFarmZones(),
        fetchSensorDevices(),
        fetchLatestSensorReadings(300),
        fetchOpenSensorAlerts(),
      ]);
      setParcels(parcelRows);
      setZones(zoneRows);
      setDevices(deviceRows);
      setReadings(readingRows);
      setAlerts(alertRows);
      setLoadState(deviceRows.length || readingRows.length || alertRows.length ? 'supabase' : 'empty');
      setLastRefresh(new Date());
      setForm(prev => ({ ...prev, parcel_id: prev.parcel_id || parcelRows[0]?.id || '' }));
    } catch (error) {
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente vanningsdata fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleTypeChange = (type: SensorType) => {
    const config = SENSOR_TYPES.find(item => item.value === type);
    setForm(prev => ({ ...prev, type, unit: config?.unit || prev.unit }));
  };

  const saveSensor = async () => {
    setErrorMessage(null);
    if (!form.sensor_id.trim() || !form.name.trim() || !form.parcel_id) {
      setErrorMessage('Sensor-ID, navn og parsell må fylles ut.');
      return;
    }

    const device: SensorDevice = {
      sensor_id: form.sensor_id.trim(),
      name: form.name.trim(),
      type: form.type,
      parcel_id: form.parcel_id,
      zone_id: form.zone_id || undefined,
      depth_cm: Number(form.depth_cm || 0) || undefined,
      unit: form.unit,
      source: form.source,
      status: form.status,
      installed_at: new Date().toISOString(),
      notes: form.notes || undefined,
    };

    setIsSaving(true);
    try {
      const saved = await upsertSensorDevice(device);
      setDevices(prev => {
        const exists = prev.some(item => item.sensor_id === saved.sensor_id);
        return exists ? prev.map(item => item.sensor_id === saved.sensor_id ? saved : item) : [saved, ...prev];
      });
      setIsModalOpen(false);
      setForm(emptyForm(form.parcel_id));
      setLoadState('supabase');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sensoren ble ikke lagret i Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen data ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,0.13),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><Waves className="text-blue-400" /> Beslutningsmotor: Vanning</h2>
              <p className="text-slate-400 text-sm mt-2">Supabase-basert oversikt over sensorer, siste målinger og anbefalt handling. Ingen randomverdier og ingen localStorage.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-[#d9b657] hover:bg-[#f0cf70] text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-[#d9b657]/20 flex items-center gap-2">
              <Plus size={20} /> Registrer sensor
            </button>
          </div>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Sensorer online', value: stats.online, icon: <Radio size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Lavt batteri', value: stats.lowBattery, icon: <Battery size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Åpne varsler', value: stats.alerts, icon: <AlertTriangle size={18} />, cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
          { label: 'Siste jordfukt', value: stats.latestMoisture ? `${stats.latestMoisture.value}${stats.latestMoisture.unit}` : '—', icon: <Droplets size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Siste trykk', value: stats.latestPressure ? `${stats.latestPressure.value}${stats.latestPressure.unit}` : '—', icon: <Gauge size={18} />, cls: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-2xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className={`glass rounded-[2.5rem] p-7 border ${severityClass(advice.severity)}`}>
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-blue-300"><Brain size={28} /></div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">Olivia-anbefaling</p>
              <h3 className="text-2xl font-bold text-white mt-1">{advice.title}</h3>
              <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">{advice.message}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {advice.reasons.map(reason => <span key={reason} className="text-[10px] font-bold px-3 py-1 bg-black/20 rounded-full border border-white/10 text-slate-300 uppercase tracking-widest flex items-center gap-1"><CheckCircle size={10} /> {reason}</span>)}
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-black/25 border border-white/10 p-4 min-w-[180px]">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Handling</p>
            <p className="text-white font-bold mt-1">{advice.recommended_action}</p>
          </div>
        </div>
      </div>

      {isLoading && !devices.length && !readings.length ? (
        <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter sensorer og målinger fra Supabase...</div>
      ) : !devices.length && !readings.length ? (
        <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center">
          <Droplets className="mx-auto text-[#d9b657] mb-3" size={34} />
          <h4 className="text-white font-bold text-lg">Ingen sensorer eller målinger ennå</h4>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">Registrer første sensor, eller legg inn målinger via IoT-dashboard/manuell måling. Olivia viser ikke demo-sensorer.</p>
          <button onClick={() => setIsModalOpen(true)} className="mt-5 bg-[#d9b657] hover:bg-[#f0cf70] text-black px-5 py-3 rounded-2xl font-bold inline-flex items-center gap-2"><Plus size={18} /> Registrer første sensor</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {devices.map(device => {
            const latest = latestForSensor(device.sensor_id, readings);
            const parcelLabel = device.parcel_id ? (parcelNameById.get(device.parcel_id) || device.parcel_id) : 'Ingen parsell';
            const zoneLabel = device.zone_id ? (zoneNameById.get(device.zone_id) || device.zone_id) : 'Ingen sone';
            return <div key={device.sensor_id} className="glass rounded-3xl p-6 border border-white/10">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-2xl bg-white/5 text-blue-400">{device.type.includes('temperature') ? <Thermometer size={24} /> : device.type.includes('pressure') ? <Gauge size={24} /> : <Droplets size={24} />}</div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${device.status === 'Online' ? 'bg-green-500/10 text-green-400 border-green-500/20' : device.status === 'Low Battery' ? 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20' : 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>{device.status}</span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">{device.name}</h3>
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-2"><MapPin size={12} /> <span>{parcelLabel}</span></div>
              <div className="text-[10px] text-slate-600 uppercase font-bold tracking-widest mb-6">{zoneLabel} · {typeLabel(device.type)}{device.depth_cm ? ` · ${device.depth_cm} cm` : ''}</div>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white tracking-tighter">{latest ? latest.value : '—'}</span>
                <span className="text-lg text-slate-500 mb-1">{latest?.unit || device.unit}</span>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-slate-400"><Battery size={14} className={(device.battery_percent || latest?.battery_percent || 100) < 30 ? 'text-yellow-400' : 'text-green-500'} /> <span className="text-[10px] font-bold">{device.battery_percent || latest?.battery_percent || '—'}%</span></div>
                <div className="flex items-center gap-2 text-slate-400"><Zap size={14} className="text-blue-400" /> <span className="text-[10px] font-bold uppercase">{device.source}</span></div>
              </div>
              {latest && <p className="text-[10px] text-slate-600 mt-3">Målt {new Date(latest.measured_at).toLocaleString('no-NO')}</p>}
            </div>;
          })}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-2xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Supabase · olivia.sensor_devices</p><h3 className="text-2xl font-bold text-white mt-1">Registrer sensor</h3><p className="text-xs text-slate-500 mt-1">Dette oppretter sensor-enheten. Målinger registreres separat, ikke tilfeldig.</p></div><button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Sensor-ID *" help="Unik ID fra sensor, LoRaWAN, manuell enhet eller intern navngiving."><input className={inputClass} placeholder="DA-BIAR-SOIL-M-30-A" value={form.sensor_id} onChange={event => setForm(prev => ({ ...prev, sensor_id: event.target.value }))} /></Field>
              <Field label="Sensornavn *" help="Lesbart navn i appen."><input className={inputClass} placeholder="Jordfukt 30 cm - Sone A" value={form.name} onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))} /></Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Type" help="Hva sensoren måler."><select className={inputClass} value={form.type} onChange={event => handleTypeChange(event.target.value as SensorType)}>{SENSOR_TYPES.map(item => <option key={item.value} className="bg-slate-900" value={item.value}>{item.label}</option>)}</select></Field>
              <Field label="Enhet" help="Måleenhet for verdien."><input className={inputClass} value={form.unit} onChange={event => setForm(prev => ({ ...prev, unit: event.target.value }))} /></Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Parsell *" help="Velg ekte parsell fra Supabase."><select className={inputClass} value={form.parcel_id} onChange={event => setForm(prev => ({ ...prev, parcel_id: event.target.value, zone_id: '' }))}><option className="bg-slate-900" value="">Velg parsell</option>{parcels.map(parcel => <option key={parcel.id} className="bg-slate-900" value={parcel.id}>{parcel.name}</option>)}</select></Field>
              <Field label="Sone" help="Valgfritt. Brukes for sonekart og råd."><select className={inputClass} value={form.zone_id} onChange={event => setForm(prev => ({ ...prev, zone_id: event.target.value }))}><option className="bg-slate-900" value="">Ingen sone</option>{filteredZones.map(zone => <option key={zone.id} className="bg-slate-900" value={zone.id}>{zone.name}</option>)}</select></Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Dybde cm" help="Valgfritt for jordfukt/EC."><input type="number" className={inputClass} placeholder="30" value={form.depth_cm} onChange={event => setForm(prev => ({ ...prev, depth_cm: event.target.value }))} /></Field>
              <Field label="Kilde" help="Hvor målingen kommer fra."><select className={inputClass} value={form.source} onChange={event => setForm(prev => ({ ...prev, source: event.target.value }))}><option className="bg-slate-900" value="manual">Manual</option><option className="bg-slate-900" value="lorawan">LoRaWAN</option><option className="bg-slate-900" value="wifi">WiFi</option><option className="bg-slate-900" value="api">API</option></select></Field>
              <Field label="Status" help="Sensorens driftsstatus."><select className={inputClass} value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value as SensorDevice['status'] }))}><option className="bg-slate-900" value="Online">Online</option><option className="bg-slate-900" value="Offline">Offline</option><option className="bg-slate-900" value="Low Battery">Low Battery</option></select></Field>
            </div>

            <Field label="Notat" help="Valgfritt. Plassering, installasjon, kalibrering eller teknisk info."><textarea className="w-full min-h-[110px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60" value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} placeholder="F.eks. montert ved unge Gordal, 30 cm dybde, kalibreres etter første uke" /></Field>

            <button onClick={saveSensor} disabled={isSaving} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {isSaving ? 'Lagrer i Supabase...' : 'Lagre sensor'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span><span className={helpClass}>{help}</span>{children}</label>;
}

export default IrrigationOliviaView;
