import { supabase, isSupabaseConfigured } from './supabaseClient';

export type OrganicParcelCertificationStatus=
  |'unknown'
  |'application_pending'
  |'in_conversion'
  |'certified'
  |'suspended'
  |'non_compliant';

export type OrganicParcelCertification={
  parcel_id:string;
  authority:string;
  status:OrganicParcelCertificationStatus;
  source_case_id?:string|null;
  certificate_number?:string|null;
  valid_from?:string|null;
  valid_until?:string|null;
  conversion_start?:string|null;
  last_inspection_at?:string|null;
  next_inspection_due?:string|null;
  basis_document_id?:string|null;
  notes?:string|null;
  verified_at?:string|null;
  verified_by?:string|null;
  created_at?:string;
  updated_at?:string;
};

export type CaecvCaseSummary={
  id:string;
  operator_name:string;
  authority:string;
  application_type?:string|null;
  certification_scope?:string|null;
  status:string;
  current_step?:string|null;
  regepa_code?:string|null;
  submitted_at?:string|null;
  inspection_at?:string|null;
  certified_at?:string|null;
  certificate_number?:string|null;
  notes?:string|null;
};

export async function fetchOrganicParcelCertifications(){
  if(!isSupabaseConfigured)return[] as OrganicParcelCertification[];
  const {data,error}=await supabase.from('organic_parcel_certifications')
    .select('*')
    .order('updated_at',{ascending:false});
  if(error)throw new Error(error.message);
  return(data||[]) as OrganicParcelCertification[];
}

export async function fetchCurrentCaecvCase():Promise<CaecvCaseSummary|null>{
  if(!isSupabaseConfigured)return null;
  const {data,error}=await supabase.from('caecv_cases')
    .select('id,operator_name,authority,application_type,certification_scope,status,current_step,regepa_code,submitted_at,inspection_at,certified_at,certificate_number,notes')
    .order('updated_at',{ascending:false})
    .limit(1)
    .maybeSingle();
  if(error)throw new Error(error.message);
  return(data||null) as CaecvCaseSummary|null;
}

export async function upsertOrganicParcelCertification(input:{
  parcelId:string;
  status:OrganicParcelCertificationStatus;
  authority?:string;
  sourceCaseId?:string|null;
  certificateNumber?:string|null;
  validFrom?:string|null;
  validUntil?:string|null;
  conversionStart?:string|null;
  lastInspectionAt?:string|null;
  nextInspectionDue?:string|null;
  basisDocumentId?:string|null;
  notes?:string|null;
  verifiedBy?:string|null;
}):Promise<OrganicParcelCertification>{
  if(!input.parcelId)throw new Error('Parsell mangler.');
  const row={
    parcel_id:input.parcelId,
    authority:input.authority||'CAECV',
    status:input.status,
    source_case_id:input.sourceCaseId||null,
    certificate_number:input.certificateNumber?.trim()||null,
    valid_from:input.validFrom||null,
    valid_until:input.validUntil||null,
    conversion_start:input.conversionStart||null,
    last_inspection_at:input.lastInspectionAt||null,
    next_inspection_due:input.nextInspectionDue||null,
    basis_document_id:input.basisDocumentId||null,
    notes:input.notes?.trim()||null,
    verified_at:new Date().toISOString(),
    verified_by:input.verifiedBy?.trim()||'Olivia internal user',
    updated_at:new Date().toISOString(),
  };
  const {data,error}=await supabase.from('organic_parcel_certifications')
    .upsert(row,{onConflict:'parcel_id'})
    .select('*')
    .single();
  if(error)throw new Error(error.message);
  return data as OrganicParcelCertification;
}

export function certificationStatusLabel(status:OrganicParcelCertificationStatus){
  const labels:Record<OrganicParcelCertificationStatus,string>={
    unknown:'Ikke dokumentert',
    application_pending:'Søknad / avklaring pågår',
    in_conversion:'I overgang',
    certified:'Sertifisert',
    suspended:'Suspendert',
    non_compliant:'Avvik / ikke compliant',
  };
  return labels[status];
}
