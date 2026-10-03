import React,{useEffect,useState}from'react';
import{CheckCircle2,Save,TriangleAlert}from'lucide-react';
import{saveCommerceBusinessSettings,type CommerceBusinessSettings}from'../services/commerceInventory';
import{sellerIsInvoiceReady}from'../services/commerceDocuments';

const field='w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/50';
const empty:CommerceBusinessSettings={id:'default',display_name:'Doña Anna',legal_name:'',tax_id:'',address:'',postal_code:'',city:'Biar',province:'Alicante',country:'España',email:'',phone:'',iban:'',invoice_prefix:'INV',invoice_notes:'',default_payment_terms_days:0};

const CommerceBusinessSettingsPanel:React.FC<{value:CommerceBusinessSettings|null;onChanged:()=>Promise<void>|void}>=({value,onChanged})=>{
 const[draft,setDraft]=useState<CommerceBusinessSettings>(value||empty),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>setDraft(value||empty),[value]);
 const set=(key:keyof CommerceBusinessSettings,v:string|number)=>setDraft(d=>({...d,[key]:v}));
 const ready=sellerIsInvoiceReady(draft);
 const save=async()=>{setSaving(true);setMessage('');try{await saveCommerceBusinessSettings(draft);await onChanged();setMessage('Fakturainnstillinger lagret.');}catch(e:any){setMessage(e?.message||'Kunne ikke lagre.');}finally{setSaving(false);}};
 return <details className="rounded-2xl border border-white/10 bg-black/20 p-4">
  <summary className="cursor-pointer list-none flex items-center justify-between gap-3"><div><p className="text-sm font-black text-white">Fakturainnstillinger</p><p className="text-[11px] text-slate-500">Selgeropplysninger brukes på faktura og PDF.</p></div>{ready?<span className="text-xs font-bold text-green-400 flex items-center gap-1"><CheckCircle2 size={14}/>Klar</span>:<span className="text-xs font-bold text-amber-300 flex items-center gap-1"><TriangleAlert size={14}/>Mangler juridiske data</span>}</summary>
  <div className="mt-4 grid gap-3 md:grid-cols-2">
   <input className={field} placeholder="Juridisk navn / autónomo" value={draft.legal_name} onChange={e=>set('legal_name',e.target.value)}/>
   <input className={field} placeholder="NIF/CIF" value={draft.tax_id} onChange={e=>set('tax_id',e.target.value)}/>
   <input className={field} placeholder="Gateadresse" value={draft.address} onChange={e=>set('address',e.target.value)}/>
   <div className="grid grid-cols-[110px_1fr] gap-2"><input className={field} placeholder="Postnr." value={draft.postal_code} onChange={e=>set('postal_code',e.target.value)}/><input className={field} placeholder="By" value={draft.city} onChange={e=>set('city',e.target.value)}/></div>
   <input className={field} placeholder="E-post" value={draft.email} onChange={e=>set('email',e.target.value)}/>
   <input className={field} placeholder="Telefon" value={draft.phone} onChange={e=>set('phone',e.target.value)}/>
   <input className={field+' md:col-span-2'} placeholder="IBAN" value={draft.iban} onChange={e=>set('iban',e.target.value)}/>
   <label className="text-xs text-slate-400 md:col-span-2">Standard betalingsfrist (dager)
    <input type="number" min="0" max="180" className={field+' mt-1'} value={draft.default_payment_terms_days} onChange={e=>set('default_payment_terms_days',Math.max(0,Math.min(180,Number(e.target.value)||0)))}/>
    <span className="mt-1 block text-[10px] text-slate-500">0 = betaling med en gang. Kundespesifikk frist kan overstyre denne.</span>
   </label>
  </div>
  {!ready&&<p className="mt-3 text-xs text-amber-300">Inntil juridisk navn, NIF/CIF og adresse er fylt inn, genererer Olivia bare et tydelig merket fakturautkast – ikke en ferdig faktura.</p>}
  {message&&<p className="mt-3 text-xs text-slate-300">{message}</p>}
  <button disabled={saving} onClick={save} className="mt-4 rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-black disabled:opacity-40 flex items-center gap-2"><Save size={14}/>{saving?'Lagrer…':'Lagre fakturadata'}</button>
 </details>;
};
export default CommerceBusinessSettingsPanel;
