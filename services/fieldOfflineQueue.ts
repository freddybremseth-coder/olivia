import type { FarmObservation } from '../types/farmIoT';
import type { FarmGeoContext } from '../types/farmGeo';
import { insertFarmObservation } from './farmIoT';
import { registerFarmMediaEvidence, uploadDataUrlFarmMedia } from './farmMediaEvidence';

const DB_NAME='olivia-field-offline';
const DB_VERSION=1;
const STORE='field_observations';

export type QueuedFieldObservation={
  id:string;
  createdAt:string;
  updatedAt:string;
  attempts:number;
  lastError?:string;
  observation:Omit<FarmObservation,'id'|'image_urls'>;
  imageDataUrls:string[];
  uploadedUrls?:string[];
  geo?:FarmGeoContext|null;
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
    request.onerror=()=>reject(request.error||new Error('Kunne ikke åpne lokal feltkø.'));
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
    tx.onabort=()=>fail(tx.error||new Error('Lokal feltkø ble avbrutt.'));
    tx.onerror=()=>fail(tx.error||new Error('Feil i lokal feltkø.'));
    tx.oncomplete=()=>db.close();
    run(store,ok,fail);
  });
}

export async function queueFieldObservation(item:QueuedFieldObservation){
  item.updatedAt=new Date().toISOString();
  await withStore<void>('readwrite',(store,resolve,reject)=>{
    const req=store.put(item);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

export async function listQueuedFieldObservations():Promise<QueuedFieldObservation[]>{
  return withStore<QueuedFieldObservation[]>('readonly',(store,resolve,reject)=>{
    const req=store.getAll();
    req.onsuccess=()=>resolve((req.result||[]).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt))));
    req.onerror=()=>reject(req.error);
  });
}

export async function removeQueuedFieldObservation(id:string){
  await withStore<void>('readwrite',(store,resolve,reject)=>{
    const req=store.delete(id);
    req.onsuccess=()=>resolve();
    req.onerror=()=>reject(req.error);
  });
}

async function updateQueueItem(id:string,patch:Partial<QueuedFieldObservation>){
  const current=(await listQueuedFieldObservations()).find(item=>item.id===id);
  if(!current)return;
  await queueFieldObservation({...current,...patch,updatedAt:new Date().toISOString()});
}

export async function syncQueuedFieldObservation(item:QueuedFieldObservation){
  let uploadedUrls=item.uploadedUrls||[];
  try{
    if(!uploadedUrls.length&&item.imageDataUrls.length){
      uploadedUrls=await uploadDataUrlFarmMedia({
        images:item.imageDataUrls,
        sourceModule:'field_observation',
        sourceRef:item.id,
        parcelId:item.observation.parcel_id,
      });
      await updateQueueItem(item.id,{uploadedUrls});
    }

    const saved=await insertFarmObservation({
      id:item.id,
      ...item.observation,
      image_urls:uploadedUrls,
    });

    await registerFarmMediaEvidence({
      urls:uploadedUrls,
      sourceModule:'field_observation',
      sourceRef:item.id,
      parcelId:item.geo?undefined:(saved.parcel_id||undefined),
      zoneId:saved.zone_id,
      geo:item.geo,
      metadata:{observationParcelId:saved.parcel_id||null,category:saved.category,offlineQueue:true},
      createdBy:'Olivia',
    });

    await removeQueuedFieldObservation(item.id);
    window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
    return saved;
  }catch(error:any){
    await updateQueueItem(item.id,{
      attempts:(item.attempts||0)+1,
      lastError:error?.message||String(error),
      uploadedUrls,
    }).catch(()=>undefined);
    throw error;
  }
}

export async function syncPendingFieldObservations(){
  if(typeof navigator!=='undefined'&&!navigator.onLine){
    return{synced:0,failed:0,pending:(await listQueuedFieldObservations()).length};
  }
  const items=await listQueuedFieldObservations();
  let synced=0,failed=0;
  for(const item of items){
    try{
      await syncQueuedFieldObservation(item);
      synced++;
    }catch{
      failed++;
      break;
    }
  }
  return{synced,failed,pending:Math.max(0,items.length-synced)};
}

export async function queuedFieldObservationCount(){
  return (await listQueuedFieldObservations()).length;
}
