-- Traceable production cost bridge: farm expense -> batch -> packaged lot -> order margin.

create table if not exists olivia.batch_cost_allocations (
  id text primary key,
  batch_id text not null references olivia.batches(id) on delete cascade,
  expense_id text references olivia.farm_expenses(id) on delete set null,
  allocation_type text not null default 'direct',
  description text not null default '',
  amount numeric not null check (amount >= 0),
  currency text not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table olivia.batch_cost_allocations add constraint batch_cost_allocations_type_check
  check (allocation_type in ('direct','labor','processing','transport','other'));
exception when duplicate_object then null; end $$;

create table if not exists olivia.product_lot_costs (
  id text primary key,
  lot_id text not null references olivia.product_lots(id) on delete cascade,
  expense_id text references olivia.farm_expenses(id) on delete set null,
  cost_type text not null default 'packaging',
  description text not null default '',
  amount numeric not null check (amount >= 0),
  currency text not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table olivia.product_lot_costs add constraint product_lot_costs_type_check
  check (cost_type in ('packaging','labor','processing','transport','storage','other'));
exception when duplicate_object then null; end $$;

alter table olivia.product_lots
  add column if not exists cost_confirmed boolean not null default false,
  add column if not exists cost_confirmed_at timestamptz null,
  add column if not exists cost_notes text null;

alter table olivia.batch_cost_allocations enable row level security;
alter table olivia.product_lot_costs enable row level security;

drop policy if exists olivia_internal_all_batch_cost_allocations on olivia.batch_cost_allocations;
create policy olivia_internal_all_batch_cost_allocations on olivia.batch_cost_allocations
for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());

drop policy if exists olivia_internal_all_product_lot_costs on olivia.product_lot_costs;
create policy olivia_internal_all_product_lot_costs on olivia.product_lot_costs
for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());

drop trigger if exists batch_cost_allocations_set_updated_at on olivia.batch_cost_allocations;
create trigger batch_cost_allocations_set_updated_at before update on olivia.batch_cost_allocations
for each row execute function olivia.set_updated_at();

drop trigger if exists product_lot_costs_set_updated_at on olivia.product_lot_costs;
create trigger product_lot_costs_set_updated_at before update on olivia.product_lot_costs
for each row execute function olivia.set_updated_at();

create or replace function olivia.validate_expense_cost_allocation()
returns trigger language plpgsql security definer set search_path='olivia','public' as $$
declare
  expense_total numeric;
  expense_currency text;
  allocated_batch numeric:=0;
  allocated_lot numeric:=0;
begin
  if new.expense_id is null then return new; end if;

  select amount,currency into expense_total,expense_currency
  from olivia.farm_expenses where id=new.expense_id;
  if not found then raise exception 'Expense not found'; end if;
  if coalesce(expense_currency,'EUR')<>coalesce(new.currency,'EUR') then
    raise exception 'Allocation currency must match expense currency';
  end if;

  select coalesce(sum(amount),0) into allocated_batch
  from olivia.batch_cost_allocations
  where expense_id=new.expense_id
    and (tg_table_name<>'batch_cost_allocations' or id<>new.id);

  select coalesce(sum(amount),0) into allocated_lot
  from olivia.product_lot_costs
  where expense_id=new.expense_id
    and (tg_table_name<>'product_lot_costs' or id<>new.id);

  if allocated_batch+allocated_lot+new.amount > expense_total + 0.005 then
    raise exception 'Expense allocation exceeds original expense amount';
  end if;
  return new;
end; $$;

drop trigger if exists validate_batch_cost_expense on olivia.batch_cost_allocations;
create trigger validate_batch_cost_expense before insert or update on olivia.batch_cost_allocations
for each row execute function olivia.validate_expense_cost_allocation();

drop trigger if exists validate_lot_cost_expense on olivia.product_lot_costs;
create trigger validate_lot_cost_expense before insert or update on olivia.product_lot_costs
for each row execute function olivia.validate_expense_cost_allocation();

