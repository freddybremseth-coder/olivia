import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Droplets,
  FlaskConical,
  Leaf,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { SensorReading, IrrigationEvent, FarmObservation } from '../types/farmIoT';
import { fetchLatestSensorReadings, fetchRecentFarmObservations, fetchRecentIrrigationEvents } from '../services/farmIoT';
import { buildIrrigationAdvice, type ClimateWaterInput } from '../services/irrigationAdvisor';

type AdvisorPriority = 'critical' | 'high' | 'medium' | 'low';

type AdvisorRecommendation = {
  id: string;
  priority: AdvisorPriority;
  title: string;
  summary: string;
  action: string;
  source: string;
};

const BIAR = { lat: 38.6294, lon: -0.7667, elevation: 650 };

function priorityClass(priority: AdvisorPriority): string {
  if (priority === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (priority === 'high') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (priority === 'medium') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-green-500/20 bg-green-500/10 text-green-400';
}

function priorityLabel(priority: AdvisorPriority): string {
  if (priority === 'critical') return 'Kritisk';
  if (priority === 'high') return 'Høy';
  if (priority === 'medium') return 'Middels';
  return 'Lav';
}

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sum(values: Array<number | null | undefined>): number {
  return values.reduce((acc, value) => acc + (Number(value) || 0), 0);
}

async function fetchClimateInput(): Promise<ClimateWaterInput> {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const start = new Date(today);
    start.setDate(today.getDate() - 30);
    const archiveUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${BIAR.lat}&longitude=${BIAR.lon}&elevation=${BIAR.elevation}&start_date=${fmtDate(start)}&end_date=${fmtDate(yesterday)}&daily=precipitation_sum,et0_fao_evapotranspiration,vapor_pressure_deficit_max,temperature_2m_max&timezone=auto&cell_selection=land`;
    const archive = await fetch(archiveUrl).then(res => res.json());
    const daily = archive?.daily;
    const rain30 = sum(daily?.precipitation_sum || []);
    const et030 = sum(daily?.et0_fao_evapotranspiration || []);
    const rain7 = sum((daily?.precipitation_sum || []).slice(-7));
    const et07 = sum((daily?.et0_fao_evapotranspiration || []).slice(-7));
    const hotDays7 = (daily?.temperature_2m_max || []).slice(-7).filter((v: number) => Number(v) >= 32).length;

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${BIAR.lat}&longitude=${BIAR.lon}&elevation=${BIAR.elevation}&daily=precipitation_sum&forecast_days=7&timezone=auto`;
    const forecast = await fetch(forecastUrl).then(res => res.json()).catch(() => undefined);
    const forecastRain7d = sum(forecast?.daily?.precipitation_sum || []);

    return {
      rain7d: Math.round(rain7),
      rain30d: Math.round(rain30),
      et0_7d: Math.round(et07),
      et0_30d: Math.round(et030),
      deficit7d: Math.round(et07 - rain7),
      deficit30d: Math.round(et030 - rain30),
      hotDays7,
      forecastRain7d: Math.round(forecastRain7d),
    };
  } catch (error) {
    console.warn('[FarmAdvisorView] climate fetch failed', error);
    return {};
  }
}

