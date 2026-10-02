import { isSupabaseConfigured, supabase as supabaseOlivia } from './supabaseClient';

export interface PublicCommerceProduct {
  sku: string;
  name: string;
  labelName: string;
  format: string;
  role: string;
  photo: string;
  text: string;
  priceLabel: string;
  stockLabel: string;
}

const BRAND_SAFE_FALLBACK = '/donaanna/olive-trees.jpg';

function text(value: unknown): string {
  return String(value || '').trim();
}

function productPhoto(row: any): string {
  const image = text(row.image_url);
  return image && !image.includes('/donaanna/product-design/') ? image : BRAND_SAFE_FALLBACK;
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

  return {
    sku: text(row.sku),
    name: text(row.name),
    labelName: `DOÑA ANNA · ${text(row.name).toUpperCase()}`,
    format: [size, harvest, category].filter(Boolean).join(' · ') || 'Doña Anna estate product',
    role: text(row.channel) || text(row.status) || 'Estate product',
    photo: productPhoto(row),
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

  const approvedNames = new Set([
    'verde vivo',
    'verde alto',
    'raíz antigua',
    'raiz antigua',
    'cocina viva',
    'mesa · gordal noble',
    'mesa gordal noble',
  ]);

  return (data || [])
    .filter((row: any) =>
      approvedNames.has(text(row.name).toLowerCase()) &&
      row?.metadata?.public_site_approved === true
    )
    .map(toPublicProduct);
}
