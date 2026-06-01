-- Dona Anna / Olivia Farm IoT schema
-- Purpose: move Olivia from local demo sensor data to real farm data for Biar, Alicante.

create extension if not exists "pgcrypto";

-- Farm zones: parcel -> zone
create table if not exists public.farm_zones (
  id uuid primary key default gen_random_uuid(),
  parcel_id text not null,
  name text not null,
  description text,
  slope text check (slope in ('flat', 'north', 'south', 'east', 'west', 'mixed')),
  altitude_m integer default 650,
  soil_type text,
  irrigation_sector_id text,
  boundaries jsonb,
  status text default 'watch' check (status in ('optimal', 'watch', 'warning', 'critical', 'offline')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists farm_zones_parcel_id_idx on public.farm_zones(parcel_id);
create index if not exists farm_zones_status_idx on public.farm_zones(status);

-- Tree groups: zone -> tree group
create table if not exists public.tree_groups (
  id uuid primary key default gen_random_uuid(),
  parcel_id text not null,
  zone_id uuid references public.farm_zones(id) on delete set null,
  name text not null,
  variety text,
  tree_count integer,
  age_years integer,
  production_goal text check (production_goal in ('oil', 'table_olives', 'mixed')),
  health_status text default 'watch' check (health_status in ('optimal', 'watch', 'warning', 'critical', 'offline')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tree_groups_parcel_id_idx on public.tree_groups(parcel_id);
create index if not exists tree_groups_zone_id_idx on public.tree_groups(zone_id);
create index if not exists tree_groups_variety_idx on public.tree_groups(variety);

-- Sensor devices: one row per physical/logical sensor
create table if not exists public.sensor_devices (
  id uuid primary key default gen_random_uuid(),
  sensor_id text not null unique,
  name text not null,
  type text not null check (type in (
    'soil_moisture',
    'soil_temperature',
    'soil_ec',
    'soil_ph',
    'water_ec',
    'water_ph',
    'flow',
    'pressure',
    'rain',
    'air_temperature',
    'air_humidity',
    'leaf_wetness',
    'battery'
  )),
  parcel_id text,
  zone_id uuid references public.farm_zones(id) on delete set null,
  tree_group_id uuid references public.tree_groups(id) on delete set null,
  tree_group text,
  depth_cm integer,
  unit text not null,
  source text not null default 'manual',
  status text not null default 'Online' check (status in ('Online', 'Offline', 'Low Battery')),
  battery_percent numeric,
  signal_rssi numeric,
  calibrated_at timestamptz,
  installed_at timestamptz default now(),
  last_seen_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sensor_devices_type_idx on public.sensor_devices(type);
create index if not exists sensor_devices_parcel_id_idx on public.sensor_devices(parcel_id);
create index if not exists sensor_devices_zone_id_idx on public.sensor_devices(zone_id);
create index if not exists sensor_devices_status_idx on public.sensor_devices(status);

-- Sensor readings: time-series values
create table if not exists public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  sensor_id text not null references public.sensor_devices(sensor_id) on delete cascade,
  parcel_id text,
  zone_id uuid references public.farm_zones(id) on delete set null,
  tree_group_id uuid references public.tree_groups(id) on delete set null,
  tree_group text,
  depth_cm integer,
  type text not null,
  value numeric not null,
  unit text not null,
  battery_percent numeric,
  signal_rssi numeric,
  calibrated_at timestamptz,
  measured_at timestamptz not null,
  received_at timestamptz not null default now(),
  source text default 'manual',
  quality_score numeric,
  raw_payload jsonb
);

create index if not exists sensor_readings_sensor_id_measured_at_idx on public.sensor_readings(sensor_id, measured_at desc);
create index if not exists sensor_readings_parcel_id_measured_at_idx on public.sensor_readings(parcel_id, measured_at desc);
create index if not exists sensor_readings_zone_id_measured_at_idx on public.sensor_readings(zone_id, measured_at desc);
create index if not exists sensor_readings_type_measured_at_idx on public.sensor_readings(type, measured_at desc);

-- Sensor alerts: actionable warnings
create table if not exists public.sensor_alerts (
  id uuid primary key default gen_random_uuid(),
  sensor_id text references public.sensor_devices(sensor_id) on delete set null,
  parcel_id text,
  zone_id uuid references public.farm_zones(id) on delete set null,
  tree_group_id uuid references public.tree_groups(id) on delete set null,
  tree_group text,
  type text not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  recommended_action text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists sensor_alerts_created_at_idx on public.sensor_alerts(created_at desc);
create index if not exists sensor_alerts_severity_idx on public.sensor_alerts(severity);
create index if not exists sensor_alerts_zone_id_idx on public.sensor_alerts(zone_id);

-- Irrigation events: manual, scheduled, recommended or automated irrigation
create table if not exists public.irrigation_events (
  id uuid primary key default gen_random_uuid(),
  parcel_id text not null,
  zone_id uuid references public.farm_zones(id) on delete set null,
  irrigation_sector_id text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer,
  estimated_liters numeric,
  flow_l_min numeric,
  pressure_bar numeric,
  trigger text not null default 'manual' check (trigger in ('manual', 'schedule', 'recommendation', 'automation')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists irrigation_events_parcel_id_started_at_idx on public.irrigation_events(parcel_id, started_at desc);
create index if not exists irrigation_events_zone_id_started_at_idx on public.irrigation_events(zone_id, started_at desc);

-- Field observations: mobile notes, pictures, issues and organic certification observations
create table if not exists public.farm_observations (
  id uuid primary key default gen_random_uuid(),
  parcel_id text,
  zone_id uuid references public.farm_zones(id) on delete set null,
  tree_group_id uuid references public.tree_groups(id) on delete set null,
  tree_group text,
  category text not null check (category in (
    'soil',
    'water',
    'tree_health',
    'pest',
    'disease',
    'irrigation',
    'harvest',
    'maintenance',
    'organic_certification',
    'other'
  )),
  title text not null,
  notes text,
  image_urls text[],
  observed_at timestamptz not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists farm_observations_observed_at_idx on public.farm_observations(observed_at desc);
create index if not exists farm_observations_parcel_id_idx on public.farm_observations(parcel_id);
create index if not exists farm_observations_zone_id_idx on public.farm_observations(zone_id);
create index if not exists farm_observations_category_idx on public.farm_observations(category);

-- Biar season settings: one row used by the app to avoid generic lowland harvest timing
create table if not exists public.farm_season_settings (
  id uuid primary key default gen_random_uuid(),
  profile text not null unique,
  altitude_m integer not null,
  location text not null,
  harvest_window_table_olives jsonb not null,
  harvest_window_oil jsonb not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.farm_season_settings (
  profile,
  altitude_m,
  location,
  harvest_window_table_olives,
  harvest_window_oil,
  notes
) values (
  'biar_mountain_650m',
  650,
  'Biar, Alicante',
  '{"start_month":10,"end_month":11,"note":"Bordoliven vurderes fra oktober, men faktisk tidspunkt styres av sort, størrelse, modenhet og vær."}'::jsonb,
  '{"start_month":11,"end_month":12,"note":"Biar ligger høyt og kjøligere enn kysten, så oljehøsting kan normalt ligge senere enn lavere/varmere områder."}'::jsonb,
  'Bruk modenhet, vær, sort, ønsket oljeprofil og laboratoriedata som fasit. Kalenderen er kun veiledende.'
) on conflict (profile) do update set
  altitude_m = excluded.altitude_m,
  location = excluded.location,
  harvest_window_table_olives = excluded.harvest_window_table_olives,
  harvest_window_oil = excluded.harvest_window_oil,
  notes = excluded.notes,
  updated_at = now();

-- Generic updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_farm_zones_updated_at on public.farm_zones;
create trigger set_farm_zones_updated_at
before update on public.farm_zones
for each row execute function public.set_updated_at();

drop trigger if exists set_tree_groups_updated_at on public.tree_groups;
create trigger set_tree_groups_updated_at
before update on public.tree_groups
for each row execute function public.set_updated_at();

drop trigger if exists set_sensor_devices_updated_at on public.sensor_devices;
create trigger set_sensor_devices_updated_at
before update on public.sensor_devices
for each row execute function public.set_updated_at();

drop trigger if exists set_farm_season_settings_updated_at on public.farm_season_settings;
create trigger set_farm_season_settings_updated_at
before update on public.farm_season_settings
for each row execute function public.set_updated_at();
