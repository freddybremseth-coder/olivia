import { supabase } from './supabaseClient';

export type EquipmentStatus = 'active' | 'service' | 'broken' | 'inactive';
export type EquipmentCondition = 'excellent' | 'good' | 'fair' | 'poor';

export interface EquipmentItem {
  id: string;
  name: string;
  equipmentType: string;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  trackingUnit: string;
  currentValue: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  nextServiceValue?: number;
  purchaseDate?: string;
  purchasePrice?: number;
  estimatedValue?: number;
  serialNumber?: string;
  location?: string;
  notes?: string;
}

export interface EquipmentServiceLog {
  id: string;
  equipmentId: string;
  serviceDate: string;
  serviceType: string;
  valueAtService?: number;
  cost?: number;
  supplier?: string;
  notes?: string;
}

function rowToEquipment(row: any): EquipmentItem {
  return {
    id: row.id,
    name: row.name,
    equipmentType: row.equipment_type,
    status: row.status,
    condition: row.condition,
    trackingUnit: row.tracking_unit,
    currentValue: Number(row.current_value || 0),
    lastServiceDate: row.last_service_date ?? undefined,
    nextServiceDate: row.next_service_date ?? undefined,
    nextServiceValue: row.next_service_value !== null && row.next_service_value !== undefined ? Number(row.next_service_value) : undefined,
    purchaseDate: row.purchase_date ?? undefined,
    purchasePrice: row.purchase_price !== null && row.purchase_price !== undefined ? Number(row.purchase_price) : undefined,
    estimatedValue: row.estimated_value !== null && row.estimated_value !== undefined ? Number(row.estimated_value) : undefined,
    serialNumber: row.serial_number ?? undefined,
    location: row.location ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function equipmentToRow(item: EquipmentItem) {
  return {
    id: item.id,
    name: item.name,
    equipment_type: item.equipmentType,
    status: item.status,
    condition: item.condition,
    tracking_unit: item.trackingUnit,
    current_value: item.currentValue,
    last_service_date: item.lastServiceDate ?? null,
    next_service_date: item.nextServiceDate ?? null,
    next_service_value: item.nextServiceValue ?? null,
    purchase_date: item.purchaseDate ?? null,
    purchase_price: item.purchasePrice ?? null,
    estimated_value: item.estimatedValue ?? null,
    serial_number: item.serialNumber ?? null,
    location: item.location ?? null,
    notes: item.notes ?? null,
  };
}

function rowToServiceLog(row: any): EquipmentServiceLog {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    serviceDate: row.service_date,
    serviceType: row.service_type,
    valueAtService: row.value_at_service !== null && row.value_at_service !== undefined ? Number(row.value_at_service) : undefined,
    cost: row.cost !== null && row.cost !== undefined ? Number(row.cost) : undefined,
    supplier: row.supplier ?? undefined,
    notes: row.notes ?? undefined,
  };
}

function serviceLogToRow(log: EquipmentServiceLog) {
  return {
    id: log.id,
    equipment_id: log.equipmentId,
    service_date: log.serviceDate,
    service_type: log.serviceType,
    value_at_service: log.valueAtService ?? null,
    cost: log.cost ?? null,
    supplier: log.supplier ?? null,
    notes: log.notes ?? null,
  };
}

export async function fetchEquipment(): Promise<EquipmentItem[]> {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Kunne ikke hente utstyr fra Supabase.');
  }
  return (data || []).map(rowToEquipment);
}

export async function upsertEquipment(item: EquipmentItem): Promise<EquipmentItem> {
  const { data, error } = await supabase
    .from('equipment')
    .upsert(equipmentToRow(item), { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Kunne ikke lagre utstyr i Supabase.');
  }
  return rowToEquipment(data);
}

export async function deleteEquipment(id: string): Promise<void> {
  const { error } = await supabase
    .from('equipment')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message || 'Kunne ikke slette utstyr fra Supabase.');
  }
}

export async function fetchEquipmentServiceLogs(equipmentId?: string): Promise<EquipmentServiceLog[]> {
  let query = supabase
    .from('equipment_service_logs')
    .select('*')
    .order('service_date', { ascending: false });

  if (equipmentId) query = query.eq('equipment_id', equipmentId);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Kunne ikke hente servicehistorikk fra Supabase.');
  }
  return (data || []).map(rowToServiceLog);
}

export async function insertEquipmentServiceLog(log: EquipmentServiceLog): Promise<EquipmentServiceLog> {
  const { data, error } = await supabase
    .from('equipment_service_logs')
    .insert(serviceLogToRow(log))
    .select('*')
    .single();

  if (error) {
    throw new Error(error.message || 'Kunne ikke lagre serviceloggen i Supabase.');
  }
  return rowToServiceLog(data);
}
