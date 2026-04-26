import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Bot,
  Droplets,
  Leaf,
  LineChart,
  LockKeyhole,
  Menu,
  QrCode,
  ShieldCheck,
  Sparkles,
  Sprout,
  ThermometerSun,
  X,
} from 'lucide-react';
import { fetchPublicEstateSignal, PublicEstateSignal } from '../services/publicEstate';

interface LandingPageProps {
  onLogin: () => void;
  onAdminLogin: () => void;
  onRegister: () => void;
}

const products = [
  {
    name: 'Doña Anna Verde Vivo',
    role: 'Første tidlige høsting · høyest polyfenol',
    image: '/donaanna/primera-cosecha.jpg',
    text: 'Den mest intense oljen. Lavt utbytte, tidlig grønn frukt, tydelig bitterhet og lang pepperfinish. Nummerert batch med laboratoriemålt polyfenolnivå.',
    detail: '250 ml · begrenset batch',
  },
  {
    name: 'Doña Anna Verde Alto',
    role: 'Andre tidlige høsting · høy polyfenol',
    image: '/donaanna/centenario.jpg',
    text: 'Fortsatt tidlig og polyfenolsterk, men rundere og mer anvendelig. Flaggskipet for daglig premiumbruk, restauranter og abonnement.',
    detail: '250 ml og 500 ml',
  },
  {
    name: 'Doña Anna Raíz Antigua',
    role: 'Gamle trær · begrenset estate selection',
    image: '/donaanna/genovesa-pura.jpg',
    text: 'En liten batch fra de eldste trærne. Bør bare være sortsspesifikk hvis sensorikk eller analyse faktisk skiller seg tydelig ut.',
    detail: '250 ml og 500 ml',
  },
  {
    name: 'Doña Anna Changlot Real',
    role: 'Monovarietal · lokal signatur',
    image: '/donaanna/changlot-real.jpg',
    text: 'Sortsolje for nysgjerrige kunder og smakinger. Genovesa, Gordal/Gordial, Changlot Real og Picual bør få egne batcher først etter testpressing.',
    detail: '250 ml og 500 ml',
  },
];

const labelConcepts = [
  {
    name: 'Verde Vivo',
    strategy: 'Topplinjen. Første tidlige høsting, lavt utbytte, høy pris og tydelig laboratorietall på etiketten.',
    palette: 'Klorofyllgrønn, sort glass, varm gullfolie',
    bottle: 'Mørk 250 ml Dorica eller Marasca',
  },
  {
    name: 'Verde Alto',
    strategy: 'Den kommersielle high-polyphenol-linjen. Fortsatt tidlig, men rundere, større volum og enklere å bruke daglig.',
    palette: 'Dyp olivengrønn, elfenben, sort',
    bottle: '250 ml og 500 ml mørkt glass',
  },
  {
    name: 'Raíz Antigua',
    strategy: 'Gamle trær som knapphetsprodukt. Bruk som estate selection, ikke nødvendigvis per sort før dere ser reell sensorisk verdi.',
    palette: 'Dyp vinrød, kalkstein, olivengrønn',
    bottle: '500 ml premium glass med trehette',
  },
];

const knowledge = [
  {
    title: 'Polyfenoler som kvalitetsbevis',
    image: '/donaanna/polyphenols.jpg',
    text: 'Tidlig høsting gir kraftigere smak, høyere bitterhet og mer av de antioksidantene premium-kunder faktisk leter etter.',
  },
  {
    title: 'Regenerativ drift i praksis',
    image: '/donaanna/regenerative-farming.jpg',
    text: 'Dekkvekster, kompost, biodiversitet og smart vannforvaltning gjør gården mer robust i Alicantes tørre klima.',
  },
  {
    title: 'Fra håndplukk til batch',
    image: '/donaanna/early-harvest.jpg',
    text: 'Hver batch kan dokumenteres fra parsell til flaske med Olivia: høstedato, kvalitet, oppskrift, sensorikk og QR-sporing.',
  },
];

