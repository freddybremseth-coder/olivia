import { isSupabaseConfigured, supabase } from './supabaseClient';

export type CommercialReadinessIssue = {
  id: string;
  severity: 'critical'|'warning'|'info';
  area: 'product'|'invoice'|'inventory'|'customer';
  title: string;
  detail: string;
  productId?: string;
};

export type CommercialReadiness = {
  ready: boolean;
  issues: CommercialReadinessIssue[];
  productCount: number;
  productsReady: number;
  sellerReady: boolean;
  inventoryVerified: number;
};

export async function fetchCommercialReadiness(): Promise<CommercialReadiness> {
  if (!isSupabaseConfigured) return { ready:false, issues:[], productCount:0, productsReady:0, sellerReady:false, inventoryVerified:0 };

  const [productsRes, settingsRes] = await Promise.all([
    supabase.from('commerce_products')
      .select('id,name,sku,active,status,price_b2b,vat_rate,vat_configured,price_basis,inventory_verified,stock_quantity,cost,cost_configured')
      .eq('active',true)
      .order('name'),
    supabase.from('commerce_business_settings').select('legal_name,tax_id,address,city,iban').eq('id','default').maybeSingle(),
  ]);
  const error=productsRes.error||settingsRes.error;
  if(error) throw error;

  const products=productsRes.data||[];
  const settings=settingsRes.data;
  const issues:CommercialReadinessIssue[]=[];

  for(const product of products as any[]){
    if(!Number(product.price_b2b||0)) issues.push({
      id:'product-price-'+product.id,severity:'critical',area:'product',productId:product.id,
      title:'B2B-pris mangler: '+product.name,detail:'Produktet kan ikke bestilles i B2B-portalen før B2B-prisen er satt.'
    });
    if(!product.vat_configured||!product.price_basis) issues.push({
      id:'product-vat-'+product.id,severity:'critical',area:'product',productId:product.id,
      title:'IVA må bekreftes: '+product.name,detail:'Sett IVA-sats og bekreft om prisen er inkl. eller ekskl. IVA.'
    });
    if(!product.inventory_verified) issues.push({
      id:'product-stock-'+product.id,severity:'warning',area:'inventory',productId:product.id,
      title:'Lager ikke fysisk bekreftet: '+product.name,detail:'Produktet er ikke salgbart før fysisk lager er bekreftet eller ny pakkelot er produsert.'
    });
    if(!product.cost_configured) issues.push({
      id:'product-cost-'+product.id,severity:'warning',area:'product',productId:product.id,
      title:'Kostpris mangler: '+product.name,detail:'Olivia kan selge produktet når pris/IVA/lager er klart, men bruttomargin vises som ukjent til kost per enhet er dokumentert.'
    });
  }

  const sellerReady=Boolean(settings?.legal_name?.trim()&&settings?.tax_id?.trim()&&settings?.address?.trim()&&settings?.city?.trim());
  if(!sellerReady) issues.push({
    id:'seller-invoice-setup',severity:'critical',area:'invoice',
    title:'Fakturaoppsettet er ikke komplett',detail:'Juridisk navn, NIF/CIF og full adresse må fylles inn før Olivia lager ferdig faktura.'
  });
  if(sellerReady&&!settings?.iban?.trim()) issues.push({
    id:'seller-iban',severity:'warning',area:'invoice',
    title:'IBAN mangler',detail:'Faktura kan lages, men bankbetaling mangler IBAN.'
  });

  const readyProductIds=new Set(products.map((p:any)=>p.id));
  for(const issue of issues.filter(i=>i.area==='product'&&i.productId)) readyProductIds.delete(issue.productId!);

  return {
    ready:issues.every(i=>i.severity!=='critical'),
    issues,
    productCount:products.length,
    productsReady:readyProductIds.size,
    sellerReady,
    inventoryVerified:products.filter((p:any)=>p.inventory_verified).length,
  };
}
