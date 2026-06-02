import React, { useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Download,
  Euro,
  FileText,
  Loader2,
  PackageCheck,
  Printer,
  ReceiptText,
  RefreshCcw,
  Truck,
} from 'lucide-react';
import {
  fetchDonaAnnaOrders,
  type DonaAnnaOrderWithLines,
} from '../services/donaAnnaSales';

type LocalOrder = {
  id: string;
  order_no: string;
  customer_id: string;
  customer_name: string;
  channel: string;
  status: string;
  order_date: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price_eur: number;
  paid_amount_eur?: number;
  notes?: string;
};

type DocumentType = 'confirmation' | 'packing_slip' | 'market_receipt';

type DocumentOrder = {
  id: string;
  order_no: string;
  customer_name: string;
  channel: string;
  status: string;
  order_date: string;
  paid_amount_eur?: number;
  notes?: string;
  lines: Array<{
    product_name: string;
    product_sku?: string;
    batch_code?: string;
    quantity: number;
    unit_price_eur: number;
    line_total_eur?: number;
  }>;
};

const demoOrders: DocumentOrder[] = [
  {
    id: 'order-demo-1',
    order_no: 'DA-ORD-2026-001',
    customer_name: 'Marked / direkte salg',
    channel: 'market',
    status: 'paid',
    order_date: new Date().toISOString().slice(0, 10),
    paid_amount_eur: 202.8,
    notes: 'Demo markedssalg.',
    lines: [{ product_name: 'DonaAnna EVOO 500 ml', product_sku: 'DA-EVOO-500-2026', batch_code: 'DA-BIAR-2026-EVOO-001', quantity: 12, unit_price_eur: 16.9, line_total_eur: 202.8 }],
  },
  {
    id: 'order-demo-2',
    order_no: 'DA-ORD-2026-002',
    customer_name: 'Restaurant lead',
    channel: 'restaurant',
    status: 'confirmed',
    order_date: new Date().toISOString().slice(0, 10),
    paid_amount_eur: 0,
    notes: 'Demo B2B-bestilling.',
    lines: [{ product_name: 'DonaAnna Gordal bordoliven 350 g', product_sku: 'DA-GORDAL-350-2026', batch_code: 'DA-BIAR-2026-TABLE-GORDAL-001', quantity: 24, unit_price_eur: 5.2, line_total_eur: 124.8 }],
  },
];

function localOrdersToDocuments(rows: LocalOrder[]): DocumentOrder[] {
  return rows.map(order => ({
    id: order.id,
    order_no: order.order_no,
    customer_name: order.customer_name,
    channel: order.channel,
    status: order.status,
    order_date: order.order_date,
    paid_amount_eur: order.paid_amount_eur,
    notes: order.notes,
    lines: [{
      product_name: order.product_name,
      quantity: order.quantity,
      unit_price_eur: order.unit_price_eur,
      line_total_eur: order.quantity * order.unit_price_eur,
    }],
  }));
}

function remoteOrdersToDocuments(rows: DonaAnnaOrderWithLines[]): DocumentOrder[] {
  return rows.map(order => ({
    id: order.id,
    order_no: order.order_no,
    customer_name: order.customer_name,
    channel: order.channel,
    status: order.status,
    order_date: order.order_date,
    paid_amount_eur: order.paid_amount_eur,
    notes: order.notes,
    lines: order.lines.map(line => ({
      product_name: line.product_name,
      product_sku: line.product_sku,
      batch_code: line.batch_code,
      quantity: line.quantity,
      unit_price_eur: line.unit_price_eur,
      line_total_eur: line.line_total_eur || line.quantity * line.unit_price_eur,
    })),
  }));
}

function getLocalOrders(): DocumentOrder[] {
  try {
    const raw = localStorage.getItem('donaanna_orders');
    if (!raw) return demoOrders;
    const parsed = JSON.parse(raw) as LocalOrder[];
    return Array.isArray(parsed) && parsed.length ? localOrdersToDocuments(parsed) : demoOrders;
  } catch {
    return demoOrders;
  }
}

