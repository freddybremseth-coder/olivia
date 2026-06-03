import React, { useMemo, useState } from 'react';
import { BookOpen, PackageCheck, Save, ShieldCheck } from 'lucide-react';
import type { Batch, Parcel, Recipe } from '../types';
import { buildBalancedTableOlivePlan } from '../services/tableOliveRecipes';

interface Props {
  parcels: Parcel[];
  recipes: Recipe[];
  onSave: (batch: Batch) => Promise<void>;
}

const inputClass = 'w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50';
const labelClass = 'text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1';

const TableOliveBatchPlanner: React.FC<Props> = ({ parcels, recipes, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    parcelId: '',
    harvestDate: new Date().toISOString().slice(0, 10),
    weight: 0,
    oliveType: '',
    recipeId: '',
    quality: 'Premium' as Batch['quality'],
  });

  const selectedRecipe = useMemo(() => recipes.find(recipe => recipe.id === form.recipeId), [recipes, form.recipeId]);
  const tableRecipes = useMemo(() => recipes.filter(recipe => (recipe.recommendedOliveTypes || []).length || /oliven|olive|bord/i.test(`${recipe.name} ${recipe.description || ''}`)), [recipes]);
  const plan = useMemo(() => {
    if (!form.weight) return null;
    return buildBalancedTableOlivePlan({
      oliveKg: Number(form.weight),
      recipe: selectedRecipe,
      startDate: form.harvestDate,
      oliveType: form.oliveType,
    });
  }, [form.weight, form.harvestDate, form.oliveType, selectedRecipe]);

  const save = async () => {
    setError('');
    if (!form.parcelId || !form.harvestDate || !form.weight) {
      setError('Velg parsell, dato og kg oliven før du lagrer batch.');
      return;
    }
    if (!plan) {
      setError('Kunne ikke lage balansert plan. Sjekk kg oliven.');
      return;
    }

    const batch: Batch = {
      id: `B${Date.now()}`,
      parcelId: form.parcelId,
      recipeId: selectedRecipe?.id,
      recipeName: selectedRecipe?.name,
      recipeSnapshot: plan.ingredients,
      oliveType: form.oliveType || selectedRecipe?.recommendedOliveTypes?.[0],
      harvestDate: form.harvestDate,
      weight: Number(form.weight),
      quality: form.quality,
      status: 'ACTIVE',
      yieldType: 'Table',
      tableOliveYieldKg: Number(form.weight),
      traceabilityCode: `DA-${form.harvestDate.slice(0, 4)}-${String(Date.now()).slice(-5)}`,
      currentStage: 'PLUKKING',
      stageStartDate: form.harvestDate,
      completedStages: [],
      logs: plan.logs,
    };

    setIsSaving(true);
    try {
      await onSave(batch);
      setForm({ parcelId: '', harvestDate: new Date().toISOString().slice(0, 10), weight: 0, oliveType: '', recipeId: '', quality: 'Premium' });
    } catch (err: any) {
      setError(err?.message || 'Lagring av bordoliven-batch feilet.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-[2rem] border border-purple-500/20 bg-purple-500/5 p-5 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-white font-bold flex items-center gap-2"><PackageCheck size={18} className="text-purple-300" /> Bordoliven batchplan</h3>
          <p className="text-xs text-slate-500 mt-1">Velg kg, sort og oppskrift. Appen skalerer ingredienser og lager arbeidsplan som lagres på batchen.</p>
        </div>
        <ShieldCheck className="text-amber-300" size={22} />
      </div>

      {error && <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <div><label className={labelClass}>Parsell</label><select className={inputClass} value={form.parcelId} onChange={e => setForm(prev => ({ ...prev, parcelId: e.target.value }))}><option value="">Velg parsell</option>{parcels.map(parcel => <option key={parcel.id} value={parcel.id}>{parcel.name}</option>)}</select></div>
        <div><label className={labelClass}>Startdato</label><input type="date" className={inputClass} value={form.harvestDate} onChange={e => setForm(prev => ({ ...prev, harvestDate: e.target.value }))} /></div>
        <div><label className={labelClass}>Kg oliven</label><input type="number" className={inputClass} value={form.weight || ''} onChange={e => setForm(prev => ({ ...prev, weight: Number(e.target.value) }))} placeholder="Kg" /></div>
        <div><label className={labelClass}>Sort</label><input className={inputClass} value={form.oliveType} onChange={e => setForm(prev => ({ ...prev, oliveType: e.target.value }))} placeholder="Gordal, Changlot..." /></div>
        <div><label className={labelClass}>Kvalitet</label><select className={inputClass} value={form.quality} onChange={e => setForm(prev => ({ ...prev, quality: e.target.value as Batch['quality'] }))}><option>Premium</option><option>Good</option><option>Standard</option><option>Commercial</option></select></div>
        <div className="flex items-end"><button onClick={save} disabled={isSaving} className="w-full bg-purple-400 hover:bg-purple-300 disabled:opacity-50 text-black font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-2"><Save size={16} /> {isSaving ? 'Lagrer...' : 'Lagre'}</button></div>
      </div>

      <div><label className={labelClass}>Oppskrift</label><select className={inputClass} value={form.recipeId} onChange={e => setForm(prev => ({ ...prev, recipeId: e.target.value }))}><option value="">Balansert standardplan</option>{tableRecipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-100 flex gap-3 leading-relaxed">
        <ShieldCheck size={18} className="flex-shrink-0" />
        <p>Kritiske kontrollpunkter og matsikkerhet må dokumenteres før salg. Denne planen er en produksjons- og sporbarhetsplan, ikke en erstatning for lokal godkjenning, målinger eller faglig kvalitetssikring.</p>
      </div>

      {plan && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-black/25 border border-white/10 p-4">
            <h4 className="text-white font-bold flex items-center gap-2"><BookOpen size={16} /> Skalert oppskrift</h4>
            <p className="text-xs text-slate-500 mt-1">Klar etter ca. {plan.readyAfterDays} dager. Marinering fra dag {plan.marinadeDayFrom}.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
              {plan.ingredients.slice(0, 10).map((item, index) => <div key={`${item.name}-${index}`} className="rounded-xl bg-white/5 p-3 text-xs"><p className="text-slate-400">{item.name}</p><p className="text-white font-bold">{item.amount} {item.unit}</p></div>)}
            </div>
          </div>
          <div className="rounded-2xl bg-black/25 border border-white/10 p-4">
            <h4 className="text-white font-bold">Arbeidsplan</h4>
            <div className="space-y-3 mt-4">
              {plan.logs.map(log => <div key={`${log.stage}-${log.startDate}`} className="border-l-2 border-purple-400/40 pl-3 text-xs"><p className="text-purple-200 font-bold">{log.stage} · {log.startDate}</p><p className="text-slate-400 leading-relaxed">{log.notes}</p></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableOliveBatchPlanner;
