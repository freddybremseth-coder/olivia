import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Download,
  Euro,
  FileText,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { fetchDonaAnnaOrders, type DonaAnnaOrderWithLines } from '../services/donaAnnaSales';

type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'cancelled';

type InvoiceParty = {
  name: string;
  nif: string;
  address: string;
  city: string;
  country: string;
  email?: string;
};

type InvoiceLine = {
  description: string;
  batch_code?: string;
  quantity: number;
  unit_price_eur: number;
  vat_rate: number;
};

type InvoiceData = {
  id: string;
  invoice_no: string;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  seller: InvoiceParty;
  buyer: InvoiceParty;
  payment_method: string;
  notes?: string;
  lines: InvoiceLine[];
};

const defaultSeller: InvoiceParty = {
  name: 'DonaAnna / Freddy Bremseth',
  nif: 'NIF/CIF pendiente',
  address: 'Biar, Alicante',
  city: 'Alicante',
  country: 'España',
  email: 'info@donaanna.com',
};

const demoInvoice: InvoiceData = {
  id: 'demo-invoice-1',
  invoice_no: `DA-FAC-${new Date().getFullYear()}-0001`,
  invoice_date: new Date().toISOString().slice(0, 10),
  due_date: new Date().toISOString().slice(0, 10),
  status: 'draft',
  seller: defaultSeller,
  buyer: {
    name: 'Restaurant lead',
    nif: 'NIF/CIF cliente',
    address: 'Dirección cliente',
    city: 'Costa Blanca',
    country: 'España',
  },
  payment_method: 'Transferencia bancaria / TPV / efectivo',
  notes: 'Factura demo. Verificar datos fiscales antes de emitir.',
  lines: [
    { description: 'DonaAnna EVOO 500 ml', batch_code: 'DA-BIAR-2026-EVOO-001', quantity: 12, unit_price_eur: 16.9, vat_rate: 10 },
  ],
};

function nextInvoiceNo(): string {
  const year = new Date().getFullYear();
  try {
    const raw = localStorage.getItem('donaanna_invoices');
    const rows = raw ? JSON.parse(raw) as InvoiceData[] : [];
    const next = rows.length + 1;
    return `DA-FAC-${year}-${String(next).padStart(4, '0')}`;
  } catch {
    return `DA-FAC-${year}-0001`;
  }
}

