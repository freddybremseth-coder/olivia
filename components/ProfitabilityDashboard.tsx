
import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Plus, Trash2, Save, X,
  Leaf, Droplets, Wrench, Tractor, Package, MoreHorizontal,
  Factory, User, ShieldCheck, TreePine, Sprout,
  ChevronDown, BarChart2, Euro, Wheat, BookOpen
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell
} from 'recharts';
import {
  Parcel, Language, HarvestRecord, FarmExpense, SubsidyIncome,
  SalesChannel, ExpenseCategory, SubsidyType
} from '../types';
import {
  fetchHarvests, fetchExpenses, fetchSubsidies,
  upsertExpense, deleteExpense as dbDeleteExpense,
  upsertSubsidy, deleteSubsidy as dbDeleteSubsidy,
} from '../services/db';

const CHANNEL_LABELS: Record<SalesChannel, string> = {
  cooperativa:  'Cooperativa',
  bordoliven:   'Bordoliven',
  olje_premier: 'Olje Premier',
  olje_export:  'Olje Export',
};

const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  innhøsting:    'Innhøsting',
  beskjæring:    'Beskjæring',
  nye_planter:   'Nye planter',
  trefelling:    'Trefelling / rydding',
  sprøyting:     'Sprøyting',
  vann:          'Vann / irrigasjon',
  gjødsel:       'Gjødsel',
  forsikring:    'Forsikring',
  vedlikehold:   'Maskin & vedlikehold',
  administrasjon:'Administrasjon',
  transport:     'Transport',
  emballasje:    'Emballasje',
  annet:         'Annet',
};

const EXPENSE_ICONS: Record<ExpenseCategory, React.ReactNode> = {
  innhøsting:    <Tractor size={13} />,
  beskjæring:    <TreePine size={13} />,
  nye_planter:   <Sprout size={13} />,
  trefelling:    <TreePine size={13} />,
  sprøyting:     <Droplets size={13} />,
  vann:          <Droplets size={13} />,
  gjødsel:       <Leaf size={13} />,
  forsikring:    <ShieldCheck size={13} />,
  vedlikehold:   <Wrench size={13} />,
  administrasjon:<User size={13} />,
  transport:     <Tractor size={13} />,
  emballasje:    <Package size={13} />,
  annet:         <MoreHorizontal size={13} />,
};

const SUBSIDY_LABELS: Record<SubsidyType, string> = {
  eu_okologisk: 'EU-støtte – Økologisk landbruk',
  eu_pao:       'EU-støtte – Produksjonsstøtte olje (PAO)',
  annet:        'Annet tilskudd / støtte',
};

const CHART_COLORS = ['#22c55e','#3b82f6','#f97316','#8b5cf6','#ef4444','#f59e0b','#10b981','#06b6d4','#ec4899','#84cc16','#a78bfa','#fb923c'];

const currentSeason = () => new Date().getFullYear().toString();

interface Props { language: Language; parcels: Parcel[]; }
type EcoTab = 'oversikt' | 'utgifter' | 'inntekter' | 'per_parsell';

