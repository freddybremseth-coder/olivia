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

-- ── Production batches, recipes, tasks, pruning history ──────────────────────
-- (See supabase_migrations/002_production_and_planning.sql for incremental
--  upgrade if you've already deployed v1 of the schema.)

create table if not exists batches (
  id                    text primary key,
  parcel_id             text references parcels(id) on delete set null,
  recipe_id             text,
  recipe_name           text,
  recipe_snapshot       jsonb,
  olive_type            text,
  harvest_date          text not null,
  weight                numeric not null default 0,
  quality               text not null default 'Standard',
  quality_score         numeric,
  status                text not null default 'ACTIVE',
  labor_hours           numeric,
  labor_cost            numeric,
  yield_type            text not null default 'Table',
  oil_yield_liters      numeric,
  table_olive_yield_kg  numeric,
  traceability_code     text,
  current_stage         text,
  stage_start_date      text,
  completed_stages      jsonb,
  sales                 jsonb,
  logs                  jsonb,
  quality_metrics       jsonb,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
create index if not exists batches_parcel_idx on batches(parcel_id);
create index if not exists batches_status_idx on batches(status);

create table if not exists recipes (
  id                       text primary key,
  name                     text not null,
  flavor_profile           text,
  description              text,
  recommended_olive_types  jsonb,
  ingredients              jsonb not null default '[]'::jsonb,
  brine_change_days        jsonb,
  marinade_day_from        integer,
  ready_after_days         integer,
  rating                   numeric default 4,
  notes                    text default '',
  is_ai_generated          boolean default false,
  is_quality_assured       boolean default false,
  created_at               timestamptz default now(),
  updated_at               timestamptz default now()
);

create table if not exists tasks (
  id          text primary key,
  title       text not null,
  priority    text not null default 'Middels',
  category    text not null default 'Vedlikehold',
  user_name   text default '',
  status      text not null default 'TODO',
  parcel_id   text references parcels(id) on delete set null,
  due_date    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists tasks_status_idx on tasks(status);

create table if not exists pruning_history (
  id              text primary key,
  date            text not null,
  images          jsonb not null default '[]'::jsonb,
  tree_type       text,
  age_estimate    text,
  analysis        jsonb,
  plan            jsonb,
  scheduled_time  text,
  parcel_id       text references parcels(id) on delete set null,
  created_at      timestamptz default now()
);
create index if not exists pruning_history_parcel_idx on pruning_history(parcel_id);

alter table batches         enable row level security;
alter table recipes         enable row level security;
alter table tasks           enable row level security;
alter table pruning_history enable row level security;

create policy "allow all batches"         on batches         for all using (true) with check (true);
create policy "allow all recipes"         on recipes         for all using (true) with check (true);
create policy "allow all tasks"           on tasks           for all using (true) with check (true);
create policy "allow all pruning_history" on pruning_history for all using (true) with check (true);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists batches_set_updated_at on batches;
create trigger batches_set_updated_at before update on batches
  for each row execute function set_updated_at();

drop trigger if exists recipes_set_updated_at on recipes;
create trigger recipes_set_updated_at before update on recipes
  for each row execute function set_updated_at();

drop trigger if exists tasks_set_updated_at on tasks;
create trigger tasks_set_updated_at before update on tasks
  for each row execute function set_updated_at();
