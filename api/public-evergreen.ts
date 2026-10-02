import type { IncomingMessage, ServerResponse } from 'http';

const SITE = 'https://www.donaanna.com';
const FREDDY = 'https://www.freddybremseth.com/#person';

type EvergreenPage = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  answer: string;
  sections: Array<{ heading: string; body: string[] }>;
  faqs: Array<{ question: string; answer: string }>;
  primaryCta: { label: string; href: string };
};

const PAGES: Record<string, EvergreenPage> = {
  'olivenolje-fra-biar': {
    slug: 'olivenolje-fra-biar',
    title: 'Olivenolje fra Biar, Alicante | Doña Anna',
    description: 'Lær hva opprinnelsen i Biar betyr for Doña Anna: sorter, tidlig høsting, kald ekstraksjon, smak og sporbarhet fra gård til batch.',
    eyebrow: 'Opprinnelse · Biar, Alicante',
    h1: 'Olivenolje fra Biar: opprinnelse, sorter og smak',
    answer: 'Doña Anna kommer fra Biar i Alicante. Oljen bygges rundt tydelig opprinnelse, tidlig høsting, mekanisk kald ekstraksjon og dokumentasjon av sort, høstevindu og batch.',
    sections: [
      {
        heading: 'Hvorfor er Biar viktig for Doña Anna?',
        body: [
          'Biar er utgangspunktet for hele prosjektet. Gården ligger i Alicante-innlandet, og Doña Anna bruker stedet aktivt i historien om råvaren, sortene og hvordan oljen blir til.',
          'Poenget er ikke å gjøre geografi til et markedsføringsord. Opprinnelsen skal kunne kobles til konkret informasjon om sort, høsting, produksjon og den ferdige batchen.'
        ]
      },
      {
        heading: 'Hvilke olivensorter arbeider Doña Anna med?',
        body: [
          'Porteføljen arbeider med Genovesa, Gordal, Changlot Real og Picual. Sortene kan brukes forskjellig i olje, monovarietale smakinger og bordoliven.',
          'Små batcher gjør det mulig å vise hvordan sort og høstetidspunkt påvirker aroma, bitterhet, struktur og pepperfinish.'
        ]
      },
      {
        heading: 'Hvordan dokumenteres oljen?',
        body: [
          'Doña Anna samler informasjon om høstedato, parsell, sort, sensorisk profil og analyseverdier når en batch publiseres.',
          'Målet er at kokk, innkjøper eller matinteressert skal kunne forstå hva de smaker og hvor produktet kommer fra.'
        ]
      }
    ],
    faqs: [
      { question: 'Hvor ligger Doña Anna?', answer: 'Doña Anna ligger i Biar i Alicante, Spania.' },
      { question: 'Hvilke sorter brukes?', answer: 'Doña Anna arbeider med Genovesa, Gordal, Changlot Real og Picual.' },
      { question: 'Er oljen sporbar?', answer: 'Når batcher publiseres, knyttes informasjon om høstedato, parsell, sort, sensorisk profil og analyseverdier til batchen.' }
    ],
    primaryCta: { label: 'Se Doña Anna-porteføljen', href: '/#portfolio' }
  },
  'tidlig-hostet-olivenolje': {
    slug: 'tidlig-hostet-olivenolje',
    title: 'Tidlig høstet olivenolje | Doña Anna',
    description: 'Hva betyr tidlig høstet extra virgin olivenolje? Les om smak, bitterhet, pepperfinish, polyfenoler og Doña Annas to tidlige høsteuttrykk.',
    eyebrow: 'Cosecha temprana · kunnskap',
    h1: 'Tidlig høstet olivenolje: hva betyr det i praksis?',
    answer: 'Tidlig høstet olivenolje lages av oliven som høstes tidligere i modningen. Hos Doña Anna brukes tidlig høsting for å bygge grønn fruktighet, bitterhet, pepperfinish og tydelige sensoriske forskjeller mellom batcher.',
    sections: [
      {
        heading: 'Hvordan smaker tidlig høstet olivenolje?',
        body: [
          'Tidlig høsting forbindes hos Doña Anna med grønn fruktighet, tydelig bitterhet og pepperfølelse. Intensiteten varierer med sort, høstetidspunkt og den konkrete batchen.',
          'Verde Vivo er utviklet som det mest intense uttrykket, mens Verde Alto er rundere og mer anvendelig som premium bord- og kjøkkenolje.'
        ]
      },
      {
        heading: 'Hva har polyfenoler med smaken å gjøre?',
        body: [
          'Polyfenoler er blant stoffene som bidrar til bitterhet og pepperfølelse i olivenolje. Doña Anna måler nivået per premiumbatch og knytter resultatet til sporbar dokumentasjon.',
          'Tall skal derfor presenteres batch for batch, ikke som et generelt løfte for alle flasker.'
        ]
      },
      {
        heading: 'Hvordan behandles oliven etter høsting?',
        body: [
          'Doña Anna beskriver produksjonen som mekanisk kald ekstraksjon under 27 °C. Rask videre transport fra lund til mølle og tydelig batchregistrering er en del av arbeidsflyten.',
          'For profesjonelle kjøkken er dette relevant fordi smak, format og dokumentasjon skal kunne vurderes samlet.'
        ]
      }
    ],
    faqs: [
      { question: 'Hva er tidlig høstet olivenolje?', answer: 'Det er olje laget av oliven som høstes tidligere i modningen, før frukten er fullt moden.' },
      { question: 'Hvorfor smaker den mer bittert og pepperaktig?', answer: 'Hos Doña Anna henger den tydelige bitterheten og pepperfølelsen sammen med tidlig høsting, sort og den konkrete batchens sensoriske profil.' },
      { question: 'Er alle batcher like?', answer: 'Nei. Doña Anna beskriver og analyserer premiumbatcher separat fordi sort, høstetidspunkt og produksjon påvirker resultatet.' }
    ],
    primaryCta: { label: 'Se Verde Vivo og Verde Alto', href: '/#portfolio' }
  },
  'olivenolje-for-restauranter': {
    slug: 'olivenolje-for-restauranter',
    title: 'Olivenolje for restauranter | Doña Anna Biar',
    description: 'Doña Anna for restaurant, hotell og faghandel: finisholjer, større kjøkkenformat, bordoliven, produktark, sporbarhet og smaksprøve.',
    eyebrow: 'Restaurant · hotell · faghandel',
    h1: 'Olivenolje for restauranter: smak, format og dokumentasjon',
    answer: 'Doña Anna tilbyr en B2B-rettet portefølje med 500 ml finisholjer, større kjøkkenformat, bordoliven og produktinformasjon. Restauranter og innkjøpere kan be om smaksprøve før videre dialog.',
    sections: [
      {
        heading: 'Hvilke formater er relevante for profesjonelle kjøkken?',
        body: [
          'Verde Vivo og Verde Alto er utviklet som finisholjer til bord og tallerken. Cocina Viva er et større 2 L / 5 L-format for mise en place, varme retter og daglig service.',
          'Mesa er bordoliven for aperitivo, bar, restaurant og spesialbutikk.'
        ]
      },
      {
        heading: 'Hva får innkjøperen av dokumentasjon?',
        body: [
          'Doña Anna samler produktark, smaksnotater, format, høstedato, sort, batchnummer og analyseverdier når batchen publiseres.',
          'Det gjør det enklere å vurdere produktet i kjøkkenet, sammenligne batcher og forklare opprinnelsen til gjesten.'
        ]
      },
      {
        heading: 'Hvordan starter en restaurant?',
        body: [
          'Det enkleste første steget er å be om smaksprøve. Forespørselen kan inneholde restaurant eller virksomhet, rolle, e-post og leveringsadresse.',
          'Doña Anna svarer med tilgjengelighet, pris, format og levering for det som faktisk er tilgjengelig.'
        ]
      }
    ],
    faqs: [
      { question: 'Kan en restaurant be om smaksprøve?', answer: 'Ja. Restauranter, hoteller, butikker og distributører kan sende en forespørsel om smaksprøve.' },
      { question: 'Finnes større kjøkkenformat?', answer: 'Ja. Cocina Viva er beskrevet i 2 L / 5 L-format for profesjonelle kjøkken.' },
      { question: 'Finnes produktark og batchinformasjon?', answer: 'Doña Anna samler produktark og batchinformasjon med blant annet format, høstedato, sort, sensorikk og analyseverdier når batchen publiseres.' }
    ],
    primaryCta: { label: 'Be om smaksprøve', href: '/#tasting' }
  },
  'bordoliven-fra-biar': {
    slug: 'bordoliven-fra-biar',
    title: 'Bordoliven fra Biar | Doña Anna Mesa',
    description: 'Les om Doña Anna Mesa: bordoliven fra Biar for aperitivo, bar, restaurant, marked og spesialbutikk, med fokus på råvare og opprinnelse.',
    eyebrow: 'Mesa · aceitunas de mesa',
    h1: 'Bordoliven fra Biar: Doña Anna Mesa',
    answer: 'Doña Anna Mesa er bordoliven fra prosjektet i Biar. Produktet er utviklet som en mer uformell inngang til Doña Anna for aperitivo, bar, restaurant, marked og spesialbutikk.',
    sections: [
      {
        heading: 'Hvor passer bordoliven inn i Doña Anna-porteføljen?',
        body: [
          'Mesa står ved siden av premiumoljene og gir en annen måte å møte råvaren på. Fokus er fortsatt på opprinnelse, tekstur og en tydelig kobling tilbake til gården.',
          'For serveringssteder kan bordoliven brukes til aperitivo og småservering, mens butikker og markeder kan bruke produktet som en enkel introduksjon til merkevaren.'
        ]
      },
      {
        heading: 'Hvilke sorter finnes på gården?',
        body: [
          'Doña Anna arbeider med Genovesa, Gordal, Changlot Real og Picual. Hvilken sort som brukes i en konkret bordolivenbatch skal knyttes til den publiserte batchinformasjonen.',
          'Dette gjør det mulig å forklare råvaren mer presist enn med en generell kategori som bare sier grønne eller svarte oliven.'
        ]
      },
      {
        heading: 'Hvordan får profesjonelle kjøpere mer informasjon?',
        body: [
          'Restauranter, barer, gourmetbutikker og distributører kan be om produktark og smaksprøve.',
          'Tilgjengelighet, pris og levering bekreftes for den konkrete produksjonen.'
        ]
      }
    ],
    faqs: [
      { question: 'Hva er Doña Anna Mesa?', answer: 'Mesa er Doña Annas bordoliven for aperitivo, bar, restaurant, marked og spesialbutikk.' },
      { question: 'Kommer bordoliven fra Biar?', answer: 'Doña Anna er et olivenprosjekt i Biar i Alicante, og Mesa er bordolivenproduktet i porteføljen.' },
      { question: 'Kan butikker og restauranter be om produktark?', answer: 'Ja. Profesjonelle kjøpere kan be om produktark og smaksprøve, med tilgjengelighet og levering bekreftet for aktuell produksjon.' }
    ],
    primaryCta: { label: 'Se produkter og be om prøve', href: '/#tasting' }
  }
};

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
}

