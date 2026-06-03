import React, { useEffect, useMemo, useState } from 'react';
import { Archive, BookOpen, CalendarDays, CheckCircle2, Factory, FlaskConical, Loader2, PackageCheck, Plus, RefreshCcw, Save, Scale, Sprout, Trash2, X } from 'lucide-react';
import type { Batch, Language, Parcel, Recipe } from '../types';
import { deleteBatch, deleteRecipe, fetchBatches, fetchRecipes, upsertBatch, upsertRecipe } from '../services/db';
import { fetchOliviaHarvests, HarvestRecord, SalesChannel } from '../services/oliviaSchemaData';
import TableOliveBatchPlanner from './TableOliveBatchPlanner';

interface Props {
  language: Language;
  parcels: Parcel[];
}

type Tab = 'harvest' | 'batches' | 'recipes' | 'quality';

const CHANNEL_LABELS: Record<SalesChannel, string> = {
  cooperativa: 'Cooperativa',
  bordoliven: 'Bordoliven',
  olje_premier: 'Olje premium',
  olje_export: 'Olje export',
};

const currentSeason = () => new Date().getFullYear().toString();
const fmtKg = (kg: number) => `${Math.round(kg).toLocaleString('no-NO')} kg`;
const fmtEuro = (value: number) => `€${Math.round(value).toLocaleString('no-NO')}`;
const inputClass = 'w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50';

