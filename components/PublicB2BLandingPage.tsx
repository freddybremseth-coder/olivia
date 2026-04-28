import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
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
import { createB2BTastingRequest } from '../services/b2bTasting';
import { fetchCommerceProducts } from '../services/commerceProducts';
import { fetchPublicEstateSignal, PublicEstateSignal } from '../services/publicEstate';
import { CommerceProduct } from '../types';

interface LandingPageProps {
  onLogin: () => void;
  onAdminLogin: () => void;
  onRegister: () => void;
}

type Locale = 'no' | 'es' | 'en';

const icons = [SunMedium, Leaf, Sprout, Trees];

const content = {
  no: {
    languageName: 'Norsk',
    nav: [
      ['Gården', '#estate'],
      ['Etiketten', '#label'],
      ['Kolleksjonen', '#portfolio'],
      ['Kvalitet', '#knowledge'],
      ['Sporbarhet', '#traceability'],
      ['Produktdata', '#specs'],
      ['Smaksprøve', '#tasting'],
    ],
    menuLabel: 'Meny',
    qrReady: 'QR-klar',
    batchLabel: 'Batchpass',
    videoCards: [
      ['Flaske', 'Etikett, glass, tilstedeværelse'],
      ['Kjøkken', 'Service, tempo, trygghet'],
    ],
    hero: {
      eyebrow: 'Økologisk extra virgin olivenolje · Biar, Alicante',
      headline: 'En flaske som gir restauranten en historie å servere.',
      subhead: 'Doña Anna er tidlig høstet olivenolje og bordoliven fra våre lunder i Biar. For kokker, innkjøpere og gourmetkunder som vil ha smak, opprinnelse og et uttrykk som løfter bordet før første dråpe.',
      primary: 'Bestill tasting kit',
      secondary: 'Se kolleksjonen',
    },
    portal: 'B2B portal',
    admin: 'Olivia OS',
    heroStats: ['Opprinnelse', 'Parseller', 'Trær', 'Sporbarhet'],
    estate: {
      eyebrow: 'Fra Biar til bordet',
      title: 'Ekte middelhavsterroir, pakket som moderne luksus.',
      text: 'I Biar gir kalkholdig jord, tørre somre og kjølige netter oliven med grønn fruktighet, bitterhet og struktur. Doña Anna kombinerer gamle trær, presis høsting og et visuelt språk som gjør produktet lett å anbefale til gjesten.',
      cta: 'Be om smaksprøve',
      secondary: 'Se QR-sporingen',
      cards: [
        ['Biar-terroir', 'En tydelig opprinnelse som gir kokken en konkret historie å fortelle ved bordet.'],
        ['Fire sorter', 'Genovesa, Gordal, Changlot Real og Picual gir en portefølje med bredde og karakter.'],
        ['Tidlig høsting', 'Lavere utbytte, høyere intensitet og en frisk grønn profil som merkes i retten.'],
        ['Gamle trær', 'Raíz Antigua gir knapphet, dybde og et mer emosjonelt premiumprodukt.'],
      ],
    },
    label: {
      eyebrow: 'Etiketten',
      title: 'Det kunden ser først, må føles verdt å smake.',
      text: 'Etiketten er bygget som et kvalitetssignal: mørkt glass, kremhvit flate, kontrollert typografi og metalliske aksenter som skiller hvert nivå. Resultatet er en flaske som ser hjemme ut på hvit duk, i vinbar, i gourmetbutikk og på kokkens pass.',
      cta: 'Utforsk produktnivåene',
      proof: 'DA-monogrammet, produktnavnet og Biar/Alicante ligger i et rolig system som gjør flasken lett å kjenne igjen i hyllen.',
      details: [
        ['Platina', 'Verde Vivo og monovarietal får et kjølig, friskt og super-premium uttrykk.'],
        ['Kobber', 'Raíz Antigua får varme, arv og dybde uten å miste elegansen.'],
        ['Gull', 'Verde Alto får klassisk premiumfølelse med tydelig kommersiell appell.'],
        ['Terrakotta', 'Mesa skilles fra oljene og peker mot spansk aperitivo og bordkultur.'],
      ],
    },
    videos: {
      eyebrow: 'I bruk',
      title: 'Vis produktet slik kunden faktisk møter det.',
      text: 'Kunder kjøper ikke bare analyseverdier. De kjøper følelsen av flasken på bordet, lyden av korken, oljen over retten og tryggheten i at produktet holder nivået hver gang.',
    },
    portfolioIntro: {
      eyebrow: 'Kolleksjonen',
      title: 'Fem tydelige roller, én gjenkjennelig premiumfamilie.',
      text: 'Hver variant har sin egen etikettkode, målgruppe og salgsrolle. Det gjør det enklere for restauranter, distributører og butikker å velge riktig produkt uten å miste Doña Annas samlede identitet.',
    },
    knowledge: {
      eyebrow: 'Kvalitet som kan forklares',
      title: 'Smaken er salgsargumentet. Dokumentasjonen lukker avtalen.',
      text: 'Premium extra virgin olivenolje skal være vakker på bordet, men også enkel å forsvare faglig. Derfor knyttes sensorikk, høstedato, sort, ekstraksjon og batchdata til produktet.',
      qualityTitle: 'Derfor merkes forskjellen',
      qualityText: 'Kokken får en olje som er forutsigbar på tallerkenen: friskhet, bitterhet, pepperfinish og opprinnelse som kan presenteres til gjesten.',
    },
    journey: {
      eyebrow: 'Fra lund til kjøkken',
      title: 'Hvert steg bygger argumentet for premiumpris.',
      text: 'Når kunden spør hvorfor Doña Anna koster mer, skal svaret være enkelt: tidligere høsting, raskere prosess, bedre sporbarhet og et produkt som skaper verdi i serveringen.',
    },
    trace: {
      title: 'Transparencia Total',
      heading: 'Fra jord til bord, dokumentert på flasken.',
      text: 'QR-sporingen gjør hver flaske til en salgshistorie. Kjøkkensjefen kan vise høstedato, parsell, sort, sensorisk profil og analyseverdier direkte fra batchen.',
      features: ['QR-batchside', 'Analysebevis', 'Høstevindu', 'Klar restaurantfortelling'],
      cardTitle: 'Verde Vivo · tidlig høst',
      foot: 'Sporbarhet gir trygghet for innkjøperen og en bedre historie for servitøren, som kan forklare hvorfor oljen fortjener plassen på bordet.',
    },
    band: {
      eyebrow: 'For restauranter og innkjøpere',
      title: 'Smak før dere bestemmer dere.',
      text: 'Vi setter sammen en B2B-smakspakke med produktark, etikettoversikt og utvalgte produkter fra kolleksjonen.',
    },
    specs: {
      eyebrow: 'Produktdata',
      title: 'Tekniske data som gjør innkjøpet enklere.',
      text: 'Doña Anna samler de fakta profesjonelle kjøpere trenger: format, høstedato, sort, batchnummer, analyseverdier og serveringsrolle.',
    },
    tasting: {
      eyebrow: 'Smaksprøve',
      title: 'Bestill en eksklusiv smaksprøve for restaurant, butikk eller distributør.',
      text: 'Tasting kit gir en rask, konkret opplevelse av Doña Anna: etikett, smak, story, produktark og batchsporbarhet i samme pakke.',
      productSheet: 'Be om produktark',
      login: 'B2B-login',
      company: 'Restaurant / firma',
      role: 'Rolle',
      rolePlaceholder: 'Kokk / innkjøper / distributør',
      email: 'E-post',
      address: 'Leveringsadresse',
      sending: 'Sender...',
      success: 'Takk. Forespørselen er registrert, og Doña Anna kan følge opp med tasting kit.',
      error: 'Skjemaet er klart, men Supabase må være konfigurert før forespørsler kan lagres automatisk.',
    },
    footerPortal: 'B2B portal',
  },
  es: {
    languageName: 'Español',
    nav: [
      ['Finca', '#estate'],
      ['Etiqueta', '#label'],
      ['Colección', '#portfolio'],
      ['Calidad', '#knowledge'],
      ['Trazabilidad', '#traceability'],
      ['Ficha técnica', '#specs'],
      ['Cata', '#tasting'],
    ],
    menuLabel: 'Menú',
    qrReady: 'QR listo',
    batchLabel: 'Pasaporte de lote',
    videoCards: [
      ['Botella', 'Etiqueta, vidrio, presencia'],
      ['Cocina', 'Servicio, ritmo, confianza'],
    ],
    hero: {
      eyebrow: 'Aceite de oliva virgen extra ecológico · Biar, Alicante',
      headline: 'Una botella que da a la mesa una historia que servir.',
      subhead: 'Doña Anna nace de nuestros olivares en Biar: cosecha temprana, aceitunas de mesa y una presencia visual creada para chefs, compradores y tiendas gourmet que buscan sabor, origen y diferenciación.',
      primary: 'Solicitar tasting kit',
      secondary: 'Ver colección',
    },
    portal: 'Portal B2B',
    admin: 'Olivia OS',
    heroStats: ['Origen', 'Parcelas', 'Árboles', 'Trazabilidad'],
    estate: {
      eyebrow: 'De Biar a la mesa',
      title: 'Terroir mediterráneo real, presentado como lujo contemporáneo.',
      text: 'En Biar, el suelo calizo, los veranos secos y las noches frescas dan aceitunas con fruta verde, amargor y estructura. Doña Anna une árboles antiguos, cosecha precisa y una imagen que facilita recomendar el producto al comensal.',
      cta: 'Solicitar muestra',
      secondary: 'Ver trazabilidad QR',
      cards: [
        ['Terroir de Biar', 'Un origen claro que el chef puede contar con seguridad en la sala.'],
        ['Cuatro variedades', 'Genovesa, Gordal, Changlot Real y Picual crean una gama con amplitud y carácter.'],
        ['Cosecha temprana', 'Menor rendimiento, más intensidad y un perfil verde que se nota en el plato.'],
        ['Árboles antiguos', 'Raíz Antigua aporta escasez, profundidad y emoción premium.'],
      ],
    },
    label: {
      eyebrow: 'La etiqueta',
      title: 'Lo primero que ve el cliente debe parecer digno de probarse.',
      text: 'La etiqueta funciona como señal de calidad: vidrio negro mate, papel crema, tipografía controlada y acentos metálicos que diferencian cada nivel. La botella encaja en mantel blanco, wine bar, tienda gourmet y cocina profesional.',
      cta: 'Explorar niveles',
      proof: 'El monograma DA, el nombre del producto y Biar/Alicante forman un sistema sereno y reconocible en lineal, carta o mesa.',
      details: [
        ['Platino', 'Verde Vivo y monovarietales transmiten frescura, precisión y super-premium.'],
        ['Cobre', 'Raíz Antigua suma herencia, calidez y profundidad sin perder elegancia.'],
        ['Oro', 'Verde Alto ofrece lujo clásico con atractivo comercial inmediato.'],
        ['Terracota', 'Mesa se separa de los aceites y conecta con el aperitivo español.'],
      ],
    },
    videos: {
      eyebrow: 'En uso',
      title: 'Mostrar el producto como el cliente lo vivirá.',
      text: 'El comprador no adquiere solo análisis. Compra la presencia de la botella, el gesto de servir, el aceite sobre el plato y la confianza de que el producto mantiene el nivel.',
    },
    portfolioIntro: {
      eyebrow: 'Colección',
      title: 'Cinco roles claros, una sola familia premium.',
      text: 'Cada variante tiene su código visual, público y argumento comercial. Así restaurantes, distribuidores y tiendas pueden elegir mejor sin perder la identidad Doña Anna.',
    },
    knowledge: {
      eyebrow: 'Calidad explicable',
      title: 'El sabor vende. La documentación cierra la compra.',
      text: 'Un virgen extra premium debe verse impecable en la mesa y ser fácil de defender técnicamente. Por eso la sensorialidad, cosecha, variedad, extracción y lote acompañan al producto.',
      qualityTitle: 'Por qué se nota la diferencia',
      qualityText: 'El chef recibe un aceite predecible en el plato: frescor, amargor, final picante y origen claro para presentar al comensal.',
    },
    journey: {
      eyebrow: 'Del olivar a la cocina',
      title: 'Cada paso justifica el valor premium.',
      text: 'Cuando el cliente pregunta por qué Doña Anna vale más, la respuesta debe ser sencilla: cosecha más temprana, proceso más rápido, mejor trazabilidad y más valor en el servicio.',
    },
    trace: {
      title: 'Transparencia Total',
      heading: 'De la tierra a la mesa, documentado en la botella.',
      text: 'La trazabilidad QR convierte cada botella en una historia de venta. El chef puede enseñar fecha de cosecha, parcela, variedad, perfil sensorial y análisis del lote.',
      features: ['Página QR del lote', 'Certificado analítico', 'Ventana de cosecha', 'Historia lista para sala'],
      cardTitle: 'Verde Vivo · cosecha temprana',
      foot: 'La trazabilidad da confianza al comprador y una mejor historia al equipo de sala para explicar por qué el aceite merece estar en la mesa.',
    },
    band: {
      eyebrow: 'Para restaurantes y compradores',
      title: 'Probar antes de decidir.',
      text: 'Preparamos un tasting kit B2B con ficha de producto, guía de etiqueta y una selección de la colección.',
    },
    specs: {
      eyebrow: 'Ficha técnica',
      title: 'Datos técnicos que facilitan la compra.',
      text: 'Doña Anna reúne la información que necesita un comprador profesional: formato, fecha de cosecha, variedad, lote, análisis y rol de servicio.',
    },
    tasting: {
      eyebrow: 'Cata',
      title: 'Solicita una muestra exclusiva para restaurante, tienda o distribuidor.',
      text: 'El tasting kit ofrece una experiencia directa: etiqueta, sabor, relato, ficha técnica y trazabilidad por lote en una misma entrega.',
      productSheet: 'Pedir ficha técnica',
      login: 'Acceso B2B',
      company: 'Restaurante / empresa',
      role: 'Rol',
      rolePlaceholder: 'Chef / comprador / distribuidor',
      email: 'Email',
      address: 'Dirección de entrega',
      sending: 'Enviando...',
      success: 'Gracias. La solicitud está registrada y Doña Anna podrá preparar el tasting kit.',
      error: 'El formulario está listo, pero Supabase debe estar configurado para guardar solicitudes automáticamente.',
    },
    footerPortal: 'Portal B2B',
  },
  en: {
    languageName: 'English',
    nav: [
      ['Estate', '#estate'],
      ['Label', '#label'],
      ['Collection', '#portfolio'],
      ['Quality', '#knowledge'],
      ['Traceability', '#traceability'],
      ['Specs', '#specs'],
      ['Tasting kit', '#tasting'],
    ],
    menuLabel: 'Menu',
    qrReady: 'QR ready',
    batchLabel: 'Batch passport',
    videoCards: [
      ['Bottle', 'Label, glass, presence'],
      ['Kitchen', 'Service, pace, confidence'],
    ],
    hero: {
      eyebrow: 'Organic extra virgin olive oil · Biar, Alicante',
      headline: 'A bottle that gives your table a story worth serving.',
      subhead: 'Doña Anna brings early-harvest estate oil and table olives from Biar to restaurants, distributors and gourmet buyers who need flavor, provenance and a premium signal guests notice immediately.',
      primary: 'Request tasting kit',
      secondary: 'View collection',
    },
    portal: 'B2B portal',
    admin: 'Olivia OS',
    heroStats: ['Origin', 'Parcels', 'Trees', 'Traceability'],
    estate: {
      eyebrow: 'From Biar to the table',
      title: 'Real Mediterranean terroir, presented as contemporary luxury.',
      text: 'Biar gives us limestone soil, dry summers and cool nights. The result is olive fruit with green aromatics, bitterness and structure, wrapped in a brand language that makes the product easy to recommend.',
      cta: 'Request sample',
      secondary: 'View QR traceability',
      cards: [
        ['Biar terroir', 'A clear origin chefs can turn into a confident table-side story.'],
        ['Four varieties', 'Genovesa, Gordal, Changlot Real and Picual create range and character.'],
        ['Early harvest', 'Lower yield, higher intensity and a green profile that shows in the dish.'],
        ['Old trees', 'Raíz Antigua adds scarcity, depth and a more emotional premium cue.'],
      ],
    },
    label: {
      eyebrow: 'The label',
      title: 'What customers see first must feel worth tasting.',
      text: 'The label is a quality signal: matte black glass, cream paper, disciplined typography and metallic accents that distinguish each tier. The bottle belongs on white tablecloths, wine bars, gourmet shelves and the chef’s pass.',
      cta: 'Explore product tiers',
      proof: 'The DA monogram, product name and Biar/Alicante mark create a calm system that is instantly recognizable on shelf, menu and table.',
      details: [
        ['Platinum', 'Verde Vivo and monovarietals feel cool, fresh and super-premium.'],
        ['Copper', 'Raíz Antigua brings heritage, warmth and depth without losing elegance.'],
        ['Gold', 'Verde Alto delivers classic premium appeal with commercial clarity.'],
        ['Terracotta', 'Mesa stands apart from the oils and points to Spanish aperitivo culture.'],
      ],
    },
    videos: {
      eyebrow: 'In service',
      title: 'Show the product the way customers will experience it.',
      text: 'Buyers do not purchase lab values alone. They buy the bottle on the table, the pour over the dish and the confidence that the product performs every time.',
    },
    portfolioIntro: {
      eyebrow: 'Collection',
      title: 'Five clear roles, one recognizable premium family.',
      text: 'Each variant has its own label code, audience and sales role. Restaurants, distributors and retailers can choose the right product without losing the Doña Anna identity.',
    },
    knowledge: {
      eyebrow: 'Quality buyers can understand',
      title: 'Flavor sells. Documentation closes the deal.',
      text: 'Premium extra virgin olive oil has to look beautiful on the table and be easy to defend professionally. Sensory profile, harvest date, variety, extraction and batch data travel with the product.',
      qualityTitle: 'Why the difference is visible',
      qualityText: 'Chefs get a predictable oil on the plate: freshness, bitterness, peppery finish and origin that can be explained to the guest.',
    },
    journey: {
      eyebrow: 'From grove to kitchen',
      title: 'Every step supports the premium price.',
      text: 'When a buyer asks why Doña Anna costs more, the answer is simple: earlier harvest, faster handling, stronger traceability and more value in service.',
    },
    trace: {
      title: 'Total Transparency',
      heading: 'From soil to table, documented on the bottle.',
      text: 'QR traceability turns every bottle into a sales story. The chef can show harvest date, parcel, variety, sensory profile and batch analysis.',
      features: ['QR batch page', 'Lab certificate', 'Harvest window', 'Chef-ready story'],
      cardTitle: 'Verde Vivo · early harvest',
      foot: 'Traceability gives buyers confidence and gives service teams a better story when explaining why the oil deserves its place on the table.',
    },
    band: {
      eyebrow: 'For restaurants and buyers',
      title: 'Taste before you decide.',
      text: 'We can prepare a B2B tasting kit with product sheets, label guidance and selected products from the collection.',
    },
    specs: {
      eyebrow: 'Product data',
      title: 'Technical details that make buying easier.',
      text: 'Doña Anna brings together the facts professional buyers need: format, harvest date, variety, batch number, analysis and service role.',
    },
    tasting: {
      eyebrow: 'Tasting kit',
      title: 'Request an exclusive sample for your restaurant, store or distribution portfolio.',
      text: 'The tasting kit gives buyers a direct first experience: label, flavor, story, product sheet and batch traceability in one package.',
      productSheet: 'Request product sheet',
      login: 'B2B login',
      company: 'Restaurant / company',
      role: 'Role',
      rolePlaceholder: 'Chef / buyer / distributor',
      email: 'Email',
      address: 'Delivery address',
      sending: 'Sending...',
      success: 'Thank you. The request has been registered and Doña Anna can follow up with a tasting kit.',
      error: 'The form is ready, but Supabase must be configured before requests can be saved automatically.',
    },
    footerPortal: 'B2B portal',
  },
};

