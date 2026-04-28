import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface B2BTastingRequestInput {
  company: string;
  contactRole: string;
  email: string;
  deliveryAddress: string;
  locale: string;
}

export async function createB2BTastingRequest(input: B2BTastingRequestInput): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured for tasting-kit requests yet.');
  }

  const { error } = await supabase.from('b2b_tasting_requests').insert({
    company: input.company.trim(),
    contact_role: input.contactRole.trim(),
    email: input.email.trim(),
    delivery_address: input.deliveryAddress.trim(),
    locale: input.locale,
    source: 'public_b2b_landing_page',
    status: 'new',
  });

  if (error) throw error;
}
