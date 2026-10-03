alter table olivia.commerce_products
  add column if not exists cost_configured boolean not null default false,
  add column if not exists cost_source text null,
  add column if not exists cost_updated_at timestamptz null;

do $$ begin
  alter table olivia.commerce_products add constraint commerce_products_cost_source_check
  check (cost_source is null or cost_source in ('manual','production','supplier','accounting'));
exception when duplicate_object then null; end $$;
