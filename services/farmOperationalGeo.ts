import * as turf from '@turf/turf';
import type { FarmGeoContext } from '../types/farmGeo';
import type { FarmZone, FarmZoneGeoSample, TreeGroup } from '../types/farmIoT';
import { fetchFarmZoneGeoSamples, fetchFarmZones, fetchTreeGroups } from './farmIoT';

export type OperationalGeoMatchMethod='footprint'|'nearest_sample'|'anchor'|'nearest_anchor'|'ambiguous'|'none';

export type OperationalGeoSuggestion={
  zoneId?:string;
  zoneName?:string;
  zoneConfidence:number;
  zoneMethod:OperationalGeoMatchMethod;
  zoneDistanceM?:number;
  treeGroupId?:string;
  treeGroupName?:string;
  treeGroupConfidence:number;
  treeGroupMethod:OperationalGeoMatchMethod;
  treeGroupDistanceM?:number;
  ambiguousZoneIds?:string[];
  ambiguousTreeGroupIds?:string[];
  reasons:string[];
};

function finite(value:unknown):number|undefined{
  const n=Number(value);
  return Number.isFinite(n)?n:undefined;
}

function distanceM(geo:Pick<FarmGeoContext,'lat'|'lon'>,lat:number,lon:number){
  return turf.distance(
    turf.point([geo.lon,geo.lat]),
    turf.point([lon,lat]),
    {units:'kilometers'},
  )*1000;
}

function confidenceFromDistance(distance:number,accuracy:number,base:number){
  const accuracyPenalty=accuracy<=10?0:accuracy<=25?0.04:accuracy<=50?0.10:0.2;
  const distancePenalty=Math.min(0.28,distance/180);
  return Math.max(0.35,Math.min(0.99,base-accuracyPenalty-distancePenalty));
}

function zoneFootprint(samples:FarmZoneGeoSample[]){
  if(samples.length<3)return null;
  try{
    const points=samples
      .map(sample=>[finite(sample.lon),finite(sample.lat)] as const)
      .filter((coord):coord is readonly [number,number]=>coord[0]!=null&&coord[1]!=null)
      .map(([lon,lat])=>turf.point([lon,lat]));
    if(points.length<3)return null;
    return turf.convex(turf.featureCollection(points));
  }catch{
    return null;
  }
}

function nearestDistinct<T extends {id:string;lat:number;lon:number}>(
  geo:Pick<FarmGeoContext,'lat'|'lon'>,
  rows:T[],
){
  return rows.map(row=>({...row,distanceM:distanceM(geo,row.lat,row.lon)}))
    .sort((a,b)=>a.distanceM-b.distanceM);
}

