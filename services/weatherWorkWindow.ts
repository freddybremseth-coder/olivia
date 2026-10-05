import { BIAR_DEFAULT_COORDS } from './oliviaAppDefaults';

export type WorkActivity='spraying'|'pruning'|'harvest'|'irrigation'|'inspection';
export type WeatherFitLevel='good'|'caution'|'poor'|'unknown';

export type WorkWindowDay={
  date:string;
  rainMm:number;
  rainProbability:number;
  windKmh:number;
  tempMin?:number;
  tempMax?:number;
};

export type WeatherFit={
  activity:WorkActivity;
  level:WeatherFitLevel;
  date?:string;
  label:string;
  reason:string;
  score:number;
  day?:WorkWindowDay;
};

export type WorkWindowForecast={
  fetchedAt:string;
  source:'Open-Meteo';
  days:WorkWindowDay[];
};

function weatherUrl(params:Record<string,string|number>){
  const search=new URLSearchParams({endpoint:'forecast'});
  Object.entries(params).forEach(([key,value])=>search.set(key,String(value)));
  return'/api/weather/open-meteo?'+search.toString();
}

export async function fetchWorkWindowForecast(params:{lat?:number;lon?:number;days?:number}={}):Promise<WorkWindowForecast>{
  const lat=params.lat??BIAR_DEFAULT_COORDS.lat;
  const lon=params.lon??BIAR_DEFAULT_COORDS.lon;
  const days=Math.max(3,Math.min(7,params.days??5));
  const response=await fetch(weatherUrl({
    latitude:lat,
    longitude:lon,
    daily:'precipitation_sum,precipitation_probability_max,wind_speed_10m_max,temperature_2m_min,temperature_2m_max',
    timezone:'auto',
    forecast_days:days,
  }),{headers:{Accept:'application/json'}});
  if(!response.ok)throw new Error('Arbeidsvindu-vær kunne ikke hentes ('+response.status+').');
  const json=await response.json();
  const daily=json?.daily;
  if(!Array.isArray(daily?.time))throw new Error('Arbeidsvindu mangler daglig værdata.');
  return{
    fetchedAt:new Date().toISOString(),
    source:'Open-Meteo',
    days:daily.time.map((date:string,index:number)=>({
      date,
      rainMm:Number(daily.precipitation_sum?.[index]??0),
      rainProbability:Number(daily.precipitation_probability_max?.[index]??0),
      windKmh:Number(daily.wind_speed_10m_max?.[index]??0),
      tempMin:Number.isFinite(Number(daily.temperature_2m_min?.[index]))?Number(daily.temperature_2m_min[index]):undefined,
      tempMax:Number.isFinite(Number(daily.temperature_2m_max?.[index]))?Number(daily.temperature_2m_max[index]):undefined,
    })),
  };
}

