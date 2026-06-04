import { supabase } from './supabaseClient';
import { ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS } from './organicCertificationPackage';

export type CaecvDocumentStatus = 'template' | 'draft' | 'ready_for_signature' | 'signed' | 'submitted' | 'accepted' | 'rejected' | 'archived';
export type CaecvDocumentType = 'form' | 'supporting_document' | 'signed_form' | 'identity' | 'proof' | 'receipt' | 'correspondence' | 'other';
export type CaecvParty = 'previous_holder' | 'new_holder' | 'both';
export type CaecvSubmissionMethod = 'email_digital_signature' | 'postal_mail' | 'in_person' | 'operator_portal' | 'unknown';

export interface CaecvDocument {
  id: string;
  package_id: string;
  caecv_item_id?: string;
  title: string;
  document_code?: string;
  document_type: CaecvDocumentType;
  party: CaecvParty;
  status: CaecvDocumentStatus;
  required: boolean;
  storage_bucket: string;
  storage_path?: string;
  original_filename?: string;
  mime_type?: string;
  file_size_bytes?: number;
  version_label?: string;
  signed_by?: string;
  signed_at?: string;
  submitted_at?: string;
  submission_method?: CaecvSubmissionMethod;
  linked_parcel_ids: string[];
  cadastral_refs: string[];
  notes?: string;
  extracted_summary?: string;
  next_action?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CaecvDocumentInput {
  caecv_item_id?: string;
  title: string;
  document_code?: string;
  document_type: CaecvDocumentType;
  party: CaecvParty;
  status: CaecvDocumentStatus;
  required: boolean;
  version_label?: string;
  signed_by?: string;
  signed_at?: string;
  submitted_at?: string;
  submission_method?: CaecvSubmissionMethod;
  linked_parcel_ids?: string[];
  cadastral_refs?: string[];
  notes?: string;
  extracted_summary?: string;
  next_action?: string;
}

const BUCKET = 'caecv-documents';
const PACKAGE_ID = 'change_of_ownership_2026';

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}`;
}

function throwCaecvError(label: string, error: any): never {
  console.error(`[caecvDocuments] ${label}`, error);
  const code = error?.code || '';
  const message = error?.message || String(error || '');
  if (code === '42P01' || /relation .* does not exist/i.test(message)) {
    throw new Error('CAECV-dokumenttabellen mangler. Kjør supabase/migrations/20260603_olivia_caecv_documents.sql i Supabase SQL Editor.');
  }
  if (/bucket not found|not found/i.test(message)) {
    throw new Error('Storage bucket caecv-documents mangler. Kjør migrasjonen 20260603_olivia_caecv_documents.sql.');
  }
  if (code === '42501' || /permission denied|row-level security|rls/i.test(message)) {
    throw new Error('Tilgang nektet av Supabase RLS/Storage-policy for CAECV-dokumenter.');
  }
  throw new Error(message || 'CAECV-dokumentoperasjon feilet.');
}

export function defaultCaecvDocumentInput(itemId?: string): CaecvDocumentInput {
  const item = ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.find(i => i.id === itemId) || ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS[1];
  return {
    caecv_item_id: item?.id,
    title: item?.title || 'CAECV dokument',
    document_code: item?.caecvCode,
    document_type: item?.type === 'supporting_document' ? 'supporting_document' : 'form',
    party: item?.party || 'new_holder',
    status: 'template',
    required: item?.required ?? true,
    version_label: item?.fileName ? 'Mal / original CAECV' : undefined,
    notes: item?.summary,
    next_action: item?.appAction,
  };
}

export async function fetchCaecvDocuments(): Promise<CaecvDocument[]> {
  const { data, error } = await supabase
    .from('caecv_documents')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false });
  if (error) throwCaecvError('fetchCaecvDocuments', error);
  return (data || []) as CaecvDocument[];
}

export async function uploadCaecvDocument(file: File, input: CaecvDocumentInput): Promise<CaecvDocument> {
  const id = makeId('caecv');
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').toLowerCase();
  const itemPart = input.caecv_item_id || 'general';
  const storagePath = `${PACKAGE_ID}/${itemPart}/${id}/${cleanName}`;

  const upload = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    });
  if (upload.error) throwCaecvError('uploadCaecvDocument', upload.error);

  const row: CaecvDocument = {
    id,
    package_id: PACKAGE_ID,
    caecv_item_id: input.caecv_item_id || undefined,
    title: input.title,
    document_code: input.document_code || undefined,
    document_type: input.document_type,
    party: input.party,
    status: input.status,
    required: input.required,
    storage_bucket: BUCKET,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type || undefined,
    file_size_bytes: file.size,
    version_label: input.version_label || undefined,
    signed_by: input.signed_by || undefined,
    signed_at: input.signed_at || undefined,
    submitted_at: input.submitted_at || undefined,
    submission_method: input.submission_method || undefined,
    linked_parcel_ids: input.linked_parcel_ids || [],
    cadastral_refs: input.cadastral_refs || [],
    notes: input.notes || undefined,
    extracted_summary: input.extracted_summary || undefined,
    next_action: input.next_action || undefined,
    is_active: true,
  };

  const { data, error } = await supabase
    .from('caecv_documents')
    .insert(row)
    .select('*')
    .single();
  if (error) throwCaecvError('insertCaecvDocument', error);
  return data as CaecvDocument;
}

export async function updateCaecvDocument(document: CaecvDocument): Promise<CaecvDocument> {
  const { data, error } = await supabase
    .from('caecv_documents')
    .upsert(document, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throwCaecvError('updateCaecvDocument', error);
  return data as CaecvDocument;
}

export async function getCaecvDocumentSignedUrl(document: CaecvDocument): Promise<string | null> {
  if (!document.storage_path) return null;
  const { data, error } = await supabase.storage
    .from(document.storage_bucket || BUCKET)
    .createSignedUrl(document.storage_path, 60 * 10);
  if (error) throwCaecvError('getCaecvDocumentSignedUrl', error);
  return data?.signedUrl || null;
}

export async function archiveCaecvDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('caecv_documents')
    .update({ is_active: false, status: 'archived' })
    .eq('id', id);
  if (error) throwCaecvError('archiveCaecvDocument', error);
}
