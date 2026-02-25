
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  DollarSign, ArrowUpRight, ArrowDownRight, Camera, Receipt, TrendingUp,
  Plus, X, Upload, Loader2, Sparkles, CheckCircle2, MapPin, Search,
  Filter, Trash2, Calendar, FileText, PieChart as PieChartIcon,
  BarChart3, Target, Brain, ChevronRight, AlertCircle, Zap, Award
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { geminiService } from '../services/geminiService';
import { Transaction, Parcel, Batch } from '../types';

const COST_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4'];

const EconomyView: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [selectedParcelFilter, setSelectedParcelFilter] = useState<string>('all');
  const [activeEconTab, setActiveEconTab] = useState<'transactions' | 'profitability'>('transactions');
  const [isAnalyzingProfit, setIsAnalyzingProfit] = useState(false);
  const [profitAnalysis, setProfitAnalysis] = useState<any>(null);

  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: 'Gjødsel',
    amount: 0,
    note: '',
    parcelId: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    const savedEconomy = localStorage.getItem('olivia_economy');
    const savedParcels = localStorage.getItem('olivia_parcels');
    const savedBatches = localStorage.getItem('olivia_batches');

    if (savedParcels) setParcels(JSON.parse(savedParcels));
    if (savedBatches) setBatches(JSON.parse(savedBatches));
    if (savedEconomy) {
      setTransactions(JSON.parse(savedEconomy));
    } else {
      const initial: Transaction[] = [
        { id: '1', type: 'expense', category: 'Vedlikehold', amount: -1250, date: '2024-10-15', note: 'Service på John Deere traktor', parcelId: 'p1' },
        { id: '2', type: 'income', category: 'Salg', amount: 4500, date: '2024-10-20', note: 'Første leveranse av Picual olje', parcelId: 'p1' },
      ];
      setTransactions(initial);
      localStorage.setItem('olivia_economy', JSON.stringify(initial));
    }
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const saveTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem('olivia_economy', JSON.stringify(newTransactions));
    window.dispatchEvent(new Event('storage'));
  };

  const handleAddTx = () => {
    if (!newTx.amount || newTx.amount === 0) {
      alert("Vennligst oppgi et beløp.");
      return;
    }
    const tx: Transaction = {
      id: 'T' + Date.now(),
      type: newTx.type as 'income' | 'expense',
      category: newTx.category || 'Annet',
      amount: newTx.type === 'expense' ? -Math.abs(Number(newTx.amount)) : Math.abs(Number(newTx.amount)),
      date: newTx.date || new Date().toISOString().split('T')[0],
      note: newTx.note || '',
      parcelId: newTx.parcelId === '' ? undefined : newTx.parcelId
    };
    saveTransactions([tx, ...transactions]);
    setIsModalOpen(false);
    setNewTx({ type: 'expense', date: new Date().toISOString().split('T')[0], category: 'Gjødsel', amount: 0, note: '', parcelId: '' });
  };

  const handleDeleteTx = (id: string) => {
    if (confirm("Slette denne transaksjonen?")) {
      const updated = transactions.filter(t => t.id !== id);
      saveTransactions(updated);
    }
  };

  const runProfitAnalysis = async () => {
    setIsAnalyzingProfit(true);
    try {
      const analysis = await geminiService.getProfitabilityAnalysis(batches, transactions, parcels, 'no');
      setProfitAnalysis(analysis);
    } catch (err) {
      // Fallback: calculate locally
      const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const costs = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
      const totalKg = batches.reduce((s, b) => s + (b.weight || 0), 0);
      setProfitAnalysis({
        totalRevenue: income,
        totalCosts: costs,
        netProfit: income - costs,
        profitMargin: income > 0 ? ((income - costs) / income) * 100 : 0,
        revenuePerKg: totalKg > 0 ? income / totalKg : 0,
        costPerKg: totalKg > 0 ? costs / totalKg : 0,
        breakEvenKg: costs > 0 && income > 0 ? (costs / (income / totalKg)) : 0,
        insights: ['Legg til mer transaksjonsdata for dypere analyse', 'Koble til AI for avanserte innsikter'],
        parcelROI: parcels.map(p => {
          const pIncome = transactions.filter(t => t.parcelId === p.id && t.type === 'income').reduce((s, t) => s + t.amount, 0);
          const pCosts = transactions.filter(t => t.parcelId === p.id && t.type === 'expense').reduce((s, t) => s + Math.abs(t.amount), 0);
          return { parcelId: p.id, roi: pCosts > 0 ? ((pIncome - pCosts) / pCosts) * 100 : 0, revenue: pIncome, costs: pCosts };
        })
      });
    } finally {
      setIsAnalyzingProfit(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsScanning(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        try {
          const analysis = await geminiService.analyzeReceipt(base64);
          const autoTx: Transaction = {
            id: 'T' + Date.now(),
            type: 'expense',
            category: analysis.category || 'Ukjent',
            amount: -Math.abs(analysis.amount),
            date: analysis.date || new Date().toISOString().split('T')[0],
            note: `${analysis.note} (AI Skann)`,
            parcelId: selectedParcelFilter !== 'all' ? selectedParcelFilter : undefined
          };
          saveTransactions([autoTx, ...transactions]);
          setScanSuccess(true);
          setTimeout(() => setScanSuccess(false), 3000);
        } catch (error) {
          console.error("Scanning error:", error);
          alert("Feil ved skanning. Prøv et tydeligere bilde.");
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredTransactions = useMemo(() => {
    return selectedParcelFilter === 'all' 
      ? transactions 
      : transactions.filter(t => t.parcelId === selectedParcelFilter);
  }, [transactions, selectedParcelFilter]);

  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      income,
      expense,
      net: income - expense
    };
  }, [filteredTransactions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="text-green-400" /> Økonomisk Styring
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Gårdsregnskap & Lønnsomhet</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-3 text-white text-xs font-bold uppercase tracking-widest focus:outline-none focus:border-green-500/50 appearance-none transition-all"
              value={selectedParcelFilter}
              onChange={e => setSelectedParcelFilter(e.target.value)}
            >
              <option value="all">Hele gården (Total)</option>
              {parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2 active:scale-95 shrink-0"
          >
            <Plus size={20} /> Ny transaksjon
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-white/10 pb-4">
        <button onClick={() => setActiveEconTab('transactions')} className={`text-sm font-bold uppercase tracking-widest pb-1.5 border-b-2 transition-all ${activeEconTab === 'transactions' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}>
          Transaksjoner
        </button>
        <button onClick={() => setActiveEconTab('profitability')} className={`text-sm font-bold uppercase tracking-widest pb-1.5 border-b-2 transition-all flex items-center gap-2 ${activeEconTab === 'profitability' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}>
          <Target size={14} /> Lønnsomhetsanalyse
        </button>
      </div>

      {/* Finansielle Kort */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-[2rem] p-8 border border-white/10 relative overflow-hidden bg-gradient-to-br from-green-500/5 to-transparent">
          <div className="relative z-10">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Netto Resultat</p>
            <h3 className={`text-4xl font-bold mt-2 tracking-tighter transition-all duration-700 ${stats.net >= 0 ? 'text-white' : 'text-red-400'}`}>
              €{stats.net.toLocaleString()}
            </h3>
            <div className="flex items-center gap-1 mt-4 text-[10px] font-bold text-green-400 bg-green-500/10 w-fit px-2 py-1 rounded-lg">
              <TrendingUp size={12} /> {selectedParcelFilter === 'all' ? 'Total Gårdsdrift' : 'Spesifikk Parsell'}
            </div>
          </div>
          <PieChartIcon className="absolute -right-8 -bottom-8 opacity-5 text-white" size={160} />
        </div>

        <div className="glass rounded-[2rem] p-8 border border-white/10 bg-white/5">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <ArrowUpRight size={14} className="text-green-400" /> Totale Inntekter
          </p>
          <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">€{stats.income.toLocaleString()}</h3>
          <div className="mt-4 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${stats.income > 0 ? (stats.income / (stats.income + stats.expense || 1)) * 100 : 0}%` }}></div>
          </div>
        </div>

        <div className="glass rounded-[2rem] p-8 border border-white/10 bg-white/5">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <ArrowDownRight size={14} className="text-red-400" /> Totale Utgifter
          </p>
          <h3 className="text-3xl font-bold text-white mt-2 tracking-tight">€{stats.expense.toLocaleString()}</h3>
          <div className="mt-4 w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
            <div className="bg-red-500 h-full" style={{ width: `${stats.expense > 0 ? (stats.expense / (stats.income + stats.expense || 1)) * 100 : 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* Profitability Analysis Tab */}
      {activeEconTab === 'profitability' && (
        <div className="space-y-8">
          {!profitAnalysis ? (
            <div className="glass rounded-[2.5rem] p-12 border border-white/10 text-center space-y-6">
              <div className="p-6 bg-green-500/10 rounded-full w-fit mx-auto">
                <Brain size={48} className="text-green-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">AI Lønnsomhetsanalyse</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Analyser gårdens økonomi med AI – få innsikt i ROI per parsell, kostnad per kg, break-even og konkrete forbedringstips.
                </p>
              </div>
              <button
                onClick={runProfitAnalysis}
                disabled={isAnalyzingProfit}
                className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black px-10 py-5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-3 mx-auto"
              >
                {isAnalyzingProfit ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                {isAnalyzingProfit ? 'Analyserer...' : 'Start lønnsomhetsanalyse'}
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Netto fortjeneste', value: `€${(profitAnalysis.netProfit || 0).toLocaleString()}`, color: profitAnalysis.netProfit >= 0 ? 'text-green-400' : 'text-red-400', icon: <TrendingUp size={20} /> },
                  { label: 'Margin', value: `${(profitAnalysis.profitMargin || 0).toFixed(1)}%`, color: 'text-blue-400', icon: <BarChart3 size={20} /> },
                  { label: 'Inntekt/kg', value: `€${(profitAnalysis.revenuePerKg || 0).toFixed(2)}`, color: 'text-yellow-400', icon: <Award size={20} /> },
                  { label: 'Kostnad/kg', value: `€${(profitAnalysis.costPerKg || 0).toFixed(2)}`, color: 'text-orange-400', icon: <Target size={20} /> }
                ].map(m => (
                  <div key={m.label} className="glass rounded-[2rem] p-6 border border-white/10">
                    <div className={`${m.color} mb-2`}>{m.icon}</div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{m.label}</p>
                    <p className={`text-2xl font-bold ${m.color} mt-1`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Break-even */}
              <div className="glass rounded-[2rem] p-6 border border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-center gap-3 mb-3">
                  <Target size={20} className="text-yellow-400" />
                  <h4 className="font-bold text-white">Break-even Analyse</h4>
                </div>
                <p className="text-slate-300 text-sm">
                  Du trenger å selge <span className="text-yellow-400 font-bold">{(profitAnalysis.breakEvenKg || 0).toFixed(0)} kg</span> oliven for å dekke alle kostnader.
                  Nåværende produksjon: <span className="text-white font-bold">{batches.reduce((s, b) => s + b.weight, 0)} kg</span>
                </p>
              </div>

              {/* ROI per Parcel */}
              {profitAnalysis.parcelROI && profitAnalysis.parcelROI.length > 0 && (
                <div className="glass rounded-[2.5rem] p-8 border border-white/10">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">ROI per Parsell</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profitAnalysis.parcelROI.map((r: any) => ({
                        name: parcels.find(p => p.id === r.parcelId)?.name || 'Ukjent',
                        roi: Math.round(r.roi),
                        inntekt: r.revenue,
                        kostnader: r.costs
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px', fontSize: '11px' }} formatter={(v: any) => [`${v}%`, 'ROI']} />
                        <Bar dataKey="roi" fill="#22c55e" radius={[6, 6, 0, 0]} name="ROI %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {profitAnalysis.insights && profitAnalysis.insights.length > 0 && (
                <div className="glass rounded-[2.5rem] p-8 border border-purple-500/20 bg-purple-500/5">
                  <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Sparkles size={16} /> AI Forbedringstips
                  </h3>
                  <div className="space-y-3">
                    {profitAnalysis.insights.map((insight: string, i: number) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                        <p className="text-sm text-slate-300">{insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setProfitAnalysis(null)} className="text-slate-500 hover:text-white text-sm font-bold flex items-center gap-2">
                <Zap size={14} /> Kjør ny analyse
              </button>
            </div>
          )}
        </div>
      )}

      {activeEconTab === 'transactions' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass rounded-[2.5rem] border border-white/10 overflow-hidden">
          <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} className="text-slate-500" /> Transaksjonshistorikk
            </h3>
            <div className="flex items-center gap-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleReceiptUpload} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  scanSuccess ? 'bg-green-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                }`}
              >
                {isScanning ? <Loader2 size={14} className="animate-spin" /> : scanSuccess ? <CheckCircle2 size={14} /> : <Camera size={14} />}
                {isScanning ? 'Analyserer...' : scanSuccess ? 'Skann Fullført' : 'Skann Kvittering (AI)'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-slate-500 uppercase font-bold tracking-widest border-b border-white/5">
                  <th className="px-8 py-4">Dato</th>
                  <th className="px-8 py-4">Kategori / Notat</th>
                  <th className="px-8 py-4">Parsell</th>
                  <th className="px-8 py-4 text-right">Beløp</th>
                  <th className="px-8 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTransactions.length > 0 ? filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-5 text-xs text-slate-400 font-mono">{t.date}</td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-white">{t.category}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">"{t.note}"</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <MapPin size={10} className="text-green-500" />
                        {parcels.find(p => p.id === t.parcelId)?.name || 'Hele gården'}
                      </div>
                    </td>
                    <td className={`px-8 py-5 text-right font-bold ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}€{Math.abs(t.amount).toLocaleString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button onClick={() => handleDeleteTx(t.id)} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center opacity-20 italic">Ingen transaksjoner registrert ennå.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-[2.5rem] p-8 border border-white/10 bg-white/5">
             <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6">Kostnadsfordeling</h3>
             {/* Pie Chart */}
             {(() => {
               const cats = ['Gjødsel', 'Arbeidskraft', 'Vedlikehold', 'Vann', 'Sprøytemiddel', 'Annet'];
               const data = cats.map((cat, i) => ({
                 name: cat,
                 value: filteredTransactions.filter(t => t.category === cat && t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0),
                 color: COST_COLORS[i]
               })).filter(d => d.value > 0);
               return data.length > 0 ? (
                 <div className="h-36 mb-4">
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                         {data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                       </Pie>
                       <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333', borderRadius: '12px', fontSize: '11px' }} formatter={(v: any) => [`€${v.toLocaleString()}`, '']} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
               ) : null;
             })()}
             <div className="space-y-3">
                {['Gjødsel', 'Arbeidskraft', 'Vedlikehold', 'Vann', 'Sprøytemiddel', 'Annet'].map((cat, i) => {
                  const catTotal = filteredTransactions.filter(t => t.category === cat && t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
                  const percentage = stats.expense > 0 ? (catTotal / stats.expense) * 100 : 0;
                  if (catTotal === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: COST_COLORS[i] }} />
                          {cat}
                        </span>
                        <span>€{catTotal.toLocaleString()} ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-white/5 h-1 rounded-full">
                        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: COST_COLORS[i] }}></div>
                      </div>
                    </div>
                  );
                })}
             </div>
          </div>

          {/* Quick Profitability Button */}
          <button
            onClick={() => setActiveEconTab('profitability')}
            className="w-full glass rounded-2xl p-5 border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Target size={20} className="text-green-400" />
              <div className="text-left">
                <p className="text-sm font-bold text-white">Lønnsomhetsanalyse</p>
                <p className="text-[10px] text-slate-500">ROI, break-even, AI-tips</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-green-400 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
      )}


      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-[2.5rem] p-10 border border-white/20 shadow-2xl space-y-6">
             <div className="flex justify-between items-center">
               <h3 className="text-2xl font-bold text-white">Ny Transaksjon</h3>
               <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500"><X size={24} /></button>
             </div>
             
             <div className="space-y-4">
                <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
                  <button onClick={() => setNewTx({...newTx, type: 'expense'})} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${newTx.type === 'expense' ? 'bg-red-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Utgift</button>
                  <button onClick={() => setNewTx({...newTx, type: 'income'})} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${newTx.type === 'income' ? 'bg-green-500 text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}>Inntekt</button>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 block">Beløp (€)</label>
                   <input 
                    type="number" 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white text-2xl font-bold focus:outline-none"
                    placeholder="0.00"
                    onChange={e => setNewTx({...newTx, amount: Number(e.target.value)})}
                   />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 block">Kategori</label>
                    <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})}>
                      <option>Gjødsel</option>
                      <option>Arbeidskraft</option>
                      <option>Vedlikehold</option>
                      <option>Vann</option>
                      <option>Salg</option>
                      <option>Annet</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 block">Dato</label>
                    <input type="date" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} />
                  </div>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 block">Parsell</label>
                   <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none" value={newTx.parcelId} onChange={e => setNewTx({...newTx, parcelId: e.target.value})}>
                     <option value="">Hele gården</option>
                     {parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>

                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 block">Notat</label>
                   <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl px-6 py-3 text-white focus:outline-none" placeholder="Kort beskrivelse..." value={newTx.note} onChange={e => setNewTx({...newTx, note: e.target.value})} />
                </div>
             </div>

             <button onClick={handleAddTx} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl">Lagre Transaksjon</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EconomyView;
