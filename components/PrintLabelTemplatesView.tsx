import React, { useMemo, useState } from 'react';
import {
  Copy,
  Download,
  FileText,
  Leaf,
  PackageCheck,
  Printer,
  QrCode,
  Ruler,
  Scale,
  Sparkles,
} from 'lucide-react';

type BatchType = 'evoo' | 'table_olives' | 'raw_olives';
type TemplateSize = 'front_60x90' | 'back_80x60' | 'round_45';

type LabelBatch = {
  id: string;
  batch_code: string;
  type: BatchType;
  harvest_date?: string;
  variety: string;
  altitude_m?: number;
  acidity_percent?: number;
  polyphenols_mg_kg?: number;
  sensory_profile?: string;
  qr_slug: string;
};

const demoBatches: LabelBatch[] = [
  {
    id: 'print-demo-1',
    batch_code: 'DA-BIAR-2026-EVOO-001',
    type: 'evoo',
    harvest_date: '2026-11-25',
    variety: 'Changlot Real / Genovesa',
    altitude_m: 650,
    acidity_percent: 0.18,
    polyphenols_mg_kg: 520,
    sensory_profile: 'Grønn frukt, urter, medium bitterhet og tydelig pepperfinish.',
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
  if (type === 'table_olives') return 'Bordoliven';
  if (type === 'raw_olives') return 'Oliven';
  return 'Extra Virgin Olive Oil';
}

function traceUrl(slug: string): string {
  if (typeof window === 'undefined') return `/trace/${slug}`;
  return `${window.location.origin}/trace/${slug}`;
}

function qrUrl(slug: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(traceUrl(slug))}`;
}

function templateMeta(size: TemplateSize) {
  if (size === 'back_80x60') return { label: 'Baketikett 80 × 60 mm', width: 80, height: 60, radius: 4 };
  if (size === 'round_45') return { label: 'Rund toppetikett Ø45 mm', width: 45, height: 45, radius: 999 };
  return { label: 'Frontetikett 60 × 90 mm', width: 60, height: 90, radius: 4 };
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

function buildSvg(batch: LabelBatch, size: TemplateSize): string {
  const meta = templateMeta(size);
  const w = meta.width * 10;
  const h = meta.height * 10;
  const isRound = size === 'round_45';
  const title = productName(batch.type);
  const qr = traceUrl(batch.qr_slug);

  if (isRound) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <circle cx="${w / 2}" cy="${h / 2}" r="${w / 2 - 8}" fill="#06110b" stroke="#48c774" stroke-width="6"/>
  <text x="${w / 2}" y="${h * 0.28}" text-anchor="middle" fill="#48c774" font-family="Arial" font-size="34" font-weight="800" letter-spacing="5">DONAANNA</text>
  <text x="${w / 2}" y="${h * 0.48}" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="40" font-weight="900">${batch.variety.slice(0, 18)}</text>
  <text x="${w / 2}" y="${h * 0.64}" text-anchor="middle" fill="#d7f7df" font-family="Arial" font-size="24">Biar · ${batch.altitude_m || 650} moh.</text>
  <text x="${w / 2}" y="${h * 0.78}" text-anchor="middle" fill="#9ee8b3" font-family="Arial" font-size="20">Scan QR for trace</text>
</svg>`;
  }

  if (size === 'back_80x60') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#06110b"/>
  <rect x="20" y="20" width="${w - 40}" height="${h - 40}" rx="28" fill="#0f1f14" stroke="#48c774" stroke-width="3"/>
  <text x="48" y="75" fill="#48c774" font-family="Arial" font-size="24" font-weight="800" letter-spacing="5">DONAANNA TRACE</text>
  <text x="48" y="128" fill="#ffffff" font-family="Arial" font-size="24" font-weight="700">Scan QR-koden for batch, høstedato, sone og kvalitet.</text>
  <text x="48" y="178" fill="#d7f7df" font-family="Arial" font-size="22">Biar, Alicante · ${batch.altitude_m || 650} moh.</text>
  <text x="48" y="225" fill="#ffffff" font-family="Arial" font-size="20">Lot: ${batch.batch_code}</text>
  <text x="48" y="265" fill="#ffffff" font-family="Arial" font-size="20">Harvest: ${batch.harvest_date || '—'}</text>
  <text x="48" y="315" fill="#9ee8b3" font-family="Arial" font-size="18">${qr}</text>
  <rect x="${w - 220}" y="90" width="150" height="150" rx="18" fill="#ffffff"/>
  <text x="${w - 145}" y="270" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="18">QR here</text>
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#06110b"/>
  <rect x="25" y="25" width="${w - 50}" height="${h - 50}" rx="32" fill="#0f1f14" stroke="#48c774" stroke-width="4"/>
  <text x="55" y="105" fill="#48c774" font-family="Arial" font-size="28" font-weight="800" letter-spacing="7">DONAANNA</text>
  <text x="55" y="185" fill="#ffffff" font-family="Arial" font-size="52" font-weight="900">${title}</text>
  <text x="55" y="250" fill="#d7f7df" font-family="Arial" font-size="34" font-weight="700">${batch.variety}</text>
  <text x="55" y="330" fill="#ffffff" font-family="Arial" font-size="22">Biar, Alicante · ${batch.altitude_m || 650} moh.</text>
  <text x="55" y="370" fill="#ffffff" font-family="Arial" font-size="22">Batch: ${batch.batch_code}</text>
  <text x="55" y="410" fill="#ffffff" font-family="Arial" font-size="22">Harvest: ${batch.harvest_date || '—'}</text>
  <text x="55" y="470" fill="#9ee8b3" font-family="Arial" font-size="20">Scan QR for traceability</text>
  <rect x="${w - 225}" y="${h - 250}" width="150" height="150" rx="18" fill="#ffffff"/>
  <text x="${w - 150}" y="${h - 70}" text-anchor="middle" fill="#ffffff" font-family="Arial" font-size="18">QR here</text>
</svg>`;
}

const PrintLabelTemplatesView: React.FC = () => {
  const batches = useMemo(() => getLocalBatches(), []);
  const [selectedId, setSelectedId] = useState(batches[0]?.id || '');
  const [size, setSize] = useState<TemplateSize>('front_60x90');
  const [copied, setCopied] = useState(false);
  const batch = batches.find(item => item.id === selectedId) || batches[0];
  const meta = templateMeta(size);
  const svg = buildSvg(batch, size);
  const qr = qrUrl(batch.qr_slug);

  const copySvg = async () => {
    await navigator.clipboard.writeText(svg);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const downloadSvg = () => downloadText(`${batch.qr_slug}-${size}.svg`, svg);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Ruler className="text-green-400" /> Trykkmaler</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Faste mål · frontetikett · baketikett · rund toppetikett · SVG / print</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white min-w-[260px]">
            {batches.map(item => <option key={item.id} value={item.id}>{item.batch_code}</option>)}
          </select>
          <select value={size} onChange={e => setSize(e.target.value as TemplateSize)} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white">
            <option value="front_60x90">Front 60 × 90 mm</option>
            <option value="back_80x60">Bak 80 × 60 mm</option>
            <option value="round_45">Rund Ø45 mm</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
          <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-4">{meta.label}</p>
          <div className="bg-white rounded-[2rem] p-8 overflow-auto">
            <div
              className="mx-auto shadow-2xl"
              style={{
                width: `${meta.width * 4}px`,
                height: `${meta.height * 4}px`,
                borderRadius: size === 'round_45' ? '999px' : '16px',
                background: '#06110b',
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-4">For ekte trykk: eksporter SVG og send til designer/trykkeri for bleed, CMYK, font og korrekt QR-plassering.</p>
        </div>

        <div className="xl:col-span-7 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              ['Mal', meta.label, <FileText size={18} />],
              ['Batch', batch.batch_code, <PackageCheck size={18} />],
              ['Opprinnelse', `Biar · ${batch.altitude_m || 650} moh.`, <Leaf size={18} />],
              ['QR', `/trace/${batch.qr_slug}`, <QrCode size={18} />],
            ].map(([label, value, icon]) => (
              <div key={String(label)} className="glass rounded-[2rem] p-5 border border-white/10">
                <div className="text-green-400 mb-2">{icon}</div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p>
                <p className="text-sm text-white font-bold mt-1 break-all">{value}</p>
              </div>
            ))}
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">QR-bilde for trykkplassering</p>
            <div className="flex flex-col md:flex-row gap-5 items-start">
              <div className="bg-white rounded-2xl p-4"><img src={qr} alt="QR" className="w-40 h-40" /></div>
              <div>
                <p className="text-white font-bold">{traceUrl(batch.qr_slug)}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">QR-koden bør testes med mobil etter trykkprøve. Bruk høy kontrast og nok luft rundt koden.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={downloadSvg} className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Download size={18} /> Last ned SVG</button>
            <button onClick={copySvg} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Copy size={18} /> {copied ? 'Kopiert' : 'Kopier SVG'}</button>
            <button onClick={() => window.print()} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Printer size={18} /> Print</button>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
            <div className="flex items-start gap-3"><Sparkles className="text-green-400 mt-0.5" /><div><p className="text-sm text-white font-bold">Trykknotat</p><p className="text-xs text-slate-500 mt-2 leading-relaxed">Disse SVG-malene er praktiske arbeidsfiler. Profesjonell trykkproduksjon bør legge til bleed, sikker marg, CMYK-farger, låste fonter/outline og nøyaktig QR-bilde i høy oppløsning.</p></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintLabelTemplatesView;