function localArray<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function buildRecommendations(params: {
  readings: SensorReading[];
  irrigationEvents: IrrigationEvent[];
  observations: FarmObservation[];
  climate: ClimateWaterInput;
}): AdvisorRecommendation[] {
  const recommendations: AdvisorRecommendation[] = [];
  const irrigationAdvice = buildIrrigationAdvice({ readings: params.readings, climate: params.climate, irrigationEvents: params.irrigationEvents });
  const criticalIrrigation = irrigationAdvice.filter(item => item.severity === 'critical');
  const warningIrrigation = irrigationAdvice.filter(item => item.severity === 'warning');
  const highEc = params.readings.filter(r => ['soil_ec', 'water_ec'].includes(r.type) && Number(r.value) >= (r.type === 'soil_ec' ? 2.5 : 1.8));
  const lowBattery = params.readings.filter(r => typeof r.battery_percent === 'number' && r.battery_percent < 25);
  const recentProblems = params.observations.filter(obs => ['irrigation', 'pest', 'disease', 'soil', 'water'].includes(obs.category));
  const traceBatches = localArray<any>('olivia_traceability_batches');
  const organicTasks = localArray<any>('olivia_organic_tasks').filter(task => task.status !== 'done');

  if (criticalIrrigation.length) {
    recommendations.push({
      id: 'critical-irrigation',
      priority: 'critical',
      title: `${criticalIrrigation.length} sone(r) trenger vann-/feltkontroll`,
      summary: criticalIrrigation.slice(0, 2).map(item => `${item.zone_name}: ${item.title}`).join(' · '),
      action: 'Start med sonene som har lav dyp jordfukt eller lav jordfukt kombinert med høyt vannunderskudd. Sjekk felt før lang vanning.',
      source: 'Vannråd 2.0 + klima + IoT',
    });
  } else if (warningIrrigation.length) {
    recommendations.push({
      id: 'warning-irrigation',
      priority: 'high',
      title: `${warningIrrigation.length} sone(r) bør inspiseres`,
      summary: warningIrrigation.slice(0, 2).map(item => `${item.zone_name}: ${item.message}`).join(' · '),
      action: 'Sjekk trykk, flow, filter og dryppslanger. Opprett feltobservasjon hvis du finner årsaken.',
      source: 'Vannråd 2.0',
    });
  }

  if (typeof params.climate.deficit7d === 'number' && params.climate.deficit7d > 25) {
    recommendations.push({
      id: 'water-deficit',
      priority: 'high',
      title: 'Høyt klimatisk vannunderskudd siste 7 dager',
      summary: `Underskudd ca. ${params.climate.deficit7d} mm. Regn siste 7 dager: ${params.climate.rain7d ?? '—'} mm.`,
      action: 'Prioriter unge trær og soner med lav jordfukt på 60 cm. Vann helst kveld/natt.',
      source: 'Klima Stats',
    });
  }

  if (highEc.length) {
    recommendations.push({
      id: 'salinity-watch',
      priority: 'high',
      title: 'Salt/EC bør følges tett',
      summary: `${highEc.length} måling(er) ligger på varslingsnivå for jord/vann-EC.`,
      action: 'Sammenlign jord-EC med vann-EC, vurder jord-/vannprøve og kontroller drenering før store endringer i vanning.',
      source: 'Salt / pH + IoT',
    });
  }

  if (lowBattery.length) {
    recommendations.push({
      id: 'low-battery',
      priority: 'medium',
      title: 'Sensorbatterier bør sjekkes',
      summary: `${lowBattery.length} sensor(er) har lavt batteri under 25%.`,
      action: 'Bytt/lade batterier før varmeperioder eller viktige vanningsbeslutninger.',
      source: 'IoT Dashboard',
    });
  }

  if (recentProblems.length) {
    recommendations.push({
      id: 'field-observations',
      priority: 'medium',
      title: 'Feltobservasjoner bør følges opp',
      summary: `${recentProblems.length} nylige observasjon(er) knyttet til vann, skadedyr, jord eller sykdom.`,
      action: 'Koble observasjonene til oppgaver eller vannråd slik at årsakene ikke forsvinner i loggen.',
      source: 'Feltlogg',
    });
  }

  const batchesMissingLab = traceBatches.filter(batch => batch.type === 'evoo' && (!batch.acidity_percent || !batch.polyphenols_mg_kg));
  if (batchesMissingLab.length) {
    recommendations.push({
      id: 'batch-lab',
      priority: 'medium',
      title: 'Batcher mangler lab-/kvalitetsdata',
      summary: `${batchesMissingLab.length} EVOO-batch(er) mangler syregrad eller polyfenoler.`,
      action: 'Legg inn labverdier før QR-side, etikett eller premium salgsargument brukes.',
      source: 'Batch / QR',
    });
  }

  if (organicTasks.length) {
    recommendations.push({
      id: 'organic-tasks',
      priority: 'medium',
      title: 'Økologisk oppfølging har åpne punkter',
      summary: `${organicTasks.length} åpne oppgave(r) knyttet til øko/støtte.`,
      action: 'Prioriter eierregistrering, parceller, befaring og dokumentpakke før neste kontroll.',
      source: 'Øko / støtte',
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      id: 'all-good',
      priority: 'low',
      title: 'Ingen kritiske avvik akkurat nå',
      summary: 'Tilgjengelige data viser ingen tydelige røde flagg.',
      action: 'Fortsett ukentlig gjennomgang av sonekart, vannråd, feltlogg og batcher.',
      source: 'Samlet gårdsdata',
    });
  }

  const order = { critical: 4, high: 3, medium: 2, low: 1 };
  return recommendations.sort((a, b) => order[b.priority] - order[a.priority]);
}

