import type { FarmGeoLandmark, FarmZone, FarmZoneGeoSample, TreeGroup } from '../types/farmIoT';
import { insertFarmZoneGeoSample, upsertFarmGeoLandmark, upsertFarmZone, upsertTreeGroup } from './farmIoT';

const DB_NAME='olivia-spatial-offline';
const DB_VERSION=1;
const STORE='spatial_operations';

export type QueuedSpatialOperation=
  |{
    id:string;
    kind:'zone_create';
    createdAt:string;
    updatedAt:string;
    attempts:number;
    lastError?:string;
    zone:FarmZone;
    firstSample:FarmZoneGeoSample;
  }
  |{
    id:string;
    kind:'tree_group_create';
    createdAt:string;
    updatedAt:string;
    attempts:number;
    lastError?:string;
    treeGroup:TreeGroup;
  }
  |{
    id:string;
    kind:'landmark_create';
    createdAt:string;
    updatedAt:string;
    attempts:number;
    lastError?:string;
    landmark:FarmGeoLandmark;
  }
  |{
    id:string;
    kind:'zone_sample';
    createdAt:string;
    updatedAt:string;
    attempts:number;
    lastError?:string;
    sample:FarmZoneGeoSample;
  };

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){
      reject(new Error('Lokal offline-lagring er ikke tilgjengelig i denne nettleseren.'));
      return;
    }
    const request=indexedDB.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STORE)){
        const store=db.createObjectStore(STORE,{keyPath:'id'});
        store.createIndex('createdAt','createdAt',{unique:false});
      }
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Kunne ikke åpne lokal GEO-kø.'));
  });
}

async function withStore<T>(
  mode:IDBTransactionMode,
  run:(store:IDBObjectStore,resolve:(value:T)=>void,reject:(reason?:unknown)=>void)=>void,
):Promise<T>{
  const db=await openDb();
  return new Promise<T>((resolve,reject)=>{
    const tx=db.transaction(STORE,mode);
    const store=tx.objectStore(STORE);
    let settled=false;
    const ok=(value:T)=>{if(!settled){settled=true;resolve(value);}};
    const fail=(reason?:unknown)=>{if(!settled){settled=true;reject(reason);}};
    tx.onabort=()=>fail(tx.error||new Error('Lokal GEO-kø ble avbrutt.'));
    tx.onerror=()=>fail(tx.error||new Error('Feil i lokal GEO-kø.'));
    tx.oncomplete=()=>db.close();
    run(store,ok,fail);
  });
}

export async function queueSpatialOperation(item:QueuedSpatialOperation){
  item.updatedAt=new Date().toISOString();
  await withStore<void>('readwrite',(store,resolve,reject)=>{
    const req=store.put(item);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

export async function listQueuedSpatialOperations():Promise<QueuedSpatialOperation[]>{
  return withStore<QueuedSpatialOperation[]>('readonly',(store,resolve,reject)=>{
    const req=store.getAll();
    req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))));
    req.onerror=()=>reject(req.error);
  });
}

export async function removeQueuedSpatialOperation(id:string){
  await withStore<void>('readwrite',(store,resolve,reject)=>{
    const req=store.delete(id);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

async function updateQueuedSpatialOperation(id:string,patch:Partial<QueuedSpatialOperation>){
  const current=(await listQueuedSpatialOperations()).find(item=>item.id===id);
  if(!current)return;
  await queueSpatialOperation({...current,...patch,updatedAt:new Date().toISOString()} as QueuedSpatialOperation);
}

export async function syncQueuedSpatialOperation(item:QueuedSpatialOperation){
  try{
    if(item.kind==='zone_create'){
      await upsertFarmZone(item.zone);
      await insertFarmZoneGeoSample(item.firstSample);
    }else if(item.kind==='tree_group_create'){
      await upsertTreeGroup(item.treeGroup);
    }else if(item.kind==='landmark_create'){
      await upsertFarmGeoLandmark(item.landmark);
    }else if(item.kind==='zone_sample'){
      await insertFarmZoneGeoSample(item.sample);
    }
    await removeQueuedSpatialOperation(item.id);
    window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
  }catch(error:any){
    await updateQueuedSpatialOperation(item.id,{
      attempts:(item.attempts||0)+1,
      lastError:error?.message||String(error),
    }).catch(()=>undefined);
    throw error;
  }
}

export async function syncPendingSpatialOperations(){
  const items=await listQueuedSpatialOperations();
  if(typeof navigator!=='undefined'&&!navigator.onLine){
    return{synced:0,failed:0,pending:items.length};
  }
  let synced=0,failed=0;
  for(const item of items){
    try{
      await syncQueuedSpatialOperation(item);
      synced++;
    }catch{
      failed++;
      break;
    }
  }
  return{synced,failed,pending:Math.max(0,items.length-synced)};
}

export function mergeSpatialQueueOverlay(input:{
  zones:FarmZone[];
  treeGroups:TreeGroup[];
  landmarks:FarmGeoLandmark[];
  samples:FarmZoneGeoSample[];
  operations:QueuedSpatialOperation[];
}){
  const zoneMap=new Map(input.zones.map(item=>[item.id,item]));
  const groupMap=new Map(input.treeGroups.map(item=>[item.id,item]));
  const landmarkMap=new Map(input.landmarks.map(item=>[item.id,item]));
  const sampleMap=new Map(input.samples.map(item=>[item.id,item]));

  for(const op of input.operations){
    if(op.kind==='zone_create'){
      zoneMap.set(op.zone.id,op.zone);
      sampleMap.set(op.firstSample.id,op.firstSample);
    }else if(op.kind==='tree_group_create'){
      groupMap.set(op.treeGroup.id,op.treeGroup);
    }else if(op.kind==='landmark_create'){
      landmarkMap.set(op.landmark.id,op.landmark);
    }else if(op.kind==='zone_sample'){
      sampleMap.set(op.sample.id,op.sample);
    }
  }
  return{
    zones:[...zoneMap.values()],
    treeGroups:[...groupMap.values()],
    landmarks:[...landmarkMap.values()],
    samples:[...sampleMap.values()],
  };
}
