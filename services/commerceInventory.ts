import { isSupabaseConfigured, supabase } from './supabaseClient';

export type UnifiedInventoryProduct = {
  id: string;
  sku: string;
  name: string;
  category?: string;
  size?: string;
  stock_quantity: number;
  reserved_quantity: number;
  inventory_verified: boolean;
  inventory_verified_at?: string;
  price_retail: number;
  price_b2b?: number;
  cost?: number;
  batch_id?: string;
  active: boolean;
  status: string;
};

export type UnifiedInventoryMovement = {
  id: string;
  product_id: string;
  lot_id?: string;
  order_id?: string;
  movement_type: string;
  on_hand_delta: number;
  reserved_delta: number;
  occurred_at: string;
  source: string;
  verified: boolean;
  notes?: string;
};

export type UnifiedProductLot = {
  id: string;
  product_id: string;
  lot_code: string;
  status: string;
  packed_at?: string;
  best_before?: string;
  initial_units: number;
  traceability_slug?: string;
  notes?: string;
};

export type UnifiedOrderRow = {
  id: string;
  order_number: string;
  customer_name?: string;
  status: string;
  payment_status: string;
  total_amount: number;
  ordered_at?: string;
};

const num = (value: unknown) => Number(value || 0);

export async function fetchUnifiedInventory() {
  if (!isSupabaseConfigured) return { products: [], movements: [], lots: [], orders: [] };

  const [productsRes, movementsRes, lotsRes, ordersRes] = await Promise.all([
    supabase.from('commerce_products')
      .select('id,sku,name,category,size,stock_quantity,reserved_quantity,inventory_verified,inventory_verified_at,price_retail,price_b2b,cost,batch_id,active,status')
      .eq('active', true).order('name'),
    supabase.from('inventory_movements')
      .select('id,product_id,lot_id,order_id,movement_type,on_hand_delta,reserved_delta,occurred_at,source,verified,notes')
      .order('occurred_at', { ascending: false }).limit(100),
    supabase.from('product_lots')
      .select('id,product_id,lot_code,status,packed_at,best_before,initial_units,traceability_slug,notes')
      .order('created_at', { ascending: false }),
    supabase.from('commerce_orders')
      .select('id,order_number,customer_name,status,payment_status,total_amount,ordered_at')
      .order('created_at', { ascending: false }).limit(50),
  ]);

  const error = productsRes.error || movementsRes.error || lotsRes.error || ordersRes.error;
  if (error) throw error;

  return {
    products: (productsRes.data || []).map((row: any) => ({
      ...row,
      stock_quantity: num(row.stock_quantity),
      reserved_quantity: num(row.reserved_quantity),
      price_retail: num(row.price_retail),
      price_b2b: row.price_b2b == null ? undefined : num(row.price_b2b),
      cost: row.cost == null ? undefined : num(row.cost),
    })) as UnifiedInventoryProduct[],
    movements: (movementsRes.data || []).map((row: any) => ({
      ...row,
      on_hand_delta: num(row.on_hand_delta),
      reserved_delta: num(row.reserved_delta),
    })) as UnifiedInventoryMovement[],
    lots: (lotsRes.data || []).map((row: any) => ({
      ...row,
      initial_units: num(row.initial_units),
    })) as UnifiedProductLot[],
    orders: (ordersRes.data || []).map((row: any) => ({
      ...row,
      total_amount: num(row.total_amount),
    })) as UnifiedOrderRow[],
  };
}

export async function verifyPhysicalInventory(productId: string, countedUnits: number, note?: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  if (!Number.isFinite(countedUnits) || countedUnits < 0) throw new Error('Fysisk lager må være 0 eller høyere.');

  const { data: product, error: productError } = await supabase
    .from('commerce_products').select('stock_quantity').eq('id', productId).single();
  if (productError) throw productError;

  const current = num(product.stock_quantity);
  const delta = countedUnits - current;
  const now = params.packedAt || new Date().toISOString();

  if (delta !== 0) {
    const { error: movementError } = await supabase.from('inventory_movements').insert({
      id: `count-${productId}-${Date.now()}`,
      product_id: productId,
      movement_type: 'physical_count_adjustment',
      on_hand_delta: delta,
      reserved_delta: 0,
      occurred_at: now,
      source: 'physical_count',
      verified: true,
      notes: note || `Fysisk opptelling: ${countedUnits} enheter. Tidligere systembeholdning: ${current}.`,
    });
    if (movementError) throw movementError;
  }

  const { error: verifyError } = await supabase.from('commerce_products').update({
    inventory_verified: true,
    inventory_verified_at: now,
  }).eq('id', productId);
  if (verifyError) throw verifyError;
}

export async function createProductLot(params: {
  productId: string;
  lotCode: string;
  units: number;
  batchIds?: string[];
  batchSources?: Array<{ batchId: string; inputKg?: number; inputLiters?: number }>;
  traceabilitySlug?: string;
  notes?: string;
  packedAt?: string;
  bestBefore?: string;
}) {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const lotId = `lot-${Date.now()}`;
  const now = new Date().toISOString();

  const { error: lotError } = await supabase.from('product_lots').insert({
    id: lotId,
    product_id: params.productId,
    lot_code: params.lotCode,
    status: 'active',
    packed_at: now,
    best_before: params.bestBefore || null,
    initial_units: params.units,
    traceability_slug: params.traceabilitySlug || null,
    notes: params.notes || null,
  });
  if (lotError) throw lotError;

  const sources = params.batchSources?.length
    ? params.batchSources
    : (params.batchIds || []).map(batchId => ({ batchId }));
  if (sources.length) {
    const { error: sourceError } = await supabase.from('product_lot_sources').insert(
      sources.map(source => ({
        lot_id: lotId,
        batch_id: source.batchId,
        input_kg: source.inputKg ?? null,
        input_liters: source.inputLiters ?? null,
      }))
    );
    if (sourceError) throw sourceError;
  }

  const { error: movementError } = await supabase.from('inventory_movements').insert({
    id: `production-${lotId}`,
    product_id: params.productId,
    lot_id: lotId,
    movement_type: 'production',
    on_hand_delta: params.units,
    reserved_delta: 0,
    occurred_at: now,
    source: 'product_lot',
    event_key: `production:${lotId}`,
    verified: true,
    notes: params.notes || `Pakket batch ${params.lotCode}.`,
  });
  if (movementError) throw movementError;

  return lotId;
}
