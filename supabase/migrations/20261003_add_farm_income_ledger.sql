-- Economy 2.0: actual farm income ledger.
-- Keeps production/harvest records separate from invoiced/received revenue.

create table if not exists olivia.farm_income (
  id text primary key,
  season text not null,
  income_type text not null default 'annet',
  description text not null,
  amount numeric not null default 0,
  currency text not null default 'EUR',
  status text not null default 'received',
  earned_date date null,
  payment_date date null,
  payment_period text null,
  customer text null,
  source text not null default 'manual',
  source_ref text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table olivia.farm_income enable row level security;

drop policy if exists olivia_internal_all_farm_income on olivia.farm_income;
create policy olivia_internal_all_farm_income
on olivia.farm_income
for all
to authenticated
using (olivia_private.is_internal_user())
with check (olivia_private.is_internal_user());

grant select, insert, update, delete on olivia.farm_income to authenticated;
