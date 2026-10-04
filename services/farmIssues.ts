import { supabase } from './supabaseClient';
import type { FarmObservation } from '../types/farmIoT';
import type { FarmGeoContext } from '../types/farmGeo';
import { geoContextToDb } from './farmMediaEvidence';

export type FarmIssueType='pest'|'disease'|'irrigation'|'soil'|'tree_health'|'maintenance'|'other';
export type FarmIssueStatus='open'|'monitoring'|'resolved'|'dismissed';
export type FarmIssueSeverity='low'|'medium'|'high'|'critical';

export type FarmIssue={
  id:string;
  issue_type:FarmIssueType;
  title:string;
  description?:string|null;
  status:FarmIssueStatus;
  severity:FarmIssueSeverity;
  parcel_id?:string|null;
  zone_id?:string|null;
  tree_group_id?:string|null;
  first_observation_id?:string|null;
  latest_observation_id?:string|null;
  opened_at:string;
  next_review_at?:string|null;
  resolved_at?:string|null;
  resolution_notes?:string|null;
  geo_context?:Record<string,unknown>|null;
  created_at:string;
  updated_at:string;
};

export type FarmIssueDraft={
  id:string;
  issueType:FarmIssueType;
  title:string;
  description?:string;
  severity:FarmIssueSeverity;
  nextReviewAt?:string;
};

export function issueTypeFromObservation(category:FarmObservation['category']):FarmIssueType{
  if(category==='pest')return'pest';
  if(category==='disease')return'disease';
  if(category==='irrigation'||category==='water')return'irrigation';
  if(category==='soil')return'soil';
  if(category==='tree_health')return'tree_health';
  if(category==='maintenance')return'maintenance';
  return'other';
}

export async function fetchFarmIssues(params:{status?:FarmIssueStatus[];limit?:number}={}):Promise<FarmIssue[]>{
  let query=supabase.from('farm_issues')
    .select('*')
    .order('updated_at',{ascending:false})
    .limit(params.limit||200);
  if(params.status?.length)query=query.in('status',params.status);
  const {data,error}=await query;
  if(error)throw new Error(error.message);
  return(data||[]) as FarmIssue[];
}

export async function upsertFarmIssueFromObservation(
  observation:FarmObservation,
  draft:FarmIssueDraft,
  geo?:FarmGeoContext|null,
):Promise<FarmIssue>{
  const now=new Date().toISOString();
  const row={
    id:draft.id,
    issue_type:draft.issueType,
    title:draft.title.trim(),
    description:draft.description?.trim()||null,
    status:'open',
    severity:draft.severity,
    parcel_id:observation.parcel_id||null,
    zone_id:observation.zone_id||null,
    tree_group_id:observation.tree_group_id||null,
    first_observation_id:observation.id,
    latest_observation_id:observation.id,
    opened_at:observation.observed_at||now,
    next_review_at:draft.nextReviewAt||null,
    resolved_at:null,
    resolution_notes:null,
    geo_context:geoContextToDb(geo),
    updated_at:now,
  };
  const {data,error}=await supabase.from('farm_issues')
    .upsert(row,{onConflict:'id'})
    .select('*')
    .single();
  if(error)throw new Error(error.message);

  const {error:linkError}=await supabase.from('farm_observations')
    .update({issue_id:draft.id})
    .eq('id',observation.id);
  if(linkError)throw new Error(linkError.message);
  return data as FarmIssue;
}

export async function attachObservationToFarmIssue(issueId:string,observation:FarmObservation):Promise<FarmIssue>{
  const {data:current,error:fetchError}=await supabase.from('farm_issues')
    .select('*')
    .eq('id',issueId)
    .single();
  if(fetchError)throw new Error(fetchError.message);
  if(['resolved','dismissed'].includes(String(current.status))){
    throw new Error('Saken er lukket. Gjenåpne den før en ny kontroll kobles til.');
  }
  const {data,error}=await supabase.from('farm_issues')
    .update({
      latest_observation_id:observation.id,
      status:current.status==='open'?'monitoring':current.status,
      updated_at:new Date().toISOString(),
    })
    .eq('id',issueId)
    .select('*')
    .single();
  if(error)throw new Error(error.message);
  const {error:linkError}=await supabase.from('farm_observations')
    .update({issue_id:issueId})
    .eq('id',observation.id);
  if(linkError)throw new Error(linkError.message);
  return data as FarmIssue;
}

export async function updateFarmIssue(
  id:string,
  patch:{
    status?:FarmIssueStatus;
    severity?:FarmIssueSeverity;
    nextReviewAt?:string|null;
    resolutionNotes?:string|null;
  }
):Promise<FarmIssue>{
  const row:any={updated_at:new Date().toISOString()};
  if(patch.status!==undefined){
    row.status=patch.status;
    if(patch.status==='resolved'||patch.status==='dismissed'){
      row.resolved_at=new Date().toISOString();
    }else{
      row.resolved_at=null;
    }
  }
  if(patch.severity!==undefined)row.severity=patch.severity;
  if(patch.nextReviewAt!==undefined)row.next_review_at=patch.nextReviewAt;
  if(patch.resolutionNotes!==undefined)row.resolution_notes=patch.resolutionNotes?.trim()||null;

  const {data,error}=await supabase.from('farm_issues')
    .update(row)
    .eq('id',id)
    .select('*')
    .single();
  if(error)throw new Error(error.message);
  window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
  return data as FarmIssue;
}

export function farmIssueOverdueDays(issue:FarmIssue,now=new Date()){
  if(!issue.next_review_at||!['open','monitoring'].includes(issue.status))return 0;
  const due=new Date(issue.next_review_at);
  if(Number.isNaN(due.getTime()))return 0;
  const diff=Math.floor((now.getTime()-due.getTime())/86400000);
  return Math.max(0,diff);
}
