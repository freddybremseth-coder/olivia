import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = ((import.meta as any)?.env ?? {}) as Record<string, string | undefined>;
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  // Don't crash the app — just warn loudly so the developer notices.
  console.warn(
    '[Olivia] Supabase env vars missing. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local. ' +
    'Persistence (parcels, harvests, expenses) will be disabled.'
  );
}

/**
 * Stub client used when env is missing. Every query resolves to an empty result
 * so the UI keeps rendering instead of throwing on first DB call.
 */
const stubClient = {
  from() {
    const empty = { data: [], error: null };
    const builder: any = {
      select: () => builder,
      insert: () => builder,
      update: () => builder,
      upsert: () => builder,
      delete: () => builder,
      eq: () => builder,
      order: () => builder,
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: any) => Promise.resolve(empty).then(resolve),
    };
    return builder;
  },
} as unknown as SupabaseClient;

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : stubClient;
