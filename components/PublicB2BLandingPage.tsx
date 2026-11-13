import React, { useEffect, useRef, useState } from 'react';
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
import { DONA_ANNA_PRODUCTS, donaAnnaProductByName } from '../content/donaAnnaProducts';
import { estatePhotos, estatePhotosPublished } from '../data/estatePhotos';
import { sendPublicInquiry } from '../services/publicInquiry';

interface LandingPageProps {
  onLogin: () => void;
  onAdminLogin: () => void;
  onRegister: () => void;
}

const copy = {
  eyebrow: 'Olivenprosjekt fra Biar · Alicante · Anna & Freddy Bremseth',
  headline: 'Doña Anna – olivenolje og produkter fra Biar.',
  subhead: 'Fra vår olivengård i Biar utvikler vi Doña Anna med respekt for råvaren, tydelig opprinnelse og egne produkter for ulike bruksområder. Her kan du bli kjent med gården, utforske produktene og følge arbeidet frem mot dokumenterte lanseringer.',
  cta: 'Meld interesse for smaksprøve',
  portal: 'B2B portal',
  specTitle: 'Produktdata publiseres per produkt',
  traceTitle: 'Sporbarhet når batchen er klar',
  traceText: 'Når en batch er produsert og publisert, skal informasjon om høstedato, parsell, sort, sensorisk profil og analyseverdier knyttes til batchen.',
};

const imagePaths = {
  estateHero: '/donaanna/hero-image.jpg',
  oliveGrove: 'https://ereapsfcsqtdmzosgnnn.supabase.co/storage/v1/object/public/content-images/dona-anna/garden-2025/ChatGPT-bilde%2010.%20nov.%202026%2C%2012_19_18.jpg',
  harvestHands: '/donaanna/hero-image.jpg',
  harvestClose: '/donaanna/farming-2.jpg',
};

const biarGrovePhoto = 'https://ereapsfcsqtdmzosgnnn.supabase.co/storage/v1/object/public/content-images/dona-anna/garden-2025/ChatGPT-bilde%2010.%20nov.%202026%2C%2012_18_07.jpg';

type ProductMedia = {
  slug: string;
  approvedProductImage: string | null;
  safeContextImage: string;
  labelStatus: 'verified' | 'pending';
  availability: 'current' | 'planned';
  availabilityText: string;
};

const productMedia = (name: string): ProductMedia => {
  const product = donaAnnaProductByName(name);
  return product
    ? {
        slug: product.slug,
        approvedProductImage: product.approvedProductImage,
        safeContextImage: product.safeContextImage,
        labelStatus: product.labelStatus,
        availability: product.availability,
        availabilityText: product.availabilityText,
      }
    : {
        slug: 'produkter',
        approvedProductImage: null,
        safeContextImage: imagePaths.oliveGrove,
        labelStatus: 'pending',
        availability: 'planned',
        availabilityText: 'Produktinformasjon er ikke tilgjengelig ennå',
      };
};

const portfolio = [
  {
    name: 'Verde Vivo',
    labelName: 'DOÑA ANNA · VERDE VIVO',
    format: '500 ml · Cosecha temprana',
    role: 'Tidlig høstet olivenolje · mål om extra virgin-kvalitet',
    photo: productMedia('Verde Vivo').safeContextImage,
    text: 'Verde Vivo er produktet for tidlig høsting. Endelig kvalitetsklasse, sensorikk, analyse, høstedato og tilgjengelighet publiseres for den konkrete batchen.',
  },
  {
    name: 'Verde Alto',
    labelName: 'DOÑA ANNA · VERDE ALTO',
    format: 'Olivenolje · format bekreftes per produksjon',
    role: 'Balansert premiumprodukt · egen produktidentitet',
    photo: productMedia('Verde Alto').safeContextImage,
    text: 'Verde Alto er et eget produkt i Doña Anna-porteføljen. Smaksprofil, format, kvalitetsklasse og batchdata skal beskrives ut fra den faktiske produksjonen – ikke gjenbrukes fra Verde Vivo.',
  },
  {
    name: 'Raíz Antigua',
    labelName: 'DOÑA ANNA · RAÍZ ANTIGUA',
    format: 'Olivenolje · opprinnelse dokumenteres per batch',
    role: 'Heritage-produkt · egen produktidentitet',
    photo: productMedia('Raíz Antigua').safeContextImage,
    text: 'Raíz Antigua er et separat olivenoljeprodukt med egen historie og etikett. Påstander om trær, sorter, smak og begrenset produksjon publiseres først når de kan knyttes til den konkrete batchen.',
  },
  {
    name: 'Cocina Viva',
    labelName: 'DOÑA ANNA · COCINA VIVA',
    format: 'Profesjonelt kjøkkenformat · størrelse bekreftes',
    role: 'Restaurant og profesjonelt kjøkken · egen produktidentitet',
    photo: productMedia('Cocina Viva').safeContextImage,
    text: 'Cocina Viva er Doña Annas separate produktspor for profesjonelle kjøkken. Format, pris, tekniske egenskaper og leveringsopplegg bekreftes før det markedsføres som tilgjengelig.',
  },
  {
    name: 'Mesa · Gordal Noble',
    labelName: 'DOÑA ANNA · MESA · GORDAL NOBLE',
    format: 'Bordoliven · planlagt produkt',
    role: 'Aperitivo og bordoliven · ikke tilgjengelig ennå',
    photo: productMedia('Mesa · Gordal Noble').safeContextImage,
    text: 'Mesa · Gordal Noble er et eget planlagt bordolivenprodukt. Det skal ikke fremstilles som lansert før råvare, prosess, format, etikett, pris og tilgjengelighet er endelig dokumentert.',
  },
];

