import { isSupabaseConfigured, supabase } from './supabaseClient';

export type ProductType = 'evoo_250' | 'evoo_500' | 'evoo_750' | 'table_olives' | 'gift_pack';
export type SalesChannel = 'market' | 'b2b' | 'online' | 'restaurant' | 'farm_direct' | 'event';
export type OrderStatus = 'draft' | 'confirmed' | 'delivered' | 'paid' | 'cancelled';

export type DonaAnnaProduct = {
  id: string;
  sku: string;
  name: string;
  type: ProductType;
  batch_code?: string;
  qr_slug?: string;
  unit_size: string;
  units_in_stock: number;
  reserved_units: number;
  unit_cost_eur: number;
  retail_price_eur: number;
  wholesale_price_eur: number;
  reorder_level: number;
  is_active?: boolean;
  notes?: string;
};

export type DonaAnnaCustomer = {
  id: string;
  name: string;
  type: 'private' | 'restaurant' | 'shop' | 'distributor' | 'market';
  contact?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  billing_address?: string;
  shipping_address?: string;
  notes?: string;
};

export type DonaAnnaOrder = {
  id: string;
  order_no: string;
  customer_id?: string;
  customer_name: string;
  channel: SalesChannel;
  status: OrderStatus;
  order_date: string;
  subtotal_eur: number;
  paid_amount_eur: number;
  payment_method?: string;
  delivery_method?: string;
  delivery_date?: string;
  notes?: string;
};

export type DonaAnnaOrderLine = {
  id: string;
  order_id: string;
  product_id?: string;
  product_sku?: string;
  product_name: string;
  batch_code?: string;
  quantity: number;
  unit_price_eur: number;
  unit_cost_eur: number;
  line_total_eur?: number;
  gross_margin_eur?: number;
};

export type DonaAnnaOrderWithLines = DonaAnnaOrder & {
  lines: DonaAnnaOrderLine[];
};

export async function fetchDonaAnnaProducts(): Promise<DonaAnnaProduct[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('donaanna_products')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.warn('[donaAnnaSales] fetch products failed', error);
    return [];
  }
  return (data || []) as DonaAnnaProduct[];
}

export async function fetchDonaAnnaCustomers(): Promise<DonaAnnaCustomer[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('donaanna_customers')
    .select('*')
    .order('name', { ascending: true });
  if (error) {
    console.warn('[donaAnnaSales] fetch customers failed', error);
    return [];
  }
  return (data || []) as DonaAnnaCustomer[];
}

export async function fetchDonaAnnaOrders(): Promise<DonaAnnaOrderWithLines[]> {
  if (!isSupabaseConfigured) return [];

  const { data: orders, error: orderError } = await supabase
    .from('donaanna_orders')
    .select('*')
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (orderError) {
    console.warn('[donaAnnaSales] fetch orders failed', orderError);
    return [];
  }

  const orderIds = (orders || []).map(order => order.id);
  if (!orderIds.length) return [];

  const { data: lines, error: lineError } = await supabase
    .from('donaanna_order_lines')
    .select('*')
    .in('order_id', orderIds);

  if (lineError) {
    console.warn('[donaAnnaSales] fetch order lines failed', lineError);
    return (orders || []).map(order => ({ ...(order as DonaAnnaOrder), lines: [] }));
  }

  return (orders || []).map(order => ({
    ...(order as DonaAnnaOrder),
    lines: ((lines || []) as DonaAnnaOrderLine[]).filter(line => line.order_id === order.id),
  }));
}

export async function createDonaAnnaOrder(params: {
  customer: DonaAnnaCustomer;
  product: DonaAnnaProduct;
  order_no: string;
  channel: SalesChannel;
  status: OrderStatus;
  order_date: string;
  quantity: number;
  unit_price_eur: number;
  paid_amount_eur?: number;
  notes?: string;
}): Promise<DonaAnnaOrderWithLines | null> {
  if (!isSupabaseConfigured) return null;

  const subtotal = params.quantity * params.unit_price_eur;
  const { data: order, error: orderError } = await supabase
    .from('donaanna_orders')
    .insert({
      order_no: params.order_no,
      customer_id: params.customer.id,
      customer_name: params.customer.name,
      channel: params.channel,
      status: params.status,
      order_date: params.order_date,
      subtotal_eur: subtotal,
      paid_amount_eur: params.status === 'paid' ? subtotal : (params.paid_amount_eur || 0),
      notes: params.notes,
    })
    .select('*')
    .single();

  if (orderError) throw orderError;

  const { data: line, error: lineError } = await supabase
    .from('donaanna_order_lines')
    .insert({
      order_id: order.id,
      product_id: params.product.id,
      product_sku: params.product.sku,
      product_name: params.product.name,
      batch_code: params.product.batch_code,
      quantity: params.quantity,
      unit_price_eur: params.unit_price_eur,
      unit_cost_eur: params.product.unit_cost_eur,
    })
    .select('*')
    .single();

  if (lineError) throw lineError;

  const stockPatch = params.status === 'delivered' || params.status === 'paid'
    ? { units_in_stock: Math.max((params.product.units_in_stock || 0) - params.quantity, 0) }
    : params.status === 'confirmed'
      ? { reserved_units: (params.product.reserved_units || 0) + params.quantity }
      : {};

  if (Object.keys(stockPatch).length) {
    const { error: stockError } = await supabase
      .from('donaanna_products')
      .update(stockPatch)
      .eq('id', params.product.id);
    if (stockError) console.warn('[donaAnnaSales] stock update failed', stockError);
  }

  return { ...(order as DonaAnnaOrder), lines: [line as DonaAnnaOrderLine] };
}
