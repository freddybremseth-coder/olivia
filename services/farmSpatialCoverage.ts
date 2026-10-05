import { supabase, isSupabaseConfigured } from './supabaseClient';

export type SpatialMappingNextAction=
  |'create_zone'
  |'confirm_zone_points'
  |'create_tree_group'
  |'capture_geo_evidence'
  |'add_landmark'
  |'mapped';

export type ParcelSpatialCoverage={
  parcelId:string;
  parcelName:string;
  zoneCount:number;
  footprintZoneCount:number;
  treeGroupCount:number;
  landmarkCount:number;
  geoMediaCount:number;
  observationCount:number;
  score:number;
  nextAction:SpatialMappingNextAction;
  nextActionLabel:string;
  nextActionReason:string;
};

export type FarmSpatialCoverage={
  parcels:ParcelSpatialCoverage[];
  averageScore:number;
  mappedParcels:number;
  totalParcels:number;
  nextParcel?:ParcelSpatialCoverage;
};

function actionFor(input:{
  zoneCount:number;
  footprintZoneCount:number;
  treeGroupCount:number;
  geoMediaCount:number;
  observationCount:number;
  landmarkCount:number;
}):Pick<ParcelSpatialCoverage,'nextAction'|'nextActionLabel'|'nextActionReason'>{
  if(!input.zoneCount)return{
    nextAction:'create_zone',
    nextActionLabel:'Opprett første sone',
    nextActionReason:'Parselen har ingen operativ sone ennå. Start med området du faktisk står i.',
  };
  if(!input.footprintZoneCount)return{
    nextAction:'confirm_zone_points',
    nextActionLabel:'Bekreft sone fra flere steder',
    nextActionReason:'Sonen trenger minst tre bekreftede GEO-punkter før Olivia kan lære et operativt fotavtrykk.',
  };
  if(!input.treeGroupCount)return{
    nextAction:'create_tree_group',
    nextActionLabel:'Registrer første tregruppe',
    nextActionReason:'Koble sort/alder eller annen praktisk tregruppe til riktig sone eller parsell.',
  };
  if(!input.geoMediaCount||!input.observationCount)return{
    nextAction:'capture_geo_evidence',
    nextActionLabel:'Ta GEO-feltbilde',
    nextActionReason:'Minst én fersk feltobservasjon med GEO gjør kartstrukturen nyttig som faktisk gårdshistorikk.',
  };
  if(!input.landmarkCount)return{
    nextAction:'add_landmark',
    nextActionLabel:'Legg inn fast punkt ved behov',
    nextActionReason:'Fast punkt er valgfritt, men nyttig for brønn, pumpe, adkomst, dryppunkt eller referansetre.',
  };
  return{
    nextAction:'mapped',
    nextActionLabel:'Grunnkartlegging på plass',
    nextActionReason:'Parselen har operativ sone, sonefotavtrykk, tregruppe og GEO-evidens.',
  };
}

function scoreCoverage(input:{
  zoneCount:number;
  footprintZoneCount:number;
  treeGroupCount:number;
  geoMediaCount:number;
  observationCount:number;
  landmarkCount:number;
}){
  let score=0;
  if(input.zoneCount)score+=25;
  if(input.footprintZoneCount)score+=25;
  if(input.treeGroupCount)score+=20;
  if(input.geoMediaCount)score+=10;
  if(input.observationCount)score+=10;
  if(input.landmarkCount)score+=10;
  return Math.min(100,score);
}

export async function fetchFarmSpatialCoverage():Promise<FarmSpatialCoverage>{
  if(!isSupabaseConfigured)return{parcels:[],averageScore:0,mappedParcels:0,totalParcels:0};

  const [parcelRes,zoneRes,sampleRes,groupRes,landmarkRes,mediaRes,observationRes]=await Promise.all([
    supabase.from('parcels').select('id,name').order('name',{ascending:true}),
    supabase.from('farm_zones').select('id,parcel_id'),
    supabase.from('farm_zone_geo_samples').select('zone_id,parcel_id'),
    supabase.from('tree_groups').select('id,parcel_id'),
    supabase.from('farm_geo_landmarks').select('id,parcel_id').eq('status','active'),
    supabase.from('farm_media_evidence').select('id,parcel_id').not('lat','is',null).not('lon','is',null),
    supabase.from('farm_observations').select('id,parcel_id'),
  ]);

  const error=parcelRes.error||zoneRes.error||sampleRes.error||groupRes.error||landmarkRes.error||mediaRes.error||observationRes.error;
  if(error)throw new Error(error.message);

  const zones=(zoneRes.data||[]) as Array<{id:string;parcel_id:string}>;
  const samples=(sampleRes.data||[]) as Array<{zone_id:string;parcel_id:string}>;
  const groups=(groupRes.data||[]) as Array<{id:string;parcel_id:string}>;
  const landmarks=(landmarkRes.data||[]) as Array<{id:string;parcel_id:string|null}>;
  const media=(mediaRes.data||[]) as Array<{id:string;parcel_id:string|null}>;
  const observations=(observationRes.data||[]) as Array<{id:string;parcel_id:string|null}>;

  const sampleCounts=new Map<string,number>();
  for(const sample of samples)sampleCounts.set(sample.zone_id,(sampleCounts.get(sample.zone_id)||0)+1);

  const rows:ParcelSpatialCoverage[]=((parcelRes.data||[]) as Array<{id:string;name:string}>).map(parcel=>{
    const parcelZones=zones.filter(zone=>zone.parcel_id===parcel.id);
    const footprintZoneCount=parcelZones.filter(zone=>(sampleCounts.get(zone.id)||0)>=3).length;
    const input={
      zoneCount:parcelZones.length,
      footprintZoneCount,
      treeGroupCount:groups.filter(group=>group.parcel_id===parcel.id).length,
      landmarkCount:landmarks.filter(item=>item.parcel_id===parcel.id).length,
      geoMediaCount:media.filter(item=>item.parcel_id===parcel.id).length,
      observationCount:observations.filter(item=>item.parcel_id===parcel.id).length,
    };
    const action=actionFor(input);
    return{
      parcelId:parcel.id,
      parcelName:parcel.name||parcel.id,
      ...input,
      score:scoreCoverage(input),
      ...action,
    };
  }).sort((a,b)=>a.score-b.score||a.parcelName.localeCompare(b.parcelName,'no'));

  const averageScore=rows.length?Math.round(rows.reduce((sum,row)=>sum+row.score,0)/rows.length):0;
  const mappedParcels=rows.filter(row=>row.score>=90).length;
  const nextParcel=rows.find(row=>row.nextAction!=='mapped');

  return{
    parcels:rows,
    averageScore,
    mappedParcels,
    totalParcels:rows.length,
    nextParcel,
  };
}
