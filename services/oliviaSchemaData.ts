import { supabase } from './supabaseClient';
import type { Parcel } from '../types';

export type SalesChannel = 'cooperativa' | 'bordoliven' | 'olje_premier' | 'olje_export';
export type ExpenseCategory = 'innhøsting' | 'beskjæring' | 'nye_planter' | 'trefelling' | 'sprøyting' | 'vann' | 'gjødsel' | 'forsikring' | 'vedlikehold' | 'administrasjon' | 'transport' | 'emballasje' | 'annet';
export type SubsidyType = 'eu_okologisk' | 'eu_pao' | 'annet';

export type HarvestRecord = {
  id: string;
  parcelId?: string;
  season: string;
  date: string;
  variety?: string;
  kg: number;
  channel: SalesChannel;
  pricePerKg: number;
  notes?: string;
};

export type FarmExpense = {
  id: string;
  date: string;
  season: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  scope: 'farm' | 'parcel';
  parcelId?: string;
};

export type SubsidyIncome = {
  id: string;
  date: string;
  season: string;
  type: SubsidyType;
  amount: number;
  description: string;
};

function seasonFromDate(date?: string | null): string {
  return (date || new Date().toISOString()).slice(0, 4);
}

function normalizeExpenseCategory(category?: string | null): ExpenseCategory {
  const value = (category || '').toLowerCase();
  if (value.includes('høst') || value.includes('harvest')) return 'innhøsting';
  if (value.includes('beskj')) return 'beskjæring';
  if (value.includes('plant')) return 'nye_planter';
  if (value.includes('felling') || value.includes('rydding')) return 'trefelling';
  if (value.includes('sprøy')) return 'sprøyting';
  if (value.includes('vann') || value.includes('irrig')) return 'vann';
  if (value.includes('gjød')) return 'gjødsel';
  if (value.includes('forsik')) return 'forsikring';
  if (value.includes('vedlike') || value.includes('maskin')) return 'vedlikehold';
  if (value.includes('admin')) return 'administrasjon';
  if (value.includes('transport')) return 'transport';
  if (value.includes('emball')) return 'emballasje';
  return 'annet';
}

function normalizeSubsidyType(category?: string | null): SubsidyType {
  const value = (category || '').toLowerCase();
  if (value.includes('øko') || value.includes('eco') || value.includes('organic')) return 'eu_okologisk';
  if (value.includes('pao') || value.includes('olje')) return 'eu_pao';
  return 'annet';
}

function normalizeChannel(row: any): SalesChannel {
  const value = String(row.channel || row.sales_channel || row.notes || '').toLowerCase();
  if (value.includes('bord')) return 'bordoliven';
  if (value.includes('premium') || value.includes('premier')) return 'olje_premier';
  if (value.includes('export')) return 'olje_export';
  return 'cooperativa';
}

function parseJson(value: unknown): any {
  if (!value) return undefined;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return undefined; }
  }
  return undefined;
}

function rowToParcel(row: any): Parcel {
  const metadata = row.metadata || {};
  const polygon = row.polygon ?? row.poligono ?? metadata.polygon ?? metadata.poligono;
  const parcela = row.parcel ?? row.parcela ?? metadata.parcel ?? metadata.parcela;
  const cadastralId = row.cadastral_id ?? row.catastro_ref ?? row.referencia_catastral ?? metadata.cadastral_id ?? metadata.catastro_ref ?? metadata.referencia_catastral;
  const registryFallback = [
    polygon && `Polígono ${polygon}`,
    parcela && `Parcela ${parcela}`,
    cadastralId && `Catastro ${cadastralId}`,
  ].filter(Boolean).join(' · ');

  return {
    id: String(row.id),
    name: row.name || [row.municipality || metadata.municipality || 'Biar', polygon && `Pol. ${polygon}`, parcela && `Parc. ${parcela}`].filter(Boolean).join(' · '),
    municipality: row.municipality ?? metadata.municipality ?? 'Biar',
    cadastralId: cadastralId ?? undefined,
    cropType: row.crop_type ?? metadata.crop_type ?? 'olive',
    crop: row.crop ?? metadata.crop ?? 'Olivos',
    treeVariety: row.tree_variety ?? metadata.tree_variety ?? undefined,
    area: Number(row.area ?? row.area_m2 ?? metadata.area ?? metadata.area_m2 ?? 0),
    treeCount: row.tree_count ?? metadata.tree_count ?? undefined,
    irrigationStatus: row.irrigation_status ?? metadata.irrigation_status ?? undefined,
    coordinates: parseJson(row.coordinates),
    lat: row.lat ?? row.latitude ?? metadata.lat ?? metadata.latitude,
    lon: row.lon ?? row.lng ?? row.longitude ?? metadata.lon ?? metadata.lng ?? metadata.longitude,
    soilType: row.soil_type ?? metadata.soil_type ?? undefined,
    registrationDate: row.registration_date ?? metadata.registration_date ?? undefined,
    boundaries: parseJson(row.boundaries),
    documentIds: parseJson(row.document_ids),
    registryDetails: row.registry_details ?? metadata.registry_details ?? (registryFallback || undefined),
  };
}

