create table if not exists olivia.cost_suggestion_dismissals (
  id text primary key,
  expense_id text not null references olivia.farm_expenses(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  reason text,
  created_at timestamptz not null default now()
);

do $$ begin
  alter table olivia.cost_suggestion_dismissals add constraint cost_suggestion_dismissals_target_type_check
  check (target_type in ('batch','lot'));
exception when duplicate_object then null; end $$;

create unique index if not exists idx_cost_suggestion_dismissals_unique
  on olivia.cost_suggestion_dismissals(expense_id,target_type,target_id);

alter table olivia.cost_suggestion_dismissals enable row level security;
drop policy if exists olivia_internal_all_cost_suggestion_dismissals on olivia.cost_suggestion_dismissals;
create policy olivia_internal_all_cost_suggestion_dismissals
on olivia.cost_suggestion_dismissals for all to authenticated
using (olivia_private.is_internal_user())
with check (olivia_private.is_internal_user());
