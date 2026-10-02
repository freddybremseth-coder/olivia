import { isSupabaseConfigured, supabase as supabaseOlivia } from './supabaseClient';
import { canonicalDonaAnnaProductSlug, DONA_ANNA_PRODUCTS } from '../content/donaAnnaProducts';

export interface PublicCommerceProduct {
  sku: string;
  name: string;
  labelName: string;
  format: string;
  role: string;
  photo: string;
  photoApproved: boolean;
  productSlug: string;
  text: string;
  priceLabel: string;
  stockLabel: string;
}

const BRAND_SAFE_FALLBACK = '/donaanna/olive-trees.jpg';

function text(value: unknown): string {
  return String(value || '').trim();
}

const canonicalProductSlug = canonicalDonaAnnaProductSlug;

function productPhoto(row: any): { url: string; approved: boolean } {
  const image = text(row.image_url);
  const metadata = row.metadata || {};
  const productSlug = canonicalProductSlug(row.name);
  const mediaSlug = text(metadata.product_slug || metadata.productSlug).toLowerCase();
  const explicitlyApproved = metadata.product_image_approved === true || metadata.productImageApproved === true;
  const exactProductMatch = Boolean(productSlug && mediaSlug === productSlug);
  const safeUrl = image && !image.includes('/donaanna/product-design/');

  if (safeUrl && explicitlyApproved && exactProductMatch) {
    return { url: image, approved: true };
  }

  return { url: BRAND_SAFE_FALLBACK, approved: false };
}

function priceLabel(row: any): string {
  const metadata = row.metadata || {};
  if (metadata.price_label) return text(metadata.price_label);
  const value = Number(row.price_b2b || row.price_retail || row.unit_price || 0);
  if (!value) return 'B2B quote';
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value);
}

function stockLabel(row: any): string {
  const stock = Number(row.stock_quantity ?? row.stock ?? 0);
  const unit = text(row.unit) || 'stk';
  return stock > 0 ? `${stock.toLocaleString('nb-NO')} ${unit}` : 'På forespørsel';
}

function toPublicProduct(row: any): PublicCommerceProduct {
  const metadata = row.metadata || {};
  const size = text(row.size);
  const harvest = row.harvest_year ? `${row.harvest_year}` : '';
  const category = text(row.category);
  const media = productPhoto(row);

  return {
    sku: text(row.sku),
    name: text(row.name),
    labelName: `DOÑA ANNA · ${text(row.name).toUpperCase()}`,
    format: [size, harvest, category].filter(Boolean).join(' · ') || 'Doña Anna estate product',
    role: text(row.channel) || text(row.status) || 'Estate product',
    photo: media.url,
    photoApproved: media.approved,
    productSlug: canonicalProductSlug(row.name),
    text: text(row.public_story) || text(row.description) || 'Doña Anna-produkt med sporbar opprinnelse fra Olivia OS.',
    priceLabel: priceLabel(row),
    stockLabel: stockLabel(row),
  };
}

export async function fetchPublicCommerceProducts(): Promise<PublicCommerceProduct[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabaseOlivia
    .from('commerce_products')
    .select('sku,name,description,category,size,channel,harvest_year,price_retail,price_b2b,unit_price,stock,stock_quantity,unit,image_url,status,active,public_story,metadata,created_at')
    .eq('active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[DonaAnna] Kunne ikke hente produkter fra Olivia', error);
    return [];
  }

  const approvedNames = new Set(
    DONA_ANNA_PRODUCTS.flatMap(product => [product.name.toLowerCase(), ...product.aliases])
  );

  return (data || [])
    .filter((row: any) =>
      approvedNames.has(text(row.name).toLowerCase()) &&
      row?.metadata?.public_site_approved === true
    )
    .map(toPublicProduct);
}
