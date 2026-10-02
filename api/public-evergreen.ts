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
    title: 'Guider om olivenolje fra Biar og Alicante | Doña Anna',
    description: 'Doña Anna-guider om olivenolje fra Biar, tidlig høsting, Verde Vivo, restaurantbruk, sporbarhet og planene for bordoliven.',
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
    title: 'Olivenolje fra Biar i Alicante, Spania | Doña Anna',
    description: 'Verde Vivo knyttes til gården i Biar gjennom olivensorter, tidlig høsting, dokumentasjon og sporbarhet for den konkrete batchen.',
    eyebrow: 'Opprinnelse · Biar, Alicante',
    h1: 'Olivenolje fra Biar: opprinnelse, sorter og sporbarhet',
    answer: 'Doña Anna er et olivenprosjekt fra Biar i Alicante med flere separate produkter. Verde Vivo, Verde Alto, Raíz Antigua og Cocina Viva er egne olivenoljeprodukter, mens Mesa · Gordal Noble er et planlagt bordolivenprodukt.',
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
        heading: 'Hvordan dokumenteres de ulike produktene?',
        body: [
          'Doña Anna skal knytte høstedato, relevante produksjonsopplysninger, analyseverdier og sensoriske notater til riktig produkt og konkret batch når dokumentasjonen foreligger.',
          'Pris, tilgjengelighet og analyseverdier publiseres derfor ikke som generelle løfter før de faktisk finnes.'
        ]
      }
    ],
    faqs: [
      { question: 'Hvor ligger Doña Anna?', answer: 'Doña Anna ligger i Biar i Alicante, Spania.' },
      { question: 'Hvilke sorter finnes på gården?', answer: 'Blant sortene er Genovesa, Gordal, Changlot Real og Picual.' },
      { question: 'Blir produktene sporbare?', answer: 'Målet er produkt- og batchbasert sporbarhet med produksjons- og analyseopplysninger når den konkrete batchen er klar.' }
    ],
    primaryCta: { label: 'Se produktene', href: '/produkter' }
  },
  'tidlig-hostet-olivenolje': {
    slug: 'tidlig-hostet-olivenolje',
    title: 'Tidlig høstet olivenolje fra Biar, Alicante | Doña Anna',
    description: 'Hva betyr tidlig høstet olivenolje, og hva kreves for extra virgin-kvalitet? Les om Verde Vivo, cosecha temprana og batchdokumentasjon.',
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
      { question: 'Er Verde Vivo tidlig høstet?', answer: 'Ja. Verde Vivo er utviklet som cosecha temprana / tidlig høstet olivenolje med mål om extra virgin-kvalitet. Endelig kvalitetsklasse bekreftes først etter analyse og sensorisk vurdering.' },
      { question: 'Er polyfenoltall publisert nå?', answer: 'Doña Anna publiserer analyseverdier når den konkrete batchen er analysert og dokumentert.' }
    ],
    primaryCta: { label: 'Se produktlinjen', href: '/produkter' }
  },
  'olivenolje-for-restauranter': {
    slug: 'olivenolje-for-restauranter',
    title: 'Olivenolje for restauranter | Doña Anna Verde Vivo',
    description: 'For restaurant, hotell og faghandel: meld interesse for Doña Anna Verde Vivo 500 ml og få batchdata, produktark, pris og levering når produksjonen er klar.',
    eyebrow: 'Restaurant · hotell · faghandel',
    h1: 'Olivenolje for restauranter: Verde Vivo og dokumentert batchinformasjon',
    answer: 'Restauranter, hoteller, butikker og distributører kan melde interesse for Doña Annas ulike produkter. Produktark, batchdata, pris og levering bekreftes per produkt når produksjonen er klar.',
    sections: [
      {
        heading: 'Hvilket produkt tilbyr Doña Anna nå?',
        body: [
          'Verde Vivo, Verde Alto, Raíz Antigua og Cocina Viva er separate olivenoljeprodukter. Tilgjengelighet og kommersielle data bekreftes per produkt.',
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
      { question: 'Har alle produktene samme format?', answer: 'Nei. Format skal oppgis separat for hvert produkt når emballasje og produksjon er bekreftet.' },
      { question: 'Finnes produktark og batchinformasjon?', answer: 'Produkt- og batchinformasjon publiseres når den faktiske produksjonen er dokumentert.' }
    ],
    primaryCta: { label: 'Meld interesse', href: '/#tasting' }
  },
  'bordoliven-fra-biar': {
    slug: 'bordoliven-fra-biar',
    title: 'Bordoliven fra Biar i Alicante | Planer hos Doña Anna',
    description: 'Doña Anna vurderer bordoliven som et senere produktspor. Les hva som er planlagt, hvilke sorter som finnes på gården og hva som ikke er lansert ennå.',
    eyebrow: 'Bordoliven · planlagt produktspor',
    h1: 'Bordoliven fra Biar: et mulig senere steg for Doña Anna',
    answer: 'Doña Anna har ikke lansert bordoliven som et tilgjengelig produkt nå. Bordoliven er et mulig senere produktspor som skal utvikles og dokumenteres før salg.',
    sections: [
      {
        heading: 'Er bordoliven tilgjengelig nå?',
        body: [
          'Nei. Mesa · Gordal Noble står som planlagt bordolivenprodukt og markedsføres ikke som tilgjengelig nå.',
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
  'verde-vivo': {
    slug: 'verde-vivo',
    title: 'Verde Vivo 500 ml | Olivenolje fra Biar | Doña Anna',
    description: 'Verde Vivo er Doña Annas 500 ml tidlig høstede olivenolje fra Biar, utviklet med mål om extra virgin-kvalitet. Batchdata publiseres når de er klare.',
    eyebrow: 'Verde Vivo · 500 ml · Biar',
    h1: 'Verde Vivo 500 ml – Doña Anna olivenolje fra Biar',
    answer: 'Verde Vivo er Doña Annas første produkt: en 500 ml tidlig høstet olivenolje utviklet med mål om extra virgin-kvalitet og tydelig opprinnelse i Biar. Endelig kvalitetsklasse, batchdata, analyse og tilgjengelighet publiseres når produksjonen er dokumentert.',
    sections: [
      {
        heading: 'Hva er Verde Vivo?',
        body: [
          'Verde Vivo er produktet Doña Anna bygger merkevaren rundt nå. Formatet som kommuniseres offentlig er 500 ml.',
          'Flasken skal bruke Doña Annas godkjente etikett med den stiliserte Doña Anna-figuren. Nettstedet bruker ikke genererte flaskebilder dersom etiketten ikke kan gjengis korrekt.'
        ]
      },
      {
        heading: 'Hva vet vi om produktet før batchen er klar?',
        body: [
          'Produktretningen er cosecha temprana / tidlig høstet olivenolje fra Biar, utviklet med mål om extra virgin-kvalitet. Endelig kvalitetsklasse bekreftes først når den konkrete batchen er analysert og sensorisk vurdert.',
          'Høstedato, konkrete sorter i batchen, analyseverdier, sensoriske notater, pris og tilgjengelighet publiseres først når den faktiske produksjonen er dokumentert.'
        ]
      },
      {
        heading: 'Hvordan kan restaurant eller butikk følge produktet?',
        body: [
          'Restaurant, hotell, butikk og importør kan melde interesse via DoñaAnna.com.',
          'Doña Anna følger opp med produktark, batchinformasjon, pris, levering og eventuell smaksprøve når opplysningene faktisk kan bekreftes.'
        ]
      }
    ],
    faqs: [
      { question: 'Hvilket format har Verde Vivo?', answer: 'Verde Vivo kommuniseres nå som 500 ml.' },
      { question: 'Hvor kommer Verde Vivo fra?', answer: 'Verde Vivo er Doña Annas olivenoljeprodukt fra gården i Biar i Alicante.' },
      { question: 'Er analyseverdier publisert?', answer: 'Analyseverdier publiseres når den konkrete batchen er produsert og dokumentert.' },
      { question: 'Kan profesjonelle kjøpere melde interesse?', answer: 'Ja. Restaurant, hotell, butikk og import kan melde interesse før lansering.' }
    ],
    primaryCta: { label: 'Meld interesse for Verde Vivo', href: '/?product=verde-vivo#tasting' }
  },
  produkter: {
    slug: 'produkter',
    title: 'Doña Anna produkter fra Biar, Alicante | Olje og oliven',
    description: 'Se Doña Annas produktlinje fra Biar: Verde Vivo, Verde Alto, Raíz Antigua, Cocina Viva og planlagte Mesa Gordal Noble, med egne produktsider og batchdata.',
    eyebrow: 'Produktlinje · Biar · Doña Anna',
    h1: 'Doña Anna produkter: flere tydelige produkter under én merkevare',
    answer: 'Doña Anna har flere separate produkter. Verde Vivo, Verde Alto, Raíz Antigua og Cocina Viva er egne olivenoljeprodukter med egne roller og etiketter. Mesa · Gordal Noble er et eget planlagt bordolivenprodukt.',
    sections: [
      {
        heading: 'Hvilke olivenoljeprodukter finnes i produktlinjen?',
        body: [
          'Verde Vivo, Verde Alto, Raíz Antigua og Cocina Viva skal behandles som separate produkter – ikke som varianter av samme etikett eller produktside.',
          'Hvert produkt får egen produktside, eget navn, egen etikett og egne batchdata. Format, kvalitetsklasse, sensorikk, pris og tilgjengelighet publiseres per produkt når den faktiske produksjonen er dokumentert.'
        ]
      },
      {
        heading: 'Hva er Mesa · Gordal Noble?',
        body: [
          'Mesa · Gordal Noble er et eget produktspor for bordoliven.',
          'Det står som planlagt og skal ikke fremstilles som tilgjengelig før råvare, prosess, emballasje, etikett, pris og lansering er bekreftet.'
        ]
      },
      {
        heading: 'Hvorfor skilles produktene tydelig?',
        body: [
          'Produktnavnet skal fortelle kunden hvilket produkt de ser, og etiketten må være den godkjente etiketten for akkurat det produktet.',
          'Nettstedet skal aldri bruke et bilde av én flaske til å representere et annet produkt eller bruke en generert etikett som avviker fra godkjent merkevare.'
        ]
      }
    ],
    faqs: [
      { question: 'Har Doña Anna flere olivenoljeprodukter?', answer: 'Ja. Verde Vivo, Verde Alto, Raíz Antigua og Cocina Viva er separate olivenoljeprodukter.' },
      { question: 'Er Mesa Gordal Noble en olivenolje?', answer: 'Nei. Mesa · Gordal Noble er et eget planlagt bordolivenprodukt.' },
      { question: 'Har hvert produkt egen etikett?', answer: 'Ja. Produktene skal bruke sine egne godkjente etiketter og skal ikke blandes visuelt på nettstedet.' }
    ],
    primaryCta: { label: 'Se produktlinjen på forsiden', href: '/#portfolio' }
  },
  'verde-alto': {
    slug: 'verde-alto',
    title: 'Verde Alto olivenolje fra Biar, Alicante | Doña Anna',
    description: 'Verde Alto er et eget olivenoljeprodukt i Doña Anna-porteføljen fra Biar. Smaksprofil, format, kvalitetsklasse og batchdata dokumenteres per produksjon.',
    eyebrow: 'Verde Alto · eget olivenoljeprodukt',
    h1: 'Verde Alto – et eget Doña Anna-produkt fra Biar',
    answer: 'Verde Alto er et separat olivenoljeprodukt i Doña Anna-porteføljen. Produktet skal ha egen etikett og egne batchdata, og skal ikke beskrives eller avbildes som Verde Vivo.',
    sections: [
      {
        heading: 'Hva er Verde Alto?',
        body: [
          'Verde Alto er definert som et eget produkt med en mer balansert og bredt anvendelig posisjon i porteføljen.',
          'Den faktiske kvalitetsklassen, smaksprofilen, formatet og tilgjengeligheten beskrives først når den konkrete produksjonen er dokumentert.'
        ]
      },
      {
        heading: 'Hvordan skal Verde Alto vises på nettstedet?',
        body: [
          'Verde Alto skal bruke sin egen godkjente etikett og skal ha egne produktbilder.',
          'Inntil et merkevarekorrekt flaskebilde finnes, bruker nettstedet en nøytral produktpresentasjon fremfor å vise feil etikett.'
        ]
      },
      {
        heading: 'Hva dokumenteres per batch?',
        body: [
          'Høstedato, sorter i batchen, produksjonsdata, analyseverdier, sensoriske notater, format, pris og tilgjengelighet knyttes til den faktiske batchen når opplysningene foreligger.'
        ]
      }
    ],
    faqs: [
      { question: 'Er Verde Alto det samme som Verde Vivo?', answer: 'Nei. Verde Alto er et separat produkt med egen etikett og egen produktside.' },
      { question: 'Er kvalitetsklasse og smak bekreftet?', answer: 'Disse opplysningene publiseres først når den konkrete batchen er produsert og dokumentert.' },
      { question: 'Kan profesjonelle kjøpere melde interesse?', answer: 'Ja. Restaurant, butikk, import og andre profesjonelle kjøpere kan melde interesse før tilgjengelighet er bekreftet.' }
    ],
    primaryCta: { label: 'Meld interesse for Verde Alto', href: '/?product=verde-alto#tasting' }
  },
  'raiz-antigua': {
    slug: 'raiz-antigua',
    title: 'Raíz Antigua olivenolje fra Biar, Alicante | Doña Anna',
    description: 'Raíz Antigua er et eget Doña Anna-produkt fra Biar med heritage-posisjonering. Opprinnelse, sorter, sensorikk og batchdata dokumenteres for hver produksjon.',
    eyebrow: 'Raíz Antigua · eget heritage-produkt',
    h1: 'Raíz Antigua – egen identitet, opprinnelse og batch',
    answer: 'Raíz Antigua er et separat olivenoljeprodukt i Doña Anna-porteføljen. Heritage-posisjoneringen skal bygge på dokumentert opprinnelse og faktiske batchdata, ikke generelle påstander om alder, sorter eller smak.',
    sections: [
      {
        heading: 'Hva skiller Raíz Antigua fra de andre produktene?',
        body: [
          'Raíz Antigua har en egen heritage-posisjonering og skal ha egen etikett, egen produktside og egen produktfortelling.',
          'Påstander om gamle trær, bestemte sorter eller begrenset produksjon brukes bare når de kan dokumenteres for den aktuelle råvaren og batchen.'
        ]
      },
      {
        heading: 'Hvordan bygges produktfortellingen?',
        body: [
          'Fortellingen skal knyttes til den faktiske gården i Biar, konkrete trær eller områder når dette er dokumentert, og produksjonsdata fra batchen.',
          'Det gir en mer troverdig produktidentitet enn generiske beskrivelser av smak og terroir.'
        ]
      },
      {
        heading: 'Hvordan behandles bilder og etikett?',
        body: [
          'Raíz Antigua må vises med sin egen godkjente etikett. Bilder med gamle AI-etiketter eller etiketter fra andre produkter skal ikke brukes.',
          'Inntil korrekt produktfoto er tilgjengelig, brukes merkevaretrygge bilder fra gården og en nøytral produktpresentasjon.'
        ]
      }
    ],
    faqs: [
      { question: 'Er Raíz Antigua det samme som Verde Vivo?', answer: 'Nei. Raíz Antigua er et separat produkt med egen identitet, etikett og produktside.' },
      { question: 'Kommer Raíz Antigua fra gamle trær?', answer: 'Dette beskrives først når opprinnelsen til den konkrete batchen kan dokumenteres.' },
      { question: 'Når publiseres sensoriske data?', answer: 'Sensorikk og analyseverdier publiseres per batch etter produksjon og vurdering.' }
    ],
    primaryCta: { label: 'Meld interesse for Raíz Antigua', href: '/?product=raiz-antigua#tasting' }
  },
  'cocina-viva': {
    slug: 'cocina-viva',
    title: 'Cocina Viva olivenolje for profesjonelle kjøkken | Doña Anna',
    description: 'Cocina Viva er Doña Annas separate produkt for profesjonelle kjøkken. Format, kvalitetsklasse, pris, batchdata og levering bekreftes før tilgjengelighet.',
    eyebrow: 'Cocina Viva · profesjonelt kjøkken',
    h1: 'Cocina Viva – Doña Anna for profesjonelle kjøkken',
    answer: 'Cocina Viva er et eget produktspor for restaurant og profesjonelt kjøkken. Det skal ha egen etikett, eget format og egne kommersielle data – ikke være en større flaske med Verde Vivo-innhold på nettsiden.',
    sections: [
      {
        heading: 'Hva er rollen til Cocina Viva?',
        body: [
          'Cocina Viva er definert for profesjonell bruk der format, pris, levering og praktisk kjøkkenbruk er sentrale kjøpskriterier.',
          'Det konkrete formatet, kvalitetsklassen og tekniske produktopplysningene bekreftes før produktet markedsføres som tilgjengelig.'
        ]
      },
      {
        heading: 'Hvordan skilles Cocina Viva fra de andre oljene?',
        body: [
          'Cocina Viva har eget navn, egen etikett, egen produktside og egen B2B-posisjon.',
          'Produktet skal ikke bruke Verde Vivo-, Verde Alto- eller Raíz Antigua-bilder som erstatning.'
        ]
      },
      {
        heading: 'Hva trenger en profesjonell kjøper?',
        body: [
          'Når produktet er klart, skal siden vise relevant format, batchdata, analyse, pris, levering og produktark som gjelder Cocina Viva spesifikt.'
        ]
      }
    ],
    faqs: [
      { question: 'Er Cocina Viva et eget produkt?', answer: 'Ja. Cocina Viva er et separat Doña Anna-produkt for profesjonelle kjøkken.' },
      { question: 'Hvilket format får Cocina Viva?', answer: 'Det endelige kjøkkenformatet publiseres når produkt og emballasje er bekreftet.' },
      { question: 'Kan restauranter melde interesse?', answer: 'Ja. Profesjonelle kjøpere kan melde interesse før endelig tilgjengelighet og pris er publisert.' }
    ],
    primaryCta: { label: 'Kontakt oss om Cocina Viva', href: '/?product=cocina-viva#tasting' }
  },
  'mesa-gordal-noble': {
    slug: 'mesa-gordal-noble',
    title: 'Mesa Gordal Noble bordoliven fra Biar, Alicante | Doña Anna',
    description: 'Mesa Gordal Noble er Doña Annas planlagte bordolivenprodukt fra Biar. Produkt, prosess, format, etikett, pris og tilgjengelighet bekreftes før lansering.',
    eyebrow: 'Mesa · Gordal Noble · planlagt',
    h1: 'Mesa · Gordal Noble – planlagt bordolivenprodukt',
    answer: 'Mesa · Gordal Noble er et eget planlagt Doña Anna-produkt for bordoliven. Det er ikke en olivenolje og markedsføres ikke som tilgjengelig før produksjon, emballasje og lansering er avklart.',
    sections: [
      {
        heading: 'Hva er Mesa · Gordal Noble?',
        body: [
          'Mesa · Gordal Noble er produktnavnet for et eget bordolivenprodukt i Doña Anna-porteføljen.',
          'Det holdes tydelig adskilt fra olivenoljene Verde Vivo, Verde Alto, Raíz Antigua og Cocina Viva.'
        ]
      },
      {
        heading: 'Er produktet til salgs nå?',
        body: [
          'Nei. Produktet står som planlagt.',
          'Råvare, prosess, emballasje, nettovekt, etikett, pris, holdbarhet og tilgjengelighet må være besluttet og dokumentert før produktet fremstilles som lansert.'
        ]
      },
      {
        heading: 'Hvordan skal produktet vises visuelt?',
        body: [
          'Mesa · Gordal Noble skal bruke sin egen godkjente emballasje og etikett når disse er klare.',
          'Nettstedet skal ikke bruke et oljeprodukt, feil glass eller en AI-generert etikett som midlertidig produktbilde.'
        ]
      }
    ],
    faqs: [
      { question: 'Er Mesa Gordal Noble en olivenolje?', answer: 'Nei. Mesa · Gordal Noble er et planlagt bordolivenprodukt.' },
      { question: 'Er det tilgjengelig nå?', answer: 'Nei. Lansering og tilgjengelighet publiseres først når produktet er ferdig definert og dokumentert.' },
      { question: 'Hvilken olivensort skal brukes?', answer: 'Sort og produksjonsmetode bekreftes ut fra den faktiske produksjonen før lansering.' }
    ],
    primaryCta: { label: 'Meld interesse for Mesa · Gordal Noble', href: '/?product=mesa-gordal-noble#tasting' }
  },
  'om-dona-anna': {
    slug: 'om-dona-anna',
    title: 'Om Doña Anna | Anna og Freddy Bremseth i Biar, Alicante',
    description: 'Møt Anna og Freddy Bremseth og les hvordan Doña Anna bygges rundt olivengården i Biar, flere produkter, tydelig opprinnelse og langsiktig merkevarearbeid.',
    eyebrow: 'Om prosjektet · menneskene · gården',
    h1: 'Om Doña Anna: Anna og Freddy Bremseth bygger prosjektet sammen',
    answer: 'Doña Anna er olivenprosjektet til Anna og Freddy Bremseth i Biar, Alicante. Gården, de ulike produktene og den langsiktige merkevaren utvikles sammen.',
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
          'Produktlinjen består av Verde Vivo, Verde Alto, Raíz Antigua og Cocina Viva som separate olivenoljeprodukter. Mesa · Gordal Noble er et eget planlagt bordolivenprodukt.'
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
      { question: 'Hvilke produkter har Doña Anna?', answer: 'Verde Vivo, Verde Alto, Raíz Antigua og Cocina Viva er separate olivenoljeprodukter. Mesa · Gordal Noble er et planlagt bordolivenprodukt.' }
    ],
    primaryCta: { label: 'Se Verde Vivo', href: '/#portfolio' }
  },
  personvern: {
    slug: 'personvern',
    title: 'Personvern og kontakt | Doña Anna olivenolje fra Biar',
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
  const schema: any = {
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

  const productSchema: Record<string, { name: string; category: string; size?: string }> = {
    'verde-vivo': { name: 'Doña Anna Verde Vivo', category: 'Olive Oil', size: '500 ml' },
    'verde-alto': { name: 'Doña Anna Verde Alto', category: 'Olive Oil' },
    'raiz-antigua': { name: 'Doña Anna Raíz Antigua', category: 'Olive Oil' },
    'cocina-viva': { name: 'Doña Anna Cocina Viva', category: 'Olive Oil' },
    'mesa-gordal-noble': { name: 'Doña Anna Mesa · Gordal Noble', category: 'Table Olives' },
  };
  const product = productSchema[page.slug];
  if (product) {
    schema['@graph'].push({
      '@type': 'Product',
      '@id': canonical + '#product',
      name: product.name,
      description: page.description,
      url: canonical,
      brand: { '@id': ORG },
      category: product.category,
      ...(product.size ? { size: product.size } : {}),
    });
  }

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
    '<header class="topbar"><a class="brand" href="/">DOÑA ANNA</a><nav class="topnav" aria-label="Hovedmeny"><a href="/produkter">Produkter</a><a href="/guider">Guider</a><a href="/magasin">Magasin</a><a href="/om-dona-anna">Om oss</a><a href="/#tasting">Kontakt</a></nav></header>' +
    '<section class="hero"><div class="hero-inner"><p class="eyebrow">' + escapeHtml(page.eyebrow) + '</p><h1>' + escapeHtml(page.h1) + '</h1><p class="lead">' + escapeHtml(page.description) + '</p><div class="answer"><strong>Kort svar:</strong> ' + escapeHtml(page.answer) + '</div><div class="actions"><a class="button primary" href="' + escapeHtml(page.primaryCta.href) + '">' + escapeHtml(page.primaryCta.label) + '</a><a class="button secondary" href="/magasin">Les magasinet</a></div></div></section>' +
    '<main><div class="article-grid"><article>' + sections +
    '<section class="faq"><h2>Vanlige spørsmål</h2>' + faq + '</section>' +
    '<section class="next"><h2>Neste steg</h2><p>Se riktig produkt, les mer om gården eller meld interesse dersom du vurderer Doña Anna for restaurant, hotell, butikk eller import.</p><a class="button primary" href="' + escapeHtml(page.primaryCta.href) + '">' + escapeHtml(page.primaryCta.label) + '</a><div class="cluster"><a href="/produkter">Alle produkter</a><a href="/verde-vivo">Verde Vivo</a><a href="/verde-alto">Verde Alto</a><a href="/raiz-antigua">Raíz Antigua</a><a href="/cocina-viva">Cocina Viva</a><a href="/mesa-gordal-noble">Mesa · Gordal Noble</a></div></section>' +
    '<p class="author">Oppdatert 2. oktober 2026 · Innhold fra Doña Anna. <a href="/om-dona-anna">Anna og Freddy Bremseth driver prosjektet sammen.</a></p></article>' +
    '<aside class="aside"><strong>Utforsk Doña Anna</strong><nav><a href="/">Forsiden</a><a href="/produkter">Produkter</a><a href="/guider">Guider</a><a href="/#estate">Gården i Biar</a><a href="/verde-vivo">Verde Vivo</a><a href="/verde-alto">Verde Alto</a><a href="/raiz-antigua">Raíz Antigua</a><a href="/cocina-viva">Cocina Viva</a><a href="/mesa-gordal-noble">Mesa · Gordal Noble</a><a href="/#b2b">For profesjonelle</a><a href="/om-dona-anna">Om Anna og Freddy</a><a href="/#tasting">Kontakt</a></nav></aside></div></main>' +
    '<footer class="footer"><a href="/om-dona-anna">Anna & Freddy</a><a href="/personvern">Personvern</a><a href="https://www.freddybremseth.com/">FreddyBremseth.com</a><a href="https://www.pinosoecolife.com/">Pinoso Eco Life</a></footer>' +
    '<script src="/donaanna-analytics.js" defer></script></body></html>';
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
