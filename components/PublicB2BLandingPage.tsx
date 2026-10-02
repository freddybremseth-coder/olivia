import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Droplets,
  FileText,
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
import { fetchPublicCommerceProducts, type PublicCommerceProduct } from '../services/publicCommerce';

interface LandingPageProps {
  onLogin: () => void;
  onAdminLogin: () => void;
  onRegister: () => void;
}

const copy = {
  eyebrow: 'Olivenprosjekt fra Biar · Alicante · Anna & Freddy Bremseth',
  headline: 'Doña Anna – tidlig høstet olivenolje fra Biar.',
  subhead: 'Doña Anna er vårt felles olivenprosjekt i Biar. Verde Vivo er første produkt: 500 ml tidlig høstet olivenolje, utviklet med mål om extra virgin-kvalitet og tydelig opprinnelse. Endelig kvalitetsklasse, batchdata, analyser og tilgjengelighet publiseres når produksjonen er klar.',
  cta: 'Meld interesse for smaksprøve',
  portal: 'B2B portal',
  specTitle: 'Produktdata for Verde Vivo',
  traceTitle: 'Sporbarhet når batchen er klar',
  traceText: 'Når en batch er produsert og publisert, skal informasjon om høstedato, parsell, sort, sensorisk profil og analyseverdier knyttes til batchen.',
};

const imagePaths = {
  heroChefWide: '/donaanna/olive-trees.jpg',
  harvestHands: '/donaanna/hero-image.jpg',
  harvestClose: '/donaanna/farming-2.jpg',
  b2bTraceabilityKitchen: '/donaanna/hero-image.jpg',
  verdeVivoHero: '/donaanna/olive-trees.jpg',
  daBlackBottle: '/donaanna/olive-trees.jpg',
  verdeAltoFrontBack: '/donaanna/olive-trees.jpg',
  donaAnnaPouringBread: '/donaanna/farming-2.jpg',
  restaurantTablePour: '/donaanna/hero-image.jpg',
  raizAntiguaFamily: '/donaanna/olive-trees.jpg',
  raizAntiguaCleanFamily: '/donaanna/olive-trees.jpg',
  cocinaViva5l: '/donaanna/olive-trees.jpg',
  cocinaVivaChef: '/donaanna/farming-2.jpg',
};

const portfolio = [
  {
    name: 'Verde Vivo',
    labelName: 'DOÑA ANNA · VERDE VIVO',
    format: '500 ml · Cosecha temprana',
    role: 'Tidlig høstet olivenolje · mål om extra virgin-kvalitet',
    photo: imagePaths.verdeVivoHero,
    text: 'Verde Vivo er Doña Annas første produkt. Den endelige batchinformasjonen – blant annet høstedato, analyseverdier og tilgjengelighet – publiseres når produksjonen er ferdig og dokumentert.',
  },
];

const specs = [
  ['Produkt', 'Verde Vivo'],
  ['Format', '500 ml'],
  ['Type', 'Tidlig høstet olivenolje · mål om extra virgin-kvalitet'],
  ['Opprinnelse', 'Biar · Alicante · Spania'],
  ['Sorter på gården', 'Genovesa · Gordal · Changlot Real · Picual'],
  ['Batchdata', 'Høstedato, analyser og tilgjengelighet publiseres når produksjonen er klar'],
];

const b2bPackages = [
  {
    title: 'Meld interesse for smaksprøve',
    audience: 'Restaurant / hotell',
    image: imagePaths.b2bTraceabilityKitchen,
    imageAlt: 'Grønne oliven ved innhøsting for Doña Anna',
    text: 'Registrer interesse for Verde Vivo. Vi bekrefter først tilgjengelighet, batchdata, pris og levering når produksjonen er klar.',
  },
  {
    title: 'Produktinformasjon',
    audience: 'Kjøkken og faghandel',
    image: imagePaths.cocinaVivaChef,
    imageAlt: 'Håndplukkede grønne oliven fra innhøstingen',
    text: 'Produktark og dokumenterte batchopplysninger bygges rundt den faktiske produksjonen – ikke rundt generiske produktløfter.',
  },
  {
    title: 'Butikk og import',
    audience: 'Gourmetbutikk / import',
    image: imagePaths.raizAntiguaCleanFamily,
    imageAlt: 'Doña Anna olivengård i Alicante-innlandet',
    text: 'Ta kontakt for dialog om Verde Vivo, format, dokumentasjon og mulig distribusjon når første produksjon er klar.',
  },
];

