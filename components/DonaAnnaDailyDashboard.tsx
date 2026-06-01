import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Droplets,
  Gauge,
  Leaf,
  ListChecks,
  Mountain,
  RefreshCcw,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import {
  DONA_ANNA_BIAR_SEASON_SETTINGS,
  type SensorAlert,
  type SensorReading,
  type FarmObservation,
  type IrrigationEvent,
} from '../types/farmIoT';
import {
  buildDonaAnnaDecisionAdvice,
  fetchLatestSensorReadings,
  fetchOpenSensorAlerts,
  fetchRecentFarmObservations,
  fetchRecentIrrigationEvents,
  type FarmDecisionAdvice,
} from '../services/farmIoT';

type DataSource = 'supabase' | 'local_demo';

type ActionCard = {
  title: string;
  description: string;
  priority: 'Lav' | 'Middels' | 'Høy' | 'Kritisk';
  icon: React.ReactNode;
};

const demoReadings: SensorReading[] = [
  {
    id: 'demo-soil-moisture',
    sensor_id: 'DA-BIAR-SOIL-M-30-A',
    parcel_id: 'biar-main',
    zone_id: 'zone-a',
    tree_group: 'Unge Gordal',
    depth_cm: 30,
    type: 'soil_moisture',
    value: 42,
    unit: '%',
    measured_at: new Date().toISOString(),
    source: 'simulation',
  },
  {
    id: 'demo-soil-ec',
    sensor_id: 'DA-BIAR-SOIL-EC-B',
    parcel_id: 'biar-main',
    zone_id: 'zone-b',
    tree_group: 'Eldre blanding',
    depth_cm: 40,
    type: 'soil_ec',
    value: 2.3,
    unit: 'dS/m',
    measured_at: new Date().toISOString(),
    source: 'simulation',
  },
  {
    id: 'demo-pressure',
    sensor_id: 'DA-BIAR-PRESSURE-A',
    parcel_id: 'biar-main',
    zone_id: 'zone-a',
    type: 'pressure',
    value: 0.6,
    unit: 'bar',
    measured_at: new Date().toISOString(),
    source: 'simulation',
  },
  {
    id: 'demo-flow',
    sensor_id: 'DA-BIAR-FLOW-A',
    parcel_id: 'biar-main',
    zone_id: 'zone-a',
    type: 'flow',
    value: 28,
    unit: 'L/min',
    measured_at: new Date().toISOString(),
    source: 'simulation',
  },
];

function monthName(monthIndex: number): string {
  return new Date(2026, monthIndex - 1, 1).toLocaleString('no-NO', { month: 'long' });
}

function getBiarSeasonText(date = new Date()): string {
  const month = date.getMonth() + 1;

  if ([1, 2].includes(month)) return 'Beskjæring, vedlikehold, planlegging og jordforbedring.';
  if ([3, 4].includes(month)) return 'Jordprøver, gjødsling, kontroll av vanningssystem og vårvekst.';
  if ([5, 6].includes(month)) return 'Blomstring, fruktsetting og stabil vannbalanse.';
  if ([7, 8].includes(month)) return 'Tørkestress, dryppslanger, unge trær og EC/salt bør følges tett.';
  if (month === 9) return 'Bordoliven-vurdering, skadedyr, saltstatus og høsteforberedelser.';
  if (month === 10) return 'Modningsovervåkning, bordoliven og planlegging av utstyr/batcher.';
  if ([11, 12].includes(month)) return 'Senere Biar-høsting, pressing, bordoliven og kvalitetsmålinger.';
  return 'Overvåk sesong, vær og feltdata.';
}

function buildActionCards(advice: FarmDecisionAdvice, readings: SensorReading[], alerts: SensorAlert[]): ActionCard[] {
  const cards: ActionCard[] = [];

  if (advice.recommended_action === 'irrigate') {
    cards.push({
      title: 'Prioriter vanning',
      description: 'Sjekk jordfukt på riktig dybde og vann unge/svake trær først.',
      priority: 'Kritisk',
      icon: <Droplets size={18} />,
    });
  }

  if (advice.recommended_action === 'inspect_dripline') {
    cards.push({
      title: 'Kontroller dryppslanger',
      description: 'Lavt trykk eller avvik mellom flow og pressure kan bety lekkasje, tett filter eller ødelagt slange.',
      priority: 'Høy',
      icon: <Gauge size={18} />,
    });
  }

  if (advice.recommended_action === 'check_salinity') {
    cards.push({
      title: 'Kontroller salt/EC',
      description: 'Sammenlign jord-EC og vann-EC før mer intensiv vanning.',
      priority: 'Høy',
      icon: <Waves size={18} />,
    });
  }

  const lowBattery = readings.find(reading => typeof reading.battery_percent === 'number' && reading.battery_percent < 30);
  if (lowBattery) {
    cards.push({
      title: 'Bytt eller lad batteri',
      description: `${lowBattery.sensor_id} har lavt batterinivå.`,
      priority: 'Middels',
      icon: <AlertTriangle size={18} />,
    });
  }

  const criticalAlert = alerts.find(alert => alert.severity === 'critical');
  if (criticalAlert) {
    cards.push({
      title: criticalAlert.title,
      description: criticalAlert.message,
      priority: 'Kritisk',
      icon: <AlertTriangle size={18} />,
    });
  }

  if (cards.length === 0) {
    cards.push({
      title: 'Fortsett overvåkning',
      description: 'Ingen kritiske avvik. Ta en visuell kontroll av unge trær, dryppslanger og feltobservasjoner.',
      priority: 'Lav',
      icon: <CheckCircle2 size={18} />,
    });
  }

  return cards.slice(0, 4);
}

