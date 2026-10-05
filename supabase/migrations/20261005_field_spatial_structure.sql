alter table olivia.farm_zones
  add column if not exists anchor_lat numeric null,
  add column if not exists anchor_lon numeric null,
  add column if not exists anchor_accuracy_m numeric null,
  add column if not exists geo_context jsonb null;

alter table olivia.tree_groups
  add column if not exists anchor_lat numeric null,
  add column if not exists anchor_lon numeric null,
  add column if not exists anchor_accuracy_m numeric null,
  add column if not exists geo_context jsonb null;

create table if not exists olivia.farm_geo_landmarks (
  id text primary key default (gen_random_uuid())::text,
  parcel_id text null references olivia.parcels(id) on delete set null,
  zone_id text null references olivia.farm_zones(id) on delete set null,
  tree_group_id text null references olivia.tree_groups(id) on delete set null,
  landmark_type text not null default 'other',
  name text not null,
  description text null,
  lat numeric not null,
  lon numeric not null,
  accuracy_m numeric null,
  altitude_m numeric null,
  geo_context jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint farm_geo_landmark_type_check check (
    landmark_type in ('well','pump','irrigation','access','tree_reference','problem_point','storage','building','other')
  ),
  constraint farm_geo_landmark_status_check check (status in ('active','inactive','removed'))
);

alter table olivia.farm_geo_landmarks enable row level security;

drop policy if exists olivia_internal_all_farm_geo_landmarks
  on olivia.farm_geo_landmarks;

create policy olivia_internal_all_farm_geo_landmarks
  on olivia.farm_geo_landmarks
  for all
  to authenticated
  using (olivia_private.is_internal_user())
  with check (olivia_private.is_internal_user());

grant select, insert, update, delete
  on olivia.farm_geo_landmarks
  to authenticated;

create index if not exists farm_geo_landmarks_parcel_idx
  on olivia.farm_geo_landmarks(parcel_id, created_at desc);

create index if not exists farm_geo_landmarks_zone_idx
  on olivia.farm_geo_landmarks(zone_id, created_at desc);
