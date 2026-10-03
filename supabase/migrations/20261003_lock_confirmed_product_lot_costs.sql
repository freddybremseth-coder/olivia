create or replace function olivia.ensure_cost_allocation_editable()
returns trigger language plpgsql security definer set search_path='olivia','public' as $$
declare target_batch text; target_lot text;
begin
  if tg_table_name='batch_cost_allocations' then
    target_batch:=coalesce(new.batch_id,old.batch_id);
    if exists(
      select 1 from olivia.product_lot_sources pls
      join olivia.product_lots l on l.id=pls.lot_id
      where pls.batch_id=target_batch and l.cost_confirmed
    ) then
      raise exception 'A confirmed product lot depends on this batch cost. Reopen the lot cost before changing allocations.';
    end if;
  elsif tg_table_name='product_lot_costs' then
    target_lot:=coalesce(new.lot_id,old.lot_id);
    if exists(select 1 from olivia.product_lots where id=target_lot and cost_confirmed) then
      raise exception 'Product lot cost is confirmed. Reopen it before changing lot costs.';
    end if;
  end if;
  return coalesce(new,old);
end; $$;

drop trigger if exists lock_confirmed_batch_costs on olivia.batch_cost_allocations;
create trigger lock_confirmed_batch_costs before insert or update or delete on olivia.batch_cost_allocations
for each row execute function olivia.ensure_cost_allocation_editable();

drop trigger if exists lock_confirmed_lot_costs on olivia.product_lot_costs;
create trigger lock_confirmed_lot_costs before insert or update or delete on olivia.product_lot_costs
for each row execute function olivia.ensure_cost_allocation_editable();

create or replace function olivia.reopen_product_lot_cost(p_lot_id text)
returns void language plpgsql security definer set search_path='olivia','public' as $$
begin
  if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
  update olivia.product_lots set cost_confirmed=false,cost_confirmed_at=null where id=p_lot_id;
  if not found then raise exception 'Product lot not found'; end if;
end; $$;
revoke all on function olivia.reopen_product_lot_cost(text) from public;
grant execute on function olivia.reopen_product_lot_cost(text) to authenticated;
