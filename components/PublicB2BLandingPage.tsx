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
  eyebrow: 'Estate-olje fra Biar · Alicante · Freddy Bremseth',
  headline: 'Doña Anna – tidlig høstet olivenolje fra Biar.',
  subhead: 'Tidlig høstet olivenolje og bordoliven fra våre lunder i Biar. Skapt for kjøkken som verdsetter smak, opprinnelse, sporbarhet og en historie gjestene kan kjenne igjen ved bordet.',
  cta: 'Be om smaksprøve',
  portal: 'B2B portal',
  specTitle: 'Tekniske data for innkjøpere',
  traceTitle: 'Sporbarhet gjort konkret',
  traceText: 'Når en batch er publisert, viser QR-sporingen høstedato, parsell, sort, sensorisk profil og analyseverdier for kokk, innkjøper og gjest.',
};

const imagePaths = {
  heroChefWide: '/donaanna/product-design/cocina-viva-kitchen-wide.jpg',
  b2bTraceabilityKitchen: '/donaanna/product-design/cocina-viva-chef.jpg',
  verdeVivoHero: '/donaanna/product-design/verde-vivo-estate-arches.jpg',
  daBlackBottle: '/donaanna/product-design/product-family-studio.jpg',
  verdeAltoFrontBack: '/donaanna/product-design/verde-alto-rustic-room.jpg',
  donaAnnaPouringBread: '/donaanna/product-design/verde-vivo-breakfast-collage.jpg',
  restaurantTablePour: '/donaanna/product-design/portfolio-slate-mesa.jpg',
  raizAntiguaFamily: '/donaanna/product-design/raiz-antigua-cellar.jpg',
  raizAntiguaCleanFamily: '/donaanna/product-design/raiz-antigua-paella.jpg',
  cocinaViva5l: '/donaanna/product-design/cocina-viva-b2b-collage.jpg',
  cocinaVivaChef: '/donaanna/product-design/cocina-viva-chef.jpg',
};

const portfolio = [
  {
    name: 'Verde Vivo',
    labelName: 'DOÑA ANNA · VERDE VIVO',
    format: '250 ml / 500 ml · Cosecha Temprana I',
    role: 'Intens finisholje',
    photo: imagePaths.verdeVivoHero,
    text: 'Vår mest intense tidlig-høstede olje. Grønn fruktighet, tydelig bitterhet og lang pepperfinish gjør den sterk på grillet fisk, tomat, brød, salater og retter som trenger en frisk avslutning.',
  },
  {
    name: 'Verde Alto',
    labelName: 'DOÑA ANNA · VERDE ALTO',
    format: '500 ml · Cosecha Temprana II',
    role: 'Balansert finisholje',
    photo: imagePaths.verdeAltoFrontBack,
    text: 'Tidlig høstet, men rundere i uttrykket enn Verde Vivo. En premium bord- og kjøkkenolje for restauranter som ønsker grønn karakter uten at oljen dominerer retten.',
  },
  {
    name: 'Raíz Antigua',
    labelName: 'DOÑA ANNA · RAÍZ ANTIGUA',
    format: '500 ml · utvalg fra gamle trær',
    role: 'Utvalg fra gamle trær',
    photo: imagePaths.raizAntiguaFamily,
    text: 'En begrenset seleksjon fra eldre trær på gården. Dypere, mer moden fruktighet og en roligere eleganse gjør den egnet for menyer, gavepakker og restauranter som vil fortelle historien om lunden.',
  },
  {
    name: 'Monovarietal Collection',
    labelName: 'DOÑA ANNA · MONOVARIETAL COLLECTION',
    format: 'Genovesa · Gordal · Changlot Real · Picual',
    role: 'Sortssmaking',
    photo: imagePaths.daBlackBottle,
    text: 'Små batcher som viser hvordan sort, jord og høstetidspunkt påvirker aroma og struktur. En naturlig smaksreise for sommelierer, kokker og spesialbutikker.',
  },
  {
    name: 'Cocina Viva',
    labelName: 'DOÑA ANNA · COCINA VIVA',
    format: '2 L / 5 L · format for profesjonelle kjøkken',
    role: 'Format for kjøkken',
    photo: imagePaths.cocinaViva5l,
    text: 'Større format for profesjonelle kjøkken som bruker olivenolje hver dag, men fortsatt vil ha kontroll på kvalitet, opprinnelse og batch. Utviklet for service, mise en place og varme retter.',
  },
  {
    name: 'Mesa',
    labelName: 'DOÑA ANNA · MESA',
    format: 'Aceitunas de mesa',
    role: 'Bordoliven',
    photo: imagePaths.restaurantTablePour,
    text: 'Bordoliven for aperitivo, markeder, barer og restauranter. En mer uformell inngang til Doña Anna, med samme fokus på råvare, tekstur og opprinnelse.',
  },
];

