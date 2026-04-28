import {
  B2BCustomerProfile,
  CommerceInvoice,
  CommerceMessage,
  CommerceOrder,
  CommerceOrderItem,
  CommerceProduct,
  CommerceShipment,
  UserProfile,
} from '../types';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { upsertProfile } from './auth';

const PROFILE_KEY = 'olivia_b2b_customer_profile_v1';
const ORDERS_KEY = 'olivia_b2b_orders_v1';
const MESSAGES_KEY = 'olivia_b2b_messages_v1';

export interface CustomerPortalData {
  customer: B2BCustomerProfile;
  orders: CommerceOrder[];
  invoices: CommerceInvoice[];
  shipments: CommerceShipment[];
  messages: CommerceMessage[];
}

export interface CommerceBusinessMetrics {
  pendingOrders: number;
  shippedOrders: number;
  invoicedOrders: number;
  outstandingInvoices: number;
  paidInvoices: number;
  unpaidAmount: number;
  paidAmount: number;
  orderValue: number;
  openMessages: number;
}

export function customerFromUser(user: UserProfile): B2BCustomerProfile {
  return {
    id: `cust-${user.id}`,
    profileId: user.id,
    company: user.company || '',
    contactName: user.name,
    email: user.email,
    phone: user.phone || '',
    customerType: 'b2b_customer',
    priceTier: 'b2b',
    paymentTerms: 'card',
    billingAddress: user.billingAddress || '',
    shippingAddress: user.shippingAddress || '',
    taxId: user.taxId || '',
    status: 'active',
  };
}

export async function fetchCustomerPortalData(user: UserProfile): Promise<CustomerPortalData> {
  const fallbackCustomer = loadLocalProfile(user);
  if (!isSupabaseConfigured) return localPortalData(fallbackCustomer);

  const customer = await ensureCustomer(fallbackCustomer);
  const [orders, invoices, shipments, messages] = await Promise.all([
    fetchOrders(customer.id),
    fetchInvoices(customer.id),
    fetchShipments(customer.id),
    fetchMessages(customer.id, user.id),
  ]);

  return {
    customer,
    orders: orders.length ? orders : defaultOrders(customer.id),
    invoices: invoices.length ? invoices : defaultInvoices(customer.id),
    shipments: shipments.length ? shipments : defaultShipments(customer.id),
    messages,
  };
}