const portfolio = {
  no: [
    ['Verde Vivo', 'Nivå 1 · Super-premium', 'Kremhvit etikett · platinafolie', '#E5E4E2', 'DOÑA ANNA · VERDE VIVO', '500 ml · Cosecha Temprana I', 'Intens avslutningsolje', '/donaanna/product-design/verde-vivo-estate-arches.jpg', 'For restauranter som vil ha en signaturolje ved bordet. Intens grønn fruktighet, tydelig bitterhet og lang pepperfinish gjør den minneverdig på brød, tomat, fisk og grønnsaker.'],
    ['Raíz Antigua', 'Nivå 2 · Heritage premium', 'Strukturert bomullspapir · kobber', '#B87333', 'DOÑA ANNA · RAÍZ ANTIGUA', '500 ml · gamle trær', 'Utvalg fra gamle trær', '/donaanna/product-design/raiz-antigua-label-hero.jpg', 'En begrenset seleksjon med varmere dybde og arv. Perfekt for menyer, gavepakker og serveringssteder som ønsker et produkt med mer emosjonell historie.'],
    ['Verde Alto', 'Nivå 3 · Classic premium', 'Lett kremetikett · børstet gull', '#D4AF37', 'DOÑA ANNA · VERDE ALTO', '500 ml · Cosecha Temprana II', 'Balansert avslutningsolje', '/donaanna/product-design/verde-alto-rustic-room.jpg', 'Premiumoljen for bredere bruk. Grønn karakter og elegant balanse gjør den enkel å bruke i service, på bordet og i retter der oljen skal støtte råvaren.'],
    ['Monovarietal Collection', 'Nivå 1 · Super-premium', 'Ren kremhvit etikett · sølv', '#C0C0C0', 'DOÑA ANNA · MONOVARIETAL', 'Genovesa · Gordal · Changlot Real · Picual', 'Sortssmaking', '/donaanna/changlot-real.jpg', 'Små batcher for sommelierer, kokker og spesialbutikker som vil vise hvordan sort, jord og høstetidspunkt endrer aroma, bitterhet og struktur.'],
    ['Cocina Viva', 'Nivå 4 · Profesjonelt kjøkken', 'Mattsvart metallkanne · sort/hvitt trykk', '#F9F8F6', 'DOÑA ANNA · COCINA VIVA', '2 L / 5 L · kokkeformat', 'Profesjonell kjøkkenolje', '/donaanna/product-design/cocina-viva-b2b-collage.jpg', 'Arbeidsformatet for profesjonelle kjøkken. Utviklet for volum, mise en place og varme retter, med samme krav til kvalitet og opprinnelse.'],
    ['Mesa', 'Nivå 5 · Bordoliven', 'Mørk terrakotta · lite gullsegl', '#C05A46', 'DOÑA ANNA · MESA', 'Aceitunas de mesa', 'Premium bordoliven', '/donaanna/product-design/portfolio-slate-mesa.jpg', 'Bordoliven som gir en varm inngang til merkevaren. Ideell for aperitivo, bar, hotell, marked og butikker som vil ha spansk følelse i hyllen.'],
  ],
  es: [
    ['Verde Vivo', 'Nivel 1 · Super-premium', 'Etiqueta crema · foil platino', '#E5E4E2', 'DOÑA ANNA · VERDE VIVO', '500 ml · Cosecha Temprana I', 'Aceite final intenso', '/donaanna/product-design/verde-vivo-estate-arches.jpg', 'Para restaurantes que quieren un aceite de firma en la mesa. Fruta verde intensa, amargor claro y final picante largo para pan, tomate, pescado y verduras.'],
    ['Raíz Antigua', 'Nivel 2 · Heritage premium', 'Papel algodón texturizado · cobre', '#B87333', 'DOÑA ANNA · RAÍZ ANTIGUA', '500 ml · árboles antiguos', 'Selección de árboles antiguos', '/donaanna/product-design/raiz-antigua-label-hero.jpg', 'Una selección limitada con profundidad y memoria. Perfecta para menús, regalos y espacios que buscan un producto con historia emocional.'],
    ['Verde Alto', 'Nivel 3 · Classic premium', 'Etiqueta crema clara · oro cepillado', '#D4AF37', 'DOÑA ANNA · VERDE ALTO', '500 ml · Cosecha Temprana II', 'Aceite final equilibrado', '/donaanna/product-design/verde-alto-rustic-room.jpg', 'El aceite premium de uso más amplio. Carácter verde y equilibrio elegante para servicio, mesa y platos donde el aceite acompaña la materia prima.'],
    ['Monovarietal Collection', 'Nivel 1 · Super-premium', 'Etiqueta crema limpia · plata', '#C0C0C0', 'DOÑA ANNA · MONOVARIETAL', 'Genovesa · Gordal · Changlot Real · Picual', 'Cata varietal', '/donaanna/changlot-real.jpg', 'Pequeños lotes para sumilleres, chefs y tiendas que quieren mostrar cómo variedad, suelo y cosecha cambian aroma, amargor y estructura.'],
    ['Cocina Viva', 'Nivel 4 · Cocina profesional', 'Lata negra mate · impresión blanco/negro', '#F9F8F6', 'DOÑA ANNA · COCINA VIVA', '2 L / 5 L · formato chef', 'Aceite profesional de cocina', '/donaanna/product-design/cocina-viva-b2b-collage.jpg', 'El formato de trabajo para cocinas profesionales. Pensado para volumen, mise en place y platos calientes, con control de calidad y origen.'],
    ['Mesa', 'Nivel 5 · Aceitunas de mesa', 'Terracota oscura · pequeño sello oro', '#C05A46', 'DOÑA ANNA · MESA', 'Aceitunas de mesa', 'Aceitunas premium', '/donaanna/product-design/portfolio-slate-mesa.jpg', 'Aceitunas que abren la marca con calidez española. Ideales para aperitivo, bar, hotel, mercado y tienda gourmet.'],
  ],
  en: [
    ['Verde Vivo', 'Tier 1 · Super-premium', 'Cream label · platinum foil', '#E5E4E2', 'DOÑA ANNA · VERDE VIVO', '500 ml · Cosecha Temprana I', 'Intense finishing oil', '/donaanna/product-design/verde-vivo-estate-arches.jpg', 'For restaurants that want a signature oil at the table. Intense green fruit, clear bitterness and a long pepper finish for bread, tomato, fish and vegetables.'],
    ['Raíz Antigua', 'Tier 2 · Heritage premium', 'Textured cotton paper · copper', '#B87333', 'DOÑA ANNA · RAÍZ ANTIGUA', '500 ml · old-tree selection', 'Heritage selection', '/donaanna/product-design/raiz-antigua-label-hero.jpg', 'A limited selection with warmth, depth and heritage. Made for menus, gifting and venues that want a product with a richer emotional story.'],
    ['Verde Alto', 'Tier 3 · Classic premium', 'Light cream label · brushed gold', '#D4AF37', 'DOÑA ANNA · VERDE ALTO', '500 ml · Cosecha Temprana II', 'Balanced finishing oil', '/donaanna/product-design/verde-alto-rustic-room.jpg', 'The premium oil for broader use. Green character and elegant balance make it easy to serve at the table and in dishes where the oil supports the ingredient.'],
    ['Monovarietal Collection', 'Tier 1 · Super-premium', 'Clean cream label · silver', '#C0C0C0', 'DOÑA ANNA · MONOVARIETAL', 'Genovesa · Gordal · Changlot Real · Picual', 'Variety tasting', '/donaanna/changlot-real.jpg', 'Small batches for sommeliers, chefs and specialty stores that want to show how variety, soil and harvest timing change aroma, bitterness and structure.'],
    ['Cocina Viva', 'Tier 4 · Chef utility', 'Matte black tin · black/white print', '#F9F8F6', 'DOÑA ANNA · COCINA VIVA', '2 L / 5 L · chef format', 'Professional kitchen oil', '/donaanna/product-design/cocina-viva-b2b-collage.jpg', 'The working format for professional kitchens. Built for volume, mise en place and warm dishes, with the same focus on quality and origin.'],
    ['Mesa', 'Tier 5 · Table olives', 'Dark terracotta · small gold seal', '#C05A46', 'DOÑA ANNA · MESA', 'Aceitunas de mesa', 'Premium table olives', '/donaanna/product-design/portfolio-slate-mesa.jpg', 'Table olives that introduce the brand with Spanish warmth. Ideal for aperitivo, bars, hotels, markets and gourmet retail.'],
  ],
};