const specs = [
  ['Høsting', 'Tidlig høsting i to passeringer for ulik intensitet og polyfenolprofil'],
  ['Ekstraksjon', 'Mekanisk kald ekstraksjon under 27°C'],
  ['Kvalitet', 'Extra virgin med sensorisk kontroll og analyse per batch'],
  ['Polyfenoler', 'Måles per premiumbatch og knyttes til sporbar dokumentasjon'],
  ['Sorter', 'Genovesa · Gordal · Changlot Real · Picual'],
  ['Formater', '250 ml · 500 ml · 2 L · 5 L · bordoliven'],
];

const b2bPackages = [
  {
    title: 'Smaksprøve for kjøkken',
    audience: 'Restaurant / hotell',
    image: imagePaths.b2bTraceabilityKitchen,
    text: 'Verde Vivo, Verde Alto og Mesa med produktark, batchhistorie og forslag til bruk på brød, tomat, fisk, grønnsaker og service.',
  },
  {
    title: 'Restaurant startpakke',
    audience: 'Kjøkken og bordservering',
    image: imagePaths.cocinaVivaChef,
    text: '500 ml finisholjer til bordet og Cocina Viva i større format for mise en place, varme retter og daglig bruk.',
  },
  {
    title: 'Butikk og import',
    audience: 'Gourmetbutikk / import',
    image: imagePaths.raizAntiguaCleanFamily,
    text: 'Hylleklar portefølje med produktbilder, produktark, QR-sporbarhet og tydelig informasjon om opprinnelse og bruk.',
  },
];

const buyerProof: Array<{ icon: React.ElementType; title: string; text: string }> = [
  { icon: Building2, title: 'Priser for faghandel', text: 'Egne vilkår for restaurant, butikk og distributør.' },
  { icon: Package, title: 'Salgbare formater', text: '250 ml, 500 ml, bordoliven og 2 L / 5 L chef-format.' },
  { icon: QrCode, title: 'QR-sporbarhet', text: 'Batchhistorie fra parsell og høsting til flaske.' },
  { icon: ShieldCheck, title: 'Klar for vurdering', text: 'Produktark, sensorikk og logistikkdata samlet.' },
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
  ['Soloppgang', 'Dagen starter i lunden med kontroll av temperatur, jordfuktighet og modenhet.'],
  ['Utvalg', 'Trær og parseller velges etter sort, fruktens tilstand og ønsket sensorisk uttrykk.'],
  ['Mølle', 'Oliven transporteres raskt videre for mekanisk kald ekstraksjon under 27°C.'],
  ['Batch', 'Volum, høstevindu, sort og kvalitet registreres slik at hver produksjon kan følges tilbake til gården.'],
  ['Bordet', 'Flasken får sin historie: høsting, analyse, smak og opprinnelse samlet i én sporbar batch.'],
];

const knowledgeCards = [
  {
    title: 'Polyfenolens kraft',
    kicker: 'Målt per batch',
    image: imagePaths.donaAnnaPouringBread,
    text: 'Tidlig høstet extra virgin olivenolje har høyere innhold av polyfenoler. De gir bitterhet og pepperfølelse, og nivået analyseres og dokumenteres for hver premiumbatch.',
  },
  {
    title: 'Regenerativ drift',
    kicker: 'Jord og biodiversitet',
    image: '/donaanna/regenerative-farming.jpg',
    text: 'Dekkvekster, urter, blomster og mer presis vannforvaltning styrker jordlivet i et tørt middelhavsklima. Sunnere jord gir mer robuste trær og tydeligere opprinnelse.',
  },
  {
    title: 'Tidlig høsting',
    kicker: 'Cosecha temprana',
    image: imagePaths.verdeVivoHero,
    text: 'Tidlig høsting gir lavere oljeutbytte, men mer intens aroma, friskere grønn fruktighet og høyere bitterhet og skarphet. Det er kjernen i Verde Vivo og Verde Alto.',
  },
];

const qualitySteps = [
  ['01', 'Skånsom høsting', 'Oliven høstes når aromatikk, bitterhet og polyfenolpotensial er på sitt beste.'],
  ['02', 'Rask pressing', 'Kort vei fra tre til mølle bevarer friskhet, næringsstoffer og aroma.'],
  ['03', 'Kald ekstraksjon', 'Mekanisk ekstraksjon under 27°C beskytter polyfenoler og den grønne fruktigheten.'],
  ['04', 'Sensorisk kontroll', 'Fruktighet, bitterhet, skarphet og balanse vurderes før batchen får sin rolle i porteføljen.'],
];

const videoStories = [
  {
    title: 'På kjøkkenet',
    eyebrow: 'I bruk',
    src: '/donaanna/video/michelin-chef-uses-dona-anna.mp4',
    poster: imagePaths.b2bTraceabilityKitchen,
    text: 'Doña Anna er laget for kjøkken som arbeider presist. Se hvordan aroma, varme og timing avgjør hvordan retten avsluttes.',
  },
  {
    title: 'Ved bordet',
    eyebrow: 'Produktfilm',
    src: '/donaanna/video/video-av-flasken-klar.mp4',
    poster: imagePaths.daBlackBottle,
    text: 'Se hvordan en siste dråpe tilfører grønn fruktighet, bitterhet og pepperfinish rett før servering.',
  },
];