export async function fetchOliviaParcels(): Promise<Parcel[]> {
  const { data, error } = await supabase.from('parcels').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('[oliviaSchemaData] fetchOliviaParcels', error);
    return [];
  }
  return (data || []).map(rowToParcel);
}

export async function fetchOliviaHarvests(): Promise<HarvestRecord[]> {
  const { data, error } = await supabase.from('harvest_records').select('*').order('harvest_date', { ascending: false });
  if (error) {
    console.error('[oliviaSchemaData] fetchOliviaHarvests', error);
    return [];
  }
  return (data || []).map((row: any) => {
    const date = row.harvest_date || row.date || row.created_at || new Date().toISOString().slice(0, 10);
    const kg = Number(row.kilograms ?? row.kg ?? row.weight ?? 0);
    const explicitRevenue = Number(row.total_revenue ?? 0);
    const pricePerKg = Number(row.price_per_kg ?? (kg > 0 && explicitRevenue > 0 ? explicitRevenue / kg : 0));
    return {
      id: String(row.id),
      parcelId: row.parcel_id ?? undefined,
      season: row.season || seasonFromDate(date),
      date,
      variety: row.variety ?? row.olive_type ?? undefined,
      kg,
      channel: normalizeChannel(row),
      pricePerKg,
      notes: row.notes ?? undefined,
    };
  });
}

export async function fetchOliviaExpenses(): Promise<FarmExpense[]> {
  const { data, error } = await supabase.from('farm_expenses').select('*').order('date', { ascending: false });
  if (error) {
    console.error('[oliviaSchemaData] fetchOliviaExpenses', error);
    return [];
  }
  return (data || []).map((row: any) => {
    const date = row.date || row.created_at || new Date().toISOString().slice(0, 10);
    return {
      id: String(row.id),
      date,
      season: row.season || seasonFromDate(date),
      category: normalizeExpenseCategory(row.category),
      description: row.description || row.vendor || row.notes || row.category || 'Utgift',
      amount: Number(row.amount || 0),
      scope: row.parcel_id ? 'parcel' : 'farm',
      parcelId: row.parcel_id ?? undefined,
    };
  });
}

export async function fetchOliviaSubsidies(): Promise<SubsidyIncome[]> {
  const { data, error } = await supabase.from('subsidy_income').select('*').order('date', { ascending: false });
  if (error) {
    console.error('[oliviaSchemaData] fetchOliviaSubsidies', error);
    return [];
  }
  return (data || []).map((row: any) => {
    const date = row.date || row.created_at || new Date().toISOString().slice(0, 10);
    return {
      id: String(row.id),
      date,
      season: row.season || seasonFromDate(date),
      type: normalizeSubsidyType(row.category || row.type),
      amount: Number(row.amount || 0),
      description: row.description || row.notes || row.category || 'Tilskudd',
    };
  });
}

export async function insertOliviaExpense(expense: FarmExpense): Promise<void> {
  const { error } = await supabase.from('farm_expenses').insert({
    date: expense.date,
    category: expense.category,
    amount: expense.amount,
    currency: 'EUR',
    description: expense.description,
    notes: `season=${expense.season}; scope=${expense.scope}`,
    parcel_id: expense.parcelId || null,
  });
  if (error) throw error;
}

export async function deleteOliviaExpense(id: string): Promise<void> {
  const { error } = await supabase.from('farm_expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function insertOliviaSubsidy(subsidy: SubsidyIncome): Promise<void> {
  const { error } = await supabase.from('subsidy_income').insert({
    date: subsidy.date,
    category: subsidy.type,
    amount: subsidy.amount,
    currency: 'EUR',
    description: subsidy.description,
    notes: `season=${subsidy.season}`,
  });
  if (error) throw error;
}

export async function deleteOliviaSubsidy(id: string): Promise<void> {
  const { error } = await supabase.from('subsidy_income').delete().eq('id', id);
  if (error) throw error;
}
