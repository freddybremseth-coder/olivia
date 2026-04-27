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
    eyebrow: 'Økologisk extra virgin olivenolje · Biar, Alicante',
    headline: 'Doña Anna fra hjertet av Alicante.',
    subhead: 'Tidlig høstet olivenolje og bordoliven fra våre lunder i Biar. Skapt for kjøkken som verdsetter smak, opprinnelse, sporbarhet og en historie gjestene kan kjenne igjen ved bordet.',
    cta: 'Bestill tasting kit',
    portal: 'B2B portal',
    specTitle: 'Tekniske data for innkjøpere',
    traceTitle: 'Transparencia Total',
    traceText: 'Hver batch dokumenteres med høstedato, parsell, sort, sensorisk profil og analyseverdier. QR-sporingen gjør opprinnelsen synlig for kokk, innkjøper og gjest.',
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
    cta: 'Order tasting kit',
    portal: 'B2B portal',
    specTitle: 'Technical specs for buyers',
    traceTitle: 'Total Transparency',
    traceText: 'Every bottle can connect to batch, harvest date, parcel, variety, sensory profile and lab data in Olivia OS.',
  },
};

const portfolio = [
  {
    name: 'Verde Vivo',
    labelName: 'DOÑA ANNA · VERDE VIVO',
    format: '500 ml · Cosecha Temprana I',
    role: 'Intens finishing oil',
    photo: '/donaanna/product-design/verde-vivo-estate-arches.jpg',
    text: 'Vår mest intense tidlig-høstede olje. Grønn fruktighet, tydelig bitterhet og lang pepperfinish gjør den sterk på grillet fisk, tomat, brød, salater og retter som trenger en frisk avslutning.',
  },
  {
    name: 'Verde Alto',
    labelName: 'DOÑA ANNA · VERDE ALTO',
    format: '500 ml · Cosecha Temprana II',
    role: 'Balanced finishing oil',
    photo: '/donaanna/product-design/verde-alto-rustic-room.jpg',
    text: 'Tidlig høstet, men rundere i uttrykket enn Verde Vivo. En premium bord- og kjøkkenolje for restauranter som ønsker grønn karakter uten at oljen dominerer retten.',
  },
  {
    name: 'Raíz Antigua',
    labelName: 'DOÑA ANNA · RAÍZ ANTIGUA',
    format: '500 ml · old-tree estate selection',
    role: 'Old-tree selection',
    photo: '/donaanna/product-design/raiz-antigua-label-hero.jpg',
    text: 'En begrenset seleksjon fra eldre trær på gården. Dypere, mer moden fruktighet og en roligere eleganse gjør den egnet for menyer, gavepakker og restauranter som vil fortelle historien om lunden.',
  },
  {
    name: 'Monovarietal Collection',
    labelName: 'DOÑA ANNA · MONOVARIETAL COLLECTION',
    format: 'Genovesa · Gordal · Changlot Real · Picual',
    role: 'Variety tasting',
    photo: '/donaanna/product-design/portfolio-slate-mesa.jpg',
    text: 'Små batcher som viser hvordan sort, jord og høstetidspunkt påvirker aroma og struktur. En naturlig smaksreise for sommelierer, kokker og spesialbutikker.',
  },
  {
    name: 'Cocina Viva',
    labelName: 'DOÑA ANNA · COCINA VIVA',
    format: '2 L / 5 L · chef format',
    role: 'Chef format',
    photo: '/donaanna/product-design/cocina-viva-chef-pour.jpg',
    text: 'Større format for profesjonelle kjøkken som bruker olivenolje hver dag, men fortsatt vil ha kontroll på kvalitet, opprinnelse og batch. Utviklet for service, mise en place og varme retter.',
  },
  {
    name: 'Mesa',
    labelName: 'DOÑA ANNA · MESA',
    format: 'Aceitunas de mesa',
    role: 'Table olives',
    photo: '/donaanna/product-design/portfolio-slate-mesa.jpg',
    text: 'Bordoliven for aperitivo, markeder, barer og restauranter. En mer uformell inngang til Doña Anna, med samme fokus på råvare, tekstur og opprinnelse.',
  },
];

