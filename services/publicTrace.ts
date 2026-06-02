import { isSupabaseConfigured, supabase } from './supabaseClient';

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
  created_at?: string;
  updated_at?: string;
};

export async function fetchPublicTraceBatch(slug: string): Promise<PublicTraceBatch | null> {
  if (!slug || !isSupabaseConfigured) return null;

  const { data, error } = await supabase
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

  const { data, error } = await supabase
    .from('public_trace_batches')
    .upsert(batch, { onConflict: 'qr_slug' })
    .select('*')
    .single();

  if (error) throw error;
  return data as PublicTraceBatch;
}
