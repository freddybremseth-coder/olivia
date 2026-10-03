import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, History, Loader2, PackageCheck,
  RefreshCcw, ShoppingBag, ShieldAlert, Truck, WalletCards
} from 'lucide-react';
import {
  fetchUnifiedInventory,
  verifyPhysicalInventory,
  type UnifiedInventoryMovement,
  type UnifiedInventoryProduct,
  type CommerceBusinessSettings,
  type UnifiedInvoiceRow,
  type UnifiedOrderRow,
  type UnifiedShipmentRow,
  type UnifiedProductLot,
} from '../services/commerceInventory';
import OrderFulfillmentPanel from './OrderFulfillmentPanel';
import CommerceBusinessSettingsPanel from './CommerceBusinessSettingsPanel';

const eur = (value: number) => `€${value.toLocaleString('no-NO', { maximumFractionDigits: 2 })}`;

function movementLabel(type: string) {
  const labels: Record<string,string> = {
    opening_balance: 'Åpningsbeholdning',
    physical_count_adjustment: 'Fysisk opptelling',
    production: 'Produksjon/pakking',
    reservation: 'Reservert til ordre',
    release: 'Reservasjon frigitt',
    sale: 'Sendt/solgt',
    return: 'Retur',
    adjustment: 'Justering',
  };
  return labels[type] || type;
}

const DonaAnnaSalesInventoryOliviaView: React.FC = () => {
  const [products,setProducts]=useState<UnifiedInventoryProduct[]>([]);
  const [movements,setMovements]=useState<UnifiedInventoryMovement[]>([]);
  const [lots,setLots]=useState<UnifiedProductLot[]>([]);
  const [orders,setOrders]=useState<UnifiedOrderRow[]>([]);
  const [invoices,setInvoices]=useState<UnifiedInvoiceRow[]>([]);
  const [shipments,setShipments]=useState<UnifiedShipmentRow[]>([]);
  const [businessSettings,setBusinessSettings]=useState<CommerceBusinessSettings|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [countingId,setCountingId]=useState<string|null>(null);
  const [countValue,setCountValue]=useState('');
  const [savingCount,setSavingCount]=useState(false);

  const load=async()=>{
    setLoading(true); setError('');
    try{
      const data=await fetchUnifiedInventory();
      setProducts(data.products); setMovements(data.movements); setLots(data.lots); setOrders(data.orders); setInvoices(data.invoices); setShipments(data.shipments); setBusinessSettings(data.businessSettings);
    }catch(err:any){ setError(err?.message || 'Kunne ikke hente lagerdata.'); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{load();},[]);

  const stats=useMemo(()=>{
    const onHand=products.reduce((a,p)=>a+p.stock_quantity,0);
    const reserved=products.reduce((a,p)=>a+p.reserved_quantity,0);
    const available=products.reduce((a,p)=>a+Math.max(p.stock_quantity-p.reserved_quantity,0),0);
    const verified=products.filter(p=>p.inventory_verified).length;
    const realOrders=orders.filter(o=>o.status.toLowerCase()!=='test');
    const paid=realOrders.filter(o=>/paid|betalt/i.test(o.payment_status)).reduce((a,o)=>a+o.total_amount,0);
    return {onHand,reserved,available,verified,paid,realOrders:realOrders.length};
  },[products,orders]);

  const saveCount=async(product:UnifiedInventoryProduct)=>{
    const value=Number(countValue.replace(',','.'));
    if(!Number.isFinite(value)||value<0){setError('Skriv inn faktisk antall enheter på lager.');return;}
    setSavingCount(true);setError('');
    try{
      await verifyPhysicalInventory(product.id,value);
      setCountingId(null);setCountValue('');
      await load();
    }catch(err:any){setError(err?.message||'Kunne ikke lagre fysisk opptelling.');}
    finally{setSavingCount(false);}
  };

  return <div className="space-y-7 animate-in fade-in duration-500 pb-24">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-3xl font-black text-white flex items-center gap-3"><ShoppingBag className="text-green-400"/> Salg og lager</h2>
        <p className="text-sm text-slate-400 mt-1">Én sannhetskilde: B2B, ordre, fysisk lager og sporbarhet fra commerce-systemet.</p>
      </div>
      <button onClick={load} className="p-3.5 rounded-2xl border border-white/10 bg-white/5 text-green-400">
        {loading?<Loader2 size={18} className="animate-spin"/>:<RefreshCcw size={18}/>}
      </button>
    </div>

    {error&&<div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100 text-sm flex gap-2"><AlertTriangle size={18}/>{error}</div>}

    {products.some(p=>!p.inventory_verified)&&<div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5 flex gap-4">
      <ShieldAlert className="text-amber-400 shrink-0"/>
      <div><p className="font-bold text-amber-100">Eksisterende lagertall er migrerte beholdninger – ikke fysisk bekreftet.</p>
      <p className="text-xs text-amber-200/70 mt-1">Ingen tall er slettet. Bruk «Bekreft fysisk lager» per produkt når dere teller. Differansen blir lagret som egen lagerbevegelse, slik at historikken beholdes.</p></div>
    </div>}

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {[
        ['På lager',stats.onHand,<PackageCheck size={18}/>],
        ['Reservert',stats.reserved,<ClipboardCheck size={18}/>],
        ['Tilgjengelig',stats.available,<Truck size={18}/>],
        ['Verifisert',`${stats.verified}/${products.length}`,<CheckCircle2 size={18}/>],
        ['Reelle ordre',stats.realOrders,<ShoppingBag size={18}/>],
        ['Betalt',eur(stats.paid),<WalletCards size={18}/>],
      ].map(([label,value,icon])=><div key={String(label)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="text-green-400 mb-2">{icon}</div><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{label}</p>
        <p className="text-2xl font-black text-white mt-1">{value}</p>
      </div>)}
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-sm font-bold text-white mb-4">Produkter og fysisk lager</h3>
        <div className="space-y-3">
          {products.map(product=>{
            const available=Math.max(product.stock_quantity-product.reserved_quantity,0);
            return <div key={product.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex justify-between gap-4">
                <div><p className="font-bold text-white">{product.name}</p><p className="text-xs text-slate-500 mt-1">{product.sku} · {product.size||'—'} · {product.category||'Produkt'}</p></div>
                <div className="text-right"><p className="text-[10px] uppercase tracking-widest text-slate-500">Tilgjengelig</p><p className="text-2xl font-black text-white">{available}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="rounded-xl bg-white/5 p-2"><p className="text-[9px] uppercase text-slate-500">På lager</p><p className="font-bold text-white">{product.stock_quantity}</p></div>
                <div className="rounded-xl bg-white/5 p-2"><p className="text-[9px] uppercase text-slate-500">Reservert</p><p className="font-bold text-white">{product.reserved_quantity}</p></div>
                <div className="rounded-xl bg-white/5 p-2"><p className="text-[9px] uppercase text-slate-500">Status</p><p className={`font-bold ${product.inventory_verified?'text-green-400':'text-amber-400'}`}>{product.inventory_verified?'Bekreftet':'Må telles'}</p></div>
              </div>
              {countingId===product.id?<div className="flex gap-2 mt-3">
                <input autoFocus type="number" min="0" value={countValue} onChange={e=>setCountValue(e.target.value)} placeholder="Faktisk antall" className="min-w-0 flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-white"/>
                <button disabled={savingCount} onClick={()=>saveCount(product)} className="rounded-xl bg-green-500 px-4 py-2 text-black font-bold">{savingCount?'Lagrer…':'Bekreft'}</button>
                <button onClick={()=>setCountingId(null)} className="rounded-xl border border-white/10 px-3 py-2 text-slate-300">Avbryt</button>
              </div>:<button onClick={()=>{setCountingId(product.id);setCountValue(String(product.stock_quantity));}} className="mt-3 text-xs font-bold text-green-400 hover:text-green-300">Bekreft fysisk lager</button>}
            </div>
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="space-y-4">
          <CommerceBusinessSettingsPanel value={businessSettings} onChanged={load} />
          <OrderFulfillmentPanel orders={orders} lots={lots} movements={movements} invoices={invoices} shipments={shipments} businessSettings={businessSettings} onChanged={load} />
        </div>
      </section>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><History size={16}/> Lagerhistorikk</h3>
        <div className="space-y-2">
          {movements.slice(0,20).map(m=>{
            const product=products.find(p=>p.id===m.product_id);
            return <div key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-3 flex justify-between gap-3">
              <div><p className="text-sm font-bold text-white">{product?.name||m.product_id}</p><p className="text-[11px] text-slate-500">{movementLabel(m.movement_type)} · {new Date(m.occurred_at).toLocaleDateString('no-NO')}{!m.verified?' · ikke fysisk bekreftet':''}</p></div>
              <div className="text-right text-xs"><p className={m.on_hand_delta<0?'text-red-300':'text-green-300'}>{m.on_hand_delta? `${m.on_hand_delta>0?'+':''}${m.on_hand_delta} lager`:'—'}</p>{m.reserved_delta!==0&&<p className="text-purple-300">{m.reserved_delta>0?'+':''}{m.reserved_delta} reservert</p>}</div>
            </div>
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <h3 className="text-sm font-bold text-white mb-4">Produktbatcher / pakkelot</h3>
        <p className="text-xs text-slate-500 mb-4">Pakkelot kobler ferdig produkt til én eller flere høstebatcher. Det er denne koblingen som senere følger QR-sporbarheten helt frem til kunden.</p>
        {lots.length?<div className="space-y-2">{lots.map(lot=>{
          const product=products.find(p=>p.id===lot.product_id);
          return <div key={lot.id} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="font-bold text-white">{lot.lot_code}</p><p className="text-xs text-slate-500 mt-1">{product?.name||lot.product_id} · {lot.initial_units} enheter · {lot.status}</p></div>
        })}</div>:<div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">Ingen ekte pakkelot er opprettet ennå. Det er korrekt: de historiske høsteradene og dagens produktlager skal ikke automatisk kobles sammen uten faktisk produksjons-/pakkedokumentasjon.</div>}
      </section>
    </div>
  </div>;
};

export default DonaAnnaSalesInventoryOliviaView;
