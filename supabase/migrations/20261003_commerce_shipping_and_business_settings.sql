create table if not exists olivia.commerce_business_settings (
  id text primary key default 'default',
  display_name text not null default 'Doña Anna',
  legal_name text not null default '',
  tax_id text not null default '',
  address text not null default '',
  postal_code text not null default '',
  city text not null default 'Biar',
  province text not null default 'Alicante',
  country text not null default 'España',
  email text not null default '',
  phone text not null default '',
  iban text not null default '',
  invoice_prefix text not null default 'INV',
  invoice_notes text not null default '',
  updated_at timestamptz not null default now()
);
alter table olivia.commerce_business_settings enable row level security;
drop policy if exists olivia_internal_all_commerce_business_settings on olivia.commerce_business_settings;
create policy olivia_internal_all_commerce_business_settings on olivia.commerce_business_settings for all to authenticated
using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());
insert into olivia.commerce_business_settings(id,display_name,city,province,country)
values('default','Doña Anna','Biar','Alicante','España') on conflict(id) do nothing;

create or replace function olivia.upsert_order_shipment(p_order_id text,p_carrier text default null,p_tracking_number text default null,p_tracking_url text default null)
returns text language plpgsql security definer set search_path='olivia','public' as $$
declare o olivia.commerce_orders%rowtype; shipment_id text; missing_lots integer;
begin
  if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
  select * into o from olivia.commerce_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if lower(coalesce(o.status,''))='test' then raise exception 'Test orders cannot be shipped'; end if;
  if coalesce(o.total_amount,0)<=0 then raise exception 'Order total must be greater than zero'; end if;
  select count(*) into missing_lots from olivia.commerce_order_items where order_id=p_order_id and product_id is not null and lot_id is null;
  if missing_lots>0 then raise exception 'All product lines must be assigned to a product lot before shipping'; end if;
  select id into shipment_id from olivia.commerce_shipments where order_id=p_order_id order by created_at desc limit 1;
  if shipment_id is null then
    shipment_id:='shipment-'||p_order_id;
    insert into olivia.commerce_shipments(id,order_id,customer_id,carrier,tracking_number,tracking_url,status,shipped_at)
    values(shipment_id,p_order_id,o.customer_id,nullif(trim(p_carrier),''),nullif(trim(p_tracking_number),''),nullif(trim(p_tracking_url),''),'Sendt',now());
  else
    update olivia.commerce_shipments set carrier=nullif(trim(p_carrier),''),tracking_number=nullif(trim(p_tracking_number),''),tracking_url=nullif(trim(p_tracking_url),''),status='Sendt',shipped_at=coalesce(shipped_at,now()),updated_at=now() where id=shipment_id;
  end if;
  update olivia.commerce_orders set status='Sendt',shipped_at=coalesce(shipped_at,now()),updated_at=now() where id=p_order_id;
  return shipment_id;
end; $$;
revoke all on function olivia.upsert_order_shipment(text,text,text,text) from public;
grant execute on function olivia.upsert_order_shipment(text,text,text,text) to authenticated;

create or replace function olivia.mark_order_delivered(p_order_id text)
returns void language plpgsql security definer set search_path='olivia','public' as $$
begin
  if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
  update olivia.commerce_orders set status='Levert',delivered_at=coalesce(delivered_at,now()),updated_at=now() where id=p_order_id and lower(coalesce(status,''))<>'test';
  if not found then raise exception 'Order not found or is a test order'; end if;
  update olivia.commerce_shipments set status='Levert',delivered_at=coalesce(delivered_at,now()),updated_at=now() where order_id=p_order_id;
end; $$;
revoke all on function olivia.mark_order_delivered(text) from public;
grant execute on function olivia.mark_order_delivered(text) to authenticated;
