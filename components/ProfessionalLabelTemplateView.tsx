import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  FlaskConical,
  Globe2,
  Info,
  Leaf,
  PackageCheck,
  Printer,
  QrCode,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

type BatchType = 'evoo' | 'table_olives' | 'raw_olives';
type LabelLanguage = 'no' | 'en' | 'es';

type LabelBatch = {
  id: string;
  batch_code: string;
  type: BatchType;
  status?: string;
  harvest_date?: string;
  zone_id?: string;
  variety: string;
  altitude_m?: number;
  liters_oil?: number;
  acidity_percent?: number;
  peroxide_value?: number;
  polyphenols_mg_kg?: number;
  sensory_profile?: string;
  processing_location?: string;
  qr_slug: string;
};

type LabelSettings = {
  brand: string;
  producer: string;
  address: string;
  countryOfOrigin: string;
  netContent: string;
  bestBefore: string;
  storage: string;
  ingredients: string;
  nutrition: string;
  organicText: string;
  extraClaims: string;
};

const demoBatches: LabelBatch[] = [
  {
    id: 'pro-label-demo-1',
    batch_code: 'DA-BIAR-2026-EVOO-001',
    type: 'evoo',
    status: 'quality_checked',
    harvest_date: '2026-11-25',
    zone_id: 'zone-b',
    variety: 'Changlot Real / Genovesa',
    altitude_m: 650,
    liters_oil: 780,
    acidity_percent: 0.18,
    peroxide_value: 6.4,
    polyphenols_mg_kg: 520,
    sensory_profile: 'Grønn frukt, urter, medium bitterhet og tydelig pepperfinish.',
    processing_location: 'Cooperativa / ekstern presse',
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

function traceUrl(slug: string): string {
  if (typeof window === 'undefined') return `/trace/${slug}`;
  return `${window.location.origin}/trace/${slug}`;
}

function productTitle(type: BatchType, language: LabelLanguage): string {
  if (type === 'table_olives') {
    if (language === 'es') return 'Aceitunas de Mesa';
    if (language === 'en') return 'Table Olives';
    return 'Bordoliven';
  }
  if (type === 'raw_olives') {
    if (language === 'es') return 'Aceitunas';
    if (language === 'en') return 'Olives';
    return 'Oliven';
  }
  if (language === 'es') return 'Aceite de Oliva Virgen Extra';
  if (language === 'en') return 'Extra Virgin Olive Oil';
  return 'Extra Virgin Olivenolje';
}

function defaultSettings(batch: LabelBatch, language: LabelLanguage): LabelSettings {
  const evooIngredients = language === 'es' ? 'Aceite de oliva virgen extra.' : language === 'en' ? 'Extra virgin olive oil.' : 'Extra virgin olivenolje.';
  const tableIngredients = language === 'es' ? 'Aceitunas, agua, sal.' : language === 'en' ? 'Olives, water, salt.' : 'Oliven, vann, salt.';
  const storage = language === 'es'
    ? 'Conservar en lugar fresco y oscuro. Proteger de la luz y del calor.'
    : language === 'en'
      ? 'Store in a cool, dark place. Protect from light and heat.'
      : 'Oppbevares kjølig og mørkt. Beskyttes mot lys og varme.';
  const nutrition = batch.type === 'evoo'
    ? 'Energi 3389 kJ / 824 kcal · Fett 91,6 g · hvorav mettede fettsyrer 13,8 g · Karbohydrat 0 g · Sukker 0 g · Protein 0 g · Salt 0 g per 100 ml.'
    : 'Næringsverdier må beregnes/avklares for ferdig produkt per 100 g.';

  return {
    brand: 'DonaAnna',
    producer: 'DonaAnna / Freddy Bremseth',
    address: 'Biar, Alicante, España',
    countryOfOrigin: language === 'es' ? 'Origen: España' : language === 'en' ? 'Origin: Spain' : 'Opprinnelse: Spania',
    netContent: batch.type === 'evoo' ? '500 ml' : '350 g',
    bestBefore: 'Best før / Consumir preferentemente antes de: DD.MM.YYYY',
    storage,
    ingredients: batch.type === 'evoo' ? evooIngredients : tableIngredients,
    nutrition,
    organicText: 'Producto ecológico / Organic / Økologisk – bruk kun hvis sertifisering og kontrollorgan er bekreftet.',
    extraClaims: batch.type === 'evoo' ? 'Primera cosecha · Biar 650 moh. · Batch traceability' : 'Biar 650 moh. · Batch traceability',
  };
}

function buildRequiredLabel(batch: LabelBatch, settings: LabelSettings, language: LabelLanguage): string {
  const title = productTitle(batch.type, language);
  return [
    settings.brand,
    title,
    batch.variety,
    settings.netContent,
    settings.countryOfOrigin,
    `Batch/Lot: ${batch.batch_code}`,
    batch.harvest_date ? `Harvest/Cosecha: ${batch.harvest_date}` : undefined,
    settings.bestBefore,
    `Ingredients/Ingredientes: ${settings.ingredients}`,
    settings.storage,
    `Producer/Productor: ${settings.producer}`,
    settings.address,
    `Trace: ${traceUrl(batch.qr_slug)}`,
  ].filter(Boolean).join('\n');
}

function buildPremiumText(batch: LabelBatch, settings: LabelSettings, language: LabelLanguage): string {
  const base = language === 'es'
    ? `DonaAnna procede de Biar, Alicante, a unos ${batch.altitude_m || 650} metros de altitud. Escanea el QR para ver origen, lote, cosecha, zona y datos de calidad.`
    : language === 'en'
      ? `DonaAnna comes from Biar, Alicante, around ${batch.altitude_m || 650} metres above sea level. Scan the QR to see origin, batch, harvest, zone and quality data.`
      : `DonaAnna kommer fra Biar i Alicante, ca. ${batch.altitude_m || 650} meter over havet. Skann QR-koden for opprinnelse, batch, høsting, sone og kvalitetsdata.`;
  return `${base}\n\n${settings.extraClaims}\n\n${batch.sensory_profile || ''}`.trim();
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

const ProfessionalLabelTemplateView: React.FC = () => {
  const batches = useMemo(() => getLocalBatches(), []);
  const [selectedId, setSelectedId] = useState(batches[0]?.id || '');
  const [language, setLanguage] = useState<LabelLanguage>('es');
  const [copied, setCopied] = useState<string | null>(null);
  const selected = batches.find(batch => batch.id === selectedId) || batches[0];
  const [settings, setSettings] = useState<LabelSettings>(() => defaultSettings(selected || demoBatches[0], 'es'));

  const updateLanguage = (next: LabelLanguage) => {
    setLanguage(next);
    setSettings(defaultSettings(selected || demoBatches[0], next));
  };

  const required = selected ? buildRequiredLabel(selected, settings, language) : '';
  const premium = selected ? buildPremiumText(selected, settings, language) : '';
  const fullExport = `${required}\n\n--- Premium/story text ---\n${premium}\n\n--- Nutrition ---\n${settings.nutrition}\n\n--- Organic note ---\n${settings.organicText}`;

  const copy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  if (!selected) return <div className="p-8 text-slate-400">Ingen batcher funnet.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><FileText className="text-green-400" /> Profesjonell etikett</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">EU/Spania etikettgrunnlag · DonaAnna · batch · lovtekst · premiumtekst</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white min-w-[260px]">
            {batches.map(batch => <option key={batch.id} value={batch.id}>{batch.batch_code}</option>)}
          </select>
          <select value={language} onChange={e => updateLanguage(e.target.value as LabelLanguage)} className="bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white">
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="no">Norsk</option>
          </select>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-yellow-500/25 bg-yellow-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-yellow-400 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">Viktig juridisk merknad</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Dette er et profesjonelt etikettgrunnlag, ikke juridisk godkjenning. Før salg bør etiketten kontrolleres mot gjeldende EU-/spanske regler, laboratorietall, nettoinnhold, lot, produsentregistrering, økologisk sertifisering og eventuell matmyndighet/rådgiver.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 space-y-4">
          <div className="glass rounded-[2rem] p-6 border border-white/10">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Etikettfelter</p>
            <div className="space-y-3">
              {[
                ['brand', 'Brand'],
                ['producer', 'Produsent'],
                ['address', 'Adresse'],
                ['netContent', 'Nettoinnhold'],
                ['bestBefore', 'Best før'],
                ['countryOfOrigin', 'Opprinnelse'],
                ['ingredients', 'Ingredienser'],
                ['storage', 'Oppbevaring'],
                ['organicText', 'Øko-tekst'],
                ['extraClaims', 'Ekstra/premium claim'],
              ].map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</span>
                  <input value={(settings as any)[key]} onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))} className="mt-1 w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm" />
                </label>
              ))}
              <label className="block">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Næring</span>
                <textarea value={settings.nutrition} onChange={e => setSettings(prev => ({ ...prev, nutrition: e.target.value }))} className="mt-1 w-full min-h-[90px] bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm" />
              </label>
            </div>
          </div>
        </div>

        <div className="xl:col-span-7 space-y-6">
          <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
            <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-4">Front / lovpålagt informasjon</p>
            <div className="rounded-[2rem] bg-[#08130c] border border-green-500/20 p-7 min-h-[420px]">
              <p className="text-green-400 uppercase tracking-[0.4em] font-black text-xs">{settings.brand}</p>
              <h3 className="text-4xl font-black text-white mt-4">{productTitle(selected.type, language)}</h3>
              <p className="text-2xl text-green-100 font-bold mt-2">{selected.variety}</p>
              <div className="grid grid-cols-2 gap-3 mt-7">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10"><Scale size={16} className="text-green-400 mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Netto</p><p className="text-xs text-white font-bold">{settings.netContent}</p></div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10"><PackageCheck size={16} className="text-green-400 mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Lot</p><p className="text-xs text-white font-bold truncate">{selected.batch_code}</p></div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10"><Globe2 size={16} className="text-green-400 mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Origin</p><p className="text-xs text-white font-bold">{settings.countryOfOrigin}</p></div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10"><QrCode size={16} className="text-green-400 mb-1" /><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Trace</p><p className="text-xs text-white font-bold truncate">/trace/{selected.qr_slug}</p></div>
              </div>
              <p className="text-xs text-slate-400 mt-6 whitespace-pre-line">{settings.storage}\n{settings.bestBefore}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button onClick={() => copy('required', required)} className="glass rounded-[2rem] p-5 border border-white/10 text-left hover:bg-white/[0.06] transition-all"><Copy className="text-green-400 mb-3" /><p className="text-white font-bold">Kopier etiketttekst</p><p className="text-xs text-slate-500 mt-2 whitespace-pre-line line-clamp-[10]">{required}</p>{copied === 'required' && <p className="text-green-400 text-xs font-bold mt-3">Kopiert</p>}</button>
            <button onClick={() => copy('premium', premium)} className="glass rounded-[2rem] p-5 border border-white/10 text-left hover:bg-white/[0.06] transition-all"><Sparkles className="text-green-400 mb-3" /><p className="text-white font-bold">Kopier premiumtekst</p><p className="text-xs text-slate-500 mt-2 line-clamp-[10]">{premium}</p>{copied === 'premium' && <p className="text-green-400 text-xs font-bold mt-3">Kopiert</p>}</button>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-4">Kontrollpunkter før trykk</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Nettoinnhold', settings.netContent],
                ['Lot/batch', selected.batch_code],
                ['Best før', settings.bestBefore],
                ['Produsent', settings.producer],
                ['Opprinnelse', settings.countryOfOrigin],
                ['Ingredienser', settings.ingredients],
                ['Oppbevaring', settings.storage],
                ['QR-sporbarhet', traceUrl(selected.qr_slug)],
              ].map(([label, value]) => (
                <div key={label} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2"><CheckCircle2 size={14} className="text-green-400 mt-0.5" /><div><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-xs text-white break-all">{value}</p></div></div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={() => downloadText(`${selected.qr_slug}-professional-label.txt`, fullExport)} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Download size={18} /> Tekstfil</button>
            <button onClick={() => copy('all', fullExport)} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Copy size={18} /> {copied === 'all' ? 'Kopiert' : 'Kopier alt'}</button>
            <button onClick={() => window.print()} className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Printer size={18} /> Print</button>
          </div>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <Info className="text-green-400 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">Neste mulige steg</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">Etter dette kan vi lage faste trykkmaler i konkrete mål, for eksempel 60×90 mm flaskeetikett, 80×60 mm baketikett og rund toppetikett, samt eksportere mer komplett SVG/PDF.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalLabelTemplateView;
