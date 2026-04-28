/**
 * FarmOverview – ny hjemmeside-dashboard som erstatter mock-tallene
 * i den gamle Dashboard-komponenten med ekte data fra Supabase.
 *
 * Inneholder:
 *   - KPI-rad (areal, trær, aktive batch, åpne oppgaver, vær)
 *   - Pipeline-tidslinje (BatchTimeline)
 *   - Sesonghjul (Sesonghjul)
 *   - Siste innhøstinger
 *   - AI-innsikt-sidebar (gjenbruk fra Dashboard)
 *
 * Henter selv batches/tasks/harvests/recipes — App.tsx trenger bare å
 * sende parcels + weatherData + locationName + language.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Sprout, TreePine, Layers, ListChecks, Wind, Thermometer, Droplets,
  Brain, RefreshCcw, AlertCircle, MapPin, Wheat, TrendingUp, ChevronRight,
  TrendingDown, Coins, Wallet, ShoppingCart, ReceiptText, Truck, MessageSquare
} from 'lucide-react';
import { Batch, Parcel, Recipe, Task, HarvestRecord, Language, FarmExpense, SubsidyIncome } from '../types';
import {
  fetchBatches, upsertBatch,
  fetchTasks,
  fetchHarvests,
  fetchRecipes,
  fetchExpenses,
  fetchSubsidies,
} from '../services/db';
import { geminiService, FarmInsight } from '../services/geminiService';
import { useTranslation } from '../services/i18nService';
import GlossaryText from './GlossaryText';
import BatchTimeline from './BatchTimeline';
import Sesonghjul from './Sesonghjul';
import { CommerceBusinessMetrics, fetchCommerceBusinessMetrics } from '../services/customerPortal';

interface Props {
  language: Language;
  weatherData: any;
  locationName: string;
  parcels: Parcel[];
  onNavigate?: (tab: string) => void;
}

const STAGES = ['PLUKKING', 'LAKE', 'SKYLLING', 'MARINERING', 'LAGRING', 'PAKKING', 'SALG'] as const;

const formatHa = (m2: number) => (m2 / 10_000).toLocaleString('no-NO', { maximumFractionDigits: 1 });
const formatEur = (n: number) => n.toLocaleString('no-NO', { maximumFractionDigits: 0 });
const emptyCommerceMetrics: CommerceBusinessMetrics = {
  pendingOrders: 0,
  shippedOrders: 0,
  invoicedOrders: 0,
  outstandingInvoices: 0,
  paidInvoices: 0,
  unpaidAmount: 0,
  paidAmount: 0,
  orderValue: 0,
  openMessages: 0,
};

const FarmOverview: React.FC<Props> = ({ language, weatherData, locationName, parcels, onNavigate }) => {
  const { t } = useTranslation(language);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [expenses, setExpenses] = useState<FarmExpense[]>([]);
  const [subsidies, setSubsidies] = useState<SubsidyIncome[]>([]);
  const [commerceMetrics, setCommerceMetrics] = useState<CommerceBusinessMetrics>(emptyCommerceMetrics);
  const [insights, setInsights] = useState<FarmInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);

  // ── Data load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchBatches(),
      fetchRecipes(),
      fetchTasks(),
      fetchHarvests(),
      fetchExpenses(),
      fetchSubsidies(),
    ]).then(([b, r, ta, h, ex, su]) => {
      if (cancelled) return;
      setBatches(b);
      setRecipes(r);
      setTasks(ta);
      setHarvests(h);
      setExpenses(ex);
      setSubsidies(su);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadCommerceMetrics = () => {
      fetchCommerceBusinessMetrics()
        .then(metrics => {
          if (!cancelled) setCommerceMetrics(metrics);
        })
        .catch(error => console.warn('[dashboard] commerce metrics failed', error));
    };
    loadCommerceMetrics();
    window.addEventListener('storage', loadCommerceMetrics);
    window.addEventListener('focus', loadCommerceMetrics);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', loadCommerceMetrics);
      window.removeEventListener('focus', loadCommerceMetrics);
    };
  }, []);

  // Refresh tasks when other views (PruningAdvisor, TasksView) write
  useEffect(() => {
    const onStorage = () => fetchTasks().then(setTasks);
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ── AI insights ──────────────────────────────────────────────────────────
  const fetchInsights = async () => {
    if (!weatherData) return;
    setInsightsLoading(true);
    try {
      const data = await geminiService.getFarmInsights(weatherData, null, language, locationName);
      setInsights(data);
    } catch (err) {
      console.error('FarmOverview Insights Error:', err);
      setInsights([]);
    } finally {
      setInsightsLoading(false);
    }
  };

  useEffect(() => { fetchInsights(); /* eslint-disable-next-line */ }, [language, weatherData]);

  // ── Derived KPIs ─────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalAreaM2 = parcels.reduce((sum, p) => sum + (p.area || 0), 0);
    const totalTrees = parcels.reduce((sum, p) => sum + (p.treeCount || 0), 0);
    const activeBatches = batches.filter(b => b.status === 'ACTIVE');
    const openTasks = tasks.filter(t => t.status !== 'DONE');
    const overdueTasks = openTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());

    const currentSeason = new Date().getFullYear().toString();
    const seasonHarvests = harvests.filter(h => h.season === currentSeason);
    const seasonKg = seasonHarvests.reduce((s, h) => s + h.kg, 0);
    const seasonRevenue = seasonHarvests.reduce((s, h) => s + h.kg * h.pricePerKg, 0);

    // Resultat: Inntekter (salg + tilskudd) − Kostnader. Same season-filter
    // semantics as harvests so the dashboard tells one consistent story.
    const seasonExpenses = expenses
      .filter(e => e.season === currentSeason)
      .reduce((s, e) => s + e.amount, 0);
    const seasonSubsidies = subsidies
      .filter(su => su.season === currentSeason)
      .reduce((s, su) => s + su.amount, 0);
    const seasonNet = seasonRevenue + seasonSubsidies - seasonExpenses;
    const profitMargin = (seasonRevenue + seasonSubsidies) > 0
      ? (seasonNet / (seasonRevenue + seasonSubsidies)) * 100
      : 0;

    const stageCounts = STAGES.map(stage => ({
      stage,
      count: activeBatches.filter(b => (b.currentStage ?? 'PLUKKING') === stage).length,
    }));

    return {
      totalAreaM2, totalTrees,
      activeBatches: activeBatches.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      seasonKg, seasonRevenue,
      seasonExpenses, seasonSubsidies, seasonNet, profitMargin,
      stageCounts,
      currentSeason,
    };
  }, [parcels, batches, tasks, harvests, expenses, subsidies]);

  const isSprayingSafe = weatherData?.current?.wind_speed_10m < 15;

  const recentHarvests = harvests.slice(0, 5);

  const handleAdvance = async (batchId: string) => {
    const target = batches.find(b => b.id === batchId);
    if (!target) return;
    const idx = STAGES.indexOf(target.currentStage as typeof STAGES[number]);
    let updated: Batch;
    if (idx < STAGES.length - 1) {
      const next = STAGES[idx + 1];
      updated = {
        ...target,
        currentStage: next,
        stageStartDate: new Date().toISOString().slice(0, 10),
        logs: [...(target.logs || []), { stage: next, startDate: new Date().toISOString().slice(0, 10), notes: '' }],
      };
    } else {
      updated = { ...target, status: 'ARCHIVED' };
    }
    await upsertBatch(updated);
    setBatches(prev => prev.map(b => b.id === batchId ? updated : b));
  };

  const parcelName = (id: string) => parcels.find(p => p.id === id)?.name ?? id;

  // ── Render ───────────────────────────────────────────────────────────────
  const KpiCard = ({ icon: Icon, label, value, sub, color, bg, onClick }: {
    icon: React.ElementType; label: string; value: string; sub?: string;
    color: string; bg: string; onClick?: () => void;
  }) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`glass rounded-3xl p-5 border border-white/10 ${onClick ? 'hover:border-white/20 cursor-pointer' : ''} transition-all text-left`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2.5 rounded-2xl ${bg} ${color}`}><Icon size={20} /></div>
        {sub && <span className="text-[10px] uppercase tracking-wider text-slate-500">{sub}</span>}
      </div>
      <p className="text-slate-400 text-xs font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-white mt-0.5">{value}</h3>
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Sprout}
          label="Totalt areal"
          value={`${formatHa(kpi.totalAreaM2)} ha`}
          sub={`${parcels.length} parseller`}
          color="text-green-400" bg="bg-green-500/10"
          onClick={onNavigate ? () => onNavigate('map') : undefined}
        />
        <KpiCard
          icon={TreePine}
          label="Olivetrær"
          value={kpi.totalTrees.toLocaleString('no-NO')}
          color="text-emerald-400" bg="bg-emerald-500/10"
          onClick={onNavigate ? () => onNavigate('map') : undefined}
        />
        <KpiCard
          icon={Layers}
          label="Aktive batch"
          value={kpi.activeBatches.toString()}
          sub={`${kpi.stageCounts.find(s => s.stage === 'MARINERING')?.count ?? 0} i marinering`}
          color="text-yellow-400" bg="bg-yellow-500/10"
          onClick={onNavigate ? () => onNavigate('production') : undefined}
        />
        <KpiCard
          icon={ListChecks}
          label="Åpne oppgaver"
          value={kpi.openTasks.toString()}
          sub={kpi.overdueTasks > 0 ? `${kpi.overdueTasks} forfalt` : 'Ingen forfalt'}
          color={kpi.overdueTasks > 0 ? 'text-red-400' : 'text-blue-400'}
          bg={kpi.overdueTasks > 0 ? 'bg-red-500/10' : 'bg-blue-500/10'}
          onClick={onNavigate ? () => onNavigate('tasks') : undefined}
        />
        <KpiCard
          icon={TrendingUp}
          label={`Sesong ${kpi.currentSeason}`}
          value={`€${formatEur(kpi.seasonRevenue)}`}
          sub={`${formatEur(kpi.seasonKg)} kg`}
          color="text-purple-400" bg="bg-purple-500/10"
          onClick={onNavigate ? () => onNavigate('economy') : undefined}
        />
      </div>

      {/* ── B2B Commerce ──────────────────────────────────────────────── */}
      <div className="glass rounded-3xl p-6 border border-white/10">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ShoppingCart size={18} className="text-amber-300" /> B2B Commerce
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ordre, faktura, betaling og kundemeldinger fra B2B-portalen
            </p>
          </div>
          {onNavigate && (
            <button onClick={() => onNavigate('commerce')}
              className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1">
              Åpne Commerce <ChevronRight size={12} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={ShoppingCart}
            label="Ordre venter"
            value={commerceMetrics.pendingOrders.toString()}
            sub={`${commerceMetrics.orderValue > 0 ? `€${formatEur(commerceMetrics.orderValue)} ordreverdi` : 'Ingen ordreverdi'}`}
            color="text-amber-300" bg="bg-amber-300/10"
            onClick={onNavigate ? () => onNavigate('commerce') : undefined}
          />
          <KpiCard
            icon={Truck}
            label="Sendt / på vei"
            value={commerceMetrics.shippedOrders.toString()}
            sub="Forsendelser"
            color="text-blue-300" bg="bg-blue-400/10"
            onClick={onNavigate ? () => onNavigate('commerce') : undefined}
          />
          <KpiCard
            icon={ReceiptText}
            label="Fakturert"
            value={commerceMetrics.invoicedOrders.toString()}
            sub={`${commerceMetrics.paidInvoices} betalt`}
            color="text-purple-300" bg="bg-purple-400/10"
            onClick={onNavigate ? () => onNavigate('commerce') : undefined}
          />
          <KpiCard
            icon={Wallet}
            label="Utestående"
            value={`€${formatEur(commerceMetrics.unpaidAmount)}`}
            sub={`${commerceMetrics.outstandingInvoices} faktura · ${commerceMetrics.openMessages} meldinger`}
            color={commerceMetrics.unpaidAmount > 0 ? 'text-red-300' : 'text-green-300'}
            bg={commerceMetrics.unpaidAmount > 0 ? 'bg-red-400/10' : 'bg-green-400/10'}
            onClick={onNavigate ? () => onNavigate('commerce') : undefined}
          />
        </div>
      </div>

      {/* ── Resultat sesong (P&L) ─────────────────────────────────────── */}
      <div className="glass rounded-3xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wallet size={18} className="text-green-400" /> Resultat sesong {kpi.currentSeason}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Inntekter − kostnader basert på registrerte data
            </p>
          </div>
          {onNavigate && (
            <button onClick={() => onNavigate('economy')}
              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
              Detaljer <ChevronRight size={12} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="rounded-2xl bg-green-500/5 border border-green-500/20 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp size={14} className="text-green-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Salgsinntekt</p>
            </div>
            <p className="text-xl font-bold text-green-400">€{formatEur(kpi.seasonRevenue)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{formatEur(kpi.seasonKg)} kg solgt</p>
          </div>

          <div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Coins size={14} className="text-blue-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Tilskudd</p>
            </div>
            <p className="text-xl font-bold text-blue-400">€{formatEur(kpi.seasonSubsidies)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">PAC + andre</p>
          </div>

          <div className="rounded-2xl bg-red-500/5 border border-red-500/20 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingDown size={14} className="text-red-400" />
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Kostnader</p>
            </div>
            <p className="text-xl font-bold text-red-400">€{formatEur(kpi.seasonExpenses)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Drift, lønn, materialer</p>
          </div>

          <div className={`rounded-2xl p-4 border ${
            kpi.seasonNet >= 0
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-rose-500/10 border-rose-500/30'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Wallet size={14} className={kpi.seasonNet >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Netto resultat</p>
            </div>
            <p className={`text-xl font-bold ${kpi.seasonNet >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {kpi.seasonNet >= 0 ? '+' : ''}€{formatEur(kpi.seasonNet)}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Margin {kpi.profitMargin.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Visual P&L bar — green for income/subsidies, red for costs */}
        {(kpi.seasonRevenue + kpi.seasonSubsidies + kpi.seasonExpenses) > 0 && (() => {
          const total = kpi.seasonRevenue + kpi.seasonSubsidies + kpi.seasonExpenses;
          const pctRev = (kpi.seasonRevenue / total) * 100;
          const pctSub = (kpi.seasonSubsidies / total) * 100;
          const pctCost = (kpi.seasonExpenses / total) * 100;
          return (
            <div className="space-y-1.5">
              <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                <div className="bg-green-500" style={{ width: `${pctRev}%` }} />
                <div className="bg-blue-500" style={{ width: `${pctSub}%` }} />
                <div className="bg-red-500" style={{ width: `${pctCost}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Salg {pctRev.toFixed(0)}%</span>
                <span>Tilskudd {pctSub.toFixed(0)}%</span>
                <span>Kostnader {pctCost.toFixed(0)}%</span>
              </div>
            </div>
          );
        })()}

        {kpi.seasonRevenue === 0 && kpi.seasonExpenses === 0 && kpi.seasonSubsidies === 0 && (
          <p className="text-xs text-slate-500 italic text-center py-2">
            Ingen registrert økonomi-data for sesong {kpi.currentSeason} ennå.
            {onNavigate && (
              <button onClick={() => onNavigate('economy')} className="ml-1 text-green-400 hover:underline">
                Legg inn under Økonomi.
              </button>
            )}
          </p>
        )}
      </div>

      {/* ── Pipeline timeline (full width on mobile) ───────────────────── */}
      <BatchTimeline
        batches={batches}
        parcels={parcels}
        recipes={recipes}
        language={language}
        onAdvance={handleAdvance}
      />

      {/* ── Sesonghjul + Recent harvests + Weather ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Sesonghjul
          tasks={tasks}
          language={language}
          lat={parcels[0]?.lat}
          lon={parcels[0]?.lon}
          locationName={locationName}
        />

        {/* Recent harvests */}
        <div className="glass rounded-3xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Wheat size={18} className="text-amber-400" /> Siste innhøstinger
            </h3>
            {onNavigate && (
              <button onClick={() => onNavigate('production')}
                className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1">
                Alle <ChevronRight size={12} />
              </button>
            )}
          </div>
          {recentHarvests.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <Wheat className="mx-auto mb-2 opacity-30" size={28} />
              <p>Ingen innhøstinger registrert ennå.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {recentHarvests.map(h => (
                <li key={h.id} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2.5 border border-white/5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {h.kg} kg · {h.variety}
                    </p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={10} /> {parcelName(h.parcelId)} · {h.date}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-green-400">€{formatEur(h.kg * h.pricePerKg)}</p>
                    <p className="text-[10px] text-slate-500">{h.pricePerKg.toFixed(2)} €/kg</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Weather + AI insights */}
        <div className="space-y-6">
          <div className="glass rounded-3xl p-6 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wind size={64} className="text-white" />
            </div>
            <div className="relative z-10 space-y-3">
              <h4 className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                {locationName} · {t('weather_now')}
              </h4>
              {weatherData ? (
                <>
                  <div className="flex items-center gap-4">
                    <Thermometer className="text-yellow-400" size={28} />
                    <span className="text-3xl font-bold text-white">
                      {Math.round(weatherData.current.temperature_2m)}°C
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-blue-300">
                      <Droplets size={11} /> {weatherData.current.relative_humidity_2m}%
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Wind size={11} /> {Math.round(weatherData.current.wind_speed_10m)} km/t
                    </span>
                  </div>
                  <p className={`text-xs font-bold ${isSprayingSafe ? 'text-green-400' : 'text-red-400'}`}>
                    {isSprayingSafe ? t('perfect_spraying') : t('too_much_wind')}
                  </p>
                </>
              ) : (
                <div className="h-16 animate-pulse bg-white/5 rounded-lg"></div>
              )}
            </div>
          </div>

          <div className="glass rounded-3xl p-6 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.08)] relative">
            <div className="absolute top-4 right-4">
              <Brain size={20} className="text-green-400 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-4">{t('ai_intelligence')}</h3>
            {insightsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 animate-pulse rounded-xl" />)}
              </div>
            ) : insights.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-500">
                <AlertCircle className="mx-auto mb-2 text-slate-600" size={20} />
                Ingen AI-innsikt akkurat nå.
              </div>
            ) : (
              <div className="space-y-3">
                {insights.slice(0, 3).map((insight, i) => (
                  <div key={insight.id || i} className="flex gap-3">
                    <div className="w-1 bg-green-500 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-green-400 uppercase tracking-tighter">{insight.tittel}</p>
                      <p className="text-xs text-slate-300 leading-relaxed italic mt-0.5">
                        "<GlossaryText text={insight.beskrivelse} />"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={fetchInsights}
              disabled={insightsLoading}
              className="w-full mt-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-green-400 hover:bg-green-500/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {insightsLoading ? <RefreshCcw size={11} className="animate-spin" /> : <Brain size={11} />}
              Oppdater
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FarmOverview;
