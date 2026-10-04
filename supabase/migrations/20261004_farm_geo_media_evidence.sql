create table if not exists olivia.farm_media_evidence (
  id text primary key default (gen_random_uuid())::text,
  media_url text not null,
  media_kind text not null default 'photo',
  source_module text not null,
  source_ref text null,
  parcel_id text null references olivia.parcels(id) on delete set null,
  zone_id text null,
  lat numeric null,
  lon numeric null,
  accuracy_m numeric null,
  altitude_m numeric null,
  heading_deg numeric null,
  geo_captured_at timestamptz null,
  geo_source text not null default 'none',
  match_method text not null default 'unmatched',
  match_distance_m numeric null,
  match_confidence numeric null,
  metadata jsonb not null default '{}'::jsonb,
  created_by text null,
  created_at timestamptz not null default now(),
  constraint farm_media_geo_source_check check (geo_source in ('device_live_capture','device_at_upload','manual','exif','none')),
  constraint farm_media_match_method_check check (match_method in ('polygon','boundary_near','nearest','manual','unmatched')),
  constraint farm_media_match_confidence_check check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 1))
);

alter table olivia.farm_media_evidence enable row level security;

drop policy if exists olivia_internal_all_farm_media_evidence
  on olivia.farm_media_evidence;

create policy olivia_internal_all_farm_media_evidence
  on olivia.farm_media_evidence
  for all
  to authenticated
  using (olivia_private.is_internal_user())
  with check (olivia_private.is_internal_user());

grant select, insert, update, delete
  on olivia.farm_media_evidence
  to authenticated;

create index if not exists farm_media_evidence_parcel_created_idx
  on olivia.farm_media_evidence(parcel_id, created_at desc);

create index if not exists farm_media_evidence_source_idx
  on olivia.farm_media_evidence(source_module, source_ref);

create index if not exists farm_media_evidence_geo_idx
  on olivia.farm_media_evidence(lat, lon)
  where lat is not null and lon is not null;

alter table olivia.farm_observations
  add column if not exists geo_lat numeric null,
  add column if not exists geo_lon numeric null,
  add column if not exists geo_accuracy_m numeric null,
  add column if not exists geo_captured_at timestamptz null,
  add column if not exists geo_source text null,
  add column if not exists geo_match_method text null,
  add column if not exists geo_match_confidence numeric null;

alter table olivia.farm_agent_assessments
  add column if not exists geo_context jsonb null;

alter table olivia.pruning_history
  add column if not exists geo_context jsonb null;

alter table olivia.olive_variety_references
  add column if not exists geo_context jsonb null;
