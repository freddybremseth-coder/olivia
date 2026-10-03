-- Unified Doña Anna inventory + traceability ledger.
-- commerce_* is the operational source of truth. Legacy donaanna_* demo tables are left intact but not used here.

alter table olivia.commerce_products
  add column if not exists reserved_quantity numeric not null default 0,
  add column if not exists inventory_verified boolean not null default false,
  add column if not exists inventory_verified_at timestamptz null;

create table if not exists olivia.product_lots (
  id text primary key,
  product_id text not null references olivia.commerce_products(id) on delete cascade,
  lot_code text not null unique,
  status text not null default 'draft',
  packed_at timestamptz null,
  best_before date null,
  initial_units numeric not null default 0,
  traceability_slug text null,
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists olivia.product_lot_sources (
  lot_id text not null references olivia.product_lots(id) on delete cascade,
  batch_id text not null references olivia.batches(id) on delete restrict,
  input_kg numeric null,
  input_liters numeric null,
  notes text null,
  created_at timestamptz not null default now(),
  primary key (lot_id, batch_id)
);

alter table olivia.commerce_order_items
  add column if not exists lot_id text null references olivia.product_lots(id) on delete set null;

create table if not exists olivia.inventory_movements (
  id text primary key,
  product_id text not null references olivia.commerce_products(id) on delete cascade,
  lot_id text null references olivia.product_lots(id) on delete set null,
  order_id text null references olivia.commerce_orders(id) on delete set null,
  order_item_id text null references olivia.commerce_order_items(id) on delete set null,
  movement_type text not null,
  on_hand_delta numeric not null default 0,
  reserved_delta numeric not null default 0,
  occurred_at timestamptz not null default now(),
  source text not null default 'manual',
  event_key text null unique,
  verified boolean not null default true,
  notes text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table olivia.product_lots enable row level security;
alter table olivia.product_lot_sources enable row level security;
alter table olivia.inventory_movements enable row level security;

drop policy if exists olivia_internal_all_product_lots on olivia.product_lots;
create policy olivia_internal_all_product_lots on olivia.product_lots
for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());

drop policy if exists olivia_internal_all_product_lot_sources on olivia.product_lot_sources;
create policy olivia_internal_all_product_lot_sources on olivia.product_lot_sources
for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());

drop policy if exists olivia_internal_all_inventory_movements on olivia.inventory_movements;
create policy olivia_internal_all_inventory_movements on olivia.inventory_movements
for all to authenticated using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());

grant select, insert, update, delete on olivia.product_lots to authenticated;
grant select, insert, update, delete on olivia.product_lot_sources to authenticated;
grant select, insert, update, delete on olivia.inventory_movements to authenticated;

create or replace function olivia.refresh_product_inventory_balance(p_product_id text)
returns void language plpgsql security definer set search_path=olivia,public as $$
declare hand numeric; reserved numeric;
begin
  select coalesce(sum(on_hand_delta),0), coalesce(sum(reserved_delta),0)
  into hand,reserved from olivia.inventory_movements where product_id=p_product_id;
  update olivia.commerce_products
  set stock_quantity=hand, stock=greatest(floor(hand),0)::integer,
      reserved_quantity=greatest(reserved,0), updated_at=now()
  where id=p_product_id;
end; $$;

create or replace function olivia.after_inventory_movement_refresh()
returns trigger language plpgsql security definer set search_path=olivia,public as $$
begin
  perform olivia.refresh_product_inventory_balance(coalesce(new.product_id,old.product_id));
  if tg_op='UPDATE' and old.product_id is distinct from new.product_id then
    perform olivia.refresh_product_inventory_balance(old.product_id);
  end if;
  return coalesce(new,old);
end; $$;

drop trigger if exists trg_inventory_movement_refresh on olivia.inventory_movements;
create trigger trg_inventory_movement_refresh after insert or update or delete
on olivia.inventory_movements for each row execute function olivia.after_inventory_movement_refresh();

insert into olivia.inventory_movements
(id,product_id,movement_type,on_hand_delta,reserved_delta,source,event_key,verified,notes)
select 'opening-'||p.id,p.id,'opening_balance',p.stock_quantity,0,'legacy_snapshot',
       'opening:'||p.id,false,
       'Migrert eksisterende lagerverdi. Må bekreftes med fysisk opptelling før den regnes som verifisert lager.'