export async function suggestOperationalContextForGeo(input:{
  geo:FarmGeoContext;
  parcelId:string;
}):Promise<OperationalGeoSuggestion>{
  const reasons:string[]=[];
  const [zones,allGroups,samples]=await Promise.all([
    fetchFarmZones(input.parcelId),
    fetchTreeGroups(undefined),
    fetchFarmZoneGeoSamples(undefined,input.parcelId),
  ]);
  const groups=allGroups.filter(group=>group.parcel_id===input.parcelId);
  const samplesByZone=new Map<string,FarmZoneGeoSample[]>();
  for(const sample of samples){
    const rows=samplesByZone.get(sample.zone_id)||[];
    rows.push(sample);
    samplesByZone.set(sample.zone_id,rows);
  }

  const point=turf.point([input.geo.lon,input.geo.lat]);
  const footprintMatches=zones.flatMap(zone=>{
    const footprint=zoneFootprint(samplesByZone.get(zone.id)||[]);
    if(!footprint)return[];
    try{
      return turf.booleanPointInPolygon(point,footprint,{ignoreBoundary:false})?[zone]:[];
    }catch{return[];}
  });

  let zoneId:string|undefined;
  let zoneName:string|undefined;
  let zoneConfidence=0;
  let zoneMethod:OperationalGeoMatchMethod='none';
  let zoneDistanceM:number|undefined;
  let ambiguousZoneIds:string[]|undefined;

  if(footprintMatches.length===1){
    const zone=footprintMatches[0];
    zoneId=zone.id;
    zoneName=zone.name;
    zoneConfidence=input.geo.accuracyM<=25?0.96:input.geo.accuracyM<=50?0.9:0.82;
    zoneMethod='footprint';
    zoneDistanceM=0;
    reasons.push('GPS-punktet ligger inne i ett entydig operativt sonefotavtrykk.');
  }else if(footprintMatches.length>1){
    zoneMethod='ambiguous';
    ambiguousZoneIds=footprintMatches.map(zone=>zone.id);
    reasons.push('GPS-punktet ligger i flere operative sonefotavtrykk. Sone må velges manuelt.');
  }else{
    const zoneCandidates:Array<{id:string;name:string;lat:number;lon:number;source:'sample'|'anchor'}>=[];
    for(const zone of zones){
      const zoneSamples=samplesByZone.get(zone.id)||[];
      for(const sample of zoneSamples){
        const lat=finite(sample.lat),lon=finite(sample.lon);
        if(lat!=null&&lon!=null)zoneCandidates.push({id:zone.id,name:zone.name,lat,lon,source:'sample'});
      }
      if(!zoneSamples.length){
        const lat=finite(zone.anchor_lat),lon=finite(zone.anchor_lon);
        if(lat!=null&&lon!=null)zoneCandidates.push({id:zone.id,name:zone.name,lat,lon,source:'anchor'});
      }
    }

    const nearest=nearestDistinct(input.geo,zoneCandidates);
    const best=nearest[0];
    const secondDifferent=nearest.find(item=>item.id!==best?.id);
    if(best){
      const threshold=Math.max(15,Math.min(65,input.geo.accuracyM*1.4));
      const separation=Math.max(15,input.geo.accuracyM*0.9);
      const clearlyNearest=!secondDifferent||secondDifferent.distanceM-best.distanceM>=separation;
      if(best.distanceM<=threshold&&clearlyNearest){
        zoneId=best.id;
        zoneName=best.name;
        zoneMethod=best.source==='sample'?'nearest_sample':'anchor';
        zoneDistanceM=Math.round(best.distanceM);
        zoneConfidence=confidenceFromDistance(best.distanceM,input.geo.accuracyM,best.source==='sample'?0.92:0.82);
        reasons.push('Nærmeste bekreftede '+(best.source==='sample'?'sonepunkt':'soneanker')+' er entydig.');
      }else if(best.distanceM<=threshold&&!clearlyNearest){
        zoneMethod='ambiguous';
        ambiguousZoneIds=Array.from(new Set(nearest.filter(item=>item.distanceM<=best.distanceM+separation).map(item=>item.id))).slice(0,4);
        reasons.push('Flere soner ligger for tett til at GPS kan velge sikkert.');
      }else{
        reasons.push('Ingen registrert sone ligger nær nok dagens GPS-posisjon for automatisk forslag.');
      }
    }
  }

  let treeGroupId:string|undefined;
  let treeGroupName:string|undefined;
  let treeGroupConfidence=0;
  let treeGroupMethod:OperationalGeoMatchMethod='none';
  let treeGroupDistanceM:number|undefined;
  let ambiguousTreeGroupIds:string[]|undefined;

  const candidateGroups=(zoneId?groups.filter(group=>group.zone_id===zoneId):groups)
    .flatMap(group=>{
      const lat=finite(group.anchor_lat),lon=finite(group.anchor_lon);
      return lat!=null&&lon!=null?[{id:group.id,name:group.name,lat,lon}]:[];
    });

  const nearestGroups=nearestDistinct(input.geo,candidateGroups);
  const bestGroup=nearestGroups[0];
  const secondGroup=nearestGroups[1];
  if(bestGroup){
    const threshold=Math.max(10,Math.min(40,input.geo.accuracyM*1.15));
    const separation=Math.max(10,input.geo.accuracyM*0.75);
    const clearlyNearest=!secondGroup||secondGroup.distanceM-bestGroup.distanceM>=separation;
    if(bestGroup.distanceM<=threshold&&clearlyNearest){
      treeGroupId=bestGroup.id;
      treeGroupName=bestGroup.name;
      treeGroupMethod='nearest_anchor';
      treeGroupDistanceM=Math.round(bestGroup.distanceM);
      treeGroupConfidence=confidenceFromDistance(bestGroup.distanceM,input.geo.accuracyM,0.9);
      reasons.push('Én tregruppe har et tydelig nærmeste GEO-anker.');
    }else if(bestGroup.distanceM<=threshold&&!clearlyNearest){
      treeGroupMethod='ambiguous';
      ambiguousTreeGroupIds=nearestGroups
        .filter(item=>item.distanceM<=bestGroup.distanceM+separation)
        .map(item=>item.id)
        .slice(0,4);
      reasons.push('Flere tregrupper ligger for tett til sikker automatisk matching.');
    }
  }

  return{
    zoneId,zoneName,zoneConfidence,zoneMethod,zoneDistanceM,
    treeGroupId,treeGroupName,treeGroupConfidence,treeGroupMethod,treeGroupDistanceM,
    ambiguousZoneIds,ambiguousTreeGroupIds,reasons,
  };
}

export function shouldAutoApplyZone(suggestion:OperationalGeoSuggestion){
  return Boolean(
    suggestion.zoneId
    && suggestion.zoneConfidence>=0.85
    && suggestion.zoneMethod!=='ambiguous'
  );
}

export function shouldAutoApplyTreeGroup(suggestion:OperationalGeoSuggestion){
  return Boolean(
    suggestion.treeGroupId
    && suggestion.treeGroupConfidence>=0.85
    && suggestion.treeGroupMethod!=='ambiguous'
  );
}