export async function saveCustomerProfile(user: UserProfile, customer: B2BCustomerProfile): Promise<B2BCustomerProfile> {
  const nextUser: UserProfile = {
    ...user,
    name: customer.contactName,
    email: customer.email,
    company: customer.company,
    phone: customer.phone,
    billingAddress: customer.billingAddress,
    shippingAddress: customer.shippingAddress,
    taxId: customer.taxId,
  };

  localStorage.setItem(PROFILE_KEY, JSON.stringify(customer));
  if (!isSupabaseConfigured) return customer;

  await upsertProfile(nextUser);
  const { error } = await supabase
    .from('commerce_customers')
    .upsert(customerToRow(customer), { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return customer;
}

export async function placeCustomerOrder(customer: B2BCustomerProfile, product: CommerceProduct, quantity: number, notes: string): Promise<CommerceOrder> {
  const unitPrice = product.priceB2b ?? product.priceRetail ?? parsePrice(product.price);
  const totalAmount = unitPrice * quantity;
  const order: CommerceOrder = {
    id: `order-${Date.now()}`,
    orderNumber: `DA-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    customerId: customer.id,
    status: 'Mottatt',
    paymentStatus: 'Avventer',
    totalAmount,
    currency: 'EUR',
    shippingAddress: customer.shippingAddress,
    billingAddress: customer.billingAddress,
    notes,
    orderedAt: new Date().toISOString(),
    items: [{
      id: `item-${Date.now()}`,
      productId: product.id,
      name: product.name,
      sku: product.sku,
      quantity,
      unitPrice,
      totalPrice: totalAmount,
    }],
  };

  const localOrders = loadLocalOrders();
  localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...localOrders]));
  if (!isSupabaseConfigured) return order;

  const { error: orderError } = await supabase
    .from('commerce_orders')
    .insert(orderToRow(order));
  if (orderError) throw new Error(orderError.message);

  const { error: itemError } = await supabase
    .from('commerce_order_items')
    .insert(order.items.map(item => orderItemToRow(item, order.id)));
  if (itemError) throw new Error(itemError.message);

  return order;
}

export async function sendCustomerMessage(customer: B2BCustomerProfile, profileId: string, subject: string, body: string): Promise<CommerceMessage> {
  const message: CommerceMessage = {
    id: `msg-${Date.now()}`,
    customerId: customer.id,
    profileId,
    subject,
    body,
    status: 'Ny',
    direction: 'customer_to_admin',
    createdAt: new Date().toISOString(),
  };

  const localMessages = loadLocalMessages();
  localStorage.setItem(MESSAGES_KEY, JSON.stringify([message, ...localMessages]));
  if (!isSupabaseConfigured) return message;

  const { error } = await supabase
    .from('commerce_messages')
    .insert(messageToRow(message));
  if (error) throw new Error(error.message);
  return message;
}

export async function fetchAdminPortalRows(): Promise<{
  customers: Array<Record<string, string | number>>;
  orders: Array<Record<string, string | number>>;
  invoices: Array<Record<string, string | number>>;
  shipments: Array<Record<string, string | number>>;
  messages: Array<Record<string, string | number>>;
}> {
  const localOrders = loadLocalOrders();
  const localMessages = loadLocalMessages();
  if (!isSupabaseConfigured) {
    return {
      customers: [],
      orders: localOrders.map(orderToAdminRow),
      invoices: [],
      shipments: [],
      messages: localMessages.map(messageToAdminRow),
    };
  }

  const [customersRes, ordersRes, invoicesRes, shipmentsRes, messagesRes] = await Promise.all([
    supabase.from('commerce_customers').select('*').order('created_at', { ascending: false }),
    supabase.from('commerce_orders').select('*').order('created_at', { ascending: false }),
    supabase.from('commerce_invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('commerce_shipments').select('*').order('created_at', { ascending: false }),
    supabase.from('commerce_messages').select('*').order('created_at', { ascending: false }),
  ]);

  return {
    customers: (customersRes.data ?? []).map(customerToAdminRow),
    orders: [...(ordersRes.data ?? []).map(rawOrderToAdminRow), ...localOrders.map(orderToAdminRow)],
    invoices: (invoicesRes.data ?? []).map(rawInvoiceToAdminRow),
    shipments: (shipmentsRes.data ?? []).map(rawShipmentToAdminRow),
    messages: [...(messagesRes.data ?? []).map(rawMessageToAdminRow), ...localMessages.map(messageToAdminRow)],
  };
}

export async function fetchCommerceBusinessMetrics(): Promise<CommerceBusinessMetrics> {
  const localOrders = loadLocalOrders();
  const localMessages = loadLocalMessages();

  if (!isSupabaseConfigured) {
    return calculateMetrics(localOrders, defaultInvoices('local-customer'), localMessages);
  }

  const [ordersRes, invoicesRes, messagesRes] = await Promise.all([
    supabase.from('commerce_orders').select('*'),
    supabase.from('commerce_invoices').select('*'),
    supabase.from('commerce_messages').select('*'),
  ]);

  const orders = [
    ...(ordersRes.data ?? []).map(rowToOrder),
    ...localOrders,
  ];
  const invoices = (invoicesRes.data ?? []).map(rowToInvoice);
  const messages = [
    ...(messagesRes.data ?? []).map(rowToMessage),
    ...localMessages,
  ];

  return calculateMetrics(orders, invoices.length ? invoices : defaultInvoices('local-customer'), messages);
}

function loadLocalProfile(user: UserProfile): B2BCustomerProfile {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) return { ...customerFromUser(user), ...JSON.parse(stored) };
  } catch {
    // Keep the portal usable if stored demo data is malformed.
  }
  return customerFromUser(user);
}

function loadLocalOrders(): CommerceOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function loadLocalMessages(): CommerceMessage[] {
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
  } catch {
    return [];
  }
}

function localPortalData(customer: B2BCustomerProfile): CustomerPortalData {
  const orders = loadLocalOrders().filter(order => !order.customerId || order.customerId === customer.id);
  const messages = loadLocalMessages().filter(message => !message.customerId || message.customerId === customer.id);
  return {
    customer,
    orders: orders.length ? orders : defaultOrders(customer.id),
    invoices: defaultInvoices(customer.id),
    shipments: defaultShipments(customer.id),
    messages,
  };
}

function calculateMetrics(
  orders: CommerceOrder[],
  invoices: CommerceInvoice[],
  messages: CommerceMessage[],
): CommerceBusinessMetrics {
  const normalizedStatus = (value: string) => value.toLowerCase();
  const pendingOrders = orders.filter(order => {
    const status = normalizedStatus(order.status);
    return ['mottatt', 'ny', 'tilbud', 'draft', 'pakkes', 'venter'].some(term => status.includes(term));
  }).length;
  const shippedOrders = orders.filter(order => {
    const status = normalizedStatus(order.status);
    return ['sendt', 'shipped', 'på vei', 'levert'].some(term => status.includes(term));
  }).length;
  const paidInvoices = invoices.filter(invoice => normalizedStatus(invoice.status).includes('betalt') || normalizedStatus(invoice.status).includes('paid')).length;
  const outstandingInvoices = invoices.filter(invoice => {
    const status = normalizedStatus(invoice.status);
    return !status.includes('betalt') && !status.includes('paid') && !status.includes('kreditert');
  });
  const invoicedOrderIds = new Set(invoices.map(invoice => invoice.orderId).filter(Boolean));

  return {
    pendingOrders,
    shippedOrders,
    invoicedOrders: invoicedOrderIds.size || invoices.length,
    outstandingInvoices: outstandingInvoices.length,
    paidInvoices,
    unpaidAmount: outstandingInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
    paidAmount: invoices
      .filter(invoice => normalizedStatus(invoice.status).includes('betalt') || normalizedStatus(invoice.status).includes('paid'))
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0),
    orderValue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
    openMessages: messages.filter(message => {
      const status = normalizedStatus(message.status);
      return status.includes('ny') || status.includes('open') || status.includes('åpen');
    }).length,
  };
}

async function ensureCustomer(customer: B2BCustomerProfile): Promise<B2BCustomerProfile> {
  const { data, error } = await supabase
    .from('commerce_customers')
    .select('*')
    .eq('profile_id', customer.profileId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return rowToCustomer(data);

  const { data: inserted, error: insertError } = await supabase
    .from('commerce_customers')
    .insert(customerToRow(customer))
    .select('*')
    .single();
  if (insertError) throw new Error(insertError.message);
  return rowToCustomer(inserted);
}

async function fetchOrders(customerId: string): Promise<CommerceOrder[]> {
  const { data, error } = await supabase
    .from('commerce_orders')
    .select('*, commerce_order_items(*)')
    .eq('customer_id', customerId)
    .order('ordered_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToOrder);
}

async function fetchInvoices(customerId: string): Promise<CommerceInvoice[]> {
  const { data, error } = await supabase
    .from('commerce_invoices')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToInvoice);
}

async function fetchShipments(customerId: string): Promise<CommerceShipment[]> {
  const { data, error } = await supabase
    .from('commerce_shipments')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToShipment);
}

async function fetchMessages(customerId: string, profileId: string): Promise<CommerceMessage[]> {
  const { data, error } = await supabase
    .from('commerce_messages')
    .select('*')
    .or(`customer_id.eq.${customerId},profile_id.eq.${profileId}`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToMessage);
}

function customerToRow(customer: B2BCustomerProfile) {
  return {
    id: customer.id,
    profile_id: customer.profileId ?? null,
    company: customer.company,
    contact_name: customer.contactName,
    email: customer.email,
    phone: customer.phone ?? null,
    customer_type: customer.customerType,
    price_tier: customer.priceTier,
    payment_terms: customer.paymentTerms,
    billing_address: customer.billingAddress ?? null,
    shipping_address: customer.shippingAddress ?? null,
    tax_id: customer.taxId ?? null,
    status: customer.status,
    notes: customer.notes ?? null,
  };
}

function rowToCustomer(row: any): B2BCustomerProfile {
  return {
    id: row.id,
    profileId: row.profile_id ?? undefined,
    company: row.company ?? '',
    contactName: row.contact_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    customerType: row.customer_type ?? 'b2b_customer',
    priceTier: row.price_tier ?? 'b2b',
    paymentTerms: row.payment_terms ?? 'card',
    billingAddress: row.billing_address ?? '',
    shippingAddress: row.shipping_address ?? '',
    taxId: row.tax_id ?? '',
    status: row.status ?? 'active',
    notes: row.notes ?? undefined,
  };
}

function orderToRow(order: CommerceOrder) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    customer_id: order.customerId ?? null,
    order_type: 'order',
    status: order.status,
    payment_status: order.paymentStatus,
    subtotal: order.totalAmount,
    tax_amount: 0,
    shipping_cost: 0,
    discount_amount: 0,
    total_amount: order.totalAmount,
    currency: order.currency,
    shipping_address: order.shippingAddress ?? null,
    billing_address: order.billingAddress ?? null,
    notes: order.notes ?? null,
    ordered_at: order.orderedAt,
  };
}

function orderItemToRow(item: CommerceOrderItem, orderId: string) {
  return {
    id: item.id,
    order_id: orderId,
    product_id: item.productId ?? null,
    name: item.name,
    sku: item.sku ?? null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    total_price: item.totalPrice,
  };
}

function rowToOrder(row: any): CommerceOrder {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerId: row.customer_id ?? undefined,
    status: row.status,
    paymentStatus: row.payment_status,
    totalAmount: Number(row.total_amount ?? 0),
    currency: row.currency ?? 'EUR',
    shippingAddress: row.shipping_address ?? undefined,
    billingAddress: row.billing_address ?? undefined,
    notes: row.notes ?? undefined,
    orderedAt: row.ordered_at ?? row.created_at,
    items: (row.commerce_order_items ?? []).map((item: any) => ({
      id: item.id,
      orderId: item.order_id,
      productId: item.product_id ?? undefined,
      name: item.name,
      sku: item.sku ?? undefined,
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unit_price ?? 0),
      totalPrice: Number(item.total_price ?? 0),
    })),
  };
}

function rowToInvoice(row: any): CommerceInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    orderId: row.order_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    status: row.status,
    totalAmount: Number(row.total_amount ?? 0),
    currency: row.currency ?? 'EUR',
    dueDate: row.due_date ?? undefined,
    paidDate: row.paid_date ?? undefined,
    pdfUrl: row.pdf_url ?? undefined,
  };
}

function rowToShipment(row: any): CommerceShipment {
  return {
    id: row.id,
    orderId: row.order_id ?? undefined,
    customerId: row.customer_id ?? undefined,
    carrier: row.carrier ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    status: row.status,
    trackingUrl: row.tracking_url ?? undefined,
    shippedAt: row.shipped_at ?? undefined,
    deliveredAt: row.delivered_at ?? undefined,
  };
}

function messageToRow(message: CommerceMessage) {
  return {
    id: message.id,
    customer_id: message.customerId ?? null,
    profile_id: message.profileId ?? null,
    subject: message.subject,
    body: message.body,
    status: message.status,
    direction: message.direction,
    created_at: message.createdAt,
  };
}

function rowToMessage(row: any): CommerceMessage {
  return {
    id: row.id,
    customerId: row.customer_id ?? undefined,
    profileId: row.profile_id ?? undefined,
    subject: row.subject ?? '',
    body: row.body ?? '',
    status: row.status ?? 'Ny',
    direction: row.direction ?? 'customer_to_admin',
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function parsePrice(price: string): number {
  const parsed = Number(price.replace(/[^\d,.]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number, currency = 'EUR'): string {
  return `${currency === 'EUR' ? '€' : currency} ${value.toFixed(2)}`;
}

function shortDate(value?: string): string {
  return value ? new Date(value).toLocaleDateString('no-NO') : '-';
}

function defaultOrders(customerId: string): CommerceOrder[] {
  return [{
    id: 'demo-order-1',
    orderNumber: 'DA-2026-0018',
    customerId,
    status: 'Sendt',
    paymentStatus: 'Betalt',
    totalAmount: 468,
    currency: 'EUR',
    orderedAt: '2026-04-18T10:00:00.000Z',
    items: [{ id: 'demo-item-1', name: 'Verde Alto', sku: 'DA-VA-500', quantity: 24, unitPrice: 19.5, totalPrice: 468 }],
  }];
}

function defaultInvoices(customerId: string): CommerceInvoice[] {
  return [{
    id: 'demo-invoice-1',
    invoiceNumber: 'INV-2026-0042',
    customerId,
    orderId: 'demo-order-1',
    status: 'Betalt',
    totalAmount: 468,
    currency: 'EUR',
    dueDate: '2026-05-02',
    paidDate: '2026-04-22',
  }];
}

function defaultShipments(customerId: string): CommerceShipment[] {
  return [{
    id: 'demo-shipment-1',
    customerId,
    orderId: 'demo-order-1',
    carrier: 'DHL',
    trackingNumber: 'DA-TRACE-1842',
    status: 'På vei',
    shippedAt: '2026-04-23T09:00:00.000Z',
    trackingUrl: '#',
  }];
}

function orderToAdminRow(order: CommerceOrder): Record<string, string | number> {
  return {
    ordre: order.orderNumber,
    kunde: order.customerId ?? '-',
    varer: order.items.map(item => `${item.quantity} x ${item.name}`).join(', '),
    total: money(order.totalAmount, order.currency),
    status: order.status,
    betaling: order.paymentStatus,
  };
}

function rawOrderToAdminRow(row: any): Record<string, string | number> {
  return {
    ordre: row.order_number,
    kunde: row.customer_id ?? '-',
    total: money(Number(row.total_amount ?? 0), row.currency ?? 'EUR'),
    status: row.status,
    betaling: row.payment_status,
    dato: shortDate(row.ordered_at),
  };
}

function customerToAdminRow(row: any): Record<string, string | number> {
  return {
    kunde: row.company || row.contact_name,
    kontakt: row.contact_name,
    epost: row.email,
    type: row.customer_type,
    status: row.status,
  };
}

function rawInvoiceToAdminRow(row: any): Record<string, string | number> {
  return {
    faktura: row.invoice_number,
    ordre: row.order_id ?? '-',
    kunde: row.customer_id ?? '-',
    total: money(Number(row.total_amount ?? 0), row.currency ?? 'EUR'),
    status: row.status,
    forfall: row.due_date ?? '-',
  };
}

function rawShipmentToAdminRow(row: any): Record<string, string | number> {
  return {
    ordre: row.order_id ?? '-',
    transportør: row.carrier ?? '-',
    sporing: row.tracking_number ?? '-',
    status: row.status,
    sendt: shortDate(row.shipped_at),
  };
}

function messageToAdminRow(message: CommerceMessage): Record<string, string | number> {
  return {
    emne: message.subject,
    kunde: message.customerId ?? '-',
    status: message.status,
    retning: message.direction === 'customer_to_admin' ? 'Fra kunde' : 'Til kunde',
    dato: shortDate(message.createdAt),
  };
}

function rawMessageToAdminRow(row: any): Record<string, string | number> {
  return messageToAdminRow(rowToMessage(row));
}