function fitForDay(activity:WorkActivity,day:WorkWindowDay):WeatherFit{
  let score=100;
  const reasons:string[]=[];
  let level:WeatherFitLevel='good';

  const caution=(points:number,reason:string)=>{
    score-=points;
    reasons.push(reason);
    if(level==='good')level='caution';
  };
  const poor=(points:number,reason:string)=>{
    score-=points;
    reasons.push(reason);
    level='poor';
  };

  if(activity==='spraying'){
    if(day.rainMm>=1||day.rainProbability>=50)poor(60,'regn eller høy regnsannsynlighet');
    else if(day.rainMm>0||day.rainProbability>=25)caution(30,'mulig nedbør');
    if(day.windKmh>=20)poor(50,'for mye vind for et robust sprøytevindu');
    else if(day.windKmh>=15)caution(25,'vinden er nær forsiktig grense');
    if(!reasons.length)reasons.push('lite regn og moderat vind');
  }

  if(activity==='pruning'){
    if(day.rainMm>=5)poor(45,'vått/regnfullt arbeidsvindu');
    else if(day.rainMm>=1||day.rainProbability>=50)caution(22,'fuktig eller mulig regn');
    if(day.windKmh>=40)poor(35,'kraftig vind');
    else if(day.windKmh>=30)caution(18,'en del vind');
    if(!reasons.length)reasons.push('tørt og håndterbart vær');
  }

  if(activity==='harvest'){
    if(day.rainMm>=5)poor(55,'regn kan påvirke innhøsting, tilgang og logistikk');
    else if(day.rainMm>=1||day.rainProbability>=50)caution(25,'mulig regn rundt høsting');
    if(day.windKmh>=45)poor(30,'kraftig vind');
    else if(day.windKmh>=30)caution(12,'vind kan gjøre feltarbeid mindre effektivt');
    if(!reasons.length)reasons.push('tørt vær og gode feltforhold');
  }

  if(activity==='irrigation'){
    if(day.rainMm>=8)poor(60,'betydelig regn er varslet');
    else if(day.rainMm>=3||day.rainProbability>=60)caution(35,'regn kan redusere vanningsbehovet');
    else if(day.rainMm>0)caution(15,'noe nedbør er varslet');
    if(!reasons.length)reasons.push('lite varslet regn');
  }

  if(activity==='inspection'){
    if(day.rainMm>=12)poor(45,'kraftig regn gjør feltkontroll mindre egnet');
    else if(day.rainMm>=4)caution(20,'regn kan gjøre feltkontroll vanskeligere');
    if(day.windKmh>=50)poor(35,'kraftig vind');
    else if(day.windKmh>=35)caution(15,'en del vind');
    if(!reasons.length)reasons.push('greie forhold for feltkontroll');
  }

  return{
    activity,
    level,
    date:day.date,
    label:activityLabel(activity),
    reason:reasons.join(' · '),
    score:Math.max(0,score),
    day,
  };
}

export function activityLabel(activity:WorkActivity){
  const labels:Record<WorkActivity,string>={
    spraying:'Sprøyting / behandling',
    pruning:'Beskjæring',
    harvest:'Høsting',
    irrigation:'Vanning',
    inspection:'Feltkontroll',
  };
  return labels[activity];
}

export function bestWorkWindow(activity:WorkActivity,forecast:WorkWindowForecast|null|undefined):WeatherFit{
  if(!forecast?.days?.length)return{
    activity,level:'unknown',label:activityLabel(activity),reason:'Værgrunnlag mangler.',score:0,
  };
  return forecast.days
    .map(day=>fitForDay(activity,day))
    .sort((a,b)=>b.score-a.score||String(a.date).localeCompare(String(b.date)))[0];
}

export function workActivitiesForContext(params:{
  yearWheel?:Array<{activity_type?:string;status?:string;target_year?:number;target_month?:number;target_day?:number|null}>;
  includeIrrigation?:boolean;
  now?:Date;
}):WorkActivity[]{
  const result=new Set<WorkActivity>();
  const now=params.now??new Date();
  const today=new Date(now);today.setHours(12,0,0,0);
  const horizon=new Date(today);horizon.setDate(horizon.getDate()+14);

  for(const item of params.yearWheel||[]){
    if(['done','skipped','suggested'].includes(String(item.status||'')))continue;
    const raw=String(item.activity_type||'').toLowerCase();
    let activity:WorkActivity|undefined;
    if(['spraying','pest_control','disease_control'].includes(raw))activity='spraying';
    else if(['pruning','desuckering','young_tree_care'].includes(raw))activity='pruning';
    else if(raw==='harvest')activity='harvest';
    else if(raw==='irrigation')activity='irrigation';
    else if(['inspection','maintenance'].includes(raw))activity='inspection';
    if(!activity)continue;

    if(item.target_day&&item.target_year&&item.target_month){
      const date=new Date(item.target_year,item.target_month-1,item.target_day,12);
      if(date>=today&&date<=horizon)result.add(activity);
      continue;
    }
    if(item.target_year===today.getFullYear()&&item.target_month&&(item.target_month===today.getMonth()+1||item.target_month===today.getMonth()+2))result.add(activity);
  }

  const month=today.getMonth()+1;
  if(month>=10&&month<=12)result.add('harvest');
  if(month<=2)result.add('pruning');
  if(params.includeIrrigation)result.add('irrigation');
  result.add('inspection');

  return Array.from(result).slice(0,4);
}
