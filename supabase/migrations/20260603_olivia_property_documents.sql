-- Olivia / Dona Anna property ownership document registry
-- Stores metadata in olivia.property_documents and files in Supabase Storage bucket property-documents.

create extension if not exists "pgcrypto";
create schema if not exists olivia;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-documents',
  'property-documents',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists olivia.property_documents (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  document_type text not null check (document_type in ('copia_simple', 'escritura', 'nota_simple', 'catastro', 'tax', 'ownership_proof', 'other')),
  owner_name text,
  notary_name text,
  notary_place text,
  deed_number text,
  deed_date date,
  registry text,
  registry_entry text,
  protocol_info text,
  storage_bucket text not null default 'property-documents',
  storage_path text,
  original_filename text,
  mime_type text,
  file_size_bytes bigint,
  public_url text,
  linked_parcel_ids text[] not null default '{}',
  cadastral_refs text[] not null default '{}',
  registry_property_numbers text[] not null default '{}',
  summary text,
  notes text,
  verification_status text not null default 'pending_review' check (verification_status in ('pending_review', 'verified', 'needs_followup', 'archived')),
  is_ownership_document boolean not null default true,
  is_active boolean not null default true,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_documents_type_idx on olivia.property_documents(document_type);
create index if not exists property_documents_owner_idx on olivia.property_documents(owner_name);
create index if not exists property_documents_linked_parcels_idx on olivia.property_documents using gin(linked_parcel_ids);
create index if not exists property_documents_cadastral_refs_idx on olivia.property_documents using gin(cadastral_refs);
create index if not exists property_documents_registry_numbers_idx on olivia.property_documents using gin(registry_property_numbers);
create index if not exists property_documents_uploaded_at_idx on olivia.property_documents(uploaded_at desc);

alter table olivia.property_documents enable row level security;

create or replace function olivia.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_property_documents_updated_at on olivia.property_documents;
create trigger set_property_documents_updated_at before update on olivia.property_documents for each row execute function olivia.set_updated_at();

drop policy if exists "Allow authenticated read property_documents" on olivia.property_documents;
create policy "Allow authenticated read property_documents" on olivia.property_documents for select to authenticated using (true);

drop policy if exists "Allow authenticated write property_documents" on olivia.property_documents;
create policy "Allow authenticated write property_documents" on olivia.property_documents for all to authenticated using (true) with check (true);

-- Storage policies for private ownership documents.
-- Files are not public; authenticated users can upload/read/update/delete through the app.
drop policy if exists "Allow authenticated read property documents storage" on storage.objects;
create policy "Allow authenticated read property documents storage"
on storage.objects for select to authenticated
using (bucket_id = 'property-documents');

drop policy if exists "Allow authenticated insert property documents storage" on storage.objects;
create policy "Allow authenticated insert property documents storage"
on storage.objects for insert to authenticated
with check (bucket_id = 'property-documents');

drop policy if exists "Allow authenticated update property documents storage" on storage.objects;
create policy "Allow authenticated update property documents storage"
on storage.objects for update to authenticated
using (bucket_id = 'property-documents')
with check (bucket_id = 'property-documents');

drop policy if exists "Allow authenticated delete property documents storage" on storage.objects;
create policy "Allow authenticated delete property documents storage"
on storage.objects for delete to authenticated
using (bucket_id = 'property-documents');
