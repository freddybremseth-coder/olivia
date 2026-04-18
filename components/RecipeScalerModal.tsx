import React, { useMemo, useState } from 'react';
import { X, Scale, TrendingUp, AlertTriangle, Printer } from 'lucide-react';
import type { Recipe } from '../types';
import { scaleRecipe, estimateProfit, DEFAULT_PRICES } from '../lib/recipeScaling';

interface Props {
  recipe: Recipe;
  onClose: () => void;
}

const RecipeScalerModal: React.FC<Props> = ({ recipe, onClose }) => {
  const [oliveKg, setOliveKg] = useState(100);
  const [brineLitersPerKg, setBrineLitersPerKg] = useState(1.0);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [showPriceEditor, setShowPriceEditor] = useState(false);

  const scaled = useMemo(
    () => scaleRecipe(recipe, oliveKg, brineLitersPerKg),
    [recipe, oliveKg, brineLitersPerKg],
  );
  const profit = useMemo(
    () => estimateProfit(oliveKg, scaled.brineLiters, prices),
    [oliveKg, scaled.brineLiters, prices],
  );

  const fmt = (n: number) => n.toLocaleString('no-NO', { maximumFractionDigits: 2 });
  const fmtMoney = (n: number) => `€${n.toLocaleString('no-NO', { maximumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:bg-white print:backdrop-blur-none">
      <div className="glass rounded-2xl border border-emerald-500/20 w-full max-w-2xl max-h-[92vh] overflow-y-auto print:bg-white print:text-black print:border-0">
        <div className="sticky top-0 bg-slate-900/95 print:bg-white rounded-t-2xl px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white print:text-black flex items-center gap-2">
            <Scale size={18} className="text-emerald-400" /> Skaler oppskrift — {recipe.name}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="text-slate-400 hover:text-white p-1 print:hidden"
              title="Skriv ut produksjonsark"
            >
              <Printer size={18} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 print:hidden">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3 print:hidden">
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Oliven (kg)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={oliveKg}
                onChange={(e) => setOliveKg(Math.max(0, Number(e.target.value)))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">L lake / kg oliven</span>
              <input
                type="number"
                min={0.1}
                step={0.05}
                value={brineLitersPerKg}
                onChange={(e) => setBrineLitersPerKg(Math.max(0.1, Number(e.target.value)))}
                className="mt-1 w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-emerald-500/50"
              />
            </label>
          </div>

          {/* Summary banner */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Oliven</p>
              <p className="text-lg font-black text-white print:text-black">{fmt(scaled.oliveKg)} kg</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Saltlake</p>
              <p className="text-lg font-black text-white print:text-black">{fmt(scaled.brineLiters)} L</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Margin</p>
              <p className={`text-lg font-black ${profit.marginPct >= 30 ? 'text-emerald-400' : profit.marginPct >= 10 ? 'text-amber-400' : 'text-rose-400'}`}>
                {fmt(profit.marginPct)}%
              </p>
            </div>
          </div>

          {/* Scaled ingredient table */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ingredienser ({fmt(scaled.brineLiters)} L lake)</p>
            <div className="bg-white/5 print:bg-transparent rounded-xl border border-white/10 print:border-black/20 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 print:border-black/20">
                    <th className="text-left text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Ingrediens</th>
                    <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Per liter</th>
                    <th className="text-right text-[10px] font-bold text-slate-500 uppercase px-4 py-2">Skalert</th>
                  </tr>
                </thead>
                <tbody>
                  {scaled.ingredients.map((ing, i) => (
                    <tr key={i} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-2 text-white print:text-black font-medium">{ing.name}</td>
                      <td className="px-4 py-2 text-right text-slate-400 font-mono">{ing.amount} {ing.unit}</td>
                      <td className="px-4 py-2 text-right text-emerald-400 print:text-emerald-700 font-mono font-bold">{ing.scaledDisplay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {scaled.unscalable.length > 0 && (
              <div className="mt-2 flex items-start gap-2 text-xs text-amber-300/80 print:text-amber-700">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                <span>Kunne ikke skalere: {scaled.unscalable.join(', ')}. Juster manuelt.</span>
              </div>
            )}
          </div>

          {/* Profit panel */}
          <div className="bg-slate-900/50 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <TrendingUp size={11} /> Lønnsomhetsestimat
              </p>
              <button
                onClick={() => setShowPriceEditor((v) => !v)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold print:hidden"
              >
                {showPriceEditor ? 'Skjul priser' : 'Endre priser'}
              </button>
            </div>

            {showPriceEditor && (
              <div className="grid grid-cols-2 gap-2 mb-3 print:hidden">
                {[
                  ['Salgspris ferdigprodukt €/kg', 'pricePerKgFinished'],
                  ['Råoliven inn €/kg', 'rawOliveCostPerKg'],
                  ['Ingrediens €/L lake', 'ingredientsCostPerLiter'],
                  ['Arbeid+pakke €/kg', 'overheadPerKg'],
                ].map(([label, key]) => (
                  <label key={key} className="block">
                    <span className="text-[9px] text-slate-500 uppercase font-bold">{label}</span>
                    <input
                      type="number"
                      step={0.05}
                      value={(prices as any)[key]}
                      onChange={(e) =>
                        setPrices((p) => ({ ...p, [key]: Math.max(0, Number(e.target.value)) }))
                      }
                      className="mt-0.5 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                  </label>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <Row label="Råoliven" value={fmtMoney(profit.rawCost)} dim />
              <Row label="Ingredienser" value={fmtMoney(profit.ingredientsCost)} dim />
              <Row label="Overhead" value={fmtMoney(profit.overheadCost)} dim />
              <Row label="Sum kost" value={fmtMoney(profit.totalCost)} bold />
              <Row label="Estimert omsetning" value={fmtMoney(profit.revenue)} bold positive />
              <Row label="Brutto fortjeneste" value={fmtMoney(profit.grossProfit)} bold positive={profit.grossProfit >= 0} negative={profit.grossProfit < 0} />
            </div>
          </div>

          <button onClick={onClose} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl text-sm font-semibold transition-all print:hidden">
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};

interface RowProps {
  label: string;
  value: string;
  bold?: boolean;
  dim?: boolean;
  positive?: boolean;
  negative?: boolean;
}
const Row: React.FC<RowProps> = ({ label, value, bold, dim, positive, negative }) => (
  <div className={`flex justify-between px-3 py-1.5 rounded ${bold ? 'bg-white/5 print:bg-black/5' : ''}`}>
    <span className={dim ? 'text-slate-500' : 'text-slate-300 print:text-slate-700'}>{label}</span>
    <span className={`font-mono ${bold ? 'font-bold' : ''} ${positive ? 'text-emerald-400 print:text-emerald-700' : ''} ${negative ? 'text-rose-400 print:text-rose-700' : 'text-white print:text-black'}`}>
      {value}
    </span>
  </div>
);

export default RecipeScalerModal;