const formatNumber = (value: number) => new Intl.NumberFormat('no-NO').format(value);

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onAdminLogin, onRegister }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [livePortfolio, setLivePortfolio] = useState<PublicCommerceProduct[]>([]);
  const [tastingRequest, setTastingRequest] = useState({ company: '', role: '', email: '', address: '' });
  const [signal, setSignal] = useState<PublicEstateSignal>({
    isLive: false,
    parcelCount: 2,
    treeCount: 570,
    activeBatches: 0,
    latestHarvestDate: 'Oktober-november',
    nextTask: 'Sensorisk evaluering og batch-dokumentasjon',
    heroMetric: 'Biar, Alicante',
  });
  useEffect(() => {
    fetchPublicEstateSignal().then(setSignal);
    fetchPublicCommerceProducts().then(setLivePortfolio);
  }, []);

  const portfolioItems = livePortfolio.length ? livePortfolio : portfolio;

  const handleTastingRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = 'Forespørsel om smaksprøve – Doña Anna';
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
        <img src={imagePaths.heroChefWide} alt="Doña Anna i bruk på restaurantkjøkken" className="absolute inset-0 h-full w-full object-cover opacity-42" />
        <video className="absolute inset-0 h-full w-full object-cover opacity-42" autoPlay muted loop playsInline poster={imagePaths.heroChefWide}>
          <source src="/donaanna/video/video-av-flasken-klar.mp4" type="video/mp4" />
        </video>
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
              ['Estate', signal.heroMetric],
              ['Parseller', formatNumber(signal.parcelCount)],
              ['Trær', formatNumber(signal.treeCount)],
              ['Sporbarhet', signal.isLive ? `${signal.activeBatches} aktive batcher` : 'Publiseres ved lansering'],
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
                  Doña Anna er et olivenprosjekt i Biar, Alicante, utviklet av Freddy Bremseth. Fokus er tidlig høstet extra virgin olivenolje, bordoliven, sporbarhet og produkter for både matinteresserte og profesjonelle kjøkken.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Hvor kommer olivenoljen fra?</h3>
                  <p className="mt-3 leading-7 text-white/62">Fra Doña Annas olivenlunder i Biar i Alicante, med dokumentasjon av sort, høstevindu og batch når produksjonen publiseres.</p>
                </article>
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Hva kjennetegner oljen?</h3>
                  <p className="mt-3 leading-7 text-white/62">Tidlig høsting, mekanisk kald ekstraksjon og et uttrykk bygget rundt grønn fruktighet, bitterhet, pepperfinish og tydelig opprinnelse.</p>
                </article>
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Kan restauranter få smaksprøve?</h3>
                  <p className="mt-3 leading-7 text-white/62">Ja. Restauranter, hoteller, butikker og distributører kan sende en forespørsel om smaksprøve, produktark, format, pris og levering.</p>
                </article>
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Hvem står bak?</h3>
                  <p className="mt-3 leading-7 text-white/62">Freddy Bremseth utvikler Doña Anna som del av sin prosjektportefølje i Spania. <a className="text-[#d4af37] underline-offset-4 hover:underline" href="https://www.freddybremseth.com/olivenolje-og-dona-anna.html">Les historien bak prosjektet</a>.</p>
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
                  <p className="mt-3 leading-7 text-black/62">Smaksprøve, produktark, 500 ml finisholje og større kjøkkenformat.</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a19]">Be om smaksprøve <ArrowRight size={15} /></span>
                </a>
                <a href="#b2b" className="group border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-[#8a6a19]/55">
                  <Package size={24} className="text-[#8a6a19]" />
                  <h3 className="mt-8 font-serif text-3xl">Butikk eller import</h3>
                  <p className="mt-3 leading-7 text-black/62">Portefølje, formater, sporbarhet og dokumentasjon for faghandel.</p>
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
            <img src="/donaanna/olive-trees.jpg" alt="Doña Anna olivenlund i Biar" className="h-full w-full object-cover opacity-38" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#111111,rgba(17,17,17,.42),rgba(17,17,17,.72))]" />
          </div>
          <div className="relative mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Gården</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">En levende olivengård, ikke bare en etikett.</h2>
                <p className="mt-6 text-lg leading-8 text-white/66">
                  Doña Anna ligger i Biar i Alicante, der kalkholdig jord, tørre somre og kjølige netter gir oliven med frisk grønn fruktighet, bitterhet og struktur. Gården kombinerer tradisjon, gamle trær, regenerativ praksis og presis dokumentasjon.
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

        <section className="bg-[#111111] px-5 py-24 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 grid gap-8 md:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">I bruk</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Se oljen i arbeid.</h2>
              </div>
              <p className="self-end text-lg leading-8 text-white/66">
                Fra siste finish ved bordet til daglig service på kjøkkenet: se hvordan Doña Anna brukes når smak, temperatur og timing teller.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {videoStories.map(item => (
                <article key={item.title} className="overflow-hidden border border-white/10 bg-black">
                  <video className="aspect-video w-full object-cover" controls muted playsInline preload="metadata" poster={item.poster}>
                    <source src={item.src} type="video/mp4" />
                  </video>
                  <div className="p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d4af37]">{item.eyebrow}</p>
                    <h3 className="mt-2 font-serif text-3xl">{item.title}</h3>
                    <p className="mt-4 leading-7 text-white/62">{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="portfolio" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <div className="mb-12 grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Portefølje</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Olje og bordoliven for bordet, kjøkkenet og hyllen.</h2>
            </div>
            <p className="self-end text-lg leading-8 text-white/66">
              Verde Vivo og Verde Alto er 500 ml finisholjer for bord og kjøkken. Cocina Viva gir kokker større format til daglig service. Mesa gir restauranter, barer og spesialbutikker en bordoliven med tydelig opprinnelse.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolioItems.map(item => (
              <article key={item.name} className="group border border-white/10 bg-white/[0.035] p-4 transition hover:border-[#d4af37]/50">
                <div className="grid gap-3">
                  <div className="h-72 overflow-hidden bg-[#080808]">
                    <img src={item.photo} alt={`${item.name} produktbilde`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  </div>
                </div>
                <div className="p-2 pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]">{item.role}</p>
                  <h3 className="mt-2 font-serif text-3xl">{item.name}</h3>
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
                Premium extra virgin olivenolje handler om mer enn en grønn flaske. Høstingstidspunkt, polyfenoler, jordliv, ekstraksjon og sensorisk kontroll avgjør både smaken, holdbarheten og opplevelsen ved bordet.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {knowledgeCards.map(card => (
                <article key={card.title} className="group overflow-hidden border border-black/10 bg-white">
                  <div className="h-56 overflow-hidden bg-black">
                    <img src={card.image} alt={card.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
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
                <img src={imagePaths.donaAnnaPouringBread} alt="Doña Anna olivenolje helles over brød" className="absolute inset-0 h-full w-full object-cover opacity-72" />
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
            <img src={imagePaths.verdeVivoHero} alt="Doña Anna Verde Vivo i Biar" className="h-full w-full object-cover" />
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
                  ['Sort', 'Changlot Real / gårdsblanding'],
                  ['Polyfenoler', 'Oppgis med batchanalyse'],
                  ['Ekstraksjon', 'Mekanisk · under 27°C'],
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
              <p className="mt-2 max-w-2xl text-white/62">Vi kan sette sammen en liten B2B-smakspakke med Verde Vivo, Verde Alto og Mesa-bordoliven.</p>
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
                  For kjøkken, butikk og import samler Doña Anna produktark, formatvalg, sporbarhet og en smaksprøve som gjør vurderingen konkret.
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
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-700 hover:scale-105" />
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
                Profesjonelle kjøpere trenger tydelige fakta. Doña Anna samler smaksnotater, format, høstedato, sort, batchnummer og analyseverdier slik at produktet er enkelt å vurdere, prise og servere.
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
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Et olivenprosjekt bygget fra Biar – med Freddy Bremseth som initiativtaker.</h2>
            </div>
            <div className="self-end">
              <p className="text-lg leading-8 text-white/66">
                Freddy Bremseth arbeider med eiendom, teknologi, forfatterskap og egne prosjekter i Spania. Doña Anna er den delen av porteføljen som handler om oliven, jord, matkultur, produktutvikling og en langsiktig merkevare med røtter i Biar.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="https://www.freddybremseth.com/" className="inline-flex h-11 items-center justify-center border border-white/16 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-[#d4af37]">Freddy Bremseth</a>
                <a href="https://www.freddybremseth.com/olivenolje-og-dona-anna.html" className="inline-flex h-11 items-center justify-center border border-white/16 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-[#d4af37]">Historien bak Doña Anna</a>
                <a href="https://books.freddybremseth.com/" className="inline-flex h-11 items-center justify-center border border-white/16 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-[#d4af37]">Bøker om oliven og Middelhavet</a>
              </div>
            </div>
          </div>
        </section>

        <section id="tasting" className="bg-[#f8f5ea] px-5 py-24 text-black md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">Smaksprøve</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Be om en smaksprøve for restauranten.</h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-black/66">
                Smaksprøven gir kjøkkensjefer og innkjøpere en konkret introduksjon til Doña Anna: tidlig høstet olje, bordoliven, smaksnotater og informasjon om formater og batcher.
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
            <form className="border border-black/12 bg-white p-5 shadow-2xl shadow-black/10" onSubmit={handleTastingRequest}>
              <label htmlFor="tasting-company" className="block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Restaurant / virksomhet</label>
              <input id="tasting-company" required value={tastingRequest.company} onChange={(event) => setTastingRequest({ ...tastingRequest, company: event.target.value })} className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label htmlFor="tasting-role" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Rolle</label>
              <input id="tasting-role" required value={tastingRequest.role} onChange={(event) => setTastingRequest({ ...tastingRequest, role: event.target.value })} placeholder="Kokk, innkjøper eller distributør" className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label htmlFor="tasting-email" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">E-post</label>
              <input id="tasting-email" required value={tastingRequest.email} onChange={(event) => setTastingRequest({ ...tastingRequest, email: event.target.value })} type="email" className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label htmlFor="tasting-address" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Leveringsadresse</label>
              <textarea id="tasting-address" required value={tastingRequest.address} onChange={(event) => setTastingRequest({ ...tastingRequest, address: event.target.value })} className="mt-2 h-24 w-full border border-black/12 p-3 outline-none focus:border-[#d4af37]" />
              <p className="mt-4 text-sm leading-6 text-black/60">Forespørselen åpner en e-post til Doña Anna med opplysningene dine. Vi svarer med tilgjengelighet, pris og levering.</p>
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
              <a href="/magasin">Magasin</a>
              <a href="/artikler">Artikler</a>
              <a href="/oppskrifter">Oppskrifter</a>
              <button data-testid="b2b-portal-footer" onClick={onLogin}>B2B Portal</button>
              <button data-testid="olivia-os-footer" onClick={onAdminLogin}>Olivia OS</button>
              <a href="mailto:info@donaanna.com">info@donaanna.com</a>
              <a href="https://www.freddybremseth.com/olivenolje-og-dona-anna.html">Freddy Bremseth · Doña Anna</a>
              <span>Oppdatert 2. oktober 2026</span>
            </div>
            <nav aria-label="Freddy Bremseth prosjektnettverk" className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.16em] text-white/38">
              <span className="text-[#d4af37]">Freddy Bremseth network</span>
              <a href="https://www.freddybremseth.com/">FreddyBremseth.com</a>
              <a href="https://www.zenecohomes.com/">Zen Eco Homes</a>
              <a href="https://www.pinosoecolife.com/">Pinoso Eco Life</a>
              <a href="https://www.chatgenius.pro/">ChatGenius</a>
              <a href="https://books.freddybremseth.com/">Books</a>
              <a href="https://art.freddybremseth.com/">Art</a>
              <a href="https://remaster.freddybremseth.com/">Re-Master Freddy</a>
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