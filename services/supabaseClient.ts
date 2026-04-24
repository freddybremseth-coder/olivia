import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
  console.error(
    '[Olivia] Supabase er ikke konfigurert. Sett VITE_SUPABASE_URL og ' +
    'VITE_SUPABASE_ANON_KEY i Vercel (Environment Variables) og re-deploy ' +
    'uten build-cache.'
  );
}

// createClient tolerates empty strings — we pass '' fallbacks so module load
// doesn't throw. The shimmed client's calls will fail fast because the URL
// isn't reachable; auth.ts now wraps calls in a timeout + friendly error.
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
