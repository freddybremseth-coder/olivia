import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Gauge,
  Leaf,
  ListChecks,
  Loader2,
  Mountain,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  ReceiptText,
  Truck,
  Waves,
  HelpCircle,
} from 'lucide-react';
import {
  DONA_ANNA_BIAR_SEASON_SETTINGS,
  type FarmObservation,
  type IrrigationEvent,
  type SensorAlert,
  type SensorReading,
} from '../types/farmIoT';
import {
  buildDonaAnnaDecisionAdvice,
  fetchLatestSensorReadings,
  fetchOpenSensorAlerts,
  fetchRecentFarmObservations,
  fetchRecentIrrigationEvents,
  type FarmDecisionAdvice,
} from '../services/farmIoT';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import { fetchCommerceAttention, type CommerceAttention } from '../services/commerceAttention';
import { fetchCommercialReadiness, type CommercialReadiness } from '../services/commerceReadiness';
import { fetchSeasonReadiness, type SeasonReadiness } from '../services/seasonReadiness';
import SeasonReadinessPanel from './SeasonReadinessPanel';
import { fetchSeasonExecution, type SeasonExecution } from '../services/seasonExecution';
import SeasonExecutionPanel, { type SeasonExecutionAction } from './SeasonExecutionPanel';
import { fetchFarmTruthSummary } from '../services/farmJournal';
import { fetchFarmIntelligenceSummary, fetchOpenFarmQuestions, type FarmQuestion } from '../services/farmIntelligence';

type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

type ActionCard = {
  title: string;
  description: string;
  priority: 'Lav' | 'Middels' | 'Høy' | 'Kritisk';
  icon: React.ReactNode;
};

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

function buildActionCards(advice: FarmDecisionAdvice, readings: SensorReading[], alerts: SensorAlert[], irrigationEvents: IrrigationEvent[], observations: FarmObservation[]): ActionCard[] {
  const cards: ActionCard[] = [];

  if (!readings.length && !alerts.length && !irrigationEvents.length && !observations.length) {
    cards.push({
      title: 'Bygg første datagrunnlag',
      description: 'Registrer sensor, manuell måling, vanning eller feltobservasjon. Dashboardet viser ikke demo-data.',
      priority: 'Høy',
      icon: <ShieldCheck size={18} />,
    });
    return cards;
  }

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

  if (!irrigationEvents.length) {
    cards.push({
      title: 'Registrer neste vanning',
      description: 'Ingen vanningshendelser finnes ennå. Vanningsloggen gir Olivia bedre grunnlag for råd.',
      priority: 'Middels',
      icon: <Droplets size={18} />,
    });
  }

  if (!observations.length) {
    cards.push({
      title: 'Ta feltobservasjon',
      description: 'Legg inn bilder/notater fra feltet slik at tall kan kobles til faktisk tilstand på trær og vanningssystem.',
      priority: 'Lav',
      icon: <Leaf size={18} />,
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

async function safeLoad<T>(promise: Promise<T>, label: string, fallback: T): Promise<T> {
  try { return await promise; }
  catch (error) {
    console.warn('[DonaAnnaDailyDashboard] '+label+' failed', error);
    return fallback;
  }
}

const DonaAnnaDailyDashboard: React.FC<{ onNavigate?: (tab: string) => void; onSeasonAction?: (action: SeasonExecutionAction) => void }> = ({ onNavigate, onSeasonAction }) => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [irrigationEvents, setIrrigationEvents] = useState<IrrigationEvent[]>([]);
  const [observations, setObservations] = useState<FarmObservation[]>([]);
  const [commerceAttention, setCommerceAttention] = useState<CommerceAttention[]>([]);
  const [commercialReadiness, setCommercialReadiness] = useState<CommercialReadiness | null>(null);
  const [seasonReadiness, setSeasonReadiness] = useState<SeasonReadiness | null>(null);
  const [seasonExecution, setSeasonExecution] = useState<SeasonExecution | null>(null);
  const [farmTruth, setFarmTruth] = useState<any>(null);
  const [farmIntelligence, setFarmIntelligence] = useState<any>(null);
  const [farmQuestions, setFarmQuestions] = useState<FarmQuestion[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const advice = useMemo(() => buildDonaAnnaDecisionAdvice(readings, alerts), [readings, alerts]);

  const loadDashboard = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [latestReadings, openAlerts, recentIrrigation, recentObservations, commerceRows, readiness, seasonStatus, executionStatus, truthStatus, intelligenceStatus, questionRows] = await Promise.all([
        safeLoad(fetchLatestSensorReadings(300),'sensor readings',[]),
        safeLoad(fetchOpenSensorAlerts(),'sensor alerts',[]),
        safeLoad(fetchRecentIrrigationEvents(10),'irrigation events',[]),
        safeLoad(fetchRecentFarmObservations(10),'farm observations',[]),
        safeLoad(fetchCommerceAttention(),'commerce attention',[]),
        safeLoad(fetchCommercialReadiness(),'commercial readiness',null),
        safeLoad(fetchSeasonReadiness(),'season readiness',null),
        safeLoad(fetchSeasonExecution(),'season execution',null),
        safeLoad(fetchFarmTruthSummary(),'farm truth',null),
        safeLoad(fetchFarmIntelligenceSummary(),'farm intelligence',null),
        safeLoad(fetchOpenFarmQuestions({limit:5}),'farm questions',[]),
      ]);

      setReadings(latestReadings);
      setAlerts(openAlerts);
      setIrrigationEvents(recentIrrigation);
      setObservations(recentObservations);
      setCommerceAttention(commerceRows);
      setCommercialReadiness(readiness);
      setSeasonReadiness(seasonStatus);
      setSeasonExecution(executionStatus);
      setFarmTruth(truthStatus);
      setFarmIntelligence(intelligenceStatus);
      setFarmQuestions(questionRows);
      setLoadState(latestReadings.length || openAlerts.length || recentIrrigation.length || recentObservations.length || commerceRows.length || (readiness && readiness.issues ? readiness.issues.length : 0) || (seasonStatus && seasonStatus.steps ? seasonStatus.steps.length : 0) || (executionStatus && executionStatus.parcels ? executionStatus.parcels.length : 0) || truthStatus || (intelligenceStatus && intelligenceStatus.openQuestionCount ? intelligenceStatus.openQuestionCount : 0) ? 'supabase' : 'empty');
      setLastRefresh(new Date());
    } catch (error) {
      setReadings([]);
      setAlerts([]);
      setIrrigationEvents([]);
      setObservations([]);
      setCommerceAttention([]);
      setCommercialReadiness(null);
      setSeasonReadiness(null);
      setSeasonExecution(null);
      setFarmTruth(null);
      setFarmIntelligence(null);
      setFarmQuestions([]);
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente Daily Dashboard-data fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const actions = buildActionCards(advice, readings, alerts, irrigationEvents, observations);
  const currentMonth = new Date().getMonth() + 1;
  const oilWindow = DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_oil;
  const tableWindow = DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_table_olives;
  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen data ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';
  const orderAttention = commerceAttention.filter(item => item.event_type === 'order_process');
  const readyToShip = commerceAttention.filter(item => item.event_type === 'order_ready_to_ship');
  const overdueInvoices = commerceAttention.filter(item => item.event_type === 'invoice_overdue');
  const dueSoonInvoices = commerceAttention.filter(item => item.event_type === 'invoice_due_soon');

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,0.12),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><Leaf className="text-green-400" /> Daily Dashboard</h2>
              <p className="text-slate-400 text-sm mt-2">Dagsbilde basert på ekte Supabase-data fra sensorer, varsler, vanning og feltobservasjoner.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Biar · {sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <button onClick={loadDashboard} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all">
            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      {isLoading && loadState === 'loading' ? (
        <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter dagsdata fra Supabase...</div>
      ) : null}

      <div className={`glass rounded-[2rem] p-6 border ${advice.severity === 'critical' ? 'border-red-500/20 bg-red-500/5' : advice.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-green-500/20 bg-green-500/5'}`}>
        <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">Dagens beslutning</p>
        {loadState === 'empty' ? (
          <>
            <p className="text-xl text-white font-bold">Ingen driftsdata registrert ennå</p>
            <p className="text-sm text-slate-400 mt-2">Registrer en sensor, manuell måling, vanningshendelse eller feltobservasjon. Dashboardet viser ikke demo-data.</p>
          </>
        ) : (
          <>
            <p className="text-xl text-white font-bold">{advice.title}</p>
            <p className="text-sm text-slate-400 mt-2">{advice.message}</p>
            {advice.reasons.length > 0 && <p className="text-xs text-slate-500 mt-3">Grunnlag: {advice.reasons.join(' ')}</p>}
          </>
        )}
      </div>

      {farmTruth && <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/[0.04]">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] font-black text-[#d9b657]">Daglig drift · gårdens fasit</p>
            <h3 className="text-xl font-black text-white mt-1">Hva har skjedd — og hva må følges opp?</h3>
            <p className="text-xs text-slate-500 mt-2">Bygger på verifiserte dokumenter, meldinger, feltobservasjoner, regnmålinger og registrert treantall.</p>
          </div>
          {onNavigate&&<button onClick={()=>onNavigate('farm_journal')} className="rounded-xl bg-[#d9b657] px-4 py-3 text-xs font-black text-black flex items-center gap-2"><ClipboardList size={15}/> Åpne Driftsjournal</button>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-5">
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Registrerte trær</p><p className="font-black text-white mt-1">{Number(farmTruth.treeCount||0).toLocaleString('no-NO')}</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Verifiserte hendelser</p><p className="font-black text-white mt-1">{farmTruth.events?.length||0}</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Må kontrolleres</p><p className={"font-black mt-1 "+(farmTruth.needsReview?"text-amber-300":"text-white")}>{farmTruth.needsReview||0}</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Regn 30 dager</p><p className="font-black text-blue-300 mt-1">{Number(farmTruth.rain30||0).toLocaleString('no-NO')} mm</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Årshjul nærmer seg</p><p className="font-black text-white mt-1">{farmTruth.upcoming?.length||0}</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Olivia spør</p><p className={"font-black mt-1 "+(farmIntelligence?.openQuestionCount?"text-blue-300":"text-white")}>{farmIntelligence?.openQuestionCount||0}</p></div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-black">Siste dokumenterte arbeid / observasjon</p>
            {(farmTruth.events||[]).slice(0,4).map((event:any)=><div key={event.id} className="mt-3 border-l-2 border-green-500/30 pl-3"><p className="text-xs font-bold text-white">{event.title}</p><p className="text-[10px] text-slate-500 mt-1">{event.occurred_on||event.planned_for||event.period_label||'dato ikke dokumentert'} · {event.event_status}</p></div>)}
            {!farmTruth.events?.length&&<p className="text-xs text-slate-600 mt-3">Ingen verifiserte driftshendelser ennå.</p>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-black">Neste fra årshjul</p>
            {(farmTruth.upcoming||[]).slice(0,4).map((item:any)=><div key={item.id} className="mt-3 border-l-2 border-[#d9b657]/40 pl-3"><p className="text-xs font-bold text-white">{item.title}</p><p className="text-[10px] text-slate-500 mt-1">{item.target_day?item.target_day+'. ':''}{new Date(item.target_year,item.target_month-1,1).toLocaleString('no-NO',{month:'long'})} · {item.status}</p></div>)}
            {!farmTruth.upcoming?.length&&<p className="text-xs text-slate-600 mt-3">Ingen årshjulspunkter nærmer seg akkurat nå.</p>}
          </div>
        </div>
        {farmQuestions.length>0&&<div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] p-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div><p className="text-[9px] uppercase tracking-widest font-black text-blue-300">Olivia trenger avklaring</p><p className="text-xs text-slate-500 mt-1">Systemet har funnet usikkerhet eller konflikt og stopper gjettingen her.</p></div>
            {onNavigate&&<button onClick={()=>onNavigate('farm_journal')} className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200 flex items-center gap-1"><HelpCircle size={14}/>Svar i Driftsjournal</button>}
          </div>
          <div className="space-y-2 mt-3">{farmQuestions.slice(0,3).map(q=><div key={q.id} className="rounded-xl bg-black/20 border border-white/10 p-3"><p className="text-xs font-bold text-white">{q.question}</p>{q.reason&&<p className="text-[10px] text-slate-500 mt-1">{q.reason}</p>}</div>)}</div>
        </div>}
      </div>}

      <SeasonReadinessPanel data={seasonReadiness} onNavigate={onNavigate} />

      <SeasonExecutionPanel data={seasonExecution} onNavigate={onNavigate} onAction={onSeasonAction} />

      <div className="glass rounded-[2rem] p-6 border border-amber-300/20 bg-amber-300/[0.04]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">Salg og betaling</p>
            <h3 className="text-xl font-bold text-white mt-1">Dette må følges opp</h3>
            <p className="text-xs text-slate-500 mt-1">Automatisk fra reelle commerce-ordre og fakturaer. Testordre er ikke med.</p>
          </div>
          <ReceiptText className="text-amber-300" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            ['Ordre å behandle', orderAttention.length, <ShoppingCart size={17} />, 'text-yellow-300'],
            ['Klar til sending', readyToShip.length, <Truck size={17} />, 'text-blue-300'],
            ['Forfalte fakturaer', overdueInvoices.length, <AlertTriangle size={17} />, 'text-red-300'],
            ['Forfaller snart', dueSoonInvoices.length, <ReceiptText size={17} />, 'text-amber-300'],
          ].map(([label,value,icon,tone]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className={String(tone)}>{icon}</div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">{label}</p>
              <p className="text-2xl font-black text-white mt-1">{value}</p>
            </div>
          ))}
        </div>
        {commercialReadiness && commercialReadiness.issues.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-black/20 p-4">
            <p className="text-xs font-black text-amber-300">Kommersielt oppsett</p>
            <p className="text-sm text-white mt-1">{commercialReadiness.issues.filter(issue=>issue.severity==='critical').length} kritiske felt · {commercialReadiness.productsReady}/{commercialReadiness.productCount} produkter klare</p>
            <p className="text-xs text-slate-500 mt-1">{commercialReadiness.issues[0]?.title}</p>
          </div>
        )}
        {commerceAttention.length > 0 ? (
          <div className="mt-5 space-y-2">
            {commerceAttention.slice(0,6).map(item => (
              <div key={item.id} className={`rounded-xl border p-3 ${item.severity === 'critical' ? 'border-red-500/20 bg-red-500/10' : item.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/10' : 'border-blue-500/20 bg-blue-500/10'}`}>
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-xs text-slate-400 mt-1">{item.body}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500 mt-5">Ingen ordre- eller fakturaoppfølging krever handling akkurat nå.</p>}
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
          <p className="text-xs text-slate-500 mt-2">Faktisk høsting må styres av modenhet, sort, kvalitet og vær.</p>
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
