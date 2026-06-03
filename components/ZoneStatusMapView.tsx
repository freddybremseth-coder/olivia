import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BatteryLow,
  CheckCircle2,
  Droplets,
  FlaskConical,
  Gauge,
  Loader2,
  Map,
  RefreshCcw,
  ShieldCheck,
  Waves,
  WifiOff,
} from 'lucide-react';
import type { FarmZone, SensorReading } from '../types/farmIoT';
import { fetchFarmZones, fetchLatestSensorReadings } from '../services/farmIoT';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

type LoadState = 'loading' | 'supabase' | 'empty' | 'error';
type ZoneSeverity = 'optimal' | 'watch' | 'warning' | 'critical' | 'offline';

type ZoneSummary = {
  id: string;
  name: string;
  description?: string;
  severity: ZoneSeverity;
  score: number;
  waterStatus: ZoneSeverity;
  salinityStatus: ZoneSeverity;
  systemStatus: ZoneSeverity;
  latest: {
    soilMoisture?: number;
    soilMoisture60?: number;
    soilEc?: number;
    waterEc?: number;
    flow?: number;
    pressure?: number;
    battery?: number;
  };
  reasons: string[];
  recommendedAction: string;
};

function latest(readings: SensorReading[], type: string, zoneId?: string, depth?: number): SensorReading | undefined {
  return readings
    .filter(reading => {
      const typeOk = reading.type === type;
      const zoneOk = !zoneId || (reading.zone_id || 'farm') === zoneId;
      const depthOk = typeof depth !== 'number' || (typeof reading.depth_cm === 'number' && Math.abs(reading.depth_cm - depth) <= 15);
      return typeOk && zoneOk && depthOk;
    })
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
}

function severityWeight(severity: ZoneSeverity): number {
  if (severity === 'critical') return 5;
  if (severity === 'offline') return 4;
  if (severity === 'warning') return 3;
  if (severity === 'watch') return 2;
  return 1;
}

function combineSeverity(...values: ZoneSeverity[]): ZoneSeverity {
  return values.sort((a, b) => severityWeight(b) - severityWeight(a))[0] || 'optimal';
}

function statusClass(severity: ZoneSeverity): string {
  if (severity === 'critical') return 'border-red-500/40 bg-red-500/15 text-red-400';
  if (severity === 'offline') return 'border-slate-500/30 bg-slate-500/10 text-slate-300';
  if (severity === 'warning') return 'border-yellow-500/35 bg-yellow-500/10 text-yellow-400';
  if (severity === 'watch') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-green-500/25 bg-green-500/10 text-green-400';
}

function statusLabel(severity: ZoneSeverity): string {
  if (severity === 'critical') return 'Kritisk';
  if (severity === 'offline') return 'Manglende data';
  if (severity === 'warning') return 'Handling';
  if (severity === 'watch') return 'Følg med';
  return 'OK';
}

