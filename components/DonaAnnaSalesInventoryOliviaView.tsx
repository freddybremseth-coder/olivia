import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Euro,
  Loader2,
  PackageCheck,
  Plus,
  ReceiptText,
  RefreshCcw,
  Save,
  ShoppingBag,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import { donaAnnaTraceUrl } from '../services/donaAnnaBrand';
import {
  createDonaAnnaOrder,
  fetchDonaAnnaCustomers,
  fetchDonaAnnaOrders,
  fetchDonaAnnaProducts,
  type DonaAnnaCustomer,
  type DonaAnnaOrderWithLines,
  type DonaAnnaProduct,
  type OrderStatus,
  type SalesChannel,
} from '../services/donaAnnaSales';

type LocalOrder = {
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

function flattenOrder(order: DonaAnnaOrderWithLines): LocalOrder {
  const line = order.lines[0];
  return {
    id: order.id,
    order_no: order.order_no,
    customer_id: order.customer_id || '',
    customer_name: order.customer_name,
    channel: order.channel,
    status: order.status,
    order_date: order.order_date,
    product_id: line?.product_id || '',
    product_name: line?.product_name || 'Uten produktlinje',
    quantity: line?.quantity || 0,
    unit_price_eur: line?.unit_price_eur || 0,
    paid_amount_eur: order.paid_amount_eur,
    notes: order.notes,
  };
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

function stockClass(product: DonaAnnaProduct): string {
  const available = product.units_in_stock - product.reserved_units;
  if (available <= product.reorder_level) return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (available <= product.reorder_level * 2) return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  return 'border-green-500/20 bg-green-500/10 text-green-400';
}

function makeOrderNo(): string {
  const year = new Date().getFullYear();
  return `DA-ORD-${year}-${String(Date.now()).slice(-4)}`;
}

const emptyOrderDate = () => new Date().toISOString().slice(0, 10);

const DonaAnnaSalesInventoryOliviaView: React.FC = () => {
  const [products, setProducts] = useState<DonaAnnaProduct[]>([]);
  const [customers, setCustomers] = useState<DonaAnnaCustomer[]>([]);
  const [orders, setOrders] = useState<LocalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [orderForm, setOrderForm] = useState<Partial<LocalOrder>>({
    channel: 'market',
    status: 'confirmed',
    order_date: emptyOrderDate(),
    quantity: 1,
    notes: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    setSaveError(null);
    try {
      const [remoteProducts, remoteCustomers, remoteOrders] = await Promise.all([
        fetchDonaAnnaProducts(),
        fetchDonaAnnaCustomers(),
        fetchDonaAnnaOrders(),
      ]);
      const activeProducts = remoteProducts.filter(product => product.is_active !== false);
      const flatOrders = remoteOrders.map(flattenOrder);
      setProducts(activeProducts);
      setCustomers(remoteCustomers);
      setOrders(flatOrders);
      setOrderForm(prev => {
        const firstProduct = activeProducts[0];
        const firstCustomer = remoteCustomers[0];
        return {
          ...prev,
          customer_id: prev.customer_id || firstCustomer?.id,
          product_id: prev.product_id || firstProduct?.id,
          unit_price_eur: prev.unit_price_eur || firstProduct?.retail_price_eur || 0,
        };
      });
    } catch (error: any) {
      console.warn('[DonaAnnaSalesInventoryOliviaView] loading failed', error);
      setSaveError(error?.message || 'Kunne ikke hente salg/lager fra olivia schema. Sjekk donaanna_products, donaanna_customers, donaanna_orders og RLS.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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

  const selectedProduct = products.find(product => product.id === orderForm.product_id);
  const selectedCustomer = customers.find(customer => customer.id === orderForm.customer_id);

  const updateProductPrice = (productId: string, channel: SalesChannel) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const unitPrice = channel === 'b2b' || channel === 'restaurant' ? product.wholesale_price_eur : product.retail_price_eur;
    setOrderForm(prev => ({ ...prev, product_id: productId, unit_price_eur: unitPrice }));
  };

  const saveOrder = async () => {
    if (!selectedProduct || !selectedCustomer) {
      setSaveError('Mangler produkt eller kunde. Opprett produkt/kunde i olivia schema først.');
      return;
    }
    setSaveError(null);
    const quantity = Number(orderForm.quantity || 0);
    const unitPrice = Number(orderForm.unit_price_eur || 0);
    const status = (orderForm.status as OrderStatus) || 'confirmed';
    const channel = (orderForm.channel as SalesChannel) || 'market';

    try {
      await createDonaAnnaOrder({
        customer: selectedCustomer,
        product: selectedProduct,
        order_no: makeOrderNo(),
        channel,
        status,
        order_date: orderForm.order_date || emptyOrderDate(),
        quantity,
        unit_price_eur: unitPrice,
        paid_amount_eur: status === 'paid' ? quantity * unitPrice : Number(orderForm.paid_amount_eur || 0),
        notes: orderForm.notes,
      });
      await loadData();
      setIsOrderFormOpen(false);
    } catch (error: any) {
      console.warn('[DonaAnnaSalesInventoryOliviaView] save order failed', error);
      setSaveError(error?.message || 'Kunne ikke lagre ordre i olivia schema. Sjekk migrasjon og RLS.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/5">
        <DonaAnnaBrandMark variant="symbol" size="md" />
        <p className="text-xs text-slate-500 mt-4 leading-relaxed max-w-3xl">
          Salg og lager er koblet mot ekte Doña Anna-data i Supabase `olivia` schema. Demo-data brukes ikke her.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><ShoppingBag className="text-green-400" /> Salg og lager</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Doña Anna · produkter · lager · B2B · marked · ordre · olivia schema</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <button onClick={() => setIsOrderFormOpen(true)} disabled={!products.length || !customers.length} className="bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:hover:bg-green-500 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Plus size={20} /> Ny ordre</button>
        </div>
      </div>

      {saveError && <div className="glass rounded-[2rem] p-5 border border-red-500/30 bg-red-500/10 text-red-100 text-sm flex gap-3"><AlertTriangle size={18} className="flex-shrink-0" /> <span>{saveError}</span></div>}

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
                      <p className="text-xs text-slate-500 mt-1">{product.sku} · {product.unit_size} · Batch {product.batch_code || '—'}</p>
                      {product.qr_slug && <a href={donaAnnaTraceUrl(product.qr_slug)} target="_blank" rel="noreferrer" className="text-[10px] text-[#d9b657] hover:text-yellow-300 mt-2 inline-block">Åpne QR / sporbarhet</a>}
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
            {!products.length && <p className="text-sm text-slate-500">Ingen produkter funnet i olivia.donaanna_products.</p>}
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
            {!orders.length && <p className="text-sm text-slate-500">Ingen ordre registrert i olivia.donaanna_orders ennå.</p>}
          </div>
        </div>
      </div>

      {isOrderFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center"><div><h3 className="text-2xl font-bold text-white">Ny ordre</h3><p className="text-xs text-slate-500 mt-1">Registrer salg, reservasjon eller B2B-bestilling</p></div><button onClick={() => setIsOrderFormOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button></div>
            <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.customer_id || ''} onChange={e => setOrderForm(p => ({ ...p, customer_id: e.target.value }))}>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
            <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.product_id || ''} onChange={e => updateProductPrice(e.target.value, (orderForm.channel as SalesChannel) || 'market')}>{products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
            <div className="grid grid-cols-2 gap-3"><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.channel} onChange={e => { const channel = e.target.value as SalesChannel; setOrderForm(p => ({ ...p, channel })); if (orderForm.product_id) updateProductPrice(orderForm.product_id, channel); }}><option value="market">Marked</option><option value="b2b">B2B</option><option value="restaurant">Restaurant</option><option value="online">Online</option><option value="farm_direct">Gård/direkte</option><option value="event">Event</option></select><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.status} onChange={e => setOrderForm(p => ({ ...p, status: e.target.value as OrderStatus }))}><option value="draft">Utkast</option><option value="confirmed">Bekreftet/reservert</option><option value="delivered">Levert</option><option value="paid">Betalt</option></select></div>
            <div className="grid grid-cols-3 gap-3"><input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.order_date || emptyOrderDate()} onChange={e => setOrderForm(p => ({ ...p, order_date: e.target.value }))} /><input type="number" min="1" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.quantity || 1} onChange={e => setOrderForm(p => ({ ...p, quantity: Number(e.target.value) }))} /><input type="number" step="0.01" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={orderForm.unit_price_eur || 0} onChange={e => setOrderForm(p => ({ ...p, unit_price_eur: Number(e.target.value) }))} /></div>
            <textarea className="w-full min-h-[100px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white" placeholder="Notat" value={orderForm.notes || ''} onChange={e => setOrderForm(p => ({ ...p, notes: e.target.value }))} />
            <button onClick={saveOrder} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-2"><Save size={20} /> Lagre ordre</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DonaAnnaSalesInventoryOliviaView;
