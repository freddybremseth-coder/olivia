import type { IncomingMessage, ServerResponse } from 'http';
// Keep this serverless route self-contained: Vercel's Node ESM runtime cannot resolve
// the extensionless cross-directory TypeScript import at runtime.
// Product definitions below mirror content/donaAnnaProducts.ts.
export type DonaAnnaProductAvailability = 'current' | 'planned';
export type DonaAnnaLabelStatus = 'verified' | 'pending';

export type DonaAnnaProductDefinition = {
  slug: string;
  name: string;
  aliases: string[];
  category: 'Olive Oil' | 'Table Olives';
  typeLabel: string;
  size?: string;
  role: string;
  status: string;
  labelStatus: DonaAnnaLabelStatus;
  labelStatusText: string;
  availability: DonaAnnaProductAvailability;
  availabilityText: string;
  context: string;
  safeContextImage: string;
  approvedProductImage: string | null;
};

export const DONA_ANNA_PRODUCTS: DonaAnnaProductDefinition[] = [
  {
    slug: 'verde-vivo',
    name: 'Verde Vivo',
    aliases: ['verde vivo'],
    category: 'Olive Oil',
    typeLabel: 'Tidlig høstet olivenolje',
    size: '500 ml',
    role: 'Cosecha temprana / tidlig høstet olivenolje',
    status: 'Produkt definert; batchdata og endelig kvalitetsklasse publiseres når produksjonen er dokumentert',
    labelStatus: 'verified',
    labelStatusText: 'Etikett verifisert · produktfoto venter',
    availability: 'current',
    availabilityText: 'Produksjon og batchdata publiseres når de er dokumentert',
    context: 'Cosecha temprana · 500 ml',
    safeContextImage: '/donaanna/hero-image.jpg',
    approvedProductImage: null,
  },
  {
    slug: 'verde-alto',
    name: 'Verde Alto',
    aliases: ['verde alto'],
    category: 'Olive Oil',
    typeLabel: 'Eget olivenoljeprodukt',
    role: 'Eget balansert olivenoljeprodukt i Doña Anna-porteføljen',
    status: 'Produkt definert; etikett, format og batchdata publiseres etter godkjenning og produksjon',
    labelStatus: 'pending',
    labelStatusText: 'Etikett venter på godkjenning',
    availability: 'current',
    availabilityText: 'Format, kvalitetsklasse og batchdata bekreftes per produksjon',
    context: 'Balansert og bredt anvendelig posisjon',
    safeContextImage: '/donaanna/olive-trees.jpg',
    approvedProductImage: null,
  },
  {
    slug: 'raiz-antigua',
    name: 'Raíz Antigua',
    aliases: ['raíz antigua', 'raiz antigua'],
    category: 'Olive Oil',
    typeLabel: 'Eget heritage-produkt',
    role: 'Heritage-produkt med egen opprinnelses- og batchfortelling',
    status: 'Produkt definert; opprinnelse, etikett og batchpåstander dokumenteres før publisering',
    labelStatus: 'pending',
    labelStatusText: 'Etikett venter på godkjenning',
    availability: 'current',
    availabilityText: 'Opprinnelse og batchpåstander dokumenteres før publisering',
    context: 'Heritage · opprinnelse · egen produktfortelling',
    safeContextImage: '/donaanna/olive-trees.jpg',
    approvedProductImage: null,
  },
  {
    slug: 'cocina-viva',
    name: 'Cocina Viva',
    aliases: ['cocina viva'],
    category: 'Olive Oil',
    typeLabel: 'Produkt for profesjonelle kjøkken',
    role: 'Produkt for restaurant, hotell og profesjonelle kjøkken',
    status: 'Produkt definert; format, pris, etikett og levering bekreftes før tilgjengelighet',
    labelStatus: 'pending',
    labelStatusText: 'Etikett venter på godkjenning',
    availability: 'current',
    availabilityText: 'Format, pris og levering bekreftes før lansering',
    context: 'Restaurant · hotell · profesjonelt kjøkken',
    safeContextImage: '/donaanna/farming-2.jpg',
    approvedProductImage: null,
  },
  {
    slug: 'mesa-gordal-noble',
    name: 'Mesa · Gordal Noble',
    aliases: ['mesa · gordal noble', 'mesa gordal noble'],
    category: 'Table Olives',
    typeLabel: 'Planlagt bordolivenprodukt',
    role: 'Planlagt bordolivenprodukt',
    status: 'Planlagt; ikke tilgjengelig for salg før produkt, prosess, emballasje og lansering er dokumentert',
    labelStatus: 'pending',
    labelStatusText: 'Etikett og emballasje venter på godkjenning',
    availability: 'planned',
    availabilityText: 'Planlagt · ikke tilgjengelig for salg ennå',
    context: 'Bordoliven · eget produktspor',
    safeContextImage: '/donaanna/hero-image.jpg',
    approvedProductImage: null,
  },
];

export const DONA_ANNA_PRODUCTS_BY_SLUG: Record<string, DonaAnnaProductDefinition> =
  Object.fromEntries(DONA_ANNA_PRODUCTS.map(product => [product.slug, product]));

export const DONA_ANNA_PRODUCT_SLUGS_BY_NAME: Record<string, string> =
  Object.fromEntries(
    DONA_ANNA_PRODUCTS.flatMap(product =>
      [product.name.toLowerCase(), ...product.aliases].map(alias => [alias.toLowerCase(), product.slug])
    )
  );

export function canonicalDonaAnnaProductSlug(name: unknown): string {
  return DONA_ANNA_PRODUCT_SLUGS_BY_NAME[String(name || '').trim().toLowerCase()] || '';
}

