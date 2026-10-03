
alter table olivia.farm_expenses
  add column if not exists accounting_status text not null default 'posted'
  check (accounting_status in ('posted','planned','rejected'));

update olivia.farm_expenses
set accounting_status='planned'
where accounting_status='posted'
  and (
    lower(coalesce(document_filename,'')) like '%presupuesto%'
    or lower(coalesce(document_filename,'')) like '%proforma%'
    or lower(coalesce(document_filename,'')) like '%tratamiento%'
    or lower(coalesce(description,'')) like 'tilbud%'
    or lower(coalesce(description,'')) like 'behandlingsplan%'
  );

create index if not exists idx_farm_expenses_accounting_status
  on olivia.farm_expenses(accounting_status);
