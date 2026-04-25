/**
 * db.ts – all Supabase data operations for Olivia Farm OS
 *
 * Tables (created via SQL migration in Supabase dashboard):
 *   parcels, harvest_records, farm_expenses, subsidy_income, farm_settings,
 *   batches, recipes, tasks, pruning_history
 *
 * Error handling: read functions log + return empty so the UI can render an
 * "ingen data"-state. Write functions THROW so the caller can show a real
 * error toast — this is what was broken before: silent console.error meant
 * the user clicked "Lagre", saw the modal close, and assumed the row was
 * saved when in reality the upsert failed (typically: table missing on a
 * fresh Supabase project, or RLS policy denying the request).
 */

import { supabase } from './supabaseClient';
import type {
  Parcel, HarvestRecord, FarmExpense, SubsidyIncome,
  Batch, Recipe, Task, PruningHistoryItem,
} from '../types';
import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Translate a PostgrestError into a friendly Norwegian message and throw.
 * `label` is the operation name for logging context (e.g. "upsertExpense").
 */
function throwDbError(label: string, error: PostgrestError | { message: string; code?: string; details?: string; hint?: string }): never {
  console.error(`[db] ${label}`, error);
  const code = (error as any).code || '';
  const msg = error.message || '';

  // Common Postgres / PostgREST codes
  if (code === '42P01' || /relation .* does not exist/i.test(msg)) {
    throw new Error(
      `Tabellen mangler i Supabase. Kjør SQL-migrasjonen fra ` +
      `supabase_schema.sql i Supabase Dashboard → SQL Editor og prøv igjen.`
    );
  }
  if (code === '42501' || /permission denied|rls/i.test(msg)) {
    throw new Error(
      `Tilgang nektet av Supabase RLS. Sjekk at "allow all"-policyen ` +
      `for denne tabellen er aktivert (se supabase_schema.sql).`
    );
  }
  if (code === '23505') {
    throw new Error(`Duplikat: en rad med samme ID finnes allerede.`);
  }
  if (code === '23503') {
    throw new Error(`Referansefeil: en relatert rad mangler (parsell, batch, etc.).`);
  }
  if (/jwt|token/i.test(msg)) {
    throw new Error(`Innloggingen er utløpt — last inn siden på nytt og logg inn igjen.`);
  }
  if (/failed to fetch|networkerror/i.test(msg)) {
    throw new Error(`Mistet kontakt med Supabase. Sjekk internett og prøv igjen.`);
  }
  // Fallback: raw Supabase message (still helpful in DevTools)
  throw new Error(`Lagring feilet: ${msg || 'ukjent feil fra Supabase'}`);
}

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
  if (error) throwDbError('upsertParcel', error);
}

export async function deleteParcel(id: string): Promise<void> {
  const { error } = await supabase.from('parcels').delete().eq('id', id);
  if (error) throwDbError('deleteParcel', error);
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
  if (error) throwDbError('upsertHarvest', error);
}

export async function deleteHarvest(id: string): Promise<void> {
  const { error } = await supabase.from('harvest_records').delete().eq('id', id);
  if (error) throwDbError('deleteHarvest', error);
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
  if (error) throwDbError('upsertExpense', error);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('farm_expenses').delete().eq('id', id);
  if (error) throwDbError('deleteExpense', error);
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
  if (error) throwDbError('upsertSubsidy', error);
}

export async function deleteSubsidy(id: string): Promise<void> {
  const { error } = await supabase.from('subsidy_income').delete().eq('id', id);
  if (error) throwDbError('deleteSubsidy', error);
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
  if (error) throwDbError('saveSettings', error);
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

// ── BATCHES ──────────────────────────────────────────────────────────────────

export async function fetchBatches(): Promise<Batch[]> {
  const { data, error } = await supabase
    .from('batches')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchBatches', error); return []; }
  return (data ?? []).map(rowToBatch);
}

export async function upsertBatch(b: Batch): Promise<void> {
  const { error } = await supabase
    .from('batches')
    .upsert(batchToRow(b), { onConflict: 'id' });
  if (error) throwDbError('upsertBatch', error);
}

export async function deleteBatch(id: string): Promise<void> {
  const { error } = await supabase.from('batches').delete().eq('id', id);
  if (error) throwDbError('deleteBatch', error);
}

// ── RECIPES ──────────────────────────────────────────────────────────────────

export async function fetchRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('fetchRecipes', error); return []; }
  return (data ?? []).map(rowToRecipe);
}

export async function upsertRecipe(r: Recipe): Promise<void> {
  const { error } = await supabase
    .from('recipes')
    .upsert(recipeToRow(r), { onConflict: 'id' });
  if (error) throwDbError('upsertRecipe', error);
}

export async function upsertRecipes(list: Recipe[]): Promise<void> {
  if (!list.length) return;
  const { error } = await supabase
    .from('recipes')
    .upsert(list.map(recipeToRow), { onConflict: 'id' });
  if (error) throwDbError('upsertRecipes', error);
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throwDbError('deleteRecipe', error);
}

// ── TASKS ────────────────────────────────────────────────────────────────────

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('fetchTasks', error); return []; }
  return (data ?? []).map(rowToTask);
}

export async function upsertTask(t: Task): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .upsert(taskToRow(t), { onConflict: 'id' });
  if (error) throwDbError('upsertTask', error);
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throwDbError('deleteTask', error);
}

// ── PRUNING HISTORY ──────────────────────────────────────────────────────────

export async function fetchPruningHistory(): Promise<PruningHistoryItem[]> {
  const { data, error } = await supabase
    .from('pruning_history')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('fetchPruningHistory', error); return []; }
  return (data ?? []).map(rowToPruning);
}

export async function upsertPruningItem(p: PruningHistoryItem): Promise<void> {
  const { error } = await supabase
    .from('pruning_history')
    .upsert(pruningToRow(p), { onConflict: 'id' });
  if (error) throwDbError('upsertPruningItem', error);
}

export async function deletePruningItem(id: string): Promise<void> {
  const { error } = await supabase.from('pruning_history').delete().eq('id', id);
  if (error) throwDbError('deletePruningItem', error);
}

// ── Row mappers (new tables) ─────────────────────────────────────────────────

function rowToBatch(r: any): Batch {
  return {
    id: r.id,
    parcelId: r.parcel_id ?? '',
    recipeId: r.recipe_id ?? undefined,
    recipeName: r.recipe_name ?? undefined,
    recipeSnapshot: r.recipe_snapshot ?? undefined,
    oliveType: r.olive_type ?? undefined,
    harvestDate: r.harvest_date,
    weight: Number(r.weight ?? 0),
    quality: r.quality,
    qualityScore: r.quality_score ?? undefined,
    status: r.status,
    laborHours: r.labor_hours ?? undefined,
    laborCost: r.labor_cost ?? undefined,
    yieldType: r.yield_type,
    oilYieldLiters: r.oil_yield_liters ?? undefined,
    tableOliveYieldKg: r.table_olive_yield_kg ?? undefined,
    traceabilityCode: r.traceability_code ?? undefined,
    currentStage: r.current_stage ?? undefined,
    stageStartDate: r.stage_start_date ?? undefined,
    completedStages: r.completed_stages ?? undefined,
    sales: r.sales ?? undefined,
    logs: r.logs ?? undefined,
    qualityMetrics: r.quality_metrics ?? undefined,
  };
}

function batchToRow(b: Batch) {
  return {
    id: b.id,
    parcel_id: b.parcelId || null,
    recipe_id: b.recipeId ?? null,
    recipe_name: b.recipeName ?? null,
    recipe_snapshot: b.recipeSnapshot ?? null,
    olive_type: b.oliveType ?? null,
    harvest_date: b.harvestDate,
    weight: b.weight,
    quality: b.quality,
    quality_score: b.qualityScore ?? null,
    status: b.status,
    labor_hours: b.laborHours ?? null,
    labor_cost: b.laborCost ?? null,
    yield_type: b.yieldType,
    oil_yield_liters: b.oilYieldLiters ?? null,
    table_olive_yield_kg: b.tableOliveYieldKg ?? null,
    traceability_code: b.traceabilityCode ?? null,
    current_stage: b.currentStage ?? null,
    stage_start_date: b.stageStartDate ?? null,
    completed_stages: b.completedStages ?? null,
    sales: b.sales ?? null,
    logs: b.logs ?? null,
    quality_metrics: b.qualityMetrics ?? null,
  };
}

function rowToRecipe(r: any): Recipe {
  return {
    id: r.id,
    name: r.name,
    flavorProfile: r.flavor_profile ?? undefined,
    description: r.description ?? undefined,
    recommendedOliveTypes: r.recommended_olive_types ?? undefined,
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    brineChangeDays: r.brine_change_days ?? undefined,
    marinadeDayFrom: r.marinade_day_from ?? undefined,
    readyAfterDays: r.ready_after_days ?? undefined,
    rating: Number(r.rating ?? 4),
    notes: r.notes ?? '',
    isAiGenerated: !!r.is_ai_generated,
    isQualityAssured: !!r.is_quality_assured,
  };
}

