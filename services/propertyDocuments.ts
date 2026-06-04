import { supabase } from './supabaseClient';

export type PropertyDocumentType = 'copia_simple' | 'escritura' | 'nota_simple' | 'catastro' | 'tax' | 'ownership_proof' | 'other';
export type PropertyDocumentStatus = 'pending_review' | 'verified' | 'needs_followup' | 'archived';

export interface PropertyDocument {
  id: string;
  title: string;
  document_type: PropertyDocumentType;
  owner_name?: string;
  notary_name?: string;
  notary_place?: string;
  deed_number?: string;
  deed_date?: string;
  registry?: string;
  registry_entry?: string;
  protocol_info?: string;
  storage_bucket: string;
  storage_path?: string;
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  public_url?: string;
  linked_parcel_ids: string[];
  cadastral_refs: string[];
  registry_property_numbers: string[];
  summary?: string;
  notes?: string;
  verification_status: PropertyDocumentStatus;
  is_ownership_document: boolean;
  is_active: boolean;
  uploaded_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyDocumentInput {
  title: string;
  document_type: PropertyDocumentType;
  owner_name?: string;
  notary_name?: string;
  notary_place?: string;
  deed_number?: string;
  deed_date?: string;
  registry?: string;
  registry_entry?: string;
  protocol_info?: string;
  linked_parcel_ids?: string[];
  cadastral_refs?: string[];
  registry_property_numbers?: string[];
  summary?: string;
  notes?: string;
  verification_status?: PropertyDocumentStatus;
  is_ownership_document?: boolean;
}

const BUCKET = 'property-documents';

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}`;
}

function throwPropertyDocumentError(label: string, error: any): never {
  console.error(`[propertyDocuments] ${label}`, error);
  const code = error?.code || '';
  const message = error?.message || String(error || '');
  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    throw new Error('Dokumenttabellen mangler. Kjør supabase/migrations/20260603_olivia_property_documents.sql i Supabase SQL Editor.');
  }
  if (/bucket not found|not found/i.test(message)) {
    throw new Error('Storage bucket property-documents mangler. Kjør migrasjonen 20260603_olivia_property_documents.sql.');
  }
  if (code === '42501' || /permission denied|row-level security|rls/i.test(message)) {
    throw new Error('Tilgang nektet av Supabase RLS/Storage-policy for eierskapsdokumenter.');
  }
  throw new Error(message || 'Dokumentoperasjon feilet.');
}

export async function fetchPropertyDocuments(): Promise<PropertyDocument[]> {
  const { data, error } = await supabase
    .from('property_documents')
    .select('*')
    .eq('is_active', true)
    .order('uploaded_at', { ascending: false });
  if (error) throwPropertyDocumentError('fetchPropertyDocuments', error);
  return (data || []) as PropertyDocument[];
}

export async function upsertPropertyDocument(document: PropertyDocument): Promise<PropertyDocument> {
  const { data, error } = await supabase
    .from('property_documents')
    .upsert(document, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throwPropertyDocumentError('upsertPropertyDocument', error);
  return data as PropertyDocument;
}

export async function uploadPropertyDocumentFile(file: File, input: PropertyDocumentInput): Promise<PropertyDocument> {
  const id = makeId('doc');
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();
  const storagePath = `${new Date().getFullYear()}/${id}/${cleanName}`;

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    });

  if (upload.error) throwPropertyDocumentError('uploadPropertyDocumentFile', upload.error);

  const document: PropertyDocument = {
    id,
    title: input.title,
    document_type: input.document_type,
    owner_name: input.owner_name || undefined,
    notary_name: input.notary_name || undefined,
    notary_place: input.notary_place || undefined,
    deed_number: input.deed_number || undefined,
    deed_date: input.deed_date || undefined,
    registry: input.registry || undefined,
    registry_entry: input.registry_entry || undefined,
    protocol_info: input.protocol_info || undefined,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type || 'application/pdf',
    file_size_bytes: file.size,
    linked_parcel_ids: input.linked_parcel_ids || [],
    cadastral_refs: input.cadastral_refs || [],
    registry_property_numbers: input.registry_property_numbers || [],
    summary: input.summary || undefined,
    notes: input.notes || undefined,
    verification_status: input.verification_status || 'pending_review',
    is_ownership_document: input.is_ownership_document ?? true,
    is_active: true,
  };

  return upsertPropertyDocument(document);
}

export async function getPropertyDocumentSignedUrl(document: PropertyDocument): Promise<string | null> {
  if (!document.storage_path) return null;
  const { data, error } = await supabase.storage
    .from(document.storage_bucket || BUCKET)
    .createSignedUrl(document.storage_path, 60 * 10);
  if (error) throwPropertyDocumentError('getPropertyDocumentSignedUrl', error);
  return data?.signedUrl || null;
}

export async function archivePropertyDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('property_documents')
    .update({ is_active: false, verification_status: 'archived' })
    .eq('id', id);
  if (error) throwPropertyDocumentError('archivePropertyDocument', error);
}
