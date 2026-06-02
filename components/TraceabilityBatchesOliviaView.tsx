import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Factory, FlaskConical, Link2, Loader2, PackageCheck, QrCode, RefreshCcw, Scale, ShieldCheck, UploadCloud } from 'lucide-react';
import type { Batch } from '../types';
import { fetchBatches, upsertBatch } from '../services/db';
import { publishTraceBatch } from '../services/publicTrace';

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
    altitude_m: 650,
    kg_harvested: Number(batch.weight || 0),
    kg_processed: processedKg,
    liters_oil: liters,
    yield_percent: yieldPercent,
    acidity_percent: batch.qualityMetrics?.acidity,
    peroxide_value: batch.qualityMetrics?.peroxide,
    polyphenols_mg_kg: batch.qualityMetrics?.phenols,
    sensory_profile: batch.recipeName ? `Oppskrift: ${batch.recipeName}` : undefined,
    processing_location: 'DonaAnna / Biar',
    lot_notes: batch.logs?.map(log => `${log.stage}: ${log.notes}`).join(' · '),
    qr_slug: slugify(batchCode),
    published_to_public_trace: !!batch.logs?.some(log => log.stage === 'SALG' && log.notes?.includes('published_to_public_trace')),
    published_at: undefined,
    sourceBatch: batch,
  };
}

function publicStoryForBatch(batch: TraceBatch): string {
  return `Denne batchen kommer fra DonaAnna-gården i Biar, Alicante. Gården ligger rundt ${batch.altitude_m || 650} meter over havet, som gir senere modning enn kyst og lavland. Batchen er registrert med sort, sone, høstedato, prosessering og kvalitetstall.`;
}

const TraceabilityBatchesOliviaView: React.FC = () => {
  const [batches, setBatches] = useState<TraceBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchBatches();
      setBatches(rows.map(batchToTrace));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente batcher fra olivia.batches.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

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
        <button onClick={load} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
        </button>
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
