/**
 * db.ts – all Supabase data operations for Olivia Farm OS
 *
 * Tables (created via SQL migration in Supabase dashboard):
 *   parcels, harvest_records, farm_expenses, subsidy_income, farm_settings
 */

import { supabase } from './supabaseClient';
import type { Parcel, HarvestRecord, FarmExpense, SubsidyIncome } from '../types';

// ── PARCELS ──────────────────────────────────────────────────────────────────

export async function fetchParcels(): Promise<Parcel[]> {
  const { data, error } = await supabase
    .from('parcels')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchParcels', error); return []; }
  return (data ?? []).map(rowToParcel);
}

export async function upsertParcel(parcel: Parcel): Promise<void> {
  const { error } = await supabase
    .from('parcels')
    .upsert(parcelToRow(parcel), { onConflict: 'id' });
  if (error) console.error('upsertParcel', error);
}

export async function deleteParcel(id: string): Promise<void> {
  const { error } = await supabase.from('parcels').delete().eq('id', id);
  if (error) console.error('deleteParcel', error);
}

// ── HARVEST RECORDS ──────────────────────────────────────────────────────────

export async function fetchHarvests(): Promise<HarvestRecord[]> {
  const { data, error } = await supabase
    .from('harvest_records')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('fetchHarvests', error); return []; }
  return (data ?? []).map(rowToHarvest);
}

export async function upsertHarvest(h: HarvestRecord): Promise<void> {
  const { error } = await supabase
    .from('harvest_records')
    .upsert(harvestToRow(h), { onConflict: 'id' });
  if (error) console.error('upsertHarvest', error);
}

export async function deleteHarvest(id: string): Promise<void> {
  const { error } = await supabase.from('harvest_records').delete().eq('id', id);
  if (error) console.error('deleteHarvest', error);
}

// ── FARM EXPENSES ─────────────────────────────────────────────────────────────

export async function fetchExpenses(): Promise<FarmExpense[]> {
  const { data, error } = await supabase
    .from('farm_expenses')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('fetchExpenses', error); return []; }
  return (data ?? []).map(rowToExpense);
}

export async function upsertExpense(e: FarmExpense): Promise<void> {
  const { error } = await supabase
    .from('farm_expenses')
    .upsert(expenseToRow(e), { onConflict: 'id' });
  if (error) console.error('upsertExpense', error);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('farm_expenses').delete().eq('id', id);
  if (error) console.error('deleteExpense', error);
}

// ── SUBSIDY INCOME ────────────────────────────────────────────────────────────

export async function fetchSubsidies(): Promise<SubsidyIncome[]> {
  const { data, error } = await supabase
    .from('subsidy_income')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('fetchSubsidies', error); return []; }
  return (data ?? []).map(rowToSubsidy);
}

export async function upsertSubsidy(s: SubsidyIncome): Promise<void> {
  const { error } = await supabase
    .from('subsidy_income')
    .upsert(subsidyToRow(s), { onConflict: 'id' });
  if (error) console.error('upsertSubsidy', error);
}

export async function deleteSubsidy(id: string): Promise<void> {
  const { error } = await supabase.from('subsidy_income').delete().eq('id', id);
  if (error) console.error('deleteSubsidy', error);
}

// ── FARM SETTINGS ─────────────────────────────────────────────────────────────

export interface FarmSettings {
  farm_name: string;
  farm_address: string;
  farm_lat: string;
  farm_lon: string;
  language: string;
  currency: string;
}

export async function fetchSettings(): Promise<FarmSettings | null> {
  const { data, error } = await supabase
    .from('farm_settings')
    .select('*')
    .eq('id', 'default')
    .single();
  if (error) { return null; }
  return data as FarmSettings;
}

export async function saveSettings(settings: FarmSettings): Promise<void> {
  const { error } = await supabase
    .from('farm_settings')
    .upsert({ id: 'default', ...settings }, { onConflict: 'id' });
  if (error) console.error('saveSettings', error);
}

// ── Row mappers ───────────────────────────────────────────────────────────────

function rowToParcel(r: any): Parcel {
  return {
    id: r.id,
    name: r.name,
    municipality: r.municipality ?? undefined,
    cadastralId: r.cadastral_id ?? undefined,
    cropType: r.crop_type ?? undefined,
    crop: r.crop ?? undefined,
    treeVariety: r.tree_variety ?? undefined,
    area: r.area,
    treeCount: r.tree_count ?? undefined,
    irrigationStatus: r.irrigation_status ?? undefined,
    coordinates: r.coordinates ? JSON.parse(r.coordinates) : undefined,
    lat: r.lat ?? undefined,
    lon: r.lon ?? undefined,
    soilType: r.soil_type ?? undefined,
    registrationDate: r.registration_date ?? undefined,
    boundaries: r.boundaries ? JSON.parse(r.boundaries) : undefined,
    documentIds: r.document_ids ? JSON.parse(r.document_ids) : undefined,
    registryDetails: r.registry_details ?? undefined,
  };
}

function parcelToRow(p: Parcel) {
  return {
    id: p.id,
    name: p.name,
    municipality: p.municipality ?? null,
    cadastral_id: p.cadastralId ?? null,
    crop_type: p.cropType ?? null,
    crop: p.crop ?? null,
    tree_variety: p.treeVariety ?? null,
    area: p.area,
    tree_count: p.treeCount ?? null,
    irrigation_status: p.irrigationStatus ?? null,
    coordinates: p.coordinates ? JSON.stringify(p.coordinates) : null,
    lat: p.lat ?? null,
    lon: p.lon ?? null,
    soil_type: p.soilType ?? null,
    registration_date: p.registrationDate ?? null,
    boundaries: p.boundaries ? JSON.stringify(p.boundaries) : null,
    document_ids: p.documentIds ? JSON.stringify(p.documentIds) : null,
    registry_details: p.registryDetails ?? null,
  };
}

function rowToHarvest(r: any): HarvestRecord {
  return {
    id: r.id,
    parcelId: r.parcel_id,
    season: r.season,
    date: r.date,
    variety: r.variety,
    kg: r.kg,
    channel: r.channel,
    pricePerKg: r.price_per_kg,
    notes: r.notes ?? undefined,
  };
}

function harvestToRow(h: HarvestRecord) {
  return {
    id: h.id,
    parcel_id: h.parcelId,
    season: h.season,
    date: h.date,
    variety: h.variety,
    kg: h.kg,
    channel: h.channel,
    price_per_kg: h.pricePerKg,
    notes: h.notes ?? null,
  };
}

function rowToExpense(r: any): FarmExpense {
  return {
    id: r.id,
    date: r.date,
    season: r.season,
    category: r.category,
    description: r.description,
    amount: r.amount,
    scope: r.scope,
    parcelId: r.parcel_id ?? undefined,
  };
}

function expenseToRow(e: FarmExpense) {
  return {
    id: e.id,
    date: e.date,
    season: e.season,
    category: e.category,
    description: e.description,
    amount: e.amount,
    scope: e.scope,
    parcel_id: e.parcelId ?? null,
  };
}

function rowToSubsidy(r: any): SubsidyIncome {
  return {
    id: r.id,
    date: r.date,
    season: r.season,
    type: r.type,
    amount: r.amount,
    description: r.description,
  };
}

function subsidyToRow(s: SubsidyIncome) {
  return {
    id: s.id,
    date: s.date,
    season: s.season,
    type: s.type,
    amount: s.amount,
    description: s.description,
  };
}
