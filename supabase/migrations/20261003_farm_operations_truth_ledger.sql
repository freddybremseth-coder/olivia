
create table if not exists olivia.farm_documents (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  document_kind text not null default 'other'
    check (document_kind in ('invoice','receipt','quote','proforma','agronomy_plan','message','photo','video','lab','rain_record','work_order','other')),
  evidence_status text not null default 'unknown'
    check (evidence_status in ('completed','planned','recommended','ordered','purchased','observed','unknown')),
  document_date date null,
  source_name text null,
  parcel_id text null references olivia.parcels(id) on delete set null,
  storage_bucket text not null default 'olivia-farm-documents',
  storage_path text null,
  original_filename text null,
  mime_type text null,
  file_size_bytes bigint null,
  plain_text text null,
  extracted_summary text null,
  scan_json jsonb null,
  confidence numeric null check (confidence is null or (confidence >= 0 and confidence <= 1)),
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review','verified','rejected')),
  notes text null,
  created_by text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_farm_documents_date on olivia.farm_documents(document_date desc);
create index if not exists idx_farm_documents_kind on olivia.farm_documents(document_kind);
create index if not exists idx_farm_documents_review on olivia.farm_documents(review_status);
create index if not exists idx_farm_documents_parcel on olivia.farm_documents(parcel_id);

create table if not exists olivia.farm_events (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  event_type text not null default 'other'
    check (event_type in (
      'spraying','pruning','cultivation','desuckering','young_tree_care','planting',
      'fertilization','irrigation','rain','inspection','maintenance','harvest',
      'purchase','soil_work','pest_control','disease_control','training','other'
    )),
  event_status text not null default 'observed'
    check (event_status in ('completed','planned','recommended','ordered','purchased','observed')),
  occurred_on date null,
  planned_for date null,
  period_label text null,
  date_precision text not null default 'unknown'
    check (date_precision in ('exact','month','window','invoice_date_only','unknown')),
  parcel_id text null references olivia.parcels(id) on delete set null,
  scope text not null default 'farm' check (scope in ('farm','parcel')),
  description text null,
  source_document_id text null references olivia.farm_documents(id) on delete set null,
  source_kind text null,
  source_ref text null,
  vendor text null,
  products jsonb not null default '[]'::jsonb,
  amount numeric null,
  currency text null default 'EUR',
  tree_count_delta integer null,
  recurrence_candidate boolean not null default false,
  recurrence_reason text null,
  confidence numeric null check (confidence is null or (confidence >= 0 and confidence <= 1)),
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_farm_events_occurred on olivia.farm_events(occurred_on desc);
create index if not exists idx_farm_events_planned on olivia.farm_events(planned_for);
create index if not exists idx_farm_events_type on olivia.farm_events(event_type);
create index if not exists idx_farm_events_status on olivia.farm_events(event_status);
create index if not exists idx_farm_events_parcel on olivia.farm_events(parcel_id);
create index if not exists idx_farm_events_document on olivia.farm_events(source_document_id);

create table if not exists olivia.farm_inputs (
  id text primary key default gen_random_uuid()::text,
  normalized_name text not null unique,
  name text not null,
  composition text null,
  intended_use text null,
  dose text null,
  organic_note text null,
  first_source_document_id text null references olivia.farm_documents(id) on delete set null,
  last_source_document_id text null references olivia.farm_documents(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  notes text null
);

create table if not exists olivia.rain_measurements (
  id text primary key default gen_random_uuid()::text,
  measured_on date not null,
  mm numeric not null check (mm >= 0),
  source text not null default 'manual_gauge'
    check (source in ('manual_gauge','weather_station','sensor','document','other')),
  parcel_id text null references olivia.parcels(id) on delete set null,
  notes text null,
  source_document_id text null references olivia.farm_documents(id) on delete set null,
  created_by text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rain_measurements_date on olivia.rain_measurements(measured_on desc);
create index if not exists idx_rain_measurements_parcel on olivia.rain_measurements(parcel_id);

create table if not exists olivia.farm_year_wheel_items (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  activity_type text not null,
  target_year integer not null,
  target_month integer not null check (target_month between 1 and 12),
  target_day integer null check (target_day is null or target_day between 1 and 31),
  period_label text null,
  parcel_id text null references olivia.parcels(id) on delete set null,
  source_event_id text null references olivia.farm_events(id) on delete set null,
  basis text not null default 'historical_completed'
    check (basis in ('historical_completed','historical_recommended','manual','agronomy_plan')),
  status text not null default 'suggested'
    check (status in ('suggested','approved','done','skipped')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_event_id,target_year)
);

create index if not exists idx_year_wheel_target on olivia.farm_year_wheel_items(target_year,target_month,target_day);
create index if not exists idx_year_wheel_status on olivia.farm_year_wheel_items(status);

alter table olivia.farm_documents enable row level security;
alter table olivia.farm_events enable row level security;
alter table olivia.farm_inputs enable row level security;
alter table olivia.rain_measurements enable row level security;
alter table olivia.farm_year_wheel_items enable row level security;

do $$ begin
  create policy olivia_internal_all_farm_documents on olivia.farm_documents
    for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy olivia_internal_all_farm_events on olivia.farm_events
    for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy olivia_internal_all_farm_inputs on olivia.farm_inputs
    for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy olivia_internal_all_rain_measurements on olivia.rain_measurements
    for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy olivia_internal_all_farm_year_wheel_items on olivia.farm_year_wheel_items
    for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'olivia-farm-documents','olivia-farm-documents',false,104857600,
  array[
    'application/pdf',
    'image/jpeg','image/png','image/webp','image/heic','image/heif',
    'video/mp4','video/webm',
    'text/plain'
  ]::text[]
)
on conflict (id) do nothing;

do $$ begin
  create policy olivia_farm_documents_storage_select on storage.objects
    for select to authenticated
    using (bucket_id='olivia-farm-documents' and olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy olivia_farm_documents_storage_insert on storage.objects
    for insert to authenticated
    with check (bucket_id='olivia-farm-documents' and olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy olivia_farm_documents_storage_update on storage.objects
    for update to authenticated
    using (bucket_id='olivia-farm-documents' and olivia_private.is_internal_user())
    with check (bucket_id='olivia-farm-documents' and olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;
do $$ begin
  create policy olivia_farm_documents_storage_delete on storage.objects
    for delete to authenticated
    using (bucket_id='olivia-farm-documents' and olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;

create or replace function olivia.verify_farm_document(p_document_id text)
returns void
language plpgsql
security definer
set search_path='olivia','public'
as $$
declare
  e record;
  source_date date;
  next_year integer;
  source_month integer;
  source_day integer;
  basis_value text;
begin
  if not olivia_private.is_internal_user() then
    raise exception 'Internal Olivia access required';
  end if;

  update olivia.farm_documents
     set review_status='verified', updated_at=now()
   where id=p_document_id;

  update olivia.farm_events
     set verified=true, updated_at=now()
   where source_document_id=p_document_id;

  for e in
    select * from olivia.farm_events
     where source_document_id=p_document_id
       and recurrence_candidate=true
       and event_status in ('completed','recommended')
  loop
    source_date := coalesce(e.occurred_on,e.planned_for);
    if source_date is null then
      continue;
    end if;

    next_year := extract(year from source_date)::int + 1;
    source_month := extract(month from source_date)::int;
    source_day := extract(day from source_date)::int;
    basis_value := case when e.event_status='completed' then 'historical_completed' else 'historical_recommended' end;

    insert into olivia.farm_year_wheel_items(
      id,title,activity_type,target_year,target_month,target_day,period_label,
      parcel_id,source_event_id,basis,status,notes
    ) values(
      'wheel-'||e.id||'-'||next_year,
      e.title,e.event_type,next_year,source_month,
      case when e.date_precision='exact' then source_day else null end,
      e.period_label,e.parcel_id,e.id,basis_value,'suggested',
      coalesce(e.recurrence_reason,'Foreslått fra verifisert historikk. Bekreft mot vær, fenologi og faktisk behov før arbeid utføres.')
    )
    on conflict (source_event_id,target_year) do nothing;
  end loop;
end;
$$;

grant execute on function olivia.verify_farm_document(text) to authenticated;
