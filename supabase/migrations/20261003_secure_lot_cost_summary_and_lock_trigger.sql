create or replace function olivia.ensure_cost_allocation_editable()
returns trigger language plpgsql security definer set search_path='olivia','public' as $$
declare target_batch text; target_lot text;
begin
  if tg_table_name='batch_cost_allocations' then
    target_batch:=case when tg_op='DELETE' then old.batch_id else new.batch_id end;
    if exists(
      select 1 from olivia.product_lot_sources pls
      join olivia.product_lots l on l.id=pls.lot_id
      where pls.batch_id=target_batch and l.cost_confirmed
    ) then
      raise exception 'A confirmed product lot depends on this batch cost. Reopen the lot cost before changing allocations.';
    end if;
  elsif tg_table_name='product_lot_costs' then
    target_lot:=case when tg_op='DELETE' then old.lot_id else new.lot_id end;
    if exists(select 1 from olivia.product_lots where id=target_lot and cost_confirmed) then
      raise exception 'Product lot cost is confirmed. Reopen it before changing lot costs.';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;

create or replace view olivia.product_lot_cost_summary
with (security_invoker=true) as
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

revoke all on olivia.product_lot_cost_summary from anon;
grant select on olivia.product_lot_cost_summary to authenticated;
