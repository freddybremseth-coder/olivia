-- Olivia / Doña Anna CAECV organic certification document archive
-- Stores CAECV application package metadata in olivia.caecv_documents and files in private Supabase Storage bucket caecv-documents.

create extension if not exists "pgcrypto";
create schema if not exists olivia;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'caecv-documents',
  'caecv-documents',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists olivia.caecv_documents (
  id text primary key default gen_random_uuid()::text,
  package_id text not null default 'change_of_ownership_2026',
  caecv_item_id text,
  title text not null,
  document_code text,
  document_type text not null default 'form' check (document_type in ('form', 'supporting_document', 'signed_form', 'identity', 'proof', 'receipt', 'correspondence', 'other')),
  party text not null default 'new_holder' check (party in ('previous_holder', 'new_holder', 'both')),
  status text not null default 'template' check (status in ('template', 'draft', 'ready_for_signature', 'signed', 'submitted', 'accepted', 'rejected', 'archived')),
  required boolean not null default true,
  storage_bucket text not null default 'caecv-documents',
  storage_path text,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  version_label text,
  signed_by text,
  signed_at date,
  submitted_at date,
  submission_method text check (submission_method in ('email_digital_signature', 'postal_mail', 'in_person', 'operator_portal', 'unknown')),
  linked_parcel_ids text[] not null default '{}',
  cadastral_refs text[] not null default '{}',
  notes text,
  extracted_summary text,
  next_action text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists caecv_documents_package_idx on olivia.caecv_documents(package_id);
create index if not exists caecv_documents_item_idx on olivia.caecv_documents(caecv_item_id);
create index if not exists caecv_documents_status_idx on olivia.caecv_documents(status);
create index if not exists caecv_documents_party_idx on olivia.caecv_documents(party);
create index if not exists caecv_documents_linked_parcels_idx on olivia.caecv_documents using gin(linked_parcel_ids);
create index if not exists caecv_documents_cadastral_refs_idx on olivia.caecv_documents using gin(cadastral_refs);

alter table olivia.caecv_documents enable row level security;

create or replace function olivia.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_caecv_documents_updated_at on olivia.caecv_documents;
create trigger set_caecv_documents_updated_at before update on olivia.caecv_documents for each row execute function olivia.set_updated_at();

drop policy if exists "Allow authenticated read caecv_documents" on olivia.caecv_documents;
create policy "Allow authenticated read caecv_documents" on olivia.caecv_documents for select to authenticated using (true);

drop policy if exists "Allow authenticated write caecv_documents" on olivia.caecv_documents;
create policy "Allow authenticated write caecv_documents" on olivia.caecv_documents for all to authenticated using (true) with check (true);

-- Storage policies for private CAECV documents.
drop policy if exists "Allow authenticated read caecv documents storage" on storage.objects;
create policy "Allow authenticated read caecv documents storage"
on storage.objects for select to authenticated
using (bucket_id = 'caecv-documents');

drop policy if exists "Allow authenticated insert caecv documents storage" on storage.objects;
create policy "Allow authenticated insert caecv documents storage"
on storage.objects for insert to authenticated
with check (bucket_id = 'caecv-documents');

drop policy if exists "Allow authenticated update caecv documents storage" on storage.objects;
create policy "Allow authenticated update caecv documents storage"
on storage.objects for update to authenticated
using (bucket_id = 'caecv-documents')
with check (bucket_id = 'caecv-documents');

drop policy if exists "Allow authenticated delete caecv documents storage" on storage.objects;
create policy "Allow authenticated delete caecv documents storage"
on storage.objects for delete to authenticated
using (bucket_id = 'caecv-documents');
