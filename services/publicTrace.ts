import { isSupabaseConfigured, supabase, supabasePublic } from './supabaseClient';

export type PublicTraceBatch = {
  id: string;
  batch_code: string;
  qr_slug: string;
  type: 'evoo' | 'table_olives' | 'raw_olives';
  status: 'draft' | 'published' | 'archived';
  product_status?: string;
  harvest_date?: string;
  parcel_id?: string;
  zone_id?: string;
  variety: string;
  altitude_m?: number;
  kg_harvested?: number;
  kg_processed?: number;
  liters_oil?: number;
  yield_percent?: number;
  acidity_percent?: number;
  peroxide_value?: number;
  polyphenols_mg_kg?: number;
  sensory_profile?: string;
  processing_location?: string;
  lot_notes?: string;
  public_story?: string;
  hero_image_url?: string;
  gallery_urls?: string[];
  lab_report_url?: string;
  organic_note?: string;
  published_at?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export async function fetchPublicTraceBatch(slug: string): Promise<PublicTraceBatch | null> {
  if (!slug || !isSupabaseConfigured) return null;

  const { data, error } = await supabasePublic
    .from('public_trace_batches')
    .select('*')
    .eq('qr_slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.warn('[publicTrace] Could not fetch public trace batch', error);
    return null;
  }

  return data as PublicTraceBatch | null;
}

export async function publishTraceBatch(batch: Omit<PublicTraceBatch, 'id' | 'created_at' | 'updated_at'>): Promise<PublicTraceBatch> {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) {
    throw new Error('Du må være innlogget i Olivia OS for å publisere QR-batcher.');
  }

  const { data, error } = await supabasePublic
    .from('public_trace_batches')
    .upsert({ ...batch, created_by: userResult.user.id }, { onConflict: 'qr_slug' })
    .select('*')
    .single();

  if (error) throw error;
  return data as PublicTraceBatch;
}


export type PublicTraceLotSource = {
  batch_id: string;
  batch_code: string;
  harvest_date?: string;
  variety?: string;
  yield_type?: string;
  kg_harvested?: number;
  liters_oil?: number;
  input_kg?: number;
  input_liters?: number;
  quality?: string;
  quality_score?: number;
  acidity_percent?: number;
  peroxide_value?: number;
  polyphenols_mg_kg?: number;
  parcel_name?: string;
  parcel_number?: string;
  municipality?: string;
};

export type PublicTraceLot = {
  id: string;
  lot_id: string;
  lot_code: string;
  qr_slug: string;
  status: 'draft' | 'published' | 'archived';
  product_id: string;
  product_name: string;
  product_sku: string;
  product_size?: string;
  product_category?: string;
  product_description?: string;
  product_image_url?: string;
  product_story?: string;
  packed_at?: string;
  best_before?: string;
  initial_units?: number;
  source_batches: PublicTraceLotSource[];
  trace_summary?: {
    harvest_dates?: string[];
    varieties?: string[];
    parcels?: string[];
    total_source_kg?: number;
    total_source_liters?: number;
  };
  published_at?: string;
};

export async function fetchPublicTraceLot(slug: string): Promise<PublicTraceLot | null> {
  if (!slug || !isSupabaseConfigured) return null;
  const { data, error } = await supabasePublic
    .from('public_trace_lots')
    .select('*')
    .eq('qr_slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) {
    console.warn('[publicTrace] Could not fetch public trace lot', error);
    return null;
  }
  return data as PublicTraceLot | null;
}

function publicParcelLabel(name?: string, sigpacParcel?: string) {
  if (sigpacParcel) return `Parcela ${sigpacParcel} · Biar, Alicante`;
  if (!name) return 'Biar, Alicante';
  const match = name.match(/Parcela\s+(\d+)/i);
  return match ? `Parcela ${match[1]} · Biar, Alicante` : 'Biar, Alicante';
}

