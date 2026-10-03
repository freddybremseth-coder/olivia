import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Leaf, Loader2, Play, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import type { Parcel } from '../types';
import { fetchOliviaParcels } from '../services/oliviaSchemaData';
import { deleteHarvestPlan, fetchHarvestPlans, fetchOliveVarieties, upsertHarvestPlan, upsertOliveVariety, type HarvestEstimateSource, type HarvestPlanRecord, type HarvestPlanStatus, type HarvestPurpose } from '../services/harvestPlanning';
import { currentHarvestSeason, harvestSeasonForDate } from '../services/harvestSeason';

const DEFAULT_VARIETIES = ['Gordal', 'Gordal Sevillana', 'Genovesa', 'Changlot Real', 'Arbequina', 'Picual', 'Hojiblanca', 'Manzanilla', 'Blanqueta', 'Blanding'];
const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2';
const now = () => new Date().toISOString();

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

function emptyForm(parcels: Parcel[]): Partial<HarvestPlanRecord> {
  const parcel = parcels[0];
  const parcelVariety = parcel?.treeVariety && parcel.treeVariety !== 'Annen' ? parcel.treeVariety : '';
  return {
    id: `harvest-${Date.now()}`,
    parcel_id: parcel?.id || '',
    parcel_name: parcel?.name || '',
    variety: parcelVariety,
    purpose: undefined,
    status: 'planned',
    estimated_kg: undefined,
    maturity_index: undefined,
    fruit_size: undefined,
    firmness: undefined,
    estimate_source: undefined,
    observation_date: undefined,
    planning_basis: '',
    planned_date: '',
    notes: '',
    created_at: now(),
    updated_at: now(),
  };
}

