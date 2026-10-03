import React,{useEffect,useMemo,useState}from'react';
import{CheckCircle2,Clipboard,Loader2,Mail,MessageSquare,RefreshCcw,Save,Send,Trash2}from'lucide-react';
import{
  approvePaymentReminder,cancelPaymentReminder,fetchPaymentReminders,
  markPaymentReminderExternalSent,savePaymentReminderDraft,sendPaymentReminderToPortal,
  type PaymentReminder
}from'../services/paymentReminders';

const field='w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/50';
const money=(n:number,c='EUR')=>new Intl.NumberFormat('nb-NO',{style:'currency',currency:c}).format(n||0);

const PaymentReminderPanel:React.FC=()=>{
 const[rows,setRows]=useState<PaymentReminder[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const[filter,setFilter]=useState<'open'|'sent'|'cancelled'>('open');
 const[drafts,setDrafts]=useState<Record<string,{subject:string;body:string;email:string}>>({});

 const load=async()=>{setLoading(true);setError('');try{const data=await fetchPaymentReminders();setRows(data);setDrafts(Object.fromEntries(data.map(r=>[r.id,{subject:r.subject,body:r.body,email:r.recipient_email||r.customer?.email||''}])));}catch(e:any){setError(e?.message||'Kunne ikke hente betalingsoppfølging.');}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);

 const visible=useMemo(()=>rows.filter(r=>filter==='open'?['draft','approved'].includes(r.status):r.status===filter),[rows,filter]);
 const act=async(key:string,fn:()=>Promise<unknown>)=>{setBusy(key);setError('');try{await fn();await load();}catch(e:any){setError(e?.message||'Handlingen kunne ikke fullføres.');}finally{setBusy('');}};
 const copy=async(r:PaymentReminder)=>{const d=drafts[r.id]||{subject:r.subject,body:r.body,email:r.recipient_email||''};await navigator.clipboard.writeText('Til: '+(d.email||'')+'\nEmne: '+d.subject+'\n\n'+d.body);};

 return <div className="space-y-5">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
   <div><p className="text-[10px] uppercase tracking-[0.24em] font-black text-amber-300">Betalingsoppfølging</p><h3 className="text-2xl font-black text-white mt-1">Utkast → godkjenn → send</h3><p className="text-sm text-slate-500 mt-2">Olivia oppretter utkast fra faktiske forfallsdatoer, men sender aldri automatisk. Kundeportal kan sendes her; e-post kopieres for ekstern sending og må deretter markeres sendt.</p></div>
   <button onClick={load} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white flex items-center gap-2">{loading?<Loader2 size={15} className="animate-spin"/>:<RefreshCcw size={15}/>}Oppdater</button>
  </div>

  <div className="flex flex-wrap gap-2">
   {([['open','Åpne'],['sent','Sendt'],['cancelled','Avbrutt']] as const).map(([id,label])=><button key={id} onClick={()=>setFilter(id)} className={"rounded-xl px-3 py-2 text-xs font-bold "+(filter===id?'bg-amber-300 text-black':'bg-white/5 text-slate-300')}>{label}</button>)}
  </div>

  {error&&<div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div>}
  {!loading&&visible.length===0&&<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-500">Ingen påminnelser i denne kategorien.</div>}

  <div className="space-y-4">{visible.map(r=>{
   const d=drafts[r.id]||{subject:r.subject,body:r.body,email:r.recipient_email||r.customer?.email||''};
   const customer=r.customer?.company||r.customer?.contact_name||'Kunde';
   return <article key={r.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
     <div><div className="flex flex-wrap items-center gap-2"><span className={"rounded-full px-2.5 py-1 text-[10px] font-black uppercase "+(r.stage==='overdue'?'bg-red-500/15 text-red-300':'bg-amber-300/10 text-amber-200')}>{r.stage==='overdue'?'Forfalt':'Forfaller snart'}</span><span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-slate-400">{r.status}</span></div><p className="text-lg font-black text-white mt-2">{r.invoice?.invoice_number||r.invoice_id}</p><p className="text-xs text-slate-500 mt-1">{customer} · forfall {r.due_date||'—'}</p></div>
     <strong className="text-xl text-white">{money(r.amount,r.currency)}</strong>
    </div>

    {r.status==='draft'?<div className="mt-4 space-y-3">
      <input className={field} value={d.email} placeholder="Kundens e-post" onChange={e=>setDrafts(prev=>({...prev,[r.id]:{...d,email:e.target.value}}))}/>
      <input className={field} value={d.subject} onChange={e=>setDrafts(prev=>({...prev,[r.id]:{...d,subject:e.target.value}}))}/>
      <textarea className={field+' min-h-40'} value={d.body} onChange={e=>setDrafts(prev=>({...prev,[r.id]:{...d,body:e.target.value}}))}/>
      <div className="flex flex-wrap gap-2">
       <button disabled={busy===r.id+'save'} onClick={()=>act(r.id+'save',()=>savePaymentReminderDraft(r.id,d.subject,d.body,d.email))} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white flex items-center gap-1"><Save size={14}/>Lagre utkast</button>
       <button disabled={!d.subject.trim()||!d.body.trim()||busy===r.id+'approve'} onClick={()=>act(r.id+'approve',async()=>{await savePaymentReminderDraft(r.id,d.subject,d.body,d.email);await approvePaymentReminder(r.id);})} className="rounded-xl bg-amber-300 px-3 py-2 text-xs font-black text-black flex items-center gap-1"><CheckCircle2 size={14}/>Godkjenn</button>
       <button onClick={()=>act(r.id+'cancel',()=>cancelPaymentReminder(r.id))} className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 flex items-center gap-1"><Trash2 size={14}/>Avbryt</button>
      </div>
    </div>:r.status==='approved'?<div className="mt-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm font-bold text-white">{r.subject}</p><p className="whitespace-pre-wrap text-xs leading-6 text-slate-400 mt-2">{r.body}</p></div>
      <div className="flex flex-wrap gap-2 mt-3">
       <button disabled={busy===r.id+'portal'} onClick={()=>act(r.id+'portal',()=>sendPaymentReminderToPortal(r.id))} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black flex items-center gap-1"><MessageSquare size={14}/>Send til kundeportal</button>
       <button onClick={()=>copy(r)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white flex items-center gap-1"><Clipboard size={14}/>Kopier e-post</button>
       <button disabled={!d.email||busy===r.id+'mail'} onClick={()=>act(r.id+'mail',()=>markPaymentReminderExternalSent(r.id,'email'))} className="rounded-xl bg-blue-500/15 px-3 py-2 text-xs font-bold text-blue-300 flex items-center gap-1"><Mail size={14}/>Marker e-post sendt</button>
       <button onClick={()=>act(r.id+'cancel',()=>cancelPaymentReminder(r.id))} className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 flex items-center gap-1"><Trash2 size={14}/>Avbryt</button>
      </div>
      <p className="text-[10px] text-slate-600 mt-2">«Marker e-post sendt» sender ikke e-post. Bruk den først etter at meldingen faktisk er sendt via en ekstern e-postkanal.</p>
    </div>:<div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"><p className="text-sm text-slate-300">{r.status==='sent'?'Sendt':'Avbrutt'}{r.sent_at?' · '+new Date(r.sent_at).toLocaleString('no-NO'):''}{r.channel?' · '+r.channel:''}</p><p className="text-xs text-slate-500 mt-2">{r.subject}</p></div>}
   </article>;
  })}</div>
 </div>;
};
export default PaymentReminderPanel;