const ProductionOliviaView: React.FC<Props> = ({ parcels }) => {
  const [activeTab, setActiveTab] = useState<Tab>('harvest');
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [season, setSeason] = useState(currentSeason());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [newBatch, setNewBatch] = useState<Partial<Batch>>({
    yieldType: 'Oil',
    quality: 'Premium',
    status: 'ACTIVE',
    weight: 0,
    harvestDate: new Date().toISOString().slice(0, 10),
  });
  const [newRecipe, setNewRecipe] = useState<Partial<Recipe>>({
    name: '',
    flavorProfile: 'mild',
    ingredients: [],
    rating: 4,
    notes: '',
    isAiGenerated: false,
    isQualityAssured: false,
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [h, b, r] = await Promise.all([
        fetchOliviaHarvests(),
        fetchBatches().catch(err => {
          console.warn('[ProductionOliviaView] batches unavailable', err);
          return [] as Batch[];
        }),
        fetchRecipes().catch(err => {
          console.warn('[ProductionOliviaView] recipes unavailable', err);
          return [] as Recipe[];
        }),
      ]);
      setHarvests(h);
      setBatches(b);
      setRecipes(r);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente produksjonsdata fra olivia schema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const seasons = useMemo(() => {
    const all = new Set([currentSeason(), ...harvests.map(h => h.season), ...batches.map(b => (b.harvestDate || '').slice(0, 4)).filter(Boolean)]);
    return [...all].sort((a, b) => b.localeCompare(a));
  }, [harvests, batches]);

  const seasonHarvests = harvests.filter(h => h.season === season);
  const seasonBatches = batches.filter(b => (b.harvestDate || '').slice(0, 4) === season);
  const totalKg = seasonHarvests.reduce((sum, h) => sum + h.kg, 0);
  const harvestRevenue = seasonHarvests.reduce((sum, h) => sum + h.kg * h.pricePerKg, 0);
  const oilLiters = seasonBatches.reduce((sum, b) => sum + Number(b.oilYieldLiters || 0), 0);
  const tableKg = seasonBatches.reduce((sum, b) => sum + Number(b.tableOliveYieldKg || 0), 0);

  const perParcel = useMemo(() => parcels.map(parcel => {
    const parcelHarvests = seasonHarvests.filter(h => h.parcelId === parcel.id);
    return {
      id: parcel.id,
      name: parcel.name,
      kg: parcelHarvests.reduce((sum, h) => sum + h.kg, 0),
      revenue: parcelHarvests.reduce((sum, h) => sum + h.kg * h.pricePerKg, 0),
      records: parcelHarvests.length,
    };
  }).filter(row => row.kg || row.revenue || row.records), [parcels, seasonHarvests]);

  const addBatch = async () => {
    setError('');
    if (!newBatch.parcelId || !newBatch.weight || !newBatch.harvestDate) {
      setError('Velg parsell, dato og vekt for batch.');
      return;
    }
    const batch: Batch = {
      id: `B${Date.now()}`,
      parcelId: newBatch.parcelId,
      recipeId: newBatch.recipeId,
      recipeName: newBatch.recipeName,
      oliveType: newBatch.oliveType,
      harvestDate: newBatch.harvestDate,
      weight: Number(newBatch.weight),
      quality: newBatch.quality || 'Premium',
      status: 'ACTIVE',
      yieldType: newBatch.yieldType || 'Oil',
      oilYieldLiters: Number(newBatch.oilYieldLiters || 0) || undefined,
      tableOliveYieldKg: Number(newBatch.tableOliveYieldKg || 0) || undefined,
      traceabilityCode: newBatch.traceabilityCode || `DA-${season}-${String(Date.now()).slice(-5)}`,
      currentStage: newBatch.currentStage,
      logs: [],
    };
    try {
      await upsertBatch(batch);
      setBatches(prev => [batch, ...prev]);
      setShowBatchForm(false);
      setNewBatch({ yieldType: 'Oil', quality: 'Premium', status: 'ACTIVE', weight: 0, harvestDate: new Date().toISOString().slice(0, 10) });
    } catch (err: any) {
      setError(err?.message || 'Lagring av batch feilet. Sjekk om olivia.batches finnes og har riktig RLS.');
    }
  };

  const savePlannedTableBatch = async (batch: Batch) => {
    setError('');
    await upsertBatch(batch);
    setBatches(prev => [batch, ...prev]);
    const batchYear = (batch.harvestDate || '').slice(0, 4);
    if (batchYear) setSeason(batchYear);
  };

  const addRecipe = async () => {
    setError('');
    if (!newRecipe.name) {
      setError('Oppskriften må ha navn.');
      return;
    }
    const recipe: Recipe = {
      id: `R${Date.now()}`,
      name: newRecipe.name,
      flavorProfile: newRecipe.flavorProfile,
      description: newRecipe.description,
      recommendedOliveTypes: newRecipe.recommendedOliveTypes || [],
      ingredients: newRecipe.ingredients || [],
      brineChangeDays: newRecipe.brineChangeDays || [],
      marinadeDayFrom: newRecipe.marinadeDayFrom,
      readyAfterDays: newRecipe.readyAfterDays,
      rating: Number(newRecipe.rating || 4),
      notes: newRecipe.notes || '',
      isAiGenerated: !!newRecipe.isAiGenerated,
      isQualityAssured: !!newRecipe.isQualityAssured,
    };
    try {
      await upsertRecipe(recipe);
      setRecipes(prev => [recipe, ...prev]);
      setShowRecipeForm(false);
      setNewRecipe({ name: '', flavorProfile: 'mild', ingredients: [], rating: 4, notes: '', isAiGenerated: false, isQualityAssured: false });
    } catch (err: any) {
      setError(err?.message || 'Lagring av oppskrift feilet. Sjekk om olivia.recipes finnes og har riktig RLS.');
    }
  };

  const removeBatch = async (id: string) => {
    try {
      await deleteBatch(id);
      setBatches(prev => prev.filter(b => b.id !== id));
    } catch (err: any) { setError(err?.message || 'Sletting av batch feilet.'); }
  };

  const removeRecipe = async (id: string) => {
    try {
      await deleteRecipe(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err: any) { setError(err?.message || 'Sletting av oppskrift feilet.'); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Factory className="text-green-400" /> Produksjon</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">RealtyFlow / Supabase `olivia` schema · ingen demo-seeding</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all">{loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <select value={season} onChange={e => setSeason(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold">
            {seasons.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Høstet kg', value: fmtKg(totalKg), icon: <Scale size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Høsteinntekt', value: fmtEuro(harvestRevenue), icon: <Sprout size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Olje liter', value: oilLiters ? `${oilLiters.toLocaleString('no-NO')} L` : '—', icon: <FlaskConical size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Bordoliven', value: tableKg ? fmtKg(tableKg) : '—', icon: <PackageCheck size={18} />, cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-xl md:text-2xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['harvest', 'batches', 'recipes', 'quality'] as Tab[]).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === tab ? 'bg-green-500 text-black' : 'bg-white/5 text-slate-400'}`}>{tab === 'harvest' ? 'Høsting' : tab === 'batches' ? 'Batcher' : tab === 'recipes' ? 'Oppskrifter' : 'Kvalitet'}</button>)}
      </div>

      {activeTab === 'harvest' && (
        <div className="space-y-4">
          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <h3 className="text-lg text-white font-bold mb-4 flex items-center gap-2"><CalendarDays size={18} /> Høsteregistreringer fra olivia.harvest_records</h3>
            <div className="space-y-2">
              {seasonHarvests.map(h => <div key={h.id} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5"><div><p className="text-white font-bold">{h.variety || CHANNEL_LABELS[h.channel]}</p><p className="text-xs text-slate-500">{h.date} · {parcels.find(p => p.id === h.parcelId)?.name || h.parcelId || 'Ukjent parsell'} · {CHANNEL_LABELS[h.channel]}</p></div><div className="text-right"><p className="text-white font-black">{fmtKg(h.kg)}</p><p className="text-xs text-green-400">{fmtEuro(h.kg * h.pricePerKg)}</p></div></div>)}
              {!seasonHarvests.length && <p className="text-sm text-slate-500 italic">Ingen høsteregistreringer for {season}.</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{perParcel.map(p => <div key={p.id} className="glass rounded-[2rem] p-5 border border-white/10"><h3 className="text-white font-bold">{p.name}</h3><div className="grid grid-cols-3 gap-3 mt-4"><div><p className="text-xs text-slate-500">Kg</p><p className="text-white font-bold">{fmtKg(p.kg)}</p></div><div><p className="text-xs text-slate-500">Inntekt</p><p className="text-green-400 font-bold">{fmtEuro(p.revenue)}</p></div><div><p className="text-xs text-slate-500">Rader</p><p className="text-white font-bold">{p.records}</p></div></div></div>)}</div>
        </div>
      )}

      {activeTab === 'batches' && (
        <div className="space-y-5">
          <TableOliveBatchPlanner parcels={parcels} recipes={recipes} onSave={savePlannedTableBatch} />
          <div className="glass rounded-[2rem] p-6 border border-white/10 space-y-4">
            <div className="flex justify-between items-center"><h3 className="text-lg text-white font-bold">Batcher fra olivia.batches</h3><button onClick={() => setShowBatchForm(true)} className="px-4 py-2 rounded-xl bg-green-500 text-black text-xs font-bold flex items-center gap-2"><Plus size={14} /> Enkel batch</button></div>
            {showBatchForm && <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 rounded-2xl bg-white/5"><select className={inputClass} value={newBatch.parcelId || ''} onChange={e => setNewBatch(p => ({ ...p, parcelId: e.target.value }))}><option value="">Velg parsell</option>{parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input type="date" className={inputClass} value={newBatch.harvestDate || ''} onChange={e => setNewBatch(p => ({ ...p, harvestDate: e.target.value }))} /><input type="number" className={inputClass} placeholder="Kg" value={newBatch.weight || ''} onChange={e => setNewBatch(p => ({ ...p, weight: Number(e.target.value) }))} /><select className={inputClass} value={newBatch.yieldType} onChange={e => setNewBatch(p => ({ ...p, yieldType: e.target.value as 'Oil' | 'Table' }))}><option value="Oil">Olje</option><option value="Table">Bordoliven</option></select><input className={inputClass} placeholder="Sort" value={newBatch.oliveType || ''} onChange={e => setNewBatch(p => ({ ...p, oliveType: e.target.value }))} /><div className="flex gap-2"><button onClick={addBatch} className="p-3 bg-green-500 text-black rounded-xl"><Save size={16} /></button><button onClick={() => setShowBatchForm(false)} className="p-3 bg-white/10 text-white rounded-xl"><X size={16} /></button></div></div>}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{seasonBatches.map(b => <div key={b.id} className="p-5 rounded-2xl bg-white/5 border border-white/10"><div className="flex justify-between gap-4"><div><p className="text-white font-bold">{b.traceabilityCode || b.id}</p><p className="text-xs text-slate-500">{b.harvestDate} · {parcels.find(p => p.id === b.parcelId)?.name || b.parcelId} · {b.yieldType}{b.recipeName ? ` · ${b.recipeName}` : ''}</p></div><button onClick={() => removeBatch(b.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></div><div className="grid grid-cols-3 gap-3 mt-4 text-sm"><div><p className="text-xs text-slate-500">Vekt</p><p className="text-white font-bold">{fmtKg(b.weight)}</p></div><div><p className="text-xs text-slate-500">Kvalitet</p><p className="text-white font-bold">{b.quality}</p></div><div><p className="text-xs text-slate-500">Status</p><p className="text-green-400 font-bold">{b.currentStage || b.status}</p></div></div>{b.logs?.length ? <div className="mt-4 space-y-2"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Arbeidsplan</p>{b.logs.slice(0, 4).map(log => <div key={`${b.id}-${log.stage}-${log.startDate}`} className="border-l-2 border-green-500/30 pl-3 text-xs"><p className="text-green-300 font-bold">{log.stage} · {log.startDate}</p><p className="text-slate-400">{log.notes}</p></div>)}</div> : null}</div>)}</div>
            {!seasonBatches.length && <p className="text-sm text-slate-500 italic">Ingen batcher for {season}. Dette fylles ikke automatisk med demo-data.</p>}
          </div>
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="glass rounded-[2rem] p-6 border border-white/10 space-y-4">
          <div className="flex justify-between items-center"><h3 className="text-lg text-white font-bold flex items-center gap-2"><BookOpen size={18} /> Oppskrifter fra olivia.recipes</h3><button onClick={() => setShowRecipeForm(true)} className="px-4 py-2 rounded-xl bg-green-500 text-black text-xs font-bold flex items-center gap-2"><Plus size={14} /> Ny oppskrift</button></div>
          {showRecipeForm && <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 rounded-2xl bg-white/5"><input className={inputClass} placeholder="Navn" value={newRecipe.name || ''} onChange={e => setNewRecipe(p => ({ ...p, name: e.target.value }))} /><input className={inputClass} placeholder="Smaksprofil" value={newRecipe.flavorProfile || ''} onChange={e => setNewRecipe(p => ({ ...p, flavorProfile: e.target.value as any }))} /><input className={inputClass} placeholder="Beskrivelse" value={newRecipe.description || ''} onChange={e => setNewRecipe(p => ({ ...p, description: e.target.value }))} /><input type="number" className={inputClass} placeholder="Dager klar" value={newRecipe.readyAfterDays || ''} onChange={e => setNewRecipe(p => ({ ...p, readyAfterDays: Number(e.target.value) }))} /><div className="flex gap-2"><button onClick={addRecipe} className="p-3 bg-green-500 text-black rounded-xl"><Save size={16} /></button><button onClick={() => setShowRecipeForm(false)} className="p-3 bg-white/10 text-white rounded-xl"><X size={16} /></button></div></div>}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{recipes.map(r => <div key={r.id} className="p-5 rounded-2xl bg-white/5 border border-white/10"><div className="flex justify-between gap-4"><div><p className="text-white font-bold">{r.name}</p><p className="text-xs text-slate-500">{r.flavorProfile || 'profil ikke satt'} · {r.readyAfterDays || '—'} dager · rating {r.rating}</p></div><button onClick={() => removeRecipe(r.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></div>{r.description && <p className="text-sm text-slate-400 mt-3">{r.description}</p>}<div className="mt-3 flex flex-wrap gap-2">{(r.ingredients || []).slice(0, 6).map((ing, idx) => <span key={idx} className="text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-400">{ing.name} {ing.amount} {ing.unit}</span>)}</div></div>)}</div>
          {!recipes.length && <p className="text-sm text-slate-500 italic">Ingen oppskrifter funnet i olivia.recipes.</p>}
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{batches.map(b => <div key={b.id} className="glass rounded-[2rem] p-5 border border-white/10"><h3 className="text-white font-bold flex items-center gap-2"><Archive size={18} /> {b.traceabilityCode || b.id}</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4"><div><p className="text-xs text-slate-500">Syre</p><p className="text-white font-bold">{b.qualityMetrics?.acidity ?? '—'}</p></div><div><p className="text-xs text-slate-500">Peroksid</p><p className="text-white font-bold">{b.qualityMetrics?.peroxide ?? '—'}</p></div><div><p className="text-xs text-slate-500">Fenoler</p><p className="text-white font-bold">{b.qualityMetrics?.phenols ?? '—'}</p></div><div><p className="text-xs text-slate-500">Score</p><p className="text-white font-bold">{b.qualityScore ?? '—'}</p></div></div>{b.qualityMetrics ? <p className="text-xs text-green-400 mt-4 flex gap-2"><CheckCircle2 size={14} /> Kvalitetsdata finnes</p> : <p className="text-xs text-slate-500 mt-4">Mangler kvalitetsdata/labverdier.</p>}</div>)}</div>
      )}
    </div>
  );
};

export default ProductionOliviaView;