const ProfitabilityDashboard: React.FC<Props> = ({ language, parcels }) => {
  const [harvests,  setHarvests]  = useState<HarvestRecord[]>([]);
  const [expenses,  setExpenses]  = useState<FarmExpense[]>([]);
  const [subsidies, setSubsidies] = useState<SubsidyIncome[]>([]);

  useEffect(() => {
    fetchHarvests().then(setHarvests);
    fetchExpenses().then(setExpenses);
    fetchSubsidies().then(setSubsidies);
  }, []);

  const [activeTab,       setActiveTab]       = useState<EcoTab>('oversikt');
  const [season,          setSeason]          = useState(currentSeason());
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showSubsidyForm, setShowSubsidyForm] = useState(false);
  const [expCatFilter,    setExpCatFilter]    = useState<ExpenseCategory | 'all'>('all');

  const seasons = useMemo(() => {
    const all = new Set([currentSeason(), ...harvests.map(h=>h.season), ...expenses.map(e=>e.season), ...subsidies.map(s=>s.season)]);
    return [...all].sort((a,b) => b.localeCompare(a));
  }, [harvests, expenses, subsidies]);

  const [newExp, setNewExp] = useState<Partial<FarmExpense>>({ season: currentSeason(), date: new Date().toISOString().slice(0,10), category: 'innhøsting', scope: 'parcel', amount: 0, description: '' });
  const addExpense = async () => {
    if (!newExp.amount || newExp.amount <= 0 || !newExp.description) return;
    const rec: FarmExpense = { id: `E${Date.now()}`, date: newExp.date!, season: newExp.season!, category: newExp.category as ExpenseCategory, description: newExp.description, amount: newExp.amount, scope: newExp.scope as 'farm'|'parcel', parcelId: newExp.scope==='parcel' ? newExp.parcelId : undefined };
    await upsertExpense(rec);
    setExpenses(prev => [rec, ...prev]);
    setNewExp(p => ({...p, amount: 0, description: ''}));
    setShowExpenseForm(false);
  };
  const removeExpense = async (id: string) => {
    await dbDeleteExpense(id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const [newSub, setNewSub] = useState<Partial<SubsidyIncome>>({ season: currentSeason(), date: new Date().toISOString().slice(0,10), type: 'eu_okologisk', amount: 0, description: '' });
  const addSubsidy = async () => {
    if (!newSub.amount || newSub.amount <= 0) return;
    const rec: SubsidyIncome = { id: `S${Date.now()}`, date: newSub.date!, season: newSub.season!, type: newSub.type as SubsidyType, amount: newSub.amount, description: newSub.description || SUBSIDY_LABELS[newSub.type as SubsidyType] };
    await upsertSubsidy(rec);
    setSubsidies(prev => [rec, ...prev]);
    setNewSub(p => ({...p, amount: 0, description: ''}));
    setShowSubsidyForm(false);
  };
  const removeSubsidy = async (id: string) => {
    await dbDeleteSubsidy(id);
    setSubsidies(prev => prev.filter(s => s.id !== id));
  };

  const sHarvests  = harvests.filter(h => h.season === season);
  const sExpenses  = expenses.filter(e => e.season === season);
  const sSubsidies = subsidies.filter(s => s.season === season);

  const harvestRevenue = sHarvests.reduce((t,h) => t + h.kg*h.pricePerKg, 0);
  const subsidyRevenue = sSubsidies.reduce((t,s) => t + s.amount, 0);
  const totalRevenue   = harvestRevenue + subsidyRevenue;
  const totalExpenses  = sExpenses.reduce((t,e) => t + e.amount, 0);
  const netProfit      = totalRevenue - totalExpenses;
  const margin         = totalRevenue > 0 ? (netProfit/totalRevenue)*100 : 0;

  const revBreakdown = useMemo(() => {
    const map: Record<string,number> = {};
    sHarvests.forEach(h => { const k=CHANNEL_LABELS[h.channel]; map[k]=(map[k]||0)+h.kg*h.pricePerKg; });
    if (subsidyRevenue>0) map['Tilskudd / EU']=subsidyRevenue;
    return Object.entries(map).map(([name,value]) => ({name, value: Math.round(value)}));
  }, [sHarvests, subsidyRevenue]);

  const expBreakdown = useMemo(() => {
    const map: Record<string,number> = {};
    sExpenses.forEach(e => { const k=EXPENSE_LABELS[e.category]; map[k]=(map[k]||0)+e.amount; });
    return Object.entries(map).map(([name,value]) => ({name, value: Math.round(value)})).sort((a,b) => b.value-a.value);
  }, [sExpenses]);

  const perParcel = useMemo(() => parcels.map(p => {
    const rev  = sHarvests.filter(h=>h.parcelId===p.id).reduce((t,h) => t+h.kg*h.pricePerKg, 0);
    const cost = sExpenses.filter(e=>e.parcelId===p.id).reduce((t,e) => t+e.amount, 0);
    const kg   = sHarvests.filter(h=>h.parcelId===p.id).reduce((t,h) => t+h.kg, 0);
    const ha   = (p.area||0)/10000;
    return {id:p.id, name:p.name, rev, cost, profit:rev-cost, kg, ha};
  }).filter(p => p.rev>0||p.cost>0||p.kg>0), [parcels, sHarvests, sExpenses]);

  const tt = { contentStyle:{background:'#1e293b',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'0.75rem',fontSize:'12px'}, labelStyle:{fontWeight:'bold',color:'#fff'} };
  const fmt = (n:number) => `€${Math.round(n).toLocaleString('no')}`;
  const ic = 'w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Euro className="text-green-400" /> Økonomi</h2>
          <p className="text-slate-400 text-sm mt-1">Komplett oversikt over inntekter, utgifter og lønnsomhet</p>
        </div>
        <div className="relative">
          <select value={season} onChange={e=>setSeason(e.target.value)} className="appearance-none bg-white/5 border border-white/10 rounded-2xl pl-4 pr-10 py-3 text-white font-bold text-sm focus:outline-none cursor-pointer">
            {seasons.map(s => <option key={s} value={s} className="bg-slate-800">{s}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" size={16} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {label:'Bruttoinntekt',    value:fmt(totalRevenue),   sub:`Høst €${Math.round(harvestRevenue).toLocaleString('no')} + tilskudd €${Math.round(subsidyRevenue).toLocaleString('no')}`, color:'text-green-400', border:'border-green-500/20 bg-green-500/5'},
          {label:'Totale utgifter',  value:fmt(totalExpenses),  sub:`${sExpenses.length} poster`, color:'text-red-400', border:'border-red-500/20 bg-red-500/5'},
          {label:'Nettofortjeneste', value:fmt(netProfit),      sub:netProfit>=0?'Positiv sesong':'Underskudd', color:netProfit>=0?'text-green-400':'text-red-400', border:netProfit>=0?'border-green-500/20 bg-green-500/5':'border-red-500/20 bg-red-500/5'},
          {label:'Margin',           value:`${margin.toFixed(1)}%`, sub:margin>=30?'God lønnsomhet':margin>=10?'Godkjent':totalRevenue===0?'Ingen data':'Lav margin', color:margin>=30?'text-green-400':margin>=10?'text-yellow-400':'text-slate-400', border:'border-white/10'},
        ].map(c => (
          <div key={c.label} className={`glass rounded-2xl p-5 border ${c.border}`}>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">{c.label}</p>
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-slate-500 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-2xl">
        {([{k:'oversikt',label:'Oversikt'},{k:'utgifter',label:`Utgifter (${sExpenses.length})`},{k:'inntekter',label:'Inntekter'},{k:'per_parsell',label:'Per parsell'}] as const).map(tab => (
          <button key={tab.k} onClick={()=>setActiveTab(tab.k)} className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${activeTab===tab.k?'bg-green-500 text-black shadow':'text-slate-400 hover:text-white'}`}>{tab.label}</button>
        ))}
      </div>

      {activeTab==='oversikt' && (
        <div className="space-y-6">
          {totalRevenue===0 && totalExpenses===0 ? (
            <div className="glass rounded-2xl p-16 border border-white/10 text-center text-slate-500">
              <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold">Ingen data for {season}</p>
              <p className="text-sm mt-1">Gå til Produksjon → Høsting for å registrere høst, og Utgifter-fanen for kostnader</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {revBreakdown.length>0 && (
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Inntektsfordeling</h4>
                  <div className="h-52"><ResponsiveContainer width="100%" height="100%"><RPieChart><Pie data={revBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>{revBreakdown.map((_,i)=><Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}</Pie><Tooltip {...tt} formatter={(v:number)=>[`€${v.toLocaleString('no')}`,'']} /></RPieChart></ResponsiveContainer></div>
                </div>
              )}
              {expBreakdown.length>0 && (
                <div className="glass rounded-2xl p-6 border border-white/10">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Kostnadsfordeling</h4>
                  <div className="h-52"><ResponsiveContainer width="100%" height="100%"><RPieChart><Pie data={expBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>{expBreakdown.map((_,i)=><Cell key={i} fill={CHART_COLORS[(i+4)%CHART_COLORS.length]}/>)}</Pie><Tooltip {...tt} formatter={(v:number)=>[`€${v.toLocaleString('no')}`,'']} /></RPieChart></ResponsiveContainer></div>
                </div>
              )}
              <div className="glass rounded-2xl p-6 border border-white/10 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Resultatsammendrag {season}</h4>
                <div className="h-52"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{label:season,Inntekter:Math.round(totalRevenue),Utgifter:Math.round(totalExpenses),Resultat:Math.round(netProfit)}]}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} axisLine={false}/><YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={v=>`€${(v/1000).toFixed(0)}k`}/><Tooltip {...tt} formatter={(v:number)=>[`€${v.toLocaleString('no')}`,'']} /><Legend wrapperStyle={{fontSize:'10px',fontWeight:'bold',textTransform:'uppercase',letterSpacing:'0.1em'}}/><Bar dataKey="Inntekter" fill="#22c55e" radius={[4,4,0,0]}/><Bar dataKey="Utgifter" fill="#ef4444" radius={[4,4,0,0]}/><Bar dataKey="Resultat" fill="#3b82f6" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab==='utgifter' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 flex-wrap">
              {(['all',...Object.keys(EXPENSE_LABELS)] as (ExpenseCategory|'all')[]).map(cat=>(
                <button key={cat} onClick={()=>setExpCatFilter(cat)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${expCatFilter===cat?'bg-green-500/20 text-green-300 border border-green-500/30':'bg-white/5 text-slate-400 border border-white/10 hover:text-white'}`}>
                  {cat==='all'?'Alle':EXPENSE_LABELS[cat as ExpenseCategory]}
                </button>
              ))}
            </div>
            <button onClick={()=>setShowExpenseForm(true)} className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition-all flex-shrink-0"><Plus size={16}/> Legg til utgift</button>
          </div>

          {showExpenseForm && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="glass bg-[#0a0a0b] rounded-2xl border border-white/20 p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between"><h4 className="font-bold text-white flex items-center gap-2"><Plus size={16} className="text-red-400"/> Ny utgift</h4><button onClick={()=>setShowExpenseForm(false)} className="text-slate-500 hover:text-white"><X size={20}/></button></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Dato</label><input type="date" value={newExp.date} onChange={e=>setNewExp(p=>({...p,date:e.target.value}))} className={ic}/></div>
                  <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Sesong</label><select value={newExp.season} onChange={e=>setNewExp(p=>({...p,season:e.target.value}))} className={ic}>{seasons.map(s=><option key={s} value={s} className="bg-slate-800">{s}</option>)}</select></div>
                </div>
                <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Kategori</label><select value={newExp.category} onChange={e=>setNewExp(p=>({...p,category:e.target.value as ExpenseCategory}))} className={ic}>{Object.entries(EXPENSE_LABELS).map(([k,v])=><option key={k} value={k} className="bg-slate-800">{v}</option>)}</select></div>
                <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Omfang</label>
                  <div className="flex gap-2">{(['parcel','farm'] as const).map(s=><button key={s} type="button" onClick={()=>setNewExp(p=>({...p,scope:s,parcelId:s==='farm'?undefined:p.parcelId}))} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all border ${newExp.scope===s?'bg-green-500/20 text-green-300 border-green-500/40':'bg-white/5 text-slate-400 border-white/10'}`}>{s==='parcel'?'Spesifikk parsell':'Hele gården'}</button>)}</div>
                </div>
                {newExp.scope==='parcel' && <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Parsell</label><select value={newExp.parcelId||''} onChange={e=>setNewExp(p=>({...p,parcelId:e.target.value}))} className={ic}><option value="">Velg parsell...</option>{parcels.map(p=><option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>)}</select></div>}
                <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Beskrivelse</label><input type="text" value={newExp.description} onChange={e=>setNewExp(p=>({...p,description:e.target.value}))} className={ic} placeholder="Beskriv utgiften..."/></div>
                <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Beløp (€)</label><input type="number" min="0" step="10" value={newExp.amount||''} onChange={e=>setNewExp(p=>({...p,amount:+e.target.value}))} className={`${ic} text-xl font-black`} placeholder="0"/></div>
                <button onClick={addExpense} disabled={!newExp.amount||!newExp.description} className="w-full bg-red-500 hover:bg-red-400 disabled:opacity-40 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"><Save size={16}/> Lagre utgift</button>
              </div>
            </div>
          )}

          {sExpenses.length===0 ? (
            <div className="glass rounded-2xl p-12 border border-white/10 text-center text-slate-500"><Wrench size={36} className="mx-auto mb-3 opacity-30"/><p>Ingen utgifter for {season}</p><button onClick={()=>setShowExpenseForm(true)} className="mt-4 text-sm text-green-400 font-bold hover:text-green-300">+ Legg til første utgift</button></div>
          ) : (
            <>
              <div className="glass rounded-2xl p-5 border border-white/10">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Per kategori</h4>
                <div className="space-y-2">
                  {expBreakdown.map((e,i)=>(
                    <div key={e.name} className="flex items-center gap-3"><div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:CHART_COLORS[(i+4)%CHART_COLORS.length]}}/><span className="text-sm text-slate-300 flex-1">{e.name}</span><span className="text-sm font-bold text-white">€{e.value.toLocaleString('no')}</span><span className="text-[10px] text-slate-500 w-8 text-right">{totalExpenses>0?((e.value/totalExpenses)*100).toFixed(0):0}%</span></div>
                  ))}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between"><span className="text-sm font-bold text-slate-400">TOTALT</span><span className="text-sm font-black text-red-400">€{Math.round(totalExpenses).toLocaleString('no')}</span></div>
                </div>
              </div>
              <div className="space-y-2">
                {(expCatFilter==='all'?sExpenses:sExpenses.filter(e=>e.category===expCatFilter)).map(e=>(
                  <div key={e.id} className="glass rounded-xl p-4 border border-white/10 flex items-center gap-4">
                    <div className="p-2 bg-red-500/10 rounded-lg text-red-400 flex-shrink-0">{EXPENSE_ICONS[e.category]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs text-slate-500 font-bold">{EXPENSE_LABELS[e.category]}</span>
                        {e.scope==='parcel'&&e.parcelId&&<span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-slate-500">{parcels.find(p=>p.id===e.parcelId)?.name||e.parcelId}</span>}
                        {e.scope==='farm'&&<span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">Hele gården</span>}
                      </div>
                      <p className="text-sm text-white font-medium">{e.description}</p>
                      <p className="text-[10px] text-slate-500">{e.date}</p>
                    </div>
                    <p className="text-base font-black text-red-400 flex-shrink-0">€{e.amount.toLocaleString('no')}</p>
                    <button onClick={()=>removeExpense(e.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg flex-shrink-0 transition-colors"><Trash2 size={14}/></button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab==='inntekter' && (
        <div className="space-y-6">
          <div className="glass rounded-2xl p-6 border border-green-500/20 space-y-4">
            <div className="flex items-center justify-between"><h4 className="font-bold text-white flex items-center gap-2"><Wheat size={16} className="text-green-400"/> Høsteinntekter {season}</h4><span className="text-base font-black text-green-400">{fmt(harvestRevenue)}</span></div>
            {sHarvests.length===0?<p className="text-sm text-slate-500">Ingen høsteregistreringer. Gå til Produksjon → Høsting for å registrere.</p>:(
              <div className="space-y-2">{sHarvests.map(h=>(
                <div key={h.id} className="flex items-center gap-3 p-3 bg-white/3 rounded-xl border border-white/5">
                  <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white">{parcels.find(p=>p.id===h.parcelId)?.name||h.parcelId} · {h.variety}</p><p className="text-[10px] text-slate-500">{h.date} · {h.kg.toLocaleString('no')} kg × €{h.pricePerKg}/kg</p></div>
                  <span className="text-xs font-black text-green-400">€{(h.kg*h.pricePerKg).toLocaleString('no',{maximumFractionDigits:0})}</span>
                </div>
              ))}</div>
            )}
          </div>

          <div className="glass rounded-2xl p-6 border border-blue-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white flex items-center gap-2"><ShieldCheck size={16} className="text-blue-400"/> Tilskudd & EU-støtte {season}</h4>
              <div className="flex items-center gap-3"><span className="text-base font-black text-blue-400">{fmt(subsidyRevenue)}</span><button onClick={()=>setShowSubsidyForm(!showSubsidyForm)} className="flex items-center gap-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-bold px-3 py-2 rounded-xl text-xs transition-all"><Plus size={14}/> Legg til</button></div>
            </div>
            {showSubsidyForm && (
              <div className="bg-black/40 border border-blue-500/20 rounded-2xl p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Dato</label><input type="date" value={newSub.date} onChange={e=>setNewSub(p=>({...p,date:e.target.value}))} className={ic}/></div>
                  <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Sesong</label><select value={newSub.season} onChange={e=>setNewSub(p=>({...p,season:e.target.value}))} className={ic}>{seasons.map(s=><option key={s} value={s} className="bg-slate-800">{s}</option>)}</select></div>
                </div>
                <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Type tilskudd</label><select value={newSub.type} onChange={e=>setNewSub(p=>({...p,type:e.target.value as SubsidyType}))} className={ic}>{Object.entries(SUBSIDY_LABELS).map(([k,v])=><option key={k} value={k} className="bg-slate-800">{v}</option>)}</select></div>
                <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Beskrivelse (valgfritt)</label><input type="text" value={newSub.description} onChange={e=>setNewSub(p=>({...p,description:e.target.value}))} className={ic} placeholder="Tilleggsinfo..."/></div>
                <div><label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">Beløp (€)</label><input type="number" min="0" step="100" value={newSub.amount||''} onChange={e=>setNewSub(p=>({...p,amount:+e.target.value}))} className={`${ic} text-xl font-black`} placeholder="0"/></div>
                <div className="flex gap-3"><button onClick={addSubsidy} disabled={!newSub.amount} className="flex-1 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={14}/> Lagre tilskudd</button><button onClick={()=>setShowSubsidyForm(false)} className="px-4 py-3 bg-white/5 rounded-xl text-slate-400 hover:text-white text-sm font-bold">Avbryt</button></div>
              </div>
            )}
            {sSubsidies.length===0&&!showSubsidyForm?<p className="text-sm text-slate-500">Ingen tilskudd registrert. EU-støtte for økologisk landbruk (PAC/PAO) legges inn her.</p>:sSubsidies.map(s=>(
              <div key={s.id} className="flex items-center gap-3 p-3 bg-blue-500/5 rounded-xl border border-blue-500/10"><ShieldCheck size={14} className="text-blue-400 flex-shrink-0"/><div className="flex-1 min-w-0"><p className="text-xs font-bold text-white">{SUBSIDY_LABELS[s.type]}</p><p className="text-[10px] text-slate-500">{s.date}{s.description?` · ${s.description}`:''}</p></div><span className="text-sm font-black text-blue-400">€{s.amount.toLocaleString('no')}</span><button onClick={()=>removeSubsidy(s.id)} className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={12}/></button></div>
            ))}
          </div>
          <div className="glass rounded-2xl p-5 border border-white/10 flex items-center justify-between font-bold"><span className="text-slate-300">Totale inntekter {season}</span><span className="text-xl font-black text-green-400">{fmt(totalRevenue)}</span></div>
        </div>
      )}

      {activeTab==='per_parsell' && (
        <div className="space-y-4">
          {perParcel.length===0 ? (
            <div className="glass rounded-2xl p-12 border border-white/10 text-center text-slate-500"><BookOpen size={36} className="mx-auto mb-3 opacity-30"/><p>Ingen data per parsell for {season}</p><p className="text-sm mt-1">Registrer høsting og parsell-spesifikke utgifter for å se analyse her</p></div>
          ) : (
            <>
              <div className="glass rounded-2xl p-6 border border-white/10">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Inntekt vs direkte utgifter per parsell</h4>
                <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={perParcel.map(p=>({name:p.name,Inntekt:Math.round(p.rev),Utgifter:Math.round(p.cost),Resultat:Math.round(p.profit)}))}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false}/><YAxis stroke="#475569" fontSize={9} tickLine={false} axisLine={false} tickFormatter={v=>`€${(v/1000).toFixed(0)}k`}/><Tooltip {...tt} formatter={(v:number)=>[`€${v.toLocaleString('no')}`,'']} /><Legend wrapperStyle={{fontSize:'10px',fontWeight:'bold',textTransform:'uppercase',letterSpacing:'0.1em'}}/><Bar dataKey="Inntekt" fill="#22c55e" radius={[3,3,0,0]}/><Bar dataKey="Utgifter" fill="#ef4444" radius={[3,3,0,0]}/><Bar dataKey="Resultat" fill="#3b82f6" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div>
              </div>
              <div className="glass rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="border-b border-white/10"><tr className="text-[10px] text-slate-500 uppercase font-bold tracking-widest"><th className="text-left px-5 py-4">Parsell</th><th className="text-right px-4 py-4">Høstet (kg)</th><th className="text-right px-4 py-4">Inntekt</th><th className="text-right px-4 py-4">Direkte utg.</th><th className="text-right px-4 py-4">Resultat</th><th className="text-right px-5 py-4">€/daa</th></tr></thead>
                    <tbody className="divide-y divide-white/5">
                      {perParcel.map(p=>(
                        <tr key={p.id} className="hover:bg-white/3 transition-colors">
                          <td className="px-5 py-4 font-bold text-white">{p.name}</td>
                          <td className="px-4 py-4 text-right text-slate-300 font-mono">{p.kg.toLocaleString('no')}</td>
                          <td className="px-4 py-4 text-right text-green-400 font-bold">{fmt(p.rev)}</td>
                          <td className="px-4 py-4 text-right text-red-400 font-bold">{fmt(p.cost)}</td>
                          <td className={`px-4 py-4 text-right font-black ${p.profit>=0?'text-green-400':'text-red-400'}`}>{p.profit>=0?'+':''}{fmt(p.profit)}</td>
                          <td className="px-5 py-4 text-right text-slate-400 font-mono text-xs">{p.ha>0?`€${Math.round(p.profit/(p.ha*10)).toLocaleString('no')}`:'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-white/10 bg-white/3">
                      <tr className="font-black text-sm">
                        <td className="px-5 py-4 text-slate-400 uppercase tracking-wide text-xs">Totalt</td>
                        <td className="px-4 py-4 text-right text-white font-mono">{perParcel.reduce((t,p)=>t+p.kg,0).toLocaleString('no')}</td>
                        <td className="px-4 py-4 text-right text-green-400">{fmt(perParcel.reduce((t,p)=>t+p.rev,0))}</td>
                        <td className="px-4 py-4 text-right text-red-400">{fmt(perParcel.reduce((t,p)=>t+p.cost,0))}</td>
                        <td className={`px-4 py-4 text-right font-black ${netProfit>=0?'text-green-400':'text-red-400'}`}>{netProfit>=0?'+':''}{fmt(netProfit)}</td>
                        <td className="px-5 py-4"/>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-[10px] text-slate-600 text-center px-4 pb-3">Direkteutgifter = kun parsell-spesifikke poster. Felles gårdsutgifter vises i Utgifter-fanen.</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfitabilityDashboard;
