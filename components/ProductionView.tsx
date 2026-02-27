
import React, { useState, useEffect } from 'react';
import {
  Plus, Sprout, X, Layers, Star, Edit3, Wand2,
  Sparkles, ChefHat, Save, AlertCircle,
  PlusCircle, MinusCircle, Clock, BookOpen,
  Droplets, Thermometer, FlaskConical, Scale,
  Loader2, Trash2, CheckCircle2, ShoppingCart,
  ChevronRight, Search, Bell, Archive, RefreshCcw,
  ClipboardList, MapPin, Award, Timer, Filter
} from 'lucide-react';
import { Batch, Parcel, Recipe, Ingredient, TableOliveStage } from '../types';
import { geminiService } from '../services/geminiService';
import {
  DEFAULT_RECIPES, FLAVOR_PROFILE_LABELS, FLAVOR_PROFILE_COLORS, OLIVE_TYPES
} from '../data/olivenRecipes';

type FlavorFilter = 'all' | 'mild' | 'syrlig' | 'krydret' | 'urterik' | 'sitrus' | 'hvitlok' | 'middelhav';
type MainTab = 'pipeline' | 'active' | 'history' | 'recipes' | 'guide';

const STAGES: TableOliveStage[] = ['PLUKKING', 'LAKE', 'SKYLLING', 'MARINERING', 'LAGRING', 'PAKKING', 'SALG'];

const STAGE_LABELS: Record<TableOliveStage, string> = {
  PLUKKING: 'Plukking',
  LAKE: 'Saltlake',
  SKYLLING: 'Skylling',
  MARINERING: 'Marinering',
  LAGRING: 'Lagring',
  PAKKING: 'Pakking',
  SALG: 'Salg',
};

