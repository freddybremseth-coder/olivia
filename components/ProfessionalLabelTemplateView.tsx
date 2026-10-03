import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Download, FileText, Loader2, PackageCheck, Printer, QrCode, RefreshCcw } from 'lucide-react';
import { fetchUnifiedInventory, type UnifiedInventoryProduct, type UnifiedProductLot } from '../services/commerceInventory';

type LabelLanguage='es'|'en'|'no';
type Row=UnifiedProductLot&{product?:UnifiedInventoryProduct};

function slugFor(lot:UnifiedProductLot){return lot.traceability_slug||lot.lot_code.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function traceUrl(lot:UnifiedProductLot){const path=`/trace/${slugFor(lot)}`;return typeof window==='undefined'?path:`${window.location.origin}${path}`;}
function productTitle(product:UnifiedInventoryProduct|undefined,lang:LabelLanguage){
  const table=product?.category?.toLowerCase().includes('table');
  if(table)return lang==='es'?'Aceitunas de mesa':lang==='en'?'Table olives':'Bordoliven';
  return lang==='es'?'Aceite de oliva virgen extra':lang==='en'?'Extra virgin olive oil':'Extra virgin olivenolje';
}
function save(filename:string,content:string){const blob=new Blob([content],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}

const ProfessionalLabelTemplateView:React.FC=()=>{
  const [rows,setRows]=useState<Row[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [language,setLanguage]=useState<LabelLanguage>('es');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [producer,setProducer]=useState('');
  const [address,setAddress]=useState('');
  const [bestBefore,setBestBefore]=useState('');
  const [ingredients,setIngredients]=useState('');
  const [storage,setStorage]=useState('');
  const [copied,setCopied]=useState(false);

  const load=async()=>{setLoading(true);setError('');try{const inv=await fetchUnifiedInventory();const mapped=inv.lots.map(lot=>({...lot,product:inv.products.find(p=>p.id===lot.product_id)}));setRows(mapped);if(!selectedId&&mapped[0])setSelectedId(mapped[0].id);}catch(e:any){setError(e?.message||'Kunne ikke hente produktlot.');}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const selected=useMemo(()=>rows.find(r=>r.id===selectedId)||rows[0],[rows,selectedId]);
  const product=selected?.product;
  const isTable=product?.category?.toLowerCase().includes('table');

  useEffect(()=>{
    if(!selected)return;
    setIngredients(isTable?(language==='es'?'Aceitunas, agua, sal.':language==='en'?'Olives, water, salt.':'Oliven, vann, salt.'):(language==='es'?'Aceite de oliva virgen extra.':language==='en'?'Extra virgin olive oil.':'Extra virgin olivenolje.'));
    setStorage(language==='es'?'Conservar en lugar fresco y oscuro. Proteger de la luz y del calor.':language==='en'?'Store in a cool, dark place. Protect from light and heat.':'Oppbevares kjølig og mørkt. Beskyttes mot lys og varme.');
  },[selectedId,language,isTable]);

  const required=selected?[
    'Doña Anna',
    productTitle(product,language),
    product?.size||'NETTOINNHOLD MÅ BEKREFTES',
    `Lot: ${selected.lot_code}`,
    bestBefore?`Best before / Consumir preferentemente antes de: ${bestBefore}`:'BEST FØR MÅ FYLLES INN',
    `Ingredients / Ingredientes: ${ingredients}`,
    storage,
    producer?`Operator / Operador: ${producer}`:'OPERATØR/PRODUSENT MÅ BEKREFTES',
    address||'ADRESSE MÅ BEKREFTES',
    `Origin / Origen: Spain / España`,
    `Trace: ${traceUrl(selected)}`,
  ].join('\n'):'';

  const copy=async()=>{await navigator.clipboard.writeText(required);setCopied(true);setTimeout(()=>setCopied(false),1500);};

  return <div className="space-y-7 pb-24">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h2 className="text-3xl font-black text-white flex items-center gap-3"><FileText className="text-green-400"/> Profesjonell etikett</h2><p className="text-sm text-slate-500 mt-1">Ekte produktlot · riktig nettoinnhold fra produktmaster · ingen demo-data</p></div><div className="flex gap-2"><select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white min-w-[260px]"><option value="">Velg pakkelot</option>{rows.map(r=><option key={r.id} value={r.id}>{r.product?.name||r.product_id} · {r.lot_code}</option>)}</select><select value={language} onChange={e=>setLanguage(e.target.value as LabelLanguage)} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-white"><option value="es">ES</option><option value="en">EN</option><option value="no">NO</option></select><button onClick={load} className="p-3 rounded-2xl bg-white/5 text-green-400">{loading?<Loader2 className="animate-spin"/>:<RefreshCcw/>}</button></div></div>

    {error&&<div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 flex gap-3"><AlertTriangle className="text-amber-400 shrink-0"/><div><p className="font-bold text-amber-100">Ikke send etiketten til trykk før åpne juridiske felter er bekreftet.</p><p className="text-xs text-amber-200/70 mt-1">Olivia fyller produkt, størrelse, lot og QR automatisk. Operatør/produsent, adresse, best før, ingrediens-/næringsdata og eventuelle sertifiseringspåstander må komme fra faktisk dokumentasjon. «Økologisk» legges ikke inn automatisk.</p></div></div>

    {!selected?<div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">Opprett en ekte pakkelot først.</div>:<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <section className="xl:col-span-5 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Felter som må bekreftes</p>
        <label className="block text-xs text-slate-400">Operatør / produsent<input value={producer} onChange={e=>setProducer(e.target.value)} placeholder="Ikke bekreftet" className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="block text-xs text-slate-400">Adresse<input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Ikke bekreftet" className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="block text-xs text-slate-400">Best før<input value={bestBefore} onChange={e=>setBestBefore(e.target.value)} placeholder="DD.MM.YYYY" className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="block text-xs text-slate-400">Ingredienser<textarea value={ingredients} onChange={e=>setIngredients(e.target.value)} className="mt-1 w-full min-h-[80px] rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
        <label className="block text-xs text-slate-400">Oppbevaring<textarea value={storage} onChange={e=>setStorage(e.target.value)} className="mt-1 w-full min-h-[80px] rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-white"/></label>
      </section>
      <section className="xl:col-span-7 space-y-4">
        <div className="rounded-[2rem] border border-green-500/20 bg-green-500/[0.05] p-7"><p className="text-xs uppercase tracking-[.3em] text-green-400 font-black">Doña Anna</p><h3 className="text-4xl font-black text-white mt-4">{product?.name}</h3><p className="text-2xl text-slate-200 mt-2">{product?.size}</p><div className="grid grid-cols-2 gap-3 mt-6"><div className="rounded-xl bg-black/20 p-3"><PackageCheck className="text-green-400 mb-1" size={16}/><p className="text-[9px] uppercase text-slate-500">Lot</p><p className="font-bold text-white">{selected.lot_code}</p></div><div className="rounded-xl bg-black/20 p-3"><QrCode className="text-green-400 mb-1" size={16}/><p className="text-[9px] uppercase text-slate-500">Trace</p><p className="text-xs font-bold text-white break-all">{traceUrl(selected)}</p></div></div></div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Arbeidstekst</p><pre className="whitespace-pre-wrap font-sans text-sm text-slate-300 mt-4 leading-relaxed">{required}</pre></div>
        <div className="grid grid-cols-3 gap-3"><button onClick={copy} className="rounded-2xl bg-white/10 py-3 font-bold text-white flex items-center justify-center gap-2"><Copy size={17}/>{copied?'Kopiert':'Kopier'}</button><button onClick={()=>save(`${slugFor(selected)}-label-data.txt`,required)} className="rounded-2xl bg-white/10 py-3 font-bold text-white flex items-center justify-center gap-2"><Download size={17}/> Data</button><button onClick={()=>window.print()} className="rounded-2xl bg-green-500 py-3 font-black text-black flex items-center justify-center gap-2"><Printer size={17}/> Print prøve</button></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 flex gap-3"><CheckCircle2 className="text-green-400 shrink-0"/><p className="text-xs text-slate-500">Nettoinnhold hentes nå fra produktmasteren: 750 ml for de tre flaskeproduktene og 3 L for Cocina Viva. Ingen 500 ml-standard ligger lenger i denne modulen.</p></div>
      </section>
    </div>}
  </div>;
};
export default ProfessionalLabelTemplateView;