const FarmAdvisorView: React.FC = () => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [irrigationEvents, setIrrigationEvents] = useState<IrrigationEvent[]>([]);
  const [observations, setObservations] = useState<FarmObservation[]>([]);
  const [climate, setClimate] = useState<ClimateWaterInput>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sensorRows, irrigationRows, observationRows, climateInput] = await Promise.all([
        fetchLatestSensorReadings(1000).catch(() => []),
        fetchRecentIrrigationEvents(200).catch(() => []),
        fetchRecentFarmObservations(200).catch(() => []),
        fetchClimateInput(),
      ]);
      setReadings(sensorRows);
      setIrrigationEvents(irrigationRows);
      setObservations(observationRows);
      setClimate(climateInput);
      setLastRefresh(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const recommendations = useMemo(() => buildRecommendations({ readings, irrigationEvents, observations, climate }), [readings, irrigationEvents, observations, climate]);
  const critical = recommendations.filter(r => r.priority === 'critical').length;
  const high = recommendations.filter(r => r.priority === 'high').length;
  const medium = recommendations.filter(r => r.priority === 'medium').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Sparkles className="text-green-400" /> Olivia Advisor</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Samlet rådgiver · DonaAnna · Biar 650 moh. · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Kritisk', value: critical, icon: <AlertTriangle size={18} />, cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
          { label: 'Høy prioritet', value: high, icon: <ShieldCheck size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Middels', value: medium, icon: <ClipboardList size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Datakilder', value: 8, icon: <BarChart3 size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4">
          <Leaf className="text-green-400 mt-1" />
          <div>
            <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-2">Hva rådgiveren gjør</p>
            <p className="text-white font-bold">Olivia samler signaler fra klima, IoT, vanning, feltlogg, salt/pH, batcher og økologiske oppgaver.</p>
            <p className="text-xs text-slate-500 mt-2">Målet er ikke bare å vise tall, men å gi en prioritert handlingsliste for hva du bør gjøre først på gården.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {recommendations.map(item => (
          <div key={item.id} className={`glass rounded-[2rem] p-6 border ${priorityClass(item.priority)}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{priorityLabel(item.priority)} · {item.source}</p>
                <h3 className="text-xl text-white font-bold">{item.title}</h3>
              </div>
              {item.priority === 'critical' ? <AlertTriangle /> : item.priority === 'low' ? <CheckCircle2 /> : <Sparkles />}
            </div>
            <p className="text-sm text-slate-400 mt-4 leading-relaxed">{item.summary}</p>
            <div className="mt-5 p-4 rounded-2xl bg-black/20 border border-white/10">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Anbefalt handling</p>
              <p className="text-sm text-white font-bold mt-2 leading-relaxed">{item.action}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-[2rem] p-5 border border-white/10"><Droplets className="text-blue-400 mb-3" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Vannunderskudd 7d</p><p className="text-3xl font-black text-white mt-1">{climate.deficit7d ?? '—'} mm</p></div>
        <div className="glass rounded-[2rem] p-5 border border-white/10"><FlaskConical className="text-purple-400 mb-3" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Sensorer lest</p><p className="text-3xl font-black text-white mt-1">{readings.length}</p></div>
        <div className="glass rounded-[2rem] p-5 border border-white/10"><ClipboardList className="text-green-400 mb-3" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Feltobservasjoner</p><p className="text-3xl font-black text-white mt-1">{observations.length}</p></div>
      </div>
    </div>
  );
};

export default FarmAdvisorView;
