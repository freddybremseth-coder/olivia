
import React, { useState, useEffect } from 'react';
import {
  Plus, Sprout, X, Layers, Star, Edit3, Wand2,
  Sparkles, ChefHat, Save, AlertCircle,
  PlusCircle, MinusCircle, Clock, BookOpen,
  Droplets, Thermometer, FlaskConical, Scale,
  Loader2, Trash2, CheckCircle2, ShoppingCart,
  ChevronRight, Search, Bell, Archive, RefreshCcw,
  ClipboardList, MapPin, Award, Timer, Filter, Wheat
} from 'lucide-react';
import { Batch, Parcel, Recipe, Ingredient, TableOliveStage, Language, HarvestRecord, SalesChannel } from '../types';
import { geminiService } from '../services/geminiService';
import { useTranslation } from '../services/i18nService';
import { fetchHarvests, upsertHarvest, deleteHarvest as dbDeleteHarvest } from '../services/db';
import {
  DEFAULT_RECIPES, FLAVOR_PROFILE_LABELS, FLAVOR_PROFILE_COLORS, OLIVE_TYPES
} from '../data/olivenRecipes';

type FlavorFilter = 'all' | 'mild' | 'syrlig' | 'krydret' | 'urterik' | 'sitrus' | 'hvitlok' | 'middelhav';
type MainTab = 'harvest' | 'pipeline' | 'active' | 'history' | 'recipes' | 'guide';

const CHANNEL_LABELS: Record<SalesChannel, string> = {
  cooperativa:  'Cooperativa (råvare)',
  bordoliven:   'Bordoliven (spise)',
  olje_premier: 'Olje – Extra Virgin Premier',
  olje_export:  'Olje – Export',
};
const CHANNEL_COLORS: Record<SalesChannel, string> = {
  cooperativa:  'bg-amber-500/20 text-amber-300',
  bordoliven:   'bg-green-500/20 text-green-300',
  olje_premier: 'bg-yellow-500/20 text-yellow-200',
  olje_export:  'bg-blue-500/20 text-blue-300',
};
const VARIETIES = ['Picual', 'Arbequina', 'Hojiblanca', 'Manzanilla', 'Lechin', 'Cornicabra', 'Frantoio', 'Leccino', 'Annen'];

const currentSeason = () => new Date().getFullYear().toString();

const STAGES: TableOliveStage[] = ['PLUKKING', 'LAKE', 'SKYLLING', 'MARINERING', 'LAGRING', 'PAKKING', 'SALG'];

interface ProductionViewProps {
  language: Language;
  parcels: Parcel[];
}

