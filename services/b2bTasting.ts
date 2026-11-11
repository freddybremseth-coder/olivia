import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface B2BTastingRequestInput {
  company: string;
  contactName: string;
  buyerType: string;
  product: string;
  estimatedNeed?: string;
  message?: string;
  contactRole: string;
  email: string;
  deliveryAddress?: string;
  locale: string;
}

export async function createB2BTastingRequest(input: B2BTastingRequestInput): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured for tasting-kit requests yet.');
  }

  const company = input.company.trim();
  const email = input.email.trim();
  if (!company || company.length > 180 || !email || email.length > 254 || !email.includes('@')) {
    throw new Error('Invalid company or email for B2B inquiry.');
  }
  const notes = JSON.stringify({
    contact_name: input.contactName.trim().slice(0, 120),
    buyer_type: input.buyerType.trim().slice(0, 80),
    product: input.product.trim().slice(0, 120),
    estimated_need: input.estimatedNeed?.trim().slice(0, 300) || '',
    message: input.message?.trim().slice(0, 1500) || '',
  });

  const { error } = await supabase.from('b2b_tasting_requests').insert({
    company,
    contact_role: input.contactRole.trim().slice(0, 120),
    email,
    delivery_address: input.deliveryAddress?.trim().slice(0, 300) || null,
    locale: input.locale,
    source: 'public_b2b_landing_page',
    status: 'new',
    notes,
  });

  if (error) throw error;
}

/** Only Olivia super-admin sessions may read these rows (enforced by database RLS). */
export async function fetchB2BTastingRequests(): Promise<Array<Record<string, string | number>>> {
  const { data, error } = await supabase
    .from('b2b_tasting_requests')
    .select('id,company,contact_role,email,delivery_address,status,notes,created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map(row => {
    let details: Record<string, string> = {};
    try { details = JSON.parse(row.notes || '{}'); } catch { /* Legacy plain-text note */ }
    return {
      ID: row.id,
      Dato: row.created_at ? new Date(row.created_at).toLocaleDateString('nb-NO') : '',
      Bedrift: row.company || '',
      Kontakt: details.contact_name || '',
      Type: details.buyer_type || '',
      Produkt: details.product || '',
      Behov: details.estimated_need || '',
      Epost: row.email || '',
      Rolle: row.contact_role || '',
      Område: row.delivery_address || '',
      Melding: details.message || '',
      Status: row.status || 'new',
    };
  });
}

export type B2BInquiryStatus = 'new' | 'qualified' | 'contacted' | 'closed';

/** Admin-only handoff while RealtyFlow lacks a Doña Anna-specific intake contract. */
export function exportB2BInquiriesCsv(rows: Array<Record<string, string | number>>): string {
  const headers = ['ID', 'Dato', 'Bedrift', 'Kontakt', 'Type', 'Produkt', 'Behov', 'Epost', 'Rolle', 'Område', 'Melding', 'Status'];
  const escapeCell = (value: string | number | undefined): string => {
    const raw = String(value ?? '');
    // Protect CRM / spreadsheet imports from formula execution in untrusted form fields.
    const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return '\uFEFF' + [headers.map(escapeCell).join(';'), ...rows.map(row => headers.map(key => escapeCell(row[key])).join(';'))].join('\r\n');
}

/** Database policy also limits UPDATE to Olivia super-admins and these two columns. */
export async function updateB2BInquiryStatus(id: string, status: B2BInquiryStatus): Promise<void> {
  const { data, error } = await supabase
    .from('b2b_tasting_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data?.length) throw new Error('Statusen ble ikke lagret. Kontroller administratorrettighetene.');
}