function buildZoneSummary(zone: FarmZone, readings: SensorReading[]): ZoneSummary {
  const m30 = latest(readings, 'soil_moisture', zone.id, 30) || latest(readings, 'soil_moisture', zone.id);
  const m60 = latest(readings, 'soil_moisture', zone.id, 60);
  const soilEc = latest(readings, 'soil_ec', zone.id);
  const waterEc = latest(readings, 'water_ec') || latest(readings, 'water_ec', zone.id);
  const flow = latest(readings, 'flow', zone.id) || latest(readings, 'flow');
  const pressure = latest(readings, 'pressure', zone.id) || latest(readings, 'pressure');
  const zoneReadings = readings.filter(r => (r.zone_id || 'farm') === zone.id);
  const batteryValues = zoneReadings.map(r => r.battery_percent).filter((v): v is number => typeof v === 'number');
  const minBattery = batteryValues.length ? Math.min(...batteryValues) : undefined;

  const reasons: string[] = [];
  let waterStatus: ZoneSeverity = 'optimal';
  let salinityStatus: ZoneSeverity = 'optimal';
  let systemStatus: ZoneSeverity = zoneReadings.length ? 'optimal' : 'offline';
  let score = 100;
  let recommendedAction = 'Ingen akutt handling. Fortsett overvåkning.';

  if (!zoneReadings.length) {
    reasons.push('Ingen ferske sensormålinger for sonen.');
    score -= 35;
    recommendedAction = 'Sjekk om sonen mangler sensor, signal eller batteri.';
  }

  if (typeof m60?.value === 'number' && m60.value < 28) {
    waterStatus = 'critical';
    reasons.push(`Dyp jordfukt er kritisk lav: ${m60.value}%.`);
    score -= 35;
    recommendedAction = 'Prioriter vanning/kontroll i rotsonen.';
  } else if (typeof m30?.value === 'number' && m30.value < 30) {
    waterStatus = 'critical';
    reasons.push(`Jordfukt er kritisk lav: ${m30.value}%.`);
    score -= 30;
    recommendedAction = 'Vann eller inspiser sonen så snart som praktisk mulig.';
  } else if (typeof m30?.value === 'number' && m30.value < 38) {
    waterStatus = 'watch';
    reasons.push(`Jordfukt nærmer seg lavt nivå: ${m30.value}%.`);
    score -= 12;
  }

  if (typeof soilEc?.value === 'number' && soilEc.value > 3.5) {
    salinityStatus = 'critical';
    reasons.push(`Jord-EC er høy: ${soilEc.value} dS/m.`);
    score -= 30;
    recommendedAction = 'Ta jordprøve og vurder salt-/dreneringstiltak.';
  } else if (typeof soilEc?.value === 'number' && soilEc.value > 2.5) {
    salinityStatus = 'warning';
    reasons.push(`Jord-EC er forhøyet: ${soilEc.value} dS/m.`);
    score -= 18;
    if (recommendedAction.includes('Ingen')) recommendedAction = 'Følg EC-trend, kontroller vannkilde og vurder jordprøve.';
  }

  if (typeof waterEc?.value === 'number' && waterEc.value > 1.8) {
    salinityStatus = combineSeverity(salinityStatus, 'warning');
    reasons.push(`Vann-EC er forhøyet: ${waterEc.value} dS/m.`);
    score -= 10;
  }

  if (typeof pressure?.value === 'number' && typeof flow?.value === 'number' && pressure.value < 0.8 && flow.value > 5) {
    systemStatus = 'warning';
    reasons.push(`Lavt trykk (${pressure.value} bar) samtidig som flow er aktiv (${flow.value} L/min).`);
    score -= 20;
    recommendedAction = 'Sjekk filter, pumpe, koblinger og dryppslanger.';
  }

  if (typeof minBattery === 'number' && minBattery < 15) {
    systemStatus = combineSeverity(systemStatus, 'critical');
    reasons.push(`Kritisk lavt sensorbatteri: ${minBattery}%.`);
    score -= 20;
  } else if (typeof minBattery === 'number' && minBattery < 30) {
    systemStatus = combineSeverity(systemStatus, 'warning');
    reasons.push(`Lavt sensorbatteri: ${minBattery}%.`);
    score -= 10;
  }

  if (!reasons.length) reasons.push('Sonen ser stabil ut i tilgjengelige data.');

  const severity = combineSeverity(waterStatus, salinityStatus, systemStatus);

  return {
    id: zone.id,
    name: zone.name,
    description: zone.description,
    severity,
    score: Math.max(0, Math.min(100, Math.round(score))),
    waterStatus,
    salinityStatus,
    systemStatus,
    latest: {
      soilMoisture: m30?.value,
      soilMoisture60: m60?.value,
      soilEc: soilEc?.value,
      waterEc: waterEc?.value,
      flow: flow?.value,
      pressure: pressure?.value,
      battery: minBattery,
    },
    reasons,
    recommendedAction,
  };
}

function zonesFromReadings(readings: SensorReading[]): FarmZone[] {
  return Array.from(new Set(readings.map(reading => reading.zone_id || 'farm')))
    .map(id => ({ id, parcel_id: readings.find(reading => (reading.zone_id || 'farm') === id)?.parcel_id || 'unknown', name: id === 'farm' ? 'Hele gården' : id } as FarmZone));
}

