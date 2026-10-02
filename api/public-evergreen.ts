import type { IncomingMessage, ServerResponse } from 'http';

const SITE = 'https://www.donaanna.com';
const FREDDY = 'https://www.freddybremseth.com/#person';
const ANNA = SITE + '/#anna-bremseth';
const ORG = SITE + '/#organization';

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
  guider: {
    slug: 'guider',
    title: 'Guider om olivenolje fra Biar | Doña Anna',
    description: 'Doña Anna-guider om olivenolje fra Biar, tidlig høsting, Verde Vivo, restaurantbruk og planene for bordoliven.',
    eyebrow: 'Guidehub · olivenolje fra Biar',
    h1: 'Guider om olivenolje fra Biar',
    answer: 'Her samler Doña Anna evergreen-guider som svarer på konkrete spørsmål om gården i Biar, tidlig høsting, Verde Vivo og bruk i restaurant og faghandel.',
    sections: [
      {
        heading: 'Hvor bør du starte?',
        body: [
          'Vil du forstå opprinnelsen, start med guiden om olivenolje fra Biar. Vil du forstå produktretningen, start med tidlig høstet olivenolje og Verde Vivo.',
          'For restaurant, hotell, butikk og import finnes en egen guide som skiller tydelig mellom det som er definert nå og opplysninger som først publiseres når batchen er klar.'
        ]
      },
      {
        heading: 'Hva er forskjellen på guider og magasin?',
        body: [
          'Guidene er evergreen-innhold bygget rundt konkrete spørsmål og søkeintensjoner. Magasinet brukes til gårdsliv, nyheter, høsting, markeder og redaksjonelle oppdateringer.',
          'Begge deler skal lede naturlig videre til produkt, opprinnelse eller kontakt – uten å blande informasjon og salgsbudskap unødvendig.'
        ]
      }
    ],
    faqs: [
      { question: 'Hva finner jeg i Doña Anna-guidene?', answer: 'Evergreen-svar om Biar, tidlig høsting, Verde Vivo, restaurantbruk og planene for bordoliven.' },
      { question: 'Er guidene det samme som magasinet?', answer: 'Nei. Guidene dekker stabile søkeintensjoner, mens magasinet brukes til redaksjonelle og tidsaktuelle saker.' }
    ],
    primaryCta: { label: 'Start med olivenolje fra Biar', href: '/olivenolje-fra-biar' }
  },
  'olivenolje-fra-biar': {
    slug: 'olivenolje-fra-biar',
    title: 'Olivenolje fra Biar, Alicante | Doña Anna',
    description: 'Lær hvordan Doña Anna knytter Verde Vivo til gården i Biar: olivensorter, tidlig høsting, dokumentasjon og sporbarhet batch for batch.',
    eyebrow: 'Opprinnelse · Biar, Alicante',
    h1: 'Olivenolje fra Biar: opprinnelse, sorter og sporbarhet',
    answer: 'Doña Anna er et olivenprosjekt fra Biar i Alicante. Verde Vivo 500 ml er første produkt, og batchdata publiseres når produksjonen er gjennomført og dokumentert.',
    sections: [
      {
        heading: 'Hvorfor er Biar viktig for Doña Anna?',
        body: [
          'Biar er utgangspunktet for hele prosjektet. Gården er rundt 60 000 m² og har om lag 1 500 oliventrær.',
          'Opprinnelsen brukes ikke som en løs markedsføringspåstand. Målet er å knytte stedet til konkrete opplysninger om gård, sorter, høsting og den faktiske batchen.'
        ]
      },
      {
        heading: 'Hvilke olivensorter finnes på gården?',
        body: [
          'På gården finnes blant annet Genovesa, Gordal, Changlot Real og Picual.',
          'Hvilke sorter som inngår i en konkret produksjon skal beskrives når batchinformasjonen er klar, i stedet for å love en bestemt smaksprofil på forhånd.'
        ]
      },
      {
        heading: 'Hvordan dokumenteres Verde Vivo?',
        body: [
          'Doña Anna skal knytte høstedato, relevante produksjonsopplysninger, analyseverdier og sensoriske notater til den konkrete batchen når dokumentasjonen foreligger.',
          'Pris, tilgjengelighet og analyseverdier publiseres derfor ikke som generelle løfter før de faktisk finnes.'
        ]
      }
    ],
    faqs: [
      { question: 'Hvor ligger Doña Anna?', answer: 'Doña Anna ligger i Biar i Alicante, Spania.' },
      { question: 'Hvilke sorter finnes på gården?', answer: 'Blant sortene er Genovesa, Gordal, Changlot Real og Picual.' },
      { question: 'Er Verde Vivo sporbar?', answer: 'Målet er batchbasert sporbarhet med produksjons- og analyseopplysninger når den konkrete batchen er klar.' }
    ],
    primaryCta: { label: 'Se Verde Vivo', href: '/#portfolio' }
  },
  'tidlig-hostet-olivenolje': {
    slug: 'tidlig-hostet-olivenolje',
    title: 'Tidlig høstet olivenolje | Doña Anna Verde Vivo',
    description: 'Hva betyr tidlig høstet extra virgin olivenolje? Les hvordan Doña Anna bruker cosecha temprana som retning for Verde Vivo og dokumenterer batchen.',
    eyebrow: 'Cosecha temprana · Verde Vivo',
    h1: 'Tidlig høstet olivenolje: hva betyr det for Verde Vivo?',
    answer: 'Tidlig høstet olivenolje lages av oliven som høstes tidligere i modningen. Verde Vivo er Doña Annas 500 ml produkt bygget rundt denne retningen.',
    sections: [
      {
        heading: 'Hva betyr tidlig høsting?',
        body: [
          'Tidlig høsting betyr at oliven tas inn tidligere i modningen enn ved en sen høsting. Det påvirker utbytte og kan påvirke den sensoriske profilen.',
          'Doña Anna bruker cosecha temprana som en definert del av Verde Vivo. Den faktiske smaksprofilen beskrives etter produksjon og sensorisk vurdering.'
        ]
      },
      {
        heading: 'Hva med polyfenoler og analyseverdier?',
        body: [
          'Polyfenoler er relevante i vurderingen av olivenolje, men Doña Anna publiserer ikke et generelt tall før den konkrete batchen er analysert.',
          'Når analyser foreligger, skal tallene knyttes til batchen og datoen de gjelder.'
        ]
      },
      {
        heading: 'Hvordan unngår Doña Anna generiske kvalitetsløfter?',
        body: [
          'Nettstedet skiller mellom det som er besluttet om produktet og det som først kan dokumenteres etter høsting og produksjon.',
          'Det betyr at analyse, sensorikk, pris og tilgjengelighet oppdateres når dataene faktisk finnes.'
        ]
      }
    ],
    faqs: [
      { question: 'Hva er tidlig høstet olivenolje?', answer: 'Det er olje laget av oliven som høstes tidligere i modningen.' },
      { question: 'Er Verde Vivo tidlig høstet?', answer: 'Ja. Verde Vivo er utviklet som cosecha temprana / tidlig høstet extra virgin olivenolje.' },
      { question: 'Er polyfenoltall publisert nå?', answer: 'Doña Anna publiserer analyseverdier når den konkrete batchen er analysert og dokumentert.' }
    ],
    primaryCta: { label: 'Se Verde Vivo', href: '/#portfolio' }
  },
  'olivenolje-for-restauranter': {
    slug: 'olivenolje-for-restauranter',
    title: 'Olivenolje for restauranter | Doña Anna Verde Vivo',
    description: 'For restaurant, hotell og faghandel: meld interesse for Doña Anna Verde Vivo 500 ml og få batchdata, produktark, pris og levering når produksjonen er klar.',
    eyebrow: 'Restaurant · hotell · faghandel',
    h1: 'Olivenolje for restauranter: Verde Vivo og dokumentert batchinformasjon',
    answer: 'Restauranter, hoteller, butikker og distributører kan melde interesse for Verde Vivo 500 ml. Batchdata, produktark, pris og levering bekreftes når produksjonen er klar.',
    sections: [
      {
        heading: 'Hvilket produkt tilbyr Doña Anna nå?',
        body: [
          'Verde Vivo 500 ml er produktet Doña Anna kommuniserer offentlig nå.',
          'Større kjøkkenformat, flere oljer eller bordoliven markedsføres ikke som tilgjengelige før de faktisk er besluttet og produsert.'
        ]
      },
      {
        heading: 'Hva får innkjøperen av dokumentasjon?',
        body: [
          'Når batchen er klar, er målet å samle relevante opplysninger om produkt, høstedato, produksjon, analyser, sensorikk og tilgjengelighet.',
          'Det gjør det mulig å vurdere den faktiske oljen i stedet for en generell produktbeskrivelse.'
        ]
      },
      {
        heading: 'Hvordan starter en restaurant eller butikk?',
        body: [
          'Det enkleste første steget er å melde interesse via kontakten på forsiden. Forespørselen åpner e-post og lagres ikke i et offentlig nettskjema.',
          'Doña Anna følger opp når tilgjengelighet og neste steg kan bekreftes.'
        ]
      }
    ],
    faqs: [
      { question: 'Kan en restaurant melde interesse for smaksprøve?', answer: 'Ja. Doña Anna tar imot interesse og bekrefter smaksprøve når produksjonen og tilgjengeligheten er klar.' },
      { question: 'Hvilket format kommuniseres nå?', answer: 'Verde Vivo kommuniseres som 500 ml.' },
      { question: 'Finnes produktark og batchinformasjon?', answer: 'Produkt- og batchinformasjon publiseres når den faktiske produksjonen er dokumentert.' }
    ],
    primaryCta: { label: 'Meld interesse', href: '/#tasting' }
  },
  'bordoliven-fra-biar': {
    slug: 'bordoliven-fra-biar',
    title: 'Bordoliven fra Biar | Planer hos Doña Anna',
    description: 'Doña Anna vurderer bordoliven som et senere produktspor. Les hva som er planlagt, hvilke sorter som finnes på gården og hva som ikke er lansert ennå.',
    eyebrow: 'Bordoliven · planlagt produktspor',
    h1: 'Bordoliven fra Biar: et mulig senere steg for Doña Anna',
    answer: 'Doña Anna har ikke lansert bordoliven som et tilgjengelig produkt nå. Bordoliven er et mulig senere produktspor som skal utvikles og dokumenteres før salg.',
    sections: [
      {
        heading: 'Er bordoliven tilgjengelig nå?',
        body: [
          'Nei. Verde Vivo er produktet Doña Anna kommuniserer offentlig nå.',
          'Bordoliven kan bli aktuelt senere, men nettstedet skal ikke fremstille navn, pris, format eller tilgjengelighet som bestemt før dette faktisk er avklart.'
        ]
      },
      {
        heading: 'Hvilke sorter på gården kan være relevante?',
        body: [
          'Gården har blant annet Genovesa, Gordal, Changlot Real og Picual.',
          'Hvilken sort og metode som eventuelt brukes til bordoliven må beskrives ut fra den faktiske produksjonen.'
        ]
      },
      {
        heading: 'Hvordan vil et eventuelt bordolivenprodukt bli dokumentert?',
        body: [
          'Samme prinsipp skal gjelde som for oljen: tydelig opprinnelse, konkret produktinformasjon og ingen generiske løfter om data som ikke er ferdige.',
          'Når et produkt er klart, legges det inn i produktporteføljen og sitemap med korrekt informasjon.'
        ]
      }
    ],
    faqs: [
      { question: 'Selger Doña Anna bordoliven nå?', answer: 'Nei. Bordoliven er et mulig senere produktspor, ikke et tilgjengelig produkt nå.' },
      { question: 'Hvilke sorter finnes på gården?', answer: 'Blant sortene er Genovesa, Gordal, Changlot Real og Picual.' },
      { question: 'Når kommer bordoliven?', answer: 'Doña Anna publiserer først lanseringsinformasjon når produkt, produksjon og tilgjengelighet faktisk er avklart.' }
    ],
    primaryCta: { label: 'Se Verde Vivo i dag', href: '/#portfolio' }
  },
  'om-dona-anna': {
    slug: 'om-dona-anna',
    title: 'Om Doña Anna | Anna og Freddy Bremseth i Biar',
    description: 'Møt Anna og Freddy Bremseth og les hvordan Doña Anna bygges rundt olivengården i Biar, Verde Vivo og langsiktig merkevarearbeid.',
    eyebrow: 'Om prosjektet · menneskene · gården',
    h1: 'Om Doña Anna: Anna og Freddy Bremseth bygger prosjektet sammen',
    answer: 'Doña Anna er olivenprosjektet til Anna og Freddy Bremseth i Biar, Alicante. Gården, Verde Vivo og den langsiktige merkevaren utvikles sammen.',
    sections: [
      {
        heading: 'Hvem driver Doña Anna?',
        body: [
          'Anna Bremseth og Freddy Bremseth driver Doña Anna sammen.',
          'FreddyBremseth.com fungerer som Freddys person- og autoritetsside, mens DoñaAnna.com skal være tydelig avgrenset til gården, oliven, produkter og faginnhold.'
        ]
      },
      {
        heading: 'Hva er prosjektet bygget rundt?',
        body: [
          'Utgangspunktet er gården i Biar på rundt 60 000 m² med om lag 1 500 oliventrær.',
          'Verde Vivo 500 ml er det produktet som kommuniseres offentlig nå. Nye produkter legges til først når de er reelt besluttet og dokumentert.'
        ]
      },
      {
        heading: 'Hvordan skal Doña Anna bygge tillit?',
        body: [
          'Gjennom synlige personer, presis produktinformasjon, oppdaterte datoer, dokumenterte batchdata og tydelig skille mellom det som finnes nå og det som er planlagt.',
          'Krysslenker til andre prosjekter brukes bare der de hjelper leseren å forstå helheten.'
        ]
      }
    ],
    faqs: [
      { question: 'Hvem står bak Doña Anna?', answer: 'Anna Bremseth og Freddy Bremseth driver prosjektet sammen.' },
      { question: 'Hvor ligger gården?', answer: 'Gården ligger i Biar i Alicante, Spania.' },
      { question: 'Hva er hovedproduktet nå?', answer: 'Verde Vivo 500 ml er produktet Doña Anna kommuniserer offentlig nå.' }
    ],
    primaryCta: { label: 'Se Verde Vivo', href: '/#portfolio' }
  },
  personvern: {
    slug: 'personvern',
    title: 'Personvern og kontakt | Doña Anna',
    description: 'Slik fungerer kontakt og personopplysninger på DoñaAnna.com: smaksprøveforespørsler åpner e-post, og B2B-portalen er en separat innlogget tjeneste.',
    eyebrow: 'Personvern · kontakt',
    h1: 'Personvern og kontakt på DoñaAnna.com',
    answer: 'Den offentlige smaksprøveforespørselen på DoñaAnna.com åpner en e-post i brukerens eget e-postprogram. Opplysningene sendes ikke til et offentlig nettskjema på siden.',
    sections: [
      {
        heading: 'Hvordan sendes en forespørsel om smaksprøve?',
        body: [
          'Når du fyller ut den offentlige forespørselen og trykker send, åpnes en e-post til info@donaanna.com med opplysningene du har skrevet inn.',
          'Selve den offentlige nettsiden lagrer ikke disse feltene som en skjemainnsending.'
        ]
      },
      {
        heading: 'Hva med B2B-portalen?',
        body: [
          'B2B-portalen er en separat innlogget del av løsningen og er blokkert fra søkeindeksering.',
          'Opplysninger som eventuelt behandles etter innlogging hører til den innloggede tjenesten, ikke den åpne informasjonsdelen av nettstedet.'
        ]
      },
      {
        heading: 'Hvordan kontakter du Doña Anna?',
        body: [
          'Du kan kontakte Doña Anna på info@donaanna.com.',
          'Anna og Freddy Bremseth driver prosjektet sammen.'
        ]
      }
    ],
    faqs: [
      { question: 'Lagrer smaksprøveskjemaet data på den offentlige nettsiden?', answer: 'Nei. Forespørselen åpner en e-post i brukerens eget e-postprogram.' },
      { question: 'Er B2B-portalen offentlig indekserbar?', answer: 'Nei. Innloggede ruter er blokkert fra søkeindeksering.' },
      { question: 'Hva er kontaktadressen?', answer: 'Kontakt Doña Anna på info@donaanna.com.' }
    ],
    primaryCta: { label: 'Send e-post', href: 'mailto:info@donaanna.com' }
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
        author: { '@id': ORG },
        dateModified: '2026-10-02',
      },
      {
        '@type': ['Organization', 'Brand'],
        '@id': SITE + '/#organization',
        name: 'Doña Anna',
        url: SITE + '/',
        member: [{ '@id': ANNA }, { '@id': FREDDY }],
      },
      {
        '@type': 'Person',
        '@id': ANNA,
        name: 'Anna Bremseth',
        affiliation: { '@id': ORG },
      },
      {
        '@type': 'Person',
        '@id': FREDDY,
        name: 'Freddy Bremseth',
        url: 'https://www.freddybremseth.com/',
        affiliation: { '@id': ORG },
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
    '<header class="topbar"><a class="brand" href="/">DOÑA ANNA</a><nav class="topnav" aria-label="Hovedmeny"><a href="/guider">Guider</a><a href="/#portfolio">Verde Vivo</a><a href="/magasin">Magasin</a><a href="/om-dona-anna">Om oss</a><a href="/#tasting">Kontakt</a></nav></header>' +
    '<section class="hero"><div class="hero-inner"><p class="eyebrow">' + escapeHtml(page.eyebrow) + '</p><h1>' + escapeHtml(page.h1) + '</h1><p class="lead">' + escapeHtml(page.description) + '</p><div class="answer"><strong>Kort svar:</strong> ' + escapeHtml(page.answer) + '</div><div class="actions"><a class="button primary" href="' + escapeHtml(page.primaryCta.href) + '">' + escapeHtml(page.primaryCta.label) + '</a><a class="button secondary" href="/magasin">Les magasinet</a></div></div></section>' +
    '<main><div class="article-grid"><article>' + sections +
    '<section class="faq"><h2>Vanlige spørsmål</h2>' + faq + '</section>' +
    '<section class="next"><h2>Neste steg</h2><p>Se Verde Vivo, les mer om gården eller meld interesse dersom du vurderer Doña Anna for restaurant, hotell, butikk eller import.</p><a class="button primary" href="' + escapeHtml(page.primaryCta.href) + '">' + escapeHtml(page.primaryCta.label) + '</a><div class="cluster"><a href="/guider">Alle guider</a><a href="/olivenolje-fra-biar">Olivenolje fra Biar</a><a href="/tidlig-hostet-olivenolje">Tidlig høstet olivenolje</a><a href="/olivenolje-for-restauranter">For restauranter</a><a href="/bordoliven-fra-biar">Bordoliven – planlagt</a></div></section>' +
    '<p class="author">Oppdatert 2. oktober 2026 · Innhold fra Doña Anna. <a href="/om-dona-anna">Anna og Freddy Bremseth driver prosjektet sammen.</a></p></article>' +
    '<aside class="aside"><strong>Utforsk Doña Anna</strong><nav><a href="/">Forsiden</a><a href="/guider">Guider</a><a href="/#estate">Gården i Biar</a><a href="/#portfolio">Verde Vivo</a><a href="/#traceability">Sporbarhet</a><a href="/#b2b">For profesjonelle</a><a href="/om-dona-anna">Om Anna og Freddy</a><a href="/#tasting">Kontakt</a></nav></aside></div></main>' +
    '<footer class="footer"><a href="/om-dona-anna">Anna & Freddy</a><a href="/personvern">Personvern</a><a href="https://www.freddybremseth.com/">FreddyBremseth.com</a><a href="https://www.pinosoecolife.com/">Pinoso Eco Life</a></footer>' +
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
