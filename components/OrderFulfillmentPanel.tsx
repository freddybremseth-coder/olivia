import React,{useMemo,useState}from'react';
import{CheckCircle2,CreditCard,FileText,Loader2,PackageCheck,Send,Truck}from'lucide-react';
import{
  assignOrderItemLot,createInvoiceForOrder,markCommerceInvoicePaid,updateCommerceOrderStatus,
  type UnifiedInventoryMovement,type UnifiedInvoiceRow,type UnifiedOrderRow,type UnifiedProductLot
}from'../services/commerceInventory';

const eur=(n:number)=>'€'+n.toLocaleString('no-NO',{minimumFractionDigits:2,maximumFractionDigits:2});
const input='w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500/50';

const OrderFulfillmentPanel:React.FC<{
 orders:UnifiedOrderRow[];lots:UnifiedProductLot[];movements:UnifiedInventoryMovement[];invoices:UnifiedInvoiceRow[];onChanged:()=>Promise<void>|void;
}>=({orders,lots,movements,invoices,onChanged})=>{
 const [busy,setBusy]=useState(''),[error,setError]=useState('');
 const real=orders.filter(o=>o.status.toLowerCase()!=='test'&&o.total_amount>0);
 const lotBalance=useMemo(()=>new Map(lots.map(lot=>{
   const rows=movements.filter(m=>m.lot_id===lot.id);
   const onHand=rows.reduce((s,m)=>s+m.on_hand_delta,0);
   const reserved=rows.reduce((s,m)=>s+m.reserved_delta,0);
   return[lot.id,{onHand,reserved,available:onHand-reserved}];
 })),[lots,movements]);
 const act=async(key:string,fn:()=>Promise<unknown>)=>{setBusy(key);setError('');try{await fn();await onChanged();}catch(e:any){setError(e?.message||'Handlingen kunne ikke fullføres.');}finally{setBusy('');}};
 if(!real.length)return <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"><h3 className="font-black text-white flex items-center gap-2"><Truck size={18}/> Ordre til plukk og fakturering</h3><p className="text-sm text-slate-500 mt-3">Ingen reelle ordre å behandle ennå. Testordrer holdes utenfor lager, faktura og inntekt.</p></div>;

 return <div className="space-y-4">
  <div><h3 className="font-black text-white flex items-center gap-2"><Truck size={18}/> Ordre til plukk og fakturering</h3><p className="text-xs text-slate-500 mt-1">Koble hver ordrelinje til faktisk pakkelot før sending. Da følger lageruttak og sporbarhet riktig lot helt til kunden.</p></div>
  {error&&<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>}
  {real.map(order=>{
   const invoice=invoices.find(i=>i.order_id===order.id);
   const allocated=order.items.length>0&&order.items.every(i=>!!i.lot_id);
   const sent=/sendt|shipped|levert|delivered/i.test(order.status);
   return <div key={order.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3"><div><p className="text-lg font-black text-white">{order.order_number}</p><p className="text-xs text-slate-500 mt-1">{order.customer_name||'Kunde'} · {order.status} · {order.payment_status}</p></div><p className="text-xl font-black text-white">{eur(order.total_amount)}</p></div>
    <div className="space-y-3 mt-4">{order.items.map(item=>{
      const eligible=lots.filter(l=>l.product_id===item.product_id&&l.status==='active');
      const selected=item.lot_id?lots.find(l=>l.id===item.lot_id):undefined;
      return <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="flex justify-between gap-3"><div><p className="text-sm font-bold text-white">{item.quantity} × {item.name}</p><p className="text-[11px] text-slate-500">{item.sku||item.product_id||'Produkt'}</p></div>{selected&&<span className="text-xs font-bold text-green-400 flex items-center gap-1"><PackageCheck size={14}/>{selected.lot_code}</span>}</div>
      {!sent&&<div className="mt-3 flex gap-2"><select defaultValue={item.lot_id||''} id={'lot-'+item.id} className={input}><option value="">Velg pakkelot</option>{eligible.map(l=>{const b=lotBalance.get(l.id);return <option key={l.id} value={l.id}>{l.lot_code} · {Math.max(0,b?.available||0)} tilgjengelig</option>})}</select><button disabled={busy===item.id} onClick={()=>{const el=document.getElementById('lot-'+item.id) as HTMLSelectElement|null;const lotId=el?.value;if(lotId)act(item.id,()=>assignOrderItemLot(item.id,lotId));}} className="rounded-xl bg-white/10 px-3 text-xs font-bold text-white disabled:opacity-40">{busy===item.id?<Loader2 size={15} className="animate-spin"/>:'Koble'}</button></div>}
      </div>;
    })}</div>
    <div className="flex flex-wrap gap-2 mt-4">
      {!sent&&<button disabled={!allocated||busy===order.id} onClick={()=>act(order.id,()=>updateCommerceOrderStatus(order.id,'Sendt'))} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black disabled:opacity-35 flex items-center gap-1"><Send size={14}/> Marker sendt</button>}
      {!invoice&&<button disabled={busy==='inv-'+order.id} onClick={()=>act('inv-'+order.id,()=>createInvoiceForOrder(order.id))} className="rounded-xl bg-blue-500/15 px-3 py-2 text-xs font-bold text-blue-300 flex items-center gap-1"><FileText size={14}/> Opprett faktura</button>}
      {invoice&&<span className="rounded-xl bg-white/5 px-3 py-2 text-xs text-slate-300 flex items-center gap-1"><FileText size={14}/>{invoice.invoice_number} · {invoice.status}</span>}
      {invoice&&!/betalt|paid/i.test(invoice.payment_status+' '+invoice.status)&&<button disabled={busy==='paid-'+invoice.id} onClick={()=>act('paid-'+invoice.id,()=>markCommerceInvoicePaid(invoice.id))} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-black flex items-center gap-1"><CreditCard size={14}/> Registrer betalt</button>}
      {invoice&&/betalt|paid/i.test(invoice.payment_status+' '+invoice.status)&&<span className="rounded-xl bg-green-500/10 px-3 py-2 text-xs font-bold text-green-300 flex items-center gap-1"><CheckCircle2 size={14}/> Betalt · inntekt bokført</span>}
    </div>
    {!allocated&&!sent&&<p className="text-[10px] text-amber-400 mt-3">Sending er låst til alle ordrelinjer er koblet til en faktisk pakkelot.</p>}
   </div>;
  })}
 </div>;
};
export default OrderFulfillmentPanel;
