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
  Brain, RefreshCcw, AlertCircle, MapPin, Wheat, TrendingUp, ChevronRight
} from 'lucide-react';
import { Batch, Parcel, Recipe, Task, HarvestRecord, Language } from '../types';
import {
  fetchBatches, upsertBatch,
  fetchTasks,
  fetchHarvests,
  fetchRecipes,
} from '../services/db';
import { geminiService, FarmInsight } from '../services/geminiService';
import { useTranslation } from '../services/i18nService';
import GlossaryText from './GlossaryText';
import BatchTimeline from './BatchTimeline';
import Sesonghjul from './Sesonghjul';

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

const FarmOverview: React.FC<Props> = ({ language, weatherData, locationName, parcels, onNavigate }) => {
  const { t } = useTranslation(language);

  const [batches, setBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
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
    ]).then(([b, r, ta, h]) => {
      if (cancelled) return;
      setBatches(b);
      setRecipes(r);
      setTasks(ta);
      setHarvests(h);
    });
    return () => { cancelled = true; };
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
      stageCounts,
      currentSeason,
    };
  }, [parcels, batches, tasks, harvests]);

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
        <Sesonghjul tasks={tasks} language={language} />

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
