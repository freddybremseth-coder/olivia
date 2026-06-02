import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronDown, Euro, Loader2, Plus, RefreshCcw, Save, Trash2, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Language, Parcel } from '../types';
import {
  deleteOliviaExpense,
  deleteOliviaSubsidy,
  ExpenseCategory,
  FarmExpense,
  fetchOliviaExpenses,
  fetchOliviaHarvests,
  fetchOliviaSubsidies,
  HarvestRecord,
  insertOliviaExpense,
  insertOliviaSubsidy,
  SubsidyIncome,
  SubsidyType,
} from '../services/oliviaSchemaData';

interface Props { language: Language; parcels: Parcel[]; }

type Tab = 'overview' | 'expenses' | 'income' | 'parcel';

const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  innhøsting: 'Innhøsting',
  beskjæring: 'Beskjæring',
  nye_planter: 'Nye planter',
  trefelling: 'Trefelling / rydding',
  sprøyting: 'Sprøyting',
  vann: 'Vann / irrigasjon',
  gjødsel: 'Gjødsel',
  forsikring: 'Forsikring',
  vedlikehold: 'Maskin & vedlikehold',
  administrasjon: 'Administrasjon',
  transport: 'Transport',
  emballasje: 'Emballasje',
  annet: 'Annet',
};

const SUBSIDY_LABELS: Record<SubsidyType, string> = {
  eu_okologisk: 'EU-støtte – Økologisk landbruk',
  eu_pao: 'EU-støtte – Produksjonsstøtte olje',
  annet: 'Annet tilskudd / støtte',
};

const currentSeason = () => new Date().getFullYear().toString();
const fmt = (n: number) => `€${Math.round(n).toLocaleString('no-NO')}`;
const inputClass = 'w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50';