const buyerProof: Array<{ icon: React.ElementType; title: string; text: string }> = [
  { icon: Package, title: 'Ett tydelig startprodukt', text: 'Verde Vivo 500 ml er produktet som kommuniseres offentlig nå.' },
  { icon: QrCode, title: 'Batchdata etter produksjon', text: 'Sporbar informasjon publiseres når den konkrete batchen er dokumentert.' },
  { icon: ShieldCheck, title: 'Ingen oppdiktede produktdata', text: 'Pris, analyse og tilgjengelighet oppgis først når de faktisk finnes.' },
  { icon: Building2, title: 'B2B-dialog', text: 'Restaurant, hotell, butikk og import kan melde interesse før lansering.' },
];

const estateMoments = [
  {
    title: 'Biar, Alicante',
    text: 'Doña Anna bygges rundt vår egen olivengård i Biar og den konkrete historien om sted, råvare og produksjon.',
    icon: SunMedium,
  },
  {
    title: 'Fire sorter',
    text: 'På gården arbeider vi blant annet med Genovesa, Gordal, Changlot Real og Picual.',
    icon: Leaf,
  },
  {
    title: 'Ca. 1 500 trær',
    text: 'Gården har om lag 1 500 oliventrær fordelt på et større areal i Biar.',
    icon: Trees,
  },
  {
    title: 'Dryppvanning og økologisk retning',
    text: 'Driften bruker dryppvanning, og Doña Anna utvikles som en økologisk merkevare med dokumentasjon som publiseres når den er klar.',
    icon: Sprout,
  },
];

const livingTimeline = [
  ['Før høsting', 'Modning, vær og tilstanden i lunden vurderes før høstetidspunkt bestemmes.'],
  ['Høsting', 'Verde Vivo er utviklet rundt tidlig høsting. Den konkrete høstedatoen publiseres per batch.'],
  ['Mølle', 'Produksjonsdata fra møllen dokumenteres for den konkrete batchen når oljen er produsert.'],
  ['Analyse', 'Analyseverdier og sensoriske notater publiseres først når resultatene foreligger.'],
  ['Flaske', 'Verde Vivo tappes med Doña Annas faktiske etikett og batchinformasjon.'],
];

const knowledgeCards = [
  {
    title: 'Tidlig høsting',
    kicker: 'Cosecha temprana',
    image: imagePaths.harvestHands,
    imageAlt: 'Grønne oliven ved tidlig innhøsting',
    text: 'Verde Vivo er utviklet som en tidlig høstet olivenolje med mål om extra virgin-kvalitet. Endelig kvalitetsklasse, smaksprofil og analyseverdier beskrives for den faktiske batchen når den foreligger.',
  },
  {
    title: 'Våre sorter',
    kicker: 'Gården i Biar',
    image: imagePaths.harvestClose,
    imageAlt: 'Håndplukkede oliven som illustrerer råvaren fra gården',
    text: 'Genovesa, Gordal, Changlot Real og Picual er blant sortene på gården. Vi bruker sortsinformasjon som en del av sporbarheten – ikke som generiske smakslover.',
  },
  {
    title: 'Sporbar dokumentasjon',
    kicker: 'Batch for batch',
    image: '/donaanna/olive-trees.jpg',
    imageAlt: 'Doña Anna olivenlund i Biar før høsting',
    text: 'Høstedato, produksjonsdata, analyse og sensorikk skal knyttes til den konkrete batchen når informasjonen er klar.',
  },
];

const qualitySteps = [
  ['01', 'Høsting', 'Verde Vivo er utviklet rundt tidlig høsting; dato og batch publiseres når produksjonen er gjennomført.'],
  ['02', 'Produksjon', 'Produksjonsdata fra møllen knyttes til den faktiske batchen i stedet for å beskrives generisk på forhånd.'],
  ['03', 'Analyse', 'Kvalitets- og analyseverdier publiseres når dokumentasjonen foreligger.'],
  ['04', 'Merkevare', 'Flasken skal bruke Doña Annas godkjente etikett og korrekte batchinformasjon.'],
];

