import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Leaf, Loader2, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import type { Parcel } from '../types';
import { fetchOliviaParcels } from '../services/oliviaSchemaData';
import { deleteHarvestPlan, fetchHarvestPlans, fetchOliveVarieties, upsertHarvestPlan, upsertOliveVariety, type HarvestPlanRecord, type HarvestPlanStatus, type HarvestPurpose } from '../services/harvestPlanning';

const DEFAULT_VARIETIES = ['Gordal', 'Gordal Sevillana', 'Genovesa', 'Changlot Real', 'Arbequina', 'Picual', 'Hojiblanca', 'Manzanilla', 'Blanqueta', 'Blanding'];
const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2';
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

function defaultPlanDate(purpose: HarvestPurpose): string {
  const year = new Date().getFullYear();
  if (purpose === 'table_olives') return `${year}-10-20`;
  if (purpose === 'oil') return `${year}-11-25`;
  return `${year}-11-10`;
}

function statusLabel(status: HarvestPlanStatus): string {
  if (status === 'approved') return 'Godkjent';
  if (status === 'done') return 'Utført';
  if (status === 'cancelled') return 'Kansellert';
  return 'Planlagt';
}

function purposeLabel(purpose: HarvestPurpose): string {
  if (purpose === 'table_olives') return 'Bordoliven';
  if (purpose === 'oil') return 'Olje';
  return 'Blandet';
}

function emptyForm(parcels: Parcel[], varieties: string[]): Partial<HarvestPlanRecord> {
  const parcel = parcels[0];
  return {
    id: `harvest-${Date.now()}`,
    parcel_id: parcel?.id || '',
    parcel_name: parcel?.name || '',
    variety: varieties[0] || 'Gordal',
    purpose: 'table_olives',
    status: 'planned',
    estimated_kg: 500,
    maturity_index: 2,
    fruit_size: 'large',
    firmness: 'hard',
    planned_date: defaultPlanDate('table_olives'),
    notes: '',
    created_at: now(),
    updated_at: now(),
  };
}

