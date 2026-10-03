-- Controlled payment reminder workflow.
-- Drafts may be created automatically from invoice due dates, but nothing is
-- sent automatically. Internal users must approve before portal/external send.

create table if not exists olivia.commerce_payment_reminders (
  id text primary key,
  invoice_id text not null references olivia.commerce_invoices(id) on delete cascade,
  order_id text references olivia.commerce_orders(id) on delete set null,
  customer_id text references olivia.commerce_customers(id) on delete set null,
  stage text not null default 'manual',
  channel text not null default 'portal',
  recipient_email text,
  subject text not null,
  body text not null default '',
  status text not null default 'draft',
  amount numeric not null default 0,
  currency text not null default 'EUR',
  due_date date,
  generated_at timestamptz not null default now(),
  approved_at timestamptz,
  sent_at timestamptz,
  sent_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table olivia.commerce_payment_reminders add constraint commerce_payment_reminders_status_check
  check (status in ('draft','approved','sent','cancelled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table olivia.commerce_payment_reminders add constraint commerce_payment_reminders_stage_check
  check (stage in ('due_soon','overdue','manual'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table olivia.commerce_payment_reminders add constraint commerce_payment_reminders_channel_check
  check (channel in ('portal','email','external'));
exception when duplicate_object then null; end $$;

create index if not exists idx_commerce_payment_reminders_invoice on olivia.commerce_payment_reminders(invoice_id);
create index if not exists idx_commerce_payment_reminders_status on olivia.commerce_payment_reminders(status,due_date);

alter table olivia.commerce_payment_reminders enable row level security;
drop policy if exists olivia_internal_all_commerce_payment_reminders on olivia.commerce_payment_reminders;
create policy olivia_internal_all_commerce_payment_reminders
on olivia.commerce_payment_reminders for all to authenticated
using (olivia_private.is_internal_user()) with check (olivia_private.is_internal_user());

drop trigger if exists commerce_payment_reminders_set_updated_at on olivia.commerce_payment_reminders;
create trigger commerce_payment_reminders_set_updated_at before update on olivia.commerce_payment_reminders
for each row execute function olivia.set_updated_at();

insert into olivia.commerce_content_templates(id,name,template_type,subject,body,locale,channel,status)
values
('payment-due-soon-no','Betalingspåminnelse før forfall','payment_reminder_due_soon',
 'Påminnelse: faktura {{invoice_number}} forfaller snart',
 'Hei {{customer_name}},

Dette er en vennlig påminnelse om faktura {{invoice_number}} på {{amount}} {{currency}}, med forfall {{due_date}}.

Har betalingen allerede blitt sendt, kan du se bort fra denne meldingen.

Vennlig hilsen
Doña Anna',
 'no','portal','active'),
('payment-overdue-no','Betalingspåminnelse etter forfall','payment_reminder_overdue',
 'Påminnelse: faktura {{invoice_number}} er forfalt',
 'Hei {{customer_name}},

Faktura {{invoice_number}} på {{amount}} {{currency}} hadde forfall {{due_date}} og står fortsatt som ubetalt hos oss.

Gi gjerne beskjed dersom betalingen allerede er sendt, eller hvis det er noe vi skal avklare.

Vennlig hilsen
Doña Anna',
 'no','portal','active')
on conflict(id) do nothing;

create or replace function olivia.render_payment_reminder(p_template_type text,p_invoice_id text)
returns jsonb language plpgsql security definer set search_path='olivia','public' as $$
declare
 i olivia.commerce_invoices%rowtype;
 c olivia.commerce_customers%rowtype;
 t olivia.commerce_content_templates%rowtype;
 s text; b text; customer_name text;
begin
 if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
 select * into i from olivia.commerce_invoices where id=p_invoice_id;
 if not found then raise exception 'Invoice not found'; end if;
 if i.customer_id is not null then select * into c from olivia.commerce_customers where id=i.customer_id; end if;
 select * into t from olivia.commerce_content_templates
 where template_type=p_template_type and status='active'
 order by updated_at desc nulls last,created_at desc limit 1;
 if not found then raise exception 'Payment reminder template not found'; end if;
 customer_name:=coalesce(nullif(c.company,''),nullif(c.contact_name,''),nullif(i.customer_name,''),'kunde');
 s:=t.subject; b:=t.body;
 s:=replace(s,'{{invoice_number}}',i.invoice_number);
 s:=replace(s,'{{customer_name}}',customer_name);
 s:=replace(s,'{{amount}}',to_char(i.total_amount,'FM999999990.00'));
 s:=replace(s,'{{currency}}',coalesce(i.currency,'EUR'));
 s:=replace(s,'{{due_date}}',coalesce(i.due_date,'—'));
 b:=replace(b,'{{invoice_number}}',i.invoice_number);
 b:=replace(b,'{{customer_name}}',customer_name);
 b:=replace(b,'{{amount}}',to_char(i.total_amount,'FM999999990.00'));
 b:=replace(b,'{{currency}}',coalesce(i.currency,'EUR'));
 b:=replace(b,'{{due_date}}',coalesce(i.due_date,'—'));
 return jsonb_build_object('subject',s,'body',b,'recipient_email',nullif(c.email,''));
end; $$;
revoke all on function olivia.render_payment_reminder(text,text) from public;
grant execute on function olivia.render_payment_reminder(text,text) to authenticated;

create or replace function olivia.refresh_payment_reminder_drafts()
returns integer language plpgsql security definer set search_path='olivia','public' as $$
declare rec record; rendered jsonb; created_count integer:=0; reminder_id text;
begin
 if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;

 update olivia.commerce_payment_reminders r
 set status='cancelled',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('cancel_reason','invoice_paid_or_closed','cancelled_at',now())
 where r.status in ('draft','approved') and exists(
   select 1 from olivia.commerce_invoices i where i.id=r.invoice_id and (
    lower(coalesce(i.payment_status,'')) like '%betalt%' or lower(coalesce(i.payment_status,'')) like '%paid%'
    or lower(coalesce(i.status,'')) like '%betalt%' or lower(coalesce(i.status,'')) like '%paid%'
    or lower(coalesce(i.status,'')) like '%kredit%'
   )
 );

 update olivia.commerce_payment_reminders r
 set status='cancelled',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('cancel_reason','no_longer_due_for_stage','cancelled_at',now())
 where r.status in ('draft','approved') and r.stage='due_soon' and not exists(
   select 1 from olivia.commerce_invoices i where i.id=r.invoice_id and i.due_date ~ '^\d{4}-\d{2}-\d{2}$'
   and i.due_date::date between current_date and current_date+3
 );

 update olivia.commerce_payment_reminders r
 set status='cancelled',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('cancel_reason','no_longer_overdue','cancelled_at',now())
 where r.status in ('draft','approved') and r.stage='overdue' and not exists(
   select 1 from olivia.commerce_invoices i where i.id=r.invoice_id and i.due_date ~ '^\d{4}-\d{2}-\d{2}$'
   and i.due_date::date<current_date
 );

 for rec in
   select i.* from olivia.commerce_invoices i
   where lower(coalesce(i.payment_status,'')) not like '%betalt%'
     and lower(coalesce(i.payment_status,'')) not like '%paid%'
     and lower(coalesce(i.status,'')) not like '%betalt%'
     and lower(coalesce(i.status,'')) not like '%paid%'
     and lower(coalesce(i.status,'')) not like '%kredit%'
     and i.due_date ~ '^\d{4}-\d{2}-\d{2}$'
     and i.due_date::date between current_date and current_date+3
 loop
   reminder_id:='reminder-due-'||rec.id||'-'||rec.due_date;
   if not exists(select 1 from olivia.commerce_payment_reminders where id=reminder_id) then
     rendered:=olivia.render_payment_reminder('payment_reminder_due_soon',rec.id);
     insert into olivia.commerce_payment_reminders(
       id,invoice_id,order_id,customer_id,stage,channel,recipient_email,subject,body,status,amount,currency,due_date,metadata
     ) values(
       reminder_id,rec.id,rec.order_id,rec.customer_id,'due_soon','portal',
       rendered->>'recipient_email',rendered->>'subject',rendered->>'body','draft',
       rec.total_amount,coalesce(rec.currency,'EUR'),rec.due_date::date,
       jsonb_build_object('generated_by','olivia','automatic_send',false)
     );
     created_count:=created_count+1;
   end if;
 end loop;

 for rec in
   select i.* from olivia.commerce_invoices i
   where lower(coalesce(i.payment_status,'')) not like '%betalt%'
     and lower(coalesce(i.payment_status,'')) not like '%paid%'
     and lower(coalesce(i.status,'')) not like '%betalt%'
     and lower(coalesce(i.status,'')) not like '%paid%'
     and lower(coalesce(i.status,'')) not like '%kredit%'
     and i.due_date ~ '^\d{4}-\d{2}-\d{2}$'
     and i.due_date::date<current_date
 loop
   reminder_id:='reminder-overdue-'||rec.id||'-'||rec.due_date;
   if not exists(select 1 from olivia.commerce_payment_reminders where id=reminder_id) then
     rendered:=olivia.render_payment_reminder('payment_reminder_overdue',rec.id);
     insert into olivia.commerce_payment_reminders(
       id,invoice_id,order_id,customer_id,stage,channel,recipient_email,subject,body,status,amount,currency,due_date,metadata
     ) values(
       reminder_id,rec.id,rec.order_id,rec.customer_id,'overdue','portal',
       rendered->>'recipient_email',rendered->>'subject',rendered->>'body','draft',
       rec.total_amount,coalesce(rec.currency,'EUR'),rec.due_date::date,
       jsonb_build_object('generated_by','olivia','automatic_send',false)
     );
     created_count:=created_count+1;
   end if;
 end loop;
 return created_count;
end; $$;
revoke all on function olivia.refresh_payment_reminder_drafts() from public;
grant execute on function olivia.refresh_payment_reminder_drafts() to authenticated;

create or replace function olivia.approve_payment_reminder(p_reminder_id text)
returns void language plpgsql security definer set search_path='olivia','public' as $$
begin
 if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
 update olivia.commerce_payment_reminders set status='approved',approved_at=now()
 where id=p_reminder_id and status='draft';
 if not found then raise exception 'Reminder draft not found or is not editable'; end if;
end; $$;
revoke all on function olivia.approve_payment_reminder(text) from public;
grant execute on function olivia.approve_payment_reminder(text) to authenticated;

create or replace function olivia.send_payment_reminder_to_portal(p_reminder_id text)
returns text language plpgsql security definer set search_path='olivia','public' as $$
declare r olivia.commerce_payment_reminders%rowtype; i olivia.commerce_invoices%rowtype; c olivia.commerce_customers%rowtype; message_id text;
begin
 if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
 select * into r from olivia.commerce_payment_reminders where id=p_reminder_id for update;
 if not found then raise exception 'Reminder not found'; end if;
 if r.status<>'approved' then raise exception 'Reminder must be approved before sending'; end if;
 select * into i from olivia.commerce_invoices where id=r.invoice_id;
 if not found then raise exception 'Invoice not found'; end if;
 if lower(coalesce(i.payment_status,'')) like '%betalt%' or lower(coalesce(i.payment_status,'')) like '%paid%'
    or lower(coalesce(i.status,'')) like '%betalt%' or lower(coalesce(i.status,'')) like '%paid%'
 then raise exception 'Invoice is already paid'; end if;
 if r.customer_id is not null then select * into c from olivia.commerce_customers where id=r.customer_id; end if;
 message_id:='reminder-message-'||r.id;
 insert into olivia.commerce_messages(id,customer_id,profile_id,subject,body,status,direction,created_at,updated_at)
 values(message_id,r.customer_id,c.profile_id,r.subject,r.body,'Sendt','admin_to_customer',now(),now())
 on conflict(id) do nothing;
 update olivia.commerce_payment_reminders
 set status='sent',channel='portal',sent_at=coalesce(sent_at,now()),sent_message_id=message_id
 where id=r.id;
 return message_id;
end; $$;
revoke all on function olivia.send_payment_reminder_to_portal(text) from public;
grant execute on function olivia.send_payment_reminder_to_portal(text) to authenticated;

create or replace function olivia.mark_payment_reminder_external_sent(p_reminder_id text,p_channel text default 'email')
returns void language plpgsql security definer set search_path='olivia','public' as $$
begin
 if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
 if p_channel not in ('email','external') then raise exception 'Unsupported external channel'; end if;
 update olivia.commerce_payment_reminders
 set status='sent',channel=p_channel,sent_at=coalesce(sent_at,now()),
     metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('external_send_confirmed',true)
 where id=p_reminder_id and status='approved';
 if not found then raise exception 'Approved reminder not found'; end if;
end; $$;
revoke all on function olivia.mark_payment_reminder_external_sent(text,text) from public;
grant execute on function olivia.mark_payment_reminder_external_sent(text,text) to authenticated;
