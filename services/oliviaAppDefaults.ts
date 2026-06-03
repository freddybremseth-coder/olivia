import type { Parcel, UserProfile } from '../types';

export const BIAR_DEFAULT_COORDS = { lat: 38.6294, lon: -0.7667 };
export const BIAR_DEFAULT_LOCATION_NAME = 'Biar, Alicante';

// Important: keep the app free of demo farm parcels. Real parcel data must come
// from Supabase olivia.parcels. An empty array lets modules render their proper
// empty states instead of silently showing fake farm data.
export const EMPTY_OLIVIA_PARCELS: Parcel[] = [];

// Neutral placeholder used only before Supabase Auth/public.user_profiles has
// resolved. Avoid showing fictional people or demo emails in the app shell.
export const OLIVIA_FALLBACK_USER: UserProfile = {
  id: 'pending-profile',
  name: 'Doña Anna bruker',
  email: '',
  role: 'farmer',
  subscription: 'trial',
  subscriptionStart: '',
  avatar: '',
};
