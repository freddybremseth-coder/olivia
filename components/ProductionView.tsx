
import React, { useState, useEffect } from 'react';
import {
  Plus, Sprout, X, Layers, Star, Edit3, Wand2,
  Sparkles, ChefHat, Save, AlertCircle,
  PlusCircle, MinusCircle, Clock, BookOpen,
  Droplets, Thermometer, FlaskConical, Scale,
  Loader2, Trash2, CheckCircle2, ShoppingCart,
  ChevronRight, Search, Bell, Archive, RefreshCcw,
  ClipboardList, MapPin, Award, Timer, Filter, Wheat,
  FileText, Zap, Tag, ArrowRight
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
const VARIETIES = ['Gordal', 'Changlot Real', 'Genoesa', 'Picual', 'Arbequina', 'Hojiblanca', 'Manzanilla', 'Lechin', 'Cornicabra', 'Frantoio', 'Leccino', 'Annen'];

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
      id: 'B001', parcelId: 'p1', recipeId: 'R001', yieldType: 'Table', quality: 'Premium', weight: 150,
      harvestDate: '2023-10-28', currentStage: 'MARINERING', status: 'ACTIVE',
      recipeName: 'Klassisk Biar-Lake (10% salt)',
      recipeSnapshot: [
        { name: 'Vann', amount: '1', unit: 'liter' },
        { name: 'Havsalt (grovt)', amount: '100', unit: 'g' },
        { name: 'Hvitløk', amount: '4', unit: 'fedd' },
        { name: 'Fersk rosmarin', amount: '2', unit: 'kvister' },
        { name: 'Laurbærblad', amount: '2', unit: 'stk' },
      ],
      logs: [{ stage: 'PLUKKING', startDate: '2023-10-28', notes: 'Håndplukket ved optimal modenhet.' }, { stage: 'LAKE', startDate: '2023-10-29', notes: 'Lake med 8% salt.' }],
      qualityMetrics: { acidity: 0.2, peroxide: 4, k232: 1.8, k270: 0.15, deltaK: 0.005, phenols: 550 },
    },
    {
      id: 'B002', parcelId: 'p2', recipeId: 'R003', yieldType: 'Table', quality: 'Good', weight: 320,
      harvestDate: '2023-11-05', currentStage: 'LAKE', status: 'ACTIVE',
      logs: [{ stage: 'PLUKKING', startDate: '2023-11-05', notes: 'Maskinell høsting.' }],
    }
  ]);
  const [recipes, setRecipes] = useState<Recipe[]>(DEFAULT_RECIPES);
  const [mainTab, setMainTab] = useState<MainTab>('harvest');
  const [flavorFilter, setFlavorFilter] = useState<FlavorFilter>('all');
  const [recipeSearch, setRecipeSearch] = useState('');

  // ── Recipe modal state ────────────────────────────────────────────────────
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [recipeFlavorTarget, setRecipeFlavorTarget] = useState('mild');
  const [newIngName, setNewIngName] = useState('');
  const [aiIngLoading, setAiIngLoading] = useState<string | null>(null); // ingredient name being AI-suggested

  // ── Batch modal state (2-step) ────────────────────────────────────────────
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchStep, setBatchStep] = useState<1 | 2>(1);
  const [newBatch, setNewBatch] = useState<Partial<Batch>>({
    yieldType: 'Table', quality: 'Premium', status: 'ACTIVE', weight: 0,
    harvestDate: new Date().toISOString().split('T')[0], currentStage: 'PLUKKING',
  });
  const [batchIngredients, setBatchIngredients] = useState<Ingredient[]>([]);
  const [batchRecipeName, setBatchRecipeName] = useState('');
  const [batchFlavorTarget, setBatchFlavorTarget] = useState('mild');
  const [batchAiIngName, setBatchAiIngName] = useState('');
  const [batchAiIngLoading, setBatchAiIngLoading] = useState<string | null>(null);
  const [batchAiPrompt, setBatchAiPrompt] = useState('');
  const [batchAiLoading, setBatchAiLoading] = useState(false);

  // ── Content declaration modal ─────────────────────────────────────────────
  const [viewingBatch, setViewingBatch] = useState<Batch | null>(null);

  const handleOpenRecipeModal = (recipe: Recipe | null = null) => {
    if (recipe) {
      setEditingRecipe(JSON.parse(JSON.stringify(recipe)));
      setRecipeFlavorTarget(recipe.flavorProfile || 'mild');
    } else {
      setEditingRecipe({ name: '', description: '', flavorProfile: 'mild', ingredients: [], isAiGenerated: false, rating: 4, notes: '', isQualityAssured: false });
      setRecipeFlavorTarget('mild');
    }
    setAiPrompt('');
    setNewIngName('');
    setIsRecipeModalOpen(true);
  };

  const handleSaveRecipe = () => {
    if (!editingRecipe || !editingRecipe.name) return;
    if (editingRecipe.id) {
      setRecipes(recipes.map(r => r.id === editingRecipe!.id ? editingRecipe as Recipe : r));
    } else {
      setRecipes([...recipes, { id: `R${Date.now()}`, rating: 4, notes: '', isAiGenerated: false, isQualityAssured: false, ...editingRecipe } as Recipe]);
    }
    setIsRecipeModalOpen(false);
    setEditingRecipe(null);
  };

  // ── Recipe ingredient editor helpers ─────────────────────────────────────
  const addIngredientRow = () => {
    if (!newIngName.trim()) return;
    setEditingRecipe(prev => ({ ...prev, ingredients: [...(prev?.ingredients || []), { name: newIngName.trim(), amount: '', unit: '' }] }));
    setNewIngName('');
  };

  const updateIngredient = (idx: number, field: keyof Ingredient, value: string) => {
    setEditingRecipe(prev => {
      const ings = [...(prev?.ingredients || [])];
      ings[idx] = { ...ings[idx], [field]: value };
      return { ...prev, ingredients: ings };
    });
  };

  const removeIngredient = (idx: number) => {
    setEditingRecipe(prev => {
      const ings = [...(prev?.ingredients || [])];
      ings.splice(idx, 1);
      return { ...prev, ingredients: ings };
    });
  };

  const handleAiSuggestAmount = async (ingredientName: string, isForBatch = false) => {
    const loadKey = ingredientName;
    const currentIngredients = isForBatch ? batchIngredients : (editingRecipe?.ingredients || []);
    if (isForBatch) setBatchAiIngLoading(loadKey);
    else setAiIngLoading(loadKey);
    try {
      const suggestion = await geminiService.suggestIngredientAmount(
        ingredientName, currentIngredients,
        isForBatch ? batchFlavorTarget : recipeFlavorTarget,
        newBatch.weight || 100
      );
      if (isForBatch) {
        setBatchIngredients(prev => {
          const idx = prev.findIndex(i => i.name === ingredientName && i.amount === '');
          if (idx === -1) return [...prev, { name: ingredientName, amount: suggestion.amount, unit: suggestion.unit }];
          const updated = [...prev];
          updated[idx] = { ...updated[idx], amount: suggestion.amount, unit: suggestion.unit };
          return updated;
        });
        alert(`AI forslag for ${ingredientName}:\n${suggestion.amount} ${suggestion.unit}\n\n${suggestion.rationale}`);
      } else {
        setEditingRecipe(prev => {
          const ings = [...(prev?.ingredients || [])];
          const idx = ings.findIndex(i => i.name === ingredientName && i.amount === '');
          if (idx !== -1) { ings[idx] = { ...ings[idx], amount: suggestion.amount, unit: suggestion.unit }; }
          return { ...prev, ingredients: ings };
        });
        alert(`AI forslag for ${ingredientName}:\n${suggestion.amount} ${suggestion.unit}\n\n${suggestion.rationale}`);
      }
    } catch (e) {
      alert('AI-feil: ' + (e instanceof Error ? e.message : 'Ukjent feil'));
    } finally {
      if (isForBatch) setBatchAiIngLoading(null);
      else setAiIngLoading(null);
    }
  };

  const handleAiAdjust = async () => {
    if (!aiPrompt || !editingRecipe) return;
    setIsAiLoading(true);
    try {
      const adjusted = await geminiService.adjustRecipe(editingRecipe, aiPrompt, language, recipeFlavorTarget);
      setEditingRecipe(prev => ({ ...prev, ...adjusted, isAiGenerated: true }));
      setAiPrompt('');
    } catch (err) {
      alert(t('ai_chef_error') + (err instanceof Error ? ` ${err.message}` : ''));
    } finally {
      setIsAiLoading(false);
    }
  };

  // ── Batch modal helpers ───────────────────────────────────────────────────
  const openBatchFromRecipe = (recipe: Recipe) => {
    setBatchIngredients(JSON.parse(JSON.stringify(recipe.ingredients)));
    setBatchRecipeName(recipe.name);
    setBatchFlavorTarget(recipe.flavorProfile || 'mild');
    setNewBatch({ yieldType: 'Table', quality: 'Premium', status: 'ACTIVE', weight: 0, harvestDate: new Date().toISOString().split('T')[0], currentStage: 'PLUKKING' });
    setBatchStep(1);
    setIsBatchModalOpen(true);
  };

  const addBatchIngredientRow = () => {
    if (!batchAiIngName.trim()) return;
    setBatchIngredients(prev => [...prev, { name: batchAiIngName.trim(), amount: '', unit: '' }]);
    setBatchAiIngName('');
  };

  const updateBatchIngredient = (idx: number, field: keyof Ingredient, value: string) => {
    setBatchIngredients(prev => { const u = [...prev]; u[idx] = { ...u[idx], [field]: value }; return u; });
  };

  const removeBatchIngredient = (idx: number) => {
    setBatchIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const handleBatchAiAdjust = async () => {
    if (!batchAiPrompt) return;
    setBatchAiLoading(true);
    try {
      const adjusted = await geminiService.adjustRecipe(
        { name: batchRecipeName, ingredients: batchIngredients },
        batchAiPrompt, language, batchFlavorTarget
      );
      if (adjusted.ingredients) setBatchIngredients(adjusted.ingredients as Ingredient[]);
      if (adjusted.name && !batchRecipeName) setBatchRecipeName(adjusted.name as string);
      setBatchAiPrompt('');
    } catch (e) {
      alert('AI-feil: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setBatchAiLoading(false);
    }
  };

  const handleCreateBatch = () => {
    if (!newBatch.parcelId || !newBatch.weight || newBatch.weight <= 0) {
      alert(t('please_select_parcel_and_weight'));
      return;
    }
    const batch: Batch = {
      id: `B${Date.now()}`,
      parcelId: newBatch.parcelId,
      yieldType: 'Table',
      quality: newBatch.quality || 'Standard',
      weight: newBatch.weight,
      harvestDate: newBatch.harvestDate || new Date().toISOString().split('T')[0],
      currentStage: 'PLUKKING',
      status: 'ACTIVE',
      recipeName: batchRecipeName || undefined,
      recipeSnapshot: batchIngredients.length > 0 ? [...batchIngredients] : undefined,
      logs: [{ stage: 'PLUKKING', startDate: new Date().toISOString().split('T')[0], notes: 'Batch opprettet.' }]
    };
    setBatches([...batches, batch]);
    setIsBatchModalOpen(false);
    setBatchStep(1);
    setBatchIngredients([]);
    setBatchRecipeName('');
    setBatchAiPrompt('');
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
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><MapPin size={12} /> {getParcelName(batch.parcelId)}</p>
                  {batch.recipeName && <p className="text-xs text-green-400 mt-0.5 flex items-center gap-1"><ChefHat size={11} /> {batch.recipeName}</p>}
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
              <div className="flex gap-2 mt-3">
                {batch.recipeSnapshot && batch.recipeSnapshot.length > 0 && (
                  <button onClick={() => setViewingBatch(batch)} className="flex-shrink-0 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg flex items-center gap-1 transition-all">
                    <FileText size={13} /> Innholdsdeklarasjon
                  </button>
                )}
                <button onClick={() => handleAdvanceStage(batch.id)} className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-2 rounded-lg flex items-center justify-center gap-1 transition-all">
                  {STAGES.indexOf(batch.currentStage || 'PLUKKING') < STAGES.length - 1
                    ? <>{t('advance_to')} {STAGE_LABELS[STAGES[STAGES.indexOf(batch.currentStage || 'PLUKKING') + 1]]} <ChevronRight size={14} /></>
                    : <><CheckCircle2 size={14} /> {t('archive')}</>}
                </button>
              </div>
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
                  <h4 className="font-bold text-white text-sm leading-snug">{recipe.name}</h4>
                  {recipe.isAiGenerated && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex-shrink-0 ml-2">AI</span>}
                </div>
                {recipe.description && <p className="text-xs text-slate-400 mb-2 flex-1 line-clamp-2">{recipe.description}</p>}
                <div className="flex flex-wrap gap-1 mb-3">
                  {(recipe.ingredients || []).slice(0, 4).map((ing, i) => (
                    <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{ing.name}</span>
                  ))}
                  {(recipe.ingredients || []).length > 4 && <span className="text-[10px] text-slate-500">+{recipe.ingredients.length - 4}</span>}
                </div>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${recipe.flavorProfile ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                    {recipe.flavorProfile || 'standard'}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openBatchFromRecipe(recipe)}
                      className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all"
                      title="Start batch med denne oppskriften"
                    >
                      <Plus size={14} />
                    </button>
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

      {/* ── Recipe Modal ─────────────────────────────────────────────────────── */}
      {isRecipeModalOpen && editingRecipe && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl border border-white/10 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 rounded-t-2xl px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ChefHat size={18} className="text-sky-400" />
                {editingRecipe.id ? 'Rediger oppskrift' : 'Ny oppskrift'}
              </h3>
              <button onClick={() => setIsRecipeModalOpen(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Name */}
              <input type="text" placeholder="Oppskriftsnavn" value={editingRecipe.name || ''}
                onChange={e => setEditingRecipe(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/50" />

              {/* Description */}
              <textarea placeholder="Beskrivelse" value={editingRecipe.description || ''}
                onChange={e => setEditingRecipe(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/50 resize-none" />

              {/* Flavor target */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Smaksmål (påvirker AI-forslag)</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'mild', label: 'Mild', emoji: '🫒' },
                    { id: 'syrlig', label: 'Syrlig', emoji: '🍋' },
                    { id: 'frisk', label: 'Frisk', emoji: '🌿' },
                    { id: 'krydret', label: 'Krydret', emoji: '🌶️' },
                    { id: 'sterk', label: 'Sterk', emoji: '💪' },
                    { id: 'middelhav', label: 'Middelhav', emoji: '🌊' },
                  ].map(f => (
                    <button key={f.id} onClick={() => { setRecipeFlavorTarget(f.id); setEditingRecipe(prev => ({ ...prev, flavorProfile: f.id as any })); }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${recipeFlavorTarget === f.id ? 'bg-green-500/30 text-green-300 border border-green-500/40' : 'bg-slate-800 text-slate-400 border border-white/5 hover:border-white/20'}`}>
                      {f.emoji} {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ingredient list */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ingredienser (per 1 liter saltlake)</p>
                  <span className="text-[10px] text-slate-600">{(editingRecipe.ingredients || []).length} ingredienser</span>
                </div>
                <div className="space-y-2 mb-3">
                  {(editingRecipe.ingredients || []).map((ing, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-xs text-slate-400 w-40 truncate">{ing.name}</span>
                      <input type="text" placeholder="Mengde" value={ing.amount}
                        onChange={e => updateIngredient(idx, 'amount', e.target.value)}
                        className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-500/50" />
                      <input type="text" placeholder="Enhet" value={ing.unit}
                        onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                        className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-500/50" />
                      <button
                        onClick={() => handleAiSuggestAmount(ing.name, false)}
                        disabled={aiIngLoading === ing.name}
                        className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all"
                        title="AI forslag for mengde"
                      >
                        {aiIngLoading === ing.name ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      </button>
                      <button onClick={() => removeIngredient(idx)} className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg transition-all">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                {/* Add ingredient row */}
                <div className="flex gap-2">
                  <input type="text" placeholder="Legg til ingrediens (f.eks oregano, chilli, sitron...)"
                    value={newIngName} onChange={e => setNewIngName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addIngredientRow()}
                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500/50" />
                  <button onClick={addIngredientRow} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs transition-all">
                    <Plus size={14} />
                  </button>
                </div>
                {/* Quick-add common ingredients */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {['Oregano', 'Chilli', 'Paprika', 'Sitron', 'Hvitløk', 'Rosmarin', 'Timian', 'Dill', 'Eddik', 'Laurbærblad', 'Svart pepper'].map(ing => (
                    <button key={ing} onClick={() => { setEditingRecipe(prev => ({ ...prev, ingredients: [...(prev?.ingredients || []), { name: ing, amount: '', unit: '' }] })); }}
                      className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-white/5 transition-all">
                      + {ing}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Chef */}
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2 mb-1"><Wand2 size={14} /> AI Chef</h4>
                <p className="text-[10px] text-slate-500 mb-3">AI justerer hele oppskriften basert på ditt smaksmål. Legg til ingredienser først, så foreslår AI mengder.</p>
                <div className="flex gap-2">
                  <input type="text" placeholder="Beskriv hva du vil oppnå, f.eks 'mer syrlig med sitronsmak'..."
                    value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAiAdjust()}
                    className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                  <button onClick={handleAiAdjust} disabled={isAiLoading || !aiPrompt}
                    className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-2">
                    {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {isAiLoading ? 'Justerer...' : 'Juster'}
                  </button>
                </div>
              </div>

              {/* Notes */}
              <textarea placeholder="Notater / prosess-tips" value={editingRecipe.notes || ''}
                onChange={e => setEditingRecipe(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/50 resize-none" />

              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsRecipeModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Avbryt</button>
                <button onClick={handleSaveRecipe} className="bg-green-500/20 text-green-300 hover:bg-green-500/30 px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2">
                  <Save size={14} /> Lagre oppskrift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Batch Modal (2-step) ──────────────────────────────────────────────── */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl border border-white/10 w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-slate-900/95 rounded-t-2xl px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-green-400" /> Ny bordoliven-batch
                </h3>
                <div className="flex gap-2 mt-1">
                  {[1, 2].map(s => (
                    <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${batchStep === s ? 'bg-green-500/20 text-green-300' : 'bg-slate-800 text-slate-500'}`}>
                      {s === 1 ? '1. Grunninfo' : '2. Oppskrift & ingredienser'}
                    </span>
                  ))}
                </div>
              </div>
              <button onClick={() => { setIsBatchModalOpen(false); setBatchStep(1); }} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>

            <div className="p-6">
              {/* ── Step 1: Basic info ── */}
              {batchStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Parsell *</label>
                      <select value={newBatch.parcelId || ''}
                        onChange={e => setNewBatch(prev => ({ ...prev, parcelId: e.target.value }))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/50">
                        <option value="">Velg parsell...</option>
                        {parcels.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Vekt (kg) *</label>
                      <input type="number" placeholder="0" min="1"
                        value={newBatch.weight || ''}
                        onChange={e => setNewBatch(prev => ({ ...prev, weight: +e.target.value }))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/50 font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Oliventype</label>
                      <select value={newBatch.oliveType || ''}
                        onChange={e => setNewBatch(prev => ({ ...prev, oliveType: e.target.value }))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/50">
                        <option value="">Velg sort...</option>
                        {VARIETIES.map(v => <option key={v} value={v} className="bg-slate-800">{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Kvalitet</label>
                      <select value={newBatch.quality || 'Premium'}
                        onChange={e => setNewBatch(prev => ({ ...prev, quality: e.target.value as any }))}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none">
                        <option value="Premium">Premium</option>
                        <option value="Good">Good</option>
                        <option value="Standard">Standard</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Dato</label>
                    <input type="date" value={newBatch.harvestDate}
                      onChange={e => setNewBatch(prev => ({ ...prev, harvestDate: e.target.value }))}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none" />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button onClick={() => setIsBatchModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Avbryt</button>
                    <button
                      onClick={() => setBatchStep(2)}
                      disabled={!newBatch.parcelId || !newBatch.weight || newBatch.weight <= 0}
                      className="bg-green-500/20 text-green-300 hover:bg-green-500/30 disabled:opacity-40 px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
                      Velg oppskrift <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Recipe + ingredients ── */}
              {batchStep === 2 && (
                <div className="space-y-5">
                  {/* Recipe selector */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Velg oppskrift fra bibliotek</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                      {recipes.map(r => (
                        <button key={r.id}
                          onClick={() => { setBatchIngredients(JSON.parse(JSON.stringify(r.ingredients))); setBatchRecipeName(r.name); setBatchFlavorTarget(r.flavorProfile || 'mild'); }}
                          className={`text-left p-3 rounded-xl border text-xs transition-all ${batchRecipeName === r.name ? 'border-green-500/50 bg-green-500/10 text-green-300' : 'border-white/10 bg-black/30 text-slate-400 hover:border-white/20 hover:text-white'}`}>
                          <p className="font-bold text-white text-[11px] truncate">{r.name}</p>
                          <p className="text-slate-500 mt-0.5">{r.flavorProfile} · {r.ingredients.length} ingredienser</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Flavor target */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Smaksmål</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'mild', label: 'Mild 🫒', sub: 'Supermarked' },
                        { id: 'syrlig', label: 'Syrlig 🍋', sub: 'Antipasti' },
                        { id: 'frisk', label: 'Frisk 🌿', sub: 'Premium' },
                        { id: 'krydret', label: 'Krydret 🌶️', sub: 'Eksport' },
                        { id: 'sterk', label: 'Sterk 💪', sub: 'Spesialitet' },
                        { id: 'middelhav', label: 'Middelhav 🌊', sub: 'Gourmet' },
                      ].map(f => (
                        <button key={f.id} onClick={() => setBatchFlavorTarget(f.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex flex-col items-center ${batchFlavorTarget === f.id ? 'bg-green-500/30 text-green-300 border border-green-500/40' : 'bg-slate-800 text-slate-400 border border-white/5 hover:border-white/20'}`}>
                          <span>{f.label}</span>
                          <span className="text-[9px] opacity-60">{f.sub}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ingredient editor */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ingredienser for denne batchen</p>
                      <span className="text-[10px] text-slate-600">{batchIngredients.length} ingredienser · per 1 liter lake</span>
                    </div>
                    <div className="space-y-2 mb-3">
                      {batchIngredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <span className="text-xs text-slate-300 w-36 truncate flex-shrink-0">{ing.name}</span>
                          <input type="text" placeholder="Mengde" value={ing.amount}
                            onChange={e => updateBatchIngredient(idx, 'amount', e.target.value)}
                            className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-500/50" />
                          <input type="text" placeholder="Enhet" value={ing.unit}
                            onChange={e => updateBatchIngredient(idx, 'unit', e.target.value)}
                            className="w-20 bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-green-500/50" />
                          <button
                            onClick={() => handleAiSuggestAmount(ing.name, true)}
                            disabled={batchAiIngLoading === ing.name}
                            className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all flex-shrink-0"
                            title="AI forslag mengde">
                            {batchAiIngLoading === ing.name ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          </button>
                          <button onClick={() => removeBatchIngredient(idx)} className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg flex-shrink-0 transition-all">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add ingredient */}
                    <div className="flex gap-2 mb-2">
                      <input type="text" placeholder="Legg til ingrediens..."
                        value={batchAiIngName} onChange={e => setBatchAiIngName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addBatchIngredientRow()}
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500/50" />
                      <button onClick={addBatchIngredientRow} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs transition-all"><Plus size={14} /></button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {['Oregano', 'Chilli', 'Paprika', 'Sitron', 'Hvitløk', 'Rosmarin', 'Timian', 'Dill', 'Eddik', 'Laurbærblad'].map(ing => (
                        <button key={ing}
                          onClick={() => setBatchIngredients(prev => [...prev, { name: ing, amount: '', unit: '' }])}
                          className="text-[10px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-white/5 transition-all">
                          + {ing}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI overall adjust */}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2 mb-2"><Wand2 size={14} /> AI justerer hele batchen</h4>
                    <div className="flex gap-2">
                      <input type="text" placeholder={`F.eks 'legg til mer chilli for krydret smak'...`}
                        value={batchAiPrompt} onChange={e => setBatchAiPrompt(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleBatchAiAdjust()}
                        className="flex-1 bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
                      <button onClick={handleBatchAiAdjust} disabled={batchAiLoading || !batchAiPrompt}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50 flex items-center gap-2">
                        {batchAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {batchAiLoading ? 'Justerer...' : 'Juster'}
                      </button>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2 justify-between pt-2">
                    <button onClick={() => setBatchStep(1)} className="px-4 py-2 text-sm text-slate-400 hover:text-white flex items-center gap-1">
                      ← Tilbake
                    </button>
                    <button onClick={handleCreateBatch}
                      className="bg-green-500 hover:bg-green-400 text-black font-bold px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all">
                      <CheckCircle2 size={16} /> Opprett batch
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Content Declaration Modal ─────────────────────────────────────────── */}
      {viewingBatch && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl border border-blue-500/20 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900/95 rounded-t-2xl px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText size={18} className="text-blue-400" /> Innholdsdeklarasjon
              </h3>
              <button onClick={() => setViewingBatch(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Product header */}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-white text-lg">Bordoliven – {viewingBatch.recipeName || 'Egenoppskrift'}</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Batch #{viewingBatch.id} · {viewingBatch.weight} kg ·{' '}
                      {getParcelName(viewingBatch.parcelId)}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-lg">{viewingBatch.quality}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
                  <div><span className="text-slate-500">Høstedato:</span> <span className="text-white">{viewingBatch.harvestDate}</span></div>
                  <div><span className="text-slate-500">Nåværende steg:</span> <span className="text-white">{STAGE_LABELS[viewingBatch.currentStage || 'PLUKKING']}</span></div>
                  <div><span className="text-slate-500">Parsell:</span> <span className="text-white">{getParcelName(viewingBatch.parcelId)}</span></div>
                  <div><span className="text-slate-500">Oppskrift:</span> <span className="text-white">{viewingBatch.recipeName || '—'}</span></div>
                </div>
              </div>

              {/* EU-style ingredient declaration */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ingredienser (per 1 liter saltlake)</p>
                <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-4 py-2">#</th>
                        <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Ingrediens</th>
                        <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Mengde</th>
                        <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Enhet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingBatch.recipeSnapshot || []).map((ing, idx) => (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-4 py-2 text-slate-600 text-xs">{idx + 1}</td>
                          <td className="px-4 py-2 text-white font-medium">{ing.name}</td>
                          <td className="px-4 py-2 text-right text-green-400 font-mono font-bold">{ing.amount}</td>
                          <td className="px-4 py-2 text-right text-slate-400">{ing.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-600 mt-2 italic">
                  * Ingredienser i fallende rekkefølge etter vekt. Produsert av oliven fra {getParcelName(viewingBatch.parcelId)}.
                </p>
              </div>

              {/* Print/copy note */}
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3 text-xs text-yellow-300/70">
                <Tag size={12} className="inline mr-1" />
                Denne innholdsdeklarasjonen kan brukes på etikett. Husk å legge til nettovekt, holdbarhetsdato og produsent-info i henhold til EU-forordning 1169/2011.
              </div>

              <button onClick={() => setViewingBatch(null)} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl text-sm font-semibold transition-all">
                Lukk
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductionView;
