import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Beaker,
  Droplets,
  FlaskConical,
  Gauge,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Waves,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SensorReading } from '../types/farmIoT';
import { fetchLatestSensorReadings } from '../services/farmIoT';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

type LoadState = 'loading' | 'supabase' | 'empty' | 'error';
type RiskLevel = 'low' | 'watch' | 'warning' | 'critical';

type ZoneSalinity = {
  zoneId: string;
  zoneName: string;
  soilEc?: number;
  soilPh?: number;
  waterEc?: number;
  waterPh?: number;
  trendEc: number;
  risk: RiskLevel;
  recommendation: string;
  reasons: string[];
};

function latest(readings: SensorReading[], type: string, zoneId?: string): SensorReading | undefined {
  return readings
    .filter(reading => reading.type === type && (!zoneId || reading.zone_id === zoneId))
    .sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime())[0];
}

function trend(readings: SensorReading[], type: string, zoneId: string): number {
  const series = readings
    .filter(reading => reading.type === type && (reading.zone_id || 'farm') === zoneId)
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  if (series.length < 2) return 0;
  return Math.round((series[series.length - 1].value - series[0].value) * 100) / 100;
}

function riskClass(risk: RiskLevel): string {
  if (risk === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (risk === 'warning') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (risk === 'watch') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-green-500/20 bg-green-500/10 text-green-400';
}

function riskLabel(risk: RiskLevel): string {
  if (risk === 'critical') return 'Kritisk';
  if (risk === 'warning') return 'Viktig';
  if (risk === 'watch') return 'Følg med';
  return 'OK';
}

function uniqueZones(readings: SensorReading[]): string[] {
  const zones = readings.filter(r => ['soil_ec', 'soil_ph'].includes(r.type)).map(r => r.zone_id || 'farm');
  return Array.from(new Set(zones));
}

function buildZoneSalinity(readings: SensorReading[]): ZoneSalinity[] {
  const waterEc = latest(readings, 'water_ec')?.value;
  const waterPh = latest(readings, 'water_ph')?.value;

  return uniqueZones(readings).map(zoneId => {
    const soilEc = latest(readings, 'soil_ec', zoneId)?.value;
    const soilPh = latest(readings, 'soil_ph', zoneId)?.value;
    const trendEc = trend(readings, 'soil_ec', zoneId);
    const reasons: string[] = [];
    let risk: RiskLevel = 'low';
    let recommendation = 'Fortsett overvåkning. Sammenlign sensorverdier med jordprøve/lab med jevne mellomrom.';

    if (typeof soilEc === 'number' && soilEc > 3.5) {
      risk = 'critical';
      reasons.push(`Jord-EC er høy: ${soilEc} dS/m.`);
      recommendation = 'Ta jordprøve, vurder drenering/leaching og sjekk vannkvalitet før intensiv vanning.';
    } else if (typeof soilEc === 'number' && soilEc > 2.5) {
      risk = 'warning';
      reasons.push(`Jord-EC er forhøyet: ${soilEc} dS/m.`);
      recommendation = 'Følg utviklingen tett, sammenlign med vann-EC, vurder jordprøve og se etter saltoppbygging i tørre soner.';
    } else if (typeof soilEc === 'number' && soilEc > 1.8) {
      risk = 'watch';
      reasons.push(`Jord-EC nærmer seg følg-med-nivå: ${soilEc} dS/m.`);
    }

    if (trendEc > 0.4) {
      reasons.push(`Jord-EC øker med ca. ${trendEc} dS/m i perioden.`);
      if (risk === 'low') risk = 'watch';
      if (risk === 'watch') recommendation = 'EC-trenden øker. Kontroller om vanning, drenering eller vannkilde bidrar til saltoppbygging.';
    }

    if (typeof waterEc === 'number' && waterEc > 1.8) {
      reasons.push(`Vann-EC er forhøyet: ${waterEc} dS/m.`);
      if (risk === 'low') risk = 'watch';
      if (risk === 'watch') risk = 'warning';
      recommendation = 'Kontroller vannkilde og vurder vann-/jordprøve før langvarig vanning i varme perioder.';
    }

    if (typeof soilPh === 'number' && (soilPh < 6 || soilPh > 8.2)) {
      reasons.push(`Jord-pH er utenfor ønsket område: ${soilPh}.`);
      if (risk === 'low') risk = 'watch';
    }

    if (typeof waterPh === 'number' && (waterPh < 6 || waterPh > 8.2)) {
      reasons.push(`Vann-pH bør følges: ${waterPh}.`);
      if (risk === 'low') risk = 'watch';
    }

    if (!reasons.length) reasons.push('Ingen tydelige salt-/pH-avvik i tilgjengelige data.');

    return {
      zoneId,
      zoneName: zoneId,
      soilEc,
      soilPh,
      waterEc,
      waterPh,
      trendEc,
      risk,
      recommendation,
      reasons,
    };
  }).sort((a, b) => {
    const order = { critical: 4, warning: 3, watch: 2, low: 1 };
    return order[b.risk] - order[a.risk];
  });
}

function chartData(readings: SensorReading[]) {
  return readings
    .filter(r => ['soil_ec', 'water_ec', 'soil_ph', 'water_ph'].includes(r.type))
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
    .map(r => ({
      date: new Date(r.measured_at).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit' }),
      zone: r.zone_id || 'farm',
      type: r.type,
      value: r.value,
    }));
}

const SalinityDashboard: React.FC = () => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const rows = await fetchLatestSensorReadings(1000);
      const relevant = rows.filter(r => ['soil_ec', 'water_ec', 'soil_ph', 'water_ph'].includes(r.type));
      setReadings(relevant);
      setLoadState(relevant.length ? 'supabase' : 'empty');
      setLastRefresh(new Date());
    } catch (error) {
      setReadings([]);
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente salt-/pH-data fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const zones = useMemo(() => buildZoneSalinity(readings), [readings]);
  const data = useMemo(() => chartData(readings), [readings]);
  const topRisk = zones[0];
  const latestWaterEc = latest(readings, 'water_ec')?.value;
  const latestWaterPh = latest(readings, 'water_ph')?.value;
  const soilEcValues = zones.map(z => z.soilEc).filter((value): value is number => typeof value === 'number');
  const avgSoilEc = soilEcValues.length ? Math.round((soilEcValues.reduce((acc, value) => acc + value, 0) / soilEcValues.length) * 100) / 100 : undefined;
  const warningZones = zones.filter(z => z.risk === 'warning' || z.risk === 'critical').length;
  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen EC/pH-data ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,0.12),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1">
                <FlaskConical className="text-green-400" /> Salt / EC / pH Dashboard
              </h2>
              <p className="text-slate-400 text-sm mt-2">Ekte EC- og pH-målinger fra Supabase. Ingen demo-verdier og ingen simulerte saltdata.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">
                {sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
          </button>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      {isLoading && loadState === 'loading' ? (
        <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter EC/pH-målinger fra Supabase...</div>
      ) : null}

      {loadState === 'empty' ? (
        <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center">
          <FlaskConical className="mx-auto text-[#d9b657] mb-3" size={34} />
          <h4 className="text-white font-bold text-lg">Ingen EC/pH-data ennå</h4>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">Registrer målinger for jord-EC, vann-EC, jord-pH eller vann-pH i IoT-modulen. Dette dashboardet viser ikke demo-data fordi feil saltverdier kan gi feil beslutninger.</p>
        </div>
      ) : null}

      {topRisk && (
        <div className={`glass rounded-[2rem] p-6 border ${riskClass(topRisk.risk)}`}>
          <p className="text-[10px] uppercase font-bold tracking-widest mb-2">Viktigste salt-/pH-vurdering</p>
          <p className="text-xl text-white font-bold">{topRisk.zoneName}: {riskLabel(topRisk.risk)}</p>
          <p className="text-sm text-slate-400 mt-2">{topRisk.recommendation}</p>
          <p className="text-xs text-slate-500 mt-3">Grunnlag: {topRisk.reasons.join(' ')}</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Snitt jord-EC', value: avgSoilEc !== undefined ? `${avgSoilEc} dS/m` : '—', icon: <Gauge size={18} />, cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
          { label: 'Vann-EC', value: latestWaterEc !== undefined ? `${latestWaterEc} dS/m` : '—', icon: <Waves size={18} />, cls: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400' },
          { label: 'Vann-pH', value: latestWaterPh !== undefined ? latestWaterPh : '—', icon: <Beaker size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Soner med varsel', value: warningZones, icon: <AlertTriangle size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
        ].map(card => (
          <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}>
            <div className="mb-2">{card.icon}</div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p>
            <p className="text-3xl font-black text-white mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <TrendingUp size={14} /> EC/pH målinger over tid
          </h3>
          {data.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }} />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e22" name="Verdi" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-center text-sm text-slate-500 border border-dashed border-white/10 rounded-2xl">Ingen EC/pH-målinger å tegne ennå.</div>
          )}
        </div>

        <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ShieldCheck size={14} /> Hvordan bruke tallene
          </h3>
          <div className="space-y-4 text-sm text-slate-400 leading-relaxed">
            <p><strong className="text-white">Jord-EC</strong> viser salt/næringsledning i jorden. Trend er ofte viktigere enn ett enkelt tall.</p>
            <p><strong className="text-white">Vann-EC</strong> viser om vanningsvannet kan bidra til saltoppbygging over tid.</p>
            <p><strong className="text-white">pH</strong> påvirker næringstilgang. Avvik bør bekreftes med jord-/vannprøve.</p>
            <p><strong className="text-white">Sensorer er beslutningsstøtte</strong>. Bruk lokale jordprøver og feltobservasjoner som kontroll.</p>
          </div>
        </div>
      </div>

      {zones.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Soner</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {zones.map(zone => (
              <div key={zone.zoneId} className={`glass rounded-[2rem] p-5 border ${riskClass(zone.risk)}`}>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{riskLabel(zone.risk)}</p>
                    <h3 className="text-lg font-bold text-white">{zone.zoneName}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Trend EC</p>
                    <p className="text-2xl font-black text-white flex items-center gap-1 justify-end">
                      {zone.trendEc > 0 ? <TrendingUp size={16} className="text-red-400" /> : <TrendingDown size={16} className="text-green-400" />}
                      {zone.trendEc}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Jord EC</p><p className="text-sm text-white font-bold mt-1">{zone.soilEc ?? '—'} dS/m</p></div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Jord pH</p><p className="text-sm text-white font-bold mt-1">{zone.soilPh ?? '—'}</p></div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Vann EC</p><p className="text-sm text-white font-bold mt-1">{zone.waterEc ?? '—'} dS/m</p></div>
                  <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Vann pH</p><p className="text-sm text-white font-bold mt-1">{zone.waterPh ?? '—'}</p></div>
                </div>

                <p className="text-sm text-slate-400 mt-4 leading-relaxed">{zone.recommendation}</p>
                <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
                  {zone.reasons.map(reason => <p key={reason} className="text-xs text-slate-500">• {reason}</p>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <p className="text-sm text-white font-bold">Anbefalt praksis</p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Bruk EC/pH-sensorene til trend og tidlig varsling. Bekreft viktige beslutninger med jordprøve, vannprøve og feltobservasjon, spesielt hvis du vurderer endringer i vanningsstrategi, leaching eller jordforbedring.
        </p>
      </div>
    </div>
  );
};

export default SalinityDashboard;
