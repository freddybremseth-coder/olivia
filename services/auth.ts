/**
 * auth.ts — thin wrapper around Supabase Auth + the user_profiles table.
 *
 * Replaces the localStorage-only login flow. Public surface:
 *   - signInWithPassword(email, password)
 *   - signUpWithPassword(email, password, name, adminCode?)
 *   - signOut()
 *   - getSession()
 *   - onAuthChange(handler)  — wraps onAuthStateChange
 *   - fetchProfile(userId)
 *   - upsertProfile(profile)
 */

import { supabase } from './supabaseClient';
import type { UserProfile } from '../types';

// Hard-coded admin enrolment code (same value as the legacy localStorage flow).
// On signup the value is sent in user_metadata.role = 'super_admin' and the
// handle_new_user() trigger persists it.
const ADMIN_CODE = 'OLIVIA-ADMIN-2024';

export interface AuthResult {
  user: UserProfile;
  isAdmin: boolean;
}

function rowToProfile(row: any, fallbackEmail = ''): UserProfile {
  return {
    id: row.id,
    email: row.email ?? fallbackEmail,
    name: row.name ?? '',
    role: (row.role ?? 'farmer') as UserProfile['role'],
    subscription: (row.subscription ?? 'trial') as UserProfile['subscription'],
    subscriptionStart: row.subscription_start ?? new Date().toISOString().slice(0, 10),
    avatar: row.avatar ?? undefined,
  };
}

export async function fetchProfile(userId: string, fallbackEmail = ''): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('fetchProfile', error);
    return null;
  }
  if (!data) return null;
  return rowToProfile(data, fallbackEmail);
}

export async function upsertProfile(profile: UserProfile): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      subscription: profile.subscription,
      subscription_start: profile.subscriptionStart,
      avatar: profile.avatar ?? null,
    }, { onConflict: 'id' });
  if (error) console.error('upsertProfile', error);
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.user) throw new Error('Innlogging feilet.');

  const profile = await fetchProfile(data.user.id, data.user.email ?? email);
  if (!profile) {
    // Auth user exists but trigger didn't run — fall back to a minimal profile
    const fallback: UserProfile = {
      id: data.user.id,
      email: data.user.email ?? email,
      name: (data.user.user_metadata?.name as string) || (data.user.email ?? '').split('@')[0],
      role: 'farmer',
      subscription: 'trial',
      subscriptionStart: new Date().toISOString().slice(0, 10),
    };
    await upsertProfile(fallback);
    return { user: fallback, isAdmin: false };
  }
  return { user: profile, isAdmin: profile.role === 'super_admin' };
}

export async function signUpWithPassword(
  email: string,
  password: string,
  name: string,
  adminCode?: string,
): Promise<AuthResult> {
  const isAdmin = adminCode === ADMIN_CODE;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role: isAdmin ? 'super_admin' : 'farmer',
      },
    },
  });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.user) throw new Error('Kontoen kunne ikke opprettes.');

  // If "confirm email" is enabled in Supabase, data.session is null and the
  // user must check their inbox before signing in. Surface a friendly message.
  if (!data.session) {
    throw new Error('Sjekk e-posten din for å bekrefte kontoen før du logger inn.');
  }

  // Trigger should have created the profile row; refetch it.
  const profile = await fetchProfile(data.user.id, email);
  const finalProfile: UserProfile = profile ?? {
    id: data.user.id,
    email,
    name,
    role: isAdmin ? 'super_admin' : 'farmer',
    subscription: 'trial',
    subscriptionStart: new Date().toISOString().slice(0, 10),
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=22c55e&color=000&size=256`,
  };
  if (!profile) await upsertProfile(finalProfile);

  return { user: finalProfile, isAdmin: finalProfile.role === 'super_admin' };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) console.warn('signOut', error);
}

export async function getCurrentSession(): Promise<AuthResult | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  const userId = data.session.user.id;
  const email = data.session.user.email ?? '';
  const profile = await fetchProfile(userId, email);
  if (!profile) {
    // Profile row missing — auth user still valid, return a minimal record.
    const fallback: UserProfile = {
      id: userId,
      email,
      name: (data.session.user.user_metadata?.name as string) || email.split('@')[0],
      role: 'farmer',
      subscription: 'trial',
      subscriptionStart: new Date().toISOString().slice(0, 10),
    };
    return { user: fallback, isAdmin: false };
  }
  return { user: profile, isAdmin: profile.role === 'super_admin' };
}

export type AuthChangeHandler = (result: AuthResult | null) => void;

/** Subscribe to sign-in / sign-out events. Returns an unsubscribe fn. */
export function onAuthChange(handler: AuthChangeHandler): () => void {
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (!session) {
      handler(null);
      return;
    }
    const profile = await fetchProfile(session.user.id, session.user.email ?? '');
    if (!profile) {
      handler({
        user: {
          id: session.user.id,
          email: session.user.email ?? '',
          name: (session.user.user_metadata?.name as string) || (session.user.email ?? '').split('@')[0],
          role: 'farmer',
          subscription: 'trial',
          subscriptionStart: new Date().toISOString().slice(0, 10),
        },
        isAdmin: false,
      });
      return;
    }
    handler({ user: profile, isAdmin: profile.role === 'super_admin' });
  });
  return () => data.subscription.unsubscribe();
}

/** Translate common Supabase Auth error strings into Norwegian. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials')) return 'Feil e-post eller passord.';
  if (m.includes('email not confirmed')) return 'Du må bekrefte e-postadressen din før du kan logge inn.';
  if (m.includes('user already registered')) return 'En konto med denne e-posten finnes allerede.';
  if (m.includes('password should be at least')) return 'Passordet må være minst 6 tegn.';
  if (m.includes('rate limit')) return 'For mange forsøk. Vent litt og prøv igjen.';
  return message;
}
