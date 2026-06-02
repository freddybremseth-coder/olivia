import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardList,
  Euro,
  PackageCheck,
  Plus,
  ReceiptText,
  Save,
  ShoppingBag,
  Store,
  TrendingUp,
  Truck,
  Users,
  X,
} from 'lucide-react';

type ProductType = 'evoo_250' | 'evoo_500' | 'evoo_750' | 'table_olives' | 'gift_pack';
type SalesChannel = 'market' | 'b2b' | 'online' | 'restaurant' | 'farm_direct' | 'event';
type OrderStatus = 'draft' | 'confirmed' | 'delivered' | 'paid' | 'cancelled';

type Product = {
  id: string;
  sku: string;
  name: string;
  type: ProductType;
  batch_code: string;
  qr_slug?: string;
  unit_size: string;
  units_in_stock: number;
  reserved_units: number;
  unit_cost_eur: number;
  retail_price_eur: number;
  wholesale_price_eur: number;
  reorder_level: number;
};

type Customer = {
  id: string;
  name: string;
  type: 'private' | 'restaurant' | 'shop' | 'distributor' | 'market';
  contact?: string;
  city?: string;
  notes?: string;
};

type Order = {
  id: string;
  order_no: string;
  customer_id: string;
  customer_name: string;
  channel: SalesChannel;
  status: OrderStatus;
  order_date: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_eur: number;
  paid_amount_eur?: number;
  notes?: string;
};

const demoProducts: Product[] = [
  {
    id: 'prod-evoo-500-demo',
    sku: 'DA-EVOO-500-2026',
    name: 'DonaAnna EVOO 500 ml',
    type: 'evoo_500',
    batch_code: 'DA-BIAR-2026-EVOO-001',
    qr_slug: 'da-biar-2026-evoo-001',
    unit_size: '500 ml',
    units_in_stock: 720,
    reserved_units: 80,
    unit_cost_eur: 4.2,
    retail_price_eur: 16.9,
    wholesale_price_eur: 9.5,
    reorder_level: 120,
  },
  {
    id: 'prod-table-demo',
    sku: 'DA-GORDAL-350-2026',
    name: 'DonaAnna Gordal bordoliven 350 g',
    type: 'table_olives',
    batch_code: 'DA-BIAR-2026-TABLE-GORDAL-001',
    qr_slug: 'da-biar-2026-table-gordal-001',
    unit_size: '350 g',
    units_in_stock: 310,
    reserved_units: 30,
    unit_cost_eur: 2.1,
    retail_price_eur: 8.9,
    wholesale_price_eur: 5.2,
    reorder_level: 75,
  },
];

const demoCustomers: Customer[] = [
  { id: 'cust-market', name: 'Marked / direkte salg', type: 'market', city: 'Alicante', notes: 'Kontant/terminal ved marked og event.' },
  { id: 'cust-restaurant', name: 'Restaurant lead', type: 'restaurant', city: 'Costa Blanca', notes: 'Potensiell B2B-kunde for olje og bordoliven.' },
  { id: 'cust-shop', name: 'Delikatessebutikk lead', type: 'shop', city: 'Benidorm/Altea', notes: 'Mulig kommisjon eller grossistpris.' },
];

const demoOrders: Order[] = [
  {
    id: 'order-demo-1',
    order_no: 'DA-ORD-2026-001',
    customer_id: 'cust-market',
    customer_name: 'Marked / direkte salg',
    channel: 'market',
    status: 'paid',
    order_date: new Date().toISOString().slice(0, 10),
    product_id: 'prod-evoo-500-demo',
    product_name: 'DonaAnna EVOO 500 ml',
    quantity: 12,
    unit_price_eur: 16.9,
    paid_amount_eur: 202.8,
    notes: 'Demo markedssalg.',
  },
  {
    id: 'order-demo-2',
    order_no: 'DA-ORD-2026-002',
    customer_id: 'cust-restaurant',
    customer_name: 'Restaurant lead',
    channel: 'restaurant',
    status: 'confirmed',
    order_date: new Date().toISOString().slice(0, 10),
    product_id: 'prod-table-demo',
    product_name: 'DonaAnna Gordal bordoliven 350 g',
    quantity: 24,
    unit_price_eur: 5.2,
    paid_amount_eur: 0,
    notes: 'Demo B2B-bestilling.',
  },
];

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function channelLabel(channel: SalesChannel): string {
  const labels: Record<SalesChannel, string> = {
    market: 'Marked',
    b2b: 'B2B',
    online: 'Online',
    restaurant: 'Restaurant',
    farm_direct: 'Gård/direkte',
    event: 'Event',
  };
  return labels[channel];
}

function statusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    draft: 'Utkast',
    confirmed: 'Bekreftet',
    delivered: 'Levert',
    paid: 'Betalt',
    cancelled: 'Kansellert',
  };
  return labels[status];
}

function statusClass(status: OrderStatus): string {
  if (status === 'paid') return 'border-green-500/30 bg-green-500/10 text-green-400';
  if (status === 'delivered' || status === 'confirmed') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  if (status === 'cancelled') return 'border-red-500/30 bg-red-500/10 text-red-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function stockClass(product: Product): string {
  const available = product.units_in_stock - product.reserved_units;
  if (available <= product.reorder_level) return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (available <= product.reorder_level * 2) return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  return 'border-green-500/20 bg-green-500/10 text-green-400';
}

function makeOrderNo(): string {
  const year = new Date().getFullYear();
  return `DA-ORD-${year}-${String(Date.now()).slice(-4)}`;
}

const DonaAnnaSalesInventoryView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(() => getLocal('donaanna_products', demoProducts));
  const [customers] = useState<Customer[]>(() => getLocal('donaanna_customers', demoCustomers));
  const [orders, setOrders] = useState<Order[]>(() => getLocal('donaanna_orders', demoOrders));
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<Partial<Order>>({
    customer_id: customers[0]?.id,
    channel: 'market',
    status: 'confirmed',
    order_date: new Date().toISOString().slice(0, 10),
    product_id: products[0]?.id,
    quantity: 1,
    unit_price_eur: products[0]?.retail_price_eur || 0,
    notes: '',
  });

  const stats = useMemo(() => {
    const revenue = orders.filter(o => o.status !== 'cancelled').reduce((acc, order) => acc + order.quantity * order.unit_price_eur, 0);
    const paid = orders.reduce((acc, order) => acc + (order.paid_amount_eur || 0), 0);
    const reserved = products.reduce((acc, product) => acc + product.reserved_units, 0);
    const stockValueRetail = products.reduce((acc, product) => acc + Math.max(product.units_in_stock - product.reserved_units, 0) * product.retail_price_eur, 0);
    const lowStock = products.filter(product => product.units_in_stock - product.reserved_units <= product.reorder_level).length;
    const grossMargin = orders.filter(o => o.status !== 'cancelled').reduce((acc, order) => {
      const product = products.find(p => p.id === order.product_id);
      return acc + (order.unit_price_eur - (product?.unit_cost_eur || 0)) * order.quantity;
    }, 0);
    return { revenue, paid, reserved, stockValueRetail, lowStock, grossMargin };
  }, [orders, products]);

  const selectedProduct = products.find(product => product.id === orderForm.product_id) || products[0];
  const selectedCustomer = customers.find(customer => customer.id === orderForm.customer_id) || customers[0];

  const updateProductPrice = (productId: string, channel: SalesChannel) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const unitPrice = channel === 'b2b' || channel === 'restaurant' ? product.wholesale_price_eur : product.retail_price_eur;
    setOrderForm(prev => ({ ...prev, product_id: productId, unit_price_eur: unitPrice }));
  };

  const saveOrder = () => {
    if (!selectedProduct || !selectedCustomer) return;
    const quantity = Number(orderForm.quantity || 0);
    const unitPrice = Number(orderForm.unit_price_eur || 0);
    const order: Order = {
      id: `order-${Date.now()}`,
      order_no: makeOrderNo(),
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      channel: (orderForm.channel as SalesChannel) || 'market',
      status: (orderForm.status as OrderStatus) || 'confirmed',
      order_date: orderForm.order_date || new Date().toISOString().slice(0, 10),
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity,
      unit_price_eur: unitPrice,
      paid_amount_eur: orderForm.status === 'paid' ? quantity * unitPrice : Number(orderForm.paid_amount_eur || 0),
      notes: orderForm.notes,
    };
    const updatedOrders = [order, ...orders];
    const updatedProducts = products.map(product => product.id === selectedProduct.id ? {
      ...product,
      units_in_stock: product.units_in_stock - (order.status === 'delivered' || order.status === 'paid' ? quantity : 0),
      reserved_units: product.reserved_units + (order.status === 'confirmed' ? quantity : 0),
    } : product);
    setOrders(updatedOrders);
    setProducts(updatedProducts);
    saveLocal('donaanna_orders', updatedOrders);
    saveLocal('donaanna_products', updatedProducts);
    setIsOrderFormOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><ShoppingBag className="text-green-400" /> Salg og lager</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">DonaAnna · produkter · lager · B2B · marked · ordre</p>
        </div>
        <button onClick={() => setIsOrderFormOpen(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Plus size={20} /> Ny ordre</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Omsetning', value: `€${stats.revenue.toLocaleString('no-NO', { maximumFractionDigits: 0 })}`, icon: <Euro size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Betalt', value: `€${stats.paid.toLocaleString('no-NO', { maximumFractionDigits: 0 })}`, icon: <CheckCircle2 size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Dekningsbidrag', value: `€${stats.grossMargin.toLocaleString('no-NO', { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={18} />, cls: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' },
          { label: 'Lagerverdi', value: `€${stats.stockValueRetail.toLocaleString('no-NO', { maximumFractionDigits: 0 })}`, icon: <PackageCheck size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Reservert', value: stats.reserved, icon: <ClipboardList size={18} />, cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
          { label: 'Lav lager', value: stats.lowStock, icon: <Truck size={18} />, cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-2xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><PackageCheck size={14} /> Produkter og lager</h3>
          <div className="space-y-3">
            {products.map(product => {
              const available = product.units_in_stock - product.reserved_units;
              const marginRetail = product.retail_price_eur - product.unit_cost_eur;
              const marginWholesale = product.wholesale_price_eur - product.unit_cost_eur;
              return (
                <div key={product.id} className={`rounded-2xl p-4 border ${stockClass(product)}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="text-white font-bold">{product.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{product.sku} · {product.unit_size} · Batch {product.batch_code}</p>
                    </div>
                    <div className="text-right"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Tilgjengelig</p><p className="text-2xl font-black text-white">{available}</p></div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10"><p className="text-[9px] text-slate-500 uppercase font-bold">Lager</p><p className="text-xs text-white font-bold">{product.units_in_stock}</p></div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10"><p className="text-[9px] text-slate-500 uppercase font-bold">Retail</p><p className="text-xs text-white font-bold">€{product.retail_price_eur}</p></div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10"><p className="text-[9px] text-slate-500 uppercase font-bold">B2B</p><p className="text-xs text-white font-bold">€{product.wholesale_price_eur}</p></div>
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10"><p className="text-[9px] text-slate-500 uppercase font-bold">Margin</p><p className="text-xs text-white font-bold">€{marginRetail.toFixed(1)} / €{marginWholesale.toFixed(1)}</p></div>
                  </div>
                  {available <= product.reorder_level && <p className="text-xs text-red-300 mt-3 font-bold">Lav lagerbeholdning: vurder ny pakking/produksjon.</p>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><ReceiptText size={14} /> Ordrer</h3>
          <div className="space-y-3">
            {orders.map(order => (
              <div key={order.id} className={`rounded-2xl p-4 border ${statusClass(order.status)}`}>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-white font-bold">{order.order_no} · {order.customer_name}</p>
                    <p className="text-xs text-slate-500 mt-1">{order.order_date} · {channelLabel(order.channel)} · {statusLabel(order.status)}</p>
                  </div>
                  <div className="text-right"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Total</p><p className="text-2xl font-black text-white">€{(order.quantity * order.unit_price_eur).toFixed(2)}</p></div>
                </div>
                <p className="text-sm text-slate-400 mt-3">{order.quantity} × {order.product_name} à €{order.unit_price_eur}</p>
                {order.notes && <p className="text-xs text-slate-500 mt-2">{order.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={14} /> Kundetyper</h3>
          <div className="space-y-3">
            {customers.map(customer => <div key={customer.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/10"><p className="text-white font-bold">{customer.name}</p><p className="text-xs text-slate-500 mt-1">{customer.type} · {customer.city || '—'}</p><p className="text-xs text-slate-400 mt-2">{customer.notes}</p></div>)}
          </div>
        </div>
        <div className="xl:col-span-2 glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
          <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChart3 size={14} /> Beslutningsstøtte</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
            <p>• Bruk retailpris på marked, event og direkte salg.</p>
            <p>• Bruk grossistpris for restaurant, butikk og B2B ved volum.</p>
            <p>• Følg dekningsbidrag per produkt, ikke bare omsetning.</p>
            <p>• Reserverte enheter bør frigjøres eller faktureres raskt.</p>
            <p>• Lavt lager bør kobles til batch/produksjonsplan.</p>
            <p>• QR/batch bør brukes aktivt i B2B-salg som kvalitetsargument.</p>
          </div>
        </div>
      </div>

      {isOrderFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center"><div><h3 className="text-2xl font-bold text-white">Ny ordre</h3><p className="text-xs text-slate-500 mt-1">Registrer salg, reservasjon eller B2B-bestilling</p></div><button onClick={() => setIsOrderFormOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button></div>
            <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.customer_id} onChange={e => setOrderForm(p => ({ ...p, customer_id: e.target.value }))}>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
            <div className="grid grid-cols-2 gap-3"><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.channel} onChange={e => { const channel = e.target.value as SalesChannel; setOrderForm(p => ({ ...p, channel })); if (selectedProduct) updateProductPrice(selectedProduct.id, channel); }}><option value="market">Marked</option><option value="b2b">B2B</option><option value="online">Online</option><option value="restaurant">Restaurant</option><option value="farm_direct">Gård/direkte</option><option value="event">Event</option></select><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.status} onChange={e => setOrderForm(p => ({ ...p, status: e.target.value as OrderStatus }))}><option value="draft">Utkast</option><option value="confirmed">Bekreftet</option><option value="delivered">Levert</option><option value="paid">Betalt</option><option value="cancelled">Kansellert</option></select></div>
            <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.product_id} onChange={e => updateProductPrice(e.target.value, (orderForm.channel as SalesChannel) || 'market')}>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
            <div className="grid grid-cols-3 gap-3"><input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.order_date || ''} onChange={e => setOrderForm(p => ({ ...p, order_date: e.target.value }))} /><input type="number" min="1" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Antall" value={orderForm.quantity || ''} onChange={e => setOrderForm(p => ({ ...p, quantity: Number(e.target.value) }))} /><input type="number" step="0.01" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Pris" value={orderForm.unit_price_eur || ''} onChange={e => setOrderForm(p => ({ ...p, unit_price_eur: Number(e.target.value) }))} /></div>
            <textarea className="w-full min-h-[90px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white" placeholder="Notat" value={orderForm.notes || ''} onChange={e => setOrderForm(p => ({ ...p, notes: e.target.value }))} />
            <button onClick={saveOrder} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-2"><Save size={20} /> Lagre ordre</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonaAnnaSalesInventoryView;
