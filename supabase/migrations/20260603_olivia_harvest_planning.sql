create schema if not exists olivia;

create table if not exists olivia.olive_varieties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists olivia.harvest_plans (
  id text primary key,
  parcel_id text not null,
  parcel_name text not null,
  variety text not null,
  purpose text not null check (purpose in ('table_olives', 'oil', 'mixed')),
  status text not null default 'planned' check (status in ('planned', 'approved', 'done', 'cancelled')),
  estimated_kg numeric not null default 0,
  actual_kg numeric,
  maturity_index numeric not null default 0,
  fruit_size text not null default 'medium' check (fruit_size in ('small', 'medium', 'large', 'very_large')),
  firmness text not null default 'medium' check (firmness in ('hard', 'medium', 'soft')),
  planned_date date not null,
  approved_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into olivia.olive_varieties (name, notes)
values
  ('Gordal', 'Stor bordoliven, viktig for Doña Anna.'),
  ('Gordal Sevillana', 'Stor bordoliven.'),
  ('Genovesa', 'Lokal/registrert sort brukt på gården.'),
  ('Changlot Real', 'Viktig spansk olivensort.'),
  ('Arbequina', 'Vanlig oljesort.'),
  ('Picual', 'Vanlig oljesort.'),
  ('Hojiblanca', 'Vanlig olje- og bordolivensort.'),
  ('Manzanilla', 'Kjent bordolivensort.'),
  ('Blanqueta', 'Valenciansk olivensort.'),
  ('Blanding', 'Blandet parti eller ukjent sort.')
on conflict (name) do nothing;

alter table olivia.olive_varieties enable row level security;
alter table olivia.harvest_plans enable row level security;

drop policy if exists "Allow authenticated read olive varieties" on olivia.olive_varieties;
create policy "Allow authenticated read olive varieties"
  on olivia.olive_varieties for select
  to authenticated
  using (true);

drop policy if exists "Allow authenticated write olive varieties" on olivia.olive_varieties;
create policy "Allow authenticated write olive varieties"
  on olivia.olive_varieties for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Allow authenticated read harvest plans" on olivia.harvest_plans;
create policy "Allow authenticated read harvest plans"
  on olivia.harvest_plans for select
  to authenticated
  using (true);

drop policy if exists "Allow authenticated write harvest plans" on olivia.harvest_plans;
create policy "Allow authenticated write harvest plans"
  on olivia.harvest_plans for all
  to authenticated
  using (true)
  with check (true);
