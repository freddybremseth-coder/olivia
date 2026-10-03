import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, Loader2, PackageCheck, Printer, QrCode, RefreshCcw, Ruler, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchUnifiedInventory, type UnifiedInventoryProduct, type UnifiedProductLot } from '../services/commerceInventory';

type Row=UnifiedProductLot&{product?:UnifiedInventoryProduct};
function slugFor(lot:UnifiedProductLot){return lot.traceability_slug||lot.lot_code.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function traceUrl(lot:UnifiedProductLot){const path=`/trace/${slugFor(lot)}`;return typeof window==='undefined'?path:`${window.location.origin}${path}`;}
function save(filename:string,content:string,type:string){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();URL.revokeObjectURL(url);}

const PrintLabelTemplatesView:React.FC=()=>{
  const [rows,setRows]=useState<Row[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const qrRef=useRef<HTMLDivElement>(null);

  const load=async()=>{setLoading(true);setError('');try{const inv=await fetchUnifiedInventory();const mapped=inv.lots.map(l=>({...l,product:inv.products.find(p=>p.id===l.product_id)}));setRows(mapped);if(!selectedId&&mapped[0])setSelectedId(mapped[0].id);}catch(e:any){setError(e?.message||'Kunne ikke hente pakkelot.');}finally{setLoading(false);}};
  useEffect(()=>{load();},[]);
  const selected=useMemo(()=>rows.find(r=>r.id===selectedId)||rows[0],[rows,selectedId]);
  const url=selected?traceUrl(selected):'';

  const downloadQr=()=>{const svg=qrRef.current?.querySelector('svg');if(!svg||!selected)return;const clone=svg.cloneNode(true) as SVGElement;clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width','1000');clone.setAttribute('height','1000');save(`${slugFor(selected)}-qr.svg`,new XMLSerializer().serializeToString(clone),'image/svg+xml;charset=utf-8');};
  const downloadManifest=()=>{if(!selected)return;const p=selected.product;save(`${slugFor(selected)}-print-manifest.txt`,[`Doña Anna print manifest`,`Product: ${p?.name||selected.product_id}`,`Pack size: ${p?.size||'—'}`,`SKU: ${p?.sku||'—'}`,`Lot: ${selected.lot_code}`,`Trace: ${url}`,`Product image/master reference: ${p?.image_url||'not registered'}`,`NOTE: Use the approved current Doña Anna label artwork. This module must not recreate or substitute the brand label.`].join('\n'),'text/plain;charset=utf-8');};

  return <div className="space-y-7 pb-24">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><h2 className="text-3xl font-black text-white flex items-center gap-3"><Ruler className="text-green-400"/> Trykkgrunnlag</h2><p className="text-sm text-slate-500 mt-1">Godkjent etikett beholdes · Olivia leverer lot/QR-data til trykkeriet</p></div><div className="flex gap-2"><select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white min-w-[280px]"><option value="">Velg pakkelot</option>{rows.map(r=><option key={r.id} value={r.id}>{r.product?.name||r.product_id} · {r.lot_code}</option>)}</select><button onClick={load} className="p-3 rounded-2xl bg-white/5 text-green-400">{loading?<Loader2 className="animate-spin"/>:<RefreshCcw/>}</button></div></div>
    {error&&<div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
    <div className="rounded-2xl border border-green-500/20 bg-green-500/[0.05] p-5 flex gap-3"><ShieldCheck className="text-green-400 shrink-0"/><div><p className="font-bold text-white">Denne modulen lager ikke en ny Doña Anna-etikett.</p><p className="text-xs text-slate-500 mt-1">Den tidligere generiske SVG-etiketten er fjernet. Trykkeriet skal bruke dagens godkjente merkevareetikett og legge inn korrekt lot/QR-master fra Olivia.</p></div></div>
    {!selected?<div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center text-slate-500">Ingen pakkelot ennå.</div>:<div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <section className="xl:col-span-5 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
        <div className="rounded-[2rem] bg-white/[0.03] border border-white/10 min-h-[380px] flex items-center justify-center p-5">{selected.product?.image_url?<img src={selected.product.image_url} alt={selected.product.name} className="max-h-[360px] max-w-full object-contain"/>:<FileText size={70} className="text-slate-700"/>}</div>
        <p className="text-xs text-slate-500 mt-3">Produktbildet er referanse til riktig produkt/etikettidentitet. Det skal ikke brukes som trykkfil med mindre originalfilen faktisk er godkjent for trykk.</p>
      </section>
      <section className="xl:col-span-7 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Produkt',selected.product?.name||selected.product_id],['Format',selected.product?.size||'—'],['SKU',selected.product?.sku||'—'],['Lot',selected.lot_code]].map(([a,b])=><div key={String(a)} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><p className="text-[9px] uppercase tracking-widest text-slate-500">{a}</p><p className="font-bold text-white mt-1">{b}</p></div>)}</div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6"><p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">QR-master</p><div className="flex flex-col md:flex-row gap-5 mt-4 items-center"><div ref={qrRef} className="bg-white rounded-2xl p-5"><QRCodeSVG value={url} size={260} level="H" marginSize={4} bgColor="#fff" fgColor="#000"/></div><div><QrCode className="text-green-400"/><p className="font-bold text-white mt-3 break-all">{url}</p><p className="text-xs text-slate-500 mt-2">Plasseres på den eksisterende etiketten med uforstyrret hvit sikkerhetssone. Test fysisk trykkprøve før produksjonsopplag.</p></div></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><button onClick={downloadQr} className="rounded-2xl bg-green-500 py-3 font-black text-black flex items-center justify-center gap-2"><Download size={17}/> QR SVG</button><button onClick={downloadManifest} className="rounded-2xl bg-white/10 py-3 font-bold text-white flex items-center justify-center gap-2"><PackageCheck size={17}/> Print manifest</button><button onClick={()=>window.print()} className="rounded-2xl bg-white/10 py-3 font-bold text-white flex items-center justify-center gap-2"><Printer size={17}/> Print prøve</button></div>
      </section>
    </div>}
  </div>;
};
export default PrintLabelTemplatesView;
