import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Euro, Loader2, RefreshCcw, TrendingUp } from 'lucide-react';
import type { Language, Parcel } from '../types';
import {
  fetchOliviaExpenses,
  fetchOliviaHarvests,
  fetchOliviaSubsidies,
  type FarmExpense,
  type HarvestRecord,
  type SubsidyIncome,
} from '../services/oliviaSchemaData';

type Props = { language: Language; parcels: Parcel[] };
type SeasonTotals = { season: string; harvest: number; expenses: number; subsidies: number; rows: number };

const eur = (value: number) => `€${Math.round(value).toLocaleString('no-NO')}`;
const currentSeason = () => new Date().getFullYear().toString();

function seasonRows(season: string, harvests: HarvestRecord[], expenses: FarmExpense[], subsidies: SubsidyIncome[]): SeasonTotals {
  const hs = harvests.filter(h => h.season === season);
  const ex = expenses.filter(e => e.season === season);
  const su = subsidies.filter(s => s.season === season);
  return {
    season,
    harvest: hs.reduce((acc, h) => acc + h.kg * h.pricePerKg, 0),
    expenses: ex.reduce((acc, e) => acc + e.amount, 0),
    subsidies: su.reduce((acc, s) => acc + s.amount, 0),
    rows: hs.length + ex.length + su.length,
  };
}

const ProfitabilityOliviaSeasonView: React.FC<Props> = ({ parcels }) => {
  const [harvests, setHarvests] = useState<HarvestRecord[]>([]);
  const [expenses, setExpenses] = useState<FarmExpense[]>([]);
  const [subsidies, setSubsidies] = useState<SubsidyIncome[]>([]);
  const [season, setSeason] = useState(currentSeason());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [h, e, s] = await Promise.all([fetchOliviaHarvests(), fetchOliviaExpenses(), fetchOliviaSubsidies()]);
      setHarvests(h);
      setExpenses(e);
      setSubsidies(s);

      const dataSeasons = Array.from(new Set([...h.map(x => x.season), ...e.map(x => x.season), ...s.map(x => x.season)])).filter(Boolean).sort((a, b) => b.localeCompare(a));
      const latestWithRows = dataSeasons.find(se => seasonRows(se, h, e, s).rows > 0);
      if (latestWithRows && !hasAutoSelected) {
        setSeason(latestWithRows);
        setHasAutoSelected(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente økonomidata fra olivia schema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const seasons = useMemo(() => {
    const all = new Set([currentSeason(), ...harvests.map(h => h.season), ...expenses.map(e => e.season), ...subsidies.map(s => s.season)]);
    return Array.from(all).filter(Boolean).sort((a, b) => b.localeCompare(a));
  }, [harvests, expenses, subsidies]);

  const totalsBySeason = useMemo(() => seasons.map(se => seasonRows(se, harvests, expenses, subsidies)), [seasons, harvests, expenses, subsidies]);
  const totals = seasonRows(season, harvests, expenses, subsidies);
  const sHarvests = harvests.filter(h => h.season === season);
  const sExpenses = expenses.filter(e => e.season === season);
  const sSubsidies = subsidies.filter(s => s.season === season);
  const harvestKg = sHarvests.reduce((acc, h) => acc + h.kg, 0);
  const revenue = totals.harvest + totals.subsidies;
  const net = revenue - totals.expenses;
  const margin = revenue > 0 ? Math.round((net / revenue) * 1000) / 10 : 0;

  const perParcel = parcels.map(parcel => {
    const ph = sHarvests.filter(h => h.parcelId === parcel.id);
    const pe = sExpenses.filter(e => e.parcelId === parcel.id);
    const kg = ph.reduce((acc, h) => acc + h.kg, 0);
    const income = ph.reduce((acc, h) => acc + h.kg * h.pricePerKg, 0);
    const cost = pe.reduce((acc, e) => acc + e.amount, 0);
    return { parcel, kg, income, cost, net: income - cost };
  }).filter(row => row.kg || row.income || row.cost);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Euro className="text-green-400" /> Økonomi</h2>
          <p className="text-slate-400 text-sm mt-1">Henter fra olivia.harvest_records, olivia.farm_expenses og olivia.subsidy_income. Viser automatisk nyeste sesong med data.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-green-400">{loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <label className="flex flex-col gap-1 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
            Sesong
            <select value={season} onChange={e => setSeason(e.target.value)} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-sm focus:outline-none cursor-pointer normal-case tracking-normal">
              {seasons.map(se => <option key={se} value={se} className="bg-slate-800">{se} · {seasonRows(se, harvests, expenses, subsidies).rows} rader</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm flex gap-2"><AlertTriangle size={18} /> {error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Høstet', `${Math.round(harvestKg).toLocaleString('no-NO')} kg`, `${sHarvests.length} høsterader`],
          ['Høsteinntekt', eur(totals.harvest), 'fra harvest_records'],
          ['Støtte', eur(totals.subsidies), `${sSubsidies.length} støtteposter`],
          ['Utgifter', eur(totals.expenses), `${sExpenses.length} kostnader`],
          ['Netto', eur(net), `margin ${margin}%`],
        ].map(([label, value, sub]) => (
          <div key={label} className="glass rounded-2xl p-5 border border-white/10"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">{label}</p><p className="text-2xl font-black text-white">{value}</p><p className="text-[11px] text-slate-500 mt-1">{sub}</p></div>
        ))}
      </div>

      {totals.rows === 0 && (
        <div className="glass rounded-3xl p-6 border border-yellow-500/30 bg-yellow-500/10 text-yellow-100">
          Denne sesongen har 0 rader. Hvis tallene ligger i 2025, velg 2025 i sesongfeltet. Tabellen under viser hvilke sesonger som faktisk har data.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-6 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><TrendingUp size={16} /> Datagrunnlag per sesong</h3>
          <div className="space-y-2">
            {totalsBySeason.map(row => <button key={row.season} onClick={() => setSeason(row.season)} className={`w-full text-left p-4 rounded-2xl border ${row.season === season ? 'border-green-500/40 bg-green-500/10' : 'border-white/10 bg-white/5'}`}><div className="flex justify-between"><strong className="text-white">{row.season}</strong><span className="text-slate-400">{row.rows} rader</span></div><p className="text-xs text-slate-500 mt-1">Inntekt {eur(row.harvest + row.subsidies)} · Utgift {eur(row.expenses)} · Netto {eur(row.harvest + row.subsidies - row.expenses)}</p></button>)}
          </div>
        </div>
        <div className="glass rounded-3xl p-6 border border-white/10">
          <h3 className="text-sm font-bold text-white mb-4">Per parsell</h3>
          <div className="space-y-2">
            {perParcel.map(row => <div key={row.parcel.id} className="p-4 rounded-2xl bg-white/5 border border-white/10"><div className="flex justify-between gap-3"><strong className="text-white">{row.parcel.name}</strong><span className="text-green-400 font-bold">{eur(row.net)}</span></div><p className="text-xs text-slate-500 mt-1">{Math.round(row.kg).toLocaleString('no-NO')} kg · inntekt {eur(row.income)} · kost {eur(row.cost)}</p></div>)}
            {!perParcel.length && <p className="text-sm text-slate-500">Ingen parsellfordelte tall for valgt sesong.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitabilityOliviaSeasonView;
