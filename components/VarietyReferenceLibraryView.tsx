import React,{useEffect,useMemo,useState} from 'react';
import {
  AlertTriangle,BookOpen,CheckCircle2,Edit3,Image as ImageIcon,Leaf,
  Loader2,MapPin,RefreshCcw,Save,X,XCircle
} from 'lucide-react';
import type { Parcel } from '../types';
import {
  fetchVarietyReferences,
  updateVarietyReference,
  type OliveVarietyReference,
} from '../services/varietyReference';
import type { OliveInspectionResult } from '../services/geminiService';

type Props={parcels:Parcel[]};

const inputClass='w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-green-500/40';

function traitsOf(ref:OliveVarietyReference){
  const inspection=(ref.inspection_json||{}) as OliveInspectionResult;
  return Array.from(new Set([
    ...(Array.isArray(inspection.fruitTraits)?inspection.fruitTraits:[]),
    ...(Array.isArray(inspection.endocarpTraits)?inspection.endocarpTraits:[]),
    ...(Array.isArray(inspection.observations)?inspection.observations:[]),
  ].filter(Boolean))).slice(0,8);
}

function statusLabel(status:OliveVarietyReference['status']){
  if(status==='confirmed')return'Bekreftet';
  if(status==='rejected')return'Avvist';
  return'Foreløpig';
}

const VarietyReferenceLibraryView:React.FC<Props>=({parcels})=>{
  const [rows,setRows]=useState<OliveVarietyReference[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [statusFilter,setStatusFilter]=useState<'all'|OliveVarietyReference['status']>('confirmed');
  const [query,setQuery]=useState('');
  const [editing,setEditing]=useState<OliveVarietyReference|null>(null);
  const [editVariety,setEditVariety]=useState('');
  const [editTreeLabel,setEditTreeLabel]=useState('');
  const [editNotes,setEditNotes]=useState('');
  const [saving,setSaving]=useState(false);

  const load=async()=>{
    setLoading(true);setError('');
    try{setRows(await fetchVarietyReferences({status:'all',limit:250}));}
    catch(err:any){setError(err?.message||'Kunne ikke hente sortsreferanser.');}
    finally{setLoading(false);}
  };

  useEffect(()=>{load();},[]);

  const visible=useMemo(()=>rows.filter(row=>{
    if(statusFilter!=='all'&&row.status!==statusFilter)return false;
    const hay=[row.variety_name,row.tree_label,row.notes,parcels.find(p=>p.id===row.parcel_id)?.name].filter(Boolean).join(' ').toLowerCase();
    return!query.trim()||hay.includes(query.trim().toLowerCase());
  }),[rows,statusFilter,query,parcels]);

  const stats=useMemo(()=>({
    confirmed:rows.filter(r=>r.status==='confirmed').length,
    rejected:rows.filter(r=>r.status==='rejected').length,
    varieties:new Set(rows.filter(r=>r.status==='confirmed').map(r=>r.variety_name.trim().toLowerCase())).size,
    images:rows.filter(r=>r.status==='confirmed').reduce((sum,r)=>sum+(Array.isArray(r.image_urls)?r.image_urls.length:0),0),
  }),[rows]);

  const openEdit=(row:OliveVarietyReference)=>{
    setEditing(row);
    setEditVariety(row.variety_name);
    setEditTreeLabel(row.tree_label||'');
    setEditNotes(row.notes||'');
  };

  const saveEdit=async()=>{
    if(!editing)return;
    setSaving(true);setError('');
    try{
      const updated=await updateVarietyReference(editing.id,{
        varietyName:editVariety,
        treeLabel:editTreeLabel,
        notes:editNotes,
      });
      setRows(current=>current.map(row=>row.id===updated.id?updated:row));
      setEditing(null);
    }catch(err:any){setError(err?.message||'Kunne ikke oppdatere referansen.');}
    finally{setSaving(false);}
  };

  const changeStatus=async(row:OliveVarietyReference,status:OliveVarietyReference['status'])=>{
    setError('');
    try{
      const updated=await updateVarietyReference(row.id,{status});
      setRows(current=>current.map(item=>item.id===updated.id?updated:item));
    }catch(err:any){setError(err?.message||'Kunne ikke endre referansestatus.');}
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-24">
    {editing&&<div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-[#d9b657]/20 bg-[#080b09] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[10px] uppercase tracking-widest font-black text-[#d9b657]">Korriger referanse</p><h3 className="text-xl font-black text-white mt-1">{editing.variety_name}</h3><p className="text-xs text-slate-500 mt-1">Korrigering blir ny bekreftet gårdskunnskap for senere analyser.</p></div>
          <button onClick={()=>setEditing(null)} disabled={saving} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400"><X size={18}/></button>
        </div>
        <div className="space-y-3 mt-5">
          <label className="block text-xs text-slate-400">Bekreftet sort<input list="variety-library-options" className={inputClass+' mt-1'} value={editVariety} onChange={e=>setEditVariety(e.target.value)}/></label>
          <datalist id="variety-library-options">
            <option value="Gordal Sevillana"/><option value="Genovesa"/><option value="Changlot Real"/><option value="Picual"/>
            <option value="Blanqueta"/><option value="Alfafara"/><option value="Manzanilla Villalonga"/><option value="Arbequina"/>
          </datalist>
          <label className="block text-xs text-slate-400">Tre-ID / navn<input className={inputClass+' mt-1'} value={editTreeLabel} onChange={e=>setEditTreeLabel(e.target.value)} placeholder="Valgfritt"/></label>
          <label className="block text-xs text-slate-400">Notat<textarea className={inputClass+' mt-1 min-h-[90px]'} value={editNotes} onChange={e=>setEditNotes(e.target.value)} placeholder="Hvorfor sorten er bekreftet, hvem som bekreftet, evt. kilde…"/></label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={()=>setEditing(null)} disabled={saving} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300">Avbryt</button>
          <button onClick={saveEdit} disabled={saving||!editVariety.trim()} className="rounded-xl bg-[#d9b657] px-5 py-3 text-xs font-black text-black disabled:opacity-40 flex items-center gap-2">{saving?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Lagre korrigering</button>
        </div>
      </div>
    </div>}

    <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.14),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.10),transparent_35%)]"/>
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-black text-[#d9b657]">Olivia Expert Engine</p>
          <h2 className="text-3xl font-black text-white mt-1 flex items-center gap-3"><BookOpen className="text-green-400"/> Sortbibliotek</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-3xl">Bekreftede trær fra Doña Anna er Olivias sterkeste gårdsspesifikke sortsreferanser. Korriger eller avvis feil her før de påvirker senere analyser.</p>
        </div>
        <button onClick={load} disabled={loading} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300 flex items-center gap-2">{loading?<Loader2 size={15} className="animate-spin"/>:<RefreshCcw size={15}/>} Oppdater</button>
      </div>
    </div>

    {error&&<div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0"/>{error}</div>}

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Bekreftede trær" value={stats.confirmed}/>
      <Stat label="Bekreftede sorter" value={stats.varieties}/>
      <Stat label="Referansebilder" value={stats.images}/>
      <Stat label="Avviste" value={stats.rejected}/>
    </div>

    <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 flex flex-col md:flex-row gap-3">
      <input className={inputClass} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Søk sort, tre-ID, parsell eller notat…"/>
      <select className={inputClass+' md:max-w-[220px]'} value={statusFilter} onChange={e=>setStatusFilter(e.target.value as any)}>
        <option value="confirmed">Bekreftet</option>
        <option value="provisional">Foreløpig</option>
        <option value="rejected">Avvist</option>
        <option value="all">Alle</option>
      </select>
    </div>

    {loading?<div className="rounded-3xl border border-white/10 p-12 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-3"/>Henter sortsreferanser…</div>:visible.length?<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {visible.map(row=>{
        const traits=traitsOf(row);
        const parcel=parcels.find(p=>p.id===row.parcel_id);
        const inspection=(row.inspection_json||{}) as OliveInspectionResult;
        return <div key={row.id} className={'rounded-[2rem] border p-5 '+(row.status==='confirmed'?'border-green-500/15 bg-green-500/[0.025]':row.status==='rejected'?'border-red-500/15 bg-red-500/[0.025]':'border-amber-500/15 bg-amber-500/[0.025]')}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap gap-2 items-center"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+(row.status==='confirmed'?'border-green-500/25 text-green-300':row.status==='rejected'?'border-red-500/25 text-red-300':'border-amber-500/25 text-amber-300')}>{statusLabel(row.status)}</span><span className="text-[9px] text-slate-600">{String(row.confirmed_at).slice(0,10)}</span></div>
              <h3 className="text-xl font-black text-white mt-2">{row.variety_name}</h3>
              <p className="text-xs text-slate-500 mt-1">{row.tree_label||'Ingen tre-ID'}{parcel?' · '+parcel.name:''}</p>
            </div>
            <button onClick={()=>openEdit(row)} className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 hover:text-white"><Edit3 size={16}/></button>
          </div>

          {Array.isArray(row.image_urls)&&row.image_urls.length>0?<div className="grid grid-cols-3 gap-2 mt-4">{row.image_urls.slice(0,3).map((url,i)=><a key={url+i} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-white/10 bg-black/30"><img src={url} alt={row.variety_name+' referanse '+(i+1)} className="h-28 w-full object-cover"/></a>)}</div>:<div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-xs text-slate-600 flex items-center gap-2"><ImageIcon size={14}/> Ingen lagrede referansebilder</div>}

          <div className="grid grid-cols-2 gap-2 mt-4">
            <Mini label="Bildegrunnlag" value={inspection.imageQuality||'—'}/>
            <Mini label="AI-kandidat da lagret" value={inspection.varietyAssessment?.bestCandidate||'—'}/>
          </div>

          {traits.length>0&&<div className="mt-4"><p className="text-[9px] uppercase tracking-widest font-black text-slate-500">Lagrede synlige trekk</p><div className="mt-2 space-y-1">{traits.slice(0,5).map((trait,i)=><p key={i} className="text-xs text-slate-400">• {trait}</p>)}</div></div>}
          {row.notes&&<p className="text-xs text-slate-500 mt-4 border-t border-white/5 pt-3">{row.notes}</p>}

          <div className="flex flex-wrap gap-2 mt-5">
            <button onClick={()=>openEdit(row)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 flex items-center gap-2"><Edit3 size={13}/> Korriger</button>
            {row.status==='confirmed'?<button onClick={()=>changeStatus(row,'rejected')} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 flex items-center gap-2"><XCircle size={13}/> Avvis som referanse</button>:<button onClick={()=>changeStatus(row,'confirmed')} className="rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-300 flex items-center gap-2"><CheckCircle2 size={13}/> Bekreft igjen</button>}
          </div>
        </div>;
      })}
    </div>:<div className="rounded-[2rem] border border-dashed border-white/10 p-10 text-center">
      <Leaf size={34} className="mx-auto text-green-400 mb-3"/>
      <p className="font-black text-white">Ingen referanser i dette filteret</p>
      <p className="text-sm text-slate-500 mt-2">Kjør AI Feltkonsulent på et tre du kjenner sorten på, og bruk «Bekreft og lær Olivia denne sorten».</p>
    </div>}
  </div>;
};

const Stat:React.FC<{label:string;value:number}>=({label,value})=><div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="text-[9px] uppercase tracking-widest font-black text-slate-500">{label}</p><p className="text-2xl font-black text-white mt-1">{value}</p></div>;
const Mini:React.FC<{label:string;value:string}>=({label,value})=><div className="rounded-xl border border-white/5 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest font-black text-slate-600">{label}</p><p className="text-xs font-bold text-slate-300 mt-1 line-clamp-2">{value}</p></div>;

export default VarietyReferenceLibraryView;
