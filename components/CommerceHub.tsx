import React, { useState } from 'react';
import {
  BadgeEuro,
  Building2,
  CheckCircle2,
  FileText,
  Globe2,
  Package,
  ReceiptText,
  Search,
  Send,
  ShoppingCart,
  Store,
  Truck,
} from 'lucide-react';

type CommerceTab = 'overview' | 'products' | 'customers' | 'orders' | 'invoices' | 'content';

const products = [
  { sku: 'DA-PC-250', name: 'Primera Cosecha No. 01', size: '250 ml', channel: 'Premium/B2B', stock: 420, price: '€18.90', status: 'Klar for lansering' },
  { sku: 'DA-CB-500', name: 'Centenario de Biar', size: '500 ml', channel: 'Restaurant/Gave', stock: 180, price: '€29.00', status: 'Begrenset volum' },
  { sku: 'DA-LA-500', name: 'Luz de Anna', size: '500 ml', channel: 'Retail', stock: 760, price: '€13.50', status: 'Standardlinje' },
  { sku: 'DA-GP-250', name: 'Genovesa Pura', size: '250 ml', channel: 'Sortsolje', stock: 240, price: '€16.50', status: 'Sortsspesifikk' },
];

const customers = [
  { company: 'Nordic Deli AS', contact: 'Ingrid Larsen', type: 'B2B forhandler', terms: 'Netto 14', status: 'Varm lead' },
  { company: 'Biar Gastro S.L.', contact: 'Mateo Ruiz', type: 'Restaurant', terms: 'Kontant', status: 'Aktiv kunde' },
  { company: 'Olive Club Norway', contact: 'Knut Berg', type: 'Abonnement', terms: 'Kort', status: 'Kundeportal' },
];

const orders = [
  { no: 'DA-2026-0018', customer: 'Biar Gastro S.L.', items: '24 x Centenario', amount: '€696.00', status: 'Pakkes', next: 'Send sporingslenke' },
  { no: 'DA-2026-0017', customer: 'Nordic Deli AS', items: '72 x Luz de Anna', amount: '€972.00', status: 'Tilbud', next: 'Godkjenn B2B-pris' },
  { no: 'DA-2026-0016', customer: 'Olive Club Norway', items: '12 x Primera Cosecha', amount: '€226.80', status: 'Fakturert', next: 'Avventer betaling' },
];

const invoices = [
  { no: 'INV-2026-0042', order: 'DA-2026-0018', customer: 'Biar Gastro S.L.', due: '02.05.2026', total: '€696.00', status: 'Utkast' },
  { no: 'INV-2026-0041', order: 'DA-2026-0016', customer: 'Olive Club Norway', due: '30.04.2026', total: '€226.80', status: 'Sendt' },
  { no: 'INV-2026-0040', order: 'DA-2026-0014', customer: 'Casa Verde', due: '21.04.2026', total: '€410.00', status: 'Betalt' },
];

const contentItems = [
  { name: 'Ordrebekreftelse', use: 'Sendes automatisk etter B2B/kundeordre', owner: 'Admin', status: 'Må kobles' },
  { name: 'Faktura-e-post', use: 'PDF, betalingsfrist og sporingskode', owner: 'Admin', status: 'Utkast' },
  { name: 'Produktark', use: 'Brukes på web, B2B og QR-side', owner: 'Produkt', status: 'Aktiv' },
  { name: 'Batch-fortelling', use: 'Tekst fra Olivia-produksjon til flaskens QR-side', owner: 'Olivia OS', status: 'Ny' },
];

const CommerceHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CommerceTab>('overview');

  const tabs: Array<{ id: CommerceTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Oversikt', icon: Store },
    { id: 'products', label: 'Produkter', icon: Package },
    { id: 'customers', label: 'Kunder/B2B', icon: Building2 },
    { id: 'orders', label: 'Ordre', icon: ShoppingCart },
    { id: 'invoices', label: 'Faktura', icon: ReceiptText },
    { id: 'content', label: 'Tekster', icon: FileText },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">Doña Anna Commerce</p>
          <h2 className="mt-2 text-3xl font-bold text-white">B2B, kundeportal, ordre og faktura samlet i Olivia OS</h2>
          <p className="mt-2 max-w-3xl text-slate-400">
            Dette er kontrollrommet som bør erstatte de gamle separate admin- og kundesidene: produktdata inn ett sted, ordre inn ett sted, faktura ut ett sted, og tekster gjenbrukes på web, e-post og QR.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-black">
            <Send size={17} /> Nytt tilbud
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white">
            <Globe2 size={17} /> Publiser til web
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'B2B pipeline', value: '€12 304', icon: BadgeEuro, tone: 'text-amber-300 bg-amber-300/10' },
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
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
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

      {activeTab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
            <h3 className="text-xl font-bold text-white">Anbefalt sammenslåing</h3>
            <div className="mt-5 space-y-4">
              {[
                ['Olivia OS', 'Gårdsdrift, parseller, høst, batch, kvalitet, oppgaver og sensorikk. Dette er kilden til sannheten.'],
                ['Admin', 'Rettigheter, produktkatalog, priser, kundegrupper, tekster, ordre, faktura og publisering.'],
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
      )}

      {activeTab === 'products' && <DataTable title="Produktkatalog" rows={products} />}
      {activeTab === 'customers' && <DataTable title="Kunder og B2B-kontoer" rows={customers} />}
      {activeTab === 'orders' && <DataTable title="Ordre og tilbud" rows={orders} />}
      {activeTab === 'invoices' && <DataTable title="Faktura og betaling" rows={invoices} />}
      {activeTab === 'content' && <DataTable title="Tekster, e-postmaler og produktark" rows={contentItems} />}
    </div>
  );
};

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