const videoStories: Array<{ title: string; eyebrow: string; src: string; poster: string; text: string }> = [];

const formatNumber = (value: number) => new Intl.NumberFormat('no-NO').format(value);

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onAdminLogin, onRegister }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [livePortfolio, setLivePortfolio] = useState<PublicCommerceProduct[]>([]);
  const [tastingRequest, setTastingRequest] = useState({ company: '', role: '', email: '', address: '' });
  const [signal, setSignal] = useState<PublicEstateSignal>({
    isLive: false,
    parcelCount: 0,
    treeCount: 1500,
    activeBatches: 0,
    latestHarvestDate: 'Publiseres per batch',
    nextTask: 'Høsting, produksjon og batch-dokumentasjon',
    heroMetric: 'Biar, Alicante',
  });
  useEffect(() => {
    fetchPublicEstateSignal().then(setSignal);
    fetchPublicCommerceProducts().then(setLivePortfolio);
  }, []);

  const approvedLivePortfolio = livePortfolio.filter(item => item.name.trim().toLowerCase() === 'verde vivo');
  const portfolioItems = approvedLivePortfolio.length ? approvedLivePortfolio : portfolio;

  const handleTastingRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = 'Interesse for smaksprøve – Doña Anna';
    const body = [
      `Restaurant / virksomhet: ${tastingRequest.company}`,
      `Rolle: ${tastingRequest.role}`,
      `E-post: ${tastingRequest.email}`,
      `Leveringsadresse: ${tastingRequest.address}`,
    ].join('\n');

    window.location.href = `mailto:info@donaanna.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const navLinks = [
    ['Gården', '#estate'],
    ['Produkter', '#portfolio'],
    ['Kunnskap', '#knowledge'],
    ['Guider', '/guider'],
    ['Magasin', '/magasin'],
    ['For profesjonelle', '#b2b'],
    ['Om prosjektet', '#people'],
  ];

  return (
    <div className="min-h-screen bg-[#0d0d0d] pb-24 text-[#f7f1df] selection:bg-[#d4af37]/30 lg:pb-0">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0d0d0d]/82 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            <img src="/labels/dona-anna-figure.svg" alt="Doña Anna" className="h-10 w-10 object-contain invert" />
            <div>
              <p className="font-serif text-sm font-semibold leading-none tracking-[0.38em]">DOÑA ANNA</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[#d4af37]">Biar · Alicante</p>
            </div>
          </a>
          <div className="hidden items-center gap-5 lg:flex">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="text-xs uppercase tracking-[0.2em] text-white/62 transition hover:text-white">
                {label}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <a href="#tasting" className="inline-flex h-10 items-center gap-2 border border-[#d4af37]/55 px-4 text-xs font-bold uppercase tracking-[0.18em] text-[#f7f1df] transition hover:bg-[#d4af37] hover:text-black">
              Be om smaksprøve
            </a>
            <button data-testid="b2b-portal-nav" onClick={onLogin} className="inline-flex h-10 items-center gap-2 bg-white px-4 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#d4af37]">
              {copy.portal}
            </button>
          </div>
          <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Meny">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="mx-auto max-w-7xl border-t border-white/10 py-4 lg:hidden">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-3 text-sm uppercase tracking-[0.2em] text-white/78">
                {label}
              </a>
            ))}
            <div className="mt-3 grid gap-2">
              <a href="#tasting" onClick={() => setMenuOpen(false)} className="w-full bg-[#d4af37] px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-black">
                Be om smaksprøve
              </a>
              <button data-testid="b2b-portal-mobile-menu" onClick={() => { setMenuOpen(false); onLogin(); }} className="w-full border border-white/12 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-white/72">
                {copy.portal}
              </button>
            </div>
          </div>
        )}
      </nav>

      <header id="top" className="relative min-h-screen overflow-hidden">
        <img src={imagePaths.heroChefWide} alt="Doña Anna olivenlund i Biar, Alicante" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-42" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(212,175,55,.16),transparent_34%),linear-gradient(90deg,rgba(13,13,13,.98),rgba(13,13,13,.78),rgba(13,13,13,.42))]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-5 pb-12 pt-28 md:px-8">
          <div className="max-w-4xl animate-in fade-in duration-700">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">{copy.eyebrow}</p>
            <h1 className="font-serif text-5xl leading-[0.95] tracking-normal md:text-7xl">{copy.headline}</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/72 md:text-xl">{copy.subhead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
                {copy.cta} <ArrowRight size={17} />
              </a>
              <a href="#portfolio" className="inline-flex h-12 items-center justify-center gap-2 border border-white/18 px-6 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-white/8">
                Se kolleksjonen
              </a>
              <a href="#b2b" className="inline-flex h-12 items-center justify-center gap-2 border border-[#d4af37]/60 px-6 text-xs font-bold uppercase tracking-[0.2em] text-[#f7f1df] transition hover:bg-[#d4af37] hover:text-black">
                For restaurant og faghandel <Building2 size={16} />
              </a>
            </div>
          </div>
          <div className="mt-12 grid max-w-5xl grid-cols-2 border border-white/12 bg-black/22 backdrop-blur md:grid-cols-4">
            {[
              ['Sted', signal.heroMetric],
              ['Areal', 'ca. 60 000 m²'],
              ['Trær', `ca. ${formatNumber(1500)}`],
              ['Sporbarhet', signal.isLive ? `${signal.activeBatches} aktive batcher` : 'Publiseres per batch'],
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
        <section aria-labelledby="quick-answers-title" className="border-b border-white/10 bg-[#0a0a0a] px-5 py-12 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Kort fortalt</p>
                <h2 id="quick-answers-title" className="mt-3 font-serif text-3xl leading-tight md:text-5xl">Hva er Doña Anna?</h2>
                <p className="mt-4 max-w-xl text-lg leading-8 text-white/64">
                  Doña Anna er olivenprosjektet til Anna og Freddy Bremseth i Biar, Alicante. Verde Vivo 500 ml er første produkt. Bordoliven er et mulig senere steg, ikke et produkt vi markedsfører som tilgjengelig nå.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Hvor kommer olivenoljen fra?</h3>
                  <p className="mt-3 leading-7 text-white/62">Fra Doña Annas olivenlunder i Biar i Alicante. Sort, høstedato, analyse og endelig kvalitetsklasse dokumenteres for den konkrete batchen når produksjonen er klar.</p>
                </article>
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Hva kjennetegner oljen?</h3>
                  <p className="mt-3 leading-7 text-white/62">Verde Vivo utvikles rundt tidlig høsting og tydelig opprinnelse. Ekstraksjon, sensorisk profil, analyseverdier og endelig kvalitetsklasse dokumenteres først for den faktiske batchen.</p>
                </article>
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Kan restauranter få smaksprøve?</h3>
                  <p className="mt-3 leading-7 text-white/62">Ja. Restauranter, hoteller, butikker og distributører kan melde interesse. Vi bekrefter tilgjengelighet, batchdata, pris og levering når produksjonen er klar.</p>
                </article>
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Hvem står bak?</h3>
                  <p className="mt-3 leading-7 text-white/62">Anna Bremseth og Freddy Bremseth driver Doña Anna sammen i Biar. <a className="text-[#d4af37] underline-offset-4 hover:underline" href="/om-dona-anna">Les om prosjektet og hvem som står bak</a>.</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="customer-path" className="border-b border-white/10 bg-[#f8f5ea] px-5 py-20 text-black md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">Finn riktig inngang</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Hva vil du bruke Doña Anna til?</h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-black/64">Start med behovet ditt. Derfra kan du gå direkte til riktig produktinformasjon, kunnskap eller kontaktpunkt.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <a href="#tasting" className="group border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-[#8a6a19]/55">
                  <Building2 size={24} className="text-[#8a6a19]" />
                  <h3 className="mt-8 font-serif text-3xl">Restaurant eller hotell</h3>
                  <p className="mt-3 leading-7 text-black/62">Meld interesse for Verde Vivo 500 ml og få batchinformasjon når produksjonen er klar.</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a19]">Be om smaksprøve <ArrowRight size={15} /></span>
                </a>
                <a href="#b2b" className="group border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-[#8a6a19]/55">
                  <Package size={24} className="text-[#8a6a19]" />
                  <h3 className="mt-8 font-serif text-3xl">Butikk eller import</h3>
                  <p className="mt-3 leading-7 text-black/62">Verde Vivo, dokumentasjon, mulig distribusjon og videre dialog for faghandel.</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a19]">Se B2B-løsningen <ArrowRight size={15} /></span>
                </a>
                <a href="/tidlig-hostet-olivenolje" className="group border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-[#8a6a19]/55">
                  <Leaf size={24} className="text-[#8a6a19]" />
                  <h3 className="mt-8 font-serif text-3xl">Matinteressert</h3>
                  <p className="mt-3 leading-7 text-black/62">Forstå tidlig høsting, smak, polyfenoler, sorter og opprinnelsen i Biar.</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a19]">Lær om oljen <ArrowRight size={15} /></span>
                </a>
              </div>
            </div>
            <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-t border-black/10 pt-6 text-sm" aria-label="Doña Anna guider">
              <a className="font-semibold text-[#705515] underline-offset-4 hover:underline" href="/olivenolje-fra-biar">Olivenolje fra Biar</a>
              <a className="font-semibold text-[#705515] underline-offset-4 hover:underline" href="/tidlig-hostet-olivenolje">Tidlig høstet olivenolje</a>
              <a className="font-semibold text-[#705515] underline-offset-4 hover:underline" href="/olivenolje-for-restauranter">Olivenolje for restauranter</a>
              <a className="font-semibold text-[#705515] underline-offset-4 hover:underline" href="/bordoliven-fra-biar">Bordoliven fra Biar</a>
            </nav>
          </div>
        </section>

        <section id="estate" className="relative overflow-hidden border-y border-white/10 bg-[#111111] py-24">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <img src="/donaanna/olive-trees.jpg" alt="Doña Anna olivenlund i Biar" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-38" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#111111,rgba(17,17,17,.42),rgba(17,17,17,.72))]" />
          </div>
          <div className="relative mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Gården</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">En levende olivengård, ikke bare en etikett.</h2>
                <p className="mt-6 text-lg leading-8 text-white/66">
                  Doña Anna ligger i Biar i Alicante og omfatter rundt 60 000 m² med om lag 1 500 oliventrær. Vi bygger merkevaren på den faktiske gården, sortene vi har og dokumentasjon fra den konkrete produksjonen – ikke på generiske smaks- eller terroirpåstander.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
                    {copy.cta} <ArrowRight size={17} />
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
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Portefølje</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Verde Vivo er produktet vi bygger merkevaren rundt nå.</h2>
            </div>
            <p className="self-end text-lg leading-8 text-white/66">
              Vi viser bare produktet som er definert nå: Verde Vivo 500 ml. Nye formater eller bordoliven legges ikke ut før de faktisk er besluttet, produsert og dokumentert.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolioItems.map(item => (
              <article key={item.name} className="group border border-white/10 bg-white/[0.035] p-4 transition hover:border-[#d4af37]/50">
                <div className="grid gap-3">
                  <div className="relative flex h-72 items-center justify-center overflow-hidden bg-[#e9e1cf]">
                    <img src="/labels/dona-anna-figure.svg" alt="" className="h-36 w-36 object-contain opacity-80" />
                    <div className="absolute bottom-5 left-5 right-5 border-t border-black/15 pt-4 text-center text-black">
                      <p className="font-serif text-2xl">DOÑA ANNA</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em]">VERDE VIVO · 500 ml</p>
                    </div>
                  </div>
                </div>
                <div className="p-2 pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]">{item.role}</p>
                  <h3 className="mt-2 font-serif text-3xl"><a href="/verde-vivo" className="hover:text-[#d4af37]">{item.name}</a></h3>
                  <p className="mt-3 border-y border-white/10 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/72">{item.labelName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/48">{item.format}</p>
                  {'priceLabel' in item && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-y border-white/10 py-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">Pris</p>
                        <p className="mt-1 text-sm text-white/80">{item.priceLabel}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#d4af37]">Lager</p>
                        <p className="mt-1 text-sm text-white/80">{item.stockLabel}</p>
                      </div>
                    </div>
                  )}
                  <p className="mt-4 leading-7 text-white/64">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="knowledge" className="border-y border-white/10 bg-[#f8f5ea] px-5 py-24 text-black md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">Kunnskap</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Smak, jord og høstetid henger sammen.</h2>
              </div>
              <p className="self-end text-lg leading-8 text-black/66">
                Premium extra virgin olivenolje må beskrives med dokumentasjon fra den faktiske produksjonen. Derfor skiller vi mellom det vi vet om gården nå, og batchdata som først publiseres etter høsting og analyse.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {knowledgeCards.map(card => (
                <article key={card.title} className="group overflow-hidden border border-black/10 bg-white">
                  <div className="h-56 overflow-hidden bg-black">
                    <img src={card.image} alt={card.imageAlt} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#8a6a19]">{card.kicker}</p>
                    <h3 className="mt-3 font-serif text-3xl">{card.title}</h3>
                    <p className="mt-4 leading-7 text-black/64">{card.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-10 grid gap-5 border border-black/10 bg-[#111111] p-5 text-white lg:grid-cols-[0.82fr_1.18fr]">
              <div className="relative min-h-[360px] overflow-hidden">
                <img src={imagePaths.donaAnnaPouringBread} alt="Håndplukkede grønne oliven fra innhøstingen" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-72" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.78))]" />
                <div className="absolute bottom-0 p-6">
                  <Sparkles className="text-[#d4af37]" size={26} />
                  <h3 className="mt-4 font-serif text-4xl">Kvalitetsforskjellen</h3>
                  <p className="mt-3 max-w-md leading-7 text-white/68">Fruktighet, bitterhet, skarphet og balanse vurderes før en batch får sin plass i porteføljen. Det gir kokker en olje som oppfører seg forutsigbart på tallerkenen.</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {qualitySteps.map(([number, title, text], index) => (
                  <div key={title} className="border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-3xl text-[#d4af37]">{number}</p>
                      {index === 1 ? <Droplets size={22} className="text-[#d4af37]" /> : <BadgeCheck size={22} className="text-[#d4af37]" />}
                    </div>
                    <h4 className="mt-6 font-serif text-2xl">{title}</h4>
                    <p className="mt-3 text-sm leading-6 text-white/62">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0d0d0d] py-24">
          <div className="absolute inset-0 opacity-24">
            <img src={imagePaths.verdeVivoHero} alt="Doña Anna Verde Vivo i Biar" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0d0d0d,rgba(13,13,13,.78),#0d0d0d)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.8fr_1.2fr] md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Fra lund til kjøkken</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Hva som skjer før flasken når kjøkkenet.</h2>
              <p className="mt-6 text-lg leading-8 text-white/62">
                Rytmen i gården bestemmer kvaliteten i flasken. Hver beslutning, fra høstetidspunkt til ekstraksjon og lagring, påvirker aroma, bitterhet, skarphet og holdbarhet.
              </p>
            </div>
            <div className="space-y-3">
              {livingTimeline.map(([time, text], index) => (
                <div key={time} className="group grid grid-cols-[88px_1fr] border border-white/10 bg-white/[0.035] transition hover:border-[#d4af37]/60 hover:bg-white/[0.06]">
                  <div className="flex items-center justify-center border-r border-white/10 bg-black/30 font-serif text-lg text-[#d4af37]">{time}</div>
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/38">Steg {String(index + 1).padStart(2, '0')}</p>
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
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">{copy.traceTitle}</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Se hva som ligger bak flasken.</h2>
              <p className="mt-6 text-lg leading-8 text-white/66">{copy.traceText}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  [ScanLine, 'Batchinformasjon'],
                  [ShieldCheck, 'Analyseverdier'],
                  [BadgeCheck, 'Høstevindu'],
                  [Building2, 'Opprinnelse for gjesten'],
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d4af37]">Batchpass</p>
                  <h3 className="mt-1 font-serif text-3xl">Verde Vivo · tidlig høst</h3>
                </div>
                <QrCode className="text-[#d4af37]" size={34} />
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-2">
                {[
                  ['Parsell', signal.heroMetric],
                  ['Høsting', signal.latestHarvestDate || 'Oktober-november'],
                  ['Sort', 'Publiseres per batch'],
                  ['Polyfenoler', 'Oppgis med batchanalyse'],
                  ['Ekstraksjon', 'Dokumenteres per batch'],
                  ['Dokumentasjon', signal.isLive ? 'Aktiv batch' : 'Publiseres ved lansering'],
                ].map(([label, value]) => (
                  <div key={label} className="border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[#d4af37]">{label}</p>
                    <p className="mt-2 text-sm text-white/78">{value}</p>
                  </div>
                ))}
              </div>
              <p className="border-t border-white/10 pt-5 text-sm leading-6 text-white/52">
                Sporbarhet gjør opprinnelsen konkret. Kokken kan vise gjesten hvor oljen kommer fra, når den ble høstet og hvilken sensorisk profil batchen har.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#111111] px-5 py-16 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 border border-[#d4af37]/30 bg-black/24 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d4af37]">For restauranter og innkjøpere</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">Smak før du bestemmer deg.</h2>
              <p className="mt-2 max-w-2xl text-white/62">Meld interesse for Verde Vivo. Vi bekrefter smaksprøve, produktark, pris og levering når første batch er klar.</p>
            </div>
            <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
              {copy.cta} <ArrowRight size={17} />
            </a>
          </div>
        </section>

        <section id="b2b" className="bg-[#f8f5ea] px-5 py-24 text-black md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 grid gap-8 md:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">B2B</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Et godt produkt må være enkelt å kjøpe inn.</h2>
              </div>
              <div className="self-end">
                <p className="text-lg leading-8 text-black/66">
                  For kjøkken, butikk og import samler Doña Anna dokumentasjon rundt Verde Vivo. Smaksprøve, pris og levering bekreftes når den faktiske batchen er klar.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-black px-6 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#8a6a19]">
                    {copy.cta} <ArrowRight size={17} />
                  </a>
                  <button data-testid="b2b-portal-section" onClick={onLogin} className="inline-flex h-12 items-center justify-center gap-2 border border-black/15 px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
                    B2B portal <LockKeyhole size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              {b2bPackages.map(item => (
                <article key={item.title} className="border border-black/10 bg-white">
                  <div className="h-64 overflow-hidden bg-black">
                    <img src={item.image} alt={item.imageAlt} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#8a6a19]">{item.audience}</p>
                    <h3 className="mt-3 font-serif text-3xl">{item.title}</h3>
                    <p className="mt-4 leading-7 text-black/64">{item.text}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {buyerProof.map(({ icon: Icon, title, text }) => (
                <div key={title} className="border border-black/10 bg-white p-5">
                  <Icon size={22} className="text-[#8a6a19]" />
                  <p className="mt-5 font-serif text-2xl">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-black/62">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="specs" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Produktdata</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{copy.specTitle}</h2>
              <p className="mt-6 text-lg leading-8 text-white/60">
                Profesjonelle kjøpere trenger tydelige fakta. Derfor publiserer Doña Anna bare produktdata som er besluttet eller dokumentert, og legger til høstedato, batchnummer og analyseverdier når de foreligger.
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

        <section id="people" className="border-y border-white/10 bg-[#111111] px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Bak Doña Anna</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Anna og Freddy Bremseth bygger Doña Anna sammen i Biar.</h2>
            </div>
            <div className="self-end">
              <p className="text-lg leading-8 text-white/66">
                Anna Bremseth og Freddy Bremseth driver Doña Anna sammen. Prosjektet handler om gården, oliventrærne, Verde Vivo, produksjonen og å bygge en langsiktig merkevare med tydelig opprinnelse i Biar.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/om-dona-anna" className="inline-flex h-11 items-center justify-center border border-white/16 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-[#d4af37]">Anna & Freddy · om prosjektet</a>
                <a href="https://www.freddybremseth.com/" className="inline-flex h-11 items-center justify-center border border-white/16 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-[#d4af37]">FreddyBremseth.com</a>
              </div>
            </div>
          </div>
        </section>

        <section id="tasting" className="bg-[#f8f5ea] px-5 py-24 text-black md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">Smaksprøve</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Meld interesse for smaksprøve.</h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-black/66">
                Restauranter, hoteller, butikker og distributører kan melde interesse for Verde Vivo. Vi svarer med tilgjengelighet, batchdata, produktark, pris og levering når produksjonen er klar.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="mailto:info@donaanna.com?subject=Produktark%20Do%C3%B1a%20Anna" className="inline-flex items-center gap-2 border border-black/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em]">
                  <FileText size={16} /> Be om produktark
                </a>
                <button data-testid="b2b-portal-tasting" onClick={onLogin} className="inline-flex items-center gap-2 border border-black/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em]">
                  <Package size={16} /> B2B-login
                </button>
              </div>
            </div>
            <form data-testid="tasting-request-form" className="border border-black/12 bg-white p-5 shadow-2xl shadow-black/10" onSubmit={handleTastingRequest}>
              <label htmlFor="tasting-company" className="block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Restaurant / virksomhet</label>
              <input id="tasting-company" required value={tastingRequest.company} onChange={(event) => setTastingRequest({ ...tastingRequest, company: event.target.value })} className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label htmlFor="tasting-role" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Rolle</label>
              <input id="tasting-role" required value={tastingRequest.role} onChange={(event) => setTastingRequest({ ...tastingRequest, role: event.target.value })} placeholder="Kokk, innkjøper eller distributør" className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label htmlFor="tasting-email" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">E-post</label>
              <input id="tasting-email" required value={tastingRequest.email} onChange={(event) => setTastingRequest({ ...tastingRequest, email: event.target.value })} type="email" className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label htmlFor="tasting-address" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Leveringsadresse</label>
              <textarea id="tasting-address" required value={tastingRequest.address} onChange={(event) => setTastingRequest({ ...tastingRequest, address: event.target.value })} className="mt-2 h-24 w-full border border-black/12 p-3 outline-none focus:border-[#d4af37]" />
              <p className="mt-4 text-sm leading-6 text-black/60">Forespørselen åpner en e-post til Doña Anna. Opplysningene sendes ikke til et skjema på nettstedet. Vi svarer når vi kan bekrefte tilgjengelighet og neste steg.</p>
              <button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-black px-5 text-xs font-bold uppercase tracking-[0.2em] text-white">
                Send forespørsel <ArrowRight size={17} />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#0d0d0d] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/labels/dona-anna-figure.svg" alt="" className="h-8 w-8 object-contain invert" />
            <p className="font-serif text-lg tracking-[0.18em]">DOÑA ANNA</p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-white/54">
              <a href="/guider">Guider</a>
              <a href="/magasin">Magasin</a>
              <a href="/artikler">Artikler</a>
              <a href="/oppskrifter">Oppskrifter</a>
              <button data-testid="b2b-portal-footer" onClick={onLogin}>B2B Portal</button>
              <button data-testid="olivia-os-footer" onClick={onAdminLogin}>Olivia OS</button>
              <a href="mailto:info@donaanna.com">info@donaanna.com</a>
              <a href="/om-dona-anna">Anna & Freddy · om Doña Anna</a>
              <a href="/personvern">Personvern</a>
              <span>Oppdatert 2. oktober 2026</span>
            </div>
            <nav aria-label="Relaterte prosjekter" className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-white/38">
              <span className="text-[#d4af37]">Relatert</span>
              <a href="https://www.freddybremseth.com/">FreddyBremseth.com</a>
              <a href="https://www.pinosoecolife.com/">Pinoso Eco Life</a>
              <a href="https://books.freddybremseth.com/">Books</a>
            </nav>
          </div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 gap-2 border-t border-white/10 bg-[#0d0d0d]/94 p-3 backdrop-blur-xl lg:hidden">
        <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] text-xs font-bold uppercase tracking-[0.16em] text-black">
          <Building2 size={16} /> Smaksprøve
        </a>
        <a href="#portfolio" className="inline-flex h-12 items-center justify-center gap-2 border border-white/14 text-xs font-bold uppercase tracking-[0.16em] text-white/78">
          <Package size={16} /> Produkter
        </a>
      </div>
    </div>
  );
};

export default LandingPage;