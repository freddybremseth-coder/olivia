import * as turf from '@turf/turf';
import type { Parcel } from '../types';
import type { FarmGeoContext, FarmGeoSource } from '../types/farmGeo';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export type { FarmGeoContext, FarmGeoSource, FarmGeoMatchMethod } from '../types/farmGeo';

type ParcelShape={
  parcel:Parcel;
  polygon?:ReturnType<typeof turf.polygon>;
  center:[number,number];
};

function finite(value:unknown):number|undefined{
  const n=Number(value);
  return Number.isFinite(n)?n:undefined;
}

function parcelCoordinates(parcel:Parcel):Array<[number,number]>{
  const raw=Array.isArray(parcel.coordinates)?parcel.coordinates:[];
  return raw
    .map((coord:any)=>{
      if(!Array.isArray(coord)||coord.length<2)return null;
      const lat=finite(coord[0]),lon=finite(coord[1]);
      return lat!=null&&lon!=null?[lat,lon] as [number,number]:null;
    })
    .filter((coord):coord is [number,number]=>Boolean(coord));
}

function parcelShape(parcel:Parcel):ParcelShape|null{
  const coords=parcelCoordinates(parcel);
  let center:[number,number]|undefined;
  let polygon:ReturnType<typeof turf.polygon>|undefined;

  if(coords.length>=3){
    try{
      const ring=coords.map(([lat,lon])=>[lon,lat] as [number,number]);
      const first=ring[0],last=ring[ring.length-1];
      if(first[0]!==last[0]||first[1]!==last[1])ring.push(first);
      polygon=turf.polygon([ring]);
      const centroid=turf.centerOfMass(polygon);
      center=[centroid.geometry.coordinates[1],centroid.geometry.coordinates[0]];
    }catch{
      polygon=undefined;
    }
  }

  const lat=finite(parcel.lat),lon=finite(parcel.lon);
  if(!center&&lat!=null&&lon!=null)center=[lat,lon];
  if(!center&&coords[0])center=coords[0];
  if(!center)return null;
  return{parcel,polygon,center};
}

function distanceMeters(a:[number,number],b:[number,number]){
  return turf.distance(turf.point([a[1],a[0]]),turf.point([b[1],b[0]]),{units:'kilometers'})*1000;
}

type GeoMemoryAnchor={
  parcel_id:string;
  lat:number;
  lon:number;
  accuracy_m?:number|null;
  match_method:string;
  match_confidence?:number|null;
};

async function matchGeoToSpatialMemory(
  fix:Pick<FarmGeoContext,'lat'|'lon'|'accuracyM'>,
  parcels:Parcel[],
){
  if(!isSupabaseConfigured)return null;
  const {data,error}=await supabase.from('farm_media_evidence')
    .select('parcel_id,lat,lon,accuracy_m,match_method,match_confidence,geo_captured_at')
    .not('parcel_id','is',null)
    .not('lat','is',null)
    .not('lon','is',null)
    .in('match_method',['manual','polygon'])
    .gte('match_confidence',0.8)
    .order('geo_captured_at',{ascending:false,nullsFirst:false})
    .limit(300);
  if(error){
    console.warn('[farmGeo] spatial memory unavailable',error);
    return null;
  }

  const radiusM=Math.max(18,Math.min(60,fix.accuracyM*1.4));
  const anchors=(data||[]) as GeoMemoryAnchor[];
  const nearby=anchors.map(anchor=>({
    anchor,
    distanceM:distanceMeters([fix.lat,fix.lon],[Number(anchor.lat),Number(anchor.lon)]),
  })).filter(item=>item.distanceM<=radiusM);

  if(!nearby.length)return null;

  const byParcel=new Map<string,{count:number;weighted:number;nearest:number;manual:number}>();
  for(const item of nearby){
    const row=byParcel.get(item.anchor.parcel_id)||{count:0,weighted:0,nearest:Number.POSITIVE_INFINITY,manual:0};
    const weight=Math.max(0.1,1-item.distanceM/(radiusM+1))*(item.anchor.match_method==='manual'?1.35:1);
    row.count+=1;
    row.weighted+=weight;
    row.nearest=Math.min(row.nearest,item.distanceM);
    if(item.anchor.match_method==='manual')row.manual+=1;
    byParcel.set(item.anchor.parcel_id,row);
  }

  const ranked=[...byParcel.entries()].sort((a,b)=>b[1].weighted-a[1].weighted||b[1].count-a[1].count);
  const [top,second]=ranked;
  if(!top)return null;
  const [parcelId,stats]=top;
  const strongManual=stats.manual>=1&&stats.nearest<=Math.min(18,radiusM);
  const repeated=stats.count>=2;
  const dominant=!second||stats.weighted>=second[1].weighted*1.7;
  if(!(dominant&&(repeated||strongManual)))return null;

  const parcel=parcels.find(item=>item.id===parcelId);
  if(!parcel)return null;

  const base=strongManual?0.82:0.76;
  const support=Math.min(0.1,Math.max(0,stats.count-2)*0.025);
  const confidence=confidenceFromAccuracy(fix.accuracyM,base+support);

  return{
    parcelId,
    parcelName:parcel.name,
    matchMethod:'spatial_memory' as const,
    matchDistanceM:Math.round(stats.nearest),
    matchConfidence:Math.min(0.92,confidence),
  };
}