const productHref = (name: string) => '/' + productMedia(name).slug;

const specs = [
  ['Produkter', 'Verde Vivo · Verde Alto · Raíz Antigua · Cocina Viva · Mesa · Gordal Noble'],
  ['Format', 'Oppgis separat for hvert produkt når emballasje er bekreftet'],
  ['Kvalitetsklasse', 'Dokumenteres per oljeprodukt og batch før den publiseres som faktum'],
  ['Opprinnelse', 'Biar · Alicante · Spania'],
  ['Etikett', 'Hvert produkt bruker sin egen godkjente etikett'],
  ['Batchdata', 'Høstedato, analyse, sensorikk, pris og tilgjengelighet knyttes til riktig produkt og batch'],
];

const b2bPackages = [
  {
    title: 'Meld interesse for smaksprøve',
    audience: 'Restaurant / hotell',
    image: imagePaths.harvestHands,
    imageAlt: 'Illustrasjonsmotiv med oliven',
    text: 'Velg hvilket Doña Anna-produkt du er interessert i. Vi bekrefter tilgjengelighet, batchdata, pris og eventuell smaksprøve for riktig produkt når produksjonen er klar.',
  },
  {
    title: 'Produktinformasjon',
    audience: 'Kjøkken og faghandel',
    image: imagePaths.harvestClose,
    imageAlt: 'Illustrasjonsmotiv med oliventrær',
    text: 'Produktark og dokumenterte batchopplysninger bygges rundt den faktiske produksjonen – ikke rundt generiske produktløfter.',
  },
  {
    title: 'Butikk og import',
    audience: 'Gourmetbutikk / import',
    image: imagePaths.oliveGrove,
    imageAlt: 'Illustrasjon av en olivenlund',
    text: 'Ta kontakt for dialog om Verde Vivo, Verde Alto, Raíz Antigua, Cocina Viva eller planlagte Mesa · Gordal Noble. Format, dokumentasjon og distribusjon behandles per produkt.',
  },
];

const buyerProof: Array<{ icon: React.ElementType; title: string; text: string }> = [
  { icon: Package, title: 'Flere tydelige produkter', text: 'Hvert produkt har eget navn, rolle, produktside og etikett. Batchdata og tilgjengelighet holdes adskilt.' },
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
  ['Høsting', 'Høstedato og råvaregrunnlag dokumenteres for det produktet og den batchen de faktisk gjelder.'],
  ['Mølle', 'Produksjonsdata fra møllen knyttes til riktig oljeprodukt og konkret batch når oljen er produsert.'],
  ['Analyse', 'Analyseverdier og sensoriske notater publiseres først når resultatene foreligger, produkt for produkt.'],
  ['Emballasje', 'Hvert produkt bruker sin egen godkjente etikett, format og korrekte batchinformasjon.'],
];