function priorityClass(priority: ActionCard['priority']): string {
  if (priority === 'Kritisk') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (priority === 'Høy') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (priority === 'Middels') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-green-500/20 bg-green-500/10 text-green-400';
}

const DonaAnnaDailyDashboard: React.FC = () => {
  const [readings, setReadings] = useState<SensorReading[]>(demoReadings);
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [irrigationEvents, setIrrigationEvents] = useState<IrrigationEvent[]>([]);
  const [observations, setObservations] = useState<FarmObservation[]>([]);
  const [advice, setAdvice] = useState<FarmDecisionAdvice>(() => buildDonaAnnaDecisionAdvice(demoReadings));
  const [dataSource, setDataSource] = useState<DataSource>('local_demo');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const [latestReadings, openAlerts, recentIrrigation, recentObservations] = await Promise.all([
        fetchLatestSensorReadings(300),
        fetchOpenSensorAlerts(),
        fetchRecentIrrigationEvents(10),
        fetchRecentFarmObservations(10),
      ]);

      if (!latestReadings.length) {
        setReadings(demoReadings);
        setAlerts([]);
        setIrrigationEvents([]);
        setObservations([]);
        setAdvice(buildDonaAnnaDecisionAdvice(demoReadings));
        setDataSource('local_demo');
      } else {
        setReadings(latestReadings);
        setAlerts(openAlerts);
        setIrrigationEvents(recentIrrigation);
        setObservations(recentObservations);
        setAdvice(buildDonaAnnaDecisionAdvice(latestReadings, openAlerts));
        setDataSource('supabase');
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('[DonaAnnaDailyDashboard] Could not load Supabase data. Using local demo.', error);
      setReadings(demoReadings);
      setAlerts([]);
      setIrrigationEvents([]);
      setObservations([]);
      setAdvice(buildDonaAnnaDecisionAdvice(demoReadings));
      setDataSource('local_demo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const actions = buildActionCards(advice, readings, alerts);
  const currentMonth = new Date().getMonth() + 1;
  const oilWindow = DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_oil;
  const tableWindow = DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_table_olives;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Leaf className="text-green-400" /> DonaAnna Daily Dashboard
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Biar · {DONA_ANNA_BIAR_SEASON_SETTINGS.altitude_m} moh. · {dataSource === 'supabase' ? 'Supabase' : 'Lokal demo'} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={loadDashboard} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all">
          <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className={`glass rounded-[2rem] p-6 border ${advice.severity === 'critical' ? 'border-red-500/20 bg-red-500/5' : advice.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-green-500/20 bg-green-500/5'}`}>
        <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">Dagens beslutning</p>
        <p className="text-xl text-white font-bold">{advice.title}</p>
        <p className="text-sm text-slate-400 mt-2">{advice.message}</p>
        {advice.reasons.length > 0 && <p className="text-xs text-slate-500 mt-3">Grunnlag: {advice.reasons.join(' ')}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <Mountain className="text-green-400 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Biar sesongstatus</p>
          <p className="text-white font-bold mt-2">{monthName(currentMonth)}</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{getBiarSeasonText()}</p>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <CalendarDays className="text-yellow-400 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Senere høsteprofil</p>
          <p className="text-white font-bold mt-2">Bordoliven: {monthName(tableWindow.start_month)}–{monthName(tableWindow.end_month)}</p>
          <p className="text-white font-bold mt-1">Olje: {monthName(oilWindow.start_month)}–{monthName(oilWindow.end_month)}</p>
          <p className="text-xs text-slate-500 mt-2">650 moh. gjør at faktisk høsting må styres av modenhet, sort og vær.</p>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <ShieldCheck className="text-blue-400 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Datagrunnlag</p>
          <p className="text-white font-bold mt-2">{readings.length} målinger</p>
          <p className="text-xs text-slate-500 mt-2">{alerts.length} åpne varsler · {irrigationEvents.length} vanningshendelser · {observations.length} observasjoner</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><ListChecks size={14} /> Prioriterte handlinger</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions.map(action => (
              <div key={action.title} className={`glass rounded-[2rem] p-5 border ${priorityClass(action.priority)}`}>
                <div className="flex items-center gap-3 mb-3">
                  {action.icon}
                  <p className="text-[10px] font-bold uppercase tracking-widest">{action.priority}</p>
                </div>
                <p className="text-white font-bold">{action.title}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{action.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> Åpne varsler</h3>
          <div className="glass rounded-[2rem] p-5 border border-white/10 space-y-3">
            {alerts.length > 0 ? alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs font-bold text-white">{alert.title}</p>
                <p className="text-[10px] text-yellow-400 mt-1">{alert.message}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-500">Ingen åpne varsler fra Supabase akkurat nå.</p>
            )}
          </div>

          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Droplets size={14} /> Siste vanning</h3>
          <div className="glass rounded-[2rem] p-5 border border-white/10 space-y-3">
            {irrigationEvents.length > 0 ? irrigationEvents.slice(0, 3).map(event => (
              <div key={event.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs font-bold text-white">{event.irrigation_sector_id || event.zone_id || event.parcel_id}</p>
                <p className="text-[10px] text-slate-500 mt-1">{new Date(event.started_at).toLocaleString('no-NO')} · {event.duration_minutes || '—'} min</p>
              </div>
            )) : (
              <p className="text-sm text-slate-500">Ingen registrerte vanningshendelser ennå.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonaAnnaDailyDashboard;
