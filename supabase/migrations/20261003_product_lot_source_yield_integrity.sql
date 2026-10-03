
do $$ begin
  alter table olivia.product_lots
    add constraint product_lots_initial_units_positive
    check (initial_units > 0);
exception when duplicate_object then null; end $$;

create index if not exists idx_product_lot_sources_batch_id
  on olivia.product_lot_sources(batch_id);

create or replace function olivia.validate_product_lot_source_quantity()
returns trigger
language plpgsql
security definer
set search_path='olivia','public'
as $$
declare
  b olivia.batches%rowtype;
  used numeric:=0;
  incoming numeric:=0;
  produced numeric:=0;
begin
  select * into b from olivia.batches where id=new.batch_id for update;
  if not found then raise exception 'Source batch not found'; end if;

  if b.status<>'ACTIVE' then
    raise exception 'Only ACTIVE production batches can be used in a new product lot';
  end if;

  if upper(coalesce(b.current_stage,'')) not in ('PAKKING','SALG') then
    raise exception 'Source batch must be at PAKKING or SALG before it can feed a product lot';
  end if;

  if b.yield_type='Oil' then
    if new.input_liters is null or new.input_liters<=0 then
      raise exception 'Oil source requires a positive input_liters value';
    end if;
    if new.input_kg is not null then
      raise exception 'Oil source must use liters, not kg';
    end if;
    produced:=coalesce(b.oil_yield_liters,0);
    if produced<=0 then raise exception 'Oil batch has no documented oil yield'; end if;
    incoming:=new.input_liters;
    select coalesce(sum(input_liters),0) into used
    from olivia.product_lot_sources
    where batch_id=new.batch_id
      and not (lot_id=new.lot_id and batch_id=new.batch_id);
  elsif b.yield_type='Table' then
    if new.input_kg is null or new.input_kg<=0 then
      raise exception 'Table olive source requires a positive input_kg value';
    end if;
    if new.input_liters is not null then
      raise exception 'Table olive source must use kg, not liters';
    end if;
    produced:=coalesce(b.table_olive_yield_kg,0);
    if produced<=0 then raise exception 'Table olive batch has no documented table-olive yield'; end if;
    incoming:=new.input_kg;
    select coalesce(sum(input_kg),0) into used
    from olivia.product_lot_sources
    where batch_id=new.batch_id
      and not (lot_id=new.lot_id and batch_id=new.batch_id);
  else
    raise exception 'Unsupported batch yield type';
  end if;

  if used+incoming > produced+0.005 then
    raise exception 'Product lot source exceeds documented batch yield. Produced %, already used %, requested %', produced, used, incoming;
  end if;

  return new;
end; $$;

drop trigger if exists validate_product_lot_source_quantity on olivia.product_lot_sources;
create trigger validate_product_lot_source_quantity
before insert or update on olivia.product_lot_sources
for each row execute function olivia.validate_product_lot_source_quantity();

create or replace function olivia.create_product_lot_atomic(
  p_lot_id text,
  p_product_id text,
  p_lot_code text,
  p_units numeric,
  p_sources jsonb,
  p_traceability_slug text default null,
  p_notes text default null,
  p_packed_at timestamptz default now(),
  p_best_before date default null
) returns text
language plpgsql
security definer
set search_path='olivia','public'
as $$
declare
  src jsonb;
begin
  if not olivia_private.is_internal_user() then
    raise exception 'Internal Olivia access required';
  end if;

  if p_units is null or p_units<=0 then
    raise exception 'Finished units must be greater than zero';
  end if;

  if p_lot_code is null or trim(p_lot_code)='' then
    raise exception 'Lot code is required';
  end if;

  if not exists(select 1 from olivia.commerce_products where id=p_product_id and active) then
    raise exception 'Active commerce product not found';
  end if;

  if jsonb_typeof(coalesce(p_sources,'[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(p_sources,'[]'::jsonb))=0 then
    raise exception 'At least one documented source batch is required';
  end if;

  insert into olivia.product_lots(
    id,product_id,lot_code,status,packed_at,best_before,initial_units,traceability_slug,notes
  ) values(
    p_lot_id,p_product_id,trim(p_lot_code),'active',coalesce(p_packed_at,now()),
    p_best_before,p_units,nullif(trim(coalesce(p_traceability_slug,'')),''),
    nullif(trim(coalesce(p_notes,'')),'')
  );

  for src in select value from jsonb_array_elements(p_sources)
  loop
    insert into olivia.product_lot_sources(lot_id,batch_id,input_kg,input_liters,notes)
    values(
      p_lot_id,
      src->>'batchId',
      nullif(src->>'inputKg','')::numeric,
      nullif(src->>'inputLiters','')::numeric,
      nullif(src->>'notes','')
    );
  end loop;

  insert into olivia.inventory_movements(
    id,product_id,lot_id,movement_type,on_hand_delta,reserved_delta,occurred_at,
    source,event_key,verified,notes
  ) values(
    'production-'||p_lot_id,p_product_id,p_lot_id,'production',p_units,0,
    coalesce(p_packed_at,now()),'product_lot','production:'||p_lot_id,true,
    coalesce(nullif(trim(coalesce(p_notes,'')),''),'Pakket batch '||p_lot_code||'.')
  );

  return p_lot_id;
end; $$;

revoke all on function olivia.create_product_lot_atomic(text,text,text,numeric,jsonb,text,text,timestamptz,date) from public;
grant execute on function olivia.create_product_lot_atomic(text,text,text,numeric,jsonb,text,text,timestamptz,date) to authenticated;