const ProfitabilityOliviaDashboard: React.FC<Props> = ({ parcels }) => {
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [expenses, setExpenses] = useState<FarmExpense[]>([]);
  const [subsidies, setSubsidies] = useState<SubsidyIncome[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [season, setSeason] = useState(currentSeason());
  const [error, setError] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSubsidyForm, setShowSubsidyForm] = useState(false);
  const [newExp, setNewExp] = useState<Partial<FarmExpense>>({ season: currentSeason(), date: new Date().toISOString().slice(0, 10), category: 'annet', scope: 'farm', amount: 0, description: '' });
  const [newSub, setNewSub] = useState<Partial<SubsidyIncome>>({ season: currentSeason(), date: new Date().toISOString().slice(0, 10), type: 'eu_okologisk', amount: 0, description: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [h, e, s] = await Promise.all([fetchOliviaHarvests(), fetchOliviaExpenses(), fetchOliviaSubsidies()]);
      setHarvests(h);
      setExpenses(e);
      setSubsidies(s);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente økonomidata fra olivia schema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const seasons = useMemo(() => {
    const all = new Set([currentSeason(), ...harvests.map(h => h.season), ...expenses.map(e => e.season), ...subsidies.map(s => s.season)]);
    return [...all].sort((a, b) => b.localeCompare(a));
  }, [harvests, expenses, subsidies]);

  const sHarvests = harvests.filter(h => h.season === season);
  const sExpenses = expenses.filter(e => e.season === season);
  const sSubsidies = subsidies.filter(s => s.season === season);

  const harvestRevenue = sHarvests.reduce((t, h) => t + h.kg * h.pricePerKg, 0);
  const subsidyRevenue = sSubsidies.reduce((t, s) => t + s.amount, 0);
  const totalRevenue = harvestRevenue + subsidyRevenue;
  const totalExpenses = sExpenses.reduce((t, e) => t + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const expenseChart = useMemo(() => {
    const map: Record<string, number> = {};
    sExpenses.forEach(e => { map[EXPENSE_LABELS[e.category] || e.category] = (map[EXPENSE_LABELS[e.category] || e.category] || 0) + e.amount; });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
  }, [sExpenses]);

  const perParcel = useMemo(() => parcels.map(p => {
    const rev = sHarvests.filter(h => h.parcelId === p.id).reduce((t, h) => t + h.kg * h.pricePerKg, 0);
    const cost = sExpenses.filter(e => e.parcelId === p.id).reduce((t, e) => t + e.amount, 0);
    const kg = sHarvests.filter(h => h.parcelId === p.id).reduce((t, h) => t + h.kg, 0);
    const ha = (p.area || 0) / 10000;
    return { id: p.id, name: p.name, rev, cost, profit: rev - cost, kg, ha };
  }).filter(p => p.rev || p.cost || p.kg), [parcels, sHarvests, sExpenses]);

  const addExpense = async () => {
    setError('');
    if (!newExp.amount || !newExp.description) { setError('Beløp og beskrivelse må fylles ut.'); return; }
    const rec: FarmExpense = {
      id: `E${Date.now()}`,
      date: newExp.date || new Date().toISOString().slice(0, 10),
      season: newExp.season || currentSeason(),
      category: newExp.category as ExpenseCategory || 'annet',
      description: newExp.description,
      amount: Number(newExp.amount),
      scope: newExp.scope as 'farm' | 'parcel' || 'farm',
      parcelId: newExp.scope === 'parcel' ? newExp.parcelId : undefined,
    };
    try {
      await insertOliviaExpense(rec);
      setExpenses(prev => [rec, ...prev]);
      setNewExp({ season, date: new Date().toISOString().slice(0, 10), category: 'annet', scope: 'farm', amount: 0, description: '' });
      setShowExpenseForm(false);
    } catch (err: any) { setError(err?.message || 'Lagring av utgift feilet.'); }
  };

  const addSubsidy = async () => {
    setError('');
    if (!newSub.amount) { setError('Beløp må fylles ut.'); return; }
    const rec: SubsidyIncome = {
      id: `S${Date.now()}`,
      date: newSub.date || new Date().toISOString().slice(0, 10),
      season: newSub.season || season,
      type: newSub.type as SubsidyType || 'annet',
      amount: Number(newSub.amount),
      description: newSub.description || SUBSIDY_LABELS[newSub.type as SubsidyType || 'annet'],
    };
    try {
      await insertOliviaSubsidy(rec);
      setSubsidies(prev => [rec, ...prev]);
      setNewSub({ season, date: new Date().toISOString().slice(0, 10), type: 'eu_okologisk', amount: 0, description: '' });
      setShowSubsidyForm(false);
    } catch (err: any) { setError(err?.message || 'Lagring av støtte feilet.'); }
  };

  const removeExpense = async (id: string) => {
    try { await deleteOliviaExpense(id); setExpenses(prev => prev.filter(e => e.id !== id)); }
    catch (err: any) { setError(err?.message || 'Sletting feilet.'); }
  };

  const removeSubsidy = async (id: string) => {
    try { await deleteOliviaSubsidy(id); setSubsidies(prev => prev.filter(s => s.id !== id)); }
    catch (err: any) { setError(err?.message || 'Sletting feilet.'); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Euro className="text-green-400" /> Økonomi</h2>
          <p className="text-slate-400 text-sm mt-1">Ekte data fra RealtyFlow / Supabase `olivia` schema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-green-400">{loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <div className="relative">
            <select value={season} onChange={e => setSeason(e.target.value)} className="appearance-none bg-white/5 border border-white/10 rounded-2xl pl-4 pr-10 py-3 text-white font-bold text-sm focus:outline-none cursor-pointer">
              {seasons.map(s => <option key={s} value={s} className="bg-slate-800">{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
          </div>
        </div>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ['Bruttoinntekt', fmt(totalRevenue), `Høst ${fmt(harvestRevenue)} + støtte ${fmt(subsidyRevenue)}`, 'border-green-500/20 bg-green-500/5'],
          ['Totale utgifter', fmt(totalExpenses), `${sExpenses.length} poster`, 'border-red-500/20 bg-red-500/5'],
          ['Netto', fmt(netProfit), netProfit >= 0 ? 'Positiv sesong' : 'Underskudd', netProfit >= 0 ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'],
          ['Margin', `${margin.toFixed(1)}%`, totalRevenue ? 'Basert på inntekter' : 'Ingen inntekt ennå', 'border-white/10'],
        ].map(([label, value, sub, cls]) => (
          <div key={label} className={`glass rounded-2xl p-5 border ${cls}`}><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">{label}</p><p className="text-2xl font-black text-white">{value}</p><p className="text-[11px] text-slate-500 mt-1">{sub}</p></div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(['overview', 'expenses', 'income', 'parcel'] as Tab[]).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeTab === tab ? 'bg-green-500 text-black' : 'bg-white/5 text-slate-400'}`}>{tab === 'overview' ? 'Oversikt' : tab === 'expenses' ? 'Utgifter' : tab === 'income' ? 'Inntekter/støtte' : 'Per parsell'}</button>)}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="glass rounded-3xl p-6 border border-white/10">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><BarChart3 size={16} /> Utgifter per kategori</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={expenseChart}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" /><XAxis dataKey="name" stroke="#64748b" fontSize={10} /><YAxis stroke="#64748b" fontSize={10} /><Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} /><Bar dataKey="value" fill="#22c55e" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-3xl p-6 border border-white/10">
            <h3 className="text-sm font-bold text-white mb-4">Datagrunnlag</h3>
            <div className="space-y-3 text-sm text-slate-400">
              <p>Høsting: {sHarvests.length} rader fra <code>olivia.harvest_records</code></p>
              <p>Utgifter: {sExpenses.length} rader fra <code>olivia.farm_expenses</code></p>
              <p>Støtte: {sSubsidies.length} rader fra <code>olivia.subsidy_income</code></p>
              <p>Parceller: {parcels.length} rader fra <code>olivia.parcels</code></p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-bold text-white">Utgifter</h3><button onClick={() => setShowExpenseForm(true)} className="px-4 py-2 bg-green-500 text-black rounded-xl font-bold text-xs flex gap-2 items-center"><Plus size={14} /> Ny utgift</button></div>
          {showExpenseForm && <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-white/5 rounded-2xl"><input type="date" className={inputClass} value={newExp.date} onChange={e => setNewExp(p => ({ ...p, date: e.target.value }))} /><select className={inputClass} value={newExp.category} onChange={e => setNewExp(p => ({ ...p, category: e.target.value as ExpenseCategory }))}>{Object.entries(EXPENSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><input className={inputClass} placeholder="Beskrivelse" value={newExp.description || ''} onChange={e => setNewExp(p => ({ ...p, description: e.target.value }))} /><input type="number" className={inputClass} placeholder="Beløp" value={newExp.amount || ''} onChange={e => setNewExp(p => ({ ...p, amount: Number(e.target.value) }))} /><select className={inputClass} value={newExp.parcelId || ''} onChange={e => setNewExp(p => ({ ...p, scope: e.target.value ? 'parcel' : 'farm', parcelId: e.target.value || undefined }))}><option value="">Hele gården</option>{parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><div className="flex gap-2"><button onClick={addExpense} className="p-3 bg-green-500 text-black rounded-xl"><Save size={16} /></button><button onClick={() => setShowExpenseForm(false)} className="p-3 bg-white/10 text-white rounded-xl"><X size={16} /></button></div></div>}
          <div className="space-y-2">{sExpenses.map(e => <div key={e.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl"><div><p className="text-white font-bold">{e.description}</p><p className="text-xs text-slate-500">{e.date} · {EXPENSE_LABELS[e.category]} · {e.parcelId ? parcels.find(p => p.id === e.parcelId)?.name || e.parcelId : 'Hele gården'}</p></div><div className="flex items-center gap-3"><p className="text-red-400 font-black">{fmt(e.amount)}</p><button onClick={() => removeExpense(e.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></div></div>)}</div>
        </div>
      )}

      {activeTab === 'income' && (
        <div className="glass rounded-3xl p-6 border border-white/10 space-y-4">
          <div className="flex justify-between items-center"><h3 className="font-bold text-white">Inntekter og støtte</h3><button onClick={() => setShowSubsidyForm(true)} className="px-4 py-2 bg-green-500 text-black rounded-xl font-bold text-xs flex gap-2 items-center"><Plus size={14} /> Ny støtte</button></div>
          {showSubsidyForm && <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-4 bg-white/5 rounded-2xl"><input type="date" className={inputClass} value={newSub.date} onChange={e => setNewSub(p => ({ ...p, date: e.target.value }))} /><select className={inputClass} value={newSub.type} onChange={e => setNewSub(p => ({ ...p, type: e.target.value as SubsidyType }))}>{Object.entries(SUBSIDY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select><input className={inputClass} placeholder="Beskrivelse" value={newSub.description || ''} onChange={e => setNewSub(p => ({ ...p, description: e.target.value }))} /><input type="number" className={inputClass} placeholder="Beløp" value={newSub.amount || ''} onChange={e => setNewSub(p => ({ ...p, amount: Number(e.target.value) }))} /><div className="flex gap-2"><button onClick={addSubsidy} className="p-3 bg-green-500 text-black rounded-xl"><Save size={16} /></button><button onClick={() => setShowSubsidyForm(false)} className="p-3 bg-white/10 text-white rounded-xl"><X size={16} /></button></div></div>}
          <div className="space-y-2">{sSubsidies.map(s => <div key={s.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl"><div><p className="text-white font-bold">{s.description}</p><p className="text-xs text-slate-500">{s.date} · {SUBSIDY_LABELS[s.type]}</p></div><div className="flex items-center gap-3"><p className="text-green-400 font-black">{fmt(s.amount)}</p><button onClick={() => removeSubsidy(s.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></div></div>)}</div>
          <div className="pt-4 border-t border-white/10"><h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Høsteinntekter</h4>{sHarvests.map(h => <div key={h.id} className="flex justify-between p-3 text-sm"><span className="text-slate-400">{h.date} · {h.kg} kg · {h.variety || h.channel}</span><span className="text-white font-bold">{fmt(h.kg * h.pricePerKg)}</span></div>)}</div>
        </div>
      )}

      {activeTab === 'parcel' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{perParcel.map(p => <div key={p.id} className="glass rounded-3xl p-5 border border-white/10"><h3 className="text-white font-bold">{p.name}</h3><div className="grid grid-cols-4 gap-3 mt-4 text-sm"><div><p className="text-slate-500 text-xs">Inntekt</p><p className="text-green-400 font-bold">{fmt(p.rev)}</p></div><div><p className="text-slate-500 text-xs">Kost</p><p className="text-red-400 font-bold">{fmt(p.cost)}</p></div><div><p className="text-slate-500 text-xs">Netto</p><p className="text-white font-bold">{fmt(p.profit)}</p></div><div><p className="text-slate-500 text-xs">Kg</p><p className="text-white font-bold">{Math.round(p.kg)}</p></div></div></div>)}</div>
      )}
    </div>
  );
};

export default ProfitabilityOliviaDashboard;
