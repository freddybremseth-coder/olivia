import type { FarmGeoContext } from '../types/farmGeo';

const STORAGE_KEY='olivia.activeFarmGeo.v1';
export const ACTIVE_FARM_GEO_MAX_AGE_MS=5*60*1000;

export type ActiveFarmGeoSession={
  geo:FarmGeoContext;
  savedAt:string;
};

export function saveActiveFarmGeo(geo:FarmGeoContext){
  if(typeof window==='undefined')return;
  try{
    const payload:ActiveFarmGeoSession={geo,savedAt:new Date().toISOString()};
    window.sessionStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('olivia:active-farm-geo-updated',{detail:payload}));
  }catch(error){
    console.warn('[farmGeoSession] save failed',error);
  }
}

export function loadActiveFarmGeo(maxAgeMs=ACTIVE_FARM_GEO_MAX_AGE_MS):ActiveFarmGeoSession|null{
  if(typeof window==='undefined')return null;
  try{
    const raw=window.sessionStorage.getItem(STORAGE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw) as ActiveFarmGeoSession;
    if(!parsed?.geo||!parsed.savedAt)return null;
    const age=Date.now()-new Date(parsed.savedAt).getTime();
    if(!Number.isFinite(age)||age<0||age>maxAgeMs){
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  }catch{
    return null;
  }
}

export function clearActiveFarmGeo(){
  if(typeof window==='undefined')return;
  try{
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('olivia:active-farm-geo-cleared'));
  }catch{}
}

export function activeFarmGeoAgeMinutes(session:ActiveFarmGeoSession|null){
  if(!session)return null;
  const age=Date.now()-new Date(session.savedAt).getTime();
  if(!Number.isFinite(age))return null;
  return Math.max(0,Math.round(age/60000));
}
