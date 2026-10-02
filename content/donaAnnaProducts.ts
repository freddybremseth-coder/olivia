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