function eur(value: number): string {
  return `€${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calculate(lines: InvoiceLine[]) {
  const net = lines.reduce((acc, line) => acc + line.quantity * line.unit_price_eur, 0);
  const vat = lines.reduce((acc, line) => acc + line.quantity * line.unit_price_eur * (line.vat_rate / 100), 0);
  return { net, vat, total: net + vat };
}

function remoteOrdersToInvoices(rows: DonaAnnaOrderWithLines[]): InvoiceData[] {
  return rows.map((order, index) => ({
    id: `invoice-from-${order.id}`,
    invoice_no: `DA-FAC-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`,
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
    status: order.status === 'paid' ? 'paid' : 'draft',
    seller: defaultSeller,
    buyer: {
      name: order.customer_name,
      nif: 'NIF/CIF cliente',
      address: 'Dirección cliente',
      city: 'España',
      country: 'España',
    },
    payment_method: 'Transferencia bancaria / TPV / efectivo',
    notes: order.notes || 'Factura generada desde pedido. Verificar datos fiscales antes de emitir.',
    lines: order.lines.map(line => ({
      description: line.product_name,
      batch_code: line.batch_code,
      quantity: line.quantity,
      unit_price_eur: line.unit_price_eur,
      vat_rate: 10,
    })),
  }));
}

function getLocalInvoices(): InvoiceData[] {
  try {
    const raw = localStorage.getItem('donaanna_invoices');
    if (!raw) return [demoInvoice];
    const parsed = JSON.parse(raw) as InvoiceData[];
    return parsed.length ? parsed : [demoInvoice];
  } catch {
    return [demoInvoice];
  }
}

function saveLocalInvoices(rows: InvoiceData[]) {
  localStorage.setItem('donaanna_invoices', JSON.stringify(rows));
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function buildInvoiceText(invoice: InvoiceData): string {
  const totals = calculate(invoice.lines);
  const lines = invoice.lines.map(line => {
    const base = line.quantity * line.unit_price_eur;
    const vat = base * (line.vat_rate / 100);
    return `${line.quantity} x ${line.description} · Batch: ${line.batch_code || '—'} · Base ${eur(base)} · IVA ${line.vat_rate}% ${eur(vat)} · Total ${eur(base + vat)}`;
  }).join('\n');

  return `FACTURA\n${invoice.invoice_no}\n\nFecha: ${invoice.invoice_date}\nVencimiento: ${invoice.due_date}\nEstado: ${invoice.status}\n\nEMISOR\n${invoice.seller.name}\nNIF/CIF: ${invoice.seller.nif}\n${invoice.seller.address}\n${invoice.seller.city}, ${invoice.seller.country}\n${invoice.seller.email || ''}\n\nCLIENTE\n${invoice.buyer.name}\nNIF/CIF: ${invoice.buyer.nif}\n${invoice.buyer.address}\n${invoice.buyer.city}, ${invoice.buyer.country}\n\nLÍNEAS\n${lines}\n\nBase imponible: ${eur(totals.net)}\nIVA: ${eur(totals.vat)}\nTOTAL: ${eur(totals.total)}\n\nForma de pago: ${invoice.payment_method}\nNotas: ${invoice.notes || ''}\n`;
}

const DonaAnnaSpanishInvoiceView: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceData[]>(getLocalInvoices());
  const [selectedId, setSelectedId] = useState(invoices[0]?.id || '');
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'orders' | 'local'>('local');
  const [copied, setCopied] = useState(false);

  const loadFromOrders = async () => {
    setIsLoading(true);
    try {
      const orders = await fetchDonaAnnaOrders();
      if (orders.length) {
        const mapped = remoteOrdersToInvoices(orders);
        setInvoices(mapped);
        setSelectedId(mapped[0]?.id || '');
        setDataSource('orders');
      } else {
        const local = getLocalInvoices();
        setInvoices(local);
        setSelectedId(local[0]?.id || '');
        setDataSource('local');
      }
    } catch (error) {
      console.warn('[DonaAnnaSpanishInvoiceView] invoice load failed', error);
      setDataSource('local');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadFromOrders(); }, []);

  const selected = invoices.find(invoice => invoice.id === selectedId) || invoices[0];
  const totals = useMemo(() => selected ? calculate(selected.lines) : { net: 0, vat: 0, total: 0 }, [selected]);
  const invoiceText = selected ? buildInvoiceText(selected) : '';

  const createBlankInvoice = () => {
    const invoice: InvoiceData = {
      ...demoInvoice,
      id: `invoice-${Date.now()}`,
      invoice_no: nextInvoiceNo(),
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      status: 'draft',
    };
    const updated = [invoice, ...getLocalInvoices()];
    setInvoices(updated);
    setSelectedId(invoice.id);
    setDataSource('local');
    saveLocalInvoices(updated);
  };

  const saveCurrent = () => {
    if (!selected) return;
    const updated = invoices.map(invoice => invoice.id === selected.id ? selected : invoice);
    saveLocalInvoices(updated);
  };

  const updateSelected = (patch: Partial<InvoiceData>) => {
    if (!selected) return;
    setInvoices(prev => prev.map(invoice => invoice.id === selected.id ? { ...invoice, ...patch } : invoice));
  };

  const updateParty = (party: 'seller' | 'buyer', patch: Partial<InvoiceParty>) => {
    if (!selected) return;
    updateSelected({ [party]: { ...selected[party], ...patch } } as Partial<InvoiceData>);
  };

  const updateLine = (index: number, patch: Partial<InvoiceLine>) => {
    if (!selected) return;
    const lines = selected.lines.map((line, i) => i === index ? { ...line, ...patch } : line);
    updateSelected({ lines });
  };

  const copyInvoice = async () => {
    await navigator.clipboard.writeText(invoiceText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!selected) return <div className="p-8 text-slate-400">Ingen fakturaer funnet.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><ReceiptText className="text-green-400" /> Spansk faktura</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Factura · NIF/CIF · IVA · betalingsstatus · {dataSource === 'orders' ? 'fra ordre' : 'lokal'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadFromOrders} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <button onClick={createBlankInvoice} className="bg-white/10 hover:bg-white/15 text-white px-5 py-3.5 rounded-2xl font-bold transition-all">Ny faktura</button>
          <button onClick={() => window.print()} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Printer size={20} /> Print</button>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-5 border border-yellow-500/25 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-yellow-400 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">Kontroller før faktisk bruk</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Dette er en praktisk fakturamodul, ikke juridisk eller skattemessig garanti. Før faktura utstedes i Spania bør du kontrollere fakturanummerserie, NIF/CIF, IVA-sats, skatteposisjon, autonomo/selskap, bokføringskrav og eventuell integrasjon med regnskapsfører.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-4">
          <div className="glass rounded-[2rem] p-6 border border-white/10 space-y-4">
            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white">
              {invoices.map(invoice => <option key={invoice.id} value={invoice.id}>{invoice.invoice_no} · {invoice.buyer.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input value={selected.invoice_no} onChange={e => updateSelected({ invoice_no: e.target.value })} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
              <select value={selected.status} onChange={e => updateSelected({ status: e.target.value as InvoiceStatus })} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white"><option value="draft">Draft</option><option value="issued">Issued</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={selected.invoice_date} onChange={e => updateSelected({ invoice_date: e.target.value })} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
              <input type="date" value={selected.due_date} onChange={e => updateSelected({ due_date: e.target.value })} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
            </div>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10 space-y-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Emisor</p>
            <input value={selected.seller.name} onChange={e => updateParty('seller', { name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
            <input value={selected.seller.nif} onChange={e => updateParty('seller', { nif: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
            <input value={selected.seller.address} onChange={e => updateParty('seller', { address: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10 space-y-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Cliente</p>
            <input value={selected.buyer.name} onChange={e => updateParty('buyer', { name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
            <input value={selected.buyer.nif} onChange={e => updateParty('buyer', { nif: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
            <input value={selected.buyer.address} onChange={e => updateParty('buyer', { address: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
          </div>
        </div>

        <div className="xl:col-span-8 space-y-4">
          <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
            <div className="bg-white text-slate-900 rounded-[1.5rem] p-8 shadow-2xl min-h-[820px]">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] font-black text-green-700">DonaAnna</p>
                  <h3 className="text-5xl font-black mt-2">FACTURA</h3>
                  <p className="text-sm text-slate-500 mt-2">{selected.invoice_no}</p>
                </div>
                <FileText className="text-green-700" size={48} />
              </div>

              <div className="grid grid-cols-2 gap-8 mt-8 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Emisor</p>
                  <p className="font-bold mt-2">{selected.seller.name}</p>
                  <p>NIF/CIF: {selected.seller.nif}</p>
                  <p>{selected.seller.address}</p>
                  <p>{selected.seller.city}, {selected.seller.country}</p>
                  <p>{selected.seller.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Cliente</p>
                  <p className="font-bold mt-2">{selected.buyer.name}</p>
                  <p>NIF/CIF: {selected.buyer.nif}</p>
                  <p>{selected.buyer.address}</p>
                  <p>{selected.buyer.city}, {selected.buyer.country}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-8 text-sm bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div><p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Fecha</p><p className="font-bold">{selected.invoice_date}</p></div>
                <div><p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Vencimiento</p><p className="font-bold">{selected.due_date}</p></div>
                <div><p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Estado</p><p className="font-bold">{selected.status}</p></div>
              </div>

              <table className="w-full mt-8 text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-slate-500 uppercase text-xs tracking-widest"><th className="py-3">Descripción</th><th className="py-3">Batch</th><th className="py-3 text-right">Cant.</th><th className="py-3 text-right">Precio</th><th className="py-3 text-right">IVA</th><th className="py-3 text-right">Total</th></tr></thead>
                <tbody>
                  {selected.lines.map((line, index) => {
                    const base = line.quantity * line.unit_price_eur;
                    const vat = base * (line.vat_rate / 100);
                    return <tr key={`${line.description}-${index}`} className="border-b border-slate-100"><td className="py-4 font-bold">{line.description}</td><td className="py-4 text-slate-600">{line.batch_code || '—'}</td><td className="py-4 text-right font-bold">{line.quantity}</td><td className="py-4 text-right">{eur(line.unit_price_eur)}</td><td className="py-4 text-right">{line.vat_rate}%</td><td className="py-4 text-right font-bold">{eur(base + vat)}</td></tr>;
                  })}
                </tbody>
              </table>

              <div className="mt-8 flex justify-end">
                <div className="w-80 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Base imponible</span><strong>{eur(totals.net)}</strong></div>
                  <div className="flex justify-between"><span>IVA</span><strong>{eur(totals.vat)}</strong></div>
                  <div className="flex justify-between text-2xl pt-3 border-t border-slate-200"><span>Total</span><strong>{eur(totals.total)}</strong></div>
                </div>
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm">
                <p><strong>Forma de pago:</strong> {selected.payment_method}</p>
                {selected.notes && <p className="mt-2"><strong>Notas:</strong> {selected.notes}</p>}
              </div>

              <div className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-500">
                <p>DonaAnna · Biar, Alicante · Producto con trazabilidad por lote.</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10 space-y-4">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Rediger fakturalinjer</p>
            {selected.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <input value={line.description} onChange={e => updateLine(index, { description: e.target.value })} className="md:col-span-2 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
                <input type="number" value={line.quantity} onChange={e => updateLine(index, { quantity: Number(e.target.value) })} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
                <input type="number" step="0.01" value={line.unit_price_eur} onChange={e => updateLine(index, { unit_price_eur: Number(e.target.value) })} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
                <input type="number" step="1" value={line.vat_rate} onChange={e => updateLine(index, { vat_rate: Number(e.target.value) })} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <button onClick={saveCurrent} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Save size={18} /> Lagre lokal</button>
            <button onClick={copyInvoice} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Copy size={18} /> {copied ? 'Kopiert' : 'Kopier'}</button>
            <button onClick={() => downloadText(`${selected.invoice_no}.txt`, invoiceText)} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Download size={18} /> TXT</button>
            <button onClick={() => window.print()} className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Printer size={18} /> Print/PDF</button>
          </div>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-3"><ShieldCheck className="text-green-400 mt-0.5" /><div><p className="text-sm text-white font-bold">Neste steg for juridisk robust fakturering</p><p className="text-xs text-slate-500 mt-2 leading-relaxed">Legg fakturaer i Supabase med låst nummerserie, revisjonsspor, kunde-register, IVA-rapport og eksport til regnskapsfører. Når dette skal brukes kommersielt, bør regnskapsfører bekrefte felt og prosess.</p></div></div>
      </div>
    </div>
  );
};

export default DonaAnnaSpanishInvoiceView;