export function donaAnnaProductByName(name: unknown): DonaAnnaProductDefinition | undefined {
  const slug = canonicalDonaAnnaProductSlug(name);
  return slug ? DONA_ANNA_PRODUCTS_BY_SLUG[slug] : undefined;
}


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
  'kunnskap-og-boker': {
    slug: 'kunnskap-og-boker',
    title: 'Kunnskap, smaking og olivenbøker fra Biar | Doña Anna',
    description: 'Lær om olivenolje, birøkt, regenerativ dyrking og smaking med Doña Anna. Oppdag Freddy og Annas bøker og nye læringsguider fra gården i Biar.',
    eyebrow: 'Doña Anna akademi · kunnskap og bøker',
    h1: 'Fra olivenlunden til smaksglasset og bøkene',
    answer: 'Doña Anna deler ikke bare produkter, men også kunnskap om oliventrær, jord, bier, høsting, sensorikk og mat. Innholdet bygger blant annet på Freddy Bremseths eksisterende sakprosabøker og nye arbeidsmanus om olivenolje- og vinsmaking. Du kan lære gratis her, og senere fordype deg i bøkene når den aktuelle utgaven er klar.',
    sections: [
      {
        heading: 'Biar er både en gård og et sted å lære',
        body: [
          'På vår egen gård i Biar finnes oliventrær, jord, vann og et landskap som gir oss konkrete spørsmål: Hvorfor varierer høstetidspunktet? Hvordan påvirker dyrking og behandling oljen? Hva kan bier og biologisk mangfold bety for et jordbrukssystem? Disse spørsmålene er utgangspunkt for guidene og bøkene – ikke bevis på sertifisering eller målte kvalitetsresultater.',
          'Boken Birøkt og oliven i hjertet av Alicante tar opp samspillet mellom oliven, bier, jord og regenerativ drift. Fra jord til bord følger råvarens vei fra dyrking og høsting til produksjon og mat. Kunsten å høste tidlig går videre inn på valget mellom modenhet, smak og utbytte.'
        ]
      },
      {
        heading: 'Lær å smake olivenolje – gratis introduksjon',
        body: [
          'Start med forskjellen mellom fruktighet, bitterhet og den pepperaktige følelsen i halsen. Lær hvordan du sammenligner to ferske oljer blindt, og hvorfor den mest intense ikke nødvendigvis er den beste.',
          'Den tilhørende boken Lær å smake olivenolje er fortsatt et arbeidsmanus. Nettguiden er en selvstendig pedagogisk introduksjon, ikke en offentlig klassifisering av Doña Annas produkter eller et løfte om at boken er i salg.'
        ]
      },
      {
        heading: 'Lær å smake vin – en bredere smaksskole',
        body: [
          'Vinsmaking hjelper oss å forstå forskjellen mellom observasjon, tolkning og preferanse: syre er ikke det samme som kvalitet, og kraft er ikke det samme som balanse. Sammenlign for eksempel en friskere vin med en mildere, eller en lett Pinot Noir med en fyldigere Shiraz.',
          'Lær å smake vin er også et arbeidsmanus. Innholdet er faglig beslektet med olivenoljesmaking, men vin er et eget læringstema. Doña Anna selger ikke vin gjennom disse guidene.'
        ]
      },
      {
        heading: 'Hva kan du lese videre?',
        body: [
          'I bokuniverset til Freddy Bremseth er blant annet Birøkt og oliven i hjertet av Alicante, Fra jord til bord, Polyfenolens kraft og Kunsten å høste tidlig registrert. Noen titler har ikke verifisert kjøpslenke eller tilgjengelig utgave, og vi oppgir derfor ikke pris eller lovnader om levering her.',
          'My Journey as a Father forteller om familieliv, ansvar og nye livsfaser. Den kan gi et menneskelig bakteppe for forfatterskapet, men personlige detaljer om familien hører ikke hjemme i Doña Annas produktmarkedsføring uten egen gjennomgang og samtykke.'
        ]
      },
      {
        heading: 'Kunnskap før kjøpsknapper',
        body: [
          'Doña Anna skal gi nyttige, gjennomførbare forklaringer gratis. Bøker, smakssett og fremtidige arrangementer kan gi frivillig fordypning, men det skal alltid være mulig å lære uten å kjøpe noe.',
          'Du finner forfatterens samlede bokkatalog på books.freddybremseth.com. Kontroller den konkrete bokutgaven og kjøpsmulighetene i katalogen; de to nye smakebøkene står ennå som manus under utvikling.'
        ]
      }
    ],
    faqs: [
      { question: 'Kan jeg lære å smake olivenolje gratis?', answer: 'Ja. Doña Anna gir en gratis smakeguide med begreper og en enkel blindsmakingsøvelse. Den erstatter ikke en offisiell sensorisk paneltest.' },
      { question: 'Er bøkene om olivenolje- og vinsmaking ferdig publisert?', answer: 'Nei. De to smakebøkene er arbeidsmanus og skal redigeres og kvalitetssikres før utgivelse.' },
      { question: 'Handler kunnskapsdelen bare om Doña Anna-produkter?', answer: 'Nei. Den lærer bort generelle prinsipper om jord, høsting og sensorisk vurdering. Doña Annas egne batchpåstander publiseres først når de er dokumentert.' }
    ],
    primaryCta: { label: 'Lær å smake olivenolje', href: '/laer-a-smake-olivenolje' }
  },
  'laer-a-smake-olivenolje': {
    slug: 'laer-a-smake-olivenolje',
    title: 'Lær å smake olivenolje – øvelser og smak | Doña Anna',
    description: 'Lær å kjenne fruktighet, bitterhet, pepperaktig pungens og balanse i olivenolje. Gratis øvelser bygget på Freddy Bremseths nye smakebok.',
    eyebrow: 'Gratis smaksskole · olivenolje',
    h1: 'Lær å smake olivenolje: lukt, smak og forstå',
    answer: 'Start med tre sanseinntrykk: fruktighet i aromaen, bitterhet som grunnsmak og pungens – den pepperaktige følelsen i munnen eller svelget. Vurder deretter hvordan de henger sammen. En mild olje kan være svært god, mens en intens olje kan være ubalansert. Bruk denne guiden til læring, ikke til å tildele offisiell kvalitetsklasse.',
    sections: [
      {
        heading: 'Trinn 1: Lukt før du smaker',
        body: [
          'Hell litt fersk olivenolje i et rent, lite glass, gjerne med lokk. Prøv å beskrive lukten uten å se på etiketten. Er fruktigheten grønn, moden, tydelig eller dempet? Finner du konkrete assosiasjoner, som grønne urter, olivenblad, frukt eller nøtter? Beskriv bare det du faktisk opplever.',
          'Fargen sier lite om sensorisk kvalitet. Bruk helst like beholdere og sammenlign prøvene uten å vite hvilken olje som er hvilken.'
        ]
      },
      {
        heading: 'Trinn 2: Skill bitterhet fra pepperaktig skarphet',
        body: [
          'Smak en liten mengde. Bitterhet er en grunnsmak du kjenner i munnen. Pungens er en pepperaktig, irriterende eller prikkende følelse som også kan komme i halsen. Disse er forskjellige sansefenomener; noter dem hver for seg.',
          'Marker fruktighet, bitterhet og pungens fra 0 til 5 i din egen smakejournal. Dette er en pedagogisk skala, ikke den offisielle metoden for klassifisering av olivenolje.'
        ]
      },
      {
        heading: 'Trinn 3: Smak to oljer blindt',
        body: [
          'Finn én fersk, mild Arbequina og én fersk, mer intens Picual eller Coratina fra en pålitelig produsent. La noen andre kode prøvene A og B. Sørg for omtrent lik temperatur, mengde og oppbevaring.',
          'Beskriv først lukt og struktur, deretter hva du liker. Spør: Er den milde oljen presis og harmonisk? Er den intense oljen balansert, eller dominerer én egenskap? Ingen av sortene er automatisk bedre, og produksjonsforskjeller påvirker resultatet.'
        ]
      },
      {
        heading: 'Trinn 4: Lær balanse, kompleksitet og lengde',
        body: [
          'Balanse handler om samspillet mellom fruktighet, bitterhet og pungens – ikke at alle tre skal være like sterke. Kompleksitet handler om flere relevante og tydelige sanseinntrykk, ikke flest mulig ord. Lengde handler om hvor lenge passende aroma- og smaksinntrykk varer.',
          'Noter hva du observerer, hva du tror forklarer det, og hva du personlig foretrekker. Hold de tre kategoriene atskilt.'
        ]
      },
      {
        heading: 'Fra bok til praksis',
        body: [
          'Dette er en gratis introduksjon inspirert av arbeidsmanuset Lær å smake olivenolje, som har kapitler om balanse, blindsmaking, olivensorter, klima og mat. Boken er fortsatt under redigering og ikke annonsert som tilgjengelig for salg.',
          'Vil du lære mer om gården bak Doña Anna, gå videre til historien om Biar og tidlig høsting. En eventuell framtidig smakepakke skal først presenteres når innhold, varer og levering er reelt godkjent.'
        ]
      }
    ],
    faqs: [
      { question: 'Er en intens olivenolje alltid bedre?', answer: 'Nei. Intensitet og kvalitet er forskjellige. En mild, harmonisk olje kan vurderes høyt, mens en intens olje kan mangle balanse.' },
      { question: 'Er bitterhet et tegn på feil?', answer: 'Ikke i seg selv. Bitterhet kan være et normalt positivt sensorisk kjennetegn ved virgin olivenolje. Eventuelle defekter vurderes etter egen metodikk.' },
      { question: 'Kan jeg sertifisere en olivenolje ved å følge denne guiden?', answer: 'Nei. En offisiell klassifisering krever relevant kjemisk og organoleptisk vurdering etter gjeldende krav.' }
    ],
    primaryCta: { label: 'Utforsk gården i Biar', href: '/om-dona-anna' }
  },
  'laer-a-smake-vin': {
    slug: 'laer-a-smake-vin',
    title: 'Lær å smake vin – syre, tannin og balanse | Doña Anna',
    description: 'Gratis introduksjon til vinsmaking med aroma, syre, tannin, fylde, balanse og blindsmaking. En kunnskapsbro til Freddy Bremseths nye vinbok.',
    eyebrow: 'Gratis smaksskole · vin',
    h1: 'Lær å smake vin: forskjellene du faktisk kjenner',
    answer: 'Når du smaker vin, skiller du mellom lukt, syre, tannin, alkoholvarme, fylde, balanse og aromatisk lengde. Start med å beskrive hvert inntrykk før du vurderer kvalitet eller personlige preferanser. En kraftig vin er ikke nødvendigvis bedre enn en lett vin.',
    sections: [
      {
        heading: 'Trinn 1: Beskriv – ikke døm med en gang',
        body: [
          'Lukt og noter konkrete assosiasjoner. Er intensiteten lav eller høy? Virker frukten lys, mørk, frisk eller moden? Deretter vurderer du struktur og balanse. Skriv «høy syre» hvis du kjenner høy syre, ikke «for høy syre» før den er vurdert i sammenheng.',
          'Skille mellom observasjon, tolkning og preferanse gjør smaksnotater mer presise. «Kirsebær» kan være en aromaassosiasjon; «kan være Pinot Noir» er en tolkning; «jeg foretrekker lettere vin» er en personlig mening.'
        ]
      },
      {
        heading: 'Trinn 2: Syre og tannin – to ulike opplevelser',
        body: [
          'Syre gir ofte en frisk, spyttdrivende opplevelse. Tannin kan kjennes som tørrhet eller ruhet i munnen og på tannkjøttet. Alkohol kan gi varme, mens fylde handler om vinens samlede munnfølelse.',
          'Registrer syre, tannin, alkoholvarme og fylde hver for seg. De kan variere både med druesort, klima, modning og vinmaking.'
        ]
      },
      {
        heading: 'Trinn 3: Kontrastøvelse med to vinstiler',
        body: [
          'Sammenlign en frisk, lettere Pinot Noir med en mer konsentrert Shiraz, gjerne fra ulike klimatiske forhold. Be en annen person kode vinene A og B. Bruk like glass og server ved passende temperatur for de valgte stilene.',
          'Beskriv aroma, syre, tannin, varme og fylde blindt. Hva varer i ettersmaken? Rangér balanse separat fra personlig smak. Øvelsen lærer forskjeller, men isolerer ikke én enkelt variabel siden druesort og produksjon også varierer.'
        ]
      },
      {
        heading: 'Trinn 4: Hvordan vurderer du kvalitet?',
        body: [
          'Kvalitet er en begrunnet helhetsvurdering av presisjon, harmoni, passende intensitet, lengde og eventuelle feil. Høy alkohol eller lange, varme ettersmaker er ikke automatisk kompleksitet.',
          'For hver prøve kan du notere én tydelig kvalitet, ett mulig forbedringspunkt og din personlige preferanse. Hvis du vil, kan du gjennomføre øvelsen med spytting for å bevare konsentrasjonen gjennom flere prøver.'
        ]
      },
      {
        heading: 'Hvorfor vin på et nettsted om olivenolje?',
        body: [
          'Doña Anna er et olivenprosjekt, ikke en vinprodusent. Likevel kan vinsmaking hjelpe oss å trene opp presist språk for lukt, tekstur, balanse og kvalitet – ferdigheter som også er nyttige når du lærer å forstå olivenolje.',
          'Den tilhørende boken Lær å smake vin er et arbeidsmanus med kapitler om balanse, blindsmaking, druesorter, klima, mat og profesjonell smaksmetode. Den er ikke presentert som ferdig utgitt. Innholdet er for voksne, med ansvarlig smaking og mulighet for å spytte ut prøvene.'
        ]
      }
    ],
    faqs: [
      { question: 'Hva er forskjellen på syre og tannin?', answer: 'Syre oppleves ofte som friskhet og økt spyttproduksjon. Tannin oppleves mer som tørrhet, ruhet eller sammentrekning i munnen.' },
      { question: 'Er en kraftig vin alltid bedre enn en lett?', answer: 'Nei. Balanse, presisjon, lengde og helhet sier mer enn bare intensitet.' },
      { question: 'Selger Doña Anna vin?', answer: 'Nei. Vinsmaking er en separat undervisningsdel i kunnskapsuniverset, ikke en vinbutikk eller en påstand om at Doña Anna lager vin.' }
    ],
    primaryCta: { label: 'Lær å smake olivenolje', href: '/laer-a-smake-olivenolje' }
  },
  guider: {
    slug: 'guider',
    title: 'Guider om olivenolje fra Biar og Alicante | Doña Anna',
    description: 'Doña Anna-guider om olivenolje fra Biar, tidlig høsting, Verde Vivo, restaurantbruk, sporbarhet og planene for bordoliven.',
    eyebrow: 'Guidehub · olivenolje fra Biar',
    h1: 'Guider om olivenolje fra Biar',
    answer: 'Her samler Doña Anna guider som svarer på konkrete spørsmål om gården i Biar, tidlig høsting, olivenoljekvalitet, bruk i restaurant og smak. Du kan også starte med gratis introduksjoner til olivenolje- og vinsmaking og bli kjent med bøkene bak kunnskapsuniverset.',
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
      { question: 'Er guidene det samme som magasinet?', answer: 'Nei. Guidene dekker stabile søkeintensjoner, mens magasinet brukes til redaksjonelle og tidsaktuelle saker.' },
      { question: 'Hva er forskjellen på Verde Vivo og Verde Alto?', answer: 'Verde Vivo er definert som en tidlig høstet olivenolje i 500 ml. Verde Alto er en egen, mer balansert produktretning. Endelig sensorikk, kvalitet og batchdata bekreftes først når dokumentasjonen foreligger.' },
      { question: 'Hvordan vurderes extra virgin-olivenolje?', answer: 'Kvalitetsklassen fastsettes for den konkrete oljen gjennom relevante kjemiske analyser og sensorisk vurdering. En produktbeskrivelse alene dokumenterer ikke extra virgin-kvalitet.' },
      { question: 'Hvordan bør olivenolje oppbevares?', answer: 'Oppbevar olivenolje tett lukket, kjølig og mørkt, beskyttet mot lys, varme og luft. Se vår artikkel om oppbevaring for praktiske råd.' }
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
    title: 'Anna, Freddy og olivengården i Biar | Historien om Doña Anna',
    description: 'Møt Anna og Freddy og olivengården i Biar. Historien om Doña Anna, trærne, produktene og hvorfor dokumentert kvalitet kommer før luksusløfter.',
    eyebrow: 'Menneskene · oliventrærne · Biar',
    h1: 'Doña Anna begynner med Anna. Og med gården vår i Biar.',
    answer: 'Vi er Anna og Freddy Bremseth. Doña Anna er navnet på olivenprosjektet vi bygger rundt vår egen gård i Biar, Alicante. Her finnes om lag 1 500 oliventrær. Vi vil skape oljer med et gjenkjennelig uttrykk, men lar den faktiske produksjonen og dokumentasjonen avgjøre hva vi kan love.',
    sections: [
      {
        heading: 'Et navn med mennesker bak',
        body: [
          'Doña Anna er mer enn et produktnavn. Anna og Freddy Bremseth står bak prosjektet, og Anna er den personlige forbindelsen i navnet. Vi vil at den som velger en flaske, skal vite hvem som står bak – ikke bare kjenne igjen en etikett.',
          'Det er et langsiktig arbeid. Vi bygger opp oljer og emballasje i eget tempo, med respekt for hva vi kan dokumentere og faktisk levere.'
        ]
      },
      {
        heading: 'Jorden, røttene og olivenene i Biar',
        body: [
          'Gården ligger i innlandet av Alicante og omfatter rundt 60 000 m² og omtrent 1 500 oliventrær. Her ser du vridde stammer, røtter, olivengrener og jorden de vokser i. Bildene på nettstedet er tatt på selve gården med kommersiell brukstillatelse.',
          'Blant sortene på gården er Genovesa, Gordal, Changlot Real og Picual. Det betyr ikke at alle oljene inneholder alle sortene. Råvaresammensetningen må beskrives for den faktiske produksjonen.',
          'Vi legger ikke eksakt alder på trærne eller bestemte sorter på enkeltfotografier uten dokumentasjon. For oss er trærne interessante også uten store tall.'
        ]
      },
      {
        heading: 'Hvorfor vi bryr oss om flasken',
        body: [
          'En flaske kan være noe du setter frem når du har gjester, gir til et menneske du vil glede, eller åpner for å oppdage en ny smak. Doña Anna skal ha en egen visuell signatur med utgangspunkt i gården – ikke bare se dyr ut.',
          'Flaskeform, materialer, kork og gaveeske testes og godkjennes fysisk før vi viser dem som ferdige produkter. En illustrasjon eller en designskisse skal ikke fremstå som en flaske vi allerede har produsert.'
        ]
      },
      {
        heading: 'Oljen må fortjene historien',
        body: [
          'Vi utvikler Verde Vivo med tidlig høsting som tydelig retning. Verde Alto, Raíz Antigua og Cocina Viva har ulike produktroller, mens Mesa · Gordal Noble er et planlagt bordolivenprodukt. Dette er ikke ett produkt med fem forskjellige etiketter.',
          'Når et oljeparti er klart, skal kvalitet, smaksprofil, relevant analyse, produksjonsopplysninger og tilgjengelighet dokumenteres per parti. Ingen pris, extra virgin-klassifisering, begrenset opplag eller spesifikke smaksnotater presenteres som bevist før dokumentasjonen foreligger.'
        ]
      }
    ],
    faqs: [
      { question: 'Hvem står bak Doña Anna?', answer: 'Anna og Freddy Bremseth, med en olivengård i Biar i Alicante.' },
      { question: 'Er bildene fra den virkelige gården?', answer: 'Ja. Gårdsbildene i fotografiseksjonen og på forsiden er eiergodkjente bilder fra Biar.' },
      { question: 'Er oljene tilgjengelige nå?', answer: 'Produktsidene viser hva som er definert og hva som fortsatt avventer godkjenning. Pris, ferdig flaske, kvalitetsklasse og tilgjengelighet oppgis når det er dokumentert for den konkrete produksjonen.' },
      { question: 'Hva gjør Doña Anna forskjellig?', answer: 'En personlig eierhistorie, en konkret gård i Biar, ekte dokumentarfotografier og en ambisjon om produktvis sporbarhet – fremfor generelle kvalitetsløfter.' }
    ],
    primaryCta: { label: 'Utforsk oljene', href: '/produkter' }
  },
  personvern: {
    slug: 'personvern',
    title: 'Personvern og kontakt | Doña Anna olivenolje fra Biar',
    description: 'Slik behandler Doña Anna henvendelser via e-post og nettskjema, hvilke opplysninger som brukes, og hvordan du kontakter oss om personvern.',
    eyebrow: 'Personvern · kontakt',
    h1: 'Personvern og kontakt på DoñaAnna.com',
    answer: 'Doña Anna bruker opplysninger du selv oppgir for å besvare forespørsler. Skjemaet viser om det åpner e-postprogrammet ditt eller sender direkte fra nettsiden. Når direkte innsending er aktivert, behandles henvendelsen av vår eksisterende e-postløsning i RealtyFlow PRO. Innsendingen er ikke en bestilling.',
    sections: [
      {
        heading: 'Hvordan sendes en forespørsel om smaksprøve?',
        body: [
          'Når direkte innsending er deaktivert, åpner knappen en ferdig utfylt e-post til info@donaanna.com. Du må selv sende den fra e-postprogrammet ditt.',
          'Når direkte innsending er aktivert, sender nettsiden navn, e-postadresse, forespørselstype, relevant produkt, eventuell bedrift og meldingen din til Doña Annas server. Serveren videresender henvendelsen til Doña Annas egen e-postkonto gjennom RealtyFlow PRO. Du får først en bekreftelse når e-posttjenesten har akseptert henvendelsen.'
        ]
      },
      {
        heading: 'Hva skjer med opplysningene når du sender oss e-post?',
        body: [
          'Hvis du sender en e-post til Doña Anna, mottar vi de opplysningene du selv tar med, for eksempel navn, e-postadresse, produktinteresse og melding. Vi bruker dem til å besvare henvendelsen og følge opp spørsmålet ditt.',
          'Ved e-postalternativet behandles meldingen i avsenderens og mottakerens e-postsystemer. Ved direkte nettskjema behandles innholdet også av Doña Annas server og RealtyFlow PRO sin eksisterende e-postmotor, med logg over utsendelsen i e-postsystemet. Meldingen brukes til å besvare henvendelsen, ikke som en automatisk påmelding til markedsføring.',
          'For å beskytte direkteinnsending mot misbruk brukes kortvarige begrensningskontroller basert på pseudonymiserte avsenderidentiteter. Rå IP-adresser lagres ikke i denne spesifikke begrensningstabellen. Vanlige sikkerhetslogger hos driftsleverandørene kan behandles separat. Ikke send helseopplysninger, betalingskortopplysninger eller andre sensitive data i feltet for melding.',
          'Du kan kontakte info@donaanna.com for spørsmål om hvilke opplysninger som er mottatt og for å be om innsyn eller sletting der det er aktuelt. Henvendelser og lovpålagte oppbevaringshensyn må vurderes konkret.'
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
      { question: 'Hvordan sendes forespørselen?', answer: 'Skjemaet viser om det åpner en e-post du selv sender, eller om direkte innsending er aktivert. Ved direkte innsending brukes Doña Annas server og eksisterende RealtyFlow PRO-e-postsystem.' },
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
  // FAQ entries should add something beyond the page introduction and sections.
  // Keep the editorial selection in one place so visible FAQs and JSON-LD agree.
  const usefulFaqQuestions: Record<string, string[]> = {
    'kunnskap-og-boker': ['Kan jeg lære å smake olivenolje gratis?', 'Er bøkene om olivenolje- og vinsmaking ferdig publisert?'],
    'laer-a-smake-olivenolje': ['Er en intens olivenolje alltid bedre?', 'Kan jeg sertifisere en olivenolje ved å følge denne guiden?'],
    'laer-a-smake-vin': ['Hva er forskjellen på syre og tannin?', 'Selger Doña Anna vin?'],
    guider: ['Hva er forskjellen på Verde Vivo og Verde Alto?', 'Hvordan vurderes extra virgin-olivenolje?', 'Hvordan bør olivenolje oppbevares?'],
    'olivenolje-for-restauranter': ['Kan en restaurant melde interesse for smaksprøve?', 'Har alle produktene samme format?'],
    'verde-alto': ['Kan profesjonelle kjøpere melde interesse?'],
    'cocina-viva': ['Kan restauranter melde interesse?'],
    'mesa-gordal-noble': ['Hvilken olivensort skal brukes?'],
  };
  const usefulFaqs = page.faqs.filter(item => usefulFaqQuestions[page.slug]?.includes(item.question));
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
    ],
  };


  if (usefulFaqs.length) {
    schema['@graph'].push({
      '@type': 'FAQPage',
      mainEntity: usefulFaqs.map(item => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }

  const productDefinition = DONA_ANNA_PRODUCTS_BY_SLUG[page.slug];
  const visual = productDefinition
    ? {
        displayName: productDefinition.name,
        type: productDefinition.typeLabel,
        labelStatus: productDefinition.labelStatusText,
        availability: productDefinition.availabilityText,
        context: productDefinition.context,
      }
    : undefined;

  if (page.slug === 'produkter') {
    schema['@graph'].push({
      '@type': 'ItemList',
      '@id': canonical + '#products',
      name: 'Doña Anna produktlinje',
      numberOfItems: DONA_ANNA_PRODUCTS.length,
      itemListElement: DONA_ANNA_PRODUCTS.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: SITE + '/' + item.slug,
      })),
    });
  }

  // Product identity markup has no offers, prices, reviews or availability promises.
  // Commercial rich-result fields are added only when independently verified.
  if (productDefinition) {
    schema['@graph'].push({
      '@type': 'Product',
      '@id': canonical + '#product',
      name: 'Doña Anna ' + productDefinition.name,
      url: canonical,
      brand: { '@id': ORG },
      description: productDefinition.role + '. ' + productDefinition.status,
      category: productDefinition.typeLabel,
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'Produktrolle', value: productDefinition.role },
        { '@type': 'PropertyValue', name: 'Status', value: productDefinition.status },
        { '@type': 'PropertyValue', name: 'Etikett', value: productDefinition.labelStatusText },
      ],
    });
  }

  const sections = page.sections.map(section =>
    '<section class="article-section"><h2>' + escapeHtml(section.heading) + '</h2>' +
    section.body.map(paragraph => '<p>' + escapeHtml(paragraph) + '</p>').join('') + '</section>'
  ).join('');

  const faq = usefulFaqs.map(item =>
    '<details><summary>' + escapeHtml(item.question) + '</summary><p>' + escapeHtml(item.answer) + '</p></details>'
  ).join('');

  const productHubCards = DONA_ANNA_PRODUCTS.map(item => ({
    slug: item.slug,
    name: item.name,
    type: item.typeLabel,
    role: item.context,
    status: item.availability === 'planned' ? item.availabilityText : item.labelStatusText,
  }));
  const productHub = page.slug === 'produkter'
    ? '<section class="product-hub" aria-label="Doña Anna produktlinje"><div class="product-hub-grid">' +
      productHubCards.map(item =>
        '<article class="product-hub-card"><div class="product-hub-mark"><img src="/labels/dona-anna-figure.svg" alt="" width="90" height="150"></div>' +
        '<p class="product-hub-type">' + escapeHtml(item.type) + '</p>' +
        '<h2><a href="/' + escapeHtml(item.slug) + '">' + escapeHtml(item.name) + '</a></h2>' +
        '<p class="product-hub-role">' + escapeHtml(item.role) + '</p>' +
        '<p class="product-hub-status">' + escapeHtml(item.status) + '</p>' +
        '<div class="product-hub-actions"><a href="/' + escapeHtml(item.slug) + '">Se produktet</a>' +
        '<a href="/?product=' + escapeHtml(item.slug) + '#tasting">Meld interesse</a></div></article>'
      ).join('') + '</div></section>'
    : '';

  const productIdentity = visual
    ? '<section class="product-identity" aria-label="Produktidentitet">' +
      '<div class="product-mark"><img src="/labels/dona-anna-figure.svg" alt="" width="180" height="300"></div>' +
      '<div class="product-copy"><p class="product-kicker">Eget Doña Anna-produkt</p>' +
      '<h2>' + escapeHtml(visual.displayName) + '</h2>' +
      '<p class="product-type">' + escapeHtml(visual.type) + '</p>' +
      '<dl><div><dt>Rolle</dt><dd>' + escapeHtml(visual.context) + '</dd></div>' +
      '<div><dt>Etikett</dt><dd>' + escapeHtml(visual.labelStatus) + '</dd></div>' +
      '<div><dt>Status</dt><dd>' + escapeHtml(visual.availability) + '</dd></div></dl>' +
      '<p class="product-note">Doña Anna bruker ikke gamle AI-flasker eller etiketter fra andre produkter som erstatning. Endelig produktfoto publiseres først når riktig etikett og emballasje er verifisert.</p>' +
      '</div></section>'
    : '';

  // Page-specific reading journeys connect the estate story to relevant product
  // knowledge, rather than sending every visitor to the same generic next step.
  const readingJourneys: Record<string, { heading: string; intro: string; links: { href: string; label: string }[] }> = {
    guider: {
      heading: 'Lær mer med Doña Anna',
      intro: 'I tillegg til guidene om Biar og produktene kan du trene smakssansen med gratis øvelser fra smakebokprosjektene.',
      links: [
        { href: '/kunnskap-og-boker', label: 'Kunnskap, bøker og gårdshistorie' },
        { href: '/laer-a-smake-olivenolje', label: 'Gratis introduksjon til olivenoljesmaking' },
        { href: '/laer-a-smake-vin', label: 'Læringsguide for vinsmaking' },
      ],
    },
    'kunnskap-og-boker': {
      heading: 'Velg din vei inn i smak og kunnskap',
      intro: 'Start gratis med en praktisk smakeøvelse og gå videre til gården, produktene eller forfatterens bokkatalog etter interesse.',
      links: [
        { href: '/laer-a-smake-olivenolje', label: 'Smaksskolen for olivenolje' },
        { href: '/laer-a-smake-vin', label: 'Smaksskolen for vin' },
        { href: '/om-dona-anna', label: 'Anna og Freddy – historien fra gården' },
        { href: 'https://books.freddybremseth.com/', label: 'Bokkatalogen til Freddy Bremseth' },
      ],
    },
    'laer-a-smake-olivenolje': {
      heading: 'Lær mer om smak og opprinnelse',
      intro: 'Knytt sansene til faktiske valg i gården og undervisningen uten å forveksle en hjemmeøvelse med en offisiell kvalitetsklassifisering.',
      links: [
        { href: '/kunnskap-og-boker', label: 'Kunnskapsuniverset og bøkene' },
        { href: '/tidlig-hostet-olivenolje', label: 'Hva betyr tidlig høsting?' },
        { href: '/laer-a-smake-vin', label: 'Tren samme observasjonsmetode med vin' },
      ],
    },
    'laer-a-smake-vin': {
      heading: 'Fra vinens struktur til oljens karakter',
      intro: 'Du kan lære like mye av å sammenligne sensoriske begreper som av å bedømme én flaske. Gå videre til gratis olivenoljeøvelser.',
      links: [
        { href: '/laer-a-smake-olivenolje', label: 'Lær olivenolje med fruktighet, bitterhet og pungens' },
        { href: '/kunnskap-og-boker', label: 'Se læringsuniverset og bokarbeidet' },
        { href: '/om-dona-anna', label: 'Bli kjent med Doña Anna' },
      ],
    },
    'om-dona-anna': {
      heading: 'Fra gården til råvaren',
      intro: 'Se hvordan landskapet i Biar, olivenene og høstetidspunktet henger sammen med Doña Annas produktarbeid.',
      links: [
        { href: '/olivenolje-fra-biar', label: 'Oliven fra Biar og opprinnelsen' },
        { href: '/tidlig-hostet-olivenolje', label: 'Hva betyr tidlig høsting?' },
        { href: '/produkter', label: 'Bli kjent med produktfamilien' },
        { href: '/kunnskap-og-boker', label: 'Bøkene og kunnskap bak gårdsarbeidet' },
      ],
    },
    'olivenolje-fra-biar': {
      heading: 'Utforsk olivenlunden videre',
      intro: 'Lær mer om modning, produktidentitet og menneskene som utvikler Doña Anna.',
      links: [
        { href: '/tidlig-hostet-olivenolje', label: 'Modning og høstetidspunkt' },
        { href: '/raiz-antigua', label: 'Raíz Antigua – røtter og opprinnelse' },
        { href: '/om-dona-anna', label: 'Historien om Anna og Freddy' },
      ],
    },
    'tidlig-hostet-olivenolje': {
      heading: 'Fra oliven til produkt',
      intro: 'Tidlig høsting er et produksjonsvalg. Endelig kvalitetsklasse og sensorikk bekreftes per batch.',
      links: [
        { href: '/verde-vivo', label: 'Verde Vivo – tidlig høsting' },
        { href: '/verde-alto', label: 'Verde Alto – egen produktidentitet' },
        { href: '/olivenolje-fra-biar', label: 'Les om gården i Biar' },
      ],
    },
    'verde-vivo': {
      heading: 'Bak Verde Vivo',
      intro: 'Se hva tidlig høsting innebærer og hvordan vi dokumenterer opprinnelsen.',
      links: [
        { href: '/tidlig-hostet-olivenolje', label: 'Guide til tidlig høsting' },
        { href: '/olivenolje-fra-biar', label: 'Hvor olivenene kommer fra' },
      ],
    },
    'verde-alto': {
      heading: 'Oppdag forskjellene',
      intro: 'Hvert Doña Anna-produkt har sin egen rolle. Kvalitet og smak dokumenteres for den konkrete produksjonen.',
      links: [
        { href: '/verde-vivo', label: 'Sammenlign med Verde Vivo' },
        { href: '/produkter', label: 'Se alle produktene' },
      ],
    },
    'raiz-antigua': {
      heading: 'Røttene bak navnet',
      intro: 'Lær mer om gården og hvorfor opprinnelse må kunne dokumenteres, også når historien står sentralt.',
      links: [
        { href: '/om-dona-anna', label: 'Menneskene og gården' },
        { href: '/olivenolje-fra-biar', label: 'Biar som opprinnelse' },
      ],
    },
    'cocina-viva': {
      heading: 'For profesjonelle kjøkken',
      intro: 'Produktformat og levering oppgis først når de er bekreftet. Her finner du relevant innkjøpsinformasjon.',
      links: [
        { href: '/olivenolje-for-restauranter', label: 'Guide for restauranter' },
        { href: '/produkter', label: 'Andre Doña Anna-produkter' },
      ],
    },
    'mesa-gordal-noble': {
      heading: 'Et eget produktspor',
      intro: 'Mesa · Gordal Noble er under utvikling. Les om bordoliven og gården mens produktet klargjøres.',
      links: [
        { href: '/bordoliven-fra-biar', label: 'Guide om bordoliven' },
        { href: '/om-dona-anna', label: 'Historien fra Biar' },
      ],
    },
  };
  const journey = readingJourneys[page.slug];
  const relatedJourney = journey
    ? '<section class="related-journey" aria-label="Anbefalt videre lesning">' +
      '<p class="related-kicker">Utforsk videre</p><h2>' + escapeHtml(journey.heading) + '</h2>' +
      '<p>' + escapeHtml(journey.intro) + '</p><ul>' +
      journey.links.map(item => '<li><a href="' + escapeHtml(item.href) + '">' + escapeHtml(item.label) + ' →</a></li>').join('') +
      '</ul></section>'
    : '';

  const farmGallery = page.slug === 'om-dona-anna'
    ? '<section class="farm-gallery" aria-label="Bilder fra olivengården i Biar">' +
      '<figure><img loading="lazy" decoding="async" src="https://ereapsfcsqtdmzosgnnn.supabase.co/storage/v1/object/public/content-images/dona-anna/garden-2025/ChatGPT-bilde%2010.%20nov.%202026%2C%2012_18_07.jpg" alt="Gammelt oliventre på gården i Biar"><figcaption>Et av de gamle oliventrærne på gården vår i Biar.</figcaption></figure>' +
      '<figure><img loading="lazy" decoding="async" src="https://ereapsfcsqtdmzosgnnn.supabase.co/storage/v1/object/public/content-images/dona-anna/garden-2025/ChatGPT-bilde%2010.%20nov.%202026%2C%2012_19_18.jpg" alt="Oliven i ulike modningsstadier på Doña Anna-gården"><figcaption>Olivenene endrer farge gjennom modningen.</figcaption></figure>' +
      '</section>'
    : '';

  const css = `
    :root{--ink:#0d0d0d;--paper:#f4efe3;--gold:#9a741d;--gold2:#d4af37;--line:rgba(30,24,15,.14);--muted:#6b6255}
    *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:#191713;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.7}
    a{color:inherit}.topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px clamp(20px,5vw,72px);border-bottom:1px solid rgba(255,255,255,.1);background:rgba(13,13,13,.94);color:#fff;backdrop-filter:blur(16px)}
    .brand{font:600 14px Georgia,serif;letter-spacing:.2em;text-decoration:none}.topnav{display:flex;flex-wrap:wrap;gap:18px;font-size:12px;text-transform:uppercase;letter-spacing:.12em}.topnav a{color:#d8d0c1;text-decoration:none}.topnav a:hover{color:#fff}.mobile-nav{display:none}.mobile-nav summary{cursor:pointer;list-style:none;border:1px solid rgba(255,255,255,.28);padding:9px 13px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.12em}.mobile-nav summary::-webkit-details-marker{display:none}.mobile-nav[open] summary{border-color:var(--gold2)}.mobile-nav-links{position:absolute;top:100%;right:0;left:0;display:grid;gap:0;padding:12px 20px 20px;background:#0d0d0d;border-bottom:1px solid rgba(212,175,55,.3);box-shadow:0 20px 35px rgba(0,0,0,.24)}.mobile-nav-links a{display:block;padding:12px 8px;color:#fff;text-decoration:none;font-size:14px;border-bottom:1px solid rgba(255,255,255,.1)}
    .hero{background:radial-gradient(circle at 78% 20%,rgba(212,175,55,.18),transparent 28rem),var(--ink);color:#fff;padding:clamp(64px,9vw,128px) clamp(20px,7vw,96px)}
    .hero-inner{max-width:1120px;margin:auto}.eyebrow{color:var(--gold2);font-size:12px;font-weight:800;letter-spacing:.24em;text-transform:uppercase}.hero h1{max-width:900px;margin:18px 0 0;font:600 clamp(44px,7vw,84px)/.98 Georgia,serif;letter-spacing:-.035em}.lead{max-width:780px;margin:28px 0 0;color:#d7d0c4;font-size:clamp(18px,2.1vw,24px)}
    .actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}.button{display:inline-flex;min-height:48px;align-items:center;padding:0 20px;text-decoration:none;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.14em}.primary{background:var(--gold2);color:#111}.secondary{border:1px solid rgba(255,255,255,.2);color:#fff}
    .product-identity{display:grid;grid-template-columns:minmax(220px,.65fr) minmax(0,1.35fr);max-width:1120px;margin:0 auto;padding:42px clamp(20px,5vw,54px);gap:34px;align-items:stretch}.product-mark{min-height:350px;display:flex;align-items:center;justify-content:center;background:#e9e1cf;border:1px solid rgba(30,24,15,.12)}.product-mark img{width:150px;height:250px;object-fit:contain;filter:invert(1)}.product-copy{padding:10px 0}.product-kicker{margin:0;color:#8a6a19;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.22em}.product-copy h2{margin:8px 0 2px;font:600 clamp(34px,5vw,58px)/1 Georgia,serif}.product-type{margin:0 0 24px;color:#655d51}.product-copy dl{display:grid;gap:0;margin:0;border-top:1px solid var(--line)}.product-copy dl div{display:grid;grid-template-columns:110px 1fr;gap:18px;padding:14px 0;border-bottom:1px solid var(--line)}.product-copy dt{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.14em;color:#8a6a19}.product-copy dd{margin:0;color:#463f35}.product-note{margin-top:20px;padding:16px 18px;background:#fff;border:1px solid var(--line);color:#655d51;font-size:14px}
    .product-hub{max-width:1120px;margin:0 auto;padding:42px clamp(20px,5vw,54px) 10px}.product-hub-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.product-hub-card{display:flex;flex-direction:column;min-height:430px;padding:20px;border:1px solid var(--line);background:#fff}.product-hub-mark{height:150px;display:flex;align-items:center;justify-content:center;background:#e9e1cf}.product-hub-mark img{width:80px;height:130px;object-fit:contain;filter:invert(1)}.product-hub-type{margin:18px 0 0;color:#8a6a19;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.16em}.product-hub-card h2{margin:6px 0 0;font:600 30px/1.05 Georgia,serif}.product-hub-card h2 a{text-decoration:none}.product-hub-role{margin:10px 0 0;color:#514a40}.product-hub-status{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--line);font-size:13px;color:#746b5e}.product-hub-actions{display:flex;flex-wrap:wrap;gap:10px 14px;margin-top:auto;padding-top:18px}.product-hub-actions a{color:#705515;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;text-underline-offset:3px}
    .related-journey{margin:0 0 46px;padding:28px 30px;border:1px solid var(--line);background:#fff}.related-journey h2{font:600 clamp(28px,3vw,40px)/1.1 Georgia,serif;margin:8px 0 12px}.related-journey p{color:#514a40}.related-journey .related-kicker{color:#886718;text-transform:uppercase;font-size:11px;font-weight:800;letter-spacing:.18em}.related-journey ul{display:grid;gap:10px;padding-left:20px}.related-journey li a{color:#705515;text-underline-offset:3px}\n    .farm-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;max-width:1120px;margin:42px auto 0;padding:0 clamp(20px,5vw,54px)}.farm-gallery figure{margin:0;background:#fff;border:1px solid var(--line)}.farm-gallery img{display:block;width:100%;height:340px;object-fit:cover}.farm-gallery figcaption{padding:14px 17px;font-size:14px;color:#554e43}
    main{max-width:1120px;margin:auto;padding:clamp(52px,7vw,88px) clamp(20px,5vw,54px)}.article-grid{display:grid;grid-template-columns:minmax(0,1fr) 290px;gap:clamp(36px,7vw,86px);align-items:start}.article-section{padding:0 0 46px;border-bottom:1px solid var(--line);margin-bottom:46px}.article-section h2,.faq h2,.next h2{font:600 clamp(30px,4vw,48px)/1.08 Georgia,serif;margin:0 0 18px}.article-section p{font-size:17px;color:#4f493f}.aside{position:sticky;top:92px;border:1px solid var(--line);background:#fff;padding:24px}.aside strong{display:block;font:600 24px Georgia,serif}.aside nav{display:grid;gap:12px;margin-top:18px}.aside a{color:#705515;text-underline-offset:3px}
    .faq{padding:20px 0 58px}.faq details{border-top:1px solid var(--line);padding:18px 0}.faq details:last-child{border-bottom:1px solid var(--line)}.faq summary{cursor:pointer;font-weight:800}.faq details p{color:#554e43}
    .next{margin-top:16px;padding:34px;background:#15120e;color:#fff}.next p{color:#cfc6b6;max-width:720px}.next .button{margin-top:10px}.cluster{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:26px}.cluster a{color:#d4af37}
    .author{margin-top:46px;padding-top:24px;border-top:1px solid var(--line);color:#655d51;font-size:14px}.footer{padding:30px clamp(20px,5vw,72px);background:#0d0d0d;color:#8f8678;font-size:12px}.footer a{color:#c8b477;margin-right:14px;white-space:nowrap}
    @media(max-width:820px){.topnav{display:none}.mobile-nav{display:block}.article-grid{grid-template-columns:1fr}.aside{position:static}.hero{padding-top:74px}.hero h1{font-size:clamp(38px,11vw,62px);overflow-wrap:anywhere}.lead{font-size:18px;line-height:1.55}.product-identity{grid-template-columns:1fr}.product-mark{min-height:280px}.product-copy dl div{grid-template-columns:1fr;gap:4px}.farm-gallery{grid-template-columns:1fr}.farm-gallery img{height:auto;max-height:420px}}
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
    '<header class="topbar"><a class="brand" href="/">DOÑA ANNA</a><nav class="topnav" aria-label="Hovedmeny"><a href="/produkter">Produkter</a><a href="/guider">Guider</a><a href="/magasin">Magasin</a><a href="/om-dona-anna">Om oss</a><a href="/#tasting">Kontakt</a></nav><details class="mobile-nav"><summary>☰ Meny</summary><nav class="mobile-nav-links" aria-label="Mobilmeny"><a href="/produkter">Produkter</a><a href="/guider">Guider</a><a href="/magasin">Magasin</a><a href="/om-dona-anna">Om oss</a><a href="/#tasting">Kontakt</a></nav></details></header>' +
    '<section class="hero"><div class="hero-inner"><p class="eyebrow">' + escapeHtml(page.eyebrow) + '</p><h1>' + escapeHtml(page.h1) + '</h1><p class="lead">' + escapeHtml(page.answer) + '</p><div class="actions"><a class="button primary" href="' + escapeHtml(page.primaryCta.href) + '">' + escapeHtml(page.primaryCta.label) + '</a><a class="button secondary" href="/magasin">Les magasinet</a></div></div></section>' +
    productIdentity +
    farmGallery +
    productHub +
    '<main><div class="article-grid"><article>' + sections + relatedJourney +
    (faq ? '<section class="faq"><h2>Vanlige spørsmål</h2>' + faq + '</section>' : '') +
    '<section class="next"><h2>Neste steg</h2><p>Se riktig produkt, les mer om gården eller meld interesse dersom du vurderer Doña Anna for restaurant, hotell, butikk eller import.</p><a class="button primary" href="' + escapeHtml(page.primaryCta.href) + '">' + escapeHtml(page.primaryCta.label) + '</a><div class="cluster"><a href="/produkter">Alle produkter</a><a href="/verde-vivo">Verde Vivo</a><a href="/verde-alto">Verde Alto</a><a href="/raiz-antigua">Raíz Antigua</a><a href="/cocina-viva">Cocina Viva</a><a href="/mesa-gordal-noble">Mesa · Gordal Noble</a></div></section>' +
    '<section class="faq"><h2>Les også fra Doña Anna</h2><ul><li><a href="/artikler/hvordan-velge-god-olivenolje">Slik velger du god olivenolje</a></li><li><a href="/magasin/tidlig-hostet-olivenolje-biar">Tidlig høstet olivenolje fra Biar</a></li><li><a href="/magasin/oppbevaring-av-olivenolje">Slik oppbevarer du olivenolje</a></li></ul></section>' +
    '<p class="author">Innhold fra Doña Anna. <a href="/om-dona-anna">Anna og Freddy Bremseth driver prosjektet sammen.</a></p></article>' +
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
