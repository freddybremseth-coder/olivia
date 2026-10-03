import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Factory, FlaskConical, Link2, Loader2, PackageCheck, Plus, QrCode, RefreshCcw, Save, Scale, ShieldCheck, UploadCloud, X } from 'lucide-react';
import type { Batch } from '../types';
import { fetchBatches, upsertBatch } from '../services/db';
import { publishProductLotTrace, publishTraceBatch } from '../services/publicTrace';
import { createProductLot, fetchUnifiedInventory, type UnifiedInventoryProduct, type UnifiedProductLot } from '../services/commerceInventory';
import CostSuggestionReview from './CostSuggestionReview';

type TraceStatus = 'planned' | 'harvested' | 'processing' | 'quality_checked' | 'packed' | 'ready_for_sale';
type TraceType = 'evoo' | 'table_olives' | 'raw_olives';

type TraceBatch = {
  id: string;
  batch_code: string;
  type: TraceType;
  status: TraceStatus;
  harvest_date: string;
  parcel_id: string;
  zone_id: string;
  variety: string;
  altitude_m?: number;
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
  published_to_public_trace?: boolean;
  published_at?: string;
  sourceBatch: Batch;
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function publicTraceUrl(qrSlug: string): string {
  if (typeof window === 'undefined') return `/trace/${qrSlug}`;
  return `${window.location.origin}/trace/${qrSlug}`;
}

function traceType(batch: Batch): TraceType {
  if (batch.yieldType === 'Oil') return 'evoo';
  if (batch.yieldType === 'Table') return 'table_olives';
  return 'raw_olives';
}

function traceStatus(batch: Batch): TraceStatus {
  if (batch.status === 'ARCHIVED') return 'ready_for_sale';
  if (batch.qualityMetrics || batch.qualityScore) return 'quality_checked';
  if (batch.currentStage === 'PAKKING') return 'packed';
  if (batch.currentStage) return 'processing';
  return 'harvested';
}

function typeLabel(type: TraceType): string {
  if (type === 'evoo') return 'EVOO';
  if (type === 'table_olives') return 'Bordoliven';
  return 'Rå oliven';
}

function statusLabel(status: TraceStatus): string {
  const labels: Record<TraceStatus, string> = {
    planned: 'Planlagt',
    harvested: 'Høstet',
    processing: 'Prosessering',
    quality_checked: 'Kvalitetstestet',
    packed: 'Pakket',
    ready_for_sale: 'Klar for salg',
  };
  return labels[status];
}

function statusClass(status: TraceStatus): string {
  if (status === 'ready_for_sale') return 'border-green-500/30 bg-green-500/10 text-green-400';
  if (status === 'quality_checked' || status === 'packed') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  if (status === 'processing') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function batchToTrace(batch: Batch): TraceBatch {
  const batchCode = batch.traceabilityCode || `DA-BIAR-${(batch.harvestDate || '').slice(0, 4) || new Date().getFullYear()}-${batch.id}`;
  const liters = batch.oilYieldLiters || undefined;
  const processedKg = batch.weight || undefined;
  const yieldPercent = liters && processedKg ? Math.round((liters / processedKg) * 1000) / 10 : undefined;
  return {
    id: batch.id,
    batch_code: batchCode,
    type: traceType(batch),
    status: traceStatus(batch),
    harvest_date: batch.harvestDate,
    parcel_id: batch.parcelId,
    zone_id: batch.currentStage || 'farm',
    variety: batch.oliveType || batch.recipeName || 'Blanding',
    altitude_m: undefined,
    kg_harvested: Number(batch.weight || 0),
    kg_processed: processedKg,
    liters_oil: liters,
    yield_percent: yieldPercent,
    acidity_percent: batch.qualityMetrics?.acidity,
    peroxide_value: batch.qualityMetrics?.peroxide,
    polyphenols_mg_kg: batch.qualityMetrics?.phenols,
    sensory_profile: batch.recipeName ? `Oppskrift: ${batch.recipeName}` : undefined,
    processing_location: undefined,
    lot_notes: batch.logs?.map(log => `${log.stage}: ${log.notes}`).join(' · '),
    qr_slug: slugify(batchCode),
    published_to_public_trace: !!batch.logs?.some(log => log.stage === 'SALG' && log.notes?.includes('published_to_public_trace')),
    published_at: undefined,
    sourceBatch: batch,
  };
}

function publicStoryForBatch(batch: TraceBatch): string {
  return `Denne batchen kommer fra Doña Anna i Biar, Alicante. Den offentlige sporbarheten viser bare opplysninger som er registrert for denne batchen.`;
}

const TraceabilityBatchesOliviaView: React.FC = () => {
  const [batches, setBatches] = useState<TraceBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishingLotId, setPublishingLotId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<UnifiedInventoryProduct[]>([]);
  const [productLots, setProductLots] = useState<UnifiedProductLot[]>([]);
  const [lotOpen, setLotOpen] = useState(false);
  const [lotSaving, setLotSaving] = useState(false);
  const [lotProductId, setLotProductId] = useState('');
  const [lotUnits, setLotUnits] = useState('1');
  const [lotCode, setLotCode] = useState('');
  const [lotSourceIds, setLotSourceIds] = useState<string[]>([]);
  const [lotAllocations, setLotAllocations] = useState<Record<string, string>>({});
  const [lotPackedAt, setLotPackedAt] = useState(new Date().toISOString().slice(0, 10));
  const [lotBestBefore, setLotBestBefore] = useState('');
  const [createdLotId, setCreatedLotId] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rows, inventory] = await Promise.all([fetchBatches(), fetchUnifiedInventory()]);
      setBatches(rows.map(batchToTrace));
      setProducts(inventory.products);
      setProductLots(inventory.lots);
      if (!lotProductId && inventory.products[0]) setLotProductId(inventory.products[0].id);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente batcher fra olivia.batches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const eligibleSourceBatches = useMemo(
    () => batches.filter(batch => batch.sourceBatch.status === 'ACTIVE'),
    [batches],
  );

  const openLotBuilder = () => {
    const year = new Date().getFullYear();
    setLotCode(`DA-LOT-${year}-${String(Date.now()).slice(-5)}`);
    setLotUnits('1');
    setLotSourceIds([]);
    setLotAllocations({});
    setLotPackedAt(new Date().toISOString().slice(0, 10));
    setLotBestBefore('');
    setCreatedLotId('');
    if (!lotProductId && products[0]) setLotProductId(products[0].id);
    setLotOpen(true);
  };

  const toggleLotSource = (batchId: string) => {
    setLotSourceIds(prev => {
      const removing = prev.includes(batchId);
      if (removing) setLotAllocations(current => { const next = { ...current }; delete next[batchId]; return next; });
      return removing ? prev.filter(id => id !== batchId) : [...prev, batchId];
    });
  };

  const saveProductLot = async () => {
    const units = Number(lotUnits);
    if (!lotProductId || !lotCode.trim() || !Number.isFinite(units) || units <= 0) {
      setError('Velg produkt, lotkode og et gyldig antall enheter.');
      return;
    }
    if (!lotSourceIds.length) {
      setError('Velg minst én aktiv produksjons-/høstebatch som kilde. Arkiverte kooperativbatcher kan ikke brukes.');
      return;
    }
    const missingAllocation = lotSourceIds.some(id => !Number(lotAllocations[id] || 0));
    if (missingAllocation) {
      setError('Registrer faktisk mengde brukt fra hver kildebatch. Olivia skal ikke anta at hele batchen gikk inn i pakkeloten.');
      return;
    }
    setLotSaving(true);
    setError(null);
    try {
      const traceSlug = lotCode.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const newLotId = await createProductLot({
        productId: lotProductId,
        lotCode: lotCode.trim(),
        units,
        batchSources: lotSourceIds.map(id => {
          const source = batches.find(batch => batch.id === id);
          const amount = Number(lotAllocations[id] || 0);
          return source?.type === 'evoo'
            ? { batchId: id, inputLiters: amount }
            : { batchId: id, inputKg: amount };
        }),
        traceabilitySlug: traceSlug,
        packedAt: lotPackedAt ? new Date(lotPackedAt + 'T12:00:00').toISOString() : undefined,
        bestBefore: lotBestBefore || undefined,
        notes: 'Opprettet fra Batch og sporbarhet i Olivia OS.',
      });
      setCreatedLotId(newLotId);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke opprette pakkelot.');
    } finally {
      setLotSaving(false);
    }
  };


  const publishLot = async (lot: UnifiedProductLot) => {
    setPublishingLotId(lot.id);
    setError(null);
    try {
      await publishProductLotTrace(lot.id);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke publisere produktlot til offentlig QR-side.');
    } finally {
      setPublishingLotId(null);
    }
  };

  const stats = useMemo(() => {
    const kg = batches.reduce((acc, b) => acc + (b.kg_harvested || 0), 0);
    const liters = batches.reduce((acc, b) => acc + (b.liters_oil || 0), 0);
    const ready = batches.filter(b => b.status === 'ready_for_sale' || b.status === 'packed').length;
    const lab = batches.filter(b => b.acidity_percent || b.polyphenols_mg_kg || b.peroxide_value).length;
    const published = batches.filter(b => b.published_to_public_trace).length;
    return { kg, liters, ready, lab, published };
  }, [batches]);

  const publishBatch = async (batch: TraceBatch) => {
    setPublishingId(batch.id);
    setError(null);
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

      const updatedSource: Batch = {
        ...batch.sourceBatch,
        traceabilityCode: batch.batch_code,
        logs: [
          ...(batch.sourceBatch.logs || []),
          { stage: 'SALG', startDate: new Date().toISOString().slice(0, 10), notes: 'published_to_public_trace' },
        ],
      };
      await upsertBatch(updatedSource);
      setBatches(prev => prev.map(item => item.id === batch.id ? { ...item, published_to_public_trace: true, sourceBatch: updatedSource } : item));
    } catch (err: any) {
      setError(err?.message || 'Publisering feilet. Sjekk public_trace_batches, migrasjon og RLS.');
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><PackageCheck className="text-green-400" /> Batch og sporbarhet</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Fra olivia.batches · QR-publisering · ingen demo/localStorage</p>
        </div>
        <div className="flex gap-2">
          <button onClick={openLotBuilder} disabled={!eligibleSourceBatches.length || !products.length} className="px-4 py-3 rounded-2xl bg-green-500 text-black font-bold disabled:opacity-40 flex items-center gap-2"><Plus size={18}/> Ny pakkelot</button>
          <button onClick={load} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
          </button>
        </div>
      </div>

      {error && <div className="glass rounded-[2rem] p-5 border border-red-500/30 bg-red-500/10 text-red-100 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Høstet kg', value: stats.kg.toLocaleString('no-NO'), icon: <Scale size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Olje liter', value: stats.liters.toLocaleString('no-NO'), icon: <Factory size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Pakket/klar', value: stats.ready, icon: <CheckCircle2 size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Labverdier', value: stats.lab, icon: <FlaskConical size={18} />, cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
          { label: 'Publisert QR', value: stats.published, icon: <UploadCloud size={18} />, cls: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Pakkelot</p>
          <h3 className="text-lg font-bold text-white">Ferdig produkt → råvarekilde</h3>
          <p className="text-xs text-slate-500 mt-2">En pakkelot opprettes først når produktet faktisk er pakket. Den legger en verifisert produksjonsbevegelse på lager og kobler produktet til de aktive kildebatchene.</p>
          <div className="mt-4 space-y-2">
            {productLots.map(lot => {
              const product = products.find(p => p.id === lot.product_id);
              return <div key={lot.id} className="rounded-xl bg-black/20 border border-white/10 p-3">
                <div className="flex justify-between gap-3"><strong className="text-white">{lot.lot_code}</strong><span className="text-green-400 font-bold">{lot.initial_units} stk</span></div>
                <p className="text-xs text-slate-500 mt-1">{product?.name || lot.product_id} · {lot.status}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button onClick={() => publishLot(lot)} disabled={publishingLotId===lot.id} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black disabled:opacity-50 flex items-center justify-center gap-1">{publishingLotId===lot.id?<Loader2 size={14} className="animate-spin"/>:<UploadCloud size={14}/>} Publiser produkt-QR</button>
                  <a href={`/trace/${lot.traceability_slug || lot.lot_code.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`} target="_blank" rel="noreferrer" className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white flex items-center justify-center gap-1"><ExternalLink size={14}/> Åpne QR</a>
                </div>
              </div>;
            })}
            {!productLots.length && <p className="text-sm text-slate-500">Ingen ekte pakkelot registrert ennå.</p>}
          </div>
        </div>
        <div className={`glass rounded-[2rem] p-6 border ${eligibleSourceBatches.length ? 'border-green-500/20 bg-green-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Kildekontroll</p>
          <h3 className="text-lg font-bold text-white">{eligibleSourceBatches.length} aktive batcher kan brukes</h3>
          <p className="text-xs text-slate-500 mt-2">{eligibleSourceBatches.length ? 'Bare aktive batcher tilbys i pakkelot-byggeren.' : 'De historiske 2025/26-batchene er arkivert og blir derfor ikke tilbudt som kilde for nye produkter. Dette hindrer falsk sporbarhet.'}</p>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4">
          <QrCode className="text-green-400 mt-1" />
          <div>
            <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-2">QR og merkevarehistorie</p>
            <p className="text-white font-bold">Publiser batcher fra olivia.batches til offentlig QR-side.</p>
            <p className="text-xs text-slate-500 mt-2">Når du trykker “Publiser QR”, lagres batchen i public_trace_batches. Da kan etiketten bruke /trace/batch-slug.</p>
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
                <p className="text-xs text-slate-500 mt-1">{batch.variety} · {batch.zone_id} · {batch.harvest_date}{batch.altitude_m ? ` · ${batch.altitude_m} moh.` : ''}</p>
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
              {batch.published_to_public_trace && <p className="text-xs text-green-400 font-bold">Publisert til offentlig QR-side</p>}
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

      {!loading && batches.length === 0 && <div className="glass rounded-[2rem] p-6 border border-white/10 text-slate-400 text-sm">Ingen batcher funnet i olivia.batches. Opprett batcher i Produksjon først.</div>}

      {lotOpen && (
        <div className="fixed inset-0 z-[2200] bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="w-full md:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-[2rem] md:rounded-[2rem] border border-white/15 bg-[#0b0f0c] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><h3 className="text-2xl font-black text-white">Ny pakkelot</h3><p className="text-xs text-slate-500 mt-1">Koble ferdig vare til faktisk råvarebatch.</p></div>
              <button onClick={() => setLotOpen(false)} className="p-2 text-slate-400"><X/></button>
            </div>
            {!createdLotId ? <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
              <label className="text-xs text-slate-400">Produkt<select value={lotProductId} onChange={e=>setLotProductId(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white">{products.map(p=><option key={p.id} value={p.id}>{p.name} · {p.size}</option>)}</select></label>
              <label className="text-xs text-slate-400">Antall ferdige enheter<input type="number" min="1" value={lotUnits} onChange={e=>setLotUnits(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
            </div>
            <label className="block text-xs text-slate-400 mt-3">Lotkode<input value={lotCode} onChange={e=>setLotCode(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <label className="text-xs text-slate-400">Pakkedato<input type="date" value={lotPackedAt} onChange={e=>setLotPackedAt(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
              <label className="text-xs text-slate-400">Best før<input type="date" value={lotBestBefore} onChange={e=>setLotBestBefore(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
            </div>
            <div className="mt-5"><p className="text-xs text-slate-400 font-bold mb-2">Velg kildebatch(er) og faktisk brukt mengde</p><div className="space-y-2">{eligibleSourceBatches.map(batch=>{const checked=lotSourceIds.includes(batch.id);return <div key={batch.id} className="rounded-xl border border-white/10 bg-white/5 p-3"><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={checked} onChange={()=>toggleLotSource(batch.id)}/><div className="flex-1"><p className="text-sm font-bold text-white">{batch.batch_code}</p><p className="text-xs text-slate-500">{batch.variety} · {batch.kg_harvested} kg høstet{batch.liters_oil?' · '+batch.liters_oil+' L olje':''} · {batch.harvest_date}</p></div></label>{checked&&<label className="block text-xs text-slate-400 mt-3">Brukt i denne pakkeloten ({batch.type==='evoo'?'liter':'kg'})<input type="number" min="0" step="0.01" value={lotAllocations[batch.id]||''} onChange={e=>setLotAllocations(prev=>({...prev,[batch.id]:e.target.value}))} className="mt-1 w-full rounded-xl border border-green-500/20 bg-black/40 px-3 py-3 text-white" placeholder="Faktisk mengde"/></label>}</div>})}</div><p className="text-[10px] text-slate-600 mt-2">Mengden blir del av offentlig sporbarhet. Hele kildebatchen brukes aldri automatisk som lotmengde.</p></div>
            <button onClick={saveProductLot} disabled={lotSaving} className="mt-6 w-full rounded-2xl bg-green-500 py-4 font-black text-black flex items-center justify-center gap-2 disabled:opacity-50">{lotSaving?<Loader2 className="animate-spin" size={18}/>:<Save size={18}/>} Opprett pakkelot</button>
            </> : <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-4">
                <p className="font-black text-green-200">Pakkelot er opprettet</p>
                <p className="text-xs text-slate-400 mt-1">Lager og sporbarhet er registrert. Kostnader under er fortsatt bare forslag til du godkjenner dem.</p>
              </div>
              <CostSuggestionReview targetType="lot" targetId={createdLotId} eventDate={lotPackedAt} stage="PAKKING" />
              <button onClick={()=>setLotOpen(false)} className="w-full rounded-2xl bg-white/10 py-4 font-black text-white">Ferdig</button>
            </div>}
          </div>
        </div>
      )}

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <ShieldCheck size={18} className="text-green-400 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">Hva bør inn i en batch?</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Minimum: batchkode, sort, sone, høstedato, kg, formål, prosessering og notat. For premium EVOO: syregrad, peroksid, polyfenoler, sensorisk profil, dato fra høsting til pressing og eventuell økologisk dokumentasjon.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraceabilityBatchesOliviaView;
