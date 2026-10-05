import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { FarmGeoContext } from '../types/farmGeo';

export type SpatialMemoryObservation={
  id:string;
  parcelId?:string;
  zoneId?:string;
  category:string;
  title:string;
  notes?:string;
  observedAt:string;
  lat:number;
  lon:number;
  accuracyM?:number;
  matchConfidence?:number;
  distanceM:number;
};

function finite(value:unknown):number|undefined{
  const n=Number(value);
  return Number.isFinite(n)?n:undefined;
}

function haversineMeters(a:{lat:number;lon:number},b:{lat:number;lon:number}){
  const r=6371000;
  const toRad=(v:number)=>v*Math.PI/180;
  const dLat=toRad(b.lat-a.lat);
  const dLon=toRad(b.lon-a.lon);
  const lat1=toRad(a.lat);
  const lat2=toRad(b.lat);
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*r*Math.asin(Math.min(1,Math.sqrt(h)));
}

function ageDays(value:string){
  const time=new Date(value).getTime();
  if(!Number.isFinite(time))return null;
  return Math.max(0,Math.floor((Date.now()-time)/86400000));
}

function categoryLabel(value:string){
  const labels:Record<string,string>={
    irrigation:'vanning/drypp',
    tree_health:'trehelse',
    pest:'skadedyr',
    disease:'sykdom/sopp',
    soil:'jord/fukt',
    water:'vann/EC/pH',
    maintenance:'vedlikehold',
    organic_certification:'økologisk kontroll',
    harvest:'høsting/modenhet',
  };
  return labels[value]||value.replaceAll('_',' ');
}

export async function fetchNearbySpatialObservations(input:{
  geo:Pick<FarmGeoContext,'lat'|'lon'>;
  parcelId?:string;
  radiusM?:number;
  limit?:number;
}):Promise<SpatialMemoryObservation[]>{
  if(!isSupabaseConfigured)return[];
  const radiusM=Math.max(10,Math.min(500,input.radiusM??120));
  const limit=Math.max(1,Math.min(20,input.limit??8));

  let query=supabase.from('farm_observations')
    .select('id,parcel_id,zone_id,category,title,notes,observed_at,geo_lat,geo_lon,geo_accuracy_m,geo_match_confidence')
    .not('geo_lat','is',null)
    .not('geo_lon','is',null)
    .order('observed_at',{ascending:false})
    .limit(300);
  if(input.parcelId)query=query.eq('parcel_id',input.parcelId);

  const {data,error}=await query;
  if(error)throw new Error(error.message);

  return(data||[]).flatMap((row:any)=>{
    const lat=finite(row.geo_lat),lon=finite(row.geo_lon);
    if(lat==null||lon==null)return[];
    const distanceM=Math.round(haversineMeters(
      {lat:input.geo.lat,lon:input.geo.lon},
      {lat,lon},
    ));
    if(distanceM>radiusM)return[];
    return[{
      id:String(row.id),
      parcelId:row.parcel_id||undefined,
      zoneId:row.zone_id||undefined,
      category:String(row.category||'other'),
      title:String(row.title||'Feltobservasjon'),
      notes:row.notes?String(row.notes):undefined,
      observedAt:String(row.observed_at),
      lat,lon,
      accuracyM:finite(row.geo_accuracy_m),
      matchConfidence:finite(row.geo_match_confidence),
      distanceM,
    } satisfies SpatialMemoryObservation];
  }).sort((a,b)=>a.distanceM-b.distanceM||new Date(b.observedAt).getTime()-new Date(a.observedAt).getTime())
    .slice(0,limit);
}

export async function buildSpatialMemoryContext(input:{
  geo?:FarmGeoContext|null;
  parcelId?:string;
  radiusM?:number;
}):Promise<string>{
  if(!input.geo)return'';
  const rows=await fetchNearbySpatialObservations({
    geo:input.geo,
    parcelId:input.parcelId||input.geo.parcelId,
    radiusM:input.radiusM??120,
    limit:8,
  });
  if(!rows.length){
    return [
      'GEO ROMLIG HUKOMMELSE:',
      'Ingen tidligere GEO-merkede feltobservasjoner er funnet nær dagens posisjon.',
      'Dette er mangel på historikk, ikke bevis på at området er problemfritt.',
    ].join('\n');
  }

  const lines=[
    'GEO ROMLIG HUKOMMELSE FRA SAMME OMRÅDE:',
    'Dagens GPS-posisjon kan kobles til tidligere observasjoner i nærheten. Historiske forhold er KUN kontekst og må ikke beskrives som dagens tilstand uten nytt visuelt/målt bevis.',
  ];

  for(const row of rows){
    const age=ageDays(row.observedAt);
    const recency=age==null?'ukjent alder':age===0?'i dag':age===1?'1 dag siden':age+' dager siden';
    const note=row.notes?.trim().slice(0,280);
    lines.push(
      '- '+row.distanceM+' m unna · '+recency+' · '+categoryLabel(row.category)+' · '+row.title+
      (note?' · '+note:'')
    );
  }

  lines.push(
    'SPATIAL REGEL: Gjentatte observasjoner på omtrent samme sted kan brukes til å foreslå hva som bør kontrolleres først, men ikke til å hevde at problemet fortsatt finnes. Ny observasjon/måling har alltid forrang.'
  );
  return lines.join('\n').slice(0,7000);
}