create or replace view olivia.product_lot_cost_summary as
with batch_cost as (
  select batch_id,sum(amount) as total_cost
  from olivia.batch_cost_allocations
  group by batch_id
),
source_cost as (
  select
    pls.lot_id,
    count(*) as source_count,
    bool_and(
      coalesce(bc.total_cost,0)>0
      and (
        (b.yield_type='Oil' and coalesce(b.oil_yield_liters,0)>0 and pls.input_liters is not null)
        or
        (b.yield_type='Table' and coalesce(b.table_olive_yield_kg,0)>0 and pls.input_kg is not null)
      )
    ) as source_cost_ready,
    sum(
      case
        when b.yield_type='Oil' and coalesce(b.oil_yield_liters,0)>0 and pls.input_liters is not null
          then coalesce(bc.total_cost,0) * pls.input_liters / b.oil_yield_liters
        when b.yield_type='Table' and coalesce(b.table_olive_yield_kg,0)>0 and pls.input_kg is not null
          then coalesce(bc.total_cost,0) * pls.input_kg / b.table_olive_yield_kg
        else 0
      end
    ) as allocated_source_cost
  from olivia.product_lot_sources pls
  join olivia.batches b on b.id=pls.batch_id
  left join batch_cost bc on bc.batch_id=pls.batch_id
  group by pls.lot_id
),
direct_cost as (
  select lot_id,sum(amount) as direct_lot_cost
  from olivia.product_lot_costs
  group by lot_id
)
select
  l.id as lot_id,
  l.product_id,
  l.lot_code,
  l.initial_units,
  l.cost_confirmed,
  l.cost_confirmed_at,
  coalesce(sc.source_count,0) as source_count,
  coalesce(sc.source_cost_ready,false) as source_cost_ready,
  coalesce(sc.allocated_source_cost,0) as allocated_source_cost,
  coalesce(dc.direct_lot_cost,0) as direct_lot_cost,
  coalesce(sc.allocated_source_cost,0)+coalesce(dc.direct_lot_cost,0) as total_documented_cost,
  case when l.initial_units>0 then (coalesce(sc.allocated_source_cost,0)+coalesce(dc.direct_lot_cost,0))/l.initial_units else null end as documented_unit_cost,
  (l.cost_confirmed and l.initial_units>0 and coalesce(sc.source_count,0)>0 and coalesce(sc.source_cost_ready,false)) as cost_complete
from olivia.product_lots l
left join source_cost sc on sc.lot_id=l.id
left join direct_cost dc on dc.lot_id=l.id;

grant select on olivia.product_lot_cost_summary to authenticated;

create or replace function olivia.confirm_product_lot_cost(p_lot_id text,p_notes text default null)
returns void language plpgsql security definer set search_path='olivia','public' as $$
declare s record;
begin
  if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
  select * into s from olivia.product_lot_cost_summary where lot_id=p_lot_id;
  if not found then raise exception 'Product lot not found'; end if;
  if coalesce(s.initial_units,0)<=0 then raise exception 'Product lot has no finished units'; end if;
  if coalesce(s.source_count,0)<=0 then raise exception 'Product lot has no source batch'; end if;
  if not coalesce(s.source_cost_ready,false) then raise exception 'Source batch cost or production yield is incomplete'; end if;

  update olivia.product_lots set cost_confirmed=true,cost_confirmed_at=now(),cost_notes=nullif(trim(p_notes),'') where id=p_lot_id;
end; $$;
revoke all on function olivia.confirm_product_lot_cost(text,text) from public;
grant execute on function olivia.confirm_product_lot_cost(text,text) to authenticated;

create index if not exists idx_batch_cost_allocations_batch on olivia.batch_cost_allocations(batch_id);
create index if not exists idx_batch_cost_allocations_expense on olivia.batch_cost_allocations(expense_id);
create index if not exists idx_product_lot_costs_lot on olivia.product_lot_costs(lot_id);
create index if not exists idx_product_lot_costs_expense on olivia.product_lot_costs(expense_id);
