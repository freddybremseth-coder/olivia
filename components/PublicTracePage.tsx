import React, { useEffect, useMemo, useState } from 'react';
import {
  Award, CalendarDays, CheckCircle2, Factory, FlaskConical, Leaf, Loader2,
  MapPin, PackageCheck, QrCode, Scale, ShieldCheck, Sprout
} from 'lucide-react';
import {
  fetchPublicTraceBatch, fetchPublicTraceLot,
  type PublicTraceBatch, type PublicTraceLot, type PublicTraceLotSource
} from '../services/publicTrace';

interface PublicTracePageProps { slug?: string; }

const value = (v: unknown, suffix='') => v === undefined || v === null || v === '' ? '—' : `${v}${suffix}`;

function dateLabel(raw?: string) {
  if (!raw) return '—';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleDateString('nb-NO');
}

function avg(sources: PublicTraceLotSource[], key: 'acidity_percent'|'peroxide_value'|'polyphenols_mg_kg') {
  const vals=sources.map(s=>s[key]).filter((v):v is number=>typeof v==='number');
  return vals.length ? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*100)/100 : undefined;
}

const PublicTracePage: React.FC<PublicTracePageProps> = ({ slug }) => {
  const [lot,setLot]=useState<PublicTraceLot|null>(null);
  const [batch,setBatch]=useState<PublicTraceBatch|null>(null);
  const [loading,setLoading]=useState(Boolean(slug));
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      if(!slug){setLoading(false);setLoaded(true);return;}
      setLoading(true);
      const productLot=await fetchPublicTraceLot(slug);
      if(cancelled)return;
      if(productLot){setLot(productLot);setBatch(null);setLoading(false);setLoaded(true);return;}
      const legacyBatch=await fetchPublicTraceBatch(slug);
      if(cancelled)return;
      setBatch(legacyBatch);setLot(null);setLoading(false);setLoaded(true);
    })();
    return()=>{cancelled=true;};
  },[slug]);

  const sources=lot?.source_batches||[];
  const varieties=lot?.trace_summary?.varieties||[];
  const parcels=lot?.trace_summary?.parcels||[];
  const harvestDates=lot?.trace_summary?.harvest_dates||[];
  const acidity=useMemo(()=>avg(sources,'acidity_percent'),[sources]);
  const peroxide=useMemo(()=>avg(sources,'peroxide_value'),[sources]);
  const phenols=useMemo(()=>avg(sources,'polyphenols_mg_kg'),[sources]);

  if(loading) return <div className="min-h-screen bg-[#070907] text-white flex items-center justify-center"><div className="text-center"><Loader2 className="animate-spin text-green-400 mx-auto" size={34}/><p className="text-sm text-slate-500 mt-3">Henter dokumentert sporbarhet…</p></div></div>;

  if(loaded&&!lot&&!batch) return <div className="min-h-screen bg-[#070907] text-white flex items-center justify-center p-6"><div className="max-w-xl text-center rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-9"><QrCode className="mx-auto text-slate-500" size={42}/><h1 className="text-3xl font-black mt-5">Ingen publisert sporbarhet</h1><p className="text-slate-400 mt-3 leading-relaxed">Denne QR-koden er ikke koblet til en publisert Doña Anna-lot. Vi viser ikke eksempeldata eller antatt opprinnelse.</p><p className="text-xs text-slate-600 mt-5">Kode: {slug||'mangler'}</p></div></div>;

  if(batch&&!lot) return <div className="min-h-screen bg-[#070907] text-white"><main className="max-w-5xl mx-auto px-5 py-12 space-y-6"><header><p className="text-xs uppercase tracking-[.3em] font-black text-green-400">Doña Anna · dokumentert batch</p><h1 className="text-4xl md:text-6xl font-black mt-2">{batch.variety}</h1><p className="text-slate-400 mt-3">{batch.public_story||'Publisert råvarebatch fra Doña Anna i Biar, Alicante.'}</p></header><section className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Batch',batch.batch_code],['Høst',dateLabel(batch.harvest_date)],['Mengde',value(batch.kg_harvested,' kg')],['Status',batch.product_status||batch.status]].map(([a,b])=><div key={String(a)} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">{a}</p><p className="font-bold mt-1">{b}</p></div>)}</section><p className="text-xs text-slate-600">Dette er en publisert råvarebatch. Ferdig produktsporbarhet bruker pakkelot.</p></main></div>;

  if(!lot) return null;

  return <div className="min-h-screen bg-[#070907] text-white overflow-hidden">
    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage:'radial-gradient(circle at 15% 5%, #365c2c 0, transparent 30%), radial-gradient(circle at 85% 20%, #76643a 0, transparent 24%)'}}/>
    <main className="relative max-w-6xl mx-auto px-5 py-10 md:py-16 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div><p className="text-xs uppercase tracking-[.32em] font-black text-green-400">Doña Anna · Biar, Alicante</p><h1 className="text-4xl md:text-6xl font-black mt-2">Fra olivenlund til {lot.product_category?.toLowerCase().includes('table')?'glass':'flaske'}</h1></div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 flex items-center gap-3"><QrCode className="text-green-400"/><div><p className="text-[9px] uppercase tracking-widest text-slate-500">Produktlot</p><p className="font-bold">{lot.lot_code}</p></div></div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-7 flex items-center justify-center min-h-[360px]">
          {lot.product_image_url?<img src={lot.product_image_url} alt={lot.product_name} className="max-h-[430px] max-w-full object-contain rounded-2xl"/>:<PackageCheck size={80} className="text-slate-700"/>}
        </div>
        <div className="lg:col-span-7 rounded-[2.5rem] border border-white/10 bg-white/[0.04] p-8 md:p-10">
          <div className="flex items-center gap-2 text-green-400"><Leaf size={18}/><span className="text-xs uppercase tracking-[.25em] font-black">{lot.product_category||'Doña Anna'}</span></div>
          <h2 className="text-4xl md:text-6xl font-black mt-5">{lot.product_name}</h2>
          <p className="text-lg text-slate-300 mt-4">{lot.product_size} · {lot.product_sku}</p>
          <p className="text-slate-400 mt-5 leading-relaxed">{lot.product_description||lot.product_story||'Dokumentert produktlot fra Doña Anna.'}</p>
          {lot.product_story&&lot.product_description&&<p className="text-green-100/80 mt-4 leading-relaxed">{lot.product_story}</p>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              ['Pakket',dateLabel(lot.packed_at),<PackageCheck size={17}/>],
              ['Kildebatcher',sources.length,<Factory size={17}/>],
              ['Parseller',parcels.length,<MapPin size={17}/>],
              ['Status','Dokumentert',<CheckCircle2 size={17}/>],
            ].map(([label,val,icon])=><div key={String(label)} className="rounded-2xl bg-black/30 border border-white/10 p-4"><div className="text-green-400 mb-2">{icon}</div><p className="text-[9px] uppercase tracking-widest text-slate-500">{label}</p><p className="font-bold mt-1">{val}</p></div>)}
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-green-500/20 bg-green-500/[0.06] p-7 md:p-9">
        <div className="flex items-start gap-4"><ShieldCheck className="text-green-400 shrink-0 mt-1"/><div><h3 className="text-2xl font-black">Dette kan spores</h3><p className="text-slate-300 mt-2 leading-relaxed">Denne siden er laget fra den faktiske pakkeloten. Produktet er koblet til registrerte kildebatcher i Olivia. Bare publiserte, dokumenterte data vises her.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
          <div className="rounded-2xl bg-black/20 border border-white/10 p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">Høstedato(er)</p><p className="font-bold mt-1">{harvestDates.length?harvestDates.map(dateLabel).join(' · '):'Ikke registrert'}</p></div>
          <div className="rounded-2xl bg-black/20 border border-white/10 p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">Sort(er)</p><p className="font-bold mt-1">{varieties.length?varieties.join(' · '):'Ikke registrert'}</p></div>
          <div className="rounded-2xl bg-black/20 border border-white/10 p-4"><p className="text-[10px] uppercase tracking-widest text-slate-500">Opprinnelse</p><p className="font-bold mt-1">{parcels.length?parcels.join(' · '):'Biar, Alicante'}</p></div>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4"><Sprout className="text-green-400"/><h3 className="text-2xl font-black">Kildebatcher</h3></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sources.map(source=><article key={source.batch_id} className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest text-green-400 font-bold">Råvarebatch</p><h4 className="text-xl font-black mt-1">{source.batch_code}</h4></div><div className="text-right"><p className="text-[9px] uppercase tracking-widest text-slate-500">Høstet</p><p className="font-bold">{dateLabel(source.harvest_date)}</p></div></div>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase text-slate-500">Parsell</p><p className="font-bold mt-1">{source.parcel_name||'Biar, Alicante'}</p></div>
              <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase text-slate-500">Sort</p><p className="font-bold mt-1">{source.variety||'—'}</p></div>
              <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase text-slate-500">Høstet</p><p className="font-bold mt-1">{value(source.kg_harvested,' kg')}</p></div>
              <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase text-slate-500">Kvalitet</p><p className="font-bold mt-1">{source.quality||'Ikke registrert'}</p></div>
            </div>
          </article>)}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center gap-3"><FlaskConical className="text-purple-400"/><h3 className="text-xl font-black">Kvalitetsdata</h3></div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[['Syre',value(acidity,'%')],['Peroksid',value(peroxide)],['Polyfenoler',value(phenols,' mg/kg')]].map(([label,val])=><div key={String(label)} className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase text-slate-500">{label}</p><p className="font-black mt-1">{val}</p></div>)}
          </div>
          <p className="text-xs text-slate-600 mt-4">Verdier vises bare når de er registrert på kildebatchene. Ved flere batcher vises gjennomsnittet.</p>
        </div>
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
          <div className="flex items-center gap-3"><Scale className="text-yellow-400"/><h3 className="text-xl font-black">Dokumentert råvare</h3></div>
          <p className="text-4xl font-black mt-5">{value(lot.trace_summary?.total_source_kg,' kg')}</p>
          <p className="text-sm text-slate-500 mt-2">Registrert høstemengde i kildebatchene. Dette er ikke det samme som netto innhold i denne pakkeloten.</p>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-7">
        <div className="flex items-start gap-4"><Award className="text-yellow-400 shrink-0"/><div><h3 className="text-xl font-black">Doña Anna i Biar</h3><p className="text-slate-400 mt-2 leading-relaxed">Vi bygger sporbarhet fra gårdsdrift og høsting til ferdig produkt. Sertifiseringer og analyseverdier vises først når dokumentasjonen for den aktuelle batchen er registrert og publisert.</p></div></div>
      </section>

      <footer className="text-center text-xs text-slate-600 pb-8">Doña Anna · Biar, Alicante · Lot {lot.lot_code} · publisert {dateLabel(lot.published_at)}</footer>
    </main>
  </div>;
};

export default PublicTracePage;