const specs = [
  ['Høsting', 'Tidlig høsting i to passeringer for ulik intensitet og polyfenolprofil'],
  ['Ekstraksjon', 'Mekanisk kald ekstraksjon under 27°C'],
  ['Kvalitet', 'Extra virgin med sensorisk kontroll og analyse per batch'],
  ['Polyfenoler', 'Måles per premiumbatch og knyttes til sporbar dokumentasjon'],
  ['Sorter', 'Genovesa · Gordal · Changlot Real · Picual'],
  ['Formater', '500 ml · 2 L · 5 L · bordoliven'],
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
    kicker: 'Naturlige antioksidanter',
    image: '/donaanna/polyphenols.jpg',
    text: 'Ekstra virgin olivenolje fra tidlig høsting kan inneholde et høyt nivå av polyfenoler. De gir bitterhet, pepperfølelse og er en viktig del av oljens ernæringsmessige profil.',
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
    image: '/donaanna/early-harvest.jpg',
    text: 'Tidlig høsting gir lavere oljeutbytte, men mer intens aroma, friskere grønn fruktighet og høyere bitterhet og skarphet. Det er kjernen i Verde Vivo og Verde Alto.',
  },
];

const qualitySteps = [
  ['01', 'Skånsom høsting', 'Oliven høstes når aromatikk, bitterhet og polyfenolpotensial er på sitt beste.'],
  ['02', 'Rask pressing', 'Kort vei fra tre til mølle bevarer friskhet, næringsstoffer og aroma.'],
  ['03', 'Kald ekstraksjon', 'Mekanisk ekstraksjon under 27°C beskytter polyfenoler og den grønne fruktigheten.'],
  ['04', 'Sensorisk kontroll', 'Fruktighet, bitterhet, skarphet og balanse vurderes før batchen får sin rolle i porteføljen.'],
];

const visualDirections = [
  {
    title: 'Finishing ved bordet',
    image: '/donaanna/product-design/verde-vivo-terrace-close.jpg',
    text: 'Verde Vivo og Verde Alto møter gjesten på bordet: brød, tomat, fisk, grønnsaker og en tydelig grønn finish rett før servering.',
  },
  {
    title: 'Restaurantkjøkken',
    image: '/donaanna/product-design/cocina-viva-chef-pour.jpg',
    text: 'Cocina Viva er utviklet for arbeidstempoet i et profesjonelt kjøkken, med større format og samme sporbare kvalitet som flaskene ved bordet.',
  },
  {
    title: 'Gammel rot og ild',
    image: '/donaanna/product-design/raiz-antigua-paella.jpg',
    text: 'Raíz Antigua bærer gårdens mest emosjonelle uttrykk: gamle trær, varme rom, røyk, treverk og en olje som fortjener langsom servering.',
  },
  {
    title: 'Hele kolleksjonen',
    image: '/donaanna/product-design/full-product-lineup.jpg',
    text: 'Kolleksjonen samler olje og bordoliven i et visuelt språk av mørkt glass, kremfarget etikett, DA-monogram og Doña Annas rolige signatur.',
  },
];