const ZoneStatusMapView: React.FC = () => {
  const [zones, setZones] = useState<FarmZone[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [zoneRows, readingRows] = await Promise.all([
        fetchFarmZones(),
        fetchLatestSensorReadings(1000),
      ]);
      const derivedZones = zoneRows.length ? zoneRows : zonesFromReadings(readingRows);
      setZones(derivedZones);
      setReadings(readingRows);
      setLoadState(derivedZones.length || readingRows.length ? 'supabase' : 'empty');
      setSelectedZoneId(prev => prev && derivedZones.some(zone => zone.id === prev) ? prev : derivedZones[0]?.id || null);
      setLastRefresh(new Date());
    } catch (error) {
      setZones([]);
      setReadings([]);
      setLoadState('error');
      setSelectedZoneId(null);
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente sone-/sensordata fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const summaries = useMemo(() => zones.map(zone => buildZoneSummary(zone, readings)).sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity) || a.score - b.score), [zones, readings]);
  const selected = summaries.find(z => z.id === selectedZoneId) || summaries[0];
  const critical = summaries.filter(z => z.severity === 'critical').length;
  const warning = summaries.filter(z => z.severity === 'warning').length;
  const watch = summaries.filter(z => z.severity === 'watch').length;
  const offline = summaries.filter(z => z.severity === 'offline').length;
  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen sone-/sensordata ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,0.12),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><Map className="text-green-400" /> Sonekart / Statuskart</h2>
              <p className="text-slate-400 text-sm mt-2">Prioriteringskart basert på ekte soner og sensormålinger fra Supabase. Ingen demo-soner.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
          </button>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      {isLoading && loadState === 'loading' ? <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter sonestatus fra Supabase...</div> : null}

      {loadState === 'empty' ? (
        <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center">
          <Map className="mx-auto text-[#d9b657] mb-3" size={34} />
          <h4 className="text-white font-bold text-lg">Ingen soner eller målinger ennå</h4>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">Opprett soner i Supabase eller registrer sensormålinger med zone_id. Sonekartet viser ikke demo-soner.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Kritisk', value: critical, icon: <AlertTriangle size={18} />, cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
          { label: 'Handling', value: warning, icon: <Gauge size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Følg med', value: watch, icon: <ShieldCheck size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Manglende data', value: offline, icon: <WifiOff size={18} />, cls: 'border-slate-500/20 bg-slate-500/10 text-slate-300' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      {summaries.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-7 glass rounded-[2rem] p-6 border border-white/10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Visuelt statuskart</h3>
            <div className="relative min-h-[520px] rounded-[2rem] border border-white/10 bg-gradient-to-br from-green-950/20 via-slate-900 to-black overflow-hidden p-6">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #22c55e 0, transparent 22%), radial-gradient(circle at 80% 70%, #84cc16 0, transparent 25%)' }} />
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                {summaries.map((zone, index) => (
                  <button
                    key={zone.id}
                    onClick={() => setSelectedZoneId(zone.id)}
                    className={`text-left rounded-[2rem] p-5 border transition-all hover:scale-[1.02] ${statusClass(zone.severity)} ${selected?.id === zone.id ? 'ring-2 ring-green-400/60' : ''}`}
                    style={{ minHeight: index === 0 ? 190 : 150 }}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-widest">{statusLabel(zone.severity)}</p>
                        <p className="text-lg text-white font-bold mt-1">{zone.name}</p>
                      </div>
                      <div className="text-right"><p className="text-[10px] text-slate-500">Score</p><p className="text-3xl text-white font-black">{zone.score}</p></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-5">
                      <div className="p-2 bg-black/20 rounded-xl"><Droplets size={14} /><p className="text-[10px] mt-1">{zone.latest.soilMoisture ?? '—'}%</p></div>
                      <div className="p-2 bg-black/20 rounded-xl"><FlaskConical size={14} /><p className="text-[10px] mt-1">{zone.latest.soilEc ?? '—'} EC</p></div>
                      <div className="p-2 bg-black/20 rounded-xl"><Gauge size={14} /><p className="text-[10px] mt-1">{zone.latest.pressure ?? '—'} bar</p></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4 line-clamp-2">{zone.recommendedAction}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="xl:col-span-5 space-y-6">
            {selected && (
              <div className={`glass rounded-[2rem] p-6 border ${statusClass(selected.severity)}`}>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1">Valgt sone</p>
                <h3 className="text-2xl text-white font-bold">{selected.name}</h3>
                {selected.description && <p className="text-sm text-slate-500 mt-2">{selected.description}</p>}
                <p className="text-sm text-white font-bold mt-5">{selected.recommendedAction}</p>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  {[
                    ['Jordfukt 30 cm', selected.latest.soilMoisture !== undefined ? `${selected.latest.soilMoisture}%` : '—'],
                    ['Jordfukt 60 cm', selected.latest.soilMoisture60 !== undefined ? `${selected.latest.soilMoisture60}%` : '—'],
                    ['Jord EC', selected.latest.soilEc !== undefined ? `${selected.latest.soilEc} dS/m` : '—'],
                    ['Vann EC', selected.latest.waterEc !== undefined ? `${selected.latest.waterEc} dS/m` : '—'],
                    ['Flow', selected.latest.flow !== undefined ? `${selected.latest.flow} L/min` : '—'],
                    ['Trykk', selected.latest.pressure !== undefined ? `${selected.latest.pressure} bar` : '—'],
                    ['Batteri lavest', selected.latest.battery !== undefined ? `${selected.latest.battery}%` : '—'],
                    ['Score', selected.score],
                  ].map(([label, value]) => <div key={label} className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-sm text-white font-bold mt-1">{value}</p></div>)}
                </div>

                <div className="mt-5 pt-4 border-t border-white/10 space-y-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Grunnlag</p>
                  {selected.reasons.map(reason => <p key={reason} className="text-xs text-slate-400 leading-relaxed">• {reason}</p>)}
                </div>
              </div>
            )}

            <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Fargeforklaring</h3>
              <div className="space-y-3">
                {[
                  ['Grønn', 'OK – ingen tydelige avvik', 'text-green-400'],
                  ['Blå', 'Følg med – mulig utvikling', 'text-blue-400'],
                  ['Gul', 'Handling anbefales', 'text-yellow-400'],
                  ['Rød', 'Kritisk – prioriter først', 'text-red-400'],
                  ['Grå', 'Manglende data/sensor', 'text-slate-300'],
                ].map(([label, text, cls]) => <div key={label} className="flex items-center gap-3"><span className={`w-3 h-3 rounded-full ${cls.replace('text', 'bg')}`} /><p className="text-xs text-slate-400"><strong className="text-white">{label}:</strong> {text}</p></div>)}
              </div>
            </div>

            <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
              <p className="text-sm text-white font-bold">Neste forbedring</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">Når faktiske polygoner/koordinater for sonene legges inn i Supabase, kan dette erstattes av et ekte kartlag over tomten. Foreløpig fungerer dette som et praktisk prioriteringskart.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZoneStatusMapView;
