import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeEuro,
  Building2,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  ImagePlus,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  QrCode,
  ReceiptText,
  Save,
  Search,
  Send,
  ShoppingCart,
  Store,
  Tags,
  Trash2,
  Truck,
  UserCog,
  X,
} from 'lucide-react';
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
  commerceProductCollections,
  defaultCommerceProducts,
  deleteCommerceProduct,
  fetchCommerceProducts,
  uploadCommerceProductImage,
  upsertCommerceProduct,
} from '../services/commerceProducts';
import {
  CustomerPortalData,
  customerFromUser,
  fetchAdminPortalRows,
  fetchCustomerPortalData,
  placeCustomerOrder,
  saveCustomerProfile,
  sendCustomerMessage,
} from '../services/customerPortal';

type CommerceTab = 'overview' | 'products' | 'customers' | 'orders' | 'invoices' | 'shipments' | 'messages' | 'content';
type CustomerPortalTab = 'overview' | 'products' | 'orders' | 'invoices' | 'shipments' | 'qr' | 'messages' | 'profile';
type AdminRows = {
  customers: Array<Record<string, string | number>>;
  orders: Array<Record<string, string | number>>;
  invoices: Array<Record<string, string | number>>;
  shipments: Array<Record<string, string | number>>;
  messages: Array<Record<string, string | number>>;
};

const PRODUCT_STORAGE_KEY = 'olivia_commerce_products_v1';

const customers = [
  { company: 'Nordic Deli AS', contact: 'Ingrid Larsen', type: 'B2B forhandler', terms: 'Netto 14', status: 'Varm lead' },
  { company: 'Biar Gastro S.L.', contact: 'Mateo Ruiz', type: 'Restaurant', terms: 'Kontant', status: 'Aktiv kunde' },
  { company: 'Olive Club Norway', contact: 'Knut Berg', type: 'Abonnement', terms: 'Kort', status: 'Kundeportal' },
];

const orders = [
  { no: 'DA-2026-0018', customer: 'Biar Gastro S.L.', items: '24 x Verde Alto · 6 x Mesa', amount: '€468.00', status: 'Pakkes', next: 'Send traceability-link' },
  { no: 'DA-2026-0017', customer: 'Nordic Deli AS', items: '72 x Verde Alto · 12 x Verde Vivo', amount: '€1 702.80', status: 'Tilbud', next: 'Godkjenn B2B-pris' },
  { no: 'DA-2026-0016', customer: 'Restaurante Alicante', items: '2 x Cocina Viva 5 L', amount: 'B2B quote', status: 'Tasting kit', next: 'Følg opp kjøkkensjef' },
];

const invoices = [
  { no: 'INV-2026-0042', order: 'DA-2026-0018', customer: 'Biar Gastro S.L.', due: '02.05.2026', total: '€696.00', status: 'Utkast' },
  { no: 'INV-2026-0041', order: 'DA-2026-0016', customer: 'Olive Club Norway', due: '30.04.2026', total: '€226.80', status: 'Sendt' },
  { no: 'INV-2026-0040', order: 'DA-2026-0014', customer: 'Casa Verde', due: '21.04.2026', total: '€410.00', status: 'Betalt' },
];

const shipments = [
  { order: 'DA-2026-0018', customer: 'Biar Gastro S.L.', carrier: 'DHL', tracking: 'DA-TRACE-1842', status: 'På vei' },
];

const contentItems = [
  { name: 'Ordrebekreftelse', use: 'Sendes automatisk etter B2B/kundeordre', owner: 'Admin', status: 'Må kobles' },
  { name: 'Faktura-e-post', use: 'PDF, betalingsfrist og sporingskode', owner: 'Admin', status: 'Utkast' },
  { name: 'Produktark', use: 'Brukes på web, B2B og QR-side', owner: 'Produkt', status: 'Aktiv' },
  { name: 'Batch-fortelling', use: 'Tekst fra Olivia-produksjon til flaskens QR-side', owner: 'Olivia OS', status: 'Ny' },
];

const emptyProduct = (): CommerceProduct => ({
  id: `p-${Date.now()}`,
  sku: '',
  name: '',
  size: '',
  channel: '',
  stock: 0,
  price: '',
  status: 'Utkast',
  description: '',
  collections: [],
  imageUrl: '',
});

interface CommerceHubProps {
  user?: UserProfile;
  mode?: 'backend' | 'customer';
}

