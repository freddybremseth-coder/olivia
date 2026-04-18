-- Olivia Farm OS – Migration 002: production batches, recipes, tasks, pruning history
-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: uses "create table if not exists" + "do $$ … $$" guards for policies.

-- ── Production batches ────────────────────────────────────────────────────────
create table if not exists batches (
  id                    text primary key,
  parcel_id             text references parcels(id) on delete set null,
  recipe_id             text,
  recipe_name           text,
  recipe_snapshot       jsonb,           -- Ingredient[] frozen at batch creation
  olive_type            text,
  harvest_date          text not null,
  weight                numeric not null default 0,
  quality               text not null default 'Standard',
  quality_score         numeric,
  status                text not null default 'ACTIVE',  -- 'ACTIVE' | 'ARCHIVED'
  labor_hours           numeric,
  labor_cost            numeric,
  yield_type            text not null default 'Table',   -- 'Oil' | 'Table'
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

-- ── Recipes ──────────────────────────────────────────────────────────────────
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

-- ── Tasks ────────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id          text primary key,
  title       text not null,
  priority    text not null default 'Middels',
  category    text not null default 'Vedlikehold',
  user_name   text default '',                -- "user" is reserved in pg
  status      text not null default 'TODO',   -- 'TODO' | 'IN_PROGRESS' | 'DONE'
  parcel_id   text references parcels(id) on delete set null,
  due_date    text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
create index if not exists tasks_status_idx on tasks(status);

-- ── Pruning history ──────────────────────────────────────────────────────────
create table if not exists pruning_history (
  id              text primary key,
  date            text not null,
  images          jsonb not null default '[]'::jsonb,  -- base64 thumbnails
  tree_type       text,
  age_estimate    text,
  analysis        jsonb,
  plan            jsonb,
  scheduled_time  text,
  parcel_id       text references parcels(id) on delete set null,
  created_at      timestamptz default now()
);
create index if not exists pruning_history_parcel_idx on pruning_history(parcel_id);

-- ── RLS + open-policy boilerplate ────────────────────────────────────────────
alter table batches         enable row level security;
alter table recipes         enable row level security;
alter table tasks           enable row level security;
alter table pruning_history enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'batches' and policyname = 'allow all batches') then
    create policy "allow all batches" on batches for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'recipes' and policyname = 'allow all recipes') then
    create policy "allow all recipes" on recipes for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'tasks' and policyname = 'allow all tasks') then
    create policy "allow all tasks" on tasks for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'pruning_history' and policyname = 'allow all pruning_history') then
    create policy "allow all pruning_history" on pruning_history for all using (true) with check (true);
  end if;
end $$;

-- ── updated_at trigger helper ────────────────────────────────────────────────
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