const videoStories = [
  {
    title: 'Michelin-kjøkkenet',
    eyebrow: 'I bruk',
    src: '/donaanna/video/michelin-chef-uses-dona-anna.mp4',
    poster: '/donaanna/product-design/cocina-viva-chef-pour.jpg',
    text: 'Doña Anna er laget for kjøkken som arbeider presist. Filmen viser oljen i bruk, der aroma, varme og timing avgjør hvordan retten avsluttes.',
  },
  {
    title: 'Flasken klar',
    eyebrow: 'Produktfilm',
    src: '/donaanna/video/video-av-flasken-klar.mp4',
    poster: '/donaanna/product-design/verde-vivo-estate-arches.jpg',
    text: 'En rolig produktfilm som viser flaske, materiale og uttrykk. Den bygger forventning før første dråpe treffer tallerkenen.',
  },
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
    ['Design', '#design'],
    ['Portfolio', '#portfolio'],
    ['Knowledge', '#knowledge'],
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
        <img src="/donaanna/product-design/verde-vivo-estate-arches.jpg" alt="Doña Anna Verde Vivo i Biar" className="absolute inset-0 h-full w-full object-cover opacity-36" />
        <video className="absolute inset-0 h-full w-full object-cover opacity-48" autoPlay muted loop playsInline poster="/donaanna/product-design/verde-vivo-estate-arches.jpg">
          <source src="/donaanna/video/video-av-flasken-klar.mp4" type="video/mp4" />
        </video>
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
              ['Parseller', formatNumber(signal.parcelCount)],
              ['Trær', formatNumber(signal.treeCount)],
              ['Sporbarhet', signal.isLive ? `${signal.activeBatches} aktive batcher` : 'Batchklar'],
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
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Gården</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">En levende olivengård, ikke bare en etikett.</h2>
                <p className="mt-6 text-lg leading-8 text-white/66">
                  Doña Anna ligger i Biar i Alicante, der kalkholdig jord, tørre somre og kjølige netter gir oliven med frisk grønn fruktighet, bitterhet og struktur. Gården kombinerer tradisjon, gamle trær, regenerativ praksis og presis dokumentasjon.
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

        <section id="design" className="border-y border-white/10 bg-[#080808] px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-center">
            <div className="overflow-hidden border border-[#d4af37]/24 bg-black">
              <img src="/donaanna/product-design/full-product-lineup.jpg" alt="Doña Anna produktlinje med Cocina Viva, Mesa, Verde Alto, Raíz Antigua og Verde Vivo" className="aspect-[16/9] w-full object-cover" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Merkevaren</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Mørk skifer, lyst tre og dempet middelhavslys.</h2>
              <p className="mt-6 text-lg leading-8 text-white/66">
                Doña Anna uttrykker middelhavets varme med et rolig, moderne luksusspråk: mørkt glass, kremfarget etikett, gulltoner og mye luft. Resultatet er en flaske som passer like godt på et hvitt restaurantbord som i et travelt kjøkken.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {[
                  ['Verde Vivo', '500 ml finishing'],
                  ['Mesa', 'Bordoliven'],
                  ['Cocina Viva', '2 L / 5 L chef'],
                ].map(([title, text]) => (
                  <div key={title} className="border border-white/10 bg-white/[0.035] p-4">
                    <p className="font-serif text-xl">{title}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#d4af37]">{text}</p>
                  </div>
                ))}
              </div>
              <a href="#portfolio" className="mt-8 inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
                Se porteføljen <ArrowRight size={17} />
              </a>
            </div>
          </div>
          <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
            {visualDirections.map(item => (
              <article key={item.title} className="group overflow-hidden border border-white/10 bg-white/[0.035]">
                <div className="h-56 overflow-hidden bg-black">
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                </div>
                <div className="p-5">
                  <p className="font-serif text-2xl">{item.title}</p>
                  <p className="mt-3 text-sm leading-6 text-white/62">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
          <div className="mx-auto mt-10 grid max-w-7xl gap-6 border border-white/10 bg-black/34 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <img src="/donaanna/social/dona-anna-youtube-channel-2560x1440.jpg" alt="Doña Anna YouTube kanalbanner" className="aspect-video w-full object-cover" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Doña Anna</p>
              <h3 className="mt-3 font-serif text-3xl md:text-4xl">En samlet visuell identitet.</h3>
              <p className="mt-4 leading-7 text-white/62">
                DA-monogrammet, navnet, Biar/Alicante og produktfamilien danner én tydelig flate. Det gir gjenkjennelse på nettside, video, smaksprøver, presentasjoner og emballasje.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-[#111111] px-5 py-24 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 grid gap-8 md:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">I bruk</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Video som selger produktet før smaking.</h2>
              </div>
              <p className="self-end text-lg leading-8 text-white/66">
                En god olje må sees i arbeid. Filmene viser Doña Anna i to situasjoner som betyr mest for kjøpere: flaskens premiumfølelse og kokkens praktiske bruk i et profesjonelt kjøkken.
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
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Olje og bordoliven bygget som en kolleksjon.</h2>
            </div>
            <p className="self-end text-lg leading-8 text-white/66">
              Verde Vivo og Verde Alto er 500 ml finishing oils for bord og kjøkken. Cocina Viva gir kokker større format i mørk metallkanne eller bag-in-box. Mesa gjør Doña Anna synlig i spanske markeder, restauranter og aperitivo-servering.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolio.map(item => (
              <article key={item.name} className="group border border-white/10 bg-white/[0.035] p-4 transition hover:border-[#d4af37]/50">
                <div className="grid gap-3">
                  <div className="h-72 overflow-hidden bg-[#080808]">
                    <img src={item.photo} alt={`${item.name} designfoto`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  </div>
                </div>
                <div className="p-2 pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]">{item.role}</p>
                  <h3 className="mt-2 font-serif text-3xl">{item.name}</h3>
                  <p className="mt-3 border-y border-white/10 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/72">{item.labelName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/48">{item.format}</p>
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
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Smak, helse og jord henger sammen.</h2>
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
                <img src="/donaanna/testing.jpg" alt="Kvalitetstesting av olivenolje" className="absolute inset-0 h-full w-full object-cover opacity-72" />
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
            <img src="/donaanna/farming-3.jpg" alt="Vann og presisjonsdrift i olivenlunden" className="h-full w-full object-cover" />
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
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#d4af37]">Batchpass</p>
                  <h3 className="mt-1 font-serif text-3xl">Verde Vivo · tidlig høst</h3>
                </div>
                <QrCode className="text-[#d4af37]" size={34} />
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-2">
                {[
                  ['Parsell', signal.heroMetric],
                  ['Høsting', signal.latestHarvestDate || 'Oktober-november'],
                  ['Sort', 'Changlot Real / estate blend'],
                  ['Polyfenoler', 'Analyseres per premiumbatch'],
                  ['Ekstraksjon', 'Mekanisk · under 27°C'],
                  ['Dokumentasjon', signal.isLive ? 'Aktiv batch' : 'Klar for QR'],
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

        <section className="bg-[#17130d] px-5 py-16 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 border border-[#d4af37]/30 bg-black/24 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d4af37]">For restauranter og innkjøpere</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">Smak før du bestemmer deg.</h2>
              <p className="mt-2 max-w-2xl text-white/62">Vi kan sette sammen en liten B2B-smakspakke med Verde Vivo, Verde Alto og Mesa-bordoliven.</p>
            </div>
            <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
              Bestill tasting kit <ArrowRight size={17} />
            </a>
          </div>
        </section>

        <section id="specs" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Produktdata</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.specTitle}</h2>
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

        <section id="tasting" className="bg-[#f8f5ea] px-5 py-24 text-black md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">Smaksprøve</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Bestill en eksklusiv smaksprøve for din restaurant.</h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-black/66">
                Tasting kit gir kjøkkensjefer og innkjøpere en konkret første opplevelse av Doña Anna: tidlig-høstet olje, bordoliven, smaksnotater, formatinformasjon og batchsporbarhet.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="mailto:info@donaanna.com?subject=Produktark%20Do%C3%B1a%20Anna" className="inline-flex items-center gap-2 border border-black/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em]">
                  <FileText size={16} /> Be om produktark
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