function confidenceFromAccuracy(accuracyM:number,base:number){
  if(accuracyM<=10)return Math.min(0.99,base+0.05);
  if(accuracyM<=25)return base;
  if(accuracyM<=50)return Math.max(0.7,base-0.06);
  if(accuracyM<=100)return Math.max(0.55,base-0.14);
  return Math.max(0.35,base-0.25);
}

export function matchGeoToParcels(
  fix:Pick<FarmGeoContext,'lat'|'lon'|'accuracyM'>,
  parcels:Parcel[]
):Pick<FarmGeoContext,'parcelId'|'parcelName'|'matchMethod'|'matchDistanceM'|'matchConfidence'|'ambiguousParcelIds'>{
  const shapes=parcels.map(parcelShape).filter((shape):shape is ParcelShape=>Boolean(shape));
  if(!shapes.length)return{matchMethod:'unmatched',matchConfidence:0};

  const point=turf.point([fix.lon,fix.lat]);
  const inside=shapes.filter(shape=>{
    if(!shape.polygon)return false;
    try{return turf.booleanPointInPolygon(point,shape.polygon,{ignoreBoundary:false});}
    catch{return false;}
  });

  if(inside.length===1){
    const chosen=inside[0];
    return{
      parcelId:chosen.parcel.id,
      parcelName:chosen.parcel.name,
      matchMethod:'polygon',
      matchDistanceM:0,
      matchConfidence:confidenceFromAccuracy(fix.accuracyM,0.94),
    };
  }

  if(inside.length>1){
    return{
      matchMethod:'unmatched',
      matchConfidence:0.35,
      ambiguousParcelIds:inside.map(item=>item.parcel.id),
    };
  }

  const boundaryCandidates=shapes
    .filter(shape=>shape.polygon)
    .map(shape=>{
      try{
        const line=turf.polygonToLine(shape.polygon!);
        const distance=turf.pointToLineDistance(point,line as any,{units:'kilometers'})*1000;
        return{shape,distance};
      }catch{return null;}
    })
    .filter((item):item is {shape:ParcelShape;distance:number}=>Boolean(item))
    .sort((a,b)=>a.distance-b.distance);

  const boundaryThreshold=Math.max(15,Math.min(80,fix.accuracyM*1.25));
  const closeBoundary=boundaryCandidates.filter(item=>item.distance<=boundaryThreshold);
  if(closeBoundary.length===1){
    const chosen=closeBoundary[0];
    return{
      parcelId:chosen.shape.parcel.id,
      parcelName:chosen.shape.parcel.name,
      matchMethod:'boundary_near',
      matchDistanceM:Math.round(chosen.distance),
      matchConfidence:confidenceFromAccuracy(fix.accuracyM,0.72),
    };
  }
  if(closeBoundary.length>1){
    return{
      matchMethod:'unmatched',
      matchConfidence:0.3,
      ambiguousParcelIds:closeBoundary.slice(0,4).map(item=>item.shape.parcel.id),
    };
  }

  const noPolygon=shapes.filter(shape=>!shape.polygon)
    .map(shape=>({shape,distance:distanceMeters([fix.lat,fix.lon],shape.center)}))
    .sort((a,b)=>a.distance-b.distance);
  const nearest=noPolygon[0];
  if(nearest){
    const threshold=Math.max(50,Math.min(150,fix.accuracyM*2));
    const second=noPolygon[1];
    const clearlyNearest=!second||second.distance-nearest.distance>=Math.max(25,fix.accuracyM);
    if(nearest.distance<=threshold&&clearlyNearest){
      return{
        parcelId:nearest.shape.parcel.id,
        parcelName:nearest.shape.parcel.name,
        matchMethod:'nearest',
        matchDistanceM:Math.round(nearest.distance),
        matchConfidence:confidenceFromAccuracy(fix.accuracyM,0.6),
      };
    }
  }

  return{matchMethod:'unmatched',matchConfidence:0};
}

export async function requestFarmGeo(
  parcels:Parcel[],
  source:Extract<FarmGeoSource,'device_live_capture'|'device_at_upload'>='device_live_capture',
):Promise<FarmGeoContext>{
  if(typeof navigator==='undefined'||!navigator.geolocation){
    throw new Error('Denne enheten/nettleseren støtter ikke GPS-posisjon.');
  }

  const position=await new Promise<GeolocationPosition>((resolve,reject)=>{
    navigator.geolocation.getCurrentPosition(resolve,reject,{
      enableHighAccuracy:true,
      timeout:12000,
      maximumAge:source==='device_live_capture'?5000:15000,
    });
  }).catch((error:GeolocationPositionError)=>{
    if(error.code===error.PERMISSION_DENIED)throw new Error('Posisjonstilgang ble ikke gitt. Du kan velge parsell manuelt.');
    if(error.code===error.TIMEOUT)throw new Error('GPS-posisjon tok for lang tid. Prøv igjen ute på gården.');
    throw new Error('Kunne ikke hente GPS-posisjon fra enheten.');
  });

  const lat=position.coords.latitude;
  const lon=position.coords.longitude;
  const accuracyM=Math.max(0,Math.round(position.coords.accuracy||0));
  const base={
    lat,lon,accuracyM,
    altitudeM:position.coords.altitude==null?undefined:Number(position.coords.altitude),
    headingDeg:position.coords.heading==null?undefined:Number(position.coords.heading),
    capturedAt:new Date(position.timestamp||Date.now()).toISOString(),
    source,
  };
  let match=matchGeoToParcels(base,parcels);
  if(match.matchMethod==='unmatched'||(match.matchMethod==='nearest'&&match.matchConfidence<0.7)){
    try{
      const memory=await matchGeoToSpatialMemory(base,parcels);
      if(memory)match=memory;
    }catch(error){
      console.warn('[farmGeo] spatial-memory fallback failed',error);
    }
  }
  return{...base,...match};
}

export function assignGeoParcelManually(
  geo:FarmGeoContext|undefined,
  parcel:Parcel|undefined,
):FarmGeoContext|undefined{
  if(!geo||!parcel)return geo;
  const centerLat=finite(parcel.lat),centerLon=finite(parcel.lon);
  const distance=centerLat!=null&&centerLon!=null
    ?Math.round(distanceMeters([geo.lat,geo.lon],[centerLat,centerLon]))
    :undefined;
  return{
    ...geo,
    parcelId:parcel.id,
    parcelName:parcel.name,
    matchMethod:'manual',
    matchDistanceM:distance,
    matchConfidence:1,
    ambiguousParcelIds:undefined,
  };
}

export function geoContextSummary(geo?:FarmGeoContext|null){
  if(!geo)return'Ingen GEO-posisjon';
  const match=geo.parcelName
    ?geo.parcelName
    :geo.ambiguousParcelIds?.length
      ?'Tvetydig parselltreff'
      :'Ingen sikker parsellmatch';
  const source=geo.matchMethod==='spatial_memory'?' · lært fra bekreftede GEO-punkter':'';
  return match+' · GPS ±'+Math.round(geo.accuracyM)+' m'+source;
}
