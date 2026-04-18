/**
 * Recipe scaling helpers for table-olive batches.
 *
 * The default recipe basis is "per 1 liter saltlake" (ingredient amounts),
 * but a batch is sized by olives in kg. We assume a working ratio of
 * 1 kg pitted olives ≈ 1.0 L brine (industry rule of thumb in Mediterranean
 * production for table olives). Override `brineLitersPerKg` when needed.
 */

import type { Ingredient, Recipe } from '../types';

export interface ScaledIngredient extends Ingredient {
  /** Original amount as a parsed number (NaN if non-numeric e.g. "noen kvister") */
  baseAmount: number;
  /** Scaled amount as a number, rounded to a sensible precision for the unit */
  scaledAmount: number;
  /** Scaled amount as a display string with proper rounding */
  scaledDisplay: string;
}

export interface ScaledRecipe {
  recipeName: string;
  oliveKg: number;
  brineLiters: number;
  ingredients: ScaledIngredient[];
  /** Free-form notes about non-numeric ingredients we couldn't scale */
  unscalable: string[];
}

/** Round amounts according to typical kitchen/industrial precision. */
function roundForUnit(value: number, unit: string): number {
  const u = unit.trim().toLowerCase();
  if (u === 'g' || u === 'gram')           return Math.round(value);
  if (u === 'kg')                           return Math.round(value * 100) / 100;
  if (u === 'ml' || u === 'milliliter')    return Math.round(value);
  if (u === 'l' || u === 'liter' || u === 'litre') return Math.round(value * 100) / 100;
  if (u === 'dl' || u === 'desiliter')     return Math.round(value * 10) / 10;
  if (u === 'ts' || u === 'tsp' || u === 'teskje') return Math.round(value * 2) / 2;
  if (u === 'ss' || u === 'tbsp' || u === 'spiseskje') return Math.round(value * 2) / 2;
  if (u === 'fedd' || u === 'stk' || u === 'kvister' || u === 'kvist') return Math.max(1, Math.round(value));
  return Math.round(value * 100) / 100;
}

function parseAmount(raw: string): number {
  if (!raw) return NaN;
  // Accept "1,5", "1.5", "1/2", "1-2" (use lower bound)
  const cleaned = raw.replace(/,/g, '.').trim();
  if (cleaned.includes('/')) {
    const [a, b] = cleaned.split('/').map(Number);
    if (b) return a / b;
  }
  if (cleaned.includes('-')) {
    const [a] = cleaned.split('-').map(Number);
    if (!isNaN(a)) return a;
  }
  const n = parseFloat(cleaned);
  return isNaN(n) ? NaN : n;
}

export function scaleRecipe(
  recipe: Pick<Recipe, 'name' | 'ingredients'>,
  oliveKg: number,
  brineLitersPerKg = 1.0,
): ScaledRecipe {
  const brineLiters = Math.max(0, oliveKg * brineLitersPerKg);
  const ingredients: ScaledIngredient[] = [];
  const unscalable: string[] = [];

  for (const ing of recipe.ingredients ?? []) {
    const base = parseAmount(ing.amount);
    if (isNaN(base)) {
      unscalable.push(`${ing.name} (${ing.amount} ${ing.unit})`);
      ingredients.push({
        ...ing,
        baseAmount: NaN,
        scaledAmount: NaN,
        scaledDisplay: `${ing.amount} ${ing.unit}`.trim(),
      });
      continue;
    }
    const scaled = roundForUnit(base * brineLiters, ing.unit);
    ingredients.push({
      ...ing,
      baseAmount: base,
      scaledAmount: scaled,
      scaledDisplay: `${scaled.toLocaleString('no-NO')} ${ing.unit}`.trim(),
    });
  }

  return {
    recipeName: recipe.name,
    oliveKg,
    brineLiters,
    ingredients,
    unscalable,
  };
}

// ── Profitability estimator ─────────────────────────────────────────────────

/** Default reference prices (EUR) for quick gross-margin estimates. Override in UI. */
export const DEFAULT_PRICES = {
  /** Wholesale price farmer can charge for finished table olives in 200g jars */
  pricePerKgFinished: 12.0,
  /** Cooperativa price for raw olives delivered ungraded */
  rawOliveCostPerKg: 0.45,
  /** Rough average cost of brine ingredients per liter (salt, herbs, vinegar) */
  ingredientsCostPerLiter: 0.80,
  /** Labour + packaging + utilities allocated per kg finished product */
  overheadPerKg: 1.20,
};

export interface ProfitEstimate {
  oliveKg: number;
  brineLiters: number;
  rawCost: number;
  ingredientsCost: number;
  overheadCost: number;
  totalCost: number;
  revenue: number;
  grossProfit: number;
  marginPct: number;
}

export function estimateProfit(
  oliveKg: number,
  brineLiters: number,
  prices = DEFAULT_PRICES,
): ProfitEstimate {
  const rawCost = oliveKg * prices.rawOliveCostPerKg;
  const ingredientsCost = brineLiters * prices.ingredientsCostPerLiter;
  const overheadCost = oliveKg * prices.overheadPerKg;
  const totalCost = rawCost + ingredientsCost + overheadCost;
  const revenue = oliveKg * prices.pricePerKgFinished;
  const grossProfit = revenue - totalCost;
  const marginPct = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  return { oliveKg, brineLiters, rawCost, ingredientsCost, overheadCost, totalCost, revenue, grossProfit, marginPct };
}
