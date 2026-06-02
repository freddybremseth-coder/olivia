import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FlaskConical,
  Leaf,
  PackageCheck,
  Printer,
  QrCode,
  Scale,
  Sparkles,
} from 'lucide-react';

type BatchType = 'evoo' | 'table_olives' | 'raw_olives';

type LabelBatch = {
  id: string;
  batch_code: string;
  type: BatchType;
  status?: string;
  harvest_date?: string;
  parcel_id?: string;
  zone_id?: string;
  variety: string;
  altitude_m?: number;
  kg_harvested?: number;
  liters_oil?: number;
  yield_percent?: number;
  acidity_percent?: number;
  peroxide_value?: number;
  polyphenols_mg_kg?: number;
  sensory_profile?: string;
  processing_location?: string;
  lot_notes?: string;
  qr_slug: string;
  created_at?: string;
};

const demoBatches: LabelBatch[] = [
  {
    id: 'label-demo-1',
    batch_code: 'DA-BIAR-2026-EVOO-001',
    type: 'evoo',
    status: 'quality_checked',
    harvest_date: '2026-11-25',
    parcel_id: 'biar-main',
    zone_id: 'zone-b',
    variety: 'Changlot Real / Genovesa',
    altitude_m: 650,
    kg_harvested: 5200,
    liters_oil: 780,
    yield_percent: 15.3,
    acidity_percent: 0.18,
    peroxide_value: 6.4,
    polyphenols_mg_kg: 520,
    sensory_profile: 'Grønn frukt, urter, medium bitterhet og tydelig pepperfinish.',
    processing_location: 'Cooperativa / ekstern presse',
    lot_notes: 'Demo-batch for premium EVOO-sporbarhet.',
    qr_slug: 'da-biar-2026-evoo-001',
  },
];

function getLocalBatches(): LabelBatch[] {
  try {
    const raw = localStorage.getItem('olivia_traceability_batches');
    if (!raw) return demoBatches;
    const parsed = JSON.parse(raw) as LabelBatch[];
    return parsed.length ? parsed : demoBatches;
  } catch {
    return demoBatches;
  }
}

function productName(type: BatchType): string {
  if (type === 'evoo') return 'Extra Virgin Olive Oil';
  if (type === 'table_olives') return 'Bordoliven';
  return 'Rå oliven';
}

function traceUrl(slug: string): string {
  if (typeof window === 'undefined') return `/trace/${slug}`;
  return `${window.location.origin}/trace/${slug}`;
}

function qrUrl(slug: string): string {
  const value = encodeURIComponent(traceUrl(slug));
  return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=14&data=${value}`;
}

function labelText(batch: LabelBatch): string {
  const lines = [
    'DonaAnna',
    productName(batch.type),
    batch.variety,
    `Batch: ${batch.batch_code}`,
    batch.harvest_date ? `Harvest: ${batch.harvest_date}` : undefined,
    `Origin: Biar, Alicante · ${batch.altitude_m || 650} moh.`,
    batch.polyphenols_mg_kg ? `Polyphenols: ${batch.polyphenols_mg_kg} mg/kg` : undefined,
    batch.acidity_percent ? `Acidity: ${batch.acidity_percent}%` : undefined,
    `Trace: ${traceUrl(batch.qr_slug)}`,
  ];
  return lines.filter(Boolean).join('\n');
}

function backLabelText(batch: LabelBatch): string {
  return `Scan QR-koden for å se historien bak denne batchen: sort, høstedato, sone, høyde, prosessering og kvalitetstall. DonaAnna kommer fra Biar i Alicante, ca. ${batch.altitude_m || 650} meter over havet. ${batch.sensory_profile || ''}`.trim();
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

function downloadSvg(batch: LabelBatch) {
  const url = traceUrl(batch.qr_slug);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <rect width="1200" height="800" fill="#06110b"/>
  <rect x="55" y="55" width="1090" height="690" rx="48" fill="#0f1f14" stroke="#48c774" stroke-width="4"/>
  <text x="95" y="140" fill="#48c774" font-family="Arial" font-size="36" font-weight="700" letter-spacing="8">DONAANNA</text>
  <text x="95" y="215" fill="#ffffff" font-family="Arial" font-size="64" font-weight="800">${productName(batch.type)}</text>
  <text x="95" y="285" fill="#d7f7df" font-family="Arial" font-size="42" font-weight="600">${batch.variety}</text>
  <text x="95" y="360" fill="#ffffff" font-family="Arial" font-size="28">Batch: ${batch.batch_code}</text>
  <text x="95" y="405" fill="#ffffff" font-family="Arial" font-size="28">Biar, Alicante · ${batch.altitude_m || 650} moh.</text>
  <text x="95" y="450" fill="#ffffff" font-family="Arial" font-size="28">Harvest: ${batch.harvest_date || '—'}</text>
  <text x="95" y="505" fill="#9ee8b3" font-family="Arial" font-size="24">Scan for traceability, origin and quality data</text>
  <rect x="820" y="170" width="260" height="260" rx="20" fill="#ffffff"/>
  <text x="825" y="480" fill="#ffffff" font-family="Arial" font-size="20">QR image URL:</text>
  <text x="825" y="510" fill="#9ee8b3" font-family="Arial" font-size="16">${url}</text>
</svg>`;
  downloadText(`${batch.qr_slug}-label.svg`, svg);
}

const LabelQrGeneratorView: React.FC = () => {
  const batches = useMemo(() => getLocalBatches(), []);
  const [selectedId, setSelectedId] = useState(batches[0]?.id || '');
  const [copied, setCopied] = useState<string | null>(null);
  const selected = batches.find(batch => batch.id === selectedId) || batches[0];

  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  if (!selected) {
    return <div className="text-slate-400 p-8">Ingen batcher funnet. Opprett en batch først.</div>;
  }

  const qr = qrUrl(selected.qr_slug);
  const url = traceUrl(selected.qr_slug);
  const front = labelText(selected);
  const back = backLabelText(selected);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><QrCode className="text-green-400" /> QR og etikett</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">DonaAnna · batch QR · etiketttekst · enkel label eksport</p>
        </div>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white min-w-[280px]">
          {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.batch_code}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
          <div className="rounded-[2rem] bg-white p-8 flex items-center justify-center">
            <img src={qr} alt={`QR for ${selected.batch_code}`} className="w-full max-w-[360px] aspect-square object-contain" />
          </div>
          <div className="mt-5 space-y-3">
            <p className="text-xs text-slate-500 break-all">{url}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button onClick={() => copy('url', url)} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Copy size={18} /> {copied === 'url' ? 'Kopiert' : 'Kopier URL'}</button>
              <a href={qr} target="_blank" rel="noreferrer" className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><ExternalLink size={18} /> Åpne QR</a>
            </div>
          </div>
        </div>

        <div className="xl:col-span-7 space-y-6">
          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-2">Etikett-preview</p>
            <div className="rounded-[2rem] border border-green-500/20 bg-[#08130c] p-7 min-h-[360px] flex flex-col justify-between">
              <div>
                <p className="text-green-400 uppercase tracking-[0.35em] font-black text-xs">DonaAnna</p>
                <h3 className="text-4xl font-black text-white mt-4">{productName(selected.type)}</h3>
                <p className="text-2xl text-green-100 font-bold mt-3">{selected.variety}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-8">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10"><Scale size={16} className="text-green-400 mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Batch</p><p className="text-xs text-white font-bold truncate">{selected.batch_code}</p></div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10"><Leaf size={16} className="text-green-400 mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Opprinnelse</p><p className="text-xs text-white font-bold">Biar · {selected.altitude_m || 650} moh.</p></div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10"><FlaskConical size={16} className="text-green-400 mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Syre</p><p className="text-xs text-white font-bold">{selected.acidity_percent || '—'}%</p></div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10"><Award size={16} className="text-green-400 mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Polyfenol</p><p className="text-xs text-white font-bold">{selected.polyphenols_mg_kg || '—'}</p></div>
              </div>
              <p className="text-xs text-slate-400 mt-6">Scan QR-koden for sporbarhet, høstedato, sone og kvalitetsdata.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => copy('front', front)} className="glass rounded-[2rem] p-5 border border-white/10 text-left hover:bg-white/[0.06] transition-all"><Copy className="text-green-400 mb-3" /><p className="text-white font-bold">Kopier frontetikett</p><p className="text-xs text-slate-500 mt-2 whitespace-pre-line">{front}</p>{copied === 'front' && <p className="text-green-400 text-xs font-bold mt-3">Kopiert</p>}</button>
            <button onClick={() => copy('back', back)} className="glass rounded-[2rem] p-5 border border-white/10 text-left hover:bg-white/[0.06] transition-all"><PackageCheck className="text-green-400 mb-3" /><p className="text-white font-bold">Kopier baketikett</p><p className="text-xs text-slate-500 mt-2">{back}</p>{copied === 'back' && <p className="text-green-400 text-xs font-bold mt-3">Kopiert</p>}</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => downloadText(`${selected.qr_slug}-label-text.txt`, `${front}\n\n--- Baketikett ---\n${back}`)} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Download size={18} /> Tekstfil</button>
            <button onClick={() => downloadSvg(selected)} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Download size={18} /> SVG-label</button>
            <button onClick={() => window.print()} className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Printer size={18} /> Print</button>
          </div>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <Sparkles className="text-green-400 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">Neste designsteg</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Denne modulen gir praktisk QR og tekstgrunnlag. For profesjonell trykkfil bør neste steg være faste etikettmaler i riktige mål, farger, ingredienser, nettoinnhold, produsentinfo, lot/best før og EU-merking.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelQrGeneratorView;
