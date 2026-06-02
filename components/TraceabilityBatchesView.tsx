import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Factory,
  FlaskConical,
  Link2,
  Loader2,
  PackageCheck,
  Plus,
  QrCode,
  Save,
  Scale,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react';
import { publishTraceBatch } from '../services/publicTrace';

type BatchType = 'evoo' | 'table_olives' | 'raw_olives';
type BatchStatus = 'planned' | 'harvested' | 'processing' | 'quality_checked' | 'packed' | 'ready_for_sale';

type TraceabilityBatch = {
  id: string;
  batch_code: string;
  type: BatchType;
  status: BatchStatus;
  harvest_date: string;
  parcel_id: string;
  zone_id: string;
  variety: string;
  altitude_m: number;
  kg_harvested: number;
  kg_processed?: number;
  liters_oil?: number;
  yield_percent?: number;
  acidity_percent?: number;
  peroxide_value?: number;
  polyphenols_mg_kg?: number;
  sensory_profile?: string;
  processing_location?: string;
  lot_notes?: string;
  qr_slug: string;
  created_at: string;
  published_to_public_trace?: boolean;
  published_at?: string;
};

const demoBatches: TraceabilityBatch[] = [
  {
    id: 'batch-demo-1',
    batch_code: 'DA-BIAR-2026-EVOO-001',
    type: 'evoo',
    status: 'quality_checked',
    harvest_date: '2026-11-25',
    parcel_id: 'biar-main',
    zone_id: 'zone-b',
    variety: 'Changlot Real / Genovesa',
    altitude_m: 650,
    kg_harvested: 5200,
    kg_processed: 5100,
    liters_oil: 780,
    yield_percent: 15.3,
    acidity_percent: 0.18,
    peroxide_value: 6.4,
    polyphenols_mg_kg: 520,
    sensory_profile: 'Grønn frukt, urter, medium bitterhet og tydelig pepperfinish.',
    processing_location: 'Cooperativa / ekstern presse',
    lot_notes: 'Demo-batch for premium EVOO-sporbarhet.',
    qr_slug: 'da-biar-2026-evoo-001',
    created_at: new Date().toISOString(),
  },
  {
    id: 'batch-demo-2',
    batch_code: 'DA-BIAR-2026-TABLE-GORDAL-001',
    type: 'table_olives',
    status: 'processing',
    harvest_date: '2026-10-20',
    parcel_id: 'biar-main',
    zone_id: 'zone-a',
    variety: 'Gordal',
    altitude_m: 650,
    kg_harvested: 450,
    kg_processed: 430,
    sensory_profile: 'Stor frukt, fast tekstur og egnet til premium bordoliven.',
    processing_location: 'DonaAnna brine batch',
    lot_notes: 'Demo-batch for bordoliven.',
    qr_slug: 'da-biar-2026-table-gordal-001',
    created_at: new Date().toISOString(),
  },
];

function typeLabel(type: BatchType): string {
  if (type === 'evoo') return 'EVOO';
  if (type === 'table_olives') return 'Bordoliven';
  return 'Rå oliven';
}

function statusLabel(status: BatchStatus): string {
  const labels: Record<BatchStatus, string> = {
    planned: 'Planlagt',
    harvested: 'Høstet',
    processing: 'Prosessering',
    quality_checked: 'Kvalitetstestet',
    packed: 'Pakket',
    ready_for_sale: 'Klar for salg',
  };
  return labels[status];
}

