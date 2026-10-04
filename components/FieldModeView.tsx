import React,{useEffect,useMemo,useState}from'react';
import{
  Camera,Droplets,Leaf,Loader2,Map,MapPin,RefreshCcw,Scissors,
  Sparkles,Wheat,ClipboardCheck,Navigation,ShieldCheck
}from'lucide-react';
import type{Parcel}from'../types';
import type{FarmGeoContext}from'../types/farmGeo';
import{geoContextSummary,requestFarmGeo}from'../services/farmGeo';
import{fetchFarmMediaEvidence,type FarmMediaEvidenceRow}from'../services/farmMediaEvidence';

type Props={
  parcels:Parcel[];
  onNavigate:(target:string)=>void;
};

type Action={
  id:string;
  title:string;
  detail:string;
  target:string;
  icon:React.ElementType;
  primary?:boolean;
};

const actions:Action[]=[
  {id:'observation',title:'Ta feltbilde',detail:'Dokumenter tre, jord, skade, modenhet eller annet du ser nå.',target:'field_observations',icon:Camera,primary:true},
  {id:'consultant',title:'AI Feltkonsulent',detail:'Analyser et tre med live bilder, gårdshistorikk og GEO.',target:'consultant',icon:Sparkles},
  {id:'pruning',title:'Beskjæring',detail:'Få forsiktige beskjæringsråd og lagre før/etter-fasit.',target:'pruning',icon:Scissors},
  {id:'irrigation',title:'Registrer vanning',detail:'Logg faktisk vanning, varighet og sone.',target:'irrigation_log',icon:Droplets},
  {id:'harvest',title:'Høsting / veiing',detail:'Registrer faktisk høsting og råvareflyt.',target:'production',icon:Wheat},
  {id:'journal',title:'Utført arbeid',detail:'Åpne driftsjournalen og dokumenter gårdssannhet.',target:'farm_journal:timeline',icon:ClipboardCheck},
];

function sourceLabel(value:string){
  const labels:Record<string,string>={
    field_observation:'Feltobservasjon',
    field_consultant:'Feltkonsulent',
    pruning:'Beskjæring',
    pruning_outcome:'Etterkontroll',
    variety_reference:'Sortreferanse',
  };
  return labels[value]||value.replaceAll('_',' ');
}

const FieldModeView:React.FC<Props>=({parcels,onNavigate})=>{
  const[geo,setGeo]=useState<FarmGeoContext|null>(null);
  const[locating,setLocating]=useState(false);
  const[error,setError]=useState('');
  const[media,setMedia]=useState<FarmMediaEvidenceRow[]>([]);
  const[loadingMedia,setLoadingMedia]=useState(false);

  const loadMedia=async()=>{
    setLoadingMedia(true);
    try{setMedia(await fetchFarmMediaEvidence(120));}
    catch(err:any){console.warn('[FieldMode] media',err);}
    finally{setLoadingMedia(false);}
  };

  useEffect(()=>{
    void loadMedia();
    const refresh=()=>void loadMedia();
    window.addEventListener('olivia:farm-truth-updated',refresh as EventListener);
    return()=>window.removeEventListener('olivia:farm-truth-updated',refresh as EventListener);
  },[]);

  const locate=async()=>{
    setLocating(true);setError('');
    try{setGeo(await requestFarmGeo(parcels,'device_at_upload'));}
    catch(err:any){setError(err?.message||'Kunne ikke hente posisjon.');}
    finally{setLocating(false);}
  };

  const currentParcel=geo?.parcelId?parcels.find(parcel=>parcel.id===geo.parcelId):undefined;
  const recent=useMemo(()=>{
    const rows=geo?.parcelId?media.filter(row=>row.parcel_id===geo.parcelId):media;
    return rows.slice(0,6);
  },[media,geo?.parcelId]);

  return <div className="mx-auto max-w-5xl space-y-5 pb-28">
    <div className="relative overflow-hidden rounded-[2rem] border border-green-500/20 bg-[#07100a] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,0.12),transparent_38%)]"/>
      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-green-400">Olivia · Feltmodus</p>
        <h2 className="mt-2 text-3xl font-black text-white">Hva gjør du på gården nå?</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">Få registreringen gjort mens du står i feltet. Live bilder kan GEO-merkes og kobles mot de registrerte parsellpolygonene.</p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
          {!geo?<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-black text-white">Finn parsellen automatisk</p><p className="mt-1 text-xs text-slate-500">Posisjon hentes bare når du trykker. Telefonen/nettleseren spør om tillatelse.</p></div>
            <button onClick={locate} disabled={locating} className="rounded-xl bg-green-500 px-4 py-3 text-xs font-black text-black disabled:opacity-50 flex items-center justify-center gap-2">{locating?<Loader2 size={15} className="animate-spin"/>:<Navigation size={15}/>} Finn hvor jeg står</button>
          </div>:<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-green-400">Aktiv GEO-kontekst</p>
              <p className="mt-1 text-sm font-black text-white">{geoContextSummary(geo)}</p>
              <p className="mt-1 text-[10px] text-slate-500">{geo.matchMethod==='polygon'?'Punktet ligger inne i registrert parsellpolygon.':geo.parcelId?'Parsell er foreslått med redusert geografisk sikkerhet.':'Olivia fant ingen entydig parsell. Velg parsell i den konkrete registreringen.'}</p>
            </div>
            <button onClick={locate} disabled={locating} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 flex items-center gap-2">{locating?<Loader2 size={14} className="animate-spin"/>:<RefreshCcw size={14}/>} Oppdater GPS</button>
          </div>}
          {error&&<p className="mt-3 text-xs text-amber-200">{error}</p>}
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {actions.map(action=>{
        const Icon=action.icon;
        return <button key={action.id} onClick={()=>onNavigate(action.target)} className={'rounded-[1.6rem] border p-5 text-left transition-all active:scale-[0.99] '+(action.primary?'border-[#d9b657]/30 bg-[#d9b657]/[0.07]':'border-white/10 bg-white/[0.025] hover:border-green-500/25')}>
          <div className="flex items-start gap-4">
            <div className={'rounded-2xl p-3 '+(action.primary?'bg-[#d9b657] text-black':'bg-green-500/10 text-green-400')}><Icon size={22}/></div>
            <div><p className="text-base font-black text-white">{action.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{action.detail}</p></div>
          </div>
        </button>;
      })}
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">GEO-hukommelse</p><h3 className="mt-1 text-lg font-black text-white">{currentParcel?'Siste bilder på denne parsellen':'Siste GEO-bilder på gården'}</h3></div>
          <button onClick={()=>onNavigate('map')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 flex items-center gap-2"><Map size={14}/> Kart</button>
        </div>
        {loadingMedia&&!recent.length?<div className="py-8 text-center text-xs text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin" size={18}/>Henter feltbilder…</div>:recent.length?<div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {recent.map(row=><div key={row.id} className="overflow-hidden rounded-xl border border-white/10 bg-black/30">
            <img src={row.media_url} alt="GEO-merket feltbilde" className="h-28 w-full object-cover"/>
            <div className="p-2"><p className="truncate text-[9px] font-black uppercase text-green-300">{sourceLabel(row.source_module)}</p><p className="mt-1 text-[9px] text-slate-600">{String(row.geo_captured_at||row.created_at).slice(0,10)}</p></div>
          </div>)}
        </div>:<div className="py-8 text-center"><Camera className="mx-auto text-slate-700" size={28}/><p className="mt-2 text-sm font-bold text-slate-400">Ingen GEO-bilder ennå</p><p className="mt-1 text-xs text-slate-600">Det første live feltbildet vil starte kart-historikken.</p></div>}
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5">
        <ShieldCheck className="text-green-400" size={21}/>
        <p className="mt-3 text-sm font-black text-white">GEO er evidens, ikke fasit alene</p>
        <p className="mt-2 text-xs leading-5 text-slate-500">GPS kan være unøyaktig mellom nærliggende parseller. Olivia auto-matcher bare når geografien er tydelig. Ved tvil må parsellen bekreftes manuelt.</p>
        <button onClick={()=>onNavigate('map')} className="mt-4 w-full rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-xs font-black text-green-300 flex items-center justify-center gap-2"><MapPin size={14}/> Se på gårdskartet</button>
      </div>
    </div>
  </div>;
};

export default FieldModeView;
