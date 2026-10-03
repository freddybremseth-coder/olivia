import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Euro, Loader2, RefreshCcw, TrendingUp, WalletCards } from 'lucide-react';
import ExpenseCapturePanel from './ExpenseCapturePanel';
import CommercialFinancePanel from './CommercialFinancePanel';
import ProductionCostAllocationPanel from './ProductionCostAllocationPanel';
import type { Language, Parcel } from '../types';
import {
  fetchOliviaExpenses,
  fetchOliviaHarvests,
  fetchOliviaIncome,
  fetchOliviaSubsidies,
  type FarmExpense,
  type FarmIncome,
  type HarvestRecord,
  type SubsidyIncome,
} from '../services/oliviaSchemaData';

type Props = { language: Language; parcels: Parcel[] };
type SeasonTotals = {
  season: string;
  harvestValue: number;
  actualIncome: number;
  expenses: number;
  subsidies: number;
  rows: number;
};

const eur = (value: number) => `€${Math.round(value).toLocaleString('no-NO')}`;
const currentSeason = () => new Date().getFullYear().toString();
const currentYear = () => new Date().getFullYear().toString();

function seasonRows(
  season: string,
  harvests: HarvestRecord[],
  expenses: FarmExpense[],
  subsidies: SubsidyIncome[],
  incomes: FarmIncome[],
): SeasonTotals {
  const hs = harvests.filter(h => h.season === season);
  const ex = expenses.filter(e => e.season === season);
  const su = subsidies.filter(s => s.season === season);
  const inc = incomes.filter(i => i.season === season && i.status !== 'cancelled');
  return {
    season,
    harvestValue: hs.reduce((acc, h) => acc + h.kg * h.pricePerKg, 0),
    actualIncome: inc.reduce((acc, i) => acc + i.amount, 0),
    expenses: ex.reduce((acc, e) => acc + e.amount, 0),
    subsidies: su.reduce((acc, s) => acc + s.amount, 0),
    rows: hs.length + ex.length + su.length + inc.length,
  };
}