const CommerceHub: React.FC<CommerceHubProps> = ({ user, mode = 'backend' }) => {
  if (mode === 'customer' && user) return <CustomerPortal user={user} />;

  const [activeTab, setActiveTab] = useState<CommerceTab>('products');
  const [adminRows, setAdminRows] = useState<AdminRows>({
    customers,
    orders,
    invoices,
    shipments,
    messages: [],
  });

  useEffect(() => {
    let cancelled = false;
    fetchAdminPortalRows()
      .then(rows => {
        if (cancelled) return;
        setAdminRows({
          customers: rows.customers.length ? rows.customers : customers,
          orders: rows.orders.length ? rows.orders : orders,
          invoices: rows.invoices.length ? rows.invoices : invoices,
          shipments: rows.shipments,
          messages: rows.messages,
        });
      })
      .catch(error => console.warn('[commerce] admin rows failed', error));
    return () => { cancelled = true; };
  }, []);

  const tabs: Array<{ id: CommerceTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Oversikt', icon: Store },
    { id: 'products', label: 'Produkter', icon: Package },
    { id: 'customers', label: 'Kunder/B2B', icon: Building2 },
    { id: 'orders', label: 'Ordre', icon: ShoppingCart },
    { id: 'invoices', label: 'Faktura', icon: ReceiptText },
    { id: 'shipments', label: 'Forsendelser', icon: Truck },
    { id: 'messages', label: 'Meldinger', icon: MessageSquare },
    { id: 'content', label: 'Tekster', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Doña Anna Commerce</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Backend for produkter, priser, ordre og faktura</h2>
          <p className="mt-2 max-w-3xl text-slate-400">
            Her administrerer du produktene som vises på websiden og i B2B-portalen: navn, størrelser, bilder, priser, lager, kolleksjoner og etikettdata.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setActiveTab('products')} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-black">
            <Package size={17} /> Endre produkter
          </button>
          <button onClick={() => setActiveTab('orders')} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
            <ShoppingCart size={17} /> Se ordre
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Produktverdi', value: '€12 304', icon: BadgeEuro, tone: 'text-amber-300 bg-amber-300/10' },
          { label: 'Åpne ordre', value: '3', icon: ShoppingCart, tone: 'text-blue-300 bg-blue-300/10' },
          { label: 'Flasker på lager', value: '1 600', icon: Package, tone: 'text-green-300 bg-green-300/10' },
          { label: 'Faktura til oppfølging', value: '2', icon: ReceiptText, tone: 'text-purple-300 bg-purple-300/10' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}>
              <stat.icon size={22} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                activeTab === tab.id ? 'bg-amber-300 text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon size={17} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && <CommerceOverview />}
      {activeTab === 'products' && <ProductCatalog />}
      {activeTab === 'customers' && <DataTable title="Kunder og B2B-kontoer" rows={adminRows.customers} />}
      {activeTab === 'orders' && <DataTable title="Ordre og tilbud" rows={adminRows.orders} />}
      {activeTab === 'invoices' && <DataTable title="Faktura og betaling" rows={adminRows.invoices} />}
      {activeTab === 'shipments' && <DataTable title="Forsendelser og sporing" rows={adminRows.shipments} />}
      {activeTab === 'messages' && <DataTable title="Kundemeldinger fra B2B-portalen" rows={adminRows.messages} />}
      {activeTab === 'content' && <DataTable title="Tekster, e-postmaler og produktark" rows={contentItems} />}
    </div>
  );
};

function CommerceOverview() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-xl font-bold text-white">Anbefalt sammenslåing</h3>
        <div className="mt-5 space-y-4">
          {[
            ['Olivia OS', 'Gårdsdrift, parseller, høst, batch, kvalitet, oppgaver og sensorikk. Dette er kilden til sannheten.'],
            ['Produktkatalog', 'Produkter, bilder, priser, lager og kolleksjoner styres ett sted og kan publiseres videre.'],
            ['B2B/kundeportal', 'Innlogging for forhandlere og kunder med egne priser, ordrestatus, faktura, produktark og sporbarhet.'],
            ['donaanna.com', 'Offentlig merkevare, produktfortelling, kunnskap, lead-skjema og QR-sider fra batchdata.'],
          ].map(([title, text]) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-white/8 bg-black/20 p-4">
              <CheckCircle2 className="mt-1 text-green-300" size={20} />
              <div>
                <p className="font-bold text-white">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-xl font-bold text-white">Sømløs ordre-flyt</h3>
        <div className="mt-5 space-y-3 text-sm text-slate-300">
          {['B2B-kunde logger inn og ser egne priser', 'Ordre reserverer lager og knyttes til batch', 'Admin godkjenner, pakker og sender', 'Faktura genereres fra samme ordrelinjer', 'Kunde ser status, faktura og QR-sporbarhet'].map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-xl bg-black/20 p-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-300 text-xs font-bold text-black">{index + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomerPortal({ user }: { user: UserProfile }) {
  const [activeTab, setActiveTab] = useState<CustomerPortalTab>('overview');
  const [products, setProducts] = useState<CommerceProduct[]>(defaultCommerceProducts);
  const [portalData, setPortalData] = useState<CustomerPortalData>(() => ({
    customer: customerFromUser(user),
    orders: [],
    invoices: [],
    shipments: [],
    messages: [],
  }));
  const [selectedProductId, setSelectedProductId] = useState(defaultCommerceProducts[0]?.id ?? '');
  const [quantity, setQuantity] = useState(6);
  const [orderNote, setOrderNote] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [statusMessage, setStatusMessage] = useState('Henter kundeportal...');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCommerceProducts({ publicOnly: true }),
      fetchCustomerPortalData(user),
    ]).then(([productRows, data]) => {
      if (cancelled) return;
      setProducts(productRows);
      setSelectedProductId(productRows[0]?.id ?? '');
      setPortalData(data);
      setStatusMessage('Kundeportalen er koblet til Olivia OS.');
    }).catch(error => {
      if (cancelled) return;
      setStatusMessage(error instanceof Error ? error.message : 'Kundeportalen bruker lokale data akkurat nå.');
    });
    return () => { cancelled = true; };
  }, [user]);

  const selectedProduct = products.find(product => product.id === selectedProductId) ?? products[0];
  const tabs: Array<{ id: CustomerPortalTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Oversikt', icon: Store },
    { id: 'products', label: 'Produkter', icon: Package },
    { id: 'orders', label: 'Ordre', icon: ShoppingCart },
    { id: 'invoices', label: 'Faktura', icon: ReceiptText },
    { id: 'shipments', label: 'Forsendelser', icon: Truck },
    { id: 'qr', label: 'QR-koder', icon: QrCode },
    { id: 'messages', label: 'Meldinger', icon: MessageSquare },
    { id: 'profile', label: 'Min konto', icon: UserCog },
  ];

  const submitOrder = async () => {
    if (!selectedProduct) return;
    setStatusMessage('Sender ordre til Olivia OS...');
    try {
      const order = await placeCustomerOrder(portalData.customer, selectedProduct, quantity, orderNote);
      setPortalData(current => ({ ...current, orders: [order, ...current.orders] }));
      setOrderNote('');
      setStatusMessage('Ordren er sendt. Du ser den nå i portalen, og Olivia OS mottar den i ordrelisten.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Kunne ikke sende ordren akkurat nå.');
    }
  };

  const submitMessage = async () => {
    if (!messageSubject.trim() || !messageBody.trim()) return;
    setStatusMessage('Sender melding til Olivia OS...');
    try {
      const message = await sendCustomerMessage(portalData.customer, user.id, messageSubject.trim(), messageBody.trim());
      setPortalData(current => ({ ...current, messages: [message, ...current.messages] }));
      setMessageSubject('');
      setMessageBody('');
      setStatusMessage('Meldingen er sendt til Olivia OS.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Kunne ikke sende meldingen akkurat nå.');
    }
  };

  const saveProfile = async (customer: B2BCustomerProfile) => {
    setStatusMessage('Oppdaterer kundedata i Supabase...');
    try {
      const saved = await saveCustomerProfile(user, customer);
      setPortalData(current => ({ ...current, customer: saved }));
      setStatusMessage('Kundedata er oppdatert og brukes videre på ordre, faktura og forsendelser.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Kundedata ble bare lagret lokalt.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Doña Anna B2B Portal</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Velkommen, {portalData.customer.company || portalData.customer.contactName}</h2>
          <p className="mt-2 max-w-3xl text-slate-400">
            Se ordre, fakturaer, forsendelser, QR-sporbarhet og produktinformasjon. Bestill nye produkter eller send en beskjed direkte til Doña Anna.
          </p>
        </div>
        <button
          onClick={() => setActiveTab('products')}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-black"
        >
          <ShoppingCart size={17} /> Bestill produkter
        </button>
      </div>

      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
        {statusMessage}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-2">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${
                activeTab === tab.id ? 'bg-amber-300 text-black' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <tab.icon size={17} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && <CustomerOverview data={portalData} onNavigate={setActiveTab} />}
      {activeTab === 'products' && (
        <CustomerProducts
          products={products}
          selectedProduct={selectedProduct}
          selectedProductId={selectedProductId}
          quantity={quantity}
          orderNote={orderNote}
          onProductChange={setSelectedProductId}
          onQuantityChange={setQuantity}
          onNoteChange={setOrderNote}
          onSubmitOrder={submitOrder}
        />
      )}
      {activeTab === 'orders' && <CustomerOrders orders={portalData.orders} />}
      {activeTab === 'invoices' && <CustomerInvoices invoices={portalData.invoices} />}
      {activeTab === 'shipments' && <CustomerShipments shipments={portalData.shipments} />}
      {activeTab === 'qr' && <CustomerQr products={products} orders={portalData.orders} />}
      {activeTab === 'messages' && (
        <CustomerMessages
          messages={portalData.messages}
          subject={messageSubject}
          body={messageBody}
          onSubjectChange={setMessageSubject}
          onBodyChange={setMessageBody}
          onSubmit={submitMessage}
        />
      )}
      {activeTab === 'profile' && <CustomerProfilePanel customer={portalData.customer} onSave={saveProfile} />}
    </div>
  );
}

