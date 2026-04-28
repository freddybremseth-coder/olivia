import { CommerceProduct } from '../types';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export const commerceProductCollections = [
  'Verde Vivo',
  'Verde Alto',
  'Raíz Antigua',
  'Monovarietal Collection',
  'Cocina Viva',
  'Mesa',
  'B2B Tasting Kit',
  'Restaurant',
  'Retail',
  'Gavepakker',
];

export const defaultCommerceProducts: CommerceProduct[] = [
  {
    id: 'p-verde-vivo',
    sku: 'DA-VV-500',
    name: 'Verde Vivo',
    size: '500 ml hero · 250 ml gaveformat',
    channel: 'Fine dining finishing',
    stock: 420,
    price: '450 kr / €45.00',
    priceRetail: 45,
    priceB2b: 30,
    status: 'Aktiv',
    description: 'Årets første dråper, høstet mens olivenene ennå er knallgrønne for ekstremt høyt polyfenolinnhold.',
    publicStory: 'Krystallklar fruktighet, nyklippet gress og tomatkvist møter en elegant, vedvarende pepperfinish. Perfekt som finishing oil til crudo, carpaccio, burrata og delikate sjømatretter.',
    collections: ['Verde Vivo', 'Restaurant', 'B2B Tasting Kit'],
    imageUrl: '/donaanna/product-design/verde-vivo-estate-arches.jpg',
    labelMaterial: 'Kremhvit etikett · platinafolie',
    accentColor: '#E5E4E2',
    isPublic: true,
  },
  {
    id: 'p-verde-alto',
    sku: 'DA-VA-500',
    name: 'Verde Alto',
    size: '500 ml',
    channel: 'Restaurant/Retail premium',
    stock: 760,
    price: '290 kr / €29.00',
    priceRetail: 29,
    priceB2b: 20,
    status: 'Aktiv',
    description: 'Vår klassiske hus-olje: en harmonisk Extra Virgin med grønn karakter, balansert bitterhet og ren finish.',
    publicStory: 'Skapt for å heve hverdagsgastronomien uten å overdøve råvaren, fra grønnsaker og fisk til brødservering og kalde emulsjoner.',
    collections: ['Verde Alto', 'Restaurant', 'Retail'],
    imageUrl: '/donaanna/product-design/verde-alto-rustic-room.jpg',
    labelMaterial: 'Lett kremetikett · børstet gull',
    accentColor: '#D4AF37',
    isPublic: true,
  },
  {
    id: 'p-raiz-antigua',
    sku: 'DA-RA-500',
    name: 'Raíz Antigua',
    size: '500 ml',
    channel: 'Limited allocation',
    stock: 180,
    price: '340 kr / €34.00',
    priceRetail: 34,
    priceB2b: 24,
    status: 'Aktiv',
    description: 'Flytende historie fra Biar, presset fra våre eldste røtter i en begrenset Limited Edition.',
    publicStory: 'Meditativ kompleksitet med toner av ristet mandel, artisjokk og ville middelhavsurter. Skapt for kraftige kjøttretter, modne oster og sauser der oljen skal ta styring.',
    collections: ['Raíz Antigua', 'Gavepakker', 'Retail'],
    imageUrl: '/donaanna/product-design/raiz-antigua-label-hero.jpg',
    labelMaterial: 'Strukturert bomullspapir · kobber',
    accentColor: '#B87333',
    isPublic: true,
  },
  {
    id: 'p-cocina-viva',
    sku: 'DA-CV-3L',
    name: 'Cocina Viva',
    size: '3 L metallkanne · 5 L BiB på forespørsel',
    channel: 'Chef kitchen format',
    stock: 90,
    price: '750 kr / €75.00',
    priceRetail: 75,
    priceB2b: 55,
    status: 'Aktiv',
    description: 'Kjøkkensjefens kompromissløse arbeidshest for varmebehandling og høyt tempo på profesjonelle kjøkken.',
    publicStory: 'En robust, men harmonisk Extra Virgin med ren base og høy stabilitet. Ideell til presisjonssteking, konfitering, marinader, aioli og store emulsjoner.',
    collections: ['Cocina Viva', 'Restaurant'],
    imageUrl: '/donaanna/product-design/cocina-viva-b2b-collage.jpg',
    labelMaterial: 'Mattsvart metallkanne · sort/hvitt trykk',
    accentColor: '#F9F8F6',
    isPublic: true,
  },
  {
    id: 'p-mesa',
    sku: 'DA-ME-350',
    name: 'Mesa · Gordal Noble',
    size: '250-350 g glasskrukke',
    channel: 'Spanish markets/restaurants',
    stock: 520,
    price: '140 kr / €12.00',
    priceRetail: 12,
    priceB2b: 8.5,
    status: 'Aktiv',
    description: 'The Queen of Olives: håndsorterte, gigantiske Gordal-oliven med eksepsjonelt kjøttfull tekstur.',
    publicStory: 'Ren, smøraktig profil og perfekt tyggemotstand. Et luksuriøst innslag til aperitivo, eksklusive martini-varianter og premium tapas- eller charcuterie-bord.',
    collections: ['Mesa', 'Retail', 'B2B Tasting Kit'],
    imageUrl: '/donaanna/product-design/portfolio-slate-mesa.jpg',
    labelMaterial: 'Mørk terrakotta · lite gullsegl',
    accentColor: '#C05A46',
    isPublic: true,
  },
];

