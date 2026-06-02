import React, { useMemo } from 'react';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  Factory,
  FlaskConical,
  Leaf,
  MapPin,
  Mountain,
  PackageCheck,
  QrCode,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type PublicBatch = {
  id: string;
  batch_code: string;
  type: 'evoo' | 'table_olives' | 'raw_olives';
  status: string;
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
};

const demoBatch: PublicBatch = {
  id: 'public-demo',
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
};

function getLocalBatches(): PublicBatch[] {
  try {
    const raw = localStorage.getItem('olivia_traceability_batches');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PublicBatch[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function typeLabel(type: PublicBatch['type']): string {
  if (type === 'evoo') return 'Extra Virgin Olive Oil';
  if (type === 'table_olives') return 'Bordoliven';
  return 'Rå oliven';
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    planned: 'Planlagt',
    harvested: 'Høstet',
    processing: 'Under prosessering',
    quality_checked: 'Kvalitetstestet',
    packed: 'Pakket',
    ready_for_sale: 'Klar for salg',
  };
  return labels[status] || status;
}

function statValue(value: unknown, suffix = ''): string {
  if (value === undefined || value === null || value === '') return '—';
  return `${value}${suffix}`;
}

interface PublicTracePageProps {
  slug?: string;
}

const PublicTracePage: React.FC<PublicTracePageProps> = ({ slug }) => {
  const batch = useMemo(() => {
    const batches = getLocalBatches();
    return batches.find(item => item.qr_slug === slug || item.batch_code?.toLowerCase() === slug) || demoBatch;
  }, [slug]);

  const isDemo = batch.id === 'public-demo' && slug !== batch.qr_slug;

  return (
    <div className="min-h-screen bg-[#060807] text-white overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 10%, #22c55e 0, transparent 30%), radial-gradient(circle at 90% 20%, #84cc16 0, transparent 24%), radial-gradient(circle at 50% 90%, #14532d 0, transparent 28%)' }} />

      <main className="relative max-w-6xl mx-auto px-5 py-10 md:py-16 space-y-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500 text-black flex items-center justify-center font-black text-2xl shadow-2xl shadow-green-500/20">D</div>
            <div>
              <p className="text-xs text-green-400 uppercase tracking-[0.35em] font-black">DonaAnna Trace</p>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight">Fra tre til produkt</h1>
            </div>
          </div>
          <div className="glass rounded-3xl border border-white/10 p-4 flex items-center gap-3 bg-white/[0.04]">
            <QrCode className="text-green-400" />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">QR / Batch</p>
              <p className="font-bold text-white">{batch.batch_code}</p>
            </div>
          </div>
        </header>

        {isDemo && (
          <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
            Denne QR-siden viser demo-data fordi batch-slug ikke ble funnet lokalt. Når batchene flyttes til Supabase/offentlig database, kan siden hente ekte batch direkte fra QR-koden.
          </div>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-8 md:p-10 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Leaf className="text-green-400" />
              <p className="text-xs text-green-400 uppercase tracking-[0.25em] font-black">{typeLabel(batch.type)}</p>
            </div>
            <h2 className="text-4xl md:text-6xl font-black leading-tight">{batch.variety}</h2>
            <p className="text-slate-400 mt-5 text-lg leading-relaxed">
              Denne batchen kommer fra DonaAnna-gården i Biar, Alicante. Gården ligger i fjellområdet rundt 650 meter over havet, som gir senere modning enn kyst og lavland.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
              {[
                ['Høstedato', batch.harvest_date, <CalendarDays size={18} />],
                ['Sone', batch.zone_id, <MapPin size={18} />],
                ['Høyde', `${batch.altitude_m} moh.`, <Mountain size={18} />],
                ['Status', statusLabel(batch.status), <CheckCircle2 size={18} />],
              ].map(([label, value, icon]) => (
                <div key={String(label)} className="rounded-2xl bg-black/30 border border-white/10 p-4">
                  <div className="text-green-400 mb-2">{icon}</div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
                  <p className="text-white font-bold mt-1">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-[2.5rem] border border-green-500/20 bg-green-500/10 p-7">
              <div className="flex items-center gap-3 mb-4"><ShieldCheck className="text-green-400" /><h3 className="text-xl font-black">Sporbarhet</h3></div>
              <p className="text-sm text-slate-300 leading-relaxed">Batchkode, sone, sort, høstedato, prosessering og kvalitetstall gjør produktet mer transparent og enklere å dokumentere.</p>
            </div>

            <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-7">
              <div className="flex items-center gap-3 mb-4"><Sparkles className="text-yellow-400" /><h3 className="text-xl font-black">Smaksprofil</h3></div>
              <p className="text-sm text-slate-300 leading-relaxed">{batch.sensory_profile || 'Sensorisk profil er ikke registrert ennå.'}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Kg høstet', statValue(batch.kg_harvested, ' kg'), <Scale size={18} />],
            ['Prosessert', statValue(batch.kg_processed, ' kg'), <Factory size={18} />],
            ['Olje', statValue(batch.liters_oil, ' L'), <PackageCheck size={18} />],
            ['Utbytte', statValue(batch.yield_percent, '%'), <Award size={18} />],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="text-green-400 mb-3">{icon}</div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
              <p className="text-2xl md:text-3xl font-black mt-1">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-7">
            <div className="flex items-center gap-3 mb-5"><FlaskConical className="text-purple-400" /><h3 className="text-xl font-black">Kvalitet og labverdier</h3></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-black/30 border border-white/10 p-4"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Syre</p><p className="text-white font-black text-xl mt-1">{statValue(batch.acidity_percent, '%')}</p></div>
              <div className="rounded-2xl bg-black/30 border border-white/10 p-4"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Peroksid</p><p className="text-white font-black text-xl mt-1">{statValue(batch.peroxide_value)}</p></div>
              <div className="rounded-2xl bg-black/30 border border-white/10 p-4"><p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Polyfenol</p><p className="text-white font-black text-xl mt-1">{statValue(batch.polyphenols_mg_kg)}</p></div>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-relaxed">Verdier bør oppdateres fra laboratorieanalyse når batchen er testet. Siden kan brukes som digitalt kvalitetskort for flasker og glass.</p>
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-7">
            <div className="flex items-center gap-3 mb-5"><Factory className="text-yellow-400" /><h3 className="text-xl font-black">Prosessering</h3></div>
            <p className="text-sm text-slate-300 leading-relaxed"><strong className="text-white">Sted:</strong> {batch.processing_location || 'Ikke registrert'}</p>
            <p className="text-sm text-slate-300 leading-relaxed mt-3"><strong className="text-white">Notat:</strong> {batch.lot_notes || 'Ingen batch-notater registrert.'}</p>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-green-500/20 bg-green-500/5 p-7 md:p-9">
          <div className="flex items-start gap-4">
            <PackageCheck className="text-green-400 mt-1" />
            <div>
              <h3 className="text-2xl font-black">DonaAnna kvalitetsfortelling</h3>
              <p className="text-slate-300 mt-3 leading-relaxed">
                DonaAnna bygger sporbarhet fra felt til ferdig produkt. Målet er at hver flaske olje og hvert glass bordoliven skal kunne kobles til sort, sone, høsting, prosessering og kvalitet — ikke bare en etikett, men en dokumentert historie.
              </p>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-600 pb-8">
          DonaAnna · Biar, Alicante · QR sporbarhet · {batch.batch_code}
        </footer>
      </main>
    </div>
  );
};

export default PublicTracePage;