function CustomerOverview({ data, onNavigate }: { data: CustomerPortalData; onNavigate: (tab: CustomerPortalTab) => void }) {
  const stats = [
    { label: 'Ordre', value: data.orders.length, icon: ShoppingCart },
    { label: 'Fakturaer', value: data.invoices.length, icon: ReceiptText },
    { label: 'Forsendelser', value: data.shipments.length, icon: Truck },
    { label: 'Meldinger', value: data.messages.length, icon: MessageSquare },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div className="grid gap-4 sm:grid-cols-2">
        {stats.map(stat => (
          <button key={stat.label} onClick={() => onNavigate(stat.label === 'Ordre' ? 'orders' : stat.label === 'Fakturaer' ? 'invoices' : stat.label === 'Forsendelser' ? 'shipments' : 'messages')} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left hover:bg-white/[0.07]">
            <stat.icon className="text-amber-300" size={24} />
            <p className="mt-5 text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-white">{stat.value}</p>
          </button>
        ))}
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-xl font-bold text-white">Din B2B-konto</h3>
        <div className="mt-5 grid gap-3 text-sm text-slate-300">
          <InfoLine label="Kontakt" value={data.customer.contactName} />
          <InfoLine label="Firma" value={data.customer.company || '-'} />
          <InfoLine label="E-post" value={data.customer.email} />
          <InfoLine label="Levering" value={data.customer.shippingAddress || 'Legg inn leveringsadresse'} />
        </div>
        <button onClick={() => onNavigate('profile')} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">
          <UserCog size={17} /> Oppdater kundedata
        </button>
      </div>
    </div>
  );
}

