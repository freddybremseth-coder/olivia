
do $$ begin
  alter table olivia.harvest_records
    add constraint harvest_records_harvest_plan_id_fkey
    foreign key (harvest_plan_id) references olivia.harvest_plans(id) on delete set null;
exception when duplicate_object then null; end $$;

create or replace function olivia.harvest_season_for_date(p_date date)
returns text
language sql
immutable
as $$
  select case
    when extract(month from p_date) >= 8
      then extract(year from p_date)::int::text || '/' || right((extract(year from p_date)::int + 1)::text, 2)
    else (extract(year from p_date)::int - 1)::text || '/' || right(extract(year from p_date)::int::text, 2)
  end
$$;

create or replace function olivia.validate_harvest_plan_link()
returns trigger
language plpgsql
security definer
set search_path='olivia','public'
as $$
declare
  p olivia.harvest_plans%rowtype;
  actual_date date;
  actual_season text;
  planned_season text;
begin
  if new.harvest_plan_id is null then
    return new;
  end if;

  select * into p from olivia.harvest_plans where id=new.harvest_plan_id;
  if not found then
    raise exception 'Harvest plan not found';
  end if;

  if p.status <> 'approved' then
    raise exception 'Harvest plan must be approved before intake can be linked';
  end if;

  if new.parcel_id is distinct from p.parcel_id then
    raise exception 'Harvest intake parcel does not match approved harvest plan';
  end if;

  if lower(trim(coalesce(new.variety,''))) <> lower(trim(coalesce(p.variety,''))) then
    raise exception 'Harvest intake variety does not match approved harvest plan';
  end if;

  begin
    actual_date := new.date::date;
  exception when others then
    raise exception 'Harvest intake date must be a valid YYYY-MM-DD date';
  end;

  actual_season := olivia.harvest_season_for_date(actual_date);
  planned_season := olivia.harvest_season_for_date(p.planned_date);

  if actual_season <> planned_season then
    raise exception 'Harvest intake and harvest plan must belong to the same harvest season';
  end if;

  if p.purpose='oil' and new.destination is distinct from 'oil' then
    raise exception 'Oil harvest plan must be registered with oil destination';
  end if;

  if p.purpose='table_olives' and new.destination is distinct from 'table_olives' then
    raise exception 'Table-olive harvest plan must be registered with table_olives destination';
  end if;

  if new.season is distinct from actual_season then
    raise exception 'Harvest intake season does not match actual harvest date';
  end if;

  return new;
end; $$;

drop trigger if exists validate_harvest_plan_link on olivia.harvest_records;
create trigger validate_harvest_plan_link
before insert or update of harvest_plan_id,parcel_id,variety,date,season,destination
on olivia.harvest_records
for each row
execute function olivia.validate_harvest_plan_link();

create or replace function olivia.refresh_harvest_plan_actual_kg(p_plan_id text)
returns void
language plpgsql
security definer
set search_path='olivia','public'
as $$
declare
  total_kg numeric;
begin
  if p_plan_id is null then return; end if;

  select sum(coalesce(net_kg,kg,0))
  into total_kg
  from olivia.harvest_records
  where harvest_plan_id=p_plan_id
    and workflow_status is not null;

  update olivia.harvest_plans
  set actual_kg = case when coalesce(total_kg,0)>0 then total_kg else null end,
      updated_at = now()
  where id=p_plan_id;
end; $$;

create or replace function olivia.after_harvest_record_refresh_plan()
returns trigger
language plpgsql
security definer
set search_path='olivia','public'
as $$
begin
  if tg_op='DELETE' then
    perform olivia.refresh_harvest_plan_actual_kg(old.harvest_plan_id);
    return old;
  end if;

  if tg_op='UPDATE' and old.harvest_plan_id is distinct from new.harvest_plan_id then
    perform olivia.refresh_harvest_plan_actual_kg(old.harvest_plan_id);
  end if;

  perform olivia.refresh_harvest_plan_actual_kg(new.harvest_plan_id);
  return new;
end; $$;

drop trigger if exists refresh_harvest_plan_actual_kg on olivia.harvest_records;
create trigger refresh_harvest_plan_actual_kg
after insert or update of harvest_plan_id,net_kg,kg,workflow_status or delete
on olivia.harvest_records
for each row
execute function olivia.after_harvest_record_refresh_plan();
