/**
 * auth.ts — thin wrapper around Supabase Auth + the public.user_profiles table.
 *
 * Farm data uses the `olivia` schema by default through services/supabaseClient.
 * Auth profile data stays in `public.user_profiles`, so this file uses
 * supabasePublic for profile reads/writes.
 */

import { supabase, supabasePublic, isSupabaseConfigured } from './supabaseClient';
import type { UserProfile } from '../types';

function withTimeout<T>(promise: Promise<T>, ms = 15000, label = 'Forespørselen'): Promise<T> {
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
      tax_id: profile.taxId ?? null,
    }, { onConflict: 'id' });
  if (error) console.error('upsertProfile', error);
}

function fallbackProfileFromAuth(user: any, fallbackEmail = ''): UserProfile {
  const email = user?.email ?? fallbackEmail;
  const name = (user?.user_metadata?.name as string) || email.split('@')[0] || 'Olivia User';
  return {
    id: user?.id || `local-${Date.now()}`,
    email,
    name,
    role: (user?.user_metadata?.role as UserProfile['role']) || 'farmer',
    subscription: 'trial',
    subscriptionStart: new Date().toISOString().slice(0, 10),
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=22c55e&color=000&size=256`,
  };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  assertConfigured();
  let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data'];
  try {
    const res = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 15000, 'Innlogging');
    if (res.error) throw new Error(translateAuthError(res.error.message));
    data = res.data;
  } catch (e: any) {
    throw new Error(translateAuthError(e?.message || String(e)));
  }
  if (!data.user) throw new Error('Innlogging feilet.');
  const profile = await fetchProfile(data.user.id, data.user.email ?? email);
  const finalProfile = profile ?? fallbackProfileFromAuth(data.user, email);
  if (!profile) await upsertProfile(finalProfile).catch(err => console.warn('profile fallback save failed', err));
  return { user: finalProfile, isAdmin: finalProfile.role === 'super_admin' };
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
      15000,
      'Registrering',
    );
    if (res.error) throw new Error(translateAuthError(res.error.message));
    data = res.data;
  } catch (e: any) {
    throw new Error(translateAuthError(e?.message || String(e)));
  }
  if (!data.user) throw new Error('Kontoen kunne ikke opprettes.');
  if (!data.session) throw new Error('Sjekk e-posten din for å bekrefte kontoen før du logger inn.');
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
  if (!profile) await upsertProfile(finalProfile).catch(err => console.warn('profile fallback save failed', err));
  return { user: finalProfile, isAdmin: finalProfile.role === 'super_admin' };
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
    const res = await withTimeout(supabase.auth.updateUser({ password: newPassword }), 15000, 'Oppdatering av passord');
    if (res.error) throw new Error(translateAuthError(res.error.message));
  } catch (e: any) {
    throw new Error(translateAuthError(e?.message || String(e)));
  }
}

export async function sendPasswordReset(email: string, redirectTo?: string): Promise<void> {
  assertConfigured();
  const target = redirectTo ?? (typeof window !== 'undefined' ? `${window.location.origin}/#reset-password` : undefined);
  try {
    const res = await withTimeout(supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: target }), 15000, 'Sending av e-post');
    if (res.error) throw new Error(translateAuthError(res.error.message));
  } catch (e: any) {
    throw new Error(translateAuthError(e?.message || String(e)));
  }
}

export async function getCurrentSession(): Promise<AuthResult | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await withTimeout(supabase.auth.getSession(), 10000, 'Henting av sesjon');
    if (error || !data.session?.user) return null;
    const profile = await fetchProfile(data.session.user.id, data.session.user.email ?? '');
    const finalProfile = profile ?? fallbackProfileFromAuth(data.session.user, data.session.user.email ?? '');
    return { user: finalProfile, isAdmin: finalProfile.role === 'super_admin' };
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
    const profile = await fetchProfile(session.user.id, session.user.email ?? '');
    const finalProfile = profile ?? fallbackProfileFromAuth(session.user, session.user.email ?? '');
    callback({ user: finalProfile, isAdmin: finalProfile.role === 'super_admin' });
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
  return message;
}
