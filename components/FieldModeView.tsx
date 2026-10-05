import React,{useEffect,useMemo,useState}from'react';
import{
  Camera,Droplets,Leaf,Loader2,Map,MapPin,RefreshCcw,Scissors,
  Sparkles,Wheat,ClipboardCheck,Navigation,ShieldCheck,Plus,X,Save,Layers
}from'lucide-react';
import type{Parcel}from'../types';
import type{FarmGeoContext}from'../types/farmGeo';
import type{FarmGeoLandmark,FarmGeoLandmarkType,FarmZone,FarmZoneGeoSample,TreeGroup}from'../types/farmIoT';
import{assignGeoParcelManually,geoContextSummary,requestFarmGeo}from'../services/farmGeo';
import{loadActiveFarmGeo,saveActiveFarmGeo}from'../services/farmGeoSession';
import{
  fetchFarmMediaEvidence,
  geoContextToDb,
  type FarmMediaEvidenceRow
}from'../services/farmMediaEvidence';
import{
  fetchFarmGeoLandmarks,
  fetchFarmZones,
  fetchFarmZoneGeoSamples,
  fetchTreeGroups,
  insertFarmZoneGeoSample,
  upsertFarmGeoLandmark,
  upsertFarmZone,
  upsertTreeGroup,
}from'../services/farmIoT';

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

type CreateKind='zone'|'tree_group'|'landmark';

const actions:Action[]=[
  {id:'observation',title:'Ta feltbilde',detail:'Dokumenter tre, jord, skade, modenhet eller annet du ser nå.',target:'field_observations',icon:Camera,primary:true},
  {id:'consultant',title:'AI Feltkonsulent',detail:'Analyser et tre med live bilder, gårdshistorikk og GEO.',target:'consultant',icon:Sparkles},
  {id:'pruning',title:'Beskjæring',detail:'Få forsiktige beskjæringsråd og lagre før/etter-fasit.',target:'pruning',icon:Scissors},
  {id:'irrigation',title:'Registrer vanning',detail:'Logg faktisk vanning, varighet og sone.',target:'irrigation_log',icon:Droplets},
  {id:'harvest',title:'Høsting / veiing',detail:'Registrer faktisk høsting og råvareflyt.',target:'production',icon:Wheat},
  {id:'journal',title:'Utført arbeid',detail:'Åpne driftsjournalen og dokumenter gårdssannhet.',target:'farm_journal:timeline',icon:ClipboardCheck},
];

const LANDMARK_LABELS:Record<FarmGeoLandmarkType,string>={
  well:'Brønn',
  pump:'Pumpe',
  irrigation:'Vanning / dryppunkt',
  access:'Adkomst',
  tree_reference:'Referansetre',
  problem_point:'Problemsted',
  storage:'Lager',
  building:'Bygg',
  other:'Annet punkt',
};

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
  const[geo,setGeo]=useState<FarmGeoContext|null>(()=>loadActiveFarmGeo()?.geo||null);
  const[locating,setLocating]=useState(false);
  const[error,setError]=useState('');
  const[message,setMessage]=useState('');
  const[media,setMedia]=useState<FarmMediaEvidenceRow[]>([]);
  const[loadingMedia,setLoadingMedia]=useState(false);

  const[zones,setZones]=useState<FarmZone[]>([]);
  const[treeGroups,setTreeGroups]=useState<TreeGroup[]>([]);
  const[landmarks,setLandmarks]=useState<FarmGeoLandmark[]>([]);
  const[zoneSamples,setZoneSamples]=useState<FarmZoneGeoSample[]>([]);
  const[loadingStructure,setLoadingStructure]=useState(false);
  const[savingZoneSampleId,setSavingZoneSampleId]=useState<string|null>(null);

  const[createKind,setCreateKind]=useState<CreateKind|null>(null);
  const[createName,setCreateName]=useState('');
  const[createDescription,setCreateDescription]=useState('');
  const[createParcelId,setCreateParcelId]=useState(()=>loadActiveFarmGeo()?.geo.parcelId||'');
  const[createZoneId,setCreateZoneId]=useState('');
  const[createVariety,setCreateVariety]=useState('');
  const[createTreeCount,setCreateTreeCount]=useState('');
  const[createLandmarkType,setCreateLandmarkType]=useState<FarmGeoLandmarkType>('other');
  const[savingStructure,setSavingStructure]=useState(false);

  const currentParcel=geo?.parcelId?parcels.find(parcel=>parcel.id===geo.parcelId):undefined;

  const loadMedia=async()=>{
    setLoadingMedia(true);
    try{setMedia(await fetchFarmMediaEvidence(120));}
    catch(err:any){console.warn('[FieldMode] media',err);}
    finally{setLoadingMedia(false);}
  };

  const loadStructure=async(parcelId?:string)=>{
    setLoadingStructure(true);
    try{
      const zoneRows=await fetchFarmZones(parcelId);
      const groupRows=parcelId
        ?(await Promise.all([
            ...zoneRows.map(zone=>fetchTreeGroups(zone.id)),
            fetchTreeGroups(undefined),
          ])).flat().filter(group=>group.parcel_id===parcelId)
        :await fetchTreeGroups(undefined);
      const byId=new Map<string,TreeGroup>();
      groupRows.forEach(group=>byId.set(group.id,group));
      const [landmarkRows,sampleRows]=await Promise.all([
        fetchFarmGeoLandmarks(parcelId),
        fetchFarmZoneGeoSamples(undefined,parcelId),
      ]);
      setZones(zoneRows);
      setTreeGroups([...byId.values()]);
      setLandmarks(landmarkRows);
      setZoneSamples(sampleRows);
    }catch(err:any){
      console.warn('[FieldMode] structure',err);
      setError(err?.message||'Kunne ikke hente soner og tregrupper.');
    }finally{setLoadingStructure(false);}
  };

  useEffect(()=>{
    void loadMedia();
    void loadStructure(geo?.parcelId||undefined);
    const refresh=()=>{void loadMedia();void loadStructure(geo?.parcelId||undefined);};
    window.addEventListener('olivia:farm-truth-updated',refresh as EventListener);
    return()=>window.removeEventListener('olivia:farm-truth-updated',refresh as EventListener);
  },[geo?.parcelId]);

  const locate=async()=>{
    setLocating(true);setError('');setMessage('');
    try{
      const next=await requestFarmGeo(parcels,'device_at_upload');
      setGeo(next);
      saveActiveFarmGeo(next);
      setCreateParcelId(next.parcelId||'');
      await loadStructure(next.parcelId||undefined);
    }catch(err:any){setError(err?.message||'Kunne ikke hente posisjon.');}
    finally{setLocating(false);}
  };

  const recent=useMemo(()=>{
    const rows=geo?.parcelId?media.filter(row=>row.parcel_id===geo.parcelId):media;
    return rows.slice(0,6);
  },[media,geo?.parcelId]);

  const parcelZones=useMemo(()=>createParcelId?zones.filter(zone=>zone.parcel_id===createParcelId):zones,[zones,createParcelId]);

  const openCreate=(kind:CreateKind)=>{
    setError('');setMessage('');
    setCreateKind(kind);
    setCreateName('');
    setCreateDescription('');
    setCreateParcelId(geo?.parcelId||'');
    setCreateZoneId('');
    setCreateVariety('');
    setCreateTreeCount('');
    setCreateLandmarkType(kind==='landmark'?'other':'other');
  };

  const selectCreateParcel=(parcelId:string)=>{
    setCreateParcelId(parcelId);
    setCreateZoneId('');
    if(geo&&parcelId){
      const parcel=parcels.find(item=>item.id===parcelId);
      if(parcel){
        const corrected=assignGeoParcelManually(geo,parcel)||geo;
        setGeo(corrected);
        saveActiveFarmGeo(corrected);
      }
    }
  };

  const saveStructure=async()=>{
    if(!createKind||!createName.trim()){
      setError('Gi området eller punktet et tydelig navn.');
      return;
    }
    if(!geo){
      setError('Hent GPS-posisjon først. Da lagres strukturen der du faktisk står.');
      return;
    }
    if(!createParcelId){
      setError('Velg parsell før lagring.');
      return;
    }

    setSavingStructure(true);setError('');setMessage('');
    try{
      const dbGeo=geoContextToDb(geo)||{};
      if(createKind==='zone'){
        const zone=await upsertFarmZone({
          id:crypto.randomUUID(),
          parcel_id:createParcelId,
          name:createName.trim(),
          description:createDescription.trim()||undefined,
          anchor_lat:geo.lat,
          anchor_lon:geo.lon,
          anchor_accuracy_m:geo.accuracyM,
          altitude_m:geo.altitudeM==null?undefined:Math.round(geo.altitudeM),
          geo_context:dbGeo,
          status:'watch',
          notes:'Opprettet i Feltmodus fra GEO-posisjon. Operativ sone, ikke juridisk grense.',
        });
        await insertFarmZoneGeoSample({
          zone_id:zone.id,
          parcel_id:createParcelId,
          lat:geo.lat,
          lon:geo.lon,
          accuracy_m:geo.accuracyM,
          altitude_m:geo.altitudeM,
          captured_at:geo.capturedAt,
          source:'zone_creation',
          notes:'Første bekreftede punkt da sonen ble opprettet.',
        });
        setMessage('Sonen er opprettet, og første bekreftede GEO-punkt er lagret.');
      }

      if(createKind==='tree_group'){
        await upsertTreeGroup({
          id:crypto.randomUUID(),
          parcel_id:createParcelId,
          zone_id:createZoneId||undefined,
          name:createName.trim(),
          variety:createVariety.trim()||undefined,
          tree_count:createTreeCount?Math.max(0,Number(createTreeCount)):undefined,
          anchor_lat:geo.lat,
          anchor_lon:geo.lon,
          anchor_accuracy_m:geo.accuracyM,
          geo_context:dbGeo,
          health_status:'watch',
          notes:createDescription.trim()||'Opprettet i Feltmodus fra GEO-posisjon.',
        });
        setMessage('Tregruppen er opprettet på denne GEO-posisjonen.');
      }

      if(createKind==='landmark'){
        await upsertFarmGeoLandmark({
          id:crypto.randomUUID(),
          parcel_id:createParcelId,
          zone_id:createZoneId||undefined,
          landmark_type:createLandmarkType,
          name:createName.trim(),
          description:createDescription.trim()||undefined,
          lat:geo.lat,
          lon:geo.lon,
          accuracy_m:geo.accuracyM,
          altitude_m:geo.altitudeM,
          geo_context:dbGeo,
          status:'active',
        });
        setMessage('Det faste GEO-punktet er lagret.');
      }

      setCreateKind(null);
      await loadStructure(createParcelId);
      window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
    }catch(err:any){
      setError(err?.message||'Kunne ikke lagre gårdsstrukturen.');
    }finally{setSavingStructure(false);}
  };

  const confirmCurrentPointInZone=async(zone:FarmZone)=>{
    if(!geo){
      setError('Hent GPS-posisjon først.');
      return;
    }
    if(geo.parcelId&&geo.parcelId!==zone.parcel_id){
      setError('GPS er koblet til en annen parsell enn sonen. Kontroller parsell før du bekrefter punktet.');
      return;
    }
    setSavingZoneSampleId(zone.id);setError('');setMessage('');
    try{
      await insertFarmZoneGeoSample({
        zone_id:zone.id,
        parcel_id:zone.parcel_id,
        lat:geo.lat,
        lon:geo.lon,
        accuracy_m:geo.accuracyM,
        altitude_m:geo.altitudeM,
        captured_at:geo.capturedAt,
        source:'manual_field_confirmation',
        notes:'Bruker bekreftet i Feltmodus at denne posisjonen tilhører sonen.',
      });
      setMessage('Posisjonen er bekreftet som del av «'+zone.name+'».');
      await loadStructure(zone.parcel_id);
      window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
    }catch(err:any){
      setError(err?.message||'Kunne ikke lagre sonepunktet.');
    }finally{
      setSavingZoneSampleId(null);
    }
  };

  const zoneSampleCount=(zoneId:string)=>zoneSamples.filter(sample=>sample.zone_id===zoneId).length;

  return <div className="mx-auto max-w-5xl space-y-5 pb-28">
    {createKind&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-green-500/20 bg-[#07100a] p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Operativ gårdsgeografi</p>
            <h3 className="mt-1 text-xl font-black text-white">{createKind==='zone'?'Ny sone':createKind==='tree_group'?'Ny tregruppe':'Nytt fast GEO-punkt'}</h3>
            <p className="mt-1 text-xs text-slate-500">GPS ±{Math.round(geo?.accuracyM||0)} m. Dette er driftsstruktur, ikke Catastro/juridisk grense.</p>
          </div>
          <button onClick={()=>setCreateKind(null)} disabled={savingStructure} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400"><X size={18}/></button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="text-xs text-slate-400">Parsell
            <select value={createParcelId} onChange={e=>selectCreateParcel(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white">
              <option value="">Velg parsell</option>
              {parcels.map(parcel=><option key={parcel.id} value={parcel.id}>{parcel.name}</option>)}
            </select>
          </label>
          {(createKind==='tree_group'||createKind==='landmark')&&<label className="text-xs text-slate-400">Sone, valgfritt
            <select value={createZoneId} onChange={e=>setCreateZoneId(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white">
              <option value="">Ingen / hele parsellen</option>
              {parcelZones.map(zone=><option key={zone.id} value={zone.id}>{zone.name}</option>)}
            </select>
          </label>}
          {createKind==='landmark'&&<label className="text-xs text-slate-400">Punkttype
            <select value={createLandmarkType} onChange={e=>setCreateLandmarkType(e.target.value as FarmGeoLandmarkType)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white">
              {Object.entries(LANDMARK_LABELS).map(([value,label])=><option key={value} value={value}>{label}</option>)}
            </select>
          </label>}
          <label className="text-xs text-slate-400">Navn
            <input value={createName} onChange={e=>setCreateName(e.target.value)} placeholder={createKind==='zone'?'f.eks. Unge Gordal nord':createKind==='tree_group'?'f.eks. Genoesa eldre trær':'f.eks. Brønn / pumpe'} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"/>
          </label>
          {createKind==='tree_group'&&<label className="text-xs text-slate-400">Sort, valgfritt
            <input value={createVariety} onChange={e=>setCreateVariety(e.target.value)} placeholder="Gordal, Genovesa, Picual…" className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"/>
          </label>}
          {createKind==='tree_group'&&<label className="text-xs text-slate-400">Antall trær, valgfritt
            <input type="number" min="0" value={createTreeCount} onChange={e=>setCreateTreeCount(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"/>
          </label>}
        </div>

        <label className="mt-3 block text-xs text-slate-400">Beskrivelse / kjennetegn
          <textarea value={createDescription} onChange={e=>setCreateDescription(e.target.value)} placeholder="Vanning, alder, terreng, problemhistorikk eller annet som gjør området lett å kjenne igjen." className="mt-1 min-h-[88px] w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white"/>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={()=>setCreateKind(null)} disabled={savingStructure} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300">Avbryt</button>
          <button onClick={saveStructure} disabled={savingStructure} className="flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-xs font-black text-black disabled:opacity-40">{savingStructure?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Lagre her</button>
        </div>
      </div>
    </div>}

    <div className="relative overflow-hidden rounded-[2rem] border border-green-500/20 bg-[#07100a] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,0.12),transparent_38%)]"/>
      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-green-400">Olivia · Feltmodus</p>
        <h2 className="mt-2 text-3xl font-black text-white">Hva gjør du på gården nå?</h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">Få registreringen gjort mens du står i feltet. Live bilder og operative områder kan GEO-merkes slik at Olivia lærer hvor ting faktisk skjer.</p>

        <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4">
          {!geo?<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-black text-white">Finn parsellen automatisk</p><p className="mt-1 text-xs text-slate-500">Posisjon hentes bare når du trykker. Telefonen/nettleseren spør om tillatelse.</p></div>
            <button onClick={locate} disabled={locating} className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 text-xs font-black text-black disabled:opacity-50">{locating?<Loader2 size={15} className="animate-spin"/>:<Navigation size={15}/>} Finn hvor jeg står</button>
          </div>:<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-green-400">Aktiv GEO-kontekst</p>
              <p className="mt-1 text-sm font-black text-white">{geoContextSummary(geo)}</p>
              <p className="mt-1 text-[10px] text-slate-500">{geo.matchMethod==='polygon'?'Punktet ligger inne i registrert parsellpolygon.':geo.matchMethod==='spatial_memory'?'Parsell er foreslått fra Olivias bekreftede GEO-hukommelse.':geo.parcelId?'Parsell er foreslått med redusert geografisk sikkerhet.':'Olivia fant ingen entydig parsell. Velg parsell ved lagring.'}</p>
            </div>
            <button onClick={locate} disabled={locating} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">{locating?<Loader2 size={14} className="animate-spin"/>:<RefreshCcw size={14}/>} Oppdater GPS</button>
          </div>}
          {error&&<p className="mt-3 text-xs text-amber-200">{error}</p>}
          {message&&<p className="mt-3 text-xs text-green-300">{message}</p>}
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

    <div className="rounded-[2rem] border border-green-500/15 bg-green-500/[0.025] p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Bygg gårdskartet mens du arbeider</p>
          <h3 className="mt-1 text-lg font-black text-white">Operativ struktur på stedet</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">Stå i et område, hent GPS og opprett bare det som faktisk finnes der. Soner og tregrupper kan forbedres senere når flere ekte GEO-punkter er samlet.</p>
        </div>
        {loadingStructure&&<span className="flex items-center gap-2 text-xs text-slate-500"><Loader2 size={13} className="animate-spin"/> Oppdaterer</span>}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button onClick={()=>openCreate('zone')} disabled={!geo} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left disabled:opacity-35"><Layers size={18} className="text-green-400"/><p className="mt-2 text-sm font-black text-white">Ny sone</p><p className="mt-1 text-[10px] text-slate-500">{zones.length} registrert</p></button>
        <button onClick={()=>openCreate('tree_group')} disabled={!geo} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left disabled:opacity-35"><Leaf size={18} className="text-[#d9b657]"/><p className="mt-2 text-sm font-black text-white">Ny tregruppe</p><p className="mt-1 text-[10px] text-slate-500">{treeGroups.length} registrert</p></button>
        <button onClick={()=>openCreate('landmark')} disabled={!geo} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left disabled:opacity-35"><MapPin size={18} className="text-blue-400"/><p className="mt-2 text-sm font-black text-white">Fast punkt</p><p className="mt-1 text-[10px] text-slate-500">{landmarks.length} registrert</p></button>
      </div>

      {!geo&&<p className="mt-3 text-[10px] text-amber-200">Hent GPS først. Olivia skal ikke opprette et GEO-område uten faktisk posisjon.</p>}

      {(zones.length||treeGroups.length||landmarks.length)?<div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Soner</p>
          {zones.slice(0,4).map(zone=><div key={zone.id} className="mt-2 rounded-lg border border-white/5 bg-white/[0.02] p-2">
            <div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-bold text-slate-300">{zone.name}</p><span className="text-[9px] text-slate-600">{zoneSampleCount(zone.id)} punkt</span></div>
            <button onClick={()=>confirmCurrentPointInZone(zone)} disabled={!geo||savingZoneSampleId===zone.id} className="mt-2 w-full rounded-lg border border-green-500/15 bg-green-500/[0.05] px-2 py-1.5 text-[9px] font-black text-green-300 disabled:opacity-35">{savingZoneSampleId===zone.id?'Lagrer…':'Jeg står fortsatt i denne sonen'}</button>
          </div>)}
          {!zones.length&&<p className="mt-1 text-xs text-slate-600">Ingen</p>}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Tregrupper</p>{treeGroups.slice(0,4).map(group=><p key={group.id} className="mt-1 truncate text-xs text-slate-300">{group.name}{group.variety?' · '+group.variety:''}</p>)}{!treeGroups.length&&<p className="mt-1 text-xs text-slate-600">Ingen</p>}</div>
        <div className="rounded-xl border border-white/10 bg-black/15 p-3"><p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Faste punkt</p>{landmarks.slice(0,4).map(point=><p key={point.id} className="mt-1 truncate text-xs text-slate-300">{LANDMARK_LABELS[point.landmark_type]} · {point.name}</p>)}{!landmarks.length&&<p className="mt-1 text-xs text-slate-600">Ingen</p>}</div>
      </div>:null}
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">GEO-hukommelse</p><h3 className="mt-1 text-lg font-black text-white">{currentParcel?'Siste bilder på denne parsellen':'Siste GEO-bilder på gården'}</h3></div>
          <button onClick={()=>onNavigate('map')} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300"><Map size={14}/> Kart</button>
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
        <button onClick={()=>onNavigate('map')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2.5 text-xs font-black text-green-300"><MapPin size={14}/> Se på gårdskartet</button>
      </div>
    </div>
  </div>;
};

export default FieldModeView;
