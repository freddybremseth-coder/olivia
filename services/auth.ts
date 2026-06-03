/**
 * auth.ts — thin wrapper around Supabase Auth + the public.user_profiles table.
 *
 * Farm data uses the `olivia` schema by default through services/supabaseClient.
 * Auth profile data stays in `public.user_profiles`, so this file uses
 * supabasePublic for profile reads/writes.
 */

import { supabase, supabasePublic, isSupabaseConfigured } from './supabaseClient';
import type { UserProfile } from '../types';

function withTimeout<T>(promise: Promise<T>, ms = 25000, label = 'Forespørselen'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} tok for lang tid. Sjekk internett-tilkoblingen, eller at Supabase-prosjektet er aktivt.`)), ms);
    promise.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

function assertConfigured(): void {
  if (!isSupabaseConfigured) {
    throw new Error('Pålogging er ikke tilgjengelig: Supabase er ikke konfigurert. Kontakt administrator.');
  }
}

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
    company: row.company ?? undefined,
    phone: row.phone ?? undefined,
    billingAddress: row.billing_address ?? undefined,
    shippingAddress: row.shipping_address ?? undefined,
    taxId: row.tax_id ?? undefined,
  };
}

export async function fetchProfile(userId: string, fallbackEmail = ''): Promise<UserProfile | null> {
  const { data, error } = await supabasePublic
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
  const { error } = await supabasePublic
    .from('user_profiles')
    .upsert({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      subscription: profile.subscription,
      subscription_start: profile.subscriptionStart,
      avatar: profile.avatar ?? null,
      company: profile.company ?? null,
      phone: profile.phone ?? null,
      billing_address: profile.billingAddress ?? null,
      shipping_address: profile.shippingAddress ?? null,
      tax_id: profile.taxId ?? null
    }, { onConflict: 'id' });
  if (error) console.error('upsertProfile', error);
}

function fallbackProfileFromAuth(user: any, fallbackEmail = ''): UserProfile {
  const email = user?.email ?? fallbackEmail;
  const name = (user?.user_metadata?.name as string) || email.split('@')[0] || 'Olivia User';
  return {
    id: user?.id || `auth-${Date.now()}`,
    email,
    name,
    role: (user?.user_metadata?.role as UserProfile['role']) || 'farmer',
    subscription: 'trial',
    subscriptionStart: new Date().toISOString().slice(0, 10),
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=22c55e&color=000&size=256`,
  };
}

async function profileOrFallback(user: any, fallbackEmail = ''): Promise<AuthResult> {
  const fallback = fallbackProfileFromAuth(user, fallbackEmail);
  const profile = await withTimeout(fetchProfile(user.id, user.email ?? fallbackEmail), 6000, 'Henting av profil').catch(error => {
    console.warn('profile lookup timed out/failed, using auth profile', error);
    return null;
  });
  const finalProfile = profile ?? fallback;
  if (!profile) upsertProfile(finalProfile).catch(err => console.warn('profile fallback save failed', err));
  return { user: finalProfile, isAdmin: finalProfile.role === 'super_admin' };
}

async function resultFromExistingSession(fallbackEmail = ''): Promise<AuthResult | null> {
  const { data, error } = await withTimeout(supabase.auth.getSession(), 7000, 'Henting av sesjon');
  if (error || !data.session?.user) return null;
  return profileOrFallback(data.session.user, data.session.user.email ?? fallbackEmail);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  assertConfigured();
  let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data'];
  try {
    const res = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 30000, 'Innlogging');
    if (res.error) throw new Error(translateAuthError(res.error.message));
    data = res.data;
  } catch (e: any) {
    const rawMessage = e?.message || String(e);
    if (rawMessage.toLowerCase().includes('tok for lang tid')) {
      await delay(1200);
      const existing = await resultFromExistingSession(email).catch(() => null);
      if (existing) return existing;
    }
    throw new Error(translateAuthError(rawMessage));
  }
  if (!data.user) throw new Error('Innlogging feilet.');
  return profileOrFallback(data.user, data.user.email ?? email);
}

export async function signUpWithPassword(email: string, password: string, name: string, adminCode?: string): Promise<AuthResult> {
  assertConfigured();
  const isAdmin = adminCode === ADMIN_CODE;
  let data: Awaited<ReturnType<typeof supabase.auth.signUp>>['data'];
  try {
    const res = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: { data: { name, role: isAdmin ? 'super_admin' : 'farmer' } },
      }),
      30000,
      'Registrering',
    );
    if (res.error) throw new Error(translateAuthError(res.error.message));
    data = res.data;
  } catch (e: any) {
    throw new Error(translateAuthError(e?.message || String(e)));
  }
  if (!data.user) throw new Error('Kontoen kunne ikke opprettes.');
  if (!data.session) throw new Error('Sjekk e-posten din for å bekrefte kontoen før du logger inn.');
  return profileOrFallback(data.user, email);
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) console.warn('signOut', error);
}

export async function updatePassword(newPassword: string): Promise<void> {
  assertConfigured();
  if (newPassword.length < 6) throw new Error('Passordet må være minst 6 tegn.');
  try {
    const res = await withTimeout(supabase.auth.updateUser({ password: newPassword }), 30000, 'Oppdatering av passord');
    if (res.error) throw new Error(translateAuthError(res.error.message));
  } catch (e: any) {
    throw new Error(translateAuthError(e?.message || String(e)));
  }
}

export async function sendPasswordReset(email: string, redirectTo?: string): Promise<void> {
  assertConfigured();
  const target = redirectTo ?? (typeof window !== 'undefined' ? `${window.location.origin}/#reset-password` : undefined);
  try {
    const res = await withTimeout(supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: target }), 30000, 'Sending av e-post');
    if (res.error) throw new Error(translateAuthError(res.error.message));
  } catch (e: any) {
    throw new Error(translateAuthError(e?.message || String(e)));
  }
}

export async function getCurrentSession(): Promise<AuthResult | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), 12000, 'Henting av sesjon');
    if (error || !data.session?.user) return null;
    return profileOrFallback(data.session.user, data.session.user.email ?? '');
  } catch (error) {
    console.warn('getCurrentSession', error);
    return null;
  }
}

export function onAuthChange(
  callback: (result: AuthResult | null) => void,
  onPasswordRecovery?: () => void,
): () => void {
  if (!isSupabaseConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') onPasswordRecovery?.();
    if (!session?.user) { callback(null); return; }
    const result = await profileOrFallback(session.user, session.user.email ?? '');
    callback(result);
  });
  return () => data.subscription.unsubscribe();
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Feil e-post eller passord.';
  if (m.includes('email not confirmed')) return 'E-posten er ikke bekreftet ennå.';
  if (m.includes('user already registered')) return 'Denne e-posten er allerede registrert.';
  if (m.includes('password')) return 'Passordet må være minst 6 tegn.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Fikk ikke kontakt med Supabase. Sjekk internett eller miljøvariabler.';
  if (m.includes('tok for lang tid')) return 'Innloggingen bruker lang tid. Prøv én gang til, eller refresh siden hvis du allerede er logget inn.';
  return message;
}
