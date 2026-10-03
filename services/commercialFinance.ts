import { isSupabaseConfigured, supabase } from './supabaseClient';

export type AgingBucket = {
  id: 'not_due'|'1_30'|'31_60'|'61_90'|'90_plus';
  label: string;
  amount: number;
  invoices: number;
};

export type CommercialMarginRow = {
  orderId: string;
  orderNumber: string;
  customerName: string;
  orderedAt?: string;
  netRevenue: number;
  documentedCost?: number;
  grossMargin?: number;
  grossMarginPct?: number;
  costComplete: boolean;
  missingCostProducts: string[];
};

export type CommercialFinanceSnapshot = {
  openReceivables: number;
  overdueReceivables: number;
  paidInvoices: number;
  unpaidInvoices: number;
  aging: AgingBucket[];
  margins: CommercialMarginRow[];
  documentedNetRevenue: number;
  documentedCost: number;
  documentedGrossMargin: number;
  documentedGrossMarginPct?: number;
  ordersWithDocumentedCost: number;
  ordersMissingCost: number;
};

const num=(v:unknown)=>Number(v||0);
const isPaid=(status?:string,paymentStatus?:string)=>/betalt|paid/i.test((status||'')+' '+(paymentStatus||''));
const customerName=(row:any)=>row.customer_name||row.commerce_customers?.company||row.commerce_customers?.contact_name||'Kunde';

export async function fetchCommercialFinanceSnapshot(): Promise<CommercialFinanceSnapshot> {
  const empty:CommercialFinanceSnapshot={
    openReceivables:0,overdueReceivables:0,paidInvoices:0,unpaidInvoices:0,
    aging:[
      {id:'not_due',label:'Ikke forfalt',amount:0,invoices:0},
      {id:'1_30',label:'1–30 dager',amount:0,invoices:0},
      {id:'31_60',label:'31–60 dager',amount:0,invoices:0},
      {id:'61_90',label:'61–90 dager',amount:0,invoices:0},
      {id:'90_plus',label:'Over 90 dager',amount:0,invoices:0},
    ],
    margins:[],documentedNetRevenue:0,documentedCost:0,documentedGrossMargin:0,
    ordersWithDocumentedCost:0,ordersMissingCost:0,
  };
  if(!isSupabaseConfigured)return empty;

  const [invoicesRes,ordersRes,productsRes,lotCostRes]=await Promise.all([
    supabase.from('commerce_invoices')
      .select('id,invoice_number,order_id,customer_id,customer_name,status,payment_status,total_amount,due_date,paid_date,created_at')
      .order('created_at',{ascending:false}),
    supabase.from('commerce_orders')
      .select('id,order_number,customer_name,status,payment_status,subtotal,total_amount,ordered_at,commerce_customers(company,contact_name),commerce_order_items(id,product_id,lot_id,name,quantity,total_price)')
      .order('ordered_at',{ascending:false}),
    supabase.from('commerce_products')
      .select('id,name,cost,cost_configured,cost_source,cost_updated_at'),
    supabase.from('product_lot_cost_summary')
      .select('lot_id,lot_code,documented_unit_cost,cost_complete'),
  ]);
  const error=invoicesRes.error||ordersRes.error||productsRes.error||lotCostRes.error;
  if(error)throw error;

  const aging:Record<AgingBucket['id'],AgingBucket>={
    not_due:{id:'not_due',label:'Ikke forfalt',amount:0,invoices:0},
    '1_30':{id:'1_30',label:'1–30 dager',amount:0,invoices:0},
    '31_60':{id:'31_60',label:'31–60 dager',amount:0,invoices:0},
    '61_90':{id:'61_90',label:'61–90 dager',amount:0,invoices:0},
    '90_plus':{id:'90_plus',label:'Over 90 dager',amount:0,invoices:0},
  };
  let openReceivables=0,overdueReceivables=0,paidInvoices=0,unpaidInvoices=0;
  const now=new Date();
  now.setHours(0,0,0,0);

  for(const inv of invoicesRes.data||[]){
    const total=num((inv as any).total_amount);
    if(total<=0)continue;
    if(isPaid((inv as any).status,(inv as any).payment_status)){paidInvoices+=1;continue;}
    unpaidInvoices+=1;
    openReceivables+=total;
    const dueRaw=String((inv as any).due_date||'');
    const due=/^\d{4}-\d{2}-\d{2}$/.test(dueRaw)?new Date(dueRaw+'T00:00:00'):null;
    let bucket:AgingBucket['id']='not_due';
    if(due){
      const diff=Math.floor((now.getTime()-due.getTime())/86400000);
      if(diff>0){
        overdueReceivables+=total;
        if(diff<=30)bucket='1_30';
        else if(diff<=60)bucket='31_60';
        else if(diff<=90)bucket='61_90';
        else bucket='90_plus';
      }
    }
    aging[bucket].amount+=total;
    aging[bucket].invoices+=1;
  }

  const products=new Map((productsRes.data||[]).map((p:any)=>[p.id,p]));
  const lotCosts=new Map((lotCostRes.data||[]).map((l:any)=>[l.lot_id,l]));
  const margins:CommercialMarginRow[]=[];
  for(const order of ordersRes.data||[]){
    if(String((order as any).status||'').toLowerCase()==='test'||num((order as any).total_amount)<=0)continue;
    const items=Array.isArray((order as any).commerce_order_items)?(order as any).commerce_order_items:[];
    if(!items.length)continue;
    const missing:string[]=[];
    let documentedCost=0;
    for(const item of items){
      const product=products.get(item.product_id) as any;
      const lot=item.lot_id?lotCosts.get(item.lot_id) as any:undefined;
      if(lot?.cost_complete&&lot.documented_unit_cost!=null){
        documentedCost+=num(lot.documented_unit_cost)*num(item.quantity);
        continue;
      }
      if(product?.cost_configured){
        documentedCost+=num(product.cost)*num(item.quantity);
        continue;
      }
      missing.push(item.name||product?.name||item.product_id||'Produkt');
    }
    const netRevenue=num((order as any).subtotal)||items.reduce((s:number,i:any)=>s+num(i.total_price),0);
    const complete=missing.length===0;
    const grossMargin=complete?netRevenue-documentedCost:undefined;
    const grossMarginPct=complete&&netRevenue>0?Math.round(((grossMargin||0)/netRevenue)*1000)/10:undefined;
    margins.push({
      orderId:(order as any).id,
      orderNumber:(order as any).order_number,
      customerName:customerName(order),
      orderedAt:(order as any).ordered_at,
      netRevenue,
      documentedCost:complete?documentedCost:undefined,
      grossMargin,
      grossMarginPct,
      costComplete:complete,
      missingCostProducts:Array.from(new Set(missing)),
    });
  }

  const documented=margins.filter(r=>r.costComplete);
  const documentedNetRevenue=documented.reduce((s,r)=>s+r.netRevenue,0);
  const documentedCost=documented.reduce((s,r)=>s+(r.documentedCost||0),0);
  const documentedGrossMargin=documentedNetRevenue-documentedCost;

  return {
    openReceivables,overdueReceivables,paidInvoices,unpaidInvoices,
    aging:Object.values(aging),
    margins,
    documentedNetRevenue,
    documentedCost,
    documentedGrossMargin,
    documentedGrossMarginPct:documentedNetRevenue>0?Math.round((documentedGrossMargin/documentedNetRevenue)*1000)/10:undefined,
    ordersWithDocumentedCost:documented.length,
    ordersMissingCost:margins.length-documented.length,
  };
}