const ProductionView: React.FC<ProductionViewProps> = ({ language, parcels }) => {
  const { t } = useTranslation(language);

  const STAGE_LABELS: Record<TableOliveStage, string> = {
    PLUKKING: t('picking'),
    LAKE: t('brine'),
    SKYLLING: t('rinsing'),
    MARINERING: t('marinating'),
    LAGRING: t('storage'),
    PAKKING: t('packaging'),
    SALG: t('sale'),
  };
  
  // ── Harvest records (persisted to Supabase) ───────────────────────────────
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [harvestSeason, setHarvestSeason] = useState(currentSeason());
  const [newHarvest, setNewHarvest] = useState<Partial<HarvestRecord>>({
    season: currentSeason(),
    date: new Date().toISOString().slice(0, 10),
    variety: 'Picual',
    kg: 0,
    channel: 'cooperativa',
    pricePerKg: 0.45,
  });

  useEffect(() => {
    fetchHarvests().then(setHarvests);
  }, []);

  const addHarvest = async () => {
    if (!newHarvest.parcelId || !newHarvest.kg || newHarvest.kg <= 0) return;
    const rec: HarvestRecord = {
      id: `H${Date.now()}`,
      parcelId: newHarvest.parcelId!,
      season: newHarvest.season || currentSeason(),
      date: newHarvest.date || new Date().toISOString().slice(0, 10),
      variety: newHarvest.variety || 'Picual',
      kg: newHarvest.kg,
      channel: newHarvest.channel as SalesChannel || 'cooperativa',
      pricePerKg: newHarvest.pricePerKg || 0,
      notes: newHarvest.notes,
    };
    await upsertHarvest(rec);
    setHarvests(prev => [rec, ...prev]);
    setNewHarvest(prev => ({ ...prev, kg: 0, notes: '' }));
  };
  const deleteHarvestRecord = async (id: string) => {
    if (!confirm('Slette denne høsteregistreringen?')) return;
    await dbDeleteHarvest(id);
    setHarvests(prev => prev.filter(h => h.id !== id));
  };
  const seasonHarvests = harvests.filter(h => h.season === harvestSeason);
  const totalKg = seasonHarvests.reduce((s, h) => s + h.kg, 0);
  const totalRevenue = seasonHarvests.reduce((s, h) => s + h.kg * h.pricePerKg, 0);
  const seasons = [...new Set([currentSeason(), ...harvests.map(h => h.season)])].sort((a,b) => b.localeCompare(a));

  const [batches, setBatches] = useState<Batch[]>([
    {
      id: 'B001',
      parcelId: 'p1',
      recipeId: 'R001',
      yieldType: 'Table',
      quality: 'Premium',
      weight: 150,
      harvestDate: '2023-10-28',
      currentStage: 'MARINERING',
      status: 'ACTIVE',
      logs: [{ stage: 'PLUKKING', startDate: '2023-10-28', notes: 'Håndplukket ved optimal modenhet.' }, { stage: 'LAKE', startDate: '2023-10-29', notes: 'Lake med 8% salt.' }],
      qualityMetrics: { acidity: 0.2, peroxide: 4, k232: 1.8, k270: 0.15, deltaK: 0.005, phenols: 550 },
    },
    {
      id: 'B002',
      parcelId: 'p2',
      recipeId: 'R003',
      yieldType: 'Table',
      quality: 'Good',
      weight: 320,
      harvestDate: '2023-11-05',
      currentStage: 'LAKE',
      status: 'ACTIVE',
      logs: [{ stage: 'PLUKKING', startDate: '2023-11-05', notes: 'Maskinell høsting.' }],
    }
  ]);
  const [recipes, setRecipes] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [mainTab, setMainTab] = useState<MainTab>('harvest');
  const [flavorFilter, setFlavorFilter] = useState<FlavorFilter>('all');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [newBatch, setNewBatch] = useState<Partial<Batch>>({
    yieldType: 'Table', quality: 'Premium', status: 'ACTIVE', weight: 0,
    harvestDate: new Date().toISOString().split('T')[0], currentStage: 'PLUKKING',
  });

  const handleOpenRecipeModal = (recipe: Recipe | null = null) => {
    if (recipe) {
      setEditingRecipe(JSON.parse(JSON.stringify(recipe))); // Deep copy to avoid state mutation issues
    } else {
      setEditingRecipe({ name: '', description: '', flavorProfile: 'mild', ingredients: [], instructions: '', isAiGenerated: false });
    }
    setIsRecipeModalOpen(true);
  };
  
  const handleSaveRecipe = () => {
    if (!editingRecipe || !editingRecipe.name) return;

    if (editingRecipe.id) { // Update existing recipe
      setRecipes(recipes.map(r => r.id === editingRecipe!.id ? editingRecipe as Recipe : r));
    } else { // Create new recipe
      const newRecipe: Recipe = {
        id: `R${Date.now()}`,
        ...editingRecipe,
      } as Recipe;
      setRecipes([...recipes, newRecipe]);
    }
    setIsRecipeModalOpen(false);
    setEditingRecipe(null);
  };

  const handleCreateBatch = () => {
    if (!newBatch.parcelId || !newBatch.weight || newBatch.weight <= 0) {
      alert(t('please_select_parcel_and_weight'));
      return;
    }
    const batch: Batch = {
      id: `B${Date.now()}`,
      parcelId: newBatch.parcelId,
      yieldType: newBatch.yieldType || 'Table',
      quality: newBatch.quality || 'Standard',
      weight: newBatch.weight,
      harvestDate: newBatch.harvestDate || new Date().toISOString().split('T')[0],
      currentStage: 'PLUKKING',
      status: 'ACTIVE',
      logs: [{ stage: 'PLUKKING', startDate: new Date().toISOString().split('T')[0], notes: 'Batch opprettet.' }]
    };
    setBatches([...batches, batch]);
    setIsBatchModalOpen(false);
    setNewBatch({ yieldType: 'Table', quality: 'Premium', status: 'ACTIVE', weight: 0, harvestDate: new Date().toISOString().split('T')[0], currentStage: 'PLUKKING' });
  };

  const handleAdvanceStage = (batchId: string) => {
    setBatches(batches.map(b => {
      if (b.id === batchId) {
        const currentIndex = STAGES.indexOf(b.currentStage);
        if (currentIndex < STAGES.length - 1) {
          const nextStage = STAGES[currentIndex + 1];
          return { 
            ...b, 
            currentStage: nextStage,
            logs: [...(b.logs || []), { stage: nextStage, startDate: new Date().toISOString().split('T')[0], notes: '' }]
          };
        } else { // Last stage, archive it
          return { ...b, status: 'ARCHIVED' };
        }
      }
      return b;
    }));
  };
  
  const handleAiAdjust = async () => {
    if (!aiPrompt || !editingRecipe) return;
    setIsAiLoading(true);
    try {
      const adjusted = await geminiService.adjustRecipe(editingRecipe || {}, aiPrompt, language);
      setEditingRecipe(prev => ({ ...prev, ...adjusted, isAiGenerated: true }));
      setAiPrompt('');
    } catch (err) {
      alert(t('ai_chef_error') + (err instanceof Error ? ` ${err.message}`: ''));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleDeleteRecipe = (id: string) => {
    if (confirm(t('delete_recipe_confirm'))) {
        setRecipes(recipes.filter(r => r.id !== id));
    }
  };

  const activeBatches = batches.filter(b => b.status === 'ACTIVE');
  const archivedBatches = batches.filter(b => b.status === 'ARCHIVED');
  const filteredRecipes = recipes.filter(r => {
    const matchesProfile = flavorFilter === 'all' || r.flavorProfile === flavorFilter;
    const matchesSearch = !recipeSearch || r.name.toLowerCase().includes(recipeSearch.toLowerCase());
    return matchesProfile && matchesSearch;
  });
  const batchesInStage = (stage: TableOliveStage) => activeBatches.filter(b => b.currentStage === stage);

  const getParcelName = (parcelId: string) => parcels.find(p => p.id === parcelId)?.name || 'Ukjent Lunn';

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Layers className="text-green-400" /> {t('production_control')}
          </h2>
          <p className="text-slate-400 text-sm">{t('table_olive_pipeline')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleOpenRecipeModal()} className="bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"><ChefHat size={18} /> {t('new_recipe')}</button>
          <button onClick={() => setIsBatchModalOpen(true)} className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all"><Plus size={18} /> {t('new_batch')}</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-0 overflow-x-auto">
        {([
          { id: 'harvest', label: 'Høsting', icon: <Wheat size={14} />, count: seasonHarvests.length },
          { id: 'pipeline', label: t('pipeline'), icon: <Layers size={14} />, count: activeBatches.length },
          { id: 'active', label: t('active_batches'), icon: <ClipboardList size={14} />, count: activeBatches.length },
          { id: 'history', label: t('history'), icon: <Archive size={14} />, count: archivedBatches.length },
          { id: 'recipes', label: t('recipes'), icon: <ChefHat size={14} />, count: recipes.length },
          { id: 'guide', label: t('process_guide'), icon: <BookOpen size={14} /> },
        ] as const).map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setMainTab(tab.id as MainTab)} 
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${mainTab === tab.id ? 'border-green-400 text-green-400' : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'}`}>
            {tab.icon} {tab.label}
            {tab.count !== undefined && <span className={`text-xs rounded-full px-2 py-0.5 ${mainTab === tab.id ? 'bg-green-400/20 text-green-300' : 'bg-slate-700 text-slate-300'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Høsting tab ── */}
      {mainTab === 'harvest' && (
        <div className="space-y-6">
          {/* Season KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="glass rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Sesong</p>
              <select value={harvestSeason} onChange={e => setHarvestSeason(e.target.value)}
                className="bg-transparent text-lg font-black text-white focus:outline-none cursor-pointer w-full">
                {seasons.map(s => <option key={s} value={s} className="bg-slate-800">{s}</option>)}
              </select>
            </div>
            <div className="glass rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Totalt høstet</p>
              <p className="text-2xl font-black text-white">{totalKg.toLocaleString('no')} <span className="text-base text-slate-400">kg</span></p>
            </div>
            <div className="glass rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Bruttoinntekt</p>
              <p className="text-2xl font-black text-green-400">€{totalRevenue.toLocaleString('no', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            </div>
            <div className="glass rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Registreringer</p>
              <p className="text-2xl font-black text-white">{seasonHarvests.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* New harvest form */}
            <div className="lg:col-span-2 glass rounded-2xl p-6 border border-green-500/20 space-y-4">
              <h4 className="font-bold text-white flex items-center gap-2"><Plus size={16} className="text-green-400" /> Registrer høsting</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Parsell</label>
                  <select value={newHarvest.parcelId || ''} onChange={e => setNewHarvest(p => ({...p, parcelId: e.target.value}))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50">
                    <option value="">Velg parsell...</option>
                    {parcels.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Dato</label>
                    <input type="date" value={newHarvest.date} onChange={e => setNewHarvest(p => ({...p, date: e.target.value}))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Sort</label>
                    <select value={newHarvest.variety} onChange={e => setNewHarvest(p => ({...p, variety: e.target.value}))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-sm text-white outline-none">
                      {VARIETIES.map(v => <option key={v} value={v} className="bg-slate-800">{v}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Salgskanal</label>
                  <select value={newHarvest.channel} onChange={e => setNewHarvest(p => ({...p, channel: e.target.value as SalesChannel, pricePerKg: e.target.value === 'cooperativa' ? 0.45 : e.target.value === 'bordoliven' ? 0.90 : e.target.value === 'olje_premier' ? 0.80 : 0.60}))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none">
                    {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k} className="bg-slate-800">{v}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Kilo (kg)</label>
                    <input type="number" min="0" step="10" value={newHarvest.kg || ''} onChange={e => setNewHarvest(p => ({...p, kg: +e.target.value}))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none font-bold" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Pris/kg (€)</label>
                    <input type="number" min="0" step="0.01" value={newHarvest.pricePerKg || ''} onChange={e => setNewHarvest(p => ({...p, pricePerKg: +e.target.value}))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none font-bold" placeholder="0.00" />
                  </div>
                </div>
                {newHarvest.kg && newHarvest.pricePerKg ? (
                  <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 text-sm font-bold text-green-400">
                    Inntekt: €{(newHarvest.kg * newHarvest.pricePerKg).toLocaleString('no', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>
                ) : null}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Notater</label>
                  <input type="text" value={newHarvest.notes || ''} onChange={e => setNewHarvest(p => ({...p, notes: e.target.value}))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none" placeholder="Valgfritt..." />
                </div>
                <button onClick={addHarvest} disabled={!newHarvest.parcelId || !newHarvest.kg}
                  className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all">
                  <Save size={16} /> Lagre høstregistrering
                </button>
              </div>
            </div>

            {/* Harvest list */}
            <div className="lg:col-span-3 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white">Høsteregistreringer {harvestSeason}</h4>
                <span className="text-xs text-slate-500">{seasonHarvests.length} poster</span>
              </div>
              {seasonHarvests.length === 0 ? (
                <div className="glass rounded-2xl p-10 border border-white/10 text-center text-slate-500">
                  <Wheat size={36} className="mx-auto mb-3 opacity-30" />
                  <p>Ingen registreringer for {harvestSeason}</p>
                  <p className="text-xs mt-1">Fyll inn skjemaet til venstre for å starte</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Per-parcel summary */}
                  {(() => {
                    const byParcel: Record<string, {kg: number; rev: number; name: string}> = {};
                    seasonHarvests.forEach(h => {
                      const name = parcels.find(p => p.id === h.parcelId)?.name || 'Ukjent';
                      if (!byParcel[h.parcelId]) byParcel[h.parcelId] = {kg: 0, rev: 0, name};
                      byParcel[h.parcelId].kg += h.kg;
                      byParcel[h.parcelId].rev += h.kg * h.pricePerKg;
                    });
                    return Object.values(byParcel).length > 1 ? (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {Object.values(byParcel).map(p => (
                          <div key={p.name} className="glass rounded-xl p-3 border border-white/5 text-xs">
                            <p className="font-bold text-white truncate">{p.name}</p>
                            <p className="text-slate-400 mt-0.5">{p.kg.toLocaleString('no')} kg · <span className="text-green-400 font-bold">€{p.rev.toLocaleString('no',{maximumFractionDigits:0})}</span></p>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                  {seasonHarvests.map(h => (
                    <div key={h.id} className="glass rounded-xl p-4 border border-white/10 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CHANNEL_COLORS[h.channel]}`}>{CHANNEL_LABELS[h.channel]}</span>
                          <span className="text-[10px] text-slate-500">{h.date}</span>
                        </div>
                        <p className="text-sm font-bold text-white">{parcels.find(p => p.id === h.parcelId)?.name || h.parcelId} · {h.variety}</p>
                        <p className="text-xs text-slate-400">{h.kg.toLocaleString('no')} kg × €{h.pricePerKg}/kg = <span className="text-green-400 font-bold">€{(h.kg * h.pricePerKg).toLocaleString('no',{maximumFractionDigits:0})}</span></p>
                        {h.notes && <p className="text-[10px] text-slate-500 mt-0.5 italic">{h.notes}</p>}
                      </div>
                      <button onClick={() => deleteHarvestRecord(h.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg flex-shrink-0 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {mainTab === 'pipeline' && (
        activeBatches.length === 0 ? (
            <div className="text-center py-20 px-4 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700" dangerouslySetInnerHTML={{ __html: t('no_active_batches') }} />
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-4 min-w-max">
              {STAGES.map(stage => {
                const stageBatches = batchesInStage(stage);
                return (
                  <div key={stage} className="w-72 flex-shrink-0 bg-slate-900/50 rounded-xl p-3 border border-slate-800">
                    <h3 className="font-bold text-slate-300 tracking-wide flex items-center justify-between">{STAGE_LABELS[stage]} <span className="text-sm font-normal bg-slate-700 text-slate-300 rounded-full h-6 w-6 inline-flex items-center justify-center">{stageBatches.length}</span></h3>
                    <div className="space-y-3 mt-4 h-[60vh] overflow-y-auto pr-1">
                        {stageBatches.map(batch => {
                            const nextStage = STAGES[STAGES.indexOf(batch.currentStage) + 1];
                            return (
                                <div key={batch.id} className="glass p-3 rounded-lg border-l-4 border-green-500/50">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-sm text-white">{batch.id} - {batch.weight} kg</p>
                                        <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">{batch.quality}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin size={12}/> {getParcelName(batch.parcelId)}</p>
                                    <button onClick={() => handleAdvanceStage(batch.id)} className="text-xs mt-3 w-full bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-md flex items-center justify-center gap-1 transition-all">
                                      {nextStage ? <>{t('advance_to')} {STAGE_LABELS[nextStage]} <ChevronRight size={14} /></> : <><CheckCircle2 size={14} /> {t('archive')}</>}
                                    </button>
                                </div>
                            )
                        })}
                        {stageBatches.length === 0 && <div className="text-center text-xs text-slate-500 pt-10">{t('no_batches_in_stage')}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {mainTab === 'active' && (
        <div className="space-y-4">
          {activeBatches.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
              <p>{t('no_active_batches')}</p>
            </div>
          ) : activeBatches.map(batch => (
            <div key={batch.id} className="glass rounded-xl p-4 border border-white/10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-white">{batch.id} — {batch.weight} kg</p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><MapPin size={12} /> {getParcelName(batch.parcelId)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">{batch.quality}</span>
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">{STAGE_LABELS[batch.currentStage || 'PLUKKING']}</span>
                </div>
              </div>
              {batch.logs && batch.logs.length > 0 && (
                <div className="mt-3 border-t border-white/5 pt-3 space-y-1">
                  {batch.logs.slice(-2).map((log, i) => (
                    <p key={i} className="text-xs text-slate-400">
                      <span className="text-slate-300 font-medium">{STAGE_LABELS[log.stage]}</span>{log.notes ? ` — ${log.notes}` : ''}
                    </p>
                  ))}
                </div>
              )}
              <button onClick={() => handleAdvanceStage(batch.id)} className="text-xs mt-3 w-full bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-2 rounded-lg flex items-center justify-center gap-1 transition-all">
                {STAGES.indexOf(batch.currentStage || 'PLUKKING') < STAGES.length - 1
                  ? <>{t('advance_to')} {STAGE_LABELS[STAGES[STAGES.indexOf(batch.currentStage || 'PLUKKING') + 1]]} <ChevronRight size={14} /></>
                  : <><CheckCircle2 size={14} /> {t('archive')}</>}
              </button>
            </div>
          ))}
        </div>
      )}

      {mainTab === 'history' && (
        <div className="space-y-4">
          {archivedBatches.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Archive size={40} className="mx-auto mb-3 opacity-30" />
              <p>{t('no_archived_batches') || 'Ingen arkiverte batch'}</p>
            </div>
          ) : archivedBatches.map(batch => (
            <div key={batch.id} className="glass rounded-xl p-4 border border-white/10 opacity-70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{batch.id} — {batch.weight} kg</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><MapPin size={12} /> {getParcelName(batch.parcelId)} · {batch.harvestDate}</p>
                </div>
                <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">{t('archived') || 'Arkivert'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {mainTab === 'recipes' && (
        <div>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('search_recipes') || 'Søk oppskrifter...'}
                value={recipeSearch}
                onChange={e => setRecipeSearch(e.target.value)}
                className="w-full bg-slate-800 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto">
              {(['all', 'mild', 'syrlig', 'krydret', 'urterik'] as const).map(f => (
                <button key={f} onClick={() => setFlavorFilter(f as FlavorFilter)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${flavorFilter === f ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-slate-800 text-slate-400 border border-white/10 hover:text-white'}`}>
                  {f === 'all' ? t('all') || 'Alle' : f}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map(recipe => (
              <div key={recipe.id} className="glass rounded-xl p-4 border border-white/10 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-bold text-white text-sm">{recipe.name}</h4>
                  {recipe.isAiGenerated && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">AI</span>}
                </div>
                {recipe.description && <p className="text-xs text-slate-400 mb-3 flex-1">{recipe.description}</p>}
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${recipe.flavorProfile ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                    {recipe.flavorProfile || 'standard'}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenRecipeModal(recipe)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => handleDeleteRecipe(recipe.id)} className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mainTab === 'guide' && (
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">{t('process_guide_description') || 'Steg-for-steg guide for produksjon av bordoliven.'}</p>
          {STAGES.map((stage, index) => (
            <div key={stage} className="glass rounded-xl p-4 border border-white/10 flex gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 font-bold text-sm flex items-center justify-center flex-shrink-0">{index + 1}</div>
              <div>
                <h4 className="font-bold text-white">{STAGE_LABELS[stage]}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  {stage === 'PLUKKING' && 'Oliven plukkes ved optimal modenhet (lila/svart farge). Håndplukking gir best kvalitet.'}
                  {stage === 'LAKE' && 'Oliven legges i 8-10% saltlake i 3-6 måneder for å fjerne bitterhet (oleuropein).'}
                  {stage === 'SKYLLING' && 'Oliven skylles grundig i ferskvann for å fjerne overflødig salt.'}
                  {stage === 'MARINERING' && 'Oliven marineres med urter, krydder og olje etter valgt oppskrift.'}
                  {stage === 'LAGRING' && 'Oliven lagres kjølig (4-8°C) i lufttette glass/beholder.'}
                  {stage === 'PAKKING' && 'Oliven pakkes i salgsklare enheter med etikett og sporbarhetskode.'}
                  {stage === 'SALG' && 'Ferdige produkter distribueres til kunder og markedet.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Recipe Modal */}
      {isRecipeModalOpen && editingRecipe && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ChefHat size={18} className="text-sky-400" />
                {editingRecipe.id ? t('edit_recipe') || 'Rediger oppskrift' : t('new_recipe')}
              </h3>
              <button onClick={() => setIsRecipeModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder={t('recipe_name') || 'Oppskriftsnavn'}
                value={editingRecipe.name || ''}
                onChange={e => setEditingRecipe(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
              />
              <textarea
                placeholder={t('description') || 'Beskrivelse'}
                value={editingRecipe.description || ''}
                onChange={e => setEditingRecipe(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50 resize-none"
              />
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2 mb-3"><Wand2 size={14} /> AI Chef</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('ai_adjust_prompt') || 'Beskriv hva du vil justere...'}
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                  <button
                    onClick={handleAiAdjust}
                    disabled={isAiLoading || !aiPrompt}
                    className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                  >
                    {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsRecipeModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">{t('cancel') || 'Avbryt'}</button>
                <button onClick={handleSaveRecipe} className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                  <Save size={14} /> {t('save') || 'Lagre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Batch Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl border border-white/10 p-6 w-full max-w-md m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Plus size={18} className="text-green-400" /> {t('new_batch')}</h3>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <select
                value={newBatch.parcelId || ''}
                onChange={e => setNewBatch(prev => ({ ...prev, parcelId: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="">{t('select_parcel') || 'Velg parsell...'}</option>
                {parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input
                type="number"
                placeholder={t('weight_kg') || 'Vekt (kg)'}
                value={newBatch.weight || ''}
                onChange={e => setNewBatch(prev => ({ ...prev, weight: Number(e.target.value) }))}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              />
              <select
                value={newBatch.quality || 'Premium'}
                onChange={e => setNewBatch(prev => ({ ...prev, quality: e.target.value as any }))}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="Premium">Premium</option>
                <option value="Good">Good</option>
                <option value="Standard">Standard</option>
              </select>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">{t('cancel') || 'Avbryt'}</button>
                <button onClick={handleCreateBatch} className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2">
                  <Plus size={14} /> {t('create') || 'Opprett'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductionView;