function CustomerProducts(props: {
  products: CommerceProduct[];
  selectedProduct?: CommerceProduct;
  selectedProductId: string;
  quantity: number;
  orderNote: string;
  onProductChange: (id: string) => void;
  onQuantityChange: (quantity: number) => void;
  onNoteChange: (note: string) => void;
  onSubmitOrder: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="grid gap-4 md:grid-cols-2">
        {props.products.map(product => (
          <article key={product.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="h-56 bg-black">
              {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600"><ImagePlus size={34} /></div>}
            </div>
            <div className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">{product.sku}</p>
              <h3 className="mt-2 text-xl font-bold text-white">{product.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{product.size} · {product.price}</p>
              <p className="mt-4 min-h-16 text-sm leading-6 text-slate-300">{product.publicStory || product.description}</p>
              <a
                href={`data:text/plain;charset=utf-8,${encodeURIComponent(`${product.name}\n${product.description}\n${product.labelMaterial || ''}`)}`}
                download={`${product.sku || product.name}-produktark.txt`}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white"
              >
                <Download size={14} /> Last ned produktark
              </a>
            </div>
          </article>
        ))}
      </div>
      <aside className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-xl font-bold text-white">Bestill nye produkter</h3>
        <div className="mt-5 space-y-4">
          <Field label="Produkt">
            <select value={props.selectedProductId} onChange={event => props.onProductChange(event.target.value)} className="form-input">
              {props.products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.size}</option>)}
            </select>
          </Field>
          <Field label="Antall">
            <input type="number" min={1} value={props.quantity} onChange={event => props.onQuantityChange(Math.max(1, Number(event.target.value)))} className="form-input" />
          </Field>
          <Field label="Beskjed til Doña Anna">
            <textarea value={props.orderNote} onChange={event => props.onNoteChange(event.target.value)} className="min-h-28 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-amber-300/60" placeholder="Ønsket leveringsdato, restaurant, spesielle behov..." />
          </Field>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            <p className="font-bold text-white">{props.selectedProduct?.name}</p>
            <p className="mt-1">{props.selectedProduct?.price} · lager {props.selectedProduct?.stock}</p>
          </div>
          <button onClick={props.onSubmitOrder} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-bold text-black hover:bg-amber-200">
            <Send size={17} /> Send ordre
          </button>
        </div>
      </aside>
    </div>
  );
}

function CustomerOrders({ orders }: { orders: CommerceOrder[] }) {
  return <CustomerList title="Mine ordre" empty="Ingen ordre ennå." rows={orders.map(order => ({ title: order.orderNumber, meta: order.items.map(item => `${item.quantity} x ${item.name}`).join(', '), status: `${order.status} · ${order.paymentStatus}`, amount: formatMoney(order.totalAmount, order.currency) }))} />;
}

function CustomerInvoices({ invoices }: { invoices: CommerceInvoice[] }) {
  return <CustomerList title="Mine fakturaer" empty="Ingen fakturaer ennå." rows={invoices.map(invoice => ({ title: invoice.invoiceNumber, meta: `Forfall ${invoice.dueDate || '-'}`, status: invoice.status, amount: formatMoney(invoice.totalAmount, invoice.currency), href: invoice.pdfUrl }))} />;
}

function CustomerShipments({ shipments }: { shipments: CommerceShipment[] }) {
  return <CustomerList title="Mine forsendelser" empty="Ingen forsendelser ennå." rows={shipments.map(shipment => ({ title: shipment.trackingNumber || shipment.id, meta: `${shipment.carrier || 'Transportør'} · ordre ${shipment.orderId || '-'}`, status: shipment.status, amount: shipment.trackingUrl ? 'Spor pakke' : '' }))} />;
}

function CustomerQr({ products, orders }: { products: CommerceProduct[]; orders: CommerceOrder[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {products.slice(0, 6).map(product => (
        <div key={product.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-white/10 bg-white text-black">
            <QrCode size={78} />
          </div>
          <h3 className="mt-5 text-lg font-bold text-white">{product.name}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">QR-koden viser produktark, batch, høstedato og sporbarhet når batch er koblet i Olivia OS.</p>
        </div>
      ))}
      {orders.map(order => (
        <div key={order.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <QrCode className="text-amber-300" size={34} />
          <h3 className="mt-5 text-lg font-bold text-white">{order.orderNumber}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">Ordrebasert QR for faktura, forsendelse og dokumentasjon.</p>
        </div>
      ))}
    </div>
  );
}

function CustomerMessages(props: {
  messages: CommerceMessage[];
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h3 className="text-xl font-bold text-white">Send melding</h3>
        <div className="mt-5 space-y-4">
          <Field label="Emne"><input value={props.subject} onChange={event => props.onSubjectChange(event.target.value)} className="form-input" /></Field>
          <Field label="Melding"><textarea value={props.body} onChange={event => props.onBodyChange(event.target.value)} className="min-h-40 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-amber-300/60" /></Field>
          <button onClick={props.onSubmit} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-bold text-black hover:bg-amber-200">
            <Send size={17} /> Send til Olivia OS
          </button>
        </div>
      </div>
      <CustomerList title="Tidligere meldinger" empty="Ingen meldinger ennå." rows={props.messages.map(message => ({ title: message.subject, meta: message.body, status: message.status, amount: new Date(message.createdAt).toLocaleDateString('no-NO') }))} />
    </div>
  );
}

function CustomerProfilePanel({ customer, onSave }: { customer: B2BCustomerProfile; onSave: (customer: B2BCustomerProfile) => void }) {
  const [draft, setDraft] = useState(customer);
  useEffect(() => setDraft(customer), [customer]);
  const update = <K extends keyof B2BCustomerProfile>(field: K, value: B2BCustomerProfile[K]) => setDraft(current => ({ ...current, [field]: value }));

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-xl font-bold text-white">Min konto og leveringsinformasjon</h3>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Navn"><input value={draft.contactName} onChange={event => update('contactName', event.target.value)} className="form-input" /></Field>
        <Field label="Firma"><input value={draft.company} onChange={event => update('company', event.target.value)} className="form-input" /></Field>
        <Field label="E-post"><input value={draft.email} onChange={event => update('email', event.target.value)} className="form-input" /></Field>
        <Field label="Telefon"><input value={draft.phone || ''} onChange={event => update('phone', event.target.value)} className="form-input" /></Field>
        <Field label="VAT / org.nr."><input value={draft.taxId || ''} onChange={event => update('taxId', event.target.value)} className="form-input" /></Field>
        <Field label="Betalingsvilkår"><input value={draft.paymentTerms} onChange={event => update('paymentTerms', event.target.value)} className="form-input" /></Field>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Fakturaadresse"><textarea value={draft.billingAddress || ''} onChange={event => update('billingAddress', event.target.value)} className="min-h-28 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-amber-300/60" /></Field>
        <Field label="Leveringsadresse"><textarea value={draft.shippingAddress || ''} onChange={event => update('shippingAddress', event.target.value)} className="min-h-28 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-amber-300/60" /></Field>
      </div>
      <button onClick={() => onSave(draft)} className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 text-sm font-bold text-black hover:bg-amber-200">
        <Save size={17} /> Lagre konto
      </button>
    </div>
  );
}

function CustomerList({ title, empty, rows }: { title: string; empty: string; rows: Array<{ title: string; meta: string; status: string; amount: string; href?: string }> }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <div className="mt-5 space-y-3">
        {rows.length === 0 && <p className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-400">{empty}</p>}
        {rows.map(row => (
          <div key={`${row.title}-${row.status}`} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold text-white">{row.title}</p>
              <p className="mt-1 text-sm text-slate-400">{row.meta}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200">{row.status}</span>
              {row.href ? <a href={row.href} className="text-sm font-bold text-white">Last ned</a> : <span className="text-sm font-bold text-white">{row.amount}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-black/20 p-3">
      <MapPin className="mt-0.5 text-amber-300" size={16} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="mt-1 text-white">{value}</p>
      </div>
    </div>
  );
}

function formatMoney(value: number, currency = 'EUR') {
  return `${currency === 'EUR' ? '€' : currency} ${value.toFixed(2)}`;
}

export function ProductCatalog() {
  const [products, setProducts] = useState<CommerceProduct[]>(() => {
    if (typeof localStorage === 'undefined') return defaultCommerceProducts;
    try {
      const stored = localStorage.getItem(PRODUCT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultCommerceProducts;
    } catch {
      return defaultCommerceProducts;
    }
  });
  const [query, setQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState('Alle');
  const [selectedProduct, setSelectedProduct] = useState<CommerceProduct | null>(products[0] ?? null);
  const [editingProduct, setEditingProduct] = useState<CommerceProduct | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('loading');
  const [syncMessage, setSyncMessage] = useState('Henter produkter fra Supabase...');

  useEffect(() => {
    let cancelled = false;
    fetchCommerceProducts()
      .then(rows => {
        if (cancelled) return;
        setProducts(rows);
        setSelectedProduct(current => current ? rows.find(row => row.id === current.id) ?? rows[0] ?? null : rows[0] ?? null);
        setSyncStatus('idle');
        setSyncMessage('Koblet til produktkatalogen.');
      })
      .catch(error => {
        if (cancelled) return;
        setSyncStatus('error');
        setSyncMessage(error instanceof Error ? error.message : 'Kunne ikke hente produkter fra Supabase.');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter(product => {
      const matchesSearch = !normalized || [product.sku, product.name, product.channel, product.description, product.collections.join(' ')].join(' ').toLowerCase().includes(normalized);
      const matchesCollection = collectionFilter === 'Alle' || product.collections.includes(collectionFilter);
      return matchesSearch && matchesCollection;
    });
  }, [products, query, collectionFilter]);

  const saveProduct = (product: CommerceProduct) => {
    const cleaned: CommerceProduct = {
      ...product,
      sku: product.sku.trim(),
      name: product.name.trim(),
      price: product.price.trim(),
      size: product.size.trim(),
      channel: product.channel.trim(),
      description: product.description.trim(),
      collections: [...new Set(product.collections)].filter(Boolean),
      publicStory: product.publicStory || product.description,
      isPublic: product.isPublic ?? true,
    };
    if (!cleaned.sku || !cleaned.name) return;
    setSyncStatus('saving');
    setSyncMessage('Lagrer produkt i Supabase...');
    setProducts(current => {
      const exists = current.some(item => item.id === cleaned.id);
      return exists ? current.map(item => (item.id === cleaned.id ? cleaned : item)) : [cleaned, ...current];
    });
    setSelectedProduct(cleaned);
    setEditingProduct(null);
    upsertCommerceProduct(cleaned)
      .then(() => {
        setSyncStatus('idle');
        setSyncMessage('Produktet er lagret og kan brukes i admin, B2B og på websiden.');
      })
      .catch(error => {
        setSyncStatus('error');
        setSyncMessage(error instanceof Error ? error.message : 'Produktet ble bare lagret lokalt.');
      });
  };

  const deleteProduct = (product: CommerceProduct) => {
    if (!confirm(`Slette produktet "${product.name}" fra produktkatalogen?`)) return;
    setProducts(current => current.filter(item => item.id !== product.id));
    if (selectedProduct?.id === product.id) {
      const next = products.find(item => item.id !== product.id) ?? null;
      setSelectedProduct(next);
    }
    setSyncStatus('saving');
    setSyncMessage('Sletter produkt fra Supabase...');
    deleteCommerceProduct(product.id)
      .then(() => {
        setSyncStatus('idle');
        setSyncMessage('Produktet er slettet fra felles produktkatalog.');
      })
      .catch(error => {
        setSyncStatus('error');
        setSyncMessage(error instanceof Error ? error.message : 'Produktet ble bare slettet lokalt.');
      });
  };

  const groupedCounts = commerceProductCollections.map(collection => ({
    collection,
    count: products.filter(product => product.collections.includes(collection)).length,
  }));

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04]">
        <div className="flex flex-col gap-4 border-b border-white/10 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Produktkatalog</h3>
            <p className="mt-1 text-sm text-slate-500">Åpne, opprett, slett, legg inn bilder og plasser produkter i kolleksjoner.</p>
          </div>
          <button
            onClick={() => setEditingProduct(emptyProduct())}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-bold text-black transition hover:bg-amber-200"
          >
            <Plus size={17} /> Nytt produkt
          </button>
        </div>

        {syncMessage && (
          <div className={`mx-5 mt-5 rounded-2xl border px-4 py-3 text-sm ${
            syncStatus === 'error'
              ? 'border-red-400/20 bg-red-500/10 text-red-200'
              : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
          }`}>
            {syncMessage}
          </div>
        )}

        <div className="grid gap-3 border-b border-white/10 p-5 lg:grid-cols-[1fr_240px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 text-sm text-white outline-none focus:border-amber-300/60"
              placeholder="Søk produkt, SKU, kanal eller kolleksjon..."
            />
          </div>
          <select
            value={collectionFilter}
            onChange={event => setCollectionFilter(event.target.value)}
            className="h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-amber-300/60"
          >
            <option>Alle</option>
            {commerceProductCollections.map(collection => (
              <option key={collection}>{collection}</option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-2">
          {visibleProducts.map(product => (
            <article key={product.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <button onClick={() => setSelectedProduct(product)} className="block w-full text-left">
                <div className="h-48 bg-black">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-600">
                      <ImagePlus size={34} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">{product.sku || 'Uten SKU'}</p>
                      <h4 className="mt-1 text-lg font-bold text-white">{product.name || 'Nytt produkt'}</h4>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${product.status === 'Aktiv' ? 'bg-green-300/10 text-green-300' : product.status === 'Utsolgt' ? 'bg-red-300/10 text-red-300' : 'bg-white/10 text-slate-300'}`}>
                      {product.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{product.size} · {product.channel}</p>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{product.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.collections.slice(0, 3).map(collection => (
                      <span key={collection} className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">
                        {collection}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
              <div className="flex gap-2 border-t border-white/10 p-3">
                <button onClick={() => setSelectedProduct(product)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">
                  <Eye size={14} /> Åpne
                </button>
                <button onClick={() => setEditingProduct(product)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">
                  <Save size={14} /> Rediger
                </button>
                <button onClick={() => deleteProduct(product)} className="inline-flex items-center justify-center rounded-xl border border-red-400/20 px-3 py-2 text-red-300 hover:bg-red-500/10">
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <aside className="space-y-6">
        <ProductDetail product={selectedProduct} onEdit={setEditingProduct} onDelete={deleteProduct} />
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center gap-2">
            <Tags className="text-amber-300" size={20} />
            <h3 className="font-bold text-white">Kolleksjoner</h3>
          </div>
          <div className="mt-4 grid gap-2">
            {groupedCounts.map(({ collection, count }) => (
              <button
                key={collection}
                onClick={() => setCollectionFilter(collection)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${collectionFilter === collection ? 'border-amber-300 bg-amber-300 text-black' : 'border-white/10 bg-black/20 text-slate-300 hover:text-white'}`}
              >
                <span>{collection}</span>
                <span className="font-bold">{count}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {editingProduct && (
        <ProductEditor
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={saveProduct}
        />
      )}
    </div>
  );
}

function ProductDetail({ product, onEdit, onDelete }: {
  product: CommerceProduct | null;
  onEdit: (product: CommerceProduct) => void;
  onDelete: (product: CommerceProduct) => void;
}) {
  if (!product) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-slate-400">
        Velg et produkt for å se detaljer.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="h-72 bg-black">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-600">
            <ImagePlus size={42} />
          </div>
        )}
      </div>
      <div className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-300">{product.sku}</p>
        <h3 className="mt-2 text-2xl font-bold text-white">{product.name}</h3>
        <p className="mt-2 text-sm text-slate-400">{product.size} · {product.channel}</p>
        <p className="mt-5 leading-7 text-slate-300">{product.description || 'Ingen produktbeskrivelse ennå.'}</p>
        <dl className="mt-6 grid grid-cols-2 gap-3">
          {[
            ['Pris', product.price || '-'],
            ['Lager', product.stock],
            ['Status', product.status],
            ['Kolleksjoner', product.collections.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</dt>
              <dd className="mt-1 font-bold text-white">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          {product.collections.map(collection => (
            <span key={collection} className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              {collection}
            </span>
          ))}
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={() => onEdit(product)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-black">
            <Save size={16} /> Rediger
          </button>
          <button onClick={() => onDelete(product)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/20 px-4 py-3 text-sm font-bold text-red-300 hover:bg-red-500/10">
            <Trash2 size={16} /> Slett
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductEditor({ product, onClose, onSave }: {
  product: CommerceProduct;
  onClose: () => void;
  onSave: (product: CommerceProduct) => void;
}) {
  const [draft, setDraft] = useState<CommerceProduct>(product);
  const [imageStatus, setImageStatus] = useState<'idle' | 'uploading' | 'ready' | 'error'>('idle');
  const [imageMessage, setImageMessage] = useState('');

  const update = <K extends keyof CommerceProduct>(field: K, value: CommerceProduct[K]) => {
    setDraft(current => ({ ...current, [field]: value }));
  };

  const toggleCollection = (collection: string) => {
    setDraft(current => ({
      ...current,
      collections: current.collections.includes(collection)
        ? current.collections.filter(item => item !== collection)
        : [...current.collections, collection],
    }));
  };

  const handleImageFile = async (file?: File) => {
    if (!file) return;
    setImageStatus('uploading');
    setImageMessage('Laster inn bildet...');
    try {
      const url = await uploadCommerceProductImage(file, draft.id);
      update('imageUrl', url);
      setImageStatus('ready');
      setImageMessage(url.startsWith('data:')
        ? 'Bildet vises nå. Kjør Supabase-migrasjonen for permanent skylagring.'
        : 'Bildet er lastet opp og klart til lagring.');
    } catch (error) {
      setImageStatus('error');
      setImageMessage(error instanceof Error ? error.message : 'Kunne ikke laste opp bildet.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#101011] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#101011]/95 p-5 backdrop-blur">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Produkt</p>
            <h3 className="mt-1 text-xl font-bold text-white">{draft.name || 'Nytt produkt'}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
              <div className="flex aspect-square items-center justify-center">
                {draft.imageUrl ? (
                  <img src={draft.imageUrl} alt={draft.name || 'Produktbilde'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <ImagePlus size={42} />
                    <span className="text-sm">Legg til produktbilde</span>
                  </div>
                )}
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">
              <ImagePlus size={17} /> {imageStatus === 'uploading' ? 'Laster bilde...' : 'Last opp bilde'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={event => {
                  handleImageFile(event.target.files?.[0]);
                  event.currentTarget.value = '';
                }}
              />
            </label>
            {imageMessage && (
              <p className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                imageStatus === 'error'
                  ? 'border-red-400/20 bg-red-500/10 text-red-200'
                  : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
              }`}>
                {imageMessage}
              </p>
            )}
            <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-slate-500">Bilde-URL</label>
            <input
              value={draft.imageUrl || ''}
              onChange={event => update('imageUrl', event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-amber-300/60"
              placeholder="/donaanna/product-design/..."
            />
          </div>

          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault();
              onSave(draft);
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Produktnavn">
                <input required value={draft.name} onChange={event => update('name', event.target.value)} className="form-input" />
              </Field>
              <Field label="SKU">
                <input required value={draft.sku} onChange={event => update('sku', event.target.value)} className="form-input" />
              </Field>
              <Field label="Størrelse">
                <input value={draft.size} onChange={event => update('size', event.target.value)} className="form-input" placeholder="500 ml" />
              </Field>
              <Field label="Pris">
                <input value={draft.price} onChange={event => update('price', event.target.value)} className="form-input" placeholder="€24.90 / B2B quote" />
              </Field>
              <Field label="Lager">
                <input type="number" value={draft.stock} onChange={event => update('stock', Number(event.target.value))} className="form-input" />
              </Field>
              <Field label="Status">
                <select value={draft.status} onChange={event => update('status', event.target.value as CommerceProduct['status'])} className="form-input">
                  <option>Aktiv</option>
                  <option>Utkast</option>
                  <option>Utsolgt</option>
                  <option>Arkivert</option>
                </select>
              </Field>
            </div>
            <Field label="Salgskanal / rolle">
              <input value={draft.channel} onChange={event => update('channel', event.target.value)} className="form-input" placeholder="Restaurant, retail, chef format..." />
            </Field>
            <Field label="Produktbeskrivelse">
              <textarea value={draft.description} onChange={event => update('description', event.target.value)} className="min-h-28 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-amber-300/60" />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Etikett/materiale">
                <input value={draft.labelMaterial || ''} onChange={event => update('labelMaterial', event.target.value)} className="form-input" placeholder="Kremhvit etikett · platinafolie" />
              </Field>
              <Field label="Aksentfarge">
                <input value={draft.accentColor || ''} onChange={event => update('accentColor', event.target.value)} className="form-input" placeholder="#D4AF37" />
              </Field>
            </div>
            <Field label="Tekst på websiden">
              <textarea value={draft.publicStory || ''} onChange={event => update('publicStory', event.target.value)} className="min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-amber-300/60" placeholder="Kort, selgende tekst som vises på donaanna.com" />
            </Field>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
              <span>
                <span className="block font-bold text-white">Vis på offentlig webside</span>
                <span className="text-xs text-slate-500">Når aktiv, brukes produktet i porteføljen på Doña Anna-siden.</span>
              </span>
              <input
                type="checkbox"
                checked={draft.isPublic ?? true}
                onChange={event => update('isPublic', event.target.checked)}
                className="h-5 w-5 accent-amber-300"
              />
            </label>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Kolleksjoner</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {commerceProductCollections.map(collection => (
                  <label key={collection} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm ${draft.collections.includes(collection) ? 'border-amber-300 bg-amber-300 text-black' : 'border-white/10 bg-black/20 text-slate-300'}`}>
                    <input type="checkbox" checked={draft.collections.includes(collection)} onChange={() => toggleCollection(collection)} className="sr-only" />
                    <span className="font-bold">{collection}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row">
              <button type="button" onClick={onClose} className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300 hover:text-white">
                Avbryt
              </button>
              <button type="submit" className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-bold text-black hover:bg-amber-200">
                <Save size={17} /> Lagre produkt
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function DataTable({ title, rows }: { title: string; rows: Array<Record<string, string | number>> }) {
  const columns = Object.keys(rows[0] ?? {});

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04]">
      <div className="flex flex-col gap-4 border-b border-white/10 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">Felles datagrunnlag for Olivia OS, Admin, B2B og donaanna.com.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 text-sm outline-none focus:border-amber-300/60" placeholder="Søk..." />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-widest text-slate-500">
              {columns.map(column => (
                <th key={column} className="px-5 py-4">{column}</th>
              ))}
              <th className="px-5 py-4 text-right">Handling</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row, index) => (
              <tr key={index} className="text-sm text-slate-300 hover:bg-white/[0.03]">
                {columns.map(column => (
                  <td key={column} className="whitespace-nowrap px-5 py-4">{row[column]}</td>
                ))}
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white">
                    <Truck size={14} /> Åpne
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CommerceHub;