const knowledgeCards = [
  {
    title: 'Tidlig høsting',
    kicker: 'Cosecha temprana',
    image: imagePaths.harvestHands,
    imageAlt: 'Illustrasjon av grønne oliven',
    text: 'Verde Vivo er utviklet som en tidlig høstet olivenolje med mål om extra virgin-kvalitet. Endelig kvalitetsklasse, smaksprofil og analyseverdier beskrives for den faktiske batchen når den foreligger.',
  },
  {
    title: 'Våre sorter',
    kicker: 'Gården i Biar',
    image: imagePaths.harvestClose,
    imageAlt: 'Illustrasjon av oliven som råvare',
    text: 'Genovesa, Gordal, Changlot Real og Picual er blant sortene på gården. Vi bruker sortsinformasjon som en del av sporbarheten – ikke som generiske smakslover.',
  },
  {
    title: 'Sporbar dokumentasjon',
    kicker: 'Batch for batch',
    image: imagePaths.oliveGrove,
    imageAlt: 'Illustrasjon med oliventrær',
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

const directInquiryEnabled =
  import.meta.env.VITE_DONAANNA_DIRECT_INQUIRY === 'true' &&
  Boolean(import.meta.env.VITE_DONAANNA_TURNSTILE_SITE_KEY);

type TurnstileApi = {
  render: (element: HTMLElement, options: {
    sitekey: string;
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
  }) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onAdminLogin, onRegister }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [livePortfolio, setLivePortfolio] = useState<PublicCommerceProduct[]>([]);
  const [inquiryKind, setInquiryKind] = useState<'tasting' | 'gift' | 'corporate-gift'>('tasting');
  const [giftPreference, setGiftPreference] = useState<'tasting-set' | 'personal-gift'>('tasting-set');
  const [tastingRequest, setTastingRequest] = useState({ product: 'Verde Vivo', audience: 'private', name: '', company: '', role: '', email: '', address: '', notes: '' });
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileWidgetId = useRef<string | null>(null);
  const inquirySendingRef = useRef(false);
  const [inquiryStatus, setInquiryStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

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

    const requestedProduct = new URLSearchParams(window.location.search).get('product')?.trim().toLowerCase() || '';
    const productFromSlug: Record<string, string> = {
      'verde-vivo': 'Verde Vivo',
      'verde-alto': 'Verde Alto',
      'raiz-antigua': 'Raíz Antigua',
      'cocina-viva': 'Cocina Viva',
      'mesa-gordal-noble': 'Mesa · Gordal Noble (planlagt)',
    };
    const selectedProduct = productFromSlug[requestedProduct];
    if (selectedProduct) {
      setTastingRequest(current => ({ ...current, product: selectedProduct }));
    }
  }, []);

  useEffect(() => {
    if (!directInquiryEnabled) return;
    let active = true;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!active) return;
      const turnstile = (window as Window & { turnstile?: TurnstileApi }).turnstile;
      const target = document.getElementById('donaanna-inquiry-turnstile');
      if (!turnstile || !target) return;
      turnstileWidgetId.current = turnstile.render(target, {
        sitekey: import.meta.env.VITE_DONAANNA_TURNSTILE_SITE_KEY,
        callback: setTurnstileToken,
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      });
    };
    document.head.appendChild(script);
    return () => {
      active = false;
      if (turnstileWidgetId.current !== null) {
        (window as Window & { turnstile?: TurnstileApi }).turnstile?.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
      script.remove();
    };
  }, []);

  const approvedNames = new Set(
    DONA_ANNA_PRODUCTS.flatMap(product => [product.name.toLowerCase(), ...product.aliases])
  );
  const approvedLivePortfolio = livePortfolio.filter(item => approvedNames.has(item.name.trim().toLowerCase()));
  // Preserve the five canonical editorial identities and their availability messaging.
  // A partial, internal commercial feed must not replace or hide products.
  const portfolioItems = portfolio.map(item => {
    const registry = donaAnnaProductByName(item.name);
    const live = approvedLivePortfolio.find(entry => entry.name.trim().toLowerCase() === item.name.toLowerCase());
    return registry?.availability === 'planned' || !live
      ? item
      : { ...item, priceLabel: live.priceLabel, stockLabel: live.stockLabel };
  });

  const chooseInquiry = (kind: 'tasting' | 'gift' | 'corporate-gift', audience: 'private' | 'business' = 'private', preference: 'tasting-set' | 'personal-gift' = 'tasting-set') => {
    setInquiryKind(kind);
    if (kind === 'gift') setGiftPreference(preference);
    setTastingRequest(current => ({ ...current, audience, product: kind === 'tasting' ? (current.product || 'Verde Vivo') : '' }));
    setInquiryStatus('idle');
  };

  const emailFallback = () => {
    const isBusiness = tastingRequest.audience === 'business';
    const inquiryLabel = inquiryKind === 'corporate-gift' ? 'Firmagaver' : inquiryKind === 'gift' ? (giftPreference === 'personal-gift' ? 'Personlig gave' : 'Smakssett') : `Smaksprøve av ${tastingRequest.product}`;
    const subject = `${inquiryLabel} (${isBusiness ? 'bedrift' : 'privat'}) – Doña Anna`;
    const body = [
      `Type forespørsel: ${inquiryLabel}`,
      `Produktinteresse: ${tastingRequest.product || 'Ikke bestemt'}`,
      `Kundetype: ${isBusiness ? 'Restaurant / bedrift' : 'Privatperson'}`,
      `Navn: ${tastingRequest.name}`,
      ...(isBusiness ? [`Restaurant / virksomhet: ${tastingRequest.company}`, `Rolle: ${tastingRequest.role || 'Ikke oppgitt'}`] : []),
      `E-post: ${tastingRequest.email}`,
      ...(tastingRequest.address.trim() ? [`Område / leveringssted: ${tastingRequest.address}`] : []),
      ...(tastingRequest.notes.trim() ? [`Melding: ${tastingRequest.notes}`] : []),
    ].join('\n');
    window.location.href = `mailto:info@donaanna.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleTastingRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!directInquiryEnabled) {
      emailFallback();
      return;
    }
    // Lock synchronously, before React has committed the disabled button state.
    if (inquirySendingRef.current || inquiryStatus === 'sent') return;
    if (!turnstileToken) {
      setInquiryStatus('error');
      return;
    }
    inquirySendingRef.current = true;
    setInquiryStatus('sending');
    const response = await sendPublicInquiry({
      kind: inquiryKind,
      giftPreference: inquiryKind === 'gift' ? giftPreference : undefined,
      product: tastingRequest.product,
      audience: tastingRequest.audience as 'private' | 'business',
      name: tastingRequest.name,
      email: tastingRequest.email,
      company: tastingRequest.company,
      role: tastingRequest.role,
      area: tastingRequest.address,
      message: tastingRequest.notes,
      turnstileToken,
    });
    inquirySendingRef.current = false;
    setInquiryStatus(response.accepted ? 'sent' : 'error');
    setTurnstileToken('');
    // Turnstile tokens are single-use: users need a fresh challenge on retry.
    // Preserve all form fields and do not retry or claim delivery automatically.
    if (!response.accepted && turnstileWidgetId.current !== null) {
      (window as Window & { turnstile?: TurnstileApi }).turnstile?.reset(turnstileWidgetId.current);
    }
  };

  const navLinks = [
    ['Gården', '#estate'],
    ['Produkter', '#portfolio'],
    ['Historien', '#story'],
    ['Gaver', '#gifts'],
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
            <a href="#tasting" onClick={() => chooseInquiry('tasting')} className="inline-flex h-10 items-center gap-2 border border-[#d4af37]/55 px-4 text-xs font-bold uppercase tracking-[0.18em] text-[#f7f1df] transition hover:bg-[#d4af37] hover:text-black">
              Be om smaksprøve
            </a>
            <button data-testid="b2b-portal-nav" onClick={onLogin} className="inline-flex h-10 items-center gap-2 bg-white px-4 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[#d4af37]">
              {copy.portal}
            </button>
          </div>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Lukk meny' : 'Åpne meny'} aria-expanded={menuOpen} aria-controls="donaanna-mobile-navigation">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div id="donaanna-mobile-navigation" className="mx-auto max-h-[calc(100dvh-4rem)] max-w-7xl overflow-y-auto overscroll-contain border-t border-white/10 py-4 lg:hidden">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-3 text-sm uppercase tracking-[0.2em] text-white/78">
                {label}
              </a>
            ))}
            <div className="mt-3 grid gap-2">
              <a href="#tasting" onClick={() => { setMenuOpen(false); chooseInquiry('tasting'); }} className="w-full bg-[#d4af37] px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-black">
                Be om smaksprøve
              </a>
              <button data-testid="b2b-portal-mobile-menu" onClick={() => { setMenuOpen(false); onLogin(); }} className="w-full border border-white/12 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-white/72">
                {copy.portal}
              </button>
            </div>
          </div>
        )}
      </nav>

      <header id="top" className="relative min-h-[100svh] overflow-hidden">
        <img src={imagePaths.estateHero} alt="Illustrasjonsbilde med oliven på trær" fetchPriority="high" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-42" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,13,.60),rgba(13,13,13,.88)_65%,rgba(13,13,13,.98))] md:bg-[radial-gradient(circle_at_72%_42%,rgba(212,175,55,.16),transparent_34%),linear-gradient(90deg,rgba(13,13,13,.98),rgba(13,13,13,.78),rgba(13,13,13,.42))]" />
        <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-8 pt-24 md:px-8 md:pb-12 md:pt-28">
          <div className="max-w-4xl animate-in fade-in duration-700">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">{copy.eyebrow}</p>
            <h1 className="font-serif text-4xl leading-[1.04] tracking-normal sm:text-5xl md:text-7xl md:leading-[0.95]">{copy.headline}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 md:mt-7 md:text-xl md:leading-8">{copy.subhead}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-9">
              <a href="#tasting" onClick={() => chooseInquiry('tasting')} className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
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
          <div className="mt-8 grid max-w-5xl grid-cols-2 border border-white/12 bg-black/22 backdrop-blur md:mt-12 md:grid-cols-4">
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
                  Anna og Freddy Bremseth står bak en olivengård på rundt 60 000 m² i Biar. Doña Anna er merkevaren vi bygger rundt trærne, menneskene og produktene som vokser frem her.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Hvor kommer olivenoljen fra?</h3>
                  <p className="mt-3 leading-7 text-white/62">Fra vår egen gård i Biar, Alicante. Her følger vi trærne gjennom sesongene og dokumenterer råvaren når oljen produseres.</p>
                </article>
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Hva kjennetegner oljen?</h3>
                  <p className="mt-3 leading-7 text-white/62">Høstetidspunkt, olivensort og behandling påvirker smaken. Den konkrete smaksprofilen kan først beskrives etter produksjon og vurdering.</p>
                </article>
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Kan restauranter få smaksprøve?</h3>
                  <p className="mt-3 leading-7 text-white/62">Profesjonelle kjøpere kan melde interesse nå. Vi tar kontakt om smaksprøver og betingelser når aktuell olje er klar.</p>
                </article>
                <article className="border border-white/10 bg-white/[0.035] p-5">
                  <h3 className="font-serif text-2xl">Hvem står bak?</h3>
                  <p className="mt-3 leading-7 text-white/62">Vi er Anna og Freddy Bremseth. <a className="text-[#d4af37] underline-offset-4 hover:underline" href="/om-dona-anna">Bli bedre kjent med oss og gården</a>.</p>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section id="customer-path" className="scroll-mt-20 border-b border-white/10 bg-[#f8f5ea] px-5 py-14 text-black md:px-8 md:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">Finn riktig inngang</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Hva vil du bruke Doña Anna til?</h2>
                <p className="mt-5 max-w-xl text-lg leading-8 text-black/64">Start med behovet ditt. Derfra kan du gå direkte til riktig produktinformasjon, kunnskap eller kontaktpunkt.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <a href="#tasting" onClick={() => chooseInquiry('tasting', 'business')} className="group border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-[#8a6a19]/55">
                  <Building2 size={24} className="text-[#8a6a19]" />
                  <h3 className="mt-8 font-serif text-3xl">Restaurant eller hotell</h3>
                  <p className="mt-3 leading-7 text-black/62">Velg produktet du er interessert i og få relevant batch- og produktinformasjon når den er klar.</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#8a6a19]">Be om smaksprøve <ArrowRight size={15} /></span>
                </a>
                <a href="#b2b" className="group border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-[#8a6a19]/55">
                  <Package size={24} className="text-[#8a6a19]" />
                  <h3 className="mt-8 font-serif text-3xl">Butikk eller import</h3>
                  <p className="mt-3 leading-7 text-black/62">Se de ulike produktene, dokumentasjonen og mulig distribusjon for faghandel og import.</p>
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

        <section id="estate" className="relative scroll-mt-20 overflow-hidden border-y border-white/10 bg-[#111111] py-14 md:py-24">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <img src={biarGrovePhoto} alt="Illustrasjon av et oliventre" loading="lazy" decoding="async" className="h-full w-full object-cover opacity-38" />
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
                  <a href="#tasting" onClick={() => chooseInquiry('tasting')} className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
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

        <section id="story" aria-labelledby="story-heading" className="scroll-mt-20 border-y border-white/10 bg-[#171711] px-5 py-14 md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
            <figure className="border border-white/10 bg-[#0d0d0d]">
              <img
                src={estatePhotosPublished ? estatePhotos.heritageTree.src : biarGrovePhoto}
                alt={estatePhotosPublished ? estatePhotos.heritageTree.alt : 'Illustrasjon av en olivenlund'}
                loading="lazy"
                decoding="async"
                className="h-80 w-full object-cover object-center md:h-[28rem]"
              />
              <figcaption className="px-4 py-3 text-sm text-white/60">{estatePhotosPublished ? estatePhotos.heritageTree.caption : 'Illustrasjonsbilde. Ekte fotografier fra vår olivengård publiseres når de er kontrollert og godkjent.'}</figcaption>
            </figure>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d4af37]">Menneskene · gården · opprinnelsen</p>
              <h2 id="story-heading" className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Fra vår gård i Biar. Til ditt bord.</h2>
              <p className="mt-6 text-lg leading-8 text-white/72">Doña Anna er Anna og Freddys olivenprosjekt i innlandet av Alicante. Vi vil dele historien om stedet, menneskene og arbeidet bak hver olje – ikke bare vise frem en flaske.</p>
              <p className="mt-4 leading-8 text-white/62">Det som står på etiketten, skal kunne følges tilbake til dokumenterte produkter og batcher. De forskjellige oljene har hver sin identitet, men alle bærer navnet Doña Anna og historien fra Biar.</p>
              <a href="/om-dona-anna" className="mt-7 inline-flex h-12 items-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.18em] text-black hover:bg-white">Bli kjent med Doña Anna <ArrowRight size={16} /></a>
            </div>
          </div>
        </section>

        {estatePhotosPublished && (
          <section id="grove-gallery" aria-labelledby="grove-gallery-heading" className="scroll-mt-20 bg-[#0e0e0e] px-5 py-14 md:px-8 md:py-24">
            <div className="mx-auto max-w-7xl">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#d4af37]">Bilder fra gården</p>
              <h2 id="grove-gallery-heading" className="mt-4 max-w-3xl font-serif text-4xl leading-tight md:text-5xl">Trær, røtter og oliven. Fra Biar.</h2>
              <p className="mt-5 max-w-3xl leading-8 text-white/65">Et glimt fra lunden gjennom fruktens ulike stadier. Bildene viser gården og er ikke dokumentasjon for sort, batch eller ferdige produkter.</p>
              <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[estatePhotos.grove, estatePhotos.mixed, estatePhotos.roots].map((photo) => (
                  <figure key={photo.original} className="border border-white/10 bg-white/[0.03]">
                    <img src={photo.src} alt={photo.alt} loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
                    <figcaption className="px-5 py-4 text-sm leading-6 text-white/65">{photo.caption}</figcaption>
                  </figure>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="/olivenolje-fra-biar" className="inline-flex h-11 items-center gap-2 border border-white/20 px-5 text-xs font-bold uppercase tracking-[0.17em] text-white hover:border-[#d4af37]">Om opprinnelsen <ArrowRight size={16} /></a>
                <a href="/tidlig-hostet-olivenolje" className="inline-flex h-11 items-center gap-2 border border-white/20 px-5 text-xs font-bold uppercase tracking-[0.17em] text-white hover:border-[#d4af37]">Om høstingen <ArrowRight size={16} /></a>
              </div>
            </div>
          </section>
        )}

        <section id="gifts" aria-labelledby="gifts-heading" className="scroll-mt-20 bg-[#f8f5ea] px-5 py-14 text-black md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-end gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#8a6a19]">Smaksopplevelser og gaver</p>
                <h2 id="gifts-heading" className="mt-4 font-serif text-4xl leading-tight md:text-6xl">En gave med en historie.</h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-black/70">En god gave handler ikke bare om innholdet. Den kan også formidle et sted, menneskene bak og tanken som ligger i råvaren. Derfor utforsker vi gavepresentasjoner og smaksopplevelser fra Doña Anna.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <article className="flex h-full flex-col border border-black/10 bg-white p-7">
                <Package size={27} className="text-[#8a6a19]" />
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-[#8a6a19]">Konsept under utvikling</p>
                <h3 className="mt-2 font-serif text-3xl">Smakssett</h3>
                <p className="mt-4 flex-1 leading-7 text-black/65">Et mulig utvalg av oljer med veiledning om bruk, opprinnelse og dokumenterte forskjeller – for matinteresserte som vil lære mer.</p>
                <a href="#tasting" onClick={() => chooseInquiry('gift', 'private', 'tasting-set')}
                  className="mt-7 inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#705515] underline-offset-4 hover:underline">Meld interesse <ArrowRight size={16} /></a>
              </article>
              <article className="flex h-full flex-col border border-black/10 bg-white p-7">
                <Sparkles size={27} className="text-[#8a6a19]" />
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-[#8a6a19]">Konsept under utvikling</p>
                <h3 className="mt-2 font-serif text-3xl">Personlig gave</h3>
                <p className="mt-4 flex-1 leading-7 text-black/65">For vertskap og matglade mennesker. En gjennomtenkt presentasjon med fortellingen om gården som en del av opplevelsen.</p>
                <a href="#tasting" onClick={() => chooseInquiry('gift', 'private', 'personal-gift')}
                  className="mt-7 inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#705515] underline-offset-4 hover:underline">Meld interesse <ArrowRight size={16} /></a>
              </article>
              <article className="flex h-full flex-col border border-black/10 bg-white p-7">
                <Building2 size={27} className="text-[#8a6a19]" />
                <p className="mt-6 text-xs font-bold uppercase tracking-[0.15em] text-[#8a6a19]">Forespørsel for bedrifter</p>
                <h3 className="mt-2 font-serif text-3xl">Firmagaver</h3>
                <p className="mt-4 flex-1 leading-7 text-black/65">En mulig gave til kunder, ansatte og samarbeidspartnere. Fortell oss om anledning, antall og behov, så vurderer vi hva som kan tilbys.</p>
                <a href="#tasting" onClick={() => chooseInquiry('corporate-gift', 'business')}
                  className="mt-7 inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-[#705515] underline-offset-4 hover:underline">Spør om mulighetene <ArrowRight size={16} /></a>
              </article>
            </div>
            <div className="mt-8 grid gap-6 border border-black/10 bg-[#eee7d7] p-6 md:grid-cols-[0.75fr_1.25fr] md:p-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#705515]">Vår designfilosofi</p>
                <h3 className="mt-3 font-serif text-3xl leading-tight md:text-4xl">Historien skal være like ekte som innholdet.</h3>
              </div>
              <div>
                <p className="leading-7 text-black/70">Vi utvikler emballasjen rundt én tydelig Doña Anna-identitet: respekt for gården i Biar, egne produktnavn og informasjon som kan dokumenteres. En vakker flaske er viktig, men kvaliteten på råvaren og det vi kan fortelle sant om den kommer først.</p>
                <p className="mt-3 text-sm leading-6 text-black/60">Flasker, gaveesker og nye etiketter er fremdeles til vurdering. Endelig utforming vises først når fysiske prøver og nødvendig produktinformasjon er godkjent.</p>
                <a href="/om-dona-anna" className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#705515] underline-offset-4 hover:underline">Om gården og menneskene <ArrowRight size={16} /></a>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6">
              <p className="max-w-2xl text-sm leading-6 text-black/60">Dette er interessehenvendelser – ikke bestillinger. Vi bekrefter ingen pris, varetilgjengelighet, gaveemballasje eller levering før produktene og betingelsene er klare.</p>
              <a href="/om-dona-anna" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#705515] underline-offset-4 hover:underline">Les historien om gården <ArrowRight size={16} /></a>
            </div>
          </div>
        </section>

        <section id="portfolio" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-14 md:px-8 md:py-24">
          <div className="mb-12 grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Portefølje</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Én merkevare. Flere tydelige produkter.</h2>
            </div>
            <p className="self-end text-lg leading-8 text-white/66">
              Utforsk olivenoljene Verde Vivo, Verde Alto, Raíz Antigua og Cocina Viva, hver med sin egen rolle. Mesa · Gordal Noble er vår planlagte satsing på bordoliven. Produktsidene viser hva som er utviklet, og hva som fortsatt gjenstår før lansering.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portfolioItems.map(item => (
              <article key={item.name} className="group flex h-full flex-col border border-white/10 bg-white/[0.035] p-3 transition hover:border-[#d4af37]/50 sm:p-4">
                <div className="grid gap-3">
                  <div className="relative flex h-60 items-center justify-center overflow-hidden bg-[#e9e1cf] sm:h-72">
                    {productMedia(item.name).approvedProductImage ? (
                      <img
                        src={productMedia(item.name).approvedProductImage as string}
                        alt={`Doña Anna ${item.name}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <>
                        <img
                          src={productMedia(item.name).safeContextImage}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover opacity-16 grayscale"
                        />
                        <div className="absolute inset-0 bg-[#e9e1cf]/72" />
                        <img src="/labels/dona-anna-figure.svg" alt="" className="relative h-36 w-36 object-contain opacity-85" />
                        <div className="absolute inset-x-3 top-3 flex justify-end sm:inset-x-4 sm:top-4">
                          <span className="max-w-full border border-black/15 bg-white/90 px-2 py-1 text-right text-[9px] font-bold uppercase leading-4 tracking-[0.12em] text-black/65 backdrop-blur sm:tracking-[0.16em]">
                            {productMedia(item.name).labelStatus === 'verified' ? 'Etikett verifisert · produktfoto venter' : 'Produktfoto venter på godkjent etikett'}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="absolute bottom-5 left-5 right-5 border-t border-black/15 pt-4 text-center text-black">
                      <p className="font-serif text-2xl">DOÑA ANNA</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em]">{item.name}</p>
                      {productMedia(item.name).availability === 'planned' && (
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black/55">Planlagt · ikke tilgjengelig ennå</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-2 pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#d4af37]">{item.role}</p>
                  <h3 className="mt-2 font-serif text-3xl"><a href={productHref(item.name)} className="hover:text-[#d4af37]">{item.name}</a></h3>
                  <p className="mt-3 border-y border-white/10 py-3 text-[10px] font-bold uppercase tracking-[0.24em] text-white/72">{item.labelName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/48">{item.format}</p>
                  <p className="mt-3 text-xs leading-5 text-white/65">{productMedia(item.name).availabilityText}</p>
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
                  <a href={productHref(item.name)} className="mt-6 inline-flex min-h-11 items-center justify-between gap-3 border-t border-[#d4af37]/35 pt-4 text-xs font-bold uppercase tracking-[0.17em] text-[#d4af37] transition group-hover:text-white sm:mt-auto sm:pt-5">
                    Se produktinformasjon <ArrowRight size={17} aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="knowledge" className="scroll-mt-20 border-y border-white/10 bg-[#f8f5ea] px-5 py-14 text-black md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">Kunnskap</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Smak, jord og høstetid henger sammen.</h2>
              </div>
              <p className="self-end text-lg leading-8 text-black/66">
                Når olivenene modnes, endres også mulighetene for smak og oljeutbytte. Her forklarer vi sammenhengen mellom høsting, sorter og kvalitet – og hva som må undersøkes før en olje kan beskrives presist.
              </p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {knowledgeCards.map(card => (
                <article key={card.title} className="group overflow-hidden border border-black/10 bg-white">
                  <div className="h-48 overflow-hidden bg-black sm:h-56">
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
              <div className="relative min-h-[320px] overflow-hidden sm:min-h-[360px]">
                <img src={imagePaths.harvestClose} alt="Illustrasjonsbilde med oliven på trær" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover opacity-72" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.92))]" />
                <div className="absolute bottom-0 p-5 sm:p-6">
                  <Sparkles className="text-[#d4af37]" size={26} />
                  <h3 className="mt-4 font-serif text-3xl sm:text-4xl">Kvalitetsforskjellen</h3>
                  <p className="mt-3 max-w-md leading-7 text-white/85">Fruktighet, bitterhet, skarphet og balanse vurderes før en batch får sin plass i porteføljen. Det gir kokker en olje som oppfører seg forutsigbart på tallerkenen.</p>
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

        <section className="relative overflow-hidden bg-[#0d0d0d] py-14 md:py-24">
          <div className="absolute inset-0 opacity-24">
            <img src={imagePaths.oliveGrove} alt="Illustrasjon av oliven i en lund" loading="lazy" decoding="async" className="h-full w-full object-cover" />
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

        <section id="traceability" className="scroll-mt-20 border-y border-white/10 bg-[#111111] py-14 md:py-24">
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
                  <h3 className="mt-1 font-serif text-3xl">Produktspesifikt batchpass</h3>
                </div>
                <QrCode className="text-[#d4af37]" size={34} />
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-2">
                {[
                  ['Produkt', 'Velges per produkt'],
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
              <p className="mt-2 max-w-2xl text-white/62">Velg produktet du er interessert i. Vi bekrefter smaksprøve, produktark, pris og levering når den aktuelle produksjonen er klar.</p>
            </div>
            <a href="#tasting" onClick={() => chooseInquiry('tasting')} className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] px-6 text-xs font-bold uppercase tracking-[0.2em] text-black transition hover:bg-white">
              {copy.cta} <ArrowRight size={17} />
            </a>
          </div>
        </section>

        <section id="b2b" className="scroll-mt-20 bg-[#f8f5ea] px-5 py-14 text-black md:px-8 md:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 grid gap-8 md:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">B2B</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Et godt produkt må være enkelt å kjøpe inn.</h2>
              </div>
              <div className="self-end">
                <p className="text-lg leading-8 text-black/66">
                  For restauranter, hoteller og faghandel gjør vi det enkelt å ta kontakt om riktig bruksområde. Når produktene er klare, følger konkrete produktark, priser og leveringsvilkår med dialogen.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a href="#tasting" onClick={() => chooseInquiry('tasting')} className="inline-flex h-12 items-center justify-center gap-2 bg-black px-6 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#8a6a19]">
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
                  <div className="h-52 overflow-hidden bg-black sm:h-64">
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

        <section id="specs" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-14 md:px-8 md:py-24">
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

        <section id="people" className="scroll-mt-20 border-y border-white/10 bg-[#111111] px-5 py-14 md:px-8 md:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#d4af37]">Bak Doña Anna</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">Anna og Freddy Bremseth bygger Doña Anna sammen i Biar.</h2>
            </div>
            <div className="self-end">
              <p className="text-lg leading-8 text-white/66">
                Anna Bremseth og Freddy Bremseth driver Doña Anna sammen. Prosjektet handler om gården, oliventrærne og en portefølje med egne produkter, etiketter og bruksområder – bygget som én langsiktig merkevare med tydelig opprinnelse i Biar.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="/om-dona-anna" className="inline-flex h-11 items-center justify-center border border-white/16 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-[#d4af37]">Anna & Freddy · om prosjektet</a>
                <a href="https://www.freddybremseth.com/" className="inline-flex h-11 items-center justify-center border border-white/16 px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:border-[#d4af37]">FreddyBremseth.com</a>
              </div>
            </div>
          </div>
        </section>

        <section id="tasting" className="scroll-mt-20 bg-[#f8f5ea] px-5 py-14 text-black md:px-8 md:py-24">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">Smaksprøve</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{inquiryKind === 'corporate-gift' ? 'Spør oss om firmagaver.' : inquiryKind === 'gift' ? 'Meld interesse for gaver og smakssett.' : 'Meld interesse for smaksprøve.'}</h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-black/66">
                Velg hva du ønsker å høre mer om, og fortell oss litt om behovet ditt. Vi svarer med det vi kan bekrefte om produktene og mulighetene.
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
              <label htmlFor="inquiry-kind" className="block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Hva gjelder henvendelsen?</label>
              <select id="inquiry-kind" value={inquiryKind} onChange={(event) => chooseInquiry(event.target.value as 'tasting' | 'gift' | 'corporate-gift', event.target.value === 'corporate-gift' ? 'business' : tastingRequest.audience as 'private' | 'business')} className="mt-2 h-12 w-full border border-black/12 bg-white px-3 outline-none focus:border-[#d4af37]">
                <option value="tasting">Smaksprøve / produktinteresse</option>
                <option value="gift">Smakssett / personlig gave</option>
                <option value="corporate-gift">Firmagaver</option>
              </select>
              {inquiryKind === 'gift' && (
                <>
                  <label htmlFor="gift-preference" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Gavetype</label>
                  <select id="gift-preference" value={giftPreference} onChange={(event) => setGiftPreference(event.target.value as 'tasting-set' | 'personal-gift')} className="mt-2 h-12 w-full border border-black/12 bg-white px-3 outline-none focus:border-[#d4af37]">
                    <option value="tasting-set">Smakssett</option>
                    <option value="personal-gift">Personlig gave</option>
                  </select>
                </>
              )}
              <label htmlFor="tasting-audience" className="block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Jeg henvender meg som</label>
              <select id="tasting-audience" value={tastingRequest.audience} onChange={(event) => setTastingRequest({ ...tastingRequest, audience: event.target.value })} className="mt-2 h-12 w-full border border-black/12 bg-white px-3 outline-none focus:border-[#d4af37]">
                {inquiryKind !== 'corporate-gift' && <option value="private">Privatperson</option>}
                <option value="business">Restaurant / bedrift</option>
              </select>
              <label htmlFor="tasting-product" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">{inquiryKind === 'tasting' ? 'Produkt' : 'Produktinteresse (valgfritt)'}</label>
              <select id="tasting-product" required={inquiryKind === 'tasting'} value={tastingRequest.product} onChange={(event) => setTastingRequest({ ...tastingRequest, product: event.target.value })} className="mt-2 h-12 w-full border border-black/12 bg-white px-3 outline-none focus:border-[#d4af37]">
                {inquiryKind !== 'tasting' && <option value="">Ikke bestemt ennå</option>}
                <option>Verde Vivo</option>
                <option>Verde Alto</option>
                <option>Raíz Antigua</option>
                <option>Cocina Viva</option>
                <option>Mesa · Gordal Noble (planlagt)</option>
              </select>
              <label htmlFor="tasting-name" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Navn</label>
              <input id="tasting-name" required autoComplete="name" value={tastingRequest.name} onChange={(event) => setTastingRequest({ ...tastingRequest, name: event.target.value })} className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              {tastingRequest.audience === 'business' && (
                <>
                  <label htmlFor="tasting-company" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Restaurant / virksomhet</label>
                  <input id="tasting-company" required value={tastingRequest.company} onChange={(event) => setTastingRequest({ ...tastingRequest, company: event.target.value })} className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
                  <label htmlFor="tasting-role" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Rolle (valgfritt)</label>
                  <input id="tasting-role" value={tastingRequest.role} onChange={(event) => setTastingRequest({ ...tastingRequest, role: event.target.value })} placeholder="Kokk, innkjøper eller distributør" className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
                </>
              )}
              <label htmlFor="tasting-email" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">E-post</label>
              <input id="tasting-email" required autoComplete="email" value={tastingRequest.email} onChange={(event) => setTastingRequest({ ...tastingRequest, email: event.target.value })} type="email" className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label htmlFor="tasting-address" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">Område / leveringssted (valgfritt)</label>
              <input id="tasting-address" value={tastingRequest.address} onChange={(event) => setTastingRequest({ ...tastingRequest, address: event.target.value })} placeholder="For eksempel Alicante eller Norge" className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-[#d4af37]" />
              <label htmlFor="tasting-notes" className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">{inquiryKind === 'tasting' ? 'Hva ønsker du å vite? (valgfritt)' : 'Anledning, antall og eventuelle ønsker (valgfritt)'}</label>
              <textarea id="tasting-notes" value={tastingRequest.notes} onChange={(event) => setTastingRequest({ ...tastingRequest, notes: event.target.value })} className="mt-2 h-24 w-full border border-black/12 p-3 outline-none focus:border-[#d4af37]" />
              {directInquiryEnabled && <div id="donaanna-inquiry-turnstile" className="mt-5" aria-label="Spamkontroll" />}
              {inquiryStatus === 'sent' ? (
                <p role="status" className="mt-4 border border-green-700/30 bg-green-50 p-4 text-sm text-green-900">Takk! Henvendelsen ble mottatt av vår e-posttjeneste. Vi tar kontakt når vi har mer informasjon. Dette er ikke en bestillingsbekreftelse.</p>
              ) : (
                <>
                  <p className="mt-4 text-sm leading-6 text-black/60">{directInquiryEnabled
                    ? 'Opplysningene sendes via et sikkert nettskjema. En smaksprøve er ikke bekreftet før vi har svart.'
                    : 'Knappen åpner en ferdig utfylt e-post i e-postprogrammet ditt. Ingenting sendes direkte fra nettstedet, og en smaksprøve er ikke bekreftet før vi har svart.'}</p>
                  {inquiryStatus === 'error' && <p role="alert" className="mt-3 text-sm text-red-800">Vi kunne ikke bekrefte innsendingen. Henvendelsen kan allerede være mottatt dersom forbindelsen ble brutt. Unngå å sende den samme meldingen flere ganger; bruk e-postalternativet ved behov.</p>}
                  <button disabled={inquiryStatus === 'sending'} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-black px-5 text-xs font-bold uppercase tracking-[0.2em] text-white disabled:opacity-50">
                    {directInquiryEnabled ? (inquiryStatus === 'sending' ? 'Sender …' : 'Send forespørsel') : 'Åpne e-postforespørsel'} <ArrowRight size={17} />
                  </button>
                  {directInquiryEnabled && <button type="button" disabled={inquiryStatus === 'sending'} onClick={emailFallback} className="mt-3 min-h-11 w-full disabled:opacity-50 text-xs font-bold uppercase tracking-[0.15em] text-[#705515] underline">Åpne e-postforespørsel i stedet</button>}
                </>
              )}
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
              <span>Fra olivengården vår i Biar, Alicante</span>
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

      <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-2 gap-2 border-t border-white/10 bg-[#0d0d0d]/94 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
        <a href="#tasting" onClick={() => chooseInquiry('tasting')} className="inline-flex h-12 items-center justify-center gap-2 bg-[#d4af37] text-xs font-bold uppercase tracking-[0.16em] text-black">
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
