import React,{useEffect,useMemo,useState}from'react';
import{CheckCircle2,FileText,Loader2,RefreshCcw,Save}from'lucide-react';
import{fetchCommerceTemplates,saveCommerceTemplate,type CommerceContentTemplate}from'../services/commerceTemplates';

const field='w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-300/50';

const CommerceTemplatePanel:React.FC=()=>{
 const[templates,setTemplates]=useState<CommerceContentTemplate[]>([]),[selectedId,setSelectedId]=useState(''),[draft,setDraft]=useState<CommerceContentTemplate|null>(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const load=async()=>{setLoading(true);setMessage('');try{const rows=await fetchCommerceTemplates();setTemplates(rows);const id=selectedId&&rows.some(r=>r.id===selectedId)?selectedId:rows[0]?.id||'';setSelectedId(id);setDraft(rows.find(r=>r.id===id)||null);}catch(e:any){setMessage(e?.message||'Kunne ikke hente maler.');}finally{setLoading(false);}};
 useEffect(()=>{load();},[]);
 useEffect(()=>{if(selectedId){const row=templates.find(r=>r.id===selectedId);if(row)setDraft({...row});}},[selectedId,templates]);
 const vars=useMemo(()=>draft?.template_type.startsWith('payment_reminder')?['{{customer_name}}','{{invoice_number}}','{{amount}}','{{currency}}','{{due_date}}']:[],[draft?.template_type]);
 const save=async()=>{if(!draft)return;setSaving(true);setMessage('');try{await saveCommerceTemplate(draft);await load();setMessage('Malen er lagret. Nye påminnelsesutkast bruker oppdatert tekst.');}catch(e:any){setMessage(e?.message||'Kunne ikke lagre malen.');}finally{setSaving(false);}};

 return <div className="space-y-5">
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
   <div><p className="text-[10px] uppercase tracking-[0.24em] font-black text-amber-300">Tekstmaler</p><h3 className="text-2xl font-black text-white mt-1">Felles maler for commerce</h3><p className="text-sm text-slate-500 mt-2">Dette er de faktiske malene Olivia bruker. Ingen demo-tekster vises her.</p></div>
   <button onClick={load} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-white flex items-center gap-2">{loading?<Loader2 size={15} className="animate-spin"/>:<RefreshCcw size={15}/>}Oppdater</button>
  </div>
  {message&&<div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-slate-300">{message}</div>}
  {!loading&&templates.length===0?<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-slate-500">Ingen commerce-maler er registrert ennå.</div>:
  <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
   <div className="space-y-2">{templates.map(t=><button key={t.id} onClick={()=>setSelectedId(t.id)} className={"w-full rounded-2xl border p-4 text-left "+(selectedId===t.id?'border-amber-300/40 bg-amber-300/10':'border-white/10 bg-black/20')}><p className="text-sm font-bold text-white">{t.name}</p><p className="text-[10px] text-slate-500 mt-1">{t.template_type} · {t.locale} · {t.status}</p></button>)}</div>
   {draft&&<div className="rounded-3xl border border-white/10 bg-black/20 p-5 space-y-4">
    <div className="flex items-center gap-2"><FileText size={18} className="text-amber-300"/><div><p className="font-black text-white">{draft.name}</p><p className="text-[10px] text-slate-500">{draft.id}</p></div></div>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-xs text-slate-400">Navn<input className={field+' mt-1'} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <label className="text-xs text-slate-400">Status<select className={field+' mt-1'} value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}><option value="active">active</option><option value="draft">draft</option><option value="archived">archived</option></select></label>
      <label className="text-xs text-slate-400">Språk<input className={field+' mt-1'} value={draft.locale} onChange={e=>setDraft({...draft,locale:e.target.value})}/></label>
      <label className="text-xs text-slate-400">Kanal<input className={field+' mt-1'} value={draft.channel} onChange={e=>setDraft({...draft,channel:e.target.value})}/></label>
    </div>
    <label className="text-xs text-slate-400 block">Emne<input className={field+' mt-1'} value={draft.subject||''} onChange={e=>setDraft({...draft,subject:e.target.value})}/></label>
    <label className="text-xs text-slate-400 block">Tekst<textarea className={field+' mt-1 min-h-64'} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})}/></label>
    {vars.length>0&&<div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Tilgjengelige variabler</p><div className="flex flex-wrap gap-2 mt-2">{vars.map(v=><code key={v} className="rounded-lg bg-black/30 px-2 py-1 text-xs text-amber-200">{v}</code>)}</div></div>}
    <button disabled={saving} onClick={save} className="rounded-xl bg-amber-300 px-4 py-2.5 text-xs font-black text-black flex items-center gap-2 disabled:opacity-40">{saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>}Lagre mal</button>
    {!saving&&message.includes('lagret')&&<span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={14}/>Oppdatert</span>}
   </div>}
  </div>}
 </div>;
};
export default CommerceTemplatePanel;
