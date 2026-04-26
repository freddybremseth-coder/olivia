import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const fallbackSupabaseUrl = 'http://127.0.0.1:54321';
const fallbackSupabaseAnonKey = 'public-site-placeholder-key';

/**
 * True when both env vars are present at build time. If false, the UI shows
 * a clear banner instead of letting fetch calls hang forever against an
 * undefined URL (the common cause of "spinner never stops" on login).
 */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);

if (!isSupabaseConfigured) {
  // Emit a single, very visible console error so the bug is easy to diagnose
  // from DevTools even when the UI banner is missed.
  // eslint-disable-next-line no-console
  console.warn(
    '[Olivia] Supabase er ikke konfigurert. Sett VITE_SUPABASE_URL og ' +
    'VITE_SUPABASE_ANON_KEY i Vercel (Environment Variables) og re-deploy ' +
    'uten build-cache.'
  );
}

/**
 * In-memory FIFO lock used to replace gotrue's default `navigator.locks`
 * implementation. The default occasionally hangs on signInWithPassword for
 * 15+ seconds when:
 *   - A previous tab crashed mid-refresh and held the lock
 *   - React StrictMode double-mounted the auth listener
 *   - Safari/iOS suspended a navigator.locks holder
 *
 * The "Forcefully acquiring the lock to recover" warning means the SDK
 * detected the orphan and tried to recover, but in practice the recovery
 * often races against the actual sign-in call and the user sees a timeout.
 *
 * Trade-off: this lock is per-tab only, so two tabs can issue concurrent
 * token refreshes. Worst case one refresh fails and is retried — far better
 * than not being able to log in.
 */
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
    // Clean up so the map doesn't grow unbounded.
    if (memLocks.get(name) === prev.then(() => next)) memLocks.delete(name);
  }
}

// Supabase v2 throws during module load if the URL is empty. The public
// Doña Anna site must still render before Supabase is configured, so we create
// a harmless placeholder client and guard real calls with isSupabaseConfigured.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : fallbackSupabaseUrl,
  isSupabaseConfigured ? supabaseAnonKey! : fallbackSupabaseAnonKey,
  {
  auth: {
    // Use the in-memory lock above instead of navigator.locks. See the
    // comment on `inMemoryLock` for why.
    lock: inMemoryLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
