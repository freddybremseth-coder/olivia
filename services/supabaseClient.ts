import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const fallbackSupabaseUrl = 'http://127.0.0.1:54321';
const fallbackSupabaseAnonKey = 'public-site-placeholder-key';

/**
 * Olivia uses the RealtyFlow Supabase database, where the farm app tables live
 * in the dedicated `olivia` schema. Public should only be used for auth/storage
 * and legacy fallback helpers.
 */
export const OLIVIA_SCHEMA = 'olivia';

export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Olivia] Supabase er ikke konfigurert. Sett VITE_SUPABASE_URL og ' +
    'VITE_SUPABASE_ANON_KEY i Vercel (Environment Variables) og re-deploy ' +
    'uten build-cache.'
  );
}

const memLocks = new Map<string, Promise<unknown>>();
async function inMemoryLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> {
  const prev = (memLocks.get(name) ?? Promise.resolve()) as Promise<unknown>;
  let release: () => void = () => {};
  const next = new Promise<void>((r) => { release = r; });
  memLocks.set(name, prev.then(() => next));
  try { await prev; } catch { /* ignore */ }
  try {
    return await fn();
  } finally {
    release();
    if (memLocks.get(name) === prev.then(() => next)) memLocks.delete(name);
  }
}

const url = isSupabaseConfigured ? supabaseUrl! : fallbackSupabaseUrl;
const key = isSupabaseConfigured ? supabaseAnonKey! : fallbackSupabaseAnonKey;

export const supabase = createClient(url, key, {
  db: { schema: OLIVIA_SCHEMA },
  auth: {
    lock: inMemoryLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const supabasePublic = createClient(url, key, {
  db: { schema: 'public' },
  auth: {
    lock: inMemoryLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