const formatNumber = (value: number) => new Intl.NumberFormat('no-NO').format(value);

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onAdminLogin, onRegister }) => {
  const [menuOpen, setMenuOpen] = useState(false);
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
  }, []);

  const navLinks = [
    ['Oljen', '#oljen'],
    ['Gården', '#garden'],
    ['Sporbarhet', '#sporbarhet'],
    ['Etiketter', '#etiketter'],
    ['Kontakt', '#kontakt'],
  ];

  return (
    <div className="min-h-screen bg-[#fbf8ef] text-[#171812] selection:bg-[#bfdc71]/50">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-[#171812]/82 px-4 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            <img src="/donaanna/donaanna-logo.png" alt="Doña Anna" className="h-10 w-10 object-contain" />
            <div>
              <p className="text-sm font-semibold leading-none tracking-[0.28em]">DOÑA ANNA</p>
              <p className="text-[11px] text-[#d7c89b]">Olive Estate · Biar</p>
            </div>
          </a>
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} className="text-sm text-white/78 transition hover:text-white">
                {label}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={onAdminLogin} className="inline-flex h-10 items-center gap-2 border border-white/14 px-3 text-sm text-white/72 transition hover:bg-white/10">
              <LockKeyhole size={15} /> Admin
            </button>
            <button onClick={onLogin} className="inline-flex h-10 items-center gap-2 border border-white/14 px-4 text-sm font-semibold transition hover:bg-white/10">
              Olivia OS
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Meny">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="mx-auto max-w-7xl border-t border-white/10 py-4 md:hidden">
            {navLinks.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-3 text-white/85">
                {label}
              </a>
            ))}
            <button onClick={onLogin} className="mt-3 w-full border border-white/18 px-4 py-3 text-left font-semibold">
              Åpne Olivia OS
            </button>
          </div>
        )}
      </nav>

      <header id="top" className="relative min-h-[92vh] overflow-hidden bg-[#171812] text-white">
        <img src="/donaanna/hero-image.jpg" alt="Olivenlunden i Biar" className="absolute inset-0 h-full w-full object-cover opacity-78" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,12,8,.92),rgba(10,12,8,.54),rgba(10,12,8,.18))]" />
        <div className="relative mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-end px-5 pb-14 pt-28 md:px-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 border border-[#d8c071]/40 bg-black/22 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#e9d98e]">
              <Sparkles size={15} /> Estate oil powered by Olivia AI
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.96] md:text-7xl">
              Doña Anna
              <span className="block text-[#f2df91]">olivenolje med levende sporbarhet.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82 md:text-xl">
              Premium økologisk extra virgin olivenolje fra Biar, Alicante. Håndplukket, kaldpresset og dokumentert fra parsell til flaske i samme driftssystem som styrer gården.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#oljen" className="inline-flex h-12 items-center justify-center gap-2 bg-[#f2df91] px-5 font-semibold text-[#171812] transition hover:bg-white">
                Utforsk oljen <ArrowRight size={18} />
              </a>
              <button onClick={onRegister} className="inline-flex h-12 items-center justify-center gap-2 border border-white/26 px-5 font-semibold text-white transition hover:bg-white/10">
                Koble deg til gården
              </button>
            </div>
          </div>
          <div className="mt-12 grid max-w-5xl grid-cols-2 border border-white/16 bg-black/20 backdrop-blur md:grid-cols-4">
            {[
              ['Lokasjon', signal.heroMetric],
              ['Parseller', formatNumber(signal.parcelCount)],
              ['Trær registrert', formatNumber(signal.treeCount)],
              ['Batch-status', signal.isLive ? `${signal.activeBatches} aktive` : 'Klar for live-data'],
            ].map(([label, value]) => (
              <div key={label} className="border-white/12 p-4 odd:border-r md:border-r md:last:border-r-0">
                <p className="text-xs uppercase tracking-[0.18em] text-[#d8c071]">{label}</p>
                <p className="mt-2 text-xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main>
        <section id="oljen" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-[0.9fr_1.4fr] md:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#7a8e24]">Produktarkitektur</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">En portefølje som kan selge både smak, helse og opprinnelse.</h2>
            <p className="mt-5 text-lg leading-8 text-[#575849]">
              Den gamle siden hadde sterke produktnavn. Jeg har strammet dem inn i en tydeligere premium-logikk: en toppserie, en arv-serie, sortsoljer og en bred signaturlinje.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {products.map(product => (
              <article key={product.name} className="overflow-hidden border border-[#ddd1aa] bg-white">
                <img src={product.image} alt={product.name} className="h-52 w-full object-cover" />
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9f7b20]">{product.role}</p>
                  <h3 className="mt-2 text-2xl font-semibold">{product.name}</h3>
                  <p className="mt-3 leading-7 text-[#575849]">{product.text}</p>
                  <p className="mt-4 text-sm font-semibold text-[#171812]">{product.detail}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="garden" className="bg-[#172015] py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[1.15fr_0.85fr] md:px-8">
            <div className="grid grid-cols-2 gap-3">
              <img src="/donaanna/farming-1.jpg" alt="Økologisk olivendyrking" className="h-72 w-full object-cover" />
              <img src="/donaanna/farming-2.jpg" alt="Biodiversitet i olivenlunden" className="mt-12 h-72 w-full object-cover" />
              <img src="/donaanna/farming-3.jpg" alt="Vannforvaltning" className="h-64 w-full object-cover" />
              <img src="/donaanna/farming-4.jpg" alt="Dyr og jordliv i lunden" className="mt-[-2rem] h-64 w-full object-cover" />
            </div>
            <div className="self-center">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#bfdc71]">Regenerativ drift</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Troverdighet må kunne måles, ikke bare fortelles.</h2>
              <p className="mt-5 text-lg leading-8 text-white/76">
                Doña Anna bør bruke Olivia-data som bevisføring: parsellkart, vannstatus, oppgaver, høstedatoer, batcher og kvalitetstester. Det gjør siden mer moderne enn en vanlig gårdsfortelling.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  [Sprout, 'Økologisk dyrking'],
                  [Leaf, 'Biodiversitet'],
                  [Droplets, 'Vannforvaltning'],
                  [ThermometerSun, 'Klima og sensorikk'],
                ].map(([Icon, label]) => (
                  <div key={label as string} className="flex items-center gap-3 border border-white/14 bg-white/6 p-4">
                    <Icon size={22} className="text-[#bfdc71]" />
                    <span className="font-semibold">{label as string}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="sporbarhet" className="mx-auto grid max-w-7xl gap-8 px-5 py-20 md:grid-cols-[0.95fr_1.05fr] md:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#7a8e24]">Webside + app</p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Slik snakker donaanna.com og Olivia sammen.</h2>
            <p className="mt-5 text-lg leading-8 text-[#575849]">
              Nettsiden ligger nå som offentlig front i React-appen. Når Supabase er konfigurert, kan den hente nøkkeltall fra Olivia og vise dem som offentlig tillit: siste høst, aktive batcher og kommende arbeid.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onLogin} className="inline-flex h-12 items-center gap-2 bg-[#171812] px-5 font-semibold text-white">
                Åpne Olivia OS <ArrowRight size={18} />
              </button>
              <a href="#kontakt" className="inline-flex h-12 items-center gap-2 border border-[#cbbd90] px-5 font-semibold">
                B2B og kontakt
              </a>
            </div>
          </div>
          <div className="border border-[#d8caa2] bg-[#fffdf5] p-5">
            <div className="flex items-center justify-between border-b border-[#ded2ac] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9f7b20]">Live estate signal</p>
                <h3 className="mt-1 text-2xl font-semibold">Doña Anna Trace</h3>
              </div>
              <QrCode className="text-[#171812]" />
            </div>
            <div className="grid gap-3 py-5 sm:grid-cols-2">
              {[
                [LineChart, 'Parseller i Olivia', formatNumber(signal.parcelCount)],
                [BadgeCheck, 'Siste høst', signal.latestHarvestDate || 'Kommer'],
                [Bot, 'Neste gårdsoppgave', signal.nextTask || 'Kommer'],
                [ShieldCheck, 'Datakilde', signal.isLive ? 'Supabase live' : 'Demo/fallback'],
              ].map(([Icon, label, value]) => (
                <div key={label as string} className="border border-[#e5d9b4] bg-white p-4">
                  <Icon size={20} className="text-[#7a8e24]" />
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-[#9f7b20]">{label as string}</p>
                  <p className="mt-2 font-semibold">{value as string}</p>
                </div>
              ))}
            </div>
            <p className="border-t border-[#ded2ac] pt-4 text-sm leading-6 text-[#626350]">
              Neste steg er å la hver flaske få QR-kode til en offentlig batch-side: parsell, sort, høstedato, pressevindu, sensorisk profil og analyseverdier.
            </p>
          </div>
        </section>

        <section className="bg-[#efe7cf] py-20">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#7a8e24]">Kunnskapssenter</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Informasjon fra den gamle siden, pakket mer redaksjonelt.</h2>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {knowledge.map(item => (
                <article key={item.title} className="border border-[#d0c094] bg-[#fbf8ef]">
                  <img src={item.image} alt={item.title} className="h-60 w-full object-cover" />
                  <div className="p-5">
                    <BookOpen size={20} className="text-[#9f7b20]" />
                    <h3 className="mt-4 text-2xl font-semibold">{item.title}</h3>
                    <p className="mt-3 leading-7 text-[#575849]">{item.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="etiketter" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#7a8e24]">Navn og etiketter</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Tre kommersielle retninger, ikke bare tre pene flasker.</h2>
              <p className="mt-5 text-lg leading-8 text-[#575849]">
                For 2026 bør etikettene føles som vin, vitenskap og landbruk på samme tid: tydelig opprinnelse, nummerering, QR-sporbarhet og stor nok ro til å virke dyr.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {labelConcepts.map((concept, index) => (
                <article key={concept.name} className="border border-[#d8caa2] bg-white p-4">
                  <div className={`mx-auto flex h-72 max-w-[170px] flex-col justify-between border p-5 text-center ${index === 0 ? 'border-[#a9c23a] bg-[#172015] text-[#f2df91]' : index === 1 ? 'border-[#7d1f2c] bg-[#f7f0df] text-[#371519]' : 'border-[#e0b43d] bg-[#ffe49a] text-[#171812]'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em]">Doña Anna</p>
                    <div>
                      <p className="text-3xl font-semibold leading-none">{concept.name.split(' ')[0]}</p>
                      <p className="mt-2 text-sm font-semibold">{concept.name.replace(concept.name.split(' ')[0], '').trim()}</p>
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.2em]">Biar · Alicante · EVOO</p>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold">{concept.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#575849]">{concept.strategy}</p>
                  <p className="mt-3 text-sm"><strong>Palett:</strong> {concept.palette}</p>
                  <p className="mt-1 text-sm"><strong>Flaske:</strong> {concept.bottle}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="kontakt" className="bg-[#171812] px-5 py-20 text-white md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#f2df91]">B2B, presse og besøk</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">Premium olje fra Alicante, med driftssystemet synlig bak kvaliteten.</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/74">
                Kontakt Doña Anna for forhandlerdialog, lansering, gårdsbesøk eller samarbeid. Kundeportal, B2B og batchsporing kan kobles videre mot Olivia når dere er klare.
              </p>
            </div>
            <form className="border border-white/14 bg-white/6 p-5" onSubmit={(event) => event.preventDefault()}>
              <label className="block text-sm font-semibold text-white/78">Navn</label>
              <input className="mt-2 h-12 w-full border border-white/14 bg-black/20 px-3 outline-none focus:border-[#f2df91]" />
              <label className="mt-4 block text-sm font-semibold text-white/78">E-post</label>
              <input type="email" className="mt-2 h-12 w-full border border-white/14 bg-black/20 px-3 outline-none focus:border-[#f2df91]" />
              <label className="mt-4 block text-sm font-semibold text-white/78">Melding</label>
              <textarea className="mt-2 h-28 w-full border border-white/14 bg-black/20 p-3 outline-none focus:border-[#f2df91]" />
              <button className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-[#f2df91] px-5 font-semibold text-[#171812]">
                Send forespørsel <ArrowRight size={18} />
              </button>
              <p className="mt-4 text-sm text-white/58">info@donaanna.com · Biar, Alicante · donaanna.com</p>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#ded2ac] bg-[#fbf8ef] px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold">Doña Anna · Premium økologisk olivenolje fra Biar</p>
          <div className="flex gap-4 text-sm text-[#575849]">
            <button onClick={onLogin}>Olivia OS</button>
            <a href="https://b2b.donaanna.com">B2B Portal</a>
            <a href="mailto:info@donaanna.com">Kontakt</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