export async function publishProductLotTrace(lotId: string): Promise<PublicTraceLot> {
  if (!isSupabaseConfigured) throw new Error('Supabase er ikke konfigurert.');
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) throw new Error('Du må være innlogget for å publisere produktsporbarhet.');

  const { data: lot, error: lotError } = await supabase
    .from('product_lots')
    .select('id,product_id,lot_code,status,packed_at,best_before,initial_units,traceability_slug')
    .eq('id', lotId).single();
  if (lotError || !lot) throw lotError || new Error('Pakkelot ble ikke funnet.');

  const { data: product, error: productError } = await supabase
    .from('commerce_products')
    .select('id,sku,name,size,category,description,image_url,public_story')
    .eq('id', lot.product_id).single();
  if (productError || !product) throw productError || new Error('Produkt ble ikke funnet.');

  const { data: links, error: linksError } = await supabase
    .from('product_lot_sources').select('batch_id,input_kg,input_liters').eq('lot_id', lotId);
  if (linksError) throw linksError;
  const batchIds = (links || []).map((row: any) => row.batch_id);
  if (!batchIds.length) throw new Error('Pakkelot mangler dokumenterte kildebatcher og kan ikke publiseres.');

  const { data: batches, error: batchError } = await supabase
    .from('batches')
    .select('id,parcel_id,olive_type,recipe_name,harvest_date,weight,quality,quality_score,status,yield_type,oil_yield_liters,traceability_code,quality_metrics')
    .in('id', batchIds);
  if (batchError) throw batchError;
  if ((batches || []).some((batch: any) => batch.status !== 'ACTIVE')) {
    throw new Error('Minst én kildebatch er arkivert. QR-sporbarhet kan bare publiseres fra aktive, dokumenterte batcher.');
  }

  const parcelIds = [...new Set((batches || []).map((batch: any) => batch.parcel_id).filter(Boolean))];
  const parcelMap = new Map<string, any>();
  if (parcelIds.length) {
    const { data: parcels, error: parcelError } = await supabase
      .from('parcels').select('id,name,municipality,tree_variety,metadata').in('id', parcelIds);
    if (parcelError) throw parcelError;
    (parcels || []).forEach((parcel: any) => parcelMap.set(parcel.id, parcel));
  }

  const allocationMap = new Map<string, any>((links || []).map((link: any) => [link.batch_id, link]));
  const sources: PublicTraceLotSource[] = (batches || []).map((batch: any) => {
    const parcel = parcelMap.get(batch.parcel_id);
    const allocation = allocationMap.get(batch.id);
    const metrics = batch.quality_metrics || {};
    const sigpacParcel = parcel?.metadata?.sigpac?.parcel;
    return {
      batch_id: batch.id,
      batch_code: batch.traceability_code || batch.id,
      harvest_date: batch.harvest_date || undefined,
      variety: batch.olive_type || batch.recipe_name || parcel?.tree_variety || undefined,
      yield_type: batch.yield_type || undefined,
      kg_harvested: Number(batch.weight || 0) || undefined,
      liters_oil: Number(batch.oil_yield_liters || 0) || undefined,
      input_kg: allocation?.input_kg == null ? undefined : Number(allocation.input_kg),
      input_liters: allocation?.input_liters == null ? undefined : Number(allocation.input_liters),
      quality: batch.quality || undefined,
      quality_score: batch.quality_score == null ? undefined : Number(batch.quality_score),
      acidity_percent: metrics.acidity == null ? undefined : Number(metrics.acidity),
      peroxide_value: metrics.peroxide == null ? undefined : Number(metrics.peroxide),
      polyphenols_mg_kg: metrics.phenols == null ? undefined : Number(metrics.phenols),
      parcel_name: publicParcelLabel(parcel?.name, sigpacParcel),
      parcel_number: sigpacParcel || undefined,
      municipality: parcel?.municipality || 'Biar, Alicante',
    };
  });

  const unique = (values: Array<string | undefined>) => [...new Set(values.filter(Boolean) as string[])];
  const qrSlug = lot.traceability_slug || lot.lot_code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const payload = {
    lot_id: lot.id,
    lot_code: lot.lot_code,
    qr_slug: qrSlug,
    status: 'published',
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku,
    product_size: product.size,
    product_category: product.category,
    product_description: product.description,
    product_image_url: product.image_url,
    product_story: product.public_story,
    packed_at: lot.packed_at,
    best_before: lot.best_before,
    initial_units: lot.initial_units,
    source_batches: sources,
    trace_summary: {
      harvest_dates: unique(sources.map(source => source.harvest_date)),
      varieties: unique(sources.map(source => source.variety)),
      parcels: unique(sources.map(source => source.parcel_name)),
      total_source_kg: sources.some(source => source.input_kg != null) ? sources.reduce((sum, source) => sum + Number(source.input_kg || 0), 0) : undefined,
      total_source_liters: sources.some(source => source.input_liters != null) ? sources.reduce((sum, source) => sum + Number(source.input_liters || 0), 0) : undefined,
    },
    published_at: new Date().toISOString(),
    created_by: userResult.user.id,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabasePublic
    .from('public_trace_lots')
    .upsert(payload, { onConflict: 'lot_id' })
    .select('*').single();
  if (error) throw error;
  return data as PublicTraceLot;
}
