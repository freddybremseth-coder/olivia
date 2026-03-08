-- Olivia Farm OS – Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Parcels ──────────────────────────────────────────────────────────────────
create table if not exists parcels (
  id                text primary key,
  name              text not null,
  area              numeric not null default 0,
  municipality      text,
  cadastral_id      text,
  crop_type         text,
  crop              text,
  tree_variety      text,
  tree_count        integer,
  irrigation_status text,
  lat               numeric,
  lon               numeric,
  soil_type         text,
  registration_date text,
  coordinates       text,   -- JSON array of [lat,lon] pairs
  boundaries        text,   -- GeoJSON / raw polygon
  document_ids      text,   -- JSON array of doc ids
  registry_details  text,
  created_at        timestamptz default now()
);

-- ── Harvest records ───────────────────────────────────────────────────────────
create table if not exists harvest_records (
  id           text primary key,
  parcel_id    text references parcels(id) on delete cascade,
  season       text not null,
  date         text not null,
  variety      text not null,
  kg           numeric not null,
  channel      text not null,
  price_per_kg numeric not null,
  notes        text,
  created_at   timestamptz default now()
);

-- ── Farm expenses ─────────────────────────────────────────────────────────────
create table if not exists farm_expenses (
  id          text primary key,
  date        text not null,
  season      text not null,
  category    text not null,
  description text not null,
  amount      numeric not null,
  scope       text not null default 'farm',  -- 'farm' | 'parcel'
  parcel_id   text references parcels(id) on delete set null,
  created_at  timestamptz default now()
);

-- ── Subsidy income ────────────────────────────────────────────────────────────
create table if not exists subsidy_income (
  id          text primary key,
  date        text not null,
  season      text not null,
  type        text not null,
  amount      numeric not null,
  description text not null,
  created_at  timestamptz default now()
);

-- ── Farm settings (single row) ────────────────────────────────────────────────
create table if not exists farm_settings (
  id           text primary key default 'default',
  farm_name    text not null default 'My Olive Grove',
  farm_address text not null default '',
  farm_lat     text not null default '',
  farm_lon     text not null default '',
  language     text not null default 'no',
  currency     text not null default 'EUR',
  updated_at   timestamptz default now()
);

-- Enable Row Level Security (allow all for anon key – tighten when auth is added)
alter table parcels         enable row level security;
alter table harvest_records enable row level security;
alter table farm_expenses   enable row level security;
alter table subsidy_income  enable row level security;
alter table farm_settings   enable row level security;

-- Permissive policies (open read/write for now)
create policy "allow all parcels"         on parcels         for all using (true) with check (true);
create policy "allow all harvest_records" on harvest_records for all using (true) with check (true);
create policy "allow all farm_expenses"   on farm_expenses   for all using (true) with check (true);
create policy "allow all subsidy_income"  on subsidy_income  for all using (true) with check (true);
create policy "allow all farm_settings"   on farm_settings   for all using (true) with check (true);
