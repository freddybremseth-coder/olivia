-- Harvest intake workflow: parcel -> weigh ticket -> received raw material -> production batch.
alter table olivia.harvest_records
  add column if not exists harvest_plan_id text,
  add column if not exists workflow_status text,
  add column if not exists harvested_at timestamptz,
  add column if not exists received_at timestamptz,
  add column if not exists gross_kg numeric,
  add column if not exists tare_kg numeric,
  add column if not exists net_kg numeric,
  add column if not exists container_count integer,
  add column if not exists weigh_ticket_number text,
  add column if not exists weigh_ticket_path text,
  add column if not exists weigh_ticket_filename text,
  add column if not exists weigh_ticket_mime_type text,
  add column if not exists destination text,
  add column if not exists batch_id text,
  add column if not exists source text default 'manual';

do $$ begin
  alter table olivia.harvest_records add constraint harvest_records_workflow_status_check
    check (workflow_status is null or workflow_status in ('harvested','received','processing','completed'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table olivia.harvest_records add constraint harvest_records_destination_check
    check (destination is null or destination in ('oil','table_olives','cooperative','other'));
exception when duplicate_object then null; end $$;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('olivia-harvest-documents','olivia-harvest-documents',false,52428800,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']::text[])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "olivia harvest docs select own" on storage.objects;
create policy "olivia harvest docs select own" on storage.objects for select to authenticated
using (bucket_id='olivia-harvest-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "olivia harvest docs insert own" on storage.objects;
create policy "olivia harvest docs insert own" on storage.objects for insert to authenticated
with check (bucket_id='olivia-harvest-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "olivia harvest docs update own" on storage.objects;
create policy "olivia harvest docs update own" on storage.objects for update to authenticated
using (bucket_id='olivia-harvest-documents' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='olivia-harvest-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "olivia harvest docs delete own" on storage.objects;
create policy "olivia harvest docs delete own" on storage.objects for delete to authenticated
using (bucket_id='olivia-harvest-documents' and (storage.foldername(name))[1]=(select auth.uid())::text);

create index if not exists harvest_records_workflow_status_idx on olivia.harvest_records(workflow_status);
create index if not exists harvest_records_batch_id_idx on olivia.harvest_records(batch_id);
create index if not exists harvest_records_plan_id_idx on olivia.harvest_records(harvest_plan_id);
