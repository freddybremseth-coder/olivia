create table if not exists olivia.olive_variety_references (
  id text primary key,
  parcel_id text null references olivia.parcels(id) on delete set null,
  tree_label text null,
  variety_name text not null,
  status text not null default 'confirmed'
    check (status in ('confirmed','provisional','rejected')),
  confidence numeric not null default 1
    check (confidence >= 0 and confidence <= 1),
  inspection_json jsonb not null default '{}'::jsonb,
  image_urls jsonb not null default '[]'::jsonb,
  source_assessment_id text null,
  notes text null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table olivia.olive_variety_references enable row level security;

create policy olivia_internal_all_olive_variety_references
  on olivia.olive_variety_references
  for all
  to authenticated
  using (olivia_private.is_internal_user())
  with check (olivia_private.is_internal_user());

grant select, insert, update, delete
  on olivia.olive_variety_references
  to authenticated;

create index if not exists olive_variety_references_parcel_idx
  on olivia.olive_variety_references(parcel_id, confirmed_at desc);

create index if not exists olive_variety_references_variety_idx
  on olivia.olive_variety_references(variety_name, status);