const STAGE_COLORS: Record<TableOliveStage, string> = {
  PLUKKING: 'text-green-400 bg-green-500/10 border-green-500/20',
  LAKE: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  SKYLLING: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  MARINERING: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  LAGRING: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  PAKKING: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  SALG: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

function getDaysSince(dateStr?: string): number {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function getBatchAlerts(batch: Batch, recipe?: Recipe): { type: 'warning' | 'danger' | 'info'; text: string }[] {
  const alerts: { type: 'warning' | 'danger' | 'info'; text: string }[] = [];
  if (!batch.currentStage) return alerts;

  const daysSinceHarvest = getDaysSince(batch.harvestDate);
  const daysInStage = getDaysSince(batch.stageStartDate || batch.harvestDate);

  if (batch.currentStage === 'LAKE' && recipe?.brineChangeDays) {
    for (const changeDay of recipe.brineChangeDays) {
      if (daysSinceHarvest >= changeDay - 3 && daysSinceHarvest < changeDay + 7) {
        alerts.push({ type: 'warning', text: `Lakeskift: dag ${changeDay} (nå dag ${daysSinceHarvest})` });
      } else if (daysSinceHarvest >= changeDay + 7) {
        alerts.push({ type: 'danger', text: `Lakeskift forfalt! (dag ${changeDay})` });
      }
    }
    if (recipe.marinadeDayFrom && daysSinceHarvest >= recipe.marinadeDayFrom) {
      alerts.push({ type: 'warning', text: 'Klar for marinering!' });
    }
  }

  if (batch.currentStage === 'MARINERING' && recipe?.readyAfterDays) {
    const marinadeDays = daysInStage;
    if (marinadeDays >= 14) {
      alerts.push({ type: 'info', text: `Smak og vurder (${marinadeDays} dager i marinering)` });
    }
  }

  if (recipe?.readyAfterDays && daysSinceHarvest >= recipe.readyAfterDays &&
    batch.currentStage !== 'PAKKING' && batch.currentStage !== 'SALG') {
    alerts.push({ type: 'info', text: 'Klar for pakking!' });
  }

  return alerts;
}

const ProductionView: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mainTab, setMainTab] = useState<MainTab>('pipeline');
  const [flavorFilter, setFlavorFilter] = useState<FlavorFilter>('all');
  const [recipeSearch, setRecipeSearch] = useState('');

  // Modals
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // New batch form
  const [newBatch, setNewBatch] = useState<Partial<Batch>>({
    yieldType: 'Table',
    quality: 'Premium',
    status: 'ACTIVE',
    weight: 0,
    harvestDate: new Date().toISOString().split('T')[0],
    currentStage: 'PLUKKING',
  });

  useEffect(() => {
    const savedBatches = localStorage.getItem('olivia_batches');
    const savedParcels = localStorage.getItem('olivia_parcels');
    const savedRecipes = localStorage.getItem('olivia_recipes');

    if (savedParcels) setParcels(JSON.parse(savedParcels));

    if (savedBatches) {
      setBatches(JSON.parse(savedBatches));
    } else {
      const initial: Batch[] = [{
        id: 'B-24-001', parcelId: 'p1', harvestDate: '2024-10-15', weight: 1200,
        quality: 'Premium', qualityScore: 96, status: 'ACTIVE',
        laborHours: 45, laborCost: 900, yieldType: 'Table',
        traceabilityCode: 'BIAR-24-N', currentStage: 'LAKE',
        stageStartDate: '2024-10-17', oliveType: 'Gordal Sevillana',
      }];
      setBatches(initial);
      localStorage.setItem('olivia_batches', JSON.stringify(initial));
    }

    if (savedRecipes) {
      const loaded: Recipe[] = JSON.parse(savedRecipes);
      // Merge default recipes if fewer than 10 are stored
      if (loaded.length < 10) {
        const merged = [...DEFAULT_RECIPES, ...loaded.filter(r => r.isAiGenerated)];
        setRecipes(merged);
        localStorage.setItem('olivia_recipes', JSON.stringify(merged));
      } else {
        setRecipes(loaded);
      }
    } else {
      setRecipes(DEFAULT_RECIPES);
      localStorage.setItem('olivia_recipes', JSON.stringify(DEFAULT_RECIPES));
    }
  }, []);

  const saveToLocal = (key: string, data: unknown) => {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('storage'));
  };

  const handleCreateBatch = () => {
    if (!newBatch.parcelId || !newBatch.weight) {
      alert('Vennligst velg parsell og oppgi vekt.');
      return;
    }
    const batch: Batch = {
      ...(newBatch as Batch),
      id: `B-${new Date().getFullYear().toString().slice(-2)}-${(batches.length + 1).toString().padStart(3, '0')}`,
      traceabilityCode: `TRC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      qualityScore: Math.floor(Math.random() * 15) + 85,
      laborHours: 0,
      laborCost: 0,
      currentStage: 'PLUKKING',
      stageStartDate: newBatch.harvestDate || new Date().toISOString().split('T')[0],
      completedStages: [],
    };
    const updated = [batch, ...batches];
    setBatches(updated);
    saveToLocal('olivia_batches', updated);
    setIsBatchModalOpen(false);
    setNewBatch({
      yieldType: 'Table', quality: 'Premium', status: 'ACTIVE', weight: 0,
      harvestDate: new Date().toISOString().split('T')[0], currentStage: 'PLUKKING',
    });
  };

  const handleAdvanceStage = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch?.currentStage) return;
    const idx = STAGES.indexOf(batch.currentStage);
    if (idx < 0) return;

    let updated: Batch[];
    if (idx >= STAGES.length - 1) {
      // Last stage → archive
      updated = batches.map(b => b.id === batchId
        ? { ...b, status: 'ARCHIVED' as const }
        : b
      );
    } else {
      const nextStage = STAGES[idx + 1];
      updated = batches.map(b => b.id === batchId
        ? {
            ...b,
            currentStage: nextStage,
            stageStartDate: new Date().toISOString().split('T')[0],
            completedStages: [...(b.completedStages || []), b.currentStage!],
          }
        : b
      );
    }
    setBatches(updated);
    saveToLocal('olivia_batches', updated);
  };

  const handleOpenRecipeModal = (recipe?: Recipe) => {
    setEditingRecipe(recipe || {
      name: '', flavorProfile: 'mild', description: '',
      ingredients: [{ name: '', amount: '', unit: '' }],
      rating: 0, notes: '', isAiGenerated: false, isQualityAssured: false,
      brineChangeDays: [30, 60, 90], marinadeDayFrom: 90, readyAfterDays: 180,
    });
    setIsRecipeModalOpen(true);
  };

  const handleSaveRecipe = () => {
    if (!editingRecipe?.name) return;
    const recipe: Recipe = { ...(editingRecipe as Recipe), id: editingRecipe.id || `R-${Date.now()}` };
    const updated = editingRecipe.id
      ? recipes.map(r => r.id === recipe.id ? recipe : r)
      : [recipe, ...recipes];
    setRecipes(updated);
    saveToLocal('olivia_recipes', updated);
    setIsRecipeModalOpen(false);
  };

  const handleAiAdjust = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    try {
      const adjusted = await geminiService.adjustRecipe(editingRecipe || {}, aiPrompt, 'no');
      setEditingRecipe(prev => ({ ...prev, ...adjusted, isAiGenerated: true }));
      setAiPrompt('');
    } catch {
      alert('AI-kokken opplevde en feil. Vennligst prøv igjen.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDeleteRecipe = (id: string) => {
    if (confirm('Vil du slette denne oppskriften?')) {
      const updated = recipes.filter(r => r.id !== id);
      setRecipes(updated);
      saveToLocal('olivia_recipes', updated);
    }
  };

  const updateRating = (id: string, rating: number) => {
    const updated = recipes.map(r => r.id === id ? { ...r, rating } : r);
    setRecipes(updated);
    saveToLocal('olivia_recipes', updated);
  };

  // Derived data
  const activeBatches = batches.filter(b => b.status === 'ACTIVE');
  const archivedBatches = batches.filter(b => b.status === 'ARCHIVED');
  const allAlerts = activeBatches.flatMap(b => {
    const recipe = recipes.find(r => r.id === b.recipeId);
    const alerts = getBatchAlerts(b, recipe);
    return alerts.map(a => ({ ...a, batchId: b.id }));
  });

  const filteredRecipes = recipes.filter(r => {
    const matchesProfile = flavorFilter === 'all' || r.flavorProfile === flavorFilter;
    const matchesSearch = !recipeSearch || r.name.toLowerCase().includes(recipeSearch.toLowerCase());
    return matchesProfile && matchesSearch;
  });

  const batchesInStage = (stage: TableOliveStage) =>
    activeBatches.filter(b => b.currentStage === stage);

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Layers className="text-green-400" /> Produksjonskontroll
          </h2>
          <p className="text-slate-400 text-sm">Bordoliven pipeline – fra plukking til salg</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleOpenRecipeModal()}
            className="glass hover:bg-white/10 text-white border border-white/10 px-5 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-sm">
            <ChefHat size={18} /> Ny Oppskrift
          </button>
          <button onClick={() => setIsBatchModalOpen(true)}
            className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2 text-sm">
            <Plus size={18} /> Ny Batch
          </button>
        </div>
      </div>

      {/* Alert bar */}
      {allAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allAlerts.map((a, i) => (
            <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border ${
              a.type === 'danger' ? 'bg-red-500/10 border-red-500/30 text-red-300' :
              a.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300' :
              'bg-blue-500/10 border-blue-500/30 text-blue-300'
            }`}>
              <Bell size={12} /> {a.batchId}: {a.text}
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-0 overflow-x-auto">
        {([
          { id: 'pipeline', label: 'Pipeline', icon: <Layers size={14} />, count: activeBatches.length },
          { id: 'active', label: 'Aktive', icon: <ClipboardList size={14} />, count: activeBatches.length },
          { id: 'history', label: 'Historikk', icon: <Archive size={14} />, count: archivedBatches.length },
          { id: 'recipes', label: 'Oppskrifter', icon: <ChefHat size={14} />, count: recipes.length },
          { id: 'guide', label: 'Prosessguide', icon: <BookOpen size={14} /> },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setMainTab(tab.id as MainTab)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${
              mainTab === tab.id ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}>
            {tab.icon} {tab.label}
            {'count' in tab && tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${mainTab === tab.id ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-slate-600'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PIPELINE TAB ─────────────────────────────────────────────────────── */}
      {mainTab === 'pipeline' && (
        <div className="space-y-6">
          {activeBatches.length === 0 ? (
            <div className="glass rounded-[2rem] p-12 border border-white/10 text-center">
              <Layers size={48} className="text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">Ingen aktive batches. Klikk <strong className="text-white">Ny Batch</strong> for å starte.</p>
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-4 min-w-max">
                {STAGES.map(stage => {
                  const stageBatches = batchesInStage(stage);
                  return (
                    <div key={stage} className="w-64 flex-shrink-0">
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border mb-3 ${STAGE_COLORS[stage]}`}>
                        <span className="text-xs font-bold uppercase tracking-widest">{STAGE_LABELS[stage]}</span>
                        <span className="ml-auto text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded-full">
                          {stageBatches.length}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {stageBatches.map(batch => {
                          const recipe = recipes.find(r => r.id === batch.recipeId);
                          const parcel = parcels.find(p => p.id === batch.parcelId);
                          const alerts = getBatchAlerts(batch, recipe);
                          const daysInStage = getDaysSince(batch.stageStartDate || batch.harvestDate);
                          const daysSinceHarvest = getDaysSince(batch.harvestDate);
                          const stageIdx = STAGES.indexOf(stage);
                          const nextStage = stageIdx < STAGES.length - 1 ? STAGES[stageIdx + 1] : null;
                          return (
                            <div key={batch.id} className={`glass rounded-2xl p-4 border transition-all ${
                              alerts.some(a => a.type === 'danger') ? 'border-red-500/40' :
                              alerts.some(a => a.type === 'warning') ? 'border-yellow-500/30' :
                              'border-white/10'
                            }`}>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">{batch.id}</span>
                                <span className="text-[10px] text-slate-500">{daysSinceHarvest}d</span>
                              </div>
                              {parcel && (
                                <p className="text-xs text-green-400 flex items-center gap-1 mb-1">
                                  <MapPin size={10} /> {parcel.name}
                                </p>
                              )}
                              {batch.oliveType && (
                                <p className="text-xs text-slate-300 font-medium mb-1">{batch.oliveType}</p>
                              )}
                              <p className="text-[10px] text-slate-500 mb-1">{batch.weight} kg</p>
                              {recipe && (
                                <p className="text-[10px] text-purple-400 italic line-clamp-1 mb-2">
                                  {recipe.name}
                                </p>
                              )}
                              {alerts.length > 0 && (
                                <div className="space-y-1 mb-2">
                                  {alerts.map((a, i) => (
                                    <div key={i} className={`text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
                                      a.type === 'danger' ? 'bg-red-500/15 text-red-300' :
                                      a.type === 'warning' ? 'bg-yellow-500/15 text-yellow-300' :
                                      'bg-blue-500/15 text-blue-300'
                                    }`}>
                                      <Bell size={9} /> {a.text}
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="text-[9px] text-slate-600 mb-2 flex items-center gap-1">
                                <Clock size={9} /> {daysInStage} dager i {STAGE_LABELS[stage].toLowerCase()}
                              </div>
                              <button
                                onClick={() => handleAdvanceStage(batch.id)}
                                className="w-full text-[10px] font-bold py-1.5 rounded-xl bg-white/5 hover:bg-green-500/10 hover:text-green-400 text-slate-400 border border-white/5 hover:border-green-500/20 transition-all flex items-center justify-center gap-1">
                                {nextStage
                                  ? <><ChevronRight size={10} /> → {STAGE_LABELS[nextStage]}</>
                                  : <><CheckCircle2 size={10} /> Arkiver</>
                                }
                              </button>
                            </div>
                          );
                        })}
                        {stageBatches.length === 0 && (
                          <div className="border border-dashed border-white/5 rounded-2xl p-4 text-center text-[10px] text-slate-700">
                            Ingen batches
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVE / HISTORY LIST ─────────────────────────────────────────────── */}
      {(mainTab === 'active' || mainTab === 'history') && (
        <div className="space-y-4">
          {(mainTab === 'active' ? activeBatches : archivedBatches).map(batch => {
            const recipe = recipes.find(r => r.id === batch.recipeId);
            const parcel = parcels.find(p => p.id === batch.parcelId);
            const alerts = getBatchAlerts(batch, recipe);
            return (
              <div key={batch.id} className="glass rounded-[2rem] p-6 border border-white/10 hover:border-green-500/20 transition-all">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-green-500/10 text-green-400 border border-green-500/20">
                      <Sprout size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">{batch.id}</span>
                        {batch.currentStage && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${STAGE_COLORS[batch.currentStage]}`}>
                            {STAGE_LABELS[batch.currentStage]}
                          </span>
                        )}
                      </div>
                      <p className="text-white font-bold mt-1">{batch.oliveType || 'Bordoliven'} – {batch.weight} kg</p>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <MapPin size={11} className="text-green-400" />
                        {parcel?.name || 'Ukjent parsell'} • Innhøstet: {batch.harvestDate}
                        {recipe && <span className="text-purple-400"> • {recipe.name}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center bg-black/40 px-4 py-2 rounded-2xl border border-white/5">
                      <p className="text-[9px] text-slate-500 uppercase font-bold">Kvalitet</p>
                      <p className="text-lg font-bold text-white flex items-center gap-1"><Award size={14} className="text-yellow-400" />{batch.qualityScore}</p>
                    </div>
                    {batch.status === 'ACTIVE' && (
                      <button onClick={() => handleAdvanceStage(batch.id)}
                        className="text-xs font-bold px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-all flex items-center gap-1">
                        <ChevronRight size={14} /> Neste steg
                      </button>
                    )}
                  </div>
                </div>
                {alerts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                    {alerts.map((a, i) => (
                      <span key={i} className={`text-[10px] font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${
                        a.type === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                        a.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-300'
                      }`}><Bell size={10} />{a.text}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {(mainTab === 'active' ? activeBatches : archivedBatches).length === 0 && (
            <div className="glass rounded-[2rem] p-12 text-center border border-white/10">
              <p className="text-slate-500">Ingen {mainTab === 'active' ? 'aktive' : 'arkiverte'} batches.</p>
            </div>
          )}
        </div>
      )}

      {/* ── RECIPES TAB ──────────────────────────────────────────────────────── */}
      {mainTab === 'recipes' && (
        <div className="space-y-6">
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                placeholder="Søk oppskrift..."
                value={recipeSearch}
                onChange={e => setRecipeSearch(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-5 py-3 text-white text-sm focus:outline-none focus:border-green-500/40"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['all', 'mild', 'syrlig', 'krydret', 'urterik', 'sitrus', 'hvitlok', 'middelhav'] as const).map(f => (
                <button key={f} onClick={() => setFlavorFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    flavorFilter === f
                      ? 'bg-green-500 text-black border-green-500'
                      : f === 'all'
                        ? 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                        : `${FLAVOR_PROFILE_COLORS[f]} hover:opacity-80`
                  }`}>
                  {f === 'all' ? 'Alle' : FLAVOR_PROFILE_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-slate-500">{filteredRecipes.length} oppskrifter</p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRecipes.map(recipe => (
              <div key={recipe.id} className="glass rounded-[1.5rem] p-5 border border-white/10 hover:border-green-500/20 transition-all group flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${recipe.isAiGenerated ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                      {recipe.isAiGenerated ? <Sparkles size={16} /> : <ChefHat size={16} />}
                    </div>
                    {recipe.flavorProfile && (
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${FLAVOR_PROFILE_COLORS[recipe.flavorProfile]}`}>
                        {FLAVOR_PROFILE_LABELS[recipe.flavorProfile]}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} onClick={() => updateRating(recipe.id, s)}>
                        <Star size={12} className={s <= recipe.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'} />
                      </button>
                    ))}
                  </div>
                </div>

                <h4 className="font-bold text-white text-sm mb-1 leading-tight">{recipe.name}</h4>
                {recipe.description && (
                  <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">{recipe.description}</p>
                )}

                {recipe.recommendedOliveTypes && recipe.recommendedOliveTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {recipe.recommendedOliveTypes.slice(0, 3).map(t => (
                      <span key={t} className="text-[9px] bg-green-500/5 border border-green-500/10 text-green-400 px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {recipe.ingredients.slice(0, 4).map((ing, idx) => (
                    <span key={idx} className="text-[9px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-400">
                      {ing.name}
                    </span>
                  ))}
                  {recipe.ingredients.length > 4 && (
                    <span className="text-[9px] text-slate-600">+{recipe.ingredients.length - 4}</span>
                  )}
                </div>

                {(recipe.readyAfterDays || recipe.brineChangeDays?.length) && (
                  <div className="flex gap-3 text-[9px] text-slate-500 mb-3">
                    {recipe.readyAfterDays && (
                      <span className="flex items-center gap-1"><Clock size={9} />{recipe.readyAfterDays}d total</span>
                    )}
                    {recipe.brineChangeDays && recipe.brineChangeDays.length > 0 && (
                      <span className="flex items-center gap-1"><Droplets size={9} />Skifte dag {recipe.brineChangeDays.join(', ')}</span>
                    )}
                  </div>
                )}

                <p className="text-[9px] text-slate-600 italic line-clamp-2 mb-4 flex-1">"{recipe.notes}"</p>

                <div className="flex justify-between items-center pt-3 border-t border-white/5 mt-auto">
                  <button onClick={() => handleOpenRecipeModal(recipe)}
                    className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                    <Edit3 size={12} /> Rediger
                  </button>
                  <button onClick={() => handleDeleteRecipe(recipe.id)}
                    className="text-slate-700 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GUIDE TAB ────────────────────────────────────────────────────────── */}
      {mainTab === 'guide' && (
        <div className="space-y-6">
          <div className="glass rounded-[2rem] p-7 border border-white/10">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen size={20} className="text-green-400" /> Bordoliven – Komplett Prosessguide
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                { method: 'Saltlake', time: '6–12 måneder', bitterness: 'Mild', icon: <Droplets size={20} />, cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                { method: 'Lut (NaOH)', time: '2–4 uker', bitterness: 'Ingen', icon: <FlaskConical size={20} />, cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
                { method: 'Tørrherding', time: '4–6 uker', bitterness: 'Konsentrert', icon: <Thermometer size={20} />, cls: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
              ].map(m => (
                <div key={m.method} className={`p-5 rounded-2xl border ${m.cls}`}>
                  <div className="mb-3">{m.icon}</div>
                  <h4 className="font-bold text-white mb-2">{m.method}</h4>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between text-slate-400"><span>Tid:</span><span className="text-white font-bold">{m.time}</span></div>
                    <div className="flex justify-between text-slate-400"><span>Bitterhet:</span><span className="text-white font-bold">{m.bitterness}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-[2rem] p-7 border border-white/10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Timer size={14} /> 7-Stegs Saltlake-Prosess
            </h3>
            <div className="space-y-4">
              {[
                { stage: 'PLUKKING', num: '01', title: 'Innhøsting', time: 'Okt–Nov', desc: 'Plukk ved riktig modenhetsindeks (0-4 skala). Grønne: index 1-2. Sorter etter størrelse innen 12 timer.' },
                { stage: 'LAKE', num: '02', title: 'Saltlake', time: '1–3 måneder', desc: 'Forbered 8-10% saltlake. Dekk oliven helt. Hold 15-20°C. Kontroller pH (mål: 3.5-4.5). Bytt lake som oppskriften angir.' },
                { stage: 'SKYLLING', num: '03', title: 'Skylling & Rens', time: '1–3 dager', desc: 'Skyll grundig med rent vann. Fjern gjæringsslam. Vurder bitterhet. Lukt: fermentert/frisk = OK.' },
                { stage: 'MARINERING', num: '04', title: 'Marinering', time: '2–8 uker', desc: 'Velg marinade fra oppskriftsboken. Tilsett urter og krydder. Hold 18-22°C. Smak jevnlig.' },
                { stage: 'LAGRING', num: '05', title: 'Lagring & Modning', time: '1–6 måneder', desc: 'Mørkt, kjølig rom (10-15°C). Kontroller pH månedlig. Sjekk for mugg. Dokumenter dato og batchnummer.' },
                { stage: 'PAKKING', num: '06', title: 'Pakking & Merking', time: '1–2 dager', desc: 'Steriliserte glass (kok 10 min). Frisk saltlake. Merk: sort, dato, best-før (18-24 mnd).' },
                { stage: 'SALG', num: '07', title: 'Salg & Distribusjon', time: 'Løpende', desc: 'Pris: grønn gourmet €8-15/kg, premium sort €10-20/kg. Registrer salg under Økonomi for lønnsomhetsanalyse.' },
              ].map((s, i) => (
                <div key={s.stage} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`p-2 rounded-xl border ${STAGE_COLORS[s.stage as TableOliveStage]}`}>
                      {i === 0 ? <Sprout size={14} /> : i === 1 ? <Droplets size={14} /> : i === 2 ? <RefreshCcw size={14} /> : i === 3 ? <ChefHat size={14} /> : i === 4 ? <Archive size={14} /> : i === 5 ? <Scale size={14} /> : <ShoppingCart size={14} />}
                    </div>
                    {i < 6 && <div className="w-px flex-1 bg-white/5 min-h-[20px]" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-mono text-slate-600">{s.num}</span>
                      <h4 className="font-bold text-white text-sm">{s.title}</h4>
                      <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-full text-slate-500">{s.time}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NY BATCH MODAL ────────────────────────────────────────────────────── */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass w-full max-w-lg rounded-[2.5rem] p-8 border border-white/20 shadow-2xl space-y-5 my-8">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white">Ny Batch</h3>
              <button onClick={() => setIsBatchModalOpen(false)} className="p-2 text-slate-500"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Parsell</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={newBatch.parcelId} onChange={e => setNewBatch({ ...newBatch, parcelId: e.target.value })}>
                  <option value="">Velg parsell...</option>
                  {parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Olivensort</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={newBatch.oliveType} onChange={e => setNewBatch({ ...newBatch, oliveType: e.target.value })}>
                  <option value="">Velg olivensort...</option>
                  {OLIVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Oppskrift</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={newBatch.recipeId} onChange={e => setNewBatch({ ...newBatch, recipeId: e.target.value })}>
                  <option value="">Velg oppskrift (valgfritt)...</option>
                  {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Antall kg</label>
                <input type="number" placeholder="0"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  onChange={e => setNewBatch({ ...newBatch, weight: Number(e.target.value) })} />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dato</label>
                <input type="date"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={newBatch.harvestDate}
                  onChange={e => setNewBatch({ ...newBatch, harvestDate: e.target.value })} />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Kvalitet</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={newBatch.quality} onChange={e => setNewBatch({ ...newBatch, quality: e.target.value as Batch['quality'] })}>
                  <option value="Premium">Premium</option>
                  <option value="Standard">Standard</option>
                  <option value="Commercial">Commercial</option>
                </select>
              </div>
            </div>

            <button onClick={handleCreateBatch}
              className="w-full bg-green-500 text-black font-bold py-4 rounded-[2rem] text-base shadow-2xl hover:bg-green-400 transition-all">
              Opprett Batch
            </button>
          </div>
        </div>
      )}

      {/* ── RECIPE EDITOR MODAL ───────────────────────────────────────────────── */}
      {isRecipeModalOpen && editingRecipe && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass w-full max-w-2xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl my-8 space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                  <ChefHat size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{editingRecipe.id ? 'Rediger' : 'Ny'} Oppskrift</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Gourmet Bordoliven</p>
                </div>
              </div>
              <button onClick={() => setIsRecipeModalOpen(false)} className="p-2 text-slate-500"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Navn</label>
                <input type="text" placeholder="Navn på oppskriften"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white font-bold focus:outline-none focus:border-purple-500/40"
                  value={editingRecipe.name || ''}
                  onChange={e => setEditingRecipe({ ...editingRecipe, name: e.target.value })} />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Smaksprofil</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={editingRecipe.flavorProfile || 'mild'}
                  onChange={e => setEditingRecipe({ ...editingRecipe, flavorProfile: e.target.value as Recipe['flavorProfile'] })}>
                  {Object.entries(FLAVOR_PROFILE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Klar etter (dager)</label>
                <input type="number" placeholder="180"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={editingRecipe.readyAfterDays || ''}
                  onChange={e => setEditingRecipe({ ...editingRecipe, readyAfterDays: Number(e.target.value) })} />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Lakeskift-dager (kommaseparert)</label>
                <input type="text" placeholder="30, 60, 90"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={(editingRecipe.brineChangeDays || []).join(', ')}
                  onChange={e => setEditingRecipe({
                    ...editingRecipe,
                    brineChangeDays: e.target.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
                  })} />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Marinering fra dag</label>
                <input type="number" placeholder="90"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={editingRecipe.marinadeDayFrom || ''}
                  onChange={e => setEditingRecipe({ ...editingRecipe, marinadeDayFrom: Number(e.target.value) })} />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Beskrivelse</label>
                <input type="text" placeholder="Kort beskrivelse av oppskriften"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none"
                  value={editingRecipe.description || ''}
                  onChange={e => setEditingRecipe({ ...editingRecipe, description: e.target.value })} />
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Ingredienser</label>
                <button onClick={() => setEditingRecipe({
                  ...editingRecipe,
                  ingredients: [...(editingRecipe.ingredients || []), { name: '', amount: '', unit: '' }]
                })} className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  <PlusCircle size={13} /> Legg til
                </button>
              </div>
              <div className="space-y-2">
                {editingRecipe.ingredients?.map((ing: Ingredient, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <input placeholder="Ingrediens"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none"
                      value={ing.name}
                      onChange={e => {
                        const arr = [...editingRecipe.ingredients!];
                        arr[idx] = { ...arr[idx], name: e.target.value };
                        setEditingRecipe({ ...editingRecipe, ingredients: arr });
                      }} />
                    <input placeholder="Mengde"
                      className="w-20 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                      value={ing.amount}
                      onChange={e => {
                        const arr = [...editingRecipe.ingredients!];
                        arr[idx] = { ...arr[idx], amount: e.target.value };
                        setEditingRecipe({ ...editingRecipe, ingredients: arr });
                      }} />
                    <input placeholder="Enhet"
                      className="w-20 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                      value={ing.unit}
                      onChange={e => {
                        const arr = [...editingRecipe.ingredients!];
                        arr[idx] = { ...arr[idx], unit: e.target.value };
                        setEditingRecipe({ ...editingRecipe, ingredients: arr });
                      }} />
                    <button onClick={() => setEditingRecipe({
                      ...editingRecipe,
                      ingredients: editingRecipe.ingredients!.filter((_, i) => i !== idx)
                    })} className="p-2.5 text-slate-600 hover:text-red-400">
                      <MinusCircle size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notat / Prosess</label>
              <textarea rows={3} placeholder="Prosessbeskrivelse, tips, anbefalinger..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none resize-none"
                value={editingRecipe.notes || ''}
                onChange={e => setEditingRecipe({ ...editingRecipe, notes: e.target.value })} />
            </div>

            {/* AI Adjustment */}
            <div className="p-5 rounded-[1.5rem] bg-purple-500/5 border border-purple-500/20 space-y-3">
              <div className="flex items-center gap-2 text-purple-400">
                <Wand2 size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">AI-Kokk Justering</span>
              </div>
              <div className="flex gap-2">
                <input type="text"
                  placeholder="F.eks. 'Mer sitrus og mindre salt' eller 'Balanser for mildere profil'..."
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAiAdjust()} />
                <button onClick={handleAiAdjust} disabled={isAiLoading || !aiPrompt}
                  className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
                  {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Juster
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setIsRecipeModalOpen(false)}
                className="flex-1 py-3.5 rounded-2xl glass text-white font-bold hover:bg-white/5">Avbryt</button>
              <button onClick={handleSaveRecipe}
                className="flex-1 py-3.5 rounded-2xl bg-green-500 text-black font-bold hover:bg-green-400 shadow-xl shadow-green-500/20 flex items-center justify-center gap-2">
                <Save size={18} /> Lagre oppskrift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionView;
