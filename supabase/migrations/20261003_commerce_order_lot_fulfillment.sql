-- Fulfilment bridge: packaged lot -> order line -> invoice -> paid farm income.
create or replace function olivia.assign_order_item_lot(p_order_item_id text,p_lot_id text)
returns jsonb language plpgsql security definer set search_path='olivia','public' as $$
declare item olivia.commerce_order_items%rowtype; lot olivia.product_lots%rowtype; lot_on_hand numeric:=0; lot_reserved numeric:=0;
begin
  if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
  select * into item from olivia.commerce_order_items where id=p_order_item_id for update;
  if not found then raise exception 'Order item not found'; end if;
  if item.product_id is null then raise exception 'Order item has no product'; end if;
  select * into lot from olivia.product_lots where id=p_lot_id and status='active' for update;
  if not found then raise exception 'Active product lot not found'; end if;
  if lot.product_id<>item.product_id then raise exception 'Product lot belongs to another product'; end if;
  select coalesce(sum(on_hand_delta),0),coalesce(sum(reserved_delta),0) into lot_on_hand,lot_reserved from olivia.inventory_movements where lot_id=p_lot_id;
  if (lot_on_hand-lot_reserved)<coalesce(item.quantity,0) and item.lot_id is distinct from p_lot_id then raise exception 'Not enough available units in product lot'; end if;
  update olivia.commerce_order_items set lot_id=p_lot_id where id=item.id;
  update olivia.inventory_movements set lot_id=p_lot_id where order_item_id=item.id and event_key='reserve:'||item.id;
  return jsonb_build_object('order_item_id',item.id,'lot_id',p_lot_id,'quantity',item.quantity);
end; $$;
revoke all on function olivia.assign_order_item_lot(text,text) from public;
grant execute on function olivia.assign_order_item_lot(text,text) to authenticated;

create sequence if not exists olivia.commerce_invoice_number_seq start 1;
create or replace function olivia.create_invoice_for_order(p_order_id text,p_due_date date default null)
returns text language plpgsql security definer set search_path='olivia','public' as $$
declare o olivia.commerce_orders%rowtype; existing_id text; invoice_id text; invoice_no text;
begin
  if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
  select id into existing_id from olivia.commerce_invoices where order_id=p_order_id order by created_at desc limit 1;
  if existing_id is not null then return existing_id; end if;
  select * into o from olivia.commerce_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if lower(coalesce(o.status,''))='test' then raise exception 'Test orders cannot be invoiced'; end if;
  if coalesce(o.total_amount,0)<=0 then raise exception 'Order total must be greater than zero'; end if;
  invoice_id:='invoice-'||o.id;
  invoice_no:='INV-'||to_char(current_date,'YYYY')||'-'||lpad(nextval('olivia.commerce_invoice_number_seq')::text,5,'0');
  insert into olivia.commerce_invoices(id,invoice_number,order_id,customer_id,customer_name,status,payment_status,amount,tax_amount,total_amount,invoice_total,currency,issue_date,due_date,reference,metadata)
  values(invoice_id,invoice_no,o.id,o.customer_id,o.customer_name,'Sendt','Ubetalt',greatest(coalesce(o.subtotal,o.total_amount)-coalesce(o.tax_amount,0),0),coalesce(o.tax_amount,0),o.total_amount,o.total_amount,coalesce(o.currency,'EUR'),current_date,coalesce(p_due_date,current_date+14),o.order_number,jsonb_build_object('source','commerce_order','billing_address',o.billing_address,'shipping_address',o.shipping_address));
  return invoice_id;
end; $$;
revoke all on function olivia.create_invoice_for_order(text,date) from public;
grant execute on function olivia.create_invoice_for_order(text,date) to authenticated;

create or replace function olivia.mark_commerce_invoice_paid(p_invoice_id text,p_payment_method text default null,p_paid_date date default current_date)
returns void language plpgsql security definer set search_path='olivia','public' as $$
declare inv olivia.commerce_invoices%rowtype;
begin
  if not olivia_private.is_internal_user() then raise exception 'Internal Olivia access required'; end if;
  select * into inv from olivia.commerce_invoices where id=p_invoice_id for update;
  if not found then raise exception 'Invoice not found'; end if;
  update olivia.commerce_invoices set status='Betalt',payment_status='Betalt',paid_date=p_paid_date::text,payment_method=coalesce(p_payment_method,payment_method),updated_at=now() where id=p_invoice_id;
  if inv.order_id is not null then update olivia.commerce_orders set payment_status='Betalt',updated_at=now() where id=inv.order_id; end if;
end; $$;
revoke all on function olivia.mark_commerce_invoice_paid(text,text,date) from public;
grant execute on function olivia.mark_commerce_invoice_paid(text,text,date) to authenticated;
