import { supabase } from './supabaseClient';

export type ProductionSopStatus = 'draft' | 'active' | 'archived';

export interface ProductionSop {
  id: string;
  code: string;
  title: string;
  category: string;
  version: string;
  status: ProductionSopStatus;
  approvedBy?: string;
  approvedAt?: string;
  summary?: string;
  checklist: string[];
  documentUrl?: string;
}

function rowToSop(row: any): ProductionSop {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    category: row.category,
    version: row.version,
    status: row.status,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: row.approved_at ?? undefined,
    summary: row.summary ?? undefined,
    checklist: Array.isArray(row.checklist) ? row.checklist : [],
    documentUrl: row.document_url ?? undefined,
  };
}

function sopToRow(sop: ProductionSop) {
  return {
    id: sop.id,
    code: sop.code,
    title: sop.title,
    category: sop.category,
    version: sop.version,
    status: sop.status,
    approved_by: sop.approvedBy ?? null,
    approved_at: sop.approvedAt ?? null,
    summary: sop.summary ?? null,
    checklist: sop.checklist ?? [],
    document_url: sop.documentUrl ?? null,
  };
}

export async function fetchProductionSops(category = 'table_olives'): Promise<ProductionSop[]> {
  const { data, error } = await supabase
    .from('production_sops')
    .select('*')
    .eq('category', category)
    .order('code', { ascending: true });

  if (error) {
    console.error('[productionSops] fetchProductionSops', error);
    return [];
  }

  return (data || []).map(rowToSop);
}

export async function upsertProductionSop(sop: ProductionSop): Promise<void> {
  const { error } = await supabase
    .from('production_sops')
    .upsert(sopToRow(sop), { onConflict: 'id' });

  if (error) {
    throw new Error(error.message || 'Kunne ikke lagre SOP i Supabase.');
  }
}

export function buildDefaultTableOliveSop(): ProductionSop {
  return {
    id: 'sop-table-olive-001',
    code: 'SOP-DA-TABLE-001',
    title: 'Bordoliven - forbehandling, lake, marinering og salgsklar kontroll',
    category: 'table_olives',
    version: 'v1.0',
    status: 'draft',
    summary: 'Standard Doña Anna arbeidsprosedyre for bordoliven. Må fylles ut og godkjennes før aktiv bruk.',
    checklist: [
      'Råvare er sortert, vasket og skadde oliven er fjernet',
      'Ansvarlig person er registrert',
      'Forbehandling er utført etter godkjent intern prosedyre',
      'Skylling og overgang til lake er kontrollert',
      'pH/saltmålinger er dokumentert der dette er relevant',
      'Batch er godkjent for marinering',
      'Batch er godkjent for pakking',
      'Merking, ingrediensliste og batchkode er kontrollert før salg',
    ],
  };
}