function eur(value: number): string {
  return `€${value.toLocaleString('no-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Utkast',
    confirmed: 'Bekreftet',
    delivered: 'Levert',
    paid: 'Betalt',
    cancelled: 'Kansellert',
  };
  return labels[status] || status;
}

function docTitle(type: DocumentType): string {
  if (type === 'packing_slip') return 'Pakkseddel';
  if (type === 'market_receipt') return 'Markedskvittering';
  return 'Ordrebekreftelse';
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

function buildDocumentText(order: DocumentOrder, type: DocumentType): string {
  const total = order.lines.reduce((acc, line) => acc + (line.line_total_eur || line.quantity * line.unit_price_eur), 0);
  const lineText = order.lines.map(line => {
    const totalLine = line.line_total_eur || line.quantity * line.unit_price_eur;
    if (type === 'packing_slip') return `${line.quantity} x ${line.product_name} · SKU: ${line.product_sku || '—'} · Batch: ${line.batch_code || '—'}`;
    return `${line.quantity} x ${line.product_name} à ${eur(line.unit_price_eur)} = ${eur(totalLine)} · Batch: ${line.batch_code || '—'}`;
  }).join('\n');

  return `${docTitle(type)}\nDonaAnna\nBiar, Alicante, España\n\nOrdre: ${order.order_no}\nDato: ${order.order_date}\nKunde: ${order.customer_name}\nKanal: ${order.channel}\nStatus: ${statusLabel(order.status)}\n\nLinjer:\n${lineText}\n\n${type === 'packing_slip' ? '' : `Total: ${eur(total)}\nBetalt: ${eur(order.paid_amount_eur || 0)}\n`}${order.notes ? `\nNotat: ${order.notes}\n` : ''}\nTakk for at du støtter DonaAnna.\n`;
}

const DonaAnnaOrderDocumentsView: React.FC = () => {
  const [orders, setOrders] = useState<DocumentOrder[]>(getLocalOrders());
  const [selectedId, setSelectedId] = useState(orders[0]?.id || '');
  const [documentType, setDocumentType] = useState<DocumentType>('confirmation');
  const [isLoading, setIsLoading] = useState(false);
  const [dataSource, setDataSource] = useState<'supabase' | 'local_demo'>('local_demo');
  const [copied, setCopied] = useState(false);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const remote = await fetchDonaAnnaOrders();
      if (remote.length) {
        const mapped = remoteOrdersToDocuments(remote);
        setOrders(mapped);
        setSelectedId(mapped[0]?.id || '');
        setDataSource('supabase');
      } else {
        const local = getLocalOrders();
        setOrders(local);
        setSelectedId(local[0]?.id || '');
        setDataSource('local_demo');
      }
    } catch (error) {
      console.warn('[DonaAnnaOrderDocumentsView] Could not load orders', error);
      setDataSource('local_demo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const selected = orders.find(order => order.id === selectedId) || orders[0];
  const total = useMemo(() => selected ? selected.lines.reduce((acc, line) => acc + (line.line_total_eur || line.quantity * line.unit_price_eur), 0) : 0, [selected]);
  const documentText = selected ? buildDocumentText(selected, documentType) : '';

  const copyDocument = async () => {
    await navigator.clipboard.writeText(documentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!selected) return <div className="p-8 text-slate-400">Ingen ordre funnet.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><ReceiptText className="text-green-400" /> Ordredokumenter</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Ordrebekreftelse · pakkseddel · markedskvittering · {dataSource === 'supabase' ? 'Supabase' : 'Lokal demo'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadOrders} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <button onClick={() => window.print()} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Printer size={20} /> Print</button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-4">
          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Velg dokument</p>
            <div className="space-y-3">
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white">
                {orders.map(order => <option key={order.id} value={order.id}>{order.order_no} · {order.customer_name}</option>)}
              </select>
              <select value={documentType} onChange={e => setDocumentType(e.target.value as DocumentType)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white">
                <option value="confirmation">Ordrebekreftelse</option>
                <option value="packing_slip">Pakkseddel</option>
                <option value="market_receipt">Markedskvittering</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass rounded-[2rem] p-5 border border-green-500/20 bg-green-500/10"><Euro className="text-green-400 mb-2" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Total</p><p className="text-2xl text-white font-black">{eur(total)}</p></div>
            <div className="glass rounded-[2rem] p-5 border border-blue-500/20 bg-blue-500/10"><PackageCheck className="text-blue-400 mb-2" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Linjer</p><p className="text-2xl text-white font-black">{selected.lines.length}</p></div>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
            <p className="text-sm text-white font-bold flex items-center gap-2"><Truck size={16} className="text-green-400" /> Bruk</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Bruk ordrebekreftelse for B2B-kunder, pakkseddel ved levering og markedskvittering for enkle direkte salg. Dette er ikke en full juridisk fakturamodul ennå.</p>
          </div>
        </div>

        <div className="xl:col-span-8 space-y-4">
          <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5 print:bg-white print:text-black">
            <div className="bg-white text-slate-900 rounded-[1.5rem] p-8 shadow-2xl min-h-[760px]">
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] font-black text-green-700">DonaAnna</p>
                  <h3 className="text-4xl font-black mt-2">{docTitle(documentType)}</h3>
                  <p className="text-sm text-slate-500 mt-2">Biar, Alicante, España</p>
                </div>
                <FileText className="text-green-700" size={44} />
              </div>

              <div className="grid grid-cols-2 gap-6 mt-8">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Kunde</p>
                  <p className="text-lg font-bold mt-1">{selected.customer_name}</p>
                  <p className="text-sm text-slate-500 mt-1">Kanal: {selected.channel}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Ordre</p>
                  <p className="text-lg font-bold mt-1">{selected.order_no}</p>
                  <p className="text-sm text-slate-500 mt-1">Dato: {selected.order_date}</p>
                  <p className="text-sm text-slate-500">Status: {statusLabel(selected.status)}</p>
                </div>
              </div>

              <table className="w-full mt-10 text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 uppercase text-xs tracking-widest">
                    <th className="py-3">Produkt</th>
                    <th className="py-3">Batch</th>
                    <th className="py-3 text-right">Antall</th>
                    {documentType !== 'packing_slip' && <th className="py-3 text-right">Pris</th>}
                    {documentType !== 'packing_slip' && <th className="py-3 text-right">Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((line, index) => (
                    <tr key={`${line.product_name}-${index}`} className="border-b border-slate-100">
                      <td className="py-4 font-bold">{line.product_name}<p className="text-xs text-slate-400 font-normal">{line.product_sku || ''}</p></td>
                      <td className="py-4 text-slate-600">{line.batch_code || '—'}</td>
                      <td className="py-4 text-right font-bold">{line.quantity}</td>
                      {documentType !== 'packing_slip' && <td className="py-4 text-right">{eur(line.unit_price_eur)}</td>}
                      {documentType !== 'packing_slip' && <td className="py-4 text-right font-bold">{eur(line.line_total_eur || line.quantity * line.unit_price_eur)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>

              {documentType !== 'packing_slip' && (
                <div className="mt-8 flex justify-end">
                  <div className="w-72 space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal</span><strong>{eur(total)}</strong></div>
                    <div className="flex justify-between"><span>Betalt</span><strong>{eur(selected.paid_amount_eur || 0)}</strong></div>
                    <div className="flex justify-between text-xl pt-3 border-t border-slate-200"><span>Total</span><strong>{eur(total)}</strong></div>
                  </div>
                </div>
              )}

              {selected.notes && <div className="mt-8 p-4 rounded-2xl bg-slate-50 border border-slate-200"><p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Notat</p><p className="text-sm mt-1">{selected.notes}</p></div>}

              <div className="mt-12 pt-6 border-t border-slate-200 text-xs text-slate-500">
                <p>DonaAnna · Biar, Alicante · Batchbasert sporbarhet og premium olivenprodukter.</p>
                <p className="mt-1">Dette dokumentet er en praktisk ordrebekreftelse/pakkseddel og ikke nødvendigvis en formell skattefaktura.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={copyDocument} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Copy size={18} /> {copied ? 'Kopiert' : 'Kopier tekst'}</button>
            <button onClick={() => downloadText(`${selected.order_no}-${documentType}.txt`, documentText)} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Download size={18} /> Last ned TXT</button>
            <button onClick={() => window.print()} className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Printer size={18} /> Print / PDF</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonaAnnaOrderDocumentsView;
