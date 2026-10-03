import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Copy, Download, ExternalLink, Loader2, PackageCheck, Printer, QrCode, RefreshCcw, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { fetchUnifiedInventory, type UnifiedInventoryProduct, type UnifiedProductLot } from '../services/commerceInventory';
import { fetchPublicTraceLot } from '../services/publicTrace';

type LotRow = UnifiedProductLot & { product?: UnifiedInventoryProduct; published: boolean };

function traceUrl(slug: string): string {
  if (typeof window === 'undefined') return `/trace/${slug}`;
  return `${window.location.origin}/trace/${slug}`;
}

function slugFor(lot: UnifiedProductLot) {
  return lot.traceability_slug || lot.lot_code.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

function saveBlob(filename: string, content: string, type: string) {
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

const LabelQrGeneratorView: React.FC = () => {
  const [rows,setRows]=useState<LotRow[]>([]);
  const [selectedId,setSelectedId]=useState('');
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [copied,setCopied]=useState(false);
  const qrWrap=useRef<HTMLDivElement>(null);

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const inventory=await fetchUnifiedInventory();
      const mapped=await Promise.all(inventory.lots.map(async lot=>{
        const product=inventory.products.find(p=>p.id===lot.product_id);
        const published=Boolean(await fetchPublicTraceLot(slugFor(lot)));
        return {...lot,product,published};
      }));
      setRows(mapped);
      if(!selectedId&&mapped[0])setSelectedId(mapped[0].id);
    }catch(err:any){setError(err?.message||'Kunne ikke hente pakkelot.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{load();},[]);

  const selected=useMemo(()=>rows.find(r=>r.id===selectedId)||rows[0],[rows,selectedId]);
  const slug=selected?slugFor(selected):'';
  const url=selected?traceUrl(slug):'';

  const copy=async()=>{if(!url)return;await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1500);};
  const downloadQr=()=>{
    const svg=qrWrap.current?.querySelector('svg');
    if(!svg||!selected)return;
    const clone=svg.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
    clone.setAttribute('width','1000');clone.setAttribute('height','1000');
    saveBlob(`${slug}-qr-print.svg`,new XMLSerializer().serializeToString(clone),'image/svg+xml;charset=utf-8');
  };
  const downloadInfo=()=>{
    if(!selected)return;
    const text=[
      'DOÑA ANNA · QR TRACEABILITY',
      `Product: ${selected.product?.name||selected.product_id}`,
      `Size: ${selected.product?.size||'—'}`,
      `SKU: ${selected.product?.sku||'—'}`,
      `Lot: ${selected.lot_code}`,
      `Packed: ${selected.packed_at||'—'}`,
      `Trace URL: ${url}`,
      `Public status: ${selected.published?'PUBLISHED':'NOT PUBLISHED'}`,
      '',
      'Print note: keep a white quiet zone around the QR code and test the printed proof with multiple phones.',
    ].join('\n');
    saveBlob(`${slug}-qr-info.txt`,text,'text/plain;charset=utf-8');
  };

  return <div className="space-y-8 animate-in fade-in duration-500 pb-24">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div><h2 className="text-3xl font-black text-white flex items-center gap-3"><QrCode className="text-green-400"/> QR for etikett</h2><p className="text-sm text-slate-500 mt-1">Kun ekte pakkelot · lokal QR-generering · SVG for trykkeri</p></div>
      <div className="flex gap-2">
        <select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white min-w-[260px]"><option value="">Velg pakkelot</option>{rows.map(r=><option key={r.id} value={r.id}>{r.product?.name||r.product_id} · {r.lot_code}</option>)}</select>
        <button onClick={load} className="p-3 rounded-2xl border border-white/10 bg-white/5 text-green-400">{loading?<Loader2 className="animate-spin"/>:<RefreshCcw/>}</button>
      </div>
    </div>

    {error&&<div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-100">{error}</div>}
    {!loading&&!selected&&<div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 text-center"><PackageCheck className="mx-auto text-slate-600" size={42}/><h3 className="text-xl font-black text-white mt-4">Ingen pakkelot ennå</h3><p className="text-sm text-slate-500 mt-2">Opprett pakkelot under Batch og sporbarhet først. QR-filer skal ikke genereres fra demo- eller råvarebatcher.</p></div>}

    {selected&&<>
      {!selected.published&&<div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex gap-3"><ShieldAlert className="text-amber-400 shrink-0"/><div><p className="font-bold text-amber-100">Denne loten er ikke publisert offentlig ennå.</p><p className="text-xs text-amber-200/70 mt-1">QR-filen kan lages som trykkprøve, men etiketten bør ikke trykkes før «Publiser produkt-QR» er gjort under Batch og sporbarhet.</p></div></div>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-5 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
          <div ref={qrWrap} className="rounded-[2rem] bg-white p-8 flex items-center justify-center">
            <QRCodeSVG value={url} size={420} level="H" marginSize={4} bgColor="#ffffff" fgColor="#000000"/>
          </div>
          <p className="text-xs text-slate-500 break-all mt-4">{url}</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={copy} className="rounded-xl bg-white/10 py-3 text-sm font-bold text-white flex items-center justify-center gap-2"><Copy size={16}/>{copied?'Kopiert':'Kopier URL'}</button>
            <a href={url} target="_blank" rel="noreferrer" className="rounded-xl bg-white/10 py-3 text-sm font-bold text-white flex items-center justify-center gap-2"><ExternalLink size={16}/> Test QR-side</a>
          </div>
        </section>

        <section className="xl:col-span-7 space-y-4">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
            <p className="text-[10px] uppercase tracking-widest text-green-400 font-bold">Etikettidentitet</p>
            <h3 className="text-4xl font-black text-white mt-3">{selected.product?.name||selected.product_id}</h3>
            <p className="text-lg text-slate-300 mt-2">{selected.product?.size||'—'} · {selected.product?.sku||'—'}</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="rounded-xl bg-black/20 p-4"><p className="text-[9px] uppercase text-slate-500">Lot</p><p className="font-bold text-white mt-1">{selected.lot_code}</p></div>
              <div className="rounded-xl bg-black/20 p-4"><p className="text-[9px] uppercase text-slate-500">QR-status</p><p className={`font-bold mt-1 ${selected.published?'text-green-400':'text-amber-400'}`}>{selected.published?'Publisert':'Ikke publisert'}</p></div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-green-500/20 bg-green-500/[0.05] p-6">
            <div className="flex gap-3"><CheckCircle2 className="text-green-400 shrink-0"/><div><h4 className="font-black text-white">Trykklar QR-master</h4><p className="text-sm text-slate-400 mt-2 leading-relaxed">SVG-filen genereres lokalt i Olivia, i svart på hvitt med høy feilkorreksjon og god sikkerhetsmargin. Den inneholder bare QR-koden og kan plasseres i den godkjente Doña Anna-etiketten uten å endre etikettens design.</p></div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button onClick={downloadQr} className="rounded-2xl bg-green-500 py-3 font-black text-black flex items-center justify-center gap-2"><Download size={18}/> QR SVG</button>
            <button onClick={downloadInfo} className="rounded-2xl bg-white/10 py-3 font-bold text-white flex items-center justify-center gap-2"><Download size={18}/> Lot-info</button>
            <button onClick={()=>window.print()} className="rounded-2xl bg-white/10 py-3 font-bold text-white flex items-center justify-center gap-2"><Printer size={18}/> Print prøve</button>
          </div>
        </section>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6">
        <p className="font-bold text-white">Trykkerikontroll</p>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">Ikke inverter QR-koden, ikke legg grafikk inn i selve koden, og behold den hvite sikkerhetssonen. Endelig fysisk størrelse må bestemmes sammen med etikettlayouten og testes på faktisk flaske/kanne før opplag.</p>
      </div>
    </>}
  </div>;
};

export default LabelQrGeneratorView;