const HarvestPlannerSupabaseView: React.FC<{ onStartHarvest?: (planId: string) => void }> = ({ onStartHarvest }) => {
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
      const parcelVarieties = parcelRows.map(parcel => parcel.treeVariety).filter((value): value is string => Boolean(value && value !== 'Annen'));
      const allVarieties = Array.from(new Set([...DEFAULT_VARIETIES, ...varietyRows, ...parcelVarieties])).sort((a, b) => a.localeCompare(b));
      setParcels(parcelRows);
      setPlans(planRows);
      setVarieties(allVarieties);
      setForm(current => Object.keys(current).length ? current : emptyForm(parcelRows));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente høsteplan. Kjør Supabase-migrasjonen for harvest_plans først.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const season = currentHarvestSeason();
  const seasonPlans = useMemo(
    () => plans.filter(plan => harvestSeasonForDate(plan.planned_date) === season),
    [plans, season],
  );
  const historicalPlanCount = plans.length - seasonPlans.length;
  const stats = useMemo(() => ({
    plannedKg: seasonPlans.filter(p => p.status !== 'cancelled').reduce((sum, p) => sum + Number(p.estimated_kg || 0), 0),
    approved: seasonPlans.filter(p => p.status === 'approved').length,
    done: seasonPlans.filter(p => p.status === 'done').length,
  }), [seasonPlans]);

  const openNew = () => { setEditingId(null); setForm(emptyForm(parcels)); setOpen(true); };
  const openEdit = (plan: HarvestPlanRecord) => { setEditingId(plan.id); setForm(plan); setOpen(true); };

  const save = async () => {
    if (!form.parcel_id || !form.variety || !form.purpose || !form.planned_date) { setError('Parsell, sort, formål og planlagt dato må fylles ut.'); return; }
    if (!Number.isFinite(Number(form.estimated_kg)) || Number(form.estimated_kg) <= 0) { setError('Estimert kg må fylles inn som et faktisk planestimat, ikke som en automatisk standardverdi.'); return; }
    if (!form.estimate_source) { setError('Velg hva kg-estimatet bygger på.'); return; }
    if (harvestSeasonForDate(form.planned_date) !== season) { setError('Planlagt dato må ligge i aktiv sesong '+season+'.'); return; }
    const parcel = parcels.find(p => p.id === form.parcel_id);
    const record: HarvestPlanRecord = {
      id: form.id || `harvest-${Date.now()}`,
      parcel_id: form.parcel_id,
      parcel_name: parcel?.name || form.parcel_name || form.parcel_id,
      variety: form.variety,
      purpose: form.purpose as HarvestPurpose,
      status: (form.status as HarvestPlanStatus) || 'planned',
      estimated_kg: Number(form.estimated_kg),
      actual_kg: form.actual_kg === undefined ? undefined : Number(form.actual_kg),
      maturity_index: form.maturity_index == null ? undefined : Number(form.maturity_index),
      fruit_size: form.fruit_size || undefined,
      firmness: form.firmness || undefined,
      estimate_source: form.estimate_source as HarvestEstimateSource | undefined,
      observation_date: form.observation_date || undefined,
      planning_basis: form.planning_basis || undefined,
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
    setError('');
    if (status === 'approved' && (!plan.estimated_kg || plan.estimated_kg <= 0 || !plan.estimate_source)) {
      setError('Planen kan ikke godkjennes før estimert kg og grunnlaget for estimatet er registrert.');
      return;
    }
    if (status === 'done' && (!plan.actual_kg || plan.actual_kg <= 0)) {
      setError('Planen kan ikke markeres utført før faktisk kg er registrert gjennom høstemottak/veiing.');
      return;
    }
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
      <div><h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Leaf className="text-green-400" /> Høsteplan Biar</h2><p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Sesong {season} · plan er estimat, høstemottak/veiing er fasit</p></div>
      <div className="flex gap-2"><button onClick={load} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400">{loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button><button onClick={openNew} className="bg-green-500 text-black px-6 py-3.5 rounded-2xl font-bold flex items-center gap-2"><Plus size={20} /> Ny plan</button></div>
    </div>
    {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4"><Card label="Planlagt kg" value={stats.plannedKg.toLocaleString('no-NO')} /><Card label="Godkjent" value={stats.approved} /><Card label="Utført" value={stats.done} /><Card label="Historiske planer" value={historicalPlanCount} /></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{seasonPlans.map(plan => <div key={plan.id} className="glass rounded-[2rem] p-6 border border-white/10"><div className="flex justify-between gap-4"><div><p className="text-[10px] uppercase font-bold tracking-widest text-green-400">{statusLabel(plan.status)} · {purposeLabel(plan.purpose)}</p><h3 className="text-xl text-white font-bold mt-1">{plan.variety} · {plan.parcel_name}</h3><p className="text-xs text-slate-500 mt-1">Planlagt {plan.planned_date}{plan.maturity_index == null ? ' · modenhet ikke målt' : ' · modenhet '+plan.maturity_index}</p><p className="text-[10px] text-slate-600 mt-1">Estimat: {plan.estimate_source || 'grunnlag ikke registrert'}{plan.observation_date ? ' · observert '+plan.observation_date : ''}</p></div><div className="text-right"><p className="text-[10px] text-slate-500">{plan.actual_kg ? 'Faktisk / estimert' : 'Estimert kg'}</p><p className="text-3xl text-white font-black">{plan.actual_kg ? Number(plan.actual_kg).toLocaleString('no-NO') : Number(plan.estimated_kg).toLocaleString('no-NO')}</p>{plan.actual_kg ? <p className="text-[10px] text-slate-500 mt-1">av {Number(plan.estimated_kg).toLocaleString('no-NO')} kg planlagt</p> : null}</div></div>{plan.notes && <p className="text-sm text-slate-400 mt-4">{plan.notes}</p>}<div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-5"><button onClick={() => openEdit(plan)} className="bg-white/10 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Edit3 size={16} /> Rediger</button><button onClick={() => updateStatus(plan, 'approved')} disabled={plan.status==='approved'||plan.status==='done'} className="bg-blue-500/15 text-blue-300 font-bold py-3 rounded-2xl disabled:opacity-35">Godkjenn</button><button onClick={() => onStartHarvest?.(plan.id)} disabled={plan.status!=='approved'||!onStartHarvest} className="bg-green-500 text-black font-black py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-35"><Play size={16}/> Registrer høsting</button><button onClick={() => updateStatus(plan, 'done')} disabled={plan.status==='done'} className="bg-green-500/15 text-green-300 font-bold py-3 rounded-2xl disabled:opacity-35">Utført</button><button onClick={() => remove(plan.id)} className="bg-red-500/10 text-red-300 font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Trash2 size={16} /> Slett</button></div></div>)}</div>
    {!seasonPlans.length && <div className="glass rounded-[2rem] p-8 border border-white/10 text-center text-slate-500">Ingen høsteplaner for {season} ennå. Olivia fyller ikke inn kg, dato eller modenhet på egen hånd.</div>}
    {open && <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full md:max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"><div className="flex justify-between items-center"><h3 className="text-2xl font-bold text-white">{editingId ? 'Rediger høsteplan' : 'Ny høsteplan'}</h3><button onClick={() => setOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Parsell" help="Velg parcellen som skal høstes."><select className={inputClass} value={form.parcel_id || ''} onChange={e => { const parcel = parcels.find(p => p.id === e.target.value); setForm(p => ({ ...p, parcel_id: e.target.value, parcel_name: parcel?.name || e.target.value, variety: parcel?.treeVariety && parcel.treeVariety !== 'Annen' ? parcel.treeVariety : p.variety })); }}><option value="">Velg parsell</option>{parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Formål" help="Bordoliven, olje eller blandet parti."><select className={inputClass} value={form.purpose || ''} onChange={e => setForm(p => ({ ...p, purpose: e.target.value as HarvestPurpose }))}><option value="">Velg formål</option><option value="table_olives">Bordoliven</option><option value="oil">Olje</option><option value="mixed">Blandet</option></select></Field></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Olivensort"><select className={inputClass} value={form.variety || ''} onChange={e => setForm(p => ({ ...p, variety: e.target.value }))}>{varieties.map(v => <option key={v} value={v}>{v}</option>)}</select></Field><Field label="Legg til ny sort" help="Lagrer i olivia.olive_varieties."><div className="flex gap-2"><input className={inputClass} placeholder="F.eks. Empeltre" value={newVariety} onChange={e => setNewVariety(e.target.value)} /><button onClick={addVariety} className="px-4 rounded-2xl bg-[#d9b657] text-black font-bold">Legg til</button></div></Field></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Planlagt dato" help="Velg dato dere faktisk planlegger mot. Olivia setter ingen standarddato."><input type="date" className={inputClass} value={form.planned_date || ''} onChange={e => setForm(p => ({ ...p, planned_date: e.target.value }))} /></Field><Field label="Estimert kg" help="Må være deres eget estimat."><input type="number" min="0" step="1" className={inputClass} value={form.estimated_kg ?? ''} onChange={e => setForm(p => ({ ...p, estimated_kg: e.target.value === '' ? undefined : Number(e.target.value) }))} /></Field><Field label="Faktisk kg" help="Oppdateres fra høstemottak/veiing, ikke manuelt."><div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white">{form.actual_kg == null ? 'Ikke registrert' : Number(form.actual_kg).toLocaleString('no-NO')+' kg'}</div></Field></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Grunnlag for kg-estimat"><select className={inputClass} value={form.estimate_source || ''} onChange={e => setForm(p => ({ ...p, estimate_source: e.target.value as HarvestEstimateSource }))}><option value="">Velg grunnlag</option><option value="field_estimate">Feltvurdering</option><option value="previous_season">Forrige sesong</option><option value="tree_count">Treantall / beregning</option><option value="weighing">Prøveveiing</option><option value="other">Annet dokumentert grunnlag</option></select></Field><Field label="Observasjonsdato" help="Når modenhet/størrelse eller estimat ble vurdert."><input type="date" className={inputClass} value={form.observation_date || ''} onChange={e => setForm(p => ({ ...p, observation_date: e.target.value }))} /></Field><Field label="Planleggingsgrunnlag"><input className={inputClass} value={form.planning_basis || ''} onChange={e => setForm(p => ({ ...p, planning_basis: e.target.value }))} placeholder="Kort forklaring på estimatet"/></Field></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><Field label="Modenhetsindeks" help="La stå tom hvis den ikke er målt."><input type="number" step="0.1" min="0" max="7" className={inputClass} value={form.maturity_index ?? ''} onChange={e => setForm(p => ({ ...p, maturity_index: e.target.value === '' ? undefined : Number(e.target.value) }))} /></Field><Field label="Fruktstørrelse"><select className={inputClass} value={form.fruit_size || ''} onChange={e => setForm(p => ({ ...p, fruit_size: e.target.value ? e.target.value as any : undefined }))}><option value="">Ikke vurdert</option><option value="small">Liten</option><option value="medium">Middels</option><option value="large">Stor</option><option value="very_large">Svært stor</option></select></Field><Field label="Fasthet"><select className={inputClass} value={form.firmness || ''} onChange={e => setForm(p => ({ ...p, firmness: e.target.value ? e.target.value as any : undefined }))}><option value="">Ikke vurdert</option><option value="hard">Hard</option><option value="medium">Middels</option><option value="soft">Myk</option></select></Field></div>
      <Field label="Status" help="Godkjenn og marker utført fra plan-kortet slik at kontrollene kjøres."><div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white">{statusLabel((form.status as HarvestPlanStatus) || 'planned')}</div></Field>
      <Field label="Notat" help="Ledetekst: kvalitet, skadegrad, logistikk, kasser, mannskap, pressing eller lake."><textarea className="w-full min-h-[110px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500/50" value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></Field>
      <button onClick={save} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg flex items-center justify-center gap-2"><Save size={20} /> Lagre i Supabase</button>
    </div></div>}
  </div>;
};

const Card: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="glass rounded-[2rem] p-5 border border-white/10"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-3xl font-black text-white mt-1">{value}</p></div>;
const Field: React.FC<{ label: string; help?: string; children: React.ReactNode }> = ({ label, help, children }) => <div><label className={labelClass}>{label}</label>{children}{help && <p className="text-[10px] text-slate-600 mt-1">{help}</p>}</div>;

export default HarvestPlannerSupabaseView;
