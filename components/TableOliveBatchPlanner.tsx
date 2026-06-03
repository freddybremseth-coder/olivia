import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Loader2, PackageCheck, RefreshCcw, Save, ShieldCheck } from 'lucide-react';
import type { Batch, BatchLog, Parcel, Recipe } from '../types';
import { buildBalancedTableOlivePlan } from '../services/tableOliveRecipes';
import { buildDefaultTableOliveSop, fetchProductionSops, ProductionSop, upsertProductionSop } from '../services/productionSops';

interface Props {
  parcels: Parcel[];
  recipes: Recipe[];
  onSave: (batch: Batch) => Promise<void>;
}

const inputClass = 'w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50';
const labelClass = 'text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1';

function appendSopReference(logs: BatchLog[], sop?: ProductionSop): BatchLog[] {
  if (!sop) return logs;
  return logs.map((log) => {
    if (log.stage !== 'LAKE') return log;
    return {
      ...log,
      notes: `${log.notes}\n\nSOP-referanse: ${sop.code} ${sop.version} (${sop.status === 'active' ? 'aktiv' : 'ikke aktiv/godkjent ennå'}).`,
    };
  });
}

const TableOliveBatchPlanner: React.FC<Props> = ({ parcels, recipes, onSave }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSops, setIsLoadingSops] = useState(false);
  const [error, setError] = useState('');
  const [sops, setSops] = useState<ProductionSop[]>([]);
  const [form, setForm] = useState({
    parcelId: '',
    harvestDate: new Date().toISOString().slice(0, 10),
    weight: 0,
    oliveType: '',
    recipeId: '',
    sopId: '',
    quality: 'Premium' as Batch['quality'],
  });

  const selectedRecipe = useMemo(() => recipes.find(recipe => recipe.id === form.recipeId), [recipes, form.recipeId]);
  const selectedSop = useMemo(() => sops.find(sop => sop.id === form.sopId), [sops, form.sopId]);
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

  const loadSops = async () => {
    setIsLoadingSops(true);
    try {
      const rows = await fetchProductionSops('table_olives');
      setSops(rows);
      if (rows.length && !form.sopId) setForm(prev => ({ ...prev, sopId: rows[0].id }));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente SOP-er fra Supabase.');
    } finally {
      setIsLoadingSops(false);
    }
  };

  useEffect(() => {
    loadSops();
  }, []);

  const createDefaultSop = async () => {
    setError('');
    const sop = buildDefaultTableOliveSop();
    try {
      await upsertProductionSop(sop);
      setSops(prev => prev.some(item => item.id === sop.id) ? prev : [sop, ...prev]);
      setForm(prev => ({ ...prev, sopId: sop.id }));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke opprette SOP. Kjør migrasjonen for production_sops først.');
    }
  };

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

    const logsWithSop = appendSopReference(plan.logs, selectedSop);
    const batch: Batch = {
      id: `B${Date.now()}`,
      parcelId: form.parcelId,
      recipeId: selectedRecipe?.id,
      recipeName: selectedRecipe?.name || selectedSop?.code,
      recipeSnapshot: [
        ...plan.ingredients,
        ...(selectedSop ? [{ name: 'SOP-referanse', amount: `${selectedSop.code} ${selectedSop.version}`, unit: selectedSop.status }] : []),
      ],
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
      logs: logsWithSop,
    };

    setIsSaving(true);
    try {
      await onSave(batch);
      setForm({ parcelId: '', harvestDate: new Date().toISOString().slice(0, 10), weight: 0, oliveType: '', recipeId: '', sopId: selectedSop?.id || '', quality: 'Premium' });
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
          <p className="text-xs text-slate-500 mt-1">Velg kg, sort, oppskrift og SOP. Appen skalerer ingredienser og lager arbeidsplan som lagres på batchen.</p>
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div><label className={labelClass}>Oppskrift</label><select className={inputClass} value={form.recipeId} onChange={e => setForm(prev => ({ ...prev, recipeId: e.target.value }))}><option value="">Balansert standardplan</option>{tableRecipes.map(recipe => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></div>
        <div>
          <div className="flex items-center justify-between gap-3 mb-1"><label className={labelClass}>SOP / arbeidsprosedyre</label><button onClick={loadSops} type="button" className="text-[10px] text-slate-500 hover:text-white flex items-center gap-1">{isLoadingSops ? <Loader2 size={11} className="animate-spin" /> : <RefreshCcw size={11} />} Oppdater</button></div>
          <select className={inputClass} value={form.sopId} onChange={e => setForm(prev => ({ ...prev, sopId: e.target.value }))}>
            <option value="">Ingen SOP valgt</option>
            {sops.map(sop => <option key={sop.id} value={sop.id}>{sop.code} {sop.version} · {sop.status}</option>)}
          </select>
          {!sops.length && <button onClick={createDefaultSop} type="button" className="mt-2 w-full rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100">Opprett standard SOP-mal</button>}
        </div>
      </div>

      {selectedSop && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-slate-300">
          <p className="font-bold text-white">{selectedSop.code} {selectedSop.version}: {selectedSop.title}</p>
          <p className="text-slate-500 mt-1">Status: {selectedSop.status}{selectedSop.approvedBy ? ` · Godkjent av ${selectedSop.approvedBy}` : ''}</p>
          {selectedSop.summary && <p className="mt-2 leading-relaxed">{selectedSop.summary}</p>}
        </div>
      )}

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
              {appendSopReference(plan.logs, selectedSop).map(log => <div key={`${log.stage}-${log.startDate}`} className="border-l-2 border-purple-400/40 pl-3 text-xs"><p className="text-purple-200 font-bold">{log.stage} · {log.startDate}</p><p className="text-slate-400 leading-relaxed whitespace-pre-line">{log.notes}</p></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableOliveBatchPlanner;
