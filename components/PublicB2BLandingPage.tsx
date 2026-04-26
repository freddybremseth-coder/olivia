import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Droplets,
  FileText,
  Languages,
  Leaf,
  LockKeyhole,
  Menu,
  Package,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  SunMedium,
  Trees,
  X,
} from 'lucide-react';
import { fetchPublicEstateSignal, PublicEstateSignal } from '../services/publicEstate';

interface LandingPageProps {
  onLogin: () => void;
  onAdminLogin: () => void;
  onRegister: () => void;
}

type Locale = 'no' | 'es' | 'en';

const copy = {
  no: {
    eyebrow: 'Ultra-premium estate oil · Biar, Alicante',
    headline: 'Doña Anna for kompromissløse kokker.',
    subhead: 'Økologisk olivenolje og bordoliven fra Biar. Tidlig høstet, batchsporet og laget for restauranter, distributører og spesialbutikker som trenger en historie de kan servere.',
    cta: 'Bestill tasting kit',
    portal: 'B2B portal',
    specTitle: 'Tekniske data for innkjøpere',
    traceTitle: 'Transparencia Total',
    traceText: 'Hver flaske kan kobles til batch, høstedato, parsell, sort, sensorisk profil og analyseverdier i Olivia OS.',
  },
  es: {
    eyebrow: 'Aceite de alta gama · Biar, Alicante',
    headline: 'Doña Anna para chefs exigentes.',
    subhead: 'Aceite ecológico y aceitunas de mesa de Biar. Cosecha temprana, trazabilidad por lote y una historia clara para restaurantes, distribuidores y tiendas gourmet.',
    cta: 'Solicitar tasting kit',
    portal: 'Portal B2B',
    specTitle: 'Datos técnicos para compradores',
    traceTitle: 'Transparencia Total',
    traceText: 'Cada botella puede mostrar lote, fecha de cosecha, parcela, variedad, perfil sensorial y análisis desde Olivia OS.',
  },
  en: {
    eyebrow: 'Ultra-premium estate oil · Biar, Alicante',
    headline: 'Doña Anna for uncompromising chefs.',
    subhead: 'Organic olive oil and table olives from Biar. Early harvested, batch-traceable and built for restaurants, distributors and specialty buyers who need a story worth serving.',
    cta: 'Request tasting kit',
    portal: 'B2B portal',
    specTitle: 'Technical specs for buyers',
    traceTitle: 'Total Transparency',
    traceText: 'Every bottle can connect to batch, harvest date, parcel, variety, sensory profile and lab data in Olivia OS.',
  },
};

const portfolio = [
  {
    name: 'Verde Vivo',
    format: '250 ml · first early harvest',
    role: 'Finishing oil for fine dining',
    label: '/labels/luxury/verde-vivo-luxury-label.svg',
    text: 'Høyeste polyfenolnivå, lavt utbytte, kraftig grønn fruktighet og lang pepperfinish.',
  },
  {
    name: 'Verde Alto',
    format: '250 ml / 500 ml · second early harvest',
    role: 'Premium daily finishing',
    label: '/labels/finished/verde-alto-finished.svg',
    text: 'Tidlig høstet og polyfenolsterk, men rundere. Den mest skalerbare premiumlinjen.',
  },
  {
    name: 'Raíz Antigua',
    format: '500 ml · old-tree estate selection',
    role: 'Limited allocation',
    label: '/labels/luxury/raiz-antigua-luxury-label.svg',
    text: 'Gamle trær, nummerert batch og høy gave-/restaurantverdi. Sortsdeles bare hvis data støtter det.',
  },
  {
    name: 'Monovarietal Collection',
    format: 'Genovesa · Gordal · Changlot Real · Picual',
    role: 'Tasting flight / sommelier set',
    label: '/labels/finished/monovarietal-collection.svg',
    text: 'Små batcher for smaking, opplæring og restauranter som vil fortelle sortshistorien.',
  },
  {
    name: 'Cocina Viva',
    format: '2 L / 5 L · chef format',
    role: 'Kitchen service',
    label: '/labels/finished/cocina-viva.svg',
    text: 'Mørk metallkanne eller bag-in-box for profesjonelle kjøkken. Estate traceable, praktisk format.',
  },
  {
    name: 'Mesa',
    format: 'Aceitunas de mesa',
    role: 'Spanish markets / restaurants',
    label: '/labels/finished/mesa-aceitunas.svg',
    text: 'Bordoliven for grønnsaksmarkeder, barer og restauranter. Varmere markedsspråk, samme Doña Anna-kvalitet.',
  },
];

const specs = [
  ['Harvest', 'Cosecha temprana · two early passes'],
  ['Extraction', 'Mechanical cold extraction · <27°C'],
  ['Acidity target', '<0.2% for premium batches'],
  ['Polyphenols', 'Lab measured · QR-linked certificate'],
  ['Varieties', 'Genovesa · Gordal · Changlot Real · Picual'],
  ['Formats', '250 ml · 500 ml · 2 L · 5 L · Mesa jars'],
];

const estateMoments = [
  {
    title: 'Biar-terroir',
    text: 'Tørre somre, kalkholdig jord og høydeforskjeller gir oliven med konsentrert grønn fruktighet, bitterhet og struktur.',
    icon: SunMedium,
  },
  {
    title: 'Fire sorter',
    text: 'Genovesa, Gordal, Changlot Real og Picual gir oss et bredt sensorisk register for både olje og bordoliven.',
    icon: Leaf,
  },
  {
    title: 'Tidlig høsting',
    text: 'To tidlige høstinger gir to nivåer av intensitet: Verde Vivo som mest kompromissløs, Verde Alto som mer anvendelig.',
    icon: Sprout,
  },
  {
    title: 'Gamle trær',
    text: 'Raíz Antigua reserveres til små batcher der gamle trær gir en historie, en struktur og en knapphet som faktisk merkes.',
    icon: Trees,
  },
];

const livingTimeline = [
  ['05:42', 'Første lys i lunden. Sensorer sjekker temperatur og jordfuktighet før høstedagen starter.'],
  ['08:10', 'Teamet velger trær og parseller etter modenhet, sort og ønsket polyfenolprofil.'],
  ['11:35', 'Oliven transporteres raskt videre for mekanisk kald ekstraksjon under 27°C.'],
  ['15:20', 'Batchen registreres i Olivia OS med høstevindu, sort, parsell, volum og kvalitet.'],
  ['18:00', 'QR-siden for flasken bygges: fra jord til bord, klar for kokken og gjesten.'],
];

