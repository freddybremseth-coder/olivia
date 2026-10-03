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

export type UnifiedOrderItem = {
  id: string;
  order_id: string;
  product_id?: string;
  lot_id?: string;
  name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type UnifiedShipmentRow = {
  id: string;
  order_id?: string;
  customer_id?: string;
  carrier?: string;
  tracking_number?: string;
  tracking_url?: string;
  status: string;
  shipped_at?: string;
  delivered_at?: string;
};

export type CommerceBusinessSettings = {
  id: string;
  display_name: string;
  legal_name: string;
  tax_id: string;
  address: string;
  postal_code: string;
  city: string;
  province: string;
  country: string;
  email: string;
  phone: string;
  iban: string;
  invoice_prefix: string;
  invoice_notes: string;
};

export type UnifiedInvoiceRow = {
  id: string;
  invoice_number: string;
  order_id?: string;
  customer_name?: string;
  customer_id?: string;
  status: string;
  payment_status: string;
  total_amount: number;
  due_date?: string;
  paid_date?: string;
};

export type UnifiedOrderCustomer = {
  company?: string;
  contact_name?: string;
  email?: string;
  tax_id?: string;
  vat_number?: string;
  billing_address?: string;
  shipping_address?: string;
};

export type UnifiedOrderRow = {
  id: string;
  order_number: string;
  customer_id?: string;
  customer_name?: string;
  shipping_address?: string;
  billing_address?: string;
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  discount_amount: number;
  currency: string;
  status: string;
  payment_status: string;
  total_amount: number;
  ordered_at?: string;
  customer?: UnifiedOrderCustomer;
  items: UnifiedOrderItem[];
};

const num = (value: unknown) => Number(value || 0);

export async function fetchUnifiedInventory() {
  if (!isSupabaseConfigured) return { products: [], movements: [], lots: [], orders: [], invoices: [], shipments: [], businessSettings: null };

  const [productsRes, movementsRes, lotsRes, ordersRes, invoicesRes, shipmentsRes, settingsRes] = await Promise.all([
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
      .select('id,order_number,customer_id,customer_name,shipping_address,billing_address,subtotal,tax_amount,shipping_cost,discount_amount,total_amount,currency,status,payment_status,ordered_at,commerce_customers(company,contact_name,email,tax_id,vat_number,billing_address,shipping_address),commerce_order_items(id,order_id,product_id,lot_id,name,sku,quantity,unit_price,total_price)')
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('commerce_invoices')
      .select('id,invoice_number,order_id,customer_id,customer_name,status,payment_status,total_amount,due_date,paid_date')
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('commerce_shipments')
      .select('id,order_id,customer_id,carrier,tracking_number,tracking_url,status,shipped_at,delivered_at')
      .order('created_at', { ascending: false }).limit(50),
    supabase.from('commerce_business_settings').select('*').eq('id','default').maybeSingle(),
  ]);

  const error = productsRes.error || movementsRes.error || lotsRes.error || ordersRes.error || invoicesRes.error || shipmentsRes.error || settingsRes.error;
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
      subtotal: num(row.subtotal),
      tax_amount: num(row.tax_amount),
      shipping_cost: num(row.shipping_cost),
      discount_amount: num(row.discount_amount),
      total_amount: num(row.total_amount),
      customer: Array.isArray(row.commerce_customers) ? row.commerce_customers[0] : row.commerce_customers,
      items: (row.commerce_order_items || []).map((item: any) => ({
        ...item,
        quantity: num(item.quantity),
        unit_price: num(item.unit_price),
        total_price: num(item.total_price),
      })),
    })) as UnifiedOrderRow[],
    invoices: (invoicesRes.data || []).map((row: any) => ({
      ...row,
      total_amount: num(row.total_amount),
    })) as UnifiedInvoiceRow[],
    shipments: (shipmentsRes.data || []) as UnifiedShipmentRow[],
    businessSettings: (settingsRes.data || null) as CommerceBusinessSettings | null,
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
  const now = new Date().toISOString();

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
  const now = params.packedAt || new Date().toISOString();

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


export async function assignOrderItemLot(orderItemId: string, lotId: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase.rpc('assign_order_item_lot', { p_order_item_id: orderItemId, p_lot_id: lotId });
  if (error) throw error;
  return data;
}

export async function updateCommerceOrderStatus(orderId: string, status: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const patch: Record<string, unknown> = { status };
  if (/sendt|shipped/i.test(status)) patch.shipped_at = new Date().toISOString();
  if (/levert|delivered/i.test(status)) patch.delivered_at = new Date().toISOString();
  const { error } = await supabase.from('commerce_orders').update(patch).eq('id', orderId);
  if (error) throw error;
}

export async function createInvoiceForOrder(orderId: string, dueDate?: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase.rpc('create_invoice_for_order', { p_order_id: orderId, p_due_date: dueDate || null });
  if (error) throw error;
  return String(data);
}

export async function markCommerceInvoicePaid(invoiceId: string, paymentMethod?: string, paidDate?: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const { error } = await supabase.rpc('mark_commerce_invoice_paid', {
    p_invoice_id: invoiceId,
    p_payment_method: paymentMethod || null,
    p_paid_date: paidDate || new Date().toISOString().slice(0, 10),
  });
  if (error) throw error;
}


export async function shipCommerceOrder(orderId: string, carrier?: string, trackingNumber?: string, trackingUrl?: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const { data, error } = await supabase.rpc('upsert_order_shipment', {
    p_order_id: orderId,
    p_carrier: carrier || null,
    p_tracking_number: trackingNumber || null,
    p_tracking_url: trackingUrl || null,
  });
  if (error) throw error;
  return String(data);
}

export async function markCommerceOrderDelivered(orderId: string) {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const { error } = await supabase.rpc('mark_order_delivered', { p_order_id: orderId });
  if (error) throw error;
}

export async function saveCommerceBusinessSettings(settings: CommerceBusinessSettings) {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const { error } = await supabase.from('commerce_business_settings').upsert({
    ...settings,
    id: 'default',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
}