function statusClass(status: BatchStatus): string {
  if (status === 'ready_for_sale') return 'border-green-500/30 bg-green-500/10 text-green-400';
  if (status === 'quality_checked' || status === 'packed') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  if (status === 'processing') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function getLocalBatches(): TraceabilityBatch[] {
  try {
    const raw = localStorage.getItem('olivia_traceability_batches');
    if (!raw) return demoBatches;
    const parsed = JSON.parse(raw) as TraceabilityBatch[];
    return parsed.length ? parsed : demoBatches;
  } catch {
    return demoBatches;
  }
}

function saveLocalBatches(batches: TraceabilityBatch[]) {
  localStorage.setItem('olivia_traceability_batches', JSON.stringify(batches));
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function makeBatchCode(type: BatchType, variety: string): string {
  const year = new Date().getFullYear();
  const typeCode = type === 'evoo' ? 'EVOO' : type === 'table_olives' ? 'TABLE' : 'RAW';
  const varietyCode = variety.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 18) || 'OLIVE';
  return `DA-BIAR-${year}-${typeCode}-${varietyCode}-${String(Date.now()).slice(-3)}`;
}

function publicTraceUrl(qrSlug: string): string {
  if (typeof window === 'undefined') return `/trace/${qrSlug}`;
  return `${window.location.origin}/trace/${qrSlug}`;
}

function publicStoryForBatch(batch: TraceabilityBatch): string {
  return `Denne batchen kommer fra DonaAnna-gården i Biar, Alicante. Gården ligger rundt ${batch.altitude_m || 650} meter over havet, som gir senere modning enn kyst og lavland. Batchen er registrert med sort, sone, høstedato, prosessering og kvalitetstall.`;
}

const TraceabilityBatchesView: React.FC = () => {
  const [batches, setBatches] = useState<TraceabilityBatch[]>(getLocalBatches());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<TraceabilityBatch>>({
    type: 'evoo',
    status: 'harvested',
    harvest_date: new Date().toISOString().slice(0, 10),
    parcel_id: 'biar-main',
    zone_id: 'zone-a',
    variety: 'Gordal',
    altitude_m: 650,
    kg_harvested: 500,
    kg_processed: 0,
    liters_oil: 0,
    processing_location: '',
    sensory_profile: '',
    lot_notes: '',
  });

  const stats = useMemo(() => {
    const kg = batches.reduce((acc, b) => acc + (b.kg_harvested || 0), 0);
    const liters = batches.reduce((acc, b) => acc + (b.liters_oil || 0), 0);
    const ready = batches.filter(b => b.status === 'ready_for_sale' || b.status === 'packed').length;
    const lab = batches.filter(b => b.acidity_percent || b.polyphenols_mg_kg || b.peroxide_value).length;
    const published = batches.filter(b => b.published_to_public_trace).length;
    return { kg, liters, ready, lab, published };
  }, [batches]);

  const saveBatch = () => {
    const type = form.type || 'evoo';
    const variety = form.variety || 'Blanding';
    const batchCode = makeBatchCode(type, variety);
    const kgHarvested = Number(form.kg_harvested || 0);
    const litersOil = Number(form.liters_oil || 0) || undefined;
    const kgProcessed = Number(form.kg_processed || 0) || undefined;
    const yieldPercent = litersOil && kgProcessed ? Math.round((litersOil / kgProcessed) * 1000) / 10 : undefined;
    const batch: TraceabilityBatch = {
      id: `trace-${Date.now()}`,
      batch_code: batchCode,
      type,
      status: form.status || 'harvested',
      harvest_date: form.harvest_date || new Date().toISOString().slice(0, 10),
      parcel_id: form.parcel_id || 'biar-main',
      zone_id: form.zone_id || 'zone-a',
      variety,
      altitude_m: Number(form.altitude_m || 650),
      kg_harvested: kgHarvested,
      kg_processed: kgProcessed,
      liters_oil: litersOil,
      yield_percent: form.yield_percent || yieldPercent,
      acidity_percent: Number(form.acidity_percent || 0) || undefined,
      peroxide_value: Number(form.peroxide_value || 0) || undefined,
      polyphenols_mg_kg: Number(form.polyphenols_mg_kg || 0) || undefined,
      sensory_profile: form.sensory_profile,
      processing_location: form.processing_location,
      lot_notes: form.lot_notes,
      qr_slug: slugify(batchCode),
      created_at: new Date().toISOString(),
    };
    const updated = [batch, ...batches];
    setBatches(updated);
    saveLocalBatches(updated);
    setIsFormOpen(false);
  };

  const publishBatch = async (batch: TraceabilityBatch) => {
    setPublishingId(batch.id);
    setPublishError(null);
    try {
      await publishTraceBatch({
        batch_code: batch.batch_code,
        qr_slug: batch.qr_slug,
        type: batch.type,
        status: 'published',
        product_status: batch.status,
        harvest_date: batch.harvest_date,
        parcel_id: batch.parcel_id,
        zone_id: batch.zone_id,
        variety: batch.variety,
        altitude_m: batch.altitude_m,
        kg_harvested: batch.kg_harvested,
        kg_processed: batch.kg_processed,
        liters_oil: batch.liters_oil,
        yield_percent: batch.yield_percent,
        acidity_percent: batch.acidity_percent,
        peroxide_value: batch.peroxide_value,
        polyphenols_mg_kg: batch.polyphenols_mg_kg,
        sensory_profile: batch.sensory_profile,
        processing_location: batch.processing_location,
        lot_notes: batch.lot_notes,
        public_story: publicStoryForBatch(batch),
        organic_note: 'Økologisk status og dokumentasjon bør bekreftes per batch før kommersiell bruk.',
        published_at: new Date().toISOString(),
      });
      const updated = batches.map(item => item.id === batch.id ? { ...item, published_to_public_trace: true, published_at: new Date().toISOString() } : item);
      setBatches(updated);
      saveLocalBatches(updated);
    } catch (error: any) {
      console.warn('[TraceabilityBatchesView] Publish failed', error);
      setPublishError(error?.message || 'Publisering feilet. Sjekk Supabase-konfigurasjon, migrasjon og RLS.');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><PackageCheck className="text-green-400" /> Batch og sporbarhet</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">DonaAnna · Biar 650 moh. · flasker, glass, labverdier og QR</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Plus size={20} /> Ny batch</button>
      </div>

      {publishError && (
        <div className="glass rounded-[2rem] p-5 border border-red-500/30 bg-red-500/10 text-red-100 text-sm">
          {publishError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Høstet kg', value: stats.kg.toLocaleString('no-NO'), icon: <Scale size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Olje liter', value: stats.liters.toLocaleString('no-NO'), icon: <Factory size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Pakket/klar', value: stats.ready, icon: <CheckCircle2 size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Labverdier', value: stats.lab, icon: <FlaskConical size={18} />, cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
          { label: 'Publisert QR', value: stats.published, icon: <UploadCloud size={18} />, cls: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4">
          <QrCode className="text-green-400 mt-1" />
          <div>
            <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-2">QR og merkevarehistorie</p>
            <p className="text-white font-bold">Publiser en batch for å gjøre QR-siden offentlig tilgjengelig.</p>
            <p className="text-xs text-slate-500 mt-2">Når du trykker “Publiser QR”, lagres batchen i Supabase-tabellen public_trace_batches med status published. Da kan etiketten bruke URL-en /trace/batch-slug.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {batches.map(batch => (
          <div key={batch.id} className={`glass rounded-[2rem] p-6 border ${statusClass(batch.status)}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{typeLabel(batch.type)} · {statusLabel(batch.status)}</p>
                <h3 className="text-xl text-white font-bold">{batch.batch_code}</h3>
                <p className="text-xs text-slate-500 mt-1">{batch.variety} · {batch.zone_id} · {batch.harvest_date} · {batch.altitude_m} moh.</p>
              </div>
              <div className="text-right"><p className="text-[10px] text-slate-500">kg</p><p className="text-3xl text-white font-black">{batch.kg_harvested}</p></div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Prosessert</p><p className="text-sm text-white font-bold mt-1">{batch.kg_processed || '—'} kg</p></div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Olje</p><p className="text-sm text-white font-bold mt-1">{batch.liters_oil || '—'} L</p></div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Utbytte</p><p className="text-sm text-white font-bold mt-1">{batch.yield_percent || '—'}%</p></div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Polyfenol</p><p className="text-sm text-white font-bold mt-1">{batch.polyphenols_mg_kg || '—'}</p></div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Syre</p><p className="text-sm text-white font-bold mt-1">{batch.acidity_percent || '—'}%</p></div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Peroksid</p><p className="text-sm text-white font-bold mt-1">{batch.peroxide_value || '—'}</p></div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">QR</p><p className="text-xs text-white font-bold mt-1 truncate">{batch.qr_slug}</p></div>
            </div>

            {batch.sensory_profile && <p className="text-sm text-slate-400 mt-4 leading-relaxed">{batch.sensory_profile}</p>}
            {batch.lot_notes && <p className="text-xs text-slate-500 mt-3">Notat: {batch.lot_notes}</p>}

            <div className="mt-5 pt-4 border-t border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-xs text-slate-500"><Link2 size={14} /> QR-side: /trace/{batch.qr_slug}</div>
              {batch.published_to_public_trace && <p className="text-xs text-green-400 font-bold">Publisert til offentlig QR-side {batch.published_at ? `· ${new Date(batch.published_at).toLocaleDateString('no-NO')}` : ''}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button onClick={() => publishBatch(batch)} disabled={publishingId === batch.id} className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {publishingId === batch.id ? <><Loader2 size={18} className="animate-spin" /> Publiserer...</> : <><UploadCloud size={18} /> {batch.published_to_public_trace ? 'Oppdater QR' : 'Publiser QR'}</>}
                </button>
                <a href={`/trace/${batch.qr_slug}`} target="_blank" rel="noreferrer" className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2">
                  <ExternalLink size={18} /> Åpne QR-side
                </a>
              </div>
              <p className="text-[10px] text-slate-600 break-all">Full URL: {publicTraceUrl(batch.qr_slug)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="text-green-400 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">Hva bør inn i en batch?</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Minimum: batchkode, sort, sone, høstedato, kg, formål, prosessering og notat. For premium EVOO: syregrad, peroksid, polyfenoler, sensorisk profil, dato fra høsting til pressing og eventuell økologisk dokumentasjon.</p>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center"><div><h3 className="text-2xl font-bold text-white">Ny batch</h3><p className="text-xs text-slate-500 mt-1">Registrer høsting, prosessering og kvalitet</p></div><button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button></div>
            <div className="grid grid-cols-2 gap-3"><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as BatchType }))}><option value="evoo">EVOO</option><option value="table_olives">Bordoliven</option><option value="raw_olives">Rå oliven</option></select><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as BatchStatus }))}><option value="planned">Planlagt</option><option value="harvested">Høstet</option><option value="processing">Prosessering</option><option value="quality_checked">Kvalitetstestet</option><option value="packed">Pakket</option><option value="ready_for_sale">Klar for salg</option></select></div>
            <div className="grid grid-cols-2 gap-3"><input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={form.harvest_date || ''} onChange={e => setForm(p => ({ ...p, harvest_date: e.target.value }))} /><input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Sort" value={form.variety || ''} onChange={e => setForm(p => ({ ...p, variety: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3"><input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Sone" value={form.zone_id || ''} onChange={e => setForm(p => ({ ...p, zone_id: e.target.value }))} /><input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Kg høstet" value={form.kg_harvested || ''} onChange={e => setForm(p => ({ ...p, kg_harvested: Number(e.target.value) }))} /></div>
            <div className="grid grid-cols-3 gap-3"><input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Kg prosessert" value={form.kg_processed || ''} onChange={e => setForm(p => ({ ...p, kg_processed: Number(e.target.value) }))} /><input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Liter olje" value={form.liters_oil || ''} onChange={e => setForm(p => ({ ...p, liters_oil: Number(e.target.value) }))} /><input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Moh." value={form.altitude_m || 650} onChange={e => setForm(p => ({ ...p, altitude_m: Number(e.target.value) }))} /></div>
            <div className="grid grid-cols-3 gap-3"><input type="number" step="0.01" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Syre %" value={form.acidity_percent || ''} onChange={e => setForm(p => ({ ...p, acidity_percent: Number(e.target.value) }))} /><input type="number" step="0.1" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Peroksid" value={form.peroxide_value || ''} onChange={e => setForm(p => ({ ...p, peroxide_value: Number(e.target.value) }))} /><input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Polyfenol" value={form.polyphenols_mg_kg || ''} onChange={e => setForm(p => ({ ...p, polyphenols_mg_kg: Number(e.target.value) }))} /></div>
            <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" placeholder="Prosesseringssted" value={form.processing_location || ''} onChange={e => setForm(p => ({ ...p, processing_location: e.target.value }))} />
            <textarea className="w-full min-h-[90px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white" placeholder="Sensorisk profil" value={form.sensory_profile || ''} onChange={e => setForm(p => ({ ...p, sensory_profile: e.target.value }))} />
            <textarea className="w-full min-h-[90px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white" placeholder="Batch-notater" value={form.lot_notes || ''} onChange={e => setForm(p => ({ ...p, lot_notes: e.target.value }))} />
            <button onClick={saveBatch} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-2"><Save size={20} /> Lagre batch</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TraceabilityBatchesView;