const formatNumber = (value: number) => new Intl.NumberFormat('no-NO').format(value);

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onAdminLogin, onRegister }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>('no');
  const [signal, setSignal] = useState<PublicEstateSignal>({
    isLive: false,
    parcelCount: 2,
    treeCount: 570,
    activeBatches: 0,
    latestHarvestDate: 'Oktober-november',
    nextTask: 'Sensorisk evaluering og batch-dokumentasjon',
    heroMetric: 'Biar, Alicante',
  });
  const t = copy[locale];

  useEffect(() => {
    fetchPublicEstateSignal().then(setSignal);
  }, []);

  const navLinks = [
    ['Estate', '#estate'],
    ['Portfolio', '#portfolio'],
    ['Traceability', '#traceability'],
    ['Specs', '#specs'],
    ['Tasting kit', '#tasting'],
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#f7f1df] selection:bg-[#d4af37]/30">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0d0d0d]/82 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            <img src="/labels/luxury/dona-anna-monogram-da.svg" alt="Doña Anna DA monogram" className="h-10 w-10 object-contain" />
            <div>
              <p className="font-serif text-sm font-semibold leading-none tracking-[0.38em]">DOÑA ANNA</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#d4af37]">Biar · Alicante</p>
            </div>
          </a>
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="text-xs uppercase tracking-[0.2em] text-white/62 transition hover:text-white">
                {label}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => setLocale(locale === 'no' ? 'es' : locale === 'es' ? 'en' : 'no')}
              className="inline-flex h-10 items-center gap-2 border border-white/12 px-3 text-xs uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/8"
            >
              <Languages size={15} /> {locale.toUpperCase()}
            </button>
            <button onClick={onAdminLogin} className="inline-flex h-10 items-center gap-2 border border-white/12 px-3 text-xs uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/8">
              <LockKeyhole size={15} /> Admin
            </button>
            <button onClick={onLogin} className="inline-flex h-10 items-center gap-2 bg-white px-4 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#d4af37]">
              {t.portal}
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Meny">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="mx-auto max-w-7xl border-t border-white/10 py-4 md:hidden">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-3 text-sm uppercase tracking-[0.2em] text-white/78">
                {label}
              </a>
            ))}
            <button onClick={onLogin} className="mt-3 w-full bg-white px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-black">
              {t.portal}
            </button>
          </div>
        )}
      </nav>

      <header id="top" className="relative min-h-screen overflow-hidden">
        <img src="/donaanna/hero-image.jpg" alt="Oliven fra Doña Anna" className="absolute inset-0 h-full w-full object-cover opacity-42" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(212,175,55,.16),transparent_34%),linear-gradient(90deg,rgba(13,13,13,.98),rgba(13,13,13,.78),rgba(13,13,13,.42))]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-5 pb-12 pt-28 md:px-8">
          <div className="max-w-4xl animate-in fade-in duration-700">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">{t.eyebrow}</p>
            <h1 className="font-serif text-5xl leading-[0.95] tracking-normal md:text-7xl">{t.headline}</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/72 md:text-xl">{t.subhead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
                {t.cta} <ArrowRight size={17} />
              </a>
              <a href="#portfolio" className="inline-flex h-12 items-center justify-center gap-2 border border-white/18 px-6 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-white/8">
                Se kolleksjonen
              </a>
            </div>
          </div>
          <div className="mt-12 grid max-w-5xl grid-cols-2 border border-white/12 bg-black/22 backdrop-blur md:grid-cols-4">
            {[
              ['Estate', signal.heroMetric],
              ['Parcels', formatNumber(signal.parcelCount)],
              ['Trees', formatNumber(signal.treeCount)],
              ['Trace', signal.isLive ? `${signal.activeBatches} active batches` : 'QR-ready'],
            ].map(([label, value]) => (
              <div key={label} className="border-white/12 p-4 odd:border-r md:border-r md:last:border-r-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[#d4af37]">{label}</p>
                <p className="mt-2 font-serif text-xl">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main>
        <section id="estate" className="relative overflow-hidden border-y border-white/10 bg-[#111111] py-24">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <img src="/donaanna/olive-trees.jpg" alt="Doña Anna olivenlund i Biar" className="h-full w-full object-cover opacity-38" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#111111,rgba(17,17,17,.42),rgba(17,17,17,.72))]" />
          </div>
          <div className="relative mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">The estate</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">En levende olivengård, ikke bare en etikett.</h2>
                <p className="mt-6 text-lg leading-8 text-white/66">
                  Doña Anna ligger i Biar i Alicante, med lunder som kombinerer tradisjon, gamle trær, regenerativ praksis og presis drift. Målet er å gi kokker en olje og bordoliven med en historie som tåler å bli fortalt ved bordet.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
                    Bestill tasting kit <ArrowRight size={17} />
                  </a>
                  <a href="#traceability" className="inline-flex h-12 items-center justify-center gap-2 border border-white/18 px-6 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-white/8">
                    Se sporbarhet
                  </a>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {estateMoments.map(item => (
                  <article key={item.title} className="border border-white/10 bg-black/34 p-5 backdrop-blur">
                    <item.icon className="text-[#d4af37]" size={24} />
                    <h3 className="mt-5 font-serif text-2xl">{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/62">{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="portfolio" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <div className="mb-12 grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Exclusive portfolio</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Olje og bordoliven bygget som en kolleksjon.</h2>
            </div>
            <p className="self-end text-lg leading-8 text-white/66">
              Verde Vivo og Verde Alto brukes som finishing oils for bord og kjøkken. Cocina Viva gir kokker større format. Mesa gjør Doña Anna synlig i spanske markeder, restauranter og aperitivo-servering.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolio.map(item => (
              <article key={item.name} className="group border border-white/10 bg-white/[0.035] p-4 transition hover:border-[#d4af37]/50">
                <div className="flex min-h-[360px] items-center justify-center bg-[#080808] p-5">
                  <img src={item.label} alt={`${item.name} label`} className="max-h-[320px] w-full object-contain transition duration-500 group-hover:scale-[1.03]" />
                </div>
                <div className="p-2 pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]">{item.role}</p>
                  <h3 className="mt-2 font-serif text-3xl">{item.name}</h3>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/48">{item.format}</p>
                  <p className="mt-4 leading-7 text-white/64">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0d0d0d] py-24">
          <div className="absolute inset-0 opacity-24">
            <img src="/donaanna/farming-3.jpg" alt="Vann og presisjonsdrift i olivenlunden" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0d0d0d,rgba(13,13,13,.78),#0d0d0d)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.8fr_1.2fr] md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">A day in the grove</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Hva som skjer før flasken når kjøkkenet.</h2>
              <p className="mt-6 text-lg leading-8 text-white/62">
                Den levende delen av merkevaren er ikke animasjon for animasjonens skyld. Det er rytmen i gården: målinger, valg, høsting, pressing, batch og dokumentasjon.
              </p>
            </div>
            <div className="space-y-3">
              {livingTimeline.map(([time, text], index) => (
                <div key={time} className="group grid grid-cols-[88px_1fr] border border-white/10 bg-white/[0.035] transition hover:border-[#d4af37]/60 hover:bg-white/[0.06]">
                  <div className="flex items-center justify-center border-r border-white/10 bg-black/30 font-serif text-lg text-[#d4af37]">{time}</div>
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/38">Moment {String(index + 1).padStart(2, '0')}</p>
                    <p className="mt-2 leading-7 text-white/70">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="traceability" className="border-y border-white/10 bg-[#111111] py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.95fr_1.05fr] md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">{t.traceTitle}</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Fra jord til bord, dokumentert på flasken.</h2>
              <p className="mt-6 text-lg leading-8 text-white/66">{t.traceText}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  [ScanLine, 'QR batch page'],
                  [ShieldCheck, 'Lab certificate'],
                  [BadgeCheck, 'Harvest window'],
                  [Building2, 'Chef-ready story'],
                ].map(([Icon, label]) => (
                  <div key={label as string} className="flex items-center gap-3 border border-white/10 bg-black/24 p-4">
                    <Icon size={20} className="text-[#d4af37]" />
                    <span className="text-sm uppercase tracking-[0.16em] text-white/72">{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-[#d4af37]/30 bg-black p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d4af37]">Bottle scan preview</p>
                  <h3 className="mt-1 font-serif text-3xl">Verde Vivo · Batch 01</h3>
                </div>
                <QrCode className="text-[#d4af37]" size={34} />
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-2">
                {[
                  ['Parcel', signal.heroMetric],
                  ['Harvest', signal.latestHarvestDate || 'October'],
                  ['Variety', 'Changlot Real / estate blend'],
                  ['Polyphenols', 'Lab value via QR'],
                  ['Extraction', '<27°C mechanical'],
                  ['Status', signal.isLive ? 'Live data' : 'Demo-ready'],
                ].map(([label, value]) => (
                  <div key={label} className="border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#d4af37]">{label}</p>
                    <p className="mt-2 text-sm text-white/78">{value}</p>
                  </div>
                ))}
              </div>
              <p className="border-t border-white/10 pt-5 text-sm leading-6 text-white/52">
                Dette er salgsargumentet som forsvarer pris: en kokk kan vise gjesten nøyaktig hvor oljen kommer fra.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#17130d] px-5 py-16 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 border border-[#d4af37]/30 bg-black/24 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d4af37]">For chefs and buyers</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">Smak før du bestemmer deg.</h2>
              <p className="mt-2 max-w-2xl text-white/62">Vi kan sette sammen en liten B2B-smakspakke med Verde Vivo, Verde Alto og Mesa-bordoliven.</p>
            </div>
            <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
              Request tasting kit <ArrowRight size={17} />
            </a>
          </div>
        </section>

        <section id="specs" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">B2B data</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.specTitle}</h2>
              <p className="mt-6 text-lg leading-8 text-white/60">
                Kokker og distributører trenger fakta. Derfor bør hvert produkt ha teknisk ark, smaksnotater, format, prisnivå, batchnummer og labanalyse.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {specs.map(([label, value]) => (
                <div key={label} className="border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]">{label}</p>
                  <p className="mt-3 text-white/76">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tasting" className="bg-[#f8f5ea] px-5 py-24 text-black md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">Lead generation</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Bestill en eksklusiv smaksprøve for din restaurant.</h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-black/66">
                Tasting kit bør inneholde Verde Vivo, Verde Alto, Mesa-bordoliven, produktark og QR-demo. Målet er ikke “kontakt oss”, men å få kokken til å smake.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/labels/luxury/verde-vivo-luxury-label.svg" className="inline-flex items-center gap-2 border border-black/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em]">
                  <FileText size={16} /> Produktark
                </a>
                <button onClick={onLogin} className="inline-flex items-center gap-2 border border-black/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em]">
                  <Package size={16} /> B2B-login
                </button>
              </div>
            </div>
            <form className="border border-black/12 bg-white p-5 shadow-2xl shadow-black/10" onSubmit={(event) => event.preventDefault()}>
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Restaurant / Company</label>
              <input className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Role</label>
              <input placeholder="Chef / Buyer / Distributor" className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Email</label>
              <input type="email" className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Delivery address</label>
              <textarea className="mt-2 h-24 w-full border border-black/12 p-3 outline-none focus:border-[#d4af37]" />
              <button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-black px-5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                {t.cta} <ArrowRight size={17} />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0d0d0d] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="font-serif text-lg tracking-[0.18em]">DOÑA ANNA</p>
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-white/54">
            <button onClick={onLogin}>B2B Portal</button>
            <button onClick={onAdminLogin}>Olivia OS</button>
            <a href="mailto:info@donaanna.com">info@donaanna.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
