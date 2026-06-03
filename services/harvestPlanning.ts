import { supabase } from './supabaseClient';

export type HarvestPurpose = 'table_olives' | 'oil' | 'mixed';
export type HarvestPlanStatus = 'planned' | 'approved' | 'done' | 'cancelled';
export type HarvestFruitSize = 'small' | 'medium' | 'large' | 'very_large';
export type HarvestFirmness = 'hard' | 'medium' | 'soft';

export type HarvestPlanRecord = {
  id: string;
  parcel_id: string;
  parcel_name: string;
  variety: string;
  purpose: HarvestPurpose;
  status: HarvestPlanStatus;
  estimated_kg: number;
  actual_kg?: number;
  maturity_index: number;
  fruit_size: HarvestFruitSize;
  firmness: HarvestFirmness;
  planned_date: string;
  approved_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

export type OliveVarietyRecord = {
  id?: string;
  name: string;
  is_active?: boolean;
  notes?: string;
};

function normalizePlan(row: any): HarvestPlanRecord {
  return {
    id: String(row.id),
    parcel_id: row.parcel_id,
    parcel_name: row.parcel_name,
    variety: row.variety,
    purpose: row.purpose,
    status: row.status,
    estimated_kg: Number(row.estimated_kg || 0),
    actual_kg: row.actual_kg === null || row.actual_kg === undefined ? undefined : Number(row.actual_kg),
    maturity_index: Number(row.maturity_index || 0),
    fruit_size: row.fruit_size || 'medium',
    firmness: row.firmness || 'medium',
    planned_date: row.planned_date,
    approved_at: row.approved_at || undefined,
    completed_at: row.completed_at || undefined,
    notes: row.notes || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function fetchHarvestPlans(): Promise<HarvestPlanRecord[]> {
  const { data, error } = await supabase
    .from('harvest_plans')
    .select('*')
    .order('planned_date', { ascending: true });
  if (error) throw error;
  return (data || []).map(normalizePlan);
}

export async function upsertHarvestPlan(plan: HarvestPlanRecord): Promise<void> {
  const { error } = await supabase.from('harvest_plans').upsert({
    id: plan.id,
    parcel_id: plan.parcel_id,
    parcel_name: plan.parcel_name,
    variety: plan.variety,
    purpose: plan.purpose,
    status: plan.status,
    estimated_kg: plan.estimated_kg,
    actual_kg: plan.actual_kg ?? null,
    maturity_index: plan.maturity_index,
    fruit_size: plan.fruit_size,
    firmness: plan.firmness,
    planned_date: plan.planned_date,
    approved_at: plan.approved_at ?? null,
    completed_at: plan.completed_at ?? null,
    notes: plan.notes ?? null,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
  }, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteHarvestPlan(id: string): Promise<void> {
  const { error } = await supabase.from('harvest_plans').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchOliveVarieties(): Promise<string[]> {
  const { data, error } = await supabase
    .from('olive_varieties')
    .select('name')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []).map(row => row.name).filter(Boolean);
}

export async function upsertOliveVariety(name: string, notes?: string): Promise<void> {
  const clean = name.trim();
  if (!clean) return;
  const { error } = await supabase.from('olive_varieties').upsert({
    name: clean,
    is_active: true,
    notes: notes || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'name' });
  if (error) throw error;
}