export async function fetchCommerceProducts(options: { publicOnly?: boolean; fallback?: boolean } = {}): Promise<CommerceProduct[]> {
  const useFallback = options.fallback ?? true;
  if (!isSupabaseConfigured) return useFallback ? defaultCommerceProducts : [];

  let query = supabase
    .from('commerce_products')
    .select('*')
    .order('created_at', { ascending: true });

  if (options.publicOnly) query = query.eq('is_public', true).eq('status', 'Aktiv');

  const { data, error } = await query;
  if (error) {
    console.warn('[commerceProducts] fetch failed', error);
    return useFallback ? defaultCommerceProducts : [];
  }

  const rows = (data ?? []).map(rowToProduct);
  return rows.length ? rows : useFallback ? defaultCommerceProducts : [];
}

export async function upsertCommerceProduct(product: CommerceProduct): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('commerce_products')
    .upsert(productToRow(product), { onConflict: 'id' });

  if (error) throw new Error(error.message);
}

export async function deleteCommerceProduct(id: string): Promise<void> {
  if (!isSupabaseConfigured) return;

  const { error } = await supabase
    .from('commerce_products')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function uploadCommerceProductImage(file: File, productId: string): Promise<string> {
  const localPreviewUrl = await readFileAsDataUrl(file);

  if (!isSupabaseConfigured) {
    return localPreviewUrl;
  }

  const extension = file.name.split('.').pop() || 'jpg';
  const path = `${productId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from('commerce-product-images')
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });

  if (error) {
    console.warn('[commerceProducts] image upload failed, using local preview', error);
    return localPreviewUrl;
  }

  const { data } = supabase.storage.from('commerce-product-images').getPublicUrl(path);
  return data.publicUrl || localPreviewUrl;
}

function rowToProduct(row: any): CommerceProduct {
  return {
    id: row.id,
    sku: row.sku ?? '',
    name: row.name ?? '',
    description: row.description ?? '',
    category: row.category ?? undefined,
    oliveVariety: row.olive_variety ?? undefined,
    size: row.size ?? '',
    channel: row.channel ?? '',
    harvestYear: row.harvest_year ?? undefined,
    batchId: row.batch_id ?? undefined,
    priceRetail: row.price_retail ?? undefined,
    priceB2b: row.price_b2b ?? undefined,
    cost: row.cost ?? undefined,
    stock: Number(row.stock ?? 0),
    polyphenolContent: row.polyphenol_content ?? undefined,
    acidity: row.acidity ?? undefined,
    imageUrl: row.image_url ?? undefined,
    status: normalizeStatus(row.status),
    publicStory: row.public_story ?? '',
    collections: Array.isArray(row.collections) ? row.collections : [],
    price: row.price_label || formatPrice(row.price_retail, row.price_b2b),
    labelMaterial: row.label_material ?? undefined,
    accentColor: row.accent_color ?? undefined,
    isPublic: row.is_public ?? true,
  };
}

function productToRow(product: CommerceProduct) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category ?? 'EVOO',
    olive_variety: product.oliveVariety ?? null,
    size: product.size || null,
    channel: product.channel || 'retail',
    harvest_year: product.harvestYear ?? null,
    batch_id: product.batchId ?? null,
    price_retail: product.priceRetail ?? parseEuro(product.price),
    price_b2b: product.priceB2b ?? null,
    cost: product.cost ?? null,
    stock: product.stock,
    polyphenol_content: product.polyphenolContent ?? null,
    acidity: product.acidity ?? null,
    image_url: product.imageUrl ?? null,
    status: product.status,
    public_story: product.publicStory ?? '',
    collections: product.collections ?? [],
    price_label: product.price || null,
    label_material: product.labelMaterial ?? null,
    accent_color: product.accentColor ?? null,
    is_public: product.isPublic ?? true,
  };
}

function normalizeStatus(status: string): CommerceProduct['status'] {
  if (status === 'Utkast' || status === 'Utsolgt' || status === 'Arkivert') return status;
  return 'Aktiv';
}

function parseEuro(value: string): number {
  const parsed = Number(value.replace(/[^\d,.]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(retail?: number, b2b?: number): string {
  if (typeof retail === 'number' && retail > 0) return `€${retail.toFixed(2)}`;
  if (typeof b2b === 'number' && b2b > 0) return `B2B €${b2b.toFixed(2)}`;
  return 'B2B quote';
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
