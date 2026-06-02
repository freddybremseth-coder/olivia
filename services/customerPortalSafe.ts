import {
  B2BCustomerProfile,
  CommerceInvoice,
  CommerceMessage,
  CommerceOrder,
  CommerceProduct,
  CommerceShipment,
  UserProfile,
} from '../types';
import {
  CustomerPortalData,
  customerFromUser,
  fetchAdminPortalRows as fetchAdminPortalRowsUnsafe,
  fetchCustomerPortalData as fetchCustomerPortalDataUnsafe,
  placeCustomerOrder as placeCustomerOrderUnsafe,
  saveCustomerProfile as saveCustomerProfileUnsafe,
  sendCustomerMessage as sendCustomerMessageUnsafe,
} from './customerPortal';

const PROFILE_KEY = 'olivia_b2b_customer_profile_v1';
const ORDERS_KEY = 'olivia_b2b_orders_v1';
const MESSAGES_KEY = 'olivia_b2b_messages_v1';

export type { CustomerPortalData } from './customerPortal';
export { customerFromUser } from './customerPortal';

function warnCommerceFallback(scope: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[commerce-safe] ${scope} failed. Falling back to local/demo data.`, message);
}

function loadLocalProfile(user: UserProfile): B2BCustomerProfile {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (stored) return { ...customerFromUser(user), ...JSON.parse(stored) };
  } catch {
    // keep safe fallback
  }
  return customerFromUser(user);
}

function saveLocalProfile(customer: B2BCustomerProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(customer));
}

function loadLocalOrders(): CommerceOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalOrders(orders: CommerceOrder[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function loadLocalMessages(): CommerceMessage[] {
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalMessages(messages: CommerceMessage[]) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

function parsePrice(value?: string): number {
  if (!value) return 0;
  const normalized = value.replace('€', '').replace(/\s/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function defaultOrders(customerId: string): CommerceOrder[] {
  return [
    {
      id: 'demo-order-1',
      orderNumber: 'DA-DEMO-001',
      customerId,
      status: 'Demo',
      paymentStatus: 'Avventer',
      totalAmount: 0,
      currency: 'EUR',
      shippingAddress: '',
      billingAddress: '',
      notes: 'Demoordre vises fordi Supabase commerce-tabeller ikke er tilgjengelige ennå.',
      orderedAt: new Date().toISOString(),
      items: [],
    },
  ];
}

function defaultInvoices(customerId: string): CommerceInvoice[] {
  return [
    {
      id: 'demo-invoice-1',
      invoiceNumber: 'INV-DEMO-001',
      customerId,
      status: 'Demo',
      totalAmount: 0,
      currency: 'EUR',
    },
  ];
}

function defaultShipments(customerId: string): CommerceShipment[] {
  return [
    {
      id: 'demo-shipment-1',
      customerId,
      status: 'Demo',
      carrier: 'Ikke sendt',
      trackingNumber: '—',
    },
  ];
}

function localPortalData(customer: B2BCustomerProfile): CustomerPortalData {
  const localOrders = loadLocalOrders().filter(order => !order.customerId || order.customerId === customer.id);
  const localMessages = loadLocalMessages().filter(message => !message.customerId || message.customerId === customer.id);
  return {
    customer,
    orders: localOrders.length ? localOrders : defaultOrders(customer.id),
    invoices: defaultInvoices(customer.id),
    shipments: defaultShipments(customer.id),
    messages: localMessages,
  };
}

function orderToAdminRow(order: CommerceOrder): Record<string, string | number> {
  return {
    no: order.orderNumber,
    customer: order.customerId || 'Lokal kunde',
    items: order.items?.map(item => `${item.quantity} x ${item.name}`).join(', ') || '',
    amount: `${order.currency || 'EUR'} ${order.totalAmount || 0}`,
    status: order.status,
    next: order.paymentStatus,
  };
}

function messageToAdminRow(message: CommerceMessage): Record<string, string | number> {
  return {
    subject: message.subject,
    customer: message.customerId || message.profileId || 'Lokal kunde',
    status: message.status,
    direction: message.direction,
    created: new Date(message.createdAt).toLocaleDateString('no-NO'),
  };
}

export async function fetchCustomerPortalData(user: UserProfile): Promise<CustomerPortalData> {
  const fallbackCustomer = loadLocalProfile(user);
  try {
    return await fetchCustomerPortalDataUnsafe(user);
  } catch (error) {
    warnCommerceFallback('fetchCustomerPortalData', error);
    return localPortalData(fallbackCustomer);
  }
}

export async function saveCustomerProfile(user: UserProfile, customer: B2BCustomerProfile): Promise<B2BCustomerProfile> {
  saveLocalProfile(customer);
  try {
    return await saveCustomerProfileUnsafe(user, customer);
  } catch (error) {
    warnCommerceFallback('saveCustomerProfile', error);
    return customer;
  }
}

export async function placeCustomerOrder(customer: B2BCustomerProfile, product: CommerceProduct, quantity: number, notes: string): Promise<CommerceOrder> {
  const unitPrice = product.priceB2b ?? product.priceRetail ?? parsePrice(product.price);
  const totalAmount = unitPrice * quantity;
  const localOrder: CommerceOrder = {
    id: `order-${Date.now()}`,
    orderNumber: `DA-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    customerId: customer.id,
    status: 'Mottatt lokalt',
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

  try {
    return await placeCustomerOrderUnsafe(customer, product, quantity, notes);
  } catch (error) {
    warnCommerceFallback('placeCustomerOrder', error);
    const current = loadLocalOrders();
    const exists = current.some(order => order.orderNumber === localOrder.orderNumber || order.id === localOrder.id);
    if (!exists) saveLocalOrders([localOrder, ...current]);
    return localOrder;
  }
}

export async function sendCustomerMessage(customer: B2BCustomerProfile, profileId: string, subject: string, body: string): Promise<CommerceMessage> {
  const localMessage: CommerceMessage = {
    id: `msg-${Date.now()}`,
    customerId: customer.id,
    profileId,
    subject,
    body,
    status: 'Ny lokalt',
    direction: 'customer_to_admin',
    createdAt: new Date().toISOString(),
  };

  try {
    return await sendCustomerMessageUnsafe(customer, profileId, subject, body);
  } catch (error) {
    warnCommerceFallback('sendCustomerMessage', error);
    saveLocalMessages([localMessage, ...loadLocalMessages()]);
    return localMessage;
  }
}

export async function fetchAdminPortalRows(): Promise<{
  customers: Array<Record<string, string | number>>;
  orders: Array<Record<string, string | number>>;
  invoices: Array<Record<string, string | number>>;
  shipments: Array<Record<string, string | number>>;
  messages: Array<Record<string, string | number>>;
}> {
  try {
    return await fetchAdminPortalRowsUnsafe();
  } catch (error) {
    warnCommerceFallback('fetchAdminPortalRows', error);
    return {
      customers: [],
      orders: loadLocalOrders().map(orderToAdminRow),
      invoices: [],
      shipments: [],
      messages: loadLocalMessages().map(messageToAdminRow),
    };
  }
}
