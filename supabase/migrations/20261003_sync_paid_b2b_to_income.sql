-- Automatically sync paid B2B orders/invoices into Olivia's actual income ledger.
-- Test and zero-value orders never become revenue.

create or replace function olivia.sync_paid_order_to_farm_income()
returns trigger
language plpgsql
security definer
set search_path = olivia, public
as $$
declare
  is_paid boolean;
  income_id text;
  pay_date date;
  pay_period text;
  season_value text;
begin
  is_paid := (
    lower(coalesce(new.payment_status,'')) like '%betalt%'
    or lower(coalesce(new.payment_status,'')) like '%paid%'
  );
  income_id := 'income-b2b-order-' || new.id;
  pay_date := current_date;
  pay_period := to_char(pay_date, 'YYYY-MM');
  season_value := to_char(coalesce(new.ordered_at, new.created_at, now()), 'YYYY');

  if is_paid
     and coalesce(new.total_amount,0) > 0
     and lower(coalesce(new.status,'')) <> 'test'
  then
    insert into olivia.farm_income (
      id, season, income_type, description, amount, currency, status,
      payment_date, payment_period, customer, source, source_ref, notes
    )
    values (
      income_id, season_value, 'b2b_sale',
      'B2B-ordre ' || coalesce(new.order_number,new.id),
      new.total_amount, coalesce(new.currency,'EUR'), 'received',
      pay_date, pay_period, coalesce(new.customer_name,new.customer_id,'B2B-kunde'),
      'b2b_order', new.id, 'Automatisk opprettet fra betalt B2B-ordre.'
    )
    on conflict (id) do update set
      season=excluded.season,
      description=excluded.description,
      amount=excluded.amount,
      currency=excluded.currency,
      status='received',
      payment_date=coalesce(olivia.farm_income.payment_date, excluded.payment_date),
      payment_period=coalesce(olivia.farm_income.payment_period, excluded.payment_period),
      customer=excluded.customer,
      source=case when olivia.farm_income.source='b2b_invoice' then olivia.farm_income.source else excluded.source end,
      notes=excluded.notes,
      updated_at=now();
  elsif tg_op='UPDATE' then
    update olivia.farm_income
    set status='cancelled', updated_at=now()
    where id=income_id and source='b2b_order';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_paid_order_to_income on olivia.commerce_orders;
create trigger trg_sync_paid_order_to_income
after insert or update of payment_status, status, total_amount
on olivia.commerce_orders
for each row execute function olivia.sync_paid_order_to_farm_income();

create or replace function olivia.sync_paid_invoice_to_farm_income()
returns trigger
language plpgsql
security definer
set search_path = olivia, public
as $$
declare
  is_paid boolean;
  income_id text;
  pay_date date;
  pay_period text;
  season_value text;
  total_value numeric;
begin
  is_paid := (
    lower(coalesce(new.payment_status,'')) like '%betalt%'
    or lower(coalesce(new.payment_status,'')) like '%paid%'
    or lower(coalesce(new.status,'')) like '%betalt%'
    or lower(coalesce(new.status,'')) like '%paid%'
  );
  income_id := case
    when new.order_id is not null and new.order_id <> '' then 'income-b2b-order-' || new.order_id
    else 'income-b2b-invoice-' || new.id
  end;
  pay_date := case
    when coalesce(new.paid_date,'') ~ '^\\d{4}-\\d{2}-\\d{2}$' then new.paid_date::date
    else current_date
  end;
  pay_period := to_char(pay_date, 'YYYY-MM');
  season_value := to_char(coalesce(new.issue_date, new.created_at::date, current_date), 'YYYY');
  total_value := coalesce(new.invoice_total,new.total_amount,new.amount,0);

  if is_paid and total_value > 0 then
    insert into olivia.farm_income (
      id, season, income_type, description, amount, currency, status,
      payment_date, payment_period, customer, source, source_ref, notes
    )
    values (
      income_id, season_value, 'b2b_sale',
      'B2B-faktura ' || coalesce(new.invoice_number,new.id),
      total_value, coalesce(new.currency,'EUR'), 'received',
      pay_date, pay_period, coalesce(new.customer_name,new.customer_id,'B2B-kunde'),
      'b2b_invoice', new.id, 'Automatisk synkronisert fra betalt B2B-faktura.'
    )
    on conflict (id) do update set
      season=excluded.season,
      description=excluded.description,
      amount=excluded.amount,
      currency=excluded.currency,
      status='received',
      payment_date=excluded.payment_date,
      payment_period=excluded.payment_period,
      customer=excluded.customer,
      source='b2b_invoice',
      source_ref=excluded.source_ref,
      notes=excluded.notes,
      updated_at=now();
  elsif tg_op='UPDATE' then
    update olivia.farm_income
    set status='cancelled', updated_at=now()
    where id=income_id and source='b2b_invoice';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_paid_invoice_to_income on olivia.commerce_invoices;
create trigger trg_sync_paid_invoice_to_income
after insert or update of payment_status, status, invoice_total, total_amount, amount, paid_date
on olivia.commerce_invoices
for each row execute function olivia.sync_paid_invoice_to_farm_income();
