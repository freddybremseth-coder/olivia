-- Configurable VAT/price basis, payment terms, and idempotent commerce attention.
alter table olivia.commerce_products
  add column if not exists vat_configured boolean not null default false,
  add column if not exists price_basis text null;

do $$ begin
  alter table olivia.commerce_products add constraint commerce_products_price_basis_check
  check (price_basis is null or price_basis in ('gross','net'));
exception when duplicate_object then null; end $$;

alter table olivia.commerce_order_items
  add column if not exists net_unit_price numeric null,
  add column if not exists gross_unit_price numeric null,
  add column if not exists tax_amount numeric not null default 0,
  add column if not exists price_basis text null;

alter table olivia.commerce_customers
  add column if not exists payment_terms_days integer null;

do $$ begin
  alter table olivia.commerce_customers add constraint commerce_customers_payment_terms_days_check
  check (payment_terms_days is null or payment_terms_days between 0 and 180);
exception when duplicate_object then null; end $$;

alter table olivia.commerce_business_settings
  add column if not exists default_payment_terms_days integer not null default 0;

do $$ begin
  alter table olivia.commerce_business_settings add constraint commerce_business_default_terms_check
  check (default_payment_terms_days between 0 and 180);
exception when duplicate_object then null; end $$;

create or replace function olivia.create_invoice_for_order(p_order_id text,p_due_date date default null)
returns text language plpgsql security definer set search_path='olivia','public' as $$
declare
  o olivia.commerce_orders%rowtype;
  existing_id text;
  invoice_id text;
  invoice_no text;
  terms_days integer:=0;
  resolved_due date;
begin
  if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
  select id into existing_id from olivia.commerce_invoices where order_id=p_order_id order by created_at desc limit 1;
  if existing_id is not null then return existing_id; end if;

  select * into o from olivia.commerce_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if lower(coalesce(o.status,''))='test' then raise exception 'Test orders cannot be invoiced'; end if;
  if coalesce(o.total_amount,0)<=0 then raise exception 'Order total must be greater than zero'; end if;

  select coalesce(c.payment_terms_days,s.default_payment_terms_days,0)
  into terms_days
  from olivia.commerce_business_settings s
  left join olivia.commerce_customers c on c.id=o.customer_id
  where s.id='default';

  resolved_due:=coalesce(p_due_date,current_date+coalesce(terms_days,0));
  invoice_id:='invoice-'||o.id;
  invoice_no:=coalesce((select invoice_prefix from olivia.commerce_business_settings where id='default'),'INV')
    ||'-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('olivia.commerce_invoice_number_seq')::text,5,'0');

  insert into olivia.commerce_invoices(
    id,invoice_number,order_id,customer_id,customer_name,status,payment_status,
    amount,tax_amount,total_amount,invoice_total,currency,issue_date,due_date,reference,metadata
  ) values (
    invoice_id,invoice_no,o.id,o.customer_id,o.customer_name,'Sendt','Ubetalt',
    coalesce(o.subtotal,o.total_amount),
    coalesce(o.tax_amount,0),
    o.total_amount,o.total_amount,coalesce(o.currency,'EUR'),
    current_date,resolved_due::text,o.order_number,
    jsonb_build_object(
      'source','commerce_order',
      'billing_address',o.billing_address,
      'shipping_address',o.shipping_address,
      'payment_terms_days',coalesce(terms_days,0)
    )
  );
  return invoice_id;
end; $$;
revoke all on function olivia.create_invoice_for_order(text,date) from public;
grant execute on function olivia.create_invoice_for_order(text,date) to authenticated;

create or replace function olivia.refresh_commerce_attention()
returns integer
language plpgsql
security definer
set search_path='olivia','public'
as $$
declare changed integer:=0;
begin
  if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;

  update olivia.commerce_notifications n
  set status='resolved'
  where n.event_type='order_process'
    and n.status<>'resolved'
    and not exists (
      select 1 from olivia.commerce_orders o
      where o.id=n.related_order_id and lower(coalesce(o.status,'')) not in ('test','sendt','shipped','levert','delivered','cancelled','canceled','kansellert')
        and coalesce(o.total_amount,0)>0
        and exists(select 1 from olivia.commerce_order_items i where i.order_id=o.id and i.product_id is not null and i.lot_id is null)
    );

  update olivia.commerce_notifications n
  set status='resolved'
  where n.event_type='order_ready_to_ship'
    and n.status<>'resolved'
    and not exists (
      select 1 from olivia.commerce_orders o
      where o.id=n.related_order_id and lower(coalesce(o.status,'')) not in ('test','sendt','shipped','levert','delivered','cancelled','canceled','kansellert')
        and coalesce(o.total_amount,0)>0
        and exists(select 1 from olivia.commerce_order_items i where i.order_id=o.id and i.product_id is not null)
        and not exists(select 1 from olivia.commerce_order_items i where i.order_id=o.id and i.product_id is not null and i.lot_id is null)
    );

  update olivia.commerce_notifications n
  set status='resolved'
  where n.event_type in ('invoice_overdue','invoice_due_soon')
    and n.status<>'resolved'
    and not exists (
      select 1 from olivia.commerce_invoices i
      where i.id=n.payload->>'invoice_id'
        and lower(coalesce(i.payment_status,i.status,'')) not like '%betalt%'
        and lower(coalesce(i.payment_status,i.status,'')) not like '%paid%'
        and lower(coalesce(i.status,'')) not like '%kredit%'
        and i.due_date ~ '^\d{4}-\d{2}-\d{2}$'
        and (
          (n.event_type='invoice_overdue' and i.due_date::date<current_date)
          or
          (n.event_type='invoice_due_soon' and i.due_date::date between current_date and current_date+3)
        )
    );

  insert into olivia.commerce_notifications(id,event_type,title,body,severity,status,related_order_id,related_customer_id,payload)
  select
    'attention-order-process-'||o.id,'order_process',
    'Ordre må behandles',
    o.order_number||' · '||coalesce(nullif(o.customer_name,''),'Kunde')||' · '||to_char(o.total_amount,'FM999999990.00')||' EUR',
    'warning','new',o.id,o.customer_id,
    jsonb_build_object('order_id',o.id,'order_number',o.order_number,'total_amount',o.total_amount)
  from olivia.commerce_orders o
  where lower(coalesce(o.status,'')) not in ('test','sendt','shipped','levert','delivered','cancelled','canceled','kansellert')
    and coalesce(o.total_amount,0)>0
    and exists(select 1 from olivia.commerce_order_items i where i.order_id=o.id and i.product_id is not null and i.lot_id is null)
  on conflict(id) do update set
    title=excluded.title,body=excluded.body,severity=excluded.severity,payload=excluded.payload,
    status=case when olivia.commerce_notifications.status='resolved' then 'new' else olivia.commerce_notifications.status end,
    read_at=case when olivia.commerce_notifications.status='resolved' then null else olivia.commerce_notifications.read_at end;

  insert into olivia.commerce_notifications(id,event_type,title,body,severity,status,related_order_id,related_customer_id,payload)
  select
    'attention-order-ship-'||o.id,'order_ready_to_ship',
    'Ordre klar til sending',
    o.order_number||' har pakkelot på alle varelinjer og kan sendes.',
    'info','new',o.id,o.customer_id,
    jsonb_build_object('order_id',o.id,'order_number',o.order_number,'total_amount',o.total_amount)
  from olivia.commerce_orders o
  where lower(coalesce(o.status,'')) not in ('test','sendt','shipped','levert','delivered','cancelled','canceled','kansellert')
    and coalesce(o.total_amount,0)>0
    and exists(select 1 from olivia.commerce_order_items i where i.order_id=o.id and i.product_id is not null)
    and not exists(select 1 from olivia.commerce_order_items i where i.order_id=o.id and i.product_id is not null and i.lot_id is null)
  on conflict(id) do update set
    title=excluded.title,body=excluded.body,severity=excluded.severity,payload=excluded.payload,
    status=case when olivia.commerce_notifications.status='resolved' then 'new' else olivia.commerce_notifications.status end,
    read_at=case when olivia.commerce_notifications.status='resolved' then null else olivia.commerce_notifications.read_at end;

  insert into olivia.commerce_notifications(id,event_type,title,body,severity,status,related_order_id,related_customer_id,payload)
  select
    'attention-invoice-overdue-'||i.id,'invoice_overdue',
    'Faktura er forfalt',
    i.invoice_number||' · '||coalesce(nullif(i.customer_name,''),'Kunde')||' · '||to_char(i.total_amount,'FM999999990.00')||' EUR · forfall '||i.due_date,
    'critical','new',i.order_id,i.customer_id,
    jsonb_build_object('invoice_id',i.id,'invoice_number',i.invoice_number,'due_date',i.due_date,'total_amount',i.total_amount)
  from olivia.commerce_invoices i
  where lower(coalesce(i.payment_status,i.status,'')) not like '%betalt%'
    and lower(coalesce(i.payment_status,i.status,'')) not like '%paid%'
    and lower(coalesce(i.status,'')) not like '%kredit%'
    and i.due_date ~ '^\d{4}-\d{2}-\d{2}$'
    and i.due_date::date<current_date
  on conflict(id) do update set
    title=excluded.title,body=excluded.body,severity=excluded.severity,payload=excluded.payload,
    status=case when olivia.commerce_notifications.status='resolved' then 'new' else olivia.commerce_notifications.status end,
    read_at=case when olivia.commerce_notifications.status='resolved' then null else olivia.commerce_notifications.read_at end;

  insert into olivia.commerce_notifications(id,event_type,title,body,severity,status,related_order_id,related_customer_id,payload)
  select
    'attention-invoice-due-'||i.id,'invoice_due_soon',
    'Faktura forfaller snart',
    i.invoice_number||' · '||coalesce(nullif(i.customer_name,''),'Kunde')||' · forfall '||i.due_date,
    'warning','new',i.order_id,i.customer_id,
    jsonb_build_object('invoice_id',i.id,'invoice_number',i.invoice_number,'due_date',i.due_date,'total_amount',i.total_amount)
  from olivia.commerce_invoices i
  where lower(coalesce(i.payment_status,i.status,'')) not like '%betalt%'
    and lower(coalesce(i.payment_status,i.status,'')) not like '%paid%'
    and lower(coalesce(i.status,'')) not like '%kredit%'
    and i.due_date ~ '^\d{4}-\d{2}-\d{2}$'
    and i.due_date::date between current_date and current_date+3
  on conflict(id) do update set
    title=excluded.title,body=excluded.body,severity=excluded.severity,payload=excluded.payload,
    status=case when olivia.commerce_notifications.status='resolved' then 'new' else olivia.commerce_notifications.status end,
    read_at=case when olivia.commerce_notifications.status='resolved' then null else olivia.commerce_notifications.read_at end;

  select count(*) into changed from olivia.commerce_notifications
  where event_type in ('order_process','order_ready_to_ship','invoice_overdue','invoice_due_soon')
    and status in ('new','read');
  return changed;
end; $$;
revoke all on function olivia.refresh_commerce_attention() from public;
grant execute on function olivia.refresh_commerce_attention() to authenticated;

create or replace function olivia.refresh_commerce_attention_trigger()
returns trigger language plpgsql security definer set search_path='olivia','public' as $$
begin
  perform olivia.refresh_commerce_attention();
  return coalesce(new,old);
exception when others then
  return coalesce(new,old);
end; $$;

drop trigger if exists trg_refresh_attention_orders on olivia.commerce_orders;
create trigger trg_refresh_attention_orders after insert or update on olivia.commerce_orders
for each statement execute function olivia.refresh_commerce_attention_trigger();

drop trigger if exists trg_refresh_attention_invoices on olivia.commerce_invoices;
create trigger trg_refresh_attention_invoices after insert or update on olivia.commerce_invoices
for each statement execute function olivia.refresh_commerce_attention_trigger();

drop trigger if exists trg_refresh_attention_order_items on olivia.commerce_order_items;
create trigger trg_refresh_attention_order_items after insert or update on olivia.commerce_order_items
for each statement execute function olivia.refresh_commerce_attention_trigger();