const shared = {
  labelAssets: [
    ['/labels/luxury/dona-anna-monogram-da.svg', 'DA monogram'],
    ['/labels/logo-variants/dona-anna-wordmark.svg', 'Doña Anna wordmark'],
    ['/labels/logo-variants/dona-anna-branch.svg', 'Branch label mark'],
    ['/labels/logo-variants/dona-anna-market-seal.svg', 'Market seal'],
  ],
  palette: [
    ['Matte black', '#0D0D0D'],
    ['Cream white', '#F9F8F6'],
    ['Olive black', '#1A1C19'],
    ['Platinum', '#E5E4E2'],
    ['Copper', '#B87333'],
    ['Gold', '#D4AF37'],
    ['Terracotta', '#C05A46'],
  ],
  videos: [
    ['/donaanna/video/video-av-flasken-klar.mp4', '/donaanna/product-design/verde-vivo-breakfast-collage.jpg'],
    ['/donaanna/video/michelin-chef-uses-dona-anna.mp4', '/donaanna/product-design/cocina-viva-chef.jpg'],
  ],
  knowledgeImages: ['/donaanna/polyphenols.jpg', '/donaanna/regenerative-farming.jpg', '/donaanna/early-harvest.jpg'],
};

const knowledgeCards = {
  no: [
    ['Polyfenolens kraft', 'Naturlige antioksidanter', 'Tidlig høsting kan gi høyere polyfenolnivå. Det skaper bitterhet, pepperfølelse og et tydelig kvalitetssignal for kunden.'],
    ['Regenerativ drift', 'Jord og biodiversitet', 'Dekkvekster, blomster og presis vannforvaltning styrker jordlivet og gjør opprinnelsen mer troverdig.'],
    ['Tidlig høsting', 'Cosecha temprana', 'Lavere utbytte gir mer intens aroma og en grønnere, friskere olje som fungerer spesielt godt som finishing oil.'],
  ],
  es: [
    ['La fuerza del polifenol', 'Antioxidantes naturales', 'La cosecha temprana puede aportar más polifenoles. Eso crea amargor, picor y una señal clara de calidad.'],
    ['Cultivo regenerativo', 'Suelo y biodiversidad', 'Cubiertas vegetales, flores y gestión precisa del agua refuerzan el suelo y hacen más creíble el origen.'],
    ['Cosecha temprana', 'Cosecha temprana', 'Menor rendimiento, más aroma y un aceite más verde y fresco, especialmente eficaz como aceite final.'],
  ],
  en: [
    ['Polyphenol strength', 'Natural antioxidants', 'Early harvest can bring higher polyphenols, creating bitterness, pepper and a clear quality signal for buyers.'],
    ['Regenerative farming', 'Soil and biodiversity', 'Cover crops, flowers and precise water use strengthen the soil and make the origin more credible.'],
    ['Early harvest', 'Cosecha temprana', 'Lower yield creates more aroma and a greener, fresher oil that works especially well as a finishing oil.'],
  ],
};

const specs = {
  no: [
    ['Høsting', 'Tidlig høsting i to passeringer for tydelig intensitet og friskhet'],
    ['Ekstraksjon', 'Mekanisk kald ekstraksjon under 27°C'],
    ['Kvalitet', 'Extra virgin med sensorisk kontroll og analyse per batch'],
    ['Polyfenoler', 'Måles per premiumbatch og kobles til QR-sporing'],
    ['Sorter', 'Genovesa · Gordal · Changlot Real · Picual'],
    ['Formater', '500 ml · 2 L · 5 L · bordoliven'],
  ],
  es: [
    ['Cosecha', 'Cosecha temprana en dos pasadas para intensidad y frescura'],
    ['Extracción', 'Extracción mecánica en frío por debajo de 27°C'],
    ['Calidad', 'Virgen extra con control sensorial y análisis por lote'],
    ['Polifenoles', 'Medidos por lote premium y conectados a la trazabilidad QR'],
    ['Variedades', 'Genovesa · Gordal · Changlot Real · Picual'],
    ['Formatos', '500 ml · 2 L · 5 L · aceitunas de mesa'],
  ],
  en: [
    ['Harvest', 'Early harvest in two passes for clear intensity and freshness'],
    ['Extraction', 'Mechanical cold extraction below 27°C'],
    ['Quality', 'Extra virgin with sensory control and batch analysis'],
    ['Polyphenols', 'Measured by premium batch and connected to QR traceability'],
    ['Varieties', 'Genovesa · Gordal · Changlot Real · Picual'],
    ['Formats', '500 ml · 2 L · 5 L · table olives'],
  ],
};

