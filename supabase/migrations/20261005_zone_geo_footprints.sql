create table if not exists olivia.farm_zone_geo_samples (
  id text primary key default (gen_random_uuid())::text,
  zone_id text not null references olivia.farm_zones(id) on delete cascade,
  parcel_id text not null references olivia.parcels(id) on delete cascade,
  lat numeric not null,
  lon numeric not null,
  accuracy_m numeric null,
  altitude_m numeric null,
  captured_at timestamptz not null default now(),
  source text not null default 'manual_field_confirmation',
  notes text null,
  created_at timestamptz not null default now(),
  constraint farm_zone_geo_sample_source_check check (
    source in ('manual_field_confirmation','zone_creation','imported')
  )
);

alter table olivia.farm_zone_geo_samples enable row level security;

drop policy if exists olivia_internal_all_farm_zone_geo_samples
  on olivia.farm_zone_geo_samples;

create policy olivia_internal_all_farm_zone_geo_samples
  on olivia.farm_zone_geo_samples
  for all
  to authenticated
  using (olivia_private.is_internal_user())
  with check (olivia_private.is_internal_user());

grant select, insert, update, delete
  on olivia.farm_zone_geo_samples
  to authenticated;

create index if not exists farm_zone_geo_samples_zone_idx
  on olivia.farm_zone_geo_samples(zone_id, captured_at desc);

create index if not exists farm_zone_geo_samples_parcel_idx
  on olivia.farm_zone_geo_samples(parcel_id, captured_at desc);