const ProfitabilityOliviaSeasonView: React.FC<Props> = ({ parcels }) => {
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [expenses, setExpenses] = useState<FarmExpense[]>([]);
  const [subsidies, setSubsidies] = useState<SubsidyIncome[]>([]);
  const [incomes, setIncomes] = useState<FarmIncome[]>([]);
  const [season, setSeason] = useState(currentSeason());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [h, e, s, i] = await Promise.all([
        fetchOliviaHarvests(),
        fetchOliviaExpenses(),
        fetchOliviaSubsidies(),
        fetchOliviaIncome(),
      ]);
      setHarvests(h);
      setExpenses(e);
      setSubsidies(s);
      setIncomes(i);

      const dataSeasons = Array.from(new Set([
        ...h.map(x => x.season),
        ...e.map(x => x.season),
        ...s.map(x => x.season),
        ...i.map(x => x.season),
      ])).filter(Boolean).sort((a, b) => b.localeCompare(a));

      const latestWithRows = dataSeasons.find(se => seasonRows(se, h, e, s, i).rows > 0);
      if (latestWithRows && !hasAutoSelected) {
        setSeason(latestWithRows);
        setHasAutoSelected(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente økonomidata fra Olivia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const seasons = useMemo(() => {
    const all = new Set([
      currentSeason(),
      ...harvests.map(h => h.season),
      ...expenses.map(e => e.season),
      ...subsidies.map(s => s.season),
      ...incomes.map(i => i.season),
    ]);
    return Array.from(all).filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [harvests, expenses, subsidies, incomes]);

  const totalsBySeason = useMemo(
    () => seasons.map(se => seasonRows(se, harvests, expenses, subsidies, incomes)),
    [seasons, harvests, expenses, subsidies, incomes],
  );

  const totals = seasonRows(season, harvests, expenses, subsidies, incomes);
  const sHarvests = harvests.filter(h => h.season === season);
  const sExpenses = expenses.filter(e => e.season === season);
  const sSubsidies = subsidies.filter(s => s.season === season);
  const sIncome = incomes.filter(i => i.season === season && i.status !== 'cancelled');
  const harvestKg = sHarvests.reduce((acc, h) => acc + h.kg, 0);
  const actualRevenue = totals.actualIncome + totals.subsidies;
  const net = actualRevenue - totals.expenses;
  const margin = actualRevenue > 0 ? Math.round((net / actualRevenue) * 1000) / 10 : 0;

  const receivedThisYear = incomes
    .filter(i => i.status === 'received' && (i.paymentDate?.startsWith(currentYear()) || i.paymentPeriod?.startsWith(currentYear())))
    .reduce((acc, i) => acc + i.amount, 0);

  const perParcel = parcels.map(parcel => {
    const ph = sHarvests.filter(h => h.parcelId === parcel.id);
    const pe = sExpenses.filter(e => e.parcelId === parcel.id);
    const kg = ph.reduce((acc, h) => acc + h.kg, 0);
    const allocatedValue = ph.reduce((acc, h) => acc + h.kg * h.pricePerKg, 0);
    const cost = pe.reduce((acc, e) => acc + e.amount, 0);
    return { parcel, kg, allocatedValue, cost, net: allocatedValue - cost };
  }).filter(row => row.kg || row.allocatedValue || row.cost);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Euro className="text-green-400" /> Økonomi</h2>
          <p className="text-slate-400 text-sm mt-1">Faktiske inntekter, oppgjør, kostnader og produksjonsgrunnlag. Avlingsverdi og mottatt betaling holdes adskilt.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <ExpenseCapturePanel parcels={parcels} onSaved={load} />
          <button onClick={load} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-green-400">{loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <label className="flex flex-col gap-1 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
            Sesong
            <select value={season} onChange={e => setSeason(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-sm focus:outline-none cursor-pointer normal-case tracking-normal">
              {seasons.map(se => <option key={se} value={se} className="bg-slate-800">{se} · {seasonRows(se, harvests, expenses, subsidies, incomes).rows} rader</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex gap-2"><AlertTriangle size={18} /> {error}</div>}

      {receivedThisYear > 0 && (
        <div className="glass rounded-2xl border border-green-500/25 bg-green-500/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <WalletCards size={20} className="text-green-400" />
            <div>
              <p className="text-sm font-bold text-white">Mottatt betaling i {currentYear()}</p>
              <p className="text-xs text-slate-400">Kontantstrøm kan gjelde oppgjør fra en tidligere avlingssesong.</p>
            </div>
          </div>
          <strong className="text-xl text-green-400">{eur(receivedThisYear)}</strong>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          ['Høstet', `${Math.round(harvestKg).toLocaleString('no-NO')} kg`, `${sHarvests.length} høsterader`],
          ['Faktisk salgsinntekt', eur(totals.actualIncome), `${sIncome.length} oppgjør/salg`],
          ['Avlingsverdi', eur(totals.harvestValue), 'fordelt fra høsterader'],
          ['Støtte', eur(totals.subsidies), `${sSubsidies.length} støtteposter`],
          ['Utgifter', eur(totals.expenses), `${sExpenses.length} kostnader`],
          ['Sesongresultat', eur(net), `margin ${margin}%`],
        ].map(([label, value, sub]) => (
          <div key={label} className="glass rounded-2xl p-5 border border-white/10">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">{label}</p>
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <CommercialFinancePanel />

      <ProductionCostAllocationPanel />

      {sIncome.length > 0 && (
        <div className="glass rounded-3xl p-6 border border-green-500/20">
          <h3 className="text-sm font-bold text-white mb-4">Faktiske inntekter · {season}</h3>
          <div className="space-y-2">
            {sIncome.map(item => (
              <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <strong className="text-white">{item.description}</strong>
                  <p className="text-xs text-slate-500 mt-1">
                    {item.customer || 'Kunde/oppgjør'}
                    {item.paymentPeriod ? ` · betalt ${item.paymentPeriod === '2026-05' ? 'mai 2026' : item.paymentPeriod}` : ''}
                    {item.status === 'received' ? ' · mottatt' : ` · ${item.status}`}
                  </p>
                </div>
                <strong className="text-green-400 text-lg">{eur(item.amount)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {totals.rows === 0 && (
        <div className="glass rounded-3xl p-6 border border-yellow-500/30 bg-yellow-500/10 text-yellow-100">
          Denne sesongen har ingen registrerte produksjons- eller økonomiposter ennå. Velg en tidligere sesong for historikk.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-6 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={16} /> Datagrunnlag per sesong</h3>
          <div className="space-y-2">
            {totalsBySeason.map(row => (
              <button key={row.season} onClick={() => setSeason(row.season)} className={`w-full text-left p-4 rounded-2xl border ${row.season === season ? 'border-green-500/40 bg-green-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex justify-between"><strong className="text-white">{row.season}</strong><span className="text-slate-400">{row.rows} rader</span></div>
                <p className="text-xs text-slate-500 mt-1">Faktisk inntekt {eur(row.actualIncome + row.subsidies)} · Utgift {eur(row.expenses)} · Resultat {eur(row.actualIncome + row.subsidies - row.expenses)}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="glass rounded-3xl p-6 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4">Per parsell</h3>
          <div className="space-y-2">
            {perParcel.map(row => (
              <div key={row.parcel.id} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex justify-between gap-3"><strong className="text-white">{row.parcel.name}</strong><span className="text-green-400 font-bold">{eur(row.net)}</span></div>
                <p className="text-xs text-slate-500 mt-1">{Math.round(row.kg).toLocaleString('no-NO')} kg · oppgjørsverdi {eur(row.allocatedValue)} · direkte kost {eur(row.cost)}</p>
              </div>
            ))}
            {!perParcel.length && <p className="text-sm text-slate-500">Ingen parsellfordelte tall for valgt sesong.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitabilityOliviaSeasonView;
