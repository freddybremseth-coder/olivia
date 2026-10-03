-- Customer preferred language for payment reminders.
alter table olivia.commerce_customers
  add column if not exists preferred_locale text not null default 'no';

do $$ begin
  alter table olivia.commerce_customers
    add constraint commerce_customers_preferred_locale_check
    check (preferred_locale in ('no','en','es'));
exception when duplicate_object then null; end $$;

insert into olivia.commerce_content_templates(id,name,template_type,subject,body,locale,channel,status)
values
('payment-due-soon-en','Payment reminder before due date','payment_reminder_due_soon',
 'Reminder: invoice {{invoice_number}} is due soon',
 'Hello {{customer_name}},

This is a friendly reminder that invoice {{invoice_number}} for {{amount}} {{currency}} is due on {{due_date}}.

If payment has already been sent, please disregard this message.

Kind regards
Doña Anna','en','portal','active'),
('payment-overdue-en','Payment reminder after due date','payment_reminder_overdue',
 'Reminder: invoice {{invoice_number}} is overdue',
 'Hello {{customer_name}},

Invoice {{invoice_number}} for {{amount}} {{currency}} was due on {{due_date}} and is still shown as unpaid in our system.

Please let us know if payment has already been sent or if there is anything we should clarify.

Kind regards
Doña Anna','en','portal','active'),
('payment-due-soon-es','Recordatorio antes del vencimiento','payment_reminder_due_soon',
 'Recordatorio: la factura {{invoice_number}} vence pronto',
 'Hola {{customer_name}},

Este es un recordatorio cordial de que la factura {{invoice_number}} por {{amount}} {{currency}} vence el {{due_date}}.

Si el pago ya ha sido enviado, puede ignorar este mensaje.

Un saludo
Doña Anna','es','portal','active'),
('payment-overdue-es','Recordatorio después del vencimiento','payment_reminder_overdue',
 'Recordatorio: la factura {{invoice_number}} está vencida',
 'Hola {{customer_name}},

La factura {{invoice_number}} por {{amount}} {{currency}} venció el {{due_date}} y todavía aparece como pendiente de pago en nuestro sistema.

Avísenos si el pago ya ha sido enviado o si hay algo que debamos aclarar.

Un saludo
Doña Anna','es','portal','active')
on conflict(id) do nothing;

create or replace function olivia.render_payment_reminder(p_template_type text,p_invoice_id text)
returns jsonb language plpgsql security definer set search_path='olivia','public' as $$
declare
 i olivia.commerce_invoices%rowtype;
 c olivia.commerce_customers%rowtype;
 t olivia.commerce_content_templates%rowtype;
 s text; b text; customer_name text; preferred_locale text:='no';
begin
 if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
 select * into i from olivia.commerce_invoices where id=p_invoice_id;
 if not found then raise exception 'Invoice not found'; end if;
 if i.customer_id is not null then
   select * into c from olivia.commerce_customers where id=i.customer_id;
   preferred_locale:=coalesce(nullif(c.preferred_locale,''),'no');
 end if;

 select * into t from olivia.commerce_content_templates
 where template_type=p_template_type and locale=preferred_locale and status='active'
 order by updated_at desc nulls last,created_at desc limit 1;

 if not found then
   select * into t from olivia.commerce_content_templates
   where template_type=p_template_type and locale='no' and status='active'
   order by updated_at desc nulls last,created_at desc limit 1;
 end if;

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
 return jsonb_build_object('subject',s,'body',b,'recipient_email',nullif(c.email,''),'locale',t.locale);
end; $$;
revoke all on function olivia.render_payment_reminder(text,text) from public;
grant execute on function olivia.render_payment_reminder(text,text) to authenticated;
