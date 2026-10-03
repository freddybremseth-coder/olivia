import type { CommerceBusinessSettings, UnifiedInvoiceRow, UnifiedOrderRow, UnifiedProductLot, UnifiedShipmentRow } from './commerceInventory';

type CommerceDocumentType = 'order_confirmation' | 'packing_slip' | 'invoice';

const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[ch]||ch));
const money=(value:number,currency='EUR')=>new Intl.NumberFormat('nb-NO',{style:'currency',currency}).format(value||0);
const date=(value?:string)=>value?new Date(value).toLocaleDateString('nb-NO'):'—';

export function sellerIsInvoiceReady(settings:CommerceBusinessSettings|null){
  return !!(settings?.legal_name?.trim()&&settings?.tax_id?.trim()&&settings?.address?.trim()&&settings?.city?.trim());
}

export function openCommerceDocument(params:{
  type:CommerceDocumentType;
  order:UnifiedOrderRow;
  invoice?:UnifiedInvoiceRow;
  shipment?:UnifiedShipmentRow;
  lots:UnifiedProductLot[];
  settings:CommerceBusinessSettings|null;
}){
  const {type,order,invoice,shipment,lots,settings}=params;
  const isInvoice=type==='invoice';
  const ready=sellerIsInvoiceReady(settings);
  const title=type==='packing_slip'?'Pakkseddel':type==='invoice'?(ready?'Faktura':'Fakturautkast'):'Ordrebekreftelse';
  const customer=order.customer;
  const customerName=customer?.company||order.customer_name||customer?.contact_name||'Kunde';
  const billing=order.billing_address||customer?.billing_address||'';
  const shipping=order.shipping_address||customer?.shipping_address||billing;
  const sellerName=settings?.legal_name||settings?.display_name||'Doña Anna';
  const sellerAddress=[settings?.address,[settings?.postal_code,settings?.city].filter(Boolean).join(' '),settings?.province,settings?.country].filter(Boolean).join(', ');
  const rows=order.items.map(item=>{
    const lot=item.lot_id?lots.find(l=>l.id===item.lot_id):undefined;
    return `<tr><td><strong>${esc(item.name)}</strong><br><small>${esc(item.sku||'')}</small></td><td>${esc(lot?.lot_code||'—')}</td><td class="num">${item.quantity}</td>${type==='packing_slip'?'':`<td class="num">${money(item.gross_unit_price ?? item.unit_price,order.currency)}</td><td class="num">${item.tax_rate == null ? '—' : esc(item.tax_rate)+'%'}</td><td class="num">${money(item.total_price,order.currency)}</td>`}</tr>`;
  }).join('');
  const financial=type==='packing_slip'?'':`
    <div class="totals">
      <div><span>Varer</span><strong>${money(order.subtotal||order.items.reduce((s,i)=>s+i.total_price,0),order.currency)}</strong></div>
      ${order.discount_amount? `<div><span>Rabatt</span><strong>−${money(order.discount_amount,order.currency)}</strong></div>`:''}
      ${order.shipping_cost? `<div><span>Frakt</span><strong>${money(order.shipping_cost,order.currency)}</strong></div>`:''}
      ${order.tax_amount? `<div><span>Avgift/IVA</span><strong>${money(order.tax_amount,order.currency)}</strong></div>`:''}
      <div class="grand"><span>Total</span><strong>${money(order.total_amount,order.currency)}</strong></div>
    </div>`;
  const invoiceWarning=isInvoice&&!ready?`<div class="warning"><strong>FAKTURAUTKAST – IKKE KLAR FOR UTSENDELSE</strong><br>Selgers juridiske navn, NIF/CIF og full adresse må fylles inn i Olivia før dokumentet brukes som faktura.</div>`:'';
  const payment=isInvoice&&ready?`<section><h3>Betaling</h3><p>Forfall: ${esc(invoice?.due_date||'—')}<br>IBAN: ${esc(settings?.iban||'—')}<br>Status: ${esc(invoice?.payment_status||invoice?.status||'—')}</p></section>`:'';
  const shipmentBlock=shipment?`<section><h3>Forsendelse</h3><p>Transportør: ${esc(shipment.carrier||'—')}<br>Sporing: ${esc(shipment.tracking_number||'—')}<br>Status: ${esc(shipment.status)}</p></section>`:'';

  const html=`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} ${esc(order.order_number)}</title><style>
  @page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172018;margin:0;font-size:12px;line-height:1.5}.top{display:flex;justify-content:space-between;gap:30px;border-bottom:2px solid #172018;padding-bottom:18px}.brand{font-size:28px;font-weight:800}.muted{color:#657067}.doc{text-align:right}.doc h1{font-size:24px;margin:0 0 5px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:25px;margin:25px 0}h3{font-size:11px;text-transform:uppercase;letter-spacing:.12em;margin:0 0 7px;color:#657067}p{margin:0}table{width:100%;border-collapse:collapse;margin-top:20px}th{font-size:10px;text-transform:uppercase;letter-spacing:.08em;text-align:left;border-bottom:1px solid #ccd3cd;padding:8px 6px}td{border-bottom:1px solid #e7ebe8;padding:10px 6px;vertical-align:top}.num{text-align:right}.totals{margin:22px 0 0 auto;width:290px}.totals div{display:flex;justify-content:space-between;padding:5px}.totals .grand{border-top:2px solid #172018;margin-top:5px;padding-top:10px;font-size:15px}.warning{margin:18px 0;padding:12px;border:2px solid #a33;background:#fff2f2;color:#7d1c1c}.footer{margin-top:35px;padding-top:15px;border-top:1px solid #ccd3cd;color:#657067;font-size:10px}.actions{position:fixed;right:15px;top:15px}@media print{.actions{display:none}}button{background:#172018;color:white;border:0;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}</style></head><body>
  <button class="actions" onclick="window.print()">Skriv ut / lagre PDF</button>
  <div class="top"><div><div class="brand">Doña Anna</div><div class="muted">Premium olivenprodukter fra Biar</div><p style="margin-top:10px"><strong>${esc(sellerName)}</strong><br>${esc(sellerAddress||'Biar · Alicante')}<br>${settings?.tax_id?`NIF/CIF: ${esc(settings.tax_id)}<br>`:''}${esc(settings?.email||'')}</p></div><div class="doc"><h1>${esc(title)}</h1><p>${isInvoice?`Nr. ${esc(invoice?.invoice_number||'—')}<br>`:''}Ordre ${esc(order.order_number)}<br>Dato ${date(isInvoice?invoice?.issue_date:order.ordered_at)}</p></div></div>
  ${invoiceWarning}
  <div class="grid"><section><h3>Kunde</h3><p><strong>${esc(customerName)}</strong><br>${esc(customer?.contact_name||'')}<br>${esc(billing)}<br>${customer?.tax_id||customer?.vat_number?`NIF/VAT: ${esc(customer.tax_id||customer.vat_number)}<br>`:''}${esc(customer?.email||'')}</p></section><section><h3>Levering</h3><p>${esc(shipping||'—')}</p></section></div>
  <table><thead><tr><th>Produkt</th><th>Lot</th><th class="num">Antall</th>${type==='packing_slip'?'':'<th class="num">Enhetspris</th><th class="num">IVA</th><th class="num">Sum</th>'}</tr></thead><tbody>${rows}</tbody></table>
  ${financial}<div class="grid">${shipmentBlock}${payment}</div>
  ${settings?.invoice_notes&&isInvoice?`<p>${esc(settings.invoice_notes)}</p>`:''}
  <div class="footer">Doña Anna · Biar, Alicante · Dokument generert fra Olivia OS. Lot-koder følger den faktiske pakkeloten som er knyttet til ordren.</div>
  <script>setTimeout(()=>window.print(),250)</script></body></html>`;
  const win=window.open('','_blank','noopener,noreferrer');
  if(!win) throw new Error('Nettleseren blokkerte dokumentvinduet. Tillat popup-vinduer for Olivia.');
  win.document.open();win.document.write(html);win.document.close();
}