const timeline = {
  no: [
    ['Høsting', 'Oliven plukkes tidligere for å få mer grønn fruktighet, bitterhet og struktur.'],
    ['Utvalg', 'Parseller og sorter velges etter ønsket rolle i porteføljen.'],
    ['Mølle', 'Rask transport og kald mekanisk ekstraksjon beskytter aroma og friskhet.'],
    ['Batch', 'Analyse, sensorikk og opprinnelse samles før flasken får sin etikett.'],
    ['Servering', 'Kokken får et produkt som er lett å forklare og vakkert å presentere.'],
  ],
  es: [
    ['Cosecha', 'La aceituna se recoge antes para lograr fruta verde, amargor y estructura.'],
    ['Selección', 'Parcelas y variedades se eligen según el rol del producto en la gama.'],
    ['Almazara', 'Transporte rápido y extracción mecánica en frío protegen aroma y frescura.'],
    ['Lote', 'Análisis, sensorialidad y origen se reúnen antes de etiquetar.'],
    ['Servicio', 'El chef recibe un producto fácil de explicar y elegante de presentar.'],
  ],
  en: [
    ['Harvest', 'Olives are picked earlier for green fruit, bitterness and structure.'],
    ['Selection', 'Parcels and varieties are chosen for each product role.'],
    ['Mill', 'Fast transport and cold mechanical extraction protect aroma and freshness.'],
    ['Batch', 'Analysis, sensory profile and origin come together before labeling.'],
    ['Service', 'Chefs receive a product that is easy to explain and beautiful to present.'],
  ],
};