function pageHtml(page: EvergreenPage) {
  const canonical = SITE + '/' + page.slug;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': canonical + '#page',
        url: canonical,
        name: page.title,
        description: page.description,
        inLanguage: 'nb-NO',
        isPartOf: { '@id': SITE + '/#website' },
        about: { '@id': SITE + '/#organization' },
        author: { '@id': FREDDY },
        dateModified: '2026-10-02',
      },
      {
        '@type': ['Organization', 'Brand'],
        '@id': SITE + '/#organization',
        name: 'Doña Anna',
        url: SITE + '/',
        founder: { '@id': FREDDY },
      },
      {
        '@type': 'Person',
        '@id': FREDDY,
        name: 'Freddy Bremseth',
        url: 'https://www.freddybremseth.com/',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Doña Anna', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: page.h1, item: canonical },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faqs.map(item => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  const sections = page.sections.map(section =>
    '<section class="article-section"><h2>' + escapeHtml(section.heading) + '</h2>' +
    section.body.map(paragraph => '<p>' + escapeHtml(paragraph) + '</p>').join('') + '</section>'
  ).join('');

  const faq = page.faqs.map(item =>
    '<details><summary>' + escapeHtml(item.question) + '</summary><p>' + escapeHtml(item.answer) + '</p></details>'
  ).join('');

  const css = `
    :root{--ink:#0d0d0d;--paper:#f4efe3;--gold:#9a741d;--gold2:#d4af37;--line:rgba(30,24,15,.14);--muted:#6b6255}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:#191713;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7}
    a{color:inherit}.topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px clamp(20px,5vw,72px);border-bottom:1px solid rgba(255,255,255,.1);background:rgba(13,13,13,.94);color:#fff;backdrop-filter:blur(16px)}
    .brand{font:600 14px Georgia,serif;letter-spacing:.2em;text-decoration:none}.topnav{display:flex;flex-wrap:wrap;gap:18px;font-size:12px;text-transform:uppercase;letter-spacing:.12em}.topnav a{color:#d8d0c1;text-decoration:none}.topnav a:hover{color:#fff}
    .hero{background:radial-gradient(circle at 78% 20%,rgba(212,175,55,.18),transparent 28rem),var(--ink);color:#fff;padding:clamp(64px,9vw,128px) clamp(20px,7vw,96px)}
    .hero-inner{max-width:1120px;margin:auto}.eyebrow{color:var(--gold2);font-size:12px;font-weight:800;letter-spacing:.24em;text-transform:uppercase}.hero h1{max-width:900px;margin:18px 0 0;font:600 clamp(44px,7vw,84px)/.98 Georgia,serif;letter-spacing:-.035em}.lead{max-width:780px;margin:28px 0 0;color:#d7d0c4;font-size:clamp(18px,2.1vw,24px)}
    .answer{max-width:900px;margin:34px 0 0;padding:22px 24px;border:1px solid rgba(212,175,55,.35);background:rgba(255,255,255,.045);font-size:17px}.actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.button{display:inline-flex;min-height:48px;align-items:center;padding:0 20px;text-decoration:none;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.14em}.primary{background:var(--gold2);color:#111}.secondary{border:1px solid rgba(255,255,255,.2);color:#fff}
    main{max-width:1120px;margin:auto;padding:clamp(52px,7vw,88px) clamp(20px,5vw,54px)}.article-grid{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:clamp(36px,7vw,86px);align-items:start}.article-section{padding:0 0 46px;border-bottom:1px solid var(--line);margin-bottom:46px}.article-section h2,.faq h2,.next h2{font:600 clamp(30px,4vw,48px)/1.08 Georgia,serif;margin:0 0 18px}.article-section p{font-size:17px;color:#4f493f}.aside{position:sticky;top:92px;border:1px solid var(--line);background:#fff;padding:24px}.aside strong{display:block;font:600 24px Georgia,serif}.aside nav{display:grid;gap:12px;margin-top:18px}.aside a{color:#705515;text-underline-offset:3px}
    .faq{padding:20px 0 58px}.faq details{border-top:1px solid var(--line);padding:18px 0}.faq details:last-child{border-bottom:1px solid var(--line)}.faq summary{cursor:pointer;font-weight:800}.faq details p{color:#554e43}
    .next{margin-top:16px;padding:34px;background:#15120e;color:#fff}.next p{color:#cfc6b6;max-width:720px}.next .button{margin-top:10px}.cluster{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:26px}.cluster a{color:#d4af37}
    .author{margin-top:46px;padding-top:24px;border-top:1px solid var(--line);color:#655d51;font-size:14px}.footer{padding:30px clamp(20px,5vw,72px);background:#0d0d0d;color:#8f8678;font-size:12px}.footer a{color:#c8b477;margin-right:14px;white-space:nowrap}
    @media(max-width:820px){.topnav{display:none}.article-grid{grid-template-columns:1fr}.aside{position:static}.hero{padding-top:74px}.hero h1{font-size:clamp(40px,13vw,62px)}}
    @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
  `;

  return '<!doctype html><html lang="no"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escapeHtml(page.title) + '</title>' +
    '<meta name="description" content="' + escapeHtml(page.description) + '">' +
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">' +
    '<meta property="og:type" content="website"><meta property="og:site_name" content="Doña Anna">' +
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">' +
    '<meta property="og:title" content="' + escapeHtml(page.title) + '">' +
    '<meta property="og:description" content="' + escapeHtml(page.description) + '">' +
    '<script type="application/ld+json">' + JSON.stringify(schema).replace(/</g, '\\u003c') + '</script>' +
    '<style>' + css + '</style></head><body>' +
    '<header class="topbar"><a class="brand" href="/">DOÑA ANNA</a><nav class="topnav" aria-label="Hovedmeny"><a href="/#portfolio">Produkter</a><a href="/magasin">Magasin</a><a href="/artikler">Artikler</a><a href="/oppskrifter">Oppskrifter</a><a href="/#tasting">Smaksprøve</a></nav></header>' +
    '<section class="hero"><div class="hero-inner"><p class="eyebrow">' + escapeHtml(page.eyebrow) + '</p><h1>' + escapeHtml(page.h1) + '</h1><p class="lead">' + escapeHtml(page.description) + '</p><div class="answer"><strong>Kort svar:</strong> ' + escapeHtml(page.answer) + '</div><div class="actions"><a class="button primary" href="' + escapeHtml(page.primaryCta.href) + '">' + escapeHtml(page.primaryCta.label) + '</a><a class="button secondary" href="/magasin">Les magasinet</a></div></div></section>' +
    '<main><div class="article-grid"><article>' + sections +
    '<section class="faq"><h2>Vanlige spørsmål</h2>' + faq + '</section>' +
    '<section class="next"><h2>Neste steg</h2><p>Se produktporteføljen, les mer om gården eller be om smaksprøve dersom du vurderer Doña Anna for restaurant, hotell, butikk eller import.</p><a class="button primary" href="' + escapeHtml(page.primaryCta.href) + '">' + escapeHtml(page.primaryCta.label) + '</a><div class="cluster"><a href="/olivenolje-fra-biar">Olivenolje fra Biar</a><a href="/tidlig-hostet-olivenolje">Tidlig høstet olivenolje</a><a href="/olivenolje-for-restauranter">For restauranter</a><a href="/bordoliven-fra-biar">Bordoliven fra Biar</a></div></section>' +
    '<p class="author">Oppdatert 2. oktober 2026 · Innhold fra Doña Anna. <a href="https://www.freddybremseth.com/">Freddy Bremseth</a> står bak prosjektet.</p></article>' +
    '<aside class="aside"><strong>Utforsk Doña Anna</strong><nav><a href="/">Forsiden</a><a href="/#estate">Gården i Biar</a><a href="/#portfolio">Produkter</a><a href="/#traceability">Sporbarhet</a><a href="/#b2b">For profesjonelle</a><a href="/#tasting">Be om smaksprøve</a></nav></aside></div></main>' +
    '<footer class="footer"><a href="https://www.freddybremseth.com/">FreddyBremseth.com</a><a href="https://www.zenecohomes.com/">Zen Eco Homes</a><a href="https://www.pinosoecolife.com/">Pinoso Eco Life</a><a href="https://www.chatgenius.pro/">ChatGenius</a><a href="https://books.freddybremseth.com/">Books</a></footer>' +
    '</body></html>';
}

export default function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
) {
  const slug = typeof req.query?.page === 'string' ? req.query.page : '';
  const page = PAGES[slug];
  if (!page) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Siden finnes ikke');
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  });
  res.end(pageHtml(page));
}
