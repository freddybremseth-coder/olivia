alter table olivia.farm_year_wheel_items
  drop constraint if exists farm_year_wheel_items_status_check;

alter table olivia.farm_year_wheel_items
  add constraint farm_year_wheel_items_status_check
  check (status in ('suggested','approved','in_progress','postponed','done','skipped'));
