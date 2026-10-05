import { supabase, isSupabaseConfigured } from './supabaseClient';
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
  parcelId?:string;
  zoneId?:string;
  treeGroupId?:string;
  geo?:FarmGeoContext|null;
};

export function makeFarmIssueId(){
  if(typeof crypto!=='undefined'&&'randomUUID' in crypto)return'issue-'+crypto.randomUUID();
  return'issue-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
}

export function issueTypeForObservation(category:FarmObservation['category']):FarmIssueType{
  if(category==='pest'||category==='disease'||category==='irrigation'||category==='soil'||category==='tree_health'||category==='maintenance')return category;
  return'other';
}

export async function fetchFarmIssues(params:{
  status?:FarmIssueStatus|'active'|'all';
  parcelId?:string;
  limit?:number;
}={}):Promise<FarmIssue[]>{
  if(!isSupabaseConfigured)return[];
  let query=supabase.from('farm_issues')
    .select('*')
    .order('updated_at',{ascending:false})
    .limit(params.limit||200);
  if(params.status==='active')query=query.in('status',['open','monitoring']);
  else if(params.status&&params.status!=='all')query=query.eq('status',params.status);
  if(params.parcelId)query=query.eq('parcel_id',params.parcelId);
  const {data,error}=await query;
  if(error)throw new Error(error.message);
  return(data||[]) as FarmIssue[];
}

export async function upsertFarmIssueFromObservation(input:{
  draft:FarmIssueDraft;
  observation:FarmObservation;
}):Promise<FarmIssue>{
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const now=new Date().toISOString();
  const row={
    id:input.draft.id,
    issue_type:input.draft.issueType,
    title:input.draft.title.trim()||input.observation.title,
    description:input.draft.description?.trim()||input.observation.notes||null,
    status:'open' as const,
    severity:input.draft.severity,
    parcel_id:input.draft.parcelId||input.observation.parcel_id||null,
    zone_id:input.draft.zoneId||input.observation.zone_id||null,
    tree_group_id:input.draft.treeGroupId||input.observation.tree_group_id||null,
    first_observation_id:input.observation.id,
    latest_observation_id:input.observation.id,
    opened_at:input.observation.observed_at||now,
    next_review_at:input.draft.nextReviewAt||null,
    resolved_at:null,
    resolution_notes:null,
    geo_context:geoContextToDb(input.draft.geo)||null,
    updated_at:now,
  };
  const issueRes=await supabase.from('farm_issues')
    .upsert(row,{onConflict:'id'})
    .select('*')
    .single();
  if(issueRes.error)throw new Error(issueRes.error.message);

  const observationRes=await supabase.from('farm_observations')
    .update({issue_id:input.draft.id})
    .eq('id',input.observation.id);
  if(observationRes.error){
    try{await supabase.from('farm_issues').delete().eq('id',input.draft.id);}catch{}
    throw new Error(observationRes.error.message);
  }
  return issueRes.data as FarmIssue;
}

export async function linkObservationToIssue(issueId:string,observation:FarmObservation):Promise<void>{
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const now=new Date().toISOString();
  const observationRes=await supabase.from('farm_observations')
    .update({issue_id:issueId})
    .eq('id',observation.id);
  if(observationRes.error)throw new Error(observationRes.error.message);

  const issueRes=await supabase.from('farm_issues')
    .update({
      latest_observation_id:observation.id,
      parcel_id:observation.parcel_id||undefined,
      zone_id:observation.zone_id||undefined,
      tree_group_id:observation.tree_group_id||undefined,
      updated_at:now,
    })
    .eq('id',issueId);
  if(issueRes.error)throw new Error(issueRes.error.message);
}

export async function updateFarmIssueStatus(input:{
  id:string;
  status:FarmIssueStatus;
  nextReviewAt?:string|null;
  resolutionNotes?:string|null;
}):Promise<FarmIssue>{
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const resolved=input.status==='resolved'||input.status==='dismissed';
  const patch={
    status:input.status,
    next_review_at:resolved?null:(input.nextReviewAt??undefined),
    resolved_at:resolved?new Date().toISOString():null,
    resolution_notes:resolved?(input.resolutionNotes?.trim()||null):null,
    updated_at:new Date().toISOString(),
  };
  const {data,error}=await supabase.from('farm_issues')
    .update(patch)
    .eq('id',input.id)
    .select('*')
    .single();
  if(error)throw new Error(error.message);
  return data as FarmIssue;
}

export async function updateFarmIssueReview(input:{
  id:string;
  nextReviewAt?:string|null;
  severity?:FarmIssueSeverity;
  description?:string|null;
}):Promise<FarmIssue>{
  if(!isSupabaseConfigured)throw new Error('Supabase er ikke konfigurert.');
  const patch:any={updated_at:new Date().toISOString()};
  if(input.nextReviewAt!==undefined)patch.next_review_at=input.nextReviewAt;
  if(input.severity!==undefined)patch.severity=input.severity;
  if(input.description!==undefined)patch.description=input.description?.trim()||null;
  const {data,error}=await supabase.from('farm_issues')
    .update(patch)
    .eq('id',input.id)
    .select('*')
    .single();
  if(error)throw new Error(error.message);
  return data as FarmIssue;
}