const HarvestPlannerSupabaseView: React.FC = () => {
  const [plans, setPlans] = useState<HarvestPlanRecord[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [varieties, setVarieties] = useState<string[]>(DEFAULT_VARIETIES);
  const [form, setForm] = useState<Partial<HarvestPlanRecord>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [newVariety, setNewVariety] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [parcelRows, planRows, varietyRows] = await Promise.all([fetchOliviaParcels(), fetchHarvestPlans(), fetchOliveVarieties()]);
      const allVarieties = Array.from(new Set([...DEFAULT_VARIETIES, ...varietyRows])).sort((a, b) => a.localeCompare(b));
      setParcels(parcelRows);
      setPlans(planRows);
      setVarieties(allVarieties);
      setForm(current => Object.keys(current).length ? current : emptyForm(parcelRows, allVarieties));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente høsteplan. Kjør Supabase-migrasjonen for harvest_plans først.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    plannedKg: plans.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + Number(p.estimated_kg || 0), 0),
    approved: plans.filter(p => p.status === 'approved').length,
    done: plans.filter(p => p.status === 'done').length,
  }), [plans]);

  const openNew = () => { setEditingId(null); setForm(emptyForm(parcels, varieties)); setOpen(true); };
  const openEdit = (plan: HarvestPlanRecord) => { setEditingId(plan.id); setForm(plan); setOpen(true); };

  const save = async () => {
    if (!form.parcel_id || !form.variety || !form.purpose || !form.planned_date) { setError('Parsell, sort, formål og dato må fylles ut.'); return; }
    const parcel = parcels.find(p => p.id === form.parcel_id);
    const record: HarvestPlanRecord = {
      id: form.id || `harvest-${Date.now()}`,
      parcel_id: form.parcel_id,
      parcel_name: parcel?.name || form.parcel_name || form.parcel_id,
      variety: form.variety,
      purpose: form.purpose as HarvestPurpose,
      status: (form.status as HarvestPlanStatus) || 'planned',
      estimated_kg: Number(form.estimated_kg || 0),
      actual_kg: form.actual_kg ? Number(form.actual_kg) : undefined,
      maturity_index: Number(form.maturity_index || 0),
      fruit_size: form.fruit_size || 'medium',
      firmness: form.firmness || 'medium',
      planned_date: form.planned_date,
      approved_at: form.approved_at,
      completed_at: form.completed_at,
      notes: form.notes || undefined,
      created_at: form.created_at || now(),
      updated_at: now(),
    };
    await upsertHarvestPlan(record);
    setPlans(prev => editingId ? prev.map(p => p.id === editingId ? record : p) : [record, ...prev]);
    setOpen(false);
    setEditingId(null);
  };

  const updateStatus = async (plan: HarvestPlanRecord, status: HarvestPlanStatus) => {
    const updated = { ...plan, status, approved_at: status === 'approved' ? now() : plan.approved_at, completed_at: status === 'done' ? now() : plan.completed_at, updated_at: now() };
    await upsertHarvestPlan(updated);
    setPlans(prev => prev.map(p => p.id === plan.id ? updated : p));
  };

  const remove = async (id: string) => {
    await deleteHarvestPlan(id);
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const addVariety = async () => {
    const name = newVariety.trim();
    if (!name) return;
    await upsertOliveVariety(name, 'Lagt til fra høsteplan');
    setVarieties(prev => Array.from(new Set([...prev, name])).sort((a, b) => a.localeCompare(b)));
    setForm(prev => ({ ...prev, variety: name }));
    setNewVariety('');
  };

  return <div className="space-y-8 animate-in fade-in duration-700 pb-24">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div><h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Leaf className="text-green-400" /> Høsteplan Biar</h2><p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Lagret i Supabase: olivia.harvest_plans og olivia.olive_varieties</p></div>
      <div className="flex gap-2"><button onClick={load} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400">{loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button><button onClick={openNew} className="bg-green-500 text-black px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2"><Plus size={20} /> Ny plan</button></div>
    </div>
    {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}
    <div className="grid grid-cols-3 gap-4"><Card label="Planlagt kg" value={stats.plannedKg.toLocaleString('no-NO')} /><Card label="Godkjent" value={stats.approved} /><Card label="Utført" value={stats.done} /></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{plans.map(plan => <div key={plan.id} className="glass rounded-[2rem] p-6 border border-white/10"><div className="flex justify-between gap-4"><div><p className="text-[10px] uppercase font-bold tracking-widest text-green-400">{statusLabel(plan.status)} · {purposeLabel(plan.purpose)}</p><h3 className="text-xl text-white font-bold mt-1">{plan.variety} · {plan.parcel_name}</h3><p className="text-xs text-slate-500 mt-1">Planlagt {plan.planned_date} · modning {plan.maturity_index}</p></div><div className="text-right"><p className="text-[10px] text-slate-500">kg</p><p className="text-3xl text-white font-black">{plan.status === 'done' && plan.actual_kg ? plan.actual_kg : plan.estimated_kg}</p></div></div>{plan.notes && <p className="text-sm text-slate-400 mt-4">{plan.notes}</p>}<div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5"><button onClick={() => openEdit(plan)} className="bg-white/10 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Edit3 size={16} /> Rediger</button><button onClick={() => updateStatus(plan, 'approved')} className="bg-blue-500/15 text-blue-300 font-bold py-3 rounded-2xl">Godkjenn</button><button onClick={() => updateStatus(plan, 'done')} className="bg-green-500/15 text-green-300 font-bold py-3 rounded-2xl">Utført</button><button onClick={() => remove(plan.id)} className="bg-red-500/10 text-red-300 font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Trash2 size={16} /> Slett</button></div></div>)}</div>
    {!plans.length && <div className="glass rounded-[2rem] p-8 border border-white/10 text-center text-slate-500">Ingen høsteplaner i Supabase ennå.</div>}
    {open && <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full md:max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"><div className="flex justify-between items-center"><h3 className="text-2xl font-bold text-white">{editingId ? 'Rediger høsteplan' : 'Ny høsteplan'}</h3><button onClick={() => setOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Parsell" help="Velg parcellen som skal høstes."><select className={inputClass} value={form.parcel_id || ''} onChange={e => { const parcel = parcels.find(p => p.id === e.target.value); setForm(p => ({ ...p, parcel_id: e.target.value, parcel_name: parcel?.name || e.target.value })); }}><option value="">Velg parsell</option>{parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Formål" help="Bordoliven, olje eller blandet parti."><select className={inputClass} value={form.purpose || 'table_olives'} onChange={e => { const purpose = e.target.value as HarvestPurpose; setForm(p => ({ ...p, purpose, planned_date: defaultPlanDate(purpose) })); }}><option value="table_olives">Bordoliven</option><option value="oil">Olje</option><option value="mixed">Blandet</option></select></Field></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Olivensort"><select className={inputClass} value={form.variety || ''} onChange={e => setForm(p => ({ ...p, variety: e.target.value }))}>{varieties.map(v => <option key={v} value={v}>{v}</option>)}</select></Field><Field label="Legg til ny sort" help="Lagrer i olivia.olive_varieties."><div className="flex gap-2"><input className={inputClass} placeholder="F.eks. Empeltre" value={newVariety} onChange={e => setNewVariety(e.target.value)} /><button onClick={addVariety} className="px-4 rounded-2xl bg-[#d9b657] text-black font-bold">Legg til</button></div></Field></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Planlagt dato"><input type="date" className={inputClass} value={form.planned_date || today()} onChange={e => setForm(p => ({ ...p, planned_date: e.target.value }))} /></Field><Field label="Estimert kg"><input type="number" className={inputClass} value={form.estimated_kg || ''} onChange={e => setForm(p => ({ ...p, estimated_kg: Number(e.target.value) }))} /></Field><Field label="Faktisk kg"><input type="number" className={inputClass} placeholder="Når utført" value={form.actual_kg || ''} onChange={e => setForm(p => ({ ...p, actual_kg: Number(e.target.value) }))} /></Field></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Modenhetsindeks"><input type="number" step="0.1" min="0" max="7" className={inputClass} value={form.maturity_index || ''} onChange={e => setForm(p => ({ ...p, maturity_index: Number(e.target.value) }))} /></Field><Field label="Fruktstørrelse"><select className={inputClass} value={form.fruit_size || 'medium'} onChange={e => setForm(p => ({ ...p, fruit_size: e.target.value as any }))}><option value="small">Liten</option><option value="medium">Middels</option><option value="large">Stor</option><option value="very_large">Svært stor</option></select></Field><Field label="Fasthet"><select className={inputClass} value={form.firmness || 'medium'} onChange={e => setForm(p => ({ ...p, firmness: e.target.value as any }))}><option value="hard">Hard</option><option value="medium">Middels</option><option value="soft">Myk</option></select></Field></div>
      <Field label="Status"><select className={inputClass} value={form.status || 'planned'} onChange={e => setForm(p => ({ ...p, status: e.target.value as HarvestPlanStatus }))}><option value="planned">Planlagt</option><option value="approved">Godkjent</option><option value="done">Utført</option><option value="cancelled">Kansellert</option></select></Field>
      <Field label="Notat" help="Ledetekst: kvalitet, skadegrad, logistikk, kasser, mannskap, pressing eller lake."><textarea className="w-full min-h-[110px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500/50" value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></Field>
      <button onClick={save} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg flex items-center justify-center gap-2"><Save size={20} /> Lagre i Supabase</button>
    </div></div>}
  </div>;
};

const Card: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="glass rounded-[2rem] p-5 border border-white/10"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-3xl font-black text-white mt-1">{value}</p></div>;
const Field: React.FC<{ label: string; help?: string; children: React.ReactNode }> = ({ label, help, children }) => <div><label className={labelClass}>{label}</label>{children}{help && <p className="text-[10px] text-slate-600 mt-1">{help}</p>}</div>;

export default HarvestPlannerSupabaseView;