const formatNumber = (value: number) => new Intl.NumberFormat('no-NO').format(value);

function productToPortfolioItem(product: CommerceProduct): string[] {
  const primaryCollection = product.collections[0] || 'Doña Anna';
  return [
    product.name,
    primaryCollection,
    product.labelMaterial || product.collections.join(' · ') || 'Doña Anna product',
    product.accentColor || '#D4AF37',
    `DOÑA ANNA · ${product.name.toUpperCase()}`,
    product.size || product.sku,
    product.channel || product.category || 'Premium product',
    product.imageUrl || '/donaanna/product-design/product-family-studio.jpg',
    product.publicStory || product.description,
  ];
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onAdminLogin }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [locale, setLocale] = useState<Locale>('no');
  const [tastingForm, setTastingForm] = useState({ company: '', contactRole: '', email: '', deliveryAddress: '' });
  const [tastingStatus, setTastingStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [tastingMessage, setTastingMessage] = useState('');
  const [liveProducts, setLiveProducts] = useState<CommerceProduct[]>([]);
  const [signal, setSignal] = useState<PublicEstateSignal>({
    isLive: false,
    parcelCount: 2,
    treeCount: 570,
    activeBatches: 0,
    latestHarvestDate: 'October-November',
    nextTask: 'Sensory evaluation and batch documentation',
    heroMetric: 'Biar, Alicante',
  });

  const t = content[locale];
  const products = liveProducts.length ? liveProducts.map(productToPortfolioItem) : portfolio[locale];

  useEffect(() => {
    fetchPublicEstateSignal().then(setSignal);
    fetchCommerceProducts({ publicOnly: true, fallback: false })
      .then(rows => setLiveProducts(rows.filter(product => product.isPublic !== false)))
      .catch(error => console.warn('[DonaAnna] Kunne ikke hente produktkatalog', error));
  }, []);

  const setField = (field: keyof typeof tastingForm, value: string) => {
    setTastingForm(prev => ({ ...prev, [field]: value }));
    if (tastingStatus !== 'idle') {
      setTastingStatus('idle');
      setTastingMessage('');
    }
  };

  const submitTastingRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTastingStatus('submitting');
    setTastingMessage('');
    try {
      await createB2BTastingRequest({ ...tastingForm, locale });
      setTastingStatus('success');
      setTastingMessage(t.tasting.success);
      setTastingForm({ company: '', contactRole: '', email: '', deliveryAddress: '' });
    } catch {
      setTastingStatus('error');
      setTastingMessage(t.tasting.error);
    }
  };

  const nextLocale: Locale = locale === 'no' ? 'es' : locale === 'es' ? 'en' : 'no';

  return (
    <div className="min-h-screen bg-matte-black font-sans font-light tracking-[0.015em] text-cream-white selection:bg-brushed-gold/30">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-matte-black/86 px-4 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <a href="#top" className="flex items-center gap-3">
            <img src="/labels/luxury/dona-anna-monogram-da.svg" alt="Doña Anna DA monogram" className="h-10 w-10 object-contain" />
            <div>
              <p className="font-serif text-sm font-medium leading-none tracking-[0.38em]">DOÑA ANNA</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-brushed-gold">Biar · Alicante</p>
            </div>
          </a>
          <div className="hidden items-center gap-6 md:flex">
            {t.nav.map(([label, href]) => (
              <a key={href} href={href} className="text-xs uppercase tracking-[0.18em] text-white/62 transition hover:text-white">
                {label}
              </a>
            ))}
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <button onClick={() => setLocale(nextLocale)} className="inline-flex h-10 items-center gap-2 border border-white/12 px-3 text-xs uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/8" aria-label={`Change language to ${content[nextLocale].languageName}`}>
              <Languages size={15} /> {locale.toUpperCase()}
            </button>
            <button onClick={onAdminLogin} className="inline-flex h-10 items-center gap-2 border border-white/12 px-3 text-xs uppercase tracking-[0.18em] text-white/70 transition hover:bg-white/8">
              <LockKeyhole size={15} /> {t.admin}
            </button>
            <button onClick={onLogin} className="inline-flex h-10 items-center gap-2 bg-white px-4 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-brushed-gold">
              {t.portal}
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label={t.menuLabel}>
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <div className="mx-auto max-w-7xl border-t border-white/10 py-4 md:hidden">
            {t.nav.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="block py-3 text-sm uppercase tracking-[0.2em] text-white/78">
                {label}
              </a>
            ))}
            <div className="mt-3 flex gap-2">
              <button onClick={() => setLocale(nextLocale)} className="flex-1 border border-white/12 px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-white">
                {content[nextLocale].languageName}
              </button>
              <button onClick={onLogin} className="flex-1 bg-white px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.2em] text-black">
                {t.portal}
              </button>
            </div>
          </div>
        )}
      </nav>

      <header id="top" className="relative min-h-screen overflow-hidden">
        <img src="/donaanna/product-design/product-family-studio.jpg" alt="Doña Anna label and bottle family" className="absolute inset-0 h-full w-full object-cover opacity-58" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,13,13,.98),rgba(13,13,13,.76),rgba(13,13,13,.28)),linear-gradient(0deg,rgba(13,13,13,.98),transparent_42%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-end px-5 pb-12 pt-28 md:px-8">
          <div className="max-w-4xl animate-in fade-in duration-700">
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.32em] text-brushed-gold">{t.hero.eyebrow}</p>
            <h1 className="font-serif text-5xl font-normal leading-[0.95] tracking-normal md:text-7xl">{t.hero.headline}</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/74 md:text-xl">{t.hero.subhead}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-brushed-gold px-6 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-white">
                {t.hero.primary} <ArrowRight size={17} />
              </a>
              <a href="#portfolio" className="inline-flex h-12 items-center justify-center gap-2 border border-white/18 px-6 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/8">
                {t.hero.secondary}
              </a>
            </div>
          </div>
          <div className="mt-12 grid max-w-5xl grid-cols-2 border border-white/12 bg-black/26 backdrop-blur md:grid-cols-4">
            {[
              [t.heroStats[0], signal.heroMetric],
              [t.heroStats[1], formatNumber(signal.parcelCount)],
              [t.heroStats[2], formatNumber(signal.treeCount)],
              [t.heroStats[3], signal.isLive ? `${signal.activeBatches}` : t.qrReady],
            ].map(([label, value]) => (
              <div key={label} className="border-white/12 p-4 odd:border-r md:border-r md:last:border-r-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-brushed-gold">{label}</p>
                <p className="mt-2 font-serif text-xl">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main>
        <section id="estate" className="relative overflow-hidden border-y border-white/10 bg-bottle-black py-24">
          <div className="absolute inset-y-0 right-0 hidden w-1/2 md:block">
            <img src="/donaanna/centenario.jpg" alt="Old olive tree in Biar" className="h-full w-full object-cover opacity-38" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,#111111,rgba(17,17,17,.42),rgba(17,17,17,.72))]" />
          </div>
          <div className="relative mx-auto max-w-7xl px-5 md:px-8">
            <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-brushed-gold">{t.estate.eyebrow}</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.estate.title}</h2>
                <p className="mt-6 text-lg leading-8 text-white/66">{t.estate.text}</p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-brushed-gold px-6 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-white">
                    {t.estate.cta} <ArrowRight size={17} />
                  </a>
                  <a href="#traceability" className="inline-flex h-12 items-center justify-center gap-2 border border-white/18 px-6 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/8">
                    {t.estate.secondary}
                  </a>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {t.estate.cards.map(([title, text], index) => {
                  const Icon = icons[index];
                  return (
                    <article key={title} className="border border-white/10 bg-black/34 p-5 backdrop-blur">
                      <Icon className="text-brushed-gold" size={24} />
                      <h3 className="mt-5 font-serif text-2xl">{title}</h3>
                      <p className="mt-3 text-sm leading-6 text-white/62">{text}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="label" className="border-y border-white/10 bg-[#080808] px-5 py-24 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-brushed-gold">{t.label.eyebrow}</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.label.title}</h2>
              <p className="mt-6 text-lg leading-8 text-white/66">{t.label.text}</p>
              <a href="#portfolio" className="mt-8 inline-flex h-12 items-center justify-center gap-2 bg-brushed-gold px-6 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-white">
                {t.label.cta} <ArrowRight size={17} />
              </a>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {shared.labelAssets.map(([src, alt]) => (
                <div key={src} className="flex min-h-56 items-center justify-center border border-white/10 bg-cream-white p-8">
                  <img src={src} alt={alt} className="max-h-40 w-full object-contain" />
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border border-white/10 bg-olive-black p-6">
              <p className="font-serif text-3xl">{t.label.proof}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {t.label.details.map(([title, text], index) => (
                <article key={title} className="border border-white/10 bg-white/[0.035] p-5">
                  <div className="h-3 w-10 border border-white/20" style={{ backgroundColor: shared.palette[index + 3][1] }} />
                  <h3 className="mt-5 font-serif text-2xl">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/62">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-bottle-black px-5 py-24 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 grid gap-8 md:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-brushed-gold">{t.videos.eyebrow}</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.videos.title}</h2>
              </div>
              <p className="self-end text-lg leading-8 text-white/66">{t.videos.text}</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {shared.videos.map(([src, poster], index) => (
                <article key={src} className="overflow-hidden border border-white/10 bg-black">
                  <video className="aspect-video w-full object-cover" controls muted playsInline preload="metadata" poster={poster}>
                    <source src={src} type="video/mp4" />
                  </video>
                  <div className="p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brushed-gold">{t.videoCards[index][0]}</p>
                    <h3 className="mt-2 font-serif text-3xl">{t.videoCards[index][1]}</h3>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="portfolio" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <div className="mb-12 grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-brushed-gold">{t.portfolioIntro.eyebrow}</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.portfolioIntro.title}</h2>
            </div>
            <p className="self-end text-lg leading-8 text-white/66">{t.portfolioIntro.text}</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map(([name, tier, material, accent, labelName, format, role, photo, text]) => (
              <article key={name} className="group border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/35">
                <div className="h-72 overflow-hidden bg-[#080808]">
                  <img src={photo} alt={`${name} product and label`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                </div>
                <div className="p-2 pt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>{tier}</p>
                    <span className="h-3 w-8 border border-white/20" style={{ backgroundColor: accent }} />
                  </div>
                  <h3 className="mt-2 font-serif text-3xl">{name}</h3>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/44">{material}</p>
                  <p className="mt-3 border-y border-white/10 py-3 text-[10px] font-bold uppercase tracking-[0.22em] text-white/72">{labelName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/48">{format}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em]" style={{ color: accent }}>{role}</p>
                  <p className="mt-4 leading-7 text-white/64">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="knowledge" className="border-y border-white/10 bg-cream-white px-5 py-24 text-black md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">{t.knowledge.eyebrow}</p>
                <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.knowledge.title}</h2>
              </div>
              <p className="self-end text-lg leading-8 text-black/66">{t.knowledge.text}</p>
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              {knowledgeCards[locale].map(([title, kicker, text], index) => (
                <article key={title} className="group overflow-hidden border border-black/10 bg-white">
                  <div className="h-56 overflow-hidden bg-black">
                    <img src={shared.knowledgeImages[index]} alt={title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#8a6a19]">{kicker}</p>
                    <h3 className="mt-3 font-serif text-3xl">{title}</h3>
                    <p className="mt-4 leading-7 text-black/64">{text}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className="mt-10 grid gap-5 border border-black/10 bg-bottle-black p-5 text-white lg:grid-cols-[0.82fr_1.18fr]">
              <div className="relative min-h-[360px] overflow-hidden">
                <img src="/donaanna/testing.jpg" alt="Quality testing of olive oil" className="absolute inset-0 h-full w-full object-cover opacity-72" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.78))]" />
                <div className="absolute bottom-0 p-6">
                  <Sparkles className="text-brushed-gold" size={26} />
                  <h3 className="mt-4 font-serif text-4xl">{t.knowledge.qualityTitle}</h3>
                  <p className="mt-3 max-w-md leading-7 text-white/68">{t.knowledge.qualityText}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {specs[locale].slice(0, 4).map(([title, text], index) => (
                  <div key={title} className="border border-white/10 bg-white/[0.04] p-5">
                    <div className="flex items-center justify-between">
                      <p className="font-serif text-3xl text-brushed-gold">{String(index + 1).padStart(2, '0')}</p>
                      <BadgeCheck size={22} className="text-brushed-gold" />
                    </div>
                    <h4 className="mt-6 font-serif text-2xl">{title}</h4>
                    <p className="mt-3 text-sm leading-6 text-white/62">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-matte-black py-24">
          <div className="absolute inset-0 opacity-24">
            <img src="/donaanna/farming-4.jpg" alt="Olive grove work in Biar" className="h-full w-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#0d0d0d,rgba(13,13,13,.78),#0d0d0d)]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.8fr_1.2fr] md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-brushed-gold">{t.journey.eyebrow}</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.journey.title}</h2>
              <p className="mt-6 text-lg leading-8 text-white/62">{t.journey.text}</p>
            </div>
            <div className="space-y-3">
              {timeline[locale].map(([step, text], index) => (
                <div key={step} className="group grid grid-cols-[94px_1fr] border border-white/10 bg-white/[0.035] transition hover:border-brushed-gold/60 hover:bg-white/[0.06]">
                  <div className="flex items-center justify-center border-r border-white/10 bg-black/30 font-serif text-lg text-brushed-gold">{step}</div>
                  <div className="p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/38">0{index + 1}</p>
                    <p className="mt-2 leading-7 text-white/70">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="traceability" className="border-y border-white/10 bg-bottle-black py-24">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-[0.95fr_1.05fr] md:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-brushed-gold">{t.trace.title}</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.trace.heading}</h2>
              <p className="mt-6 text-lg leading-8 text-white/66">{t.trace.text}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[ScanLine, ShieldCheck, BadgeCheck, Building2].map((Icon, index) => (
                  <div key={t.trace.features[index]} className="flex items-center gap-3 border border-white/10 bg-black/24 p-4">
                    <Icon size={20} className="text-brushed-gold" />
                    <span className="text-sm uppercase tracking-[0.16em] text-white/72">{t.trace.features[index]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-brushed-gold/30 bg-black p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brushed-gold">{t.batchLabel}</p>
                  <h3 className="mt-1 font-serif text-3xl">{t.trace.cardTitle}</h3>
                </div>
                <QrCode className="text-brushed-gold" size={34} />
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-2">
                {specs[locale].map(([label, value]) => (
                  <div key={label} className="border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-brushed-gold">{label}</p>
                    <p className="mt-2 text-sm text-white/78">{label === specs[locale][0][0] ? signal.latestHarvestDate || value : value}</p>
                  </div>
                ))}
              </div>
              <p className="border-t border-white/10 pt-5 text-sm leading-6 text-white/52">{t.trace.foot}</p>
            </div>
          </div>
        </section>

        <section className="bg-[#17130d] px-5 py-16 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 border border-brushed-gold/30 bg-black/24 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-brushed-gold">{t.band.eyebrow}</p>
              <h2 className="mt-2 font-serif text-3xl md:text-4xl">{t.band.title}</h2>
              <p className="mt-2 max-w-2xl text-white/62">{t.band.text}</p>
            </div>
            <a href="#tasting" className="inline-flex h-12 items-center justify-center gap-2 bg-brushed-gold px-6 text-xs font-bold uppercase tracking-[0.18em] text-black transition hover:bg-white">
              {t.hero.primary} <ArrowRight size={17} />
            </a>
          </div>
        </section>

        <section id="specs" className="mx-auto max-w-7xl px-5 py-24 md:px-8">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-brushed-gold">{t.specs.eyebrow}</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.specs.title}</h2>
              <p className="mt-6 text-lg leading-8 text-white/60">{t.specs.text}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {specs[locale].map(([label, value]) => (
                <div key={label} className="border border-white/10 bg-white/[0.035] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-brushed-gold">{label}</p>
                  <p className="mt-3 text-white/76">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="tasting" className="bg-cream-white px-5 py-24 text-black md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_0.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#8a6a19]">{t.tasting.eyebrow}</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">{t.tasting.title}</h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-black/66">{t.tasting.text}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="mailto:info@donaanna.com?subject=Produktark%20Do%C3%B1a%20Anna" className="inline-flex items-center gap-2 border border-black/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em]">
                  <FileText size={16} /> {t.tasting.productSheet}
                </a>
                <button onClick={onLogin} className="inline-flex items-center gap-2 border border-black/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em]">
                  <Package size={16} /> {t.tasting.login}
                </button>
              </div>
            </div>
            <form className="border border-black/12 bg-white p-5 shadow-2xl shadow-black/10" onSubmit={submitTastingRequest}>
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-black/60">{t.tasting.company}</label>
              <input required value={tastingForm.company} onChange={(event) => setField('company', event.target.value)} className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-brushed-gold" />
              <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">{t.tasting.role}</label>
              <input required value={tastingForm.contactRole} onChange={(event) => setField('contactRole', event.target.value)} placeholder={t.tasting.rolePlaceholder} className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-brushed-gold" />
              <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">{t.tasting.email}</label>
              <input required type="email" value={tastingForm.email} onChange={(event) => setField('email', event.target.value)} className="mt-2 h-12 w-full border border-black/12 px-3 outline-none focus:border-brushed-gold" />
              <label className="mt-4 block text-xs font-bold uppercase tracking-[0.18em] text-black/60">{t.tasting.address}</label>
              <textarea required value={tastingForm.deliveryAddress} onChange={(event) => setField('deliveryAddress', event.target.value)} className="mt-2 h-24 w-full border border-black/12 p-3 outline-none focus:border-brushed-gold" />
              {tastingMessage && (
                <p className={`mt-4 border px-4 py-3 text-sm leading-6 ${tastingStatus === 'success' ? 'border-emerald-600/30 bg-emerald-50 text-emerald-900' : 'border-amber-700/30 bg-amber-50 text-amber-950'}`}>
                  {tastingMessage}
                </p>
              )}
              <button disabled={tastingStatus === 'submitting'} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 bg-black px-5 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-brushed-gold hover:text-black disabled:cursor-wait disabled:opacity-60">
                {tastingStatus === 'submitting' ? t.tasting.sending : t.hero.primary} <ArrowRight size={17} />
              </button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-matte-black px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="font-serif text-lg tracking-[0.18em]">DOÑA ANNA</p>
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-white/54">
            <button onClick={onLogin}>{t.footerPortal}</button>
            <button onClick={onAdminLogin}>{t.admin}</button>
            <a href="mailto:info@donaanna.com">info@donaanna.com</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
