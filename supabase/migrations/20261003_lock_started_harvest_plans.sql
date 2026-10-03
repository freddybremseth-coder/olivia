
alter table olivia.harvest_records
  drop constraint if exists harvest_records_harvest_plan_id_fkey;

alter table olivia.harvest_records
  add constraint harvest_records_harvest_plan_id_fkey
  foreign key (harvest_plan_id) references olivia.harvest_plans(id) on delete restrict;

create or replace function olivia.protect_started_harvest_plan()
returns trigger
language plpgsql
security definer
set search_path='olivia','public'
as $$
declare
  linked_count integer;
begin
  select count(*) into linked_count
  from olivia.harvest_records
  where harvest_plan_id = coalesce(old.id,new.id)
    and workflow_status is not null;

  if linked_count = 0 then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;

  if tg_op='DELETE' then
    raise exception 'Harvest plan has linked actual harvest records and cannot be deleted';
  end if;

  if old.parcel_id is distinct from new.parcel_id
     or old.variety is distinct from new.variety
     or old.purpose is distinct from new.purpose
     or old.planned_date is distinct from new.planned_date
     or old.estimated_kg is distinct from new.estimated_kg
     or old.estimate_source is distinct from new.estimate_source
     or old.planning_basis is distinct from new.planning_basis then
    raise exception 'Harvest plan core fields are locked after actual harvest intake has started';
  end if;

  if new.status='cancelled' and old.status is distinct from 'cancelled' then
    raise exception 'A harvest plan with actual intake cannot be cancelled';
  end if;

  return new;
end; $$;

drop trigger if exists protect_started_harvest_plan_update on olivia.harvest_plans;
create trigger protect_started_harvest_plan_update
before update of parcel_id,variety,purpose,planned_date,estimated_kg,estimate_source,planning_basis,status
on olivia.harvest_plans
for each row execute function olivia.protect_started_harvest_plan();

drop trigger if exists protect_started_harvest_plan_delete on olivia.harvest_plans;
create trigger protect_started_harvest_plan_delete
before delete on olivia.harvest_plans
for each row execute function olivia.protect_started_harvest_plan();