function recipeToRow(r: Recipe) {
  return {
    id: r.id,
    name: r.name,
    flavor_profile: r.flavorProfile ?? null,
    description: r.description ?? null,
    recommended_olive_types: r.recommendedOliveTypes ?? null,
    ingredients: r.ingredients ?? [],
    brine_change_days: r.brineChangeDays ?? null,
    marinade_day_from: r.marinadeDayFrom ?? null,
    ready_after_days: r.readyAfterDays ?? null,
    rating: r.rating,
    notes: r.notes ?? '',
    is_ai_generated: r.isAiGenerated,
    is_quality_assured: r.isQualityAssured,
  };
}

function rowToTask(r: any): Task {
  return {
    id: r.id,
    title: r.title,
    priority: r.priority,
    category: r.category,
    user: r.user_name ?? '',
    status: r.status,
    parcelId: r.parcel_id ?? undefined,
    dueDate: r.due_date ?? undefined,
  };
}

function taskToRow(t: Task) {
  return {
    id: t.id,
    title: t.title,
    priority: t.priority,
    category: t.category,
    user_name: t.user ?? '',
    status: t.status,
    parcel_id: t.parcelId ?? null,
    due_date: t.dueDate ?? null,
  };
}

function rowToPruning(r: any): PruningHistoryItem {
  return {
    id: r.id,
    date: r.date,
    images: Array.isArray(r.images) ? r.images : [],
    treeType: r.tree_type ?? '',
    ageEstimate: r.age_estimate ?? '',
    analysis: r.analysis ?? undefined,
    plan: r.plan ?? undefined,
    scheduledTime: r.scheduled_time ?? undefined,
    parcelId: r.parcel_id ?? undefined,
  };
}

function pruningToRow(p: PruningHistoryItem) {
  return {
    id: p.id,
    date: p.date,
    images: p.images ?? [],
    tree_type: p.treeType ?? null,
    age_estimate: p.ageEstimate ?? null,
    analysis: p.analysis ?? null,
    plan: p.plan ?? null,
    scheduled_time: p.scheduledTime ?? null,
    parcel_id: p.parcelId ?? null,
  };
}

// ── One-time localStorage → Supabase migration ───────────────────────────────
// Reads any pre-existing legacy localStorage entries and uploads them. Marks
// them as migrated using a flag key so it only runs once per browser. Safe to
// call on every app startup.

const MIGRATION_FLAG = 'olivia_migrated_to_supabase_v1';

export async function migrateLocalStorageToSupabase(): Promise<{
  migrated: { batches: number; recipes: number; tasks: number; pruning: number };
  skipped: boolean;
}> {
  const empty = { batches: 0, recipes: 0, tasks: 0, pruning: 0 };
  if (typeof window === 'undefined') return { migrated: empty, skipped: true };
  if (localStorage.getItem(MIGRATION_FLAG)) return { migrated: empty, skipped: true };

  const result = { ...empty };

  try {
    const rawTasks = localStorage.getItem('olivia_tasks');
    if (rawTasks) {
      const tasks: Task[] = JSON.parse(rawTasks);
      for (const t of tasks) { await upsertTask(t); result.tasks++; }
    }
  } catch (e) { console.warn('migrate tasks', e); }

  try {
    const rawPruning = localStorage.getItem('olivia_pruning_history');
    if (rawPruning) {
      const items: PruningHistoryItem[] = JSON.parse(rawPruning);
      for (const p of items) { await upsertPruningItem(p); result.pruning++; }
    }
  } catch (e) { console.warn('migrate pruning', e); }

  try {
    const rawBatches = localStorage.getItem('olivia_batches');
    if (rawBatches) {
      const items: Batch[] = JSON.parse(rawBatches);
      for (const b of items) { await upsertBatch(b); result.batches++; }
    }
  } catch (e) { console.warn('migrate batches', e); }

  try {
    const rawRecipes = localStorage.getItem('olivia_recipes');
    if (rawRecipes) {
      const items: Recipe[] = JSON.parse(rawRecipes);
      await upsertRecipes(items);
      result.recipes = items.length;
    }
  } catch (e) { console.warn('migrate recipes', e); }

  localStorage.setItem(MIGRATION_FLAG, new Date().toISOString());
  return { migrated: result, skipped: false };
}