from olivia.commerce_products p
where not exists (select 1 from olivia.inventory_movements m where m.event_key='opening:'||p.id);

create or replace function olivia.reserve_order_item_inventory()
returns trigger language plpgsql security definer set search_path=olivia,public as $$
declare order_status text;
begin
  if new.product_id is null or coalesce(new.quantity,0)<=0 then return new; end if;
  select lower(coalesce(status,'')) into order_status from olivia.commerce_orders where id=new.order_id;
  if order_status not in ('test','draft','utkast','cancelled','canceled','kansellert') then
    insert into olivia.inventory_movements
    (id,product_id,lot_id,order_id,order_item_id,movement_type,reserved_delta,source,event_key,verified,notes)
    values ('reserve-'||new.id,new.product_id,new.lot_id,new.order_id,new.id,'reservation',
            new.quantity,'commerce_order','reserve:'||new.id,true,'Automatisk reservert ved mottatt/bekreftet ordre.')
    on conflict(event_key) do nothing;
  end if;
  return new;
end; $$;

drop trigger if exists trg_reserve_order_item_inventory on olivia.commerce_order_items;
create trigger trg_reserve_order_item_inventory after insert on olivia.commerce_order_items
for each row execute function olivia.reserve_order_item_inventory();

create or replace function olivia.sync_order_inventory_status()
returns trigger language plpgsql security definer set search_path=olivia,public as $$
declare item record; next_status text; prev_status text;
begin
  next_status:=lower(coalesce(new.status,'')); prev_status:=lower(coalesce(old.status,''));
  if next_status=prev_status then return new; end if;
  for item in select * from olivia.commerce_order_items where order_id=new.id and product_id is not null loop
    if next_status in ('sendt','shipped','levert','delivered') then
      insert into olivia.inventory_movements
      (id,product_id,lot_id,order_id,order_item_id,movement_type,on_hand_delta,reserved_delta,source,event_key,verified,notes)
      values ('ship-'||item.id,item.product_id,item.lot_id,new.id,item.id,'sale',
              -item.quantity,-item.quantity,'commerce_order','ship:'||item.id,true,'Automatisk lageruttak ved sendt/levert ordre.')
      on conflict(event_key) do nothing;
    elsif next_status in ('cancelled','canceled','kansellert') then
      insert into olivia.inventory_movements
      (id,product_id,lot_id,order_id,order_item_id,movement_type,reserved_delta,source,event_key,verified,notes)
      values ('release-'||item.id,item.product_id,item.lot_id,new.id,item.id,'release',
              -item.quantity,'commerce_order','release:'||item.id,true,'Automatisk frigitt reservasjon ved kansellert ordre.')
      on conflict(event_key) do nothing;
    elsif prev_status in ('test','draft','utkast') and next_status not in ('test','draft','utkast','cancelled','canceled','kansellert') then
      insert into olivia.inventory_movements
      (id,product_id,lot_id,order_id,order_item_id,movement_type,reserved_delta,source,event_key,verified,notes)
      values ('reserve-'||item.id,item.product_id,item.lot_id,new.id,item.id,'reservation',
              item.quantity,'commerce_order','reserve:'||item.id,true,'Automatisk reservert når ordre ble aktiv.')
      on conflict(event_key) do nothing;
    end if;
  end loop;
  return new;
end; $$;

drop trigger if exists trg_sync_order_inventory_status on olivia.commerce_orders;
create trigger trg_sync_order_inventory_status after update of status on olivia.commerce_orders
for each row execute function olivia.sync_order_inventory_status();

-- Current confirmed packaging master.
update olivia.commerce_products
set size='750 ml', unit='750 ml',
    sku=case name when 'Verde Vivo' then 'DA-VV-750' when 'Raíz Antigua' then 'DA-RA-750' when 'Verde Alto' then 'DA-VA-750' else sku end,
    metadata=coalesce(metadata,'{}'::jsonb)||'{"packaging_confirmed":"2026-10-02","packaging_source":"current_brand_plan"}'::jsonb,
    updated_at=now()
where name in ('Verde Vivo','Raíz Antigua','Verde Alto');

update olivia.commerce_products
set size='3 L', unit='3 L', sku='DA-CV-3L',
    metadata=coalesce(metadata,'{}'::jsonb)||'{"packaging_confirmed":"2026-10-02","packaging_source":"current_brand_plan","channel_focus":"restaurant"}'::jsonb,
    updated_at=now()
where name='Cocina Viva';
