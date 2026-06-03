-- Olivia / Doña Anna: equipment and service logs
-- Run in Supabase SQL Editor before using Fleet / Equipment persistence.

create table if not exists olivia.equipment (
  id text primary key,
  name text not null,
  equipment_type text not null,
  status text not null default 'active' check (status in ('active', 'service', 'broken', 'inactive')),
  condition text not null default 'good',
  tracking_unit text not null default 'hours',
  current_value numeric not null default 0,
  last_service_date date,
  next_service_date date,
  next_service_value numeric,
  purchase_date date,
  purchase_price numeric,
  estimated_value numeric,
  serial_number text,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists olivia.equipment_service_logs (
  id text primary key,
  equipment_id text not null references olivia.equipment(id) on delete cascade,
  service_date date not null,
  service_type text not null default 'maintenance',
  value_at_service numeric,
  cost numeric,
  supplier text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists equipment_status_idx on olivia.equipment(status);
create index if not exists equipment_type_idx on olivia.equipment(equipment_type);
create index if not exists equipment_service_logs_equipment_idx on olivia.equipment_service_logs(equipment_id);
create index if not exists equipment_service_logs_date_idx on olivia.equipment_service_logs(service_date desc);

alter table olivia.equipment enable row level security;
alter table olivia.equipment_service_logs enable row level security;

drop policy if exists "Allow authenticated read equipment" on olivia.equipment;
create policy "Allow authenticated read equipment"
on olivia.equipment
for select
to authenticated
using (true);

drop policy if exists "Allow authenticated write equipment" on olivia.equipment;
create policy "Allow authenticated write equipment"
on olivia.equipment
for all
to authenticated
using (true)
with check (true);

drop policy if exists "Allow authenticated read equipment_service_logs" on olivia.equipment_service_logs;
create policy "Allow authenticated read equipment_service_logs"
on olivia.equipment_service_logs
for select
to authenticated
using (true);

drop policy if exists "Allow authenticated write equipment_service_logs" on olivia.equipment_service_logs;
create policy "Allow authenticated write equipment_service_logs"
on olivia.equipment_service_logs
for all
to authenticated
using (true)
with check (true);

create or replace function olivia.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_equipment_updated_at on olivia.equipment;
create trigger set_equipment_updated_at
before update on olivia.equipment
for each row execute function olivia.set_updated_at();
