
alter table olivia.harvest_plans
  alter column maturity_index drop not null,
  alter column maturity_index drop default,
  alter column fruit_size drop not null,
  alter column fruit_size drop default,
  alter column firmness drop not null,
  alter column firmness drop default,
  add column if not exists estimate_source text null,
  add column if not exists observation_date date null,
  add column if not exists planning_basis text null;

do $$ begin
  alter table olivia.harvest_plans add constraint harvest_plans_estimate_source_check
  check (estimate_source is null or estimate_source in ('field_estimate','previous_season','tree_count','weighing','other'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table olivia.harvest_plans add constraint harvest_plans_estimated_kg_nonnegative
  check (estimated_kg >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table olivia.harvest_plans add constraint harvest_plans_actual_kg_nonnegative
  check (actual_kg is null or actual_kg >= 0);
exception when duplicate_object then null; end $$;
