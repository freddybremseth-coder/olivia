import { supabase } from './supabaseClient';
import { buildVarietyReferenceContext } from './varietyReference';
import type { FarmGeoContext } from '../types/farmGeo';
import { geoContextToDb } from './farmMediaEvidence';

export type FarmQuestionPriority='low'|'medium'|'high'|'critical';
export type FarmQuestionType='clarification'|'conflict'|'missing_fact'|'confirmation'|'follow_up';
export type FarmAgentType='field_consultant'|'pruning_assistant'|'farm_advisor'|'source_scanner';

export type FarmKnowledgeItem={
  id:string;
  knowledge_key:string;
  subject_type:string;
  subject_id?:string|null;
  category:string;
  statement:string;
  value_json?:any;
  confidence:number;
  status:'verified'|'provisional'|'disputed'|'superseded';
  learned_from:string;
  source_ref?:string|null;
  last_confirmed_at?:string|null;
  created_at:string;
};

export type FarmQuestion={
  id:string;
  dedupe_key?:string|null;
  question:string;
  reason?:string|null;
  question_type:FarmQuestionType;
  priority:FarmQuestionPriority;
  status:'open'|'answered'|'dismissed';
  parcel_id?:string|null;
  source_document_id?:string|null;
  source_event_id?:string|null;
  source_observation_id?:string|null;
  agent_type?:FarmAgentType|null;
  related_knowledge_key?:string|null;
  suggested_choices:any[];
  answer?:string|null;
  answered_at?:string|null;
  created_at:string;
};

export type AgentAssessmentInput={
  agentType:Exclude<FarmAgentType,'source_scanner'>;
  parcelId?:string;
  result:any;
  contextSnapshot?:string;
  confidence?:number;
  uncertainties?:string[];
  sourceRef?:string;
  geoContext?:FarmGeoContext;
};

function makeId(prefix:string){
  if(typeof crypto!=='undefined'&&'randomUUID' in crypto)return prefix+'-'+crypto.randomUUID();
  return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
}

function normalizeKey(value:string){
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,120);
}

function normalizedKnowledgeText(value:string){
  return String(value||'')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9æøå]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

export function semanticKnowledgeNeed(value:string):string{
  const text=normalizedKnowledgeText(value);

  if(
    /(unge|ungt|young)/.test(text)
    && /(plantet|planting|planted|tilbakeskaret|tilbakeskåret|kuttet tilbake|cut back|backcut)/.test(text)
  )return'young-tree-established-or-cutback-date';

  if(
    /(jordfukt|soil moisture|fuktighetsniv|moisture level)/.test(text)
    && /(navarende|nåværende|current|ulike deler|different parts|parsell|parcel)/.test(text)
  )return'parcel-current-soil-moisture';

  if(
    /(jordanaly|soil analys|bladanaly|leaf analys)/.test(text)
    && /(gjod|gjød|fertiliz|naring|næring|nutrient)/.test(text)
  )return'parcel-soil-leaf-analysis';

  if(
    /(endokarp|endocarp|stein|pit|stone)/.test(text)
    && /(bilde|photo|image|sort|variet)/.test(text)
  )return'variety-endocarp-reference-photo';

  if(
    /(modne tr|modent tre|mature tree)/.test(text)
    && /(flere vink|multiple angle|kroneform|canopy|fruktved)/.test(text)
  )return'mature-tree-multi-angle-reference-photos';

  if(
    /(bladverk|bladform|leaves|leaf|frukt|fruit)/.test(text)
    && /(narbilde|nærbilde|close up|closeup|bilde|photo|image)/.test(text)
    && /(sort|variet|diagnos|sykdom|disease|unge|modne|young|mature)/.test(text)
  )return'variety-leaf-fruit-reference-photos';

  if(
    /(del av|part of|eksisterende|existing)/.test(text)
    && /(genoesa|genovesa|sort|variet)/.test(text)
    && /(nylig|nye tr|new tree|plant)/.test(text)
  )return'variety-tree-membership';

  if(
    /(gardsregister|gårdsregister|register|parcel|parsell)/.test(text)
    && /(sort|variet|genoesa|genovesa)/.test(text)
    && /(visuell|visual|bilde|image|forskjell|difference|konflikt|conflict)/.test(text)
  )return'variety-registry-visual-conflict';

  if(
    /(frukt|fruit)/.test(text)
    && /(storrelse|størrelse|size|form|shape)/.test(text)
    && /(bilde|photo|image|narbilde|nærbilde)/.test(text)
  )return'variety-fruit-morphology-photo';

  return'custom-'+normalizeKey(value);
}

function canonicalKnowledgeKey(value:string,parcelId?:string|null){
  return'need.'+(parcelId||'farm')+'.'+semanticKnowledgeNeed(value);
}

function questionSemanticKey(question:Pick<FarmQuestion,'question'|'related_knowledge_key'|'parcel_id'>){
  const canonicalPrefix='need.'+(question.parcel_id||'farm')+'.';
  if(question.related_knowledge_key?.startsWith(canonicalPrefix))return question.related_knowledge_key;
  return canonicalKnowledgeKey(question.question,question.parcel_id);
}

export async function fetchFarmKnowledge(params:{parcelId?:string;limit?:number}={}):Promise<FarmKnowledgeItem[]>{
  let query=supabase.from('farm_knowledge_items')
    .select('*')
    .in('status',['verified','provisional','disputed'])
    .order('last_confirmed_at',{ascending:false,nullsFirst:false})
    .order('created_at',{ascending:false})
    .limit(params.limit||100);
  if(params.parcelId)query=query.or('subject_id.eq.'+params.parcelId+',subject_type.eq.farm');
  const {data,error}=await query;
  if(error)throw new Error(error.message);
  return(data||[]) as FarmKnowledgeItem[];
}

export async function fetchOpenFarmQuestions(params:{parcelId?:string;agentType?:FarmAgentType;limit?:number}={}):Promise<FarmQuestion[]>{
  const requestedLimit=params.limit||50;
  let query=supabase.from('farm_questions')
    .select('*')
    .eq('status','open')
    .order('created_at',{ascending:false})
    .limit(Math.max(50,requestedLimit*4));
  if(params.parcelId)query=query.or('parcel_id.eq.'+params.parcelId+',parcel_id.is.null');
  if(params.agentType)query=query.or('agent_type.eq.'+params.agentType+',agent_type.is.null');
  const {data,error}=await query;
  if(error)throw new Error(error.message);
  const rows=(data||[]) as FarmQuestion[];
  const rank:Record<FarmQuestionPriority,number>={critical:4,high:3,medium:2,low:1};
  const sorted=rows.sort((a,b)=>rank[b.priority]-rank[a.priority]||String(b.created_at).localeCompare(String(a.created_at)));
  const seen=new Set<string>();
  return sorted.filter(row=>{
    const key=questionSemanticKey(row);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,requestedLimit);
}

export async function createFarmQuestion(input:{
  question:string;
  reason?:string;
  questionType?:FarmQuestionType;
  priority?:FarmQuestionPriority;
  parcelId?:string;
  agentType?:FarmAgentType;
  relatedKnowledgeKey?:string;
  sourceDocumentId?:string;
  sourceEventId?:string;
  sourceObservationId?:string;
  suggestedChoices?:string[];
  dedupeKey?:string;
}):Promise<FarmQuestion|null>{
  const dedupe=input.dedupeKey||[
    input.agentType||'farm',
    input.parcelId||'farm',
    normalizeKey(input.question),
  ].join(':');

  if(input.relatedKnowledgeKey){
    let relatedQuery=supabase.from('farm_questions')
      .select('*')
      .eq('related_knowledge_key',input.relatedKnowledgeKey)
      .eq('status','open')
      .limit(1);
    if(input.parcelId)relatedQuery=relatedQuery.eq('parcel_id',input.parcelId);
    else relatedQuery=relatedQuery.is('parcel_id',null);
    const related=await relatedQuery.maybeSingle();
    if(related.error)throw new Error(related.error.message);
    if(related.data)return related.data as FarmQuestion;
  }

  const existing=await supabase.from('farm_questions').select('*').eq('dedupe_key',dedupe).eq('status','open').maybeSingle();
  if(existing.error)throw new Error(existing.error.message);
  if(existing.data)return existing.data as FarmQuestion;

  const row={
    id:makeId('question'),
    dedupe_key:dedupe,
    question:input.question.trim(),
    reason:input.reason?.trim()||null,
    question_type:input.questionType||'clarification',
    priority:input.priority||'medium',
    status:'open',
    parcel_id:input.parcelId||null,
    source_document_id:input.sourceDocumentId||null,
    source_event_id:input.sourceEventId||null,
    source_observation_id:input.sourceObservationId||null,
    agent_type:input.agentType||null,
    related_knowledge_key:input.relatedKnowledgeKey||null,
    suggested_choices:input.suggestedChoices||[],
  };
  const {data,error}=await supabase.from('farm_questions').insert(row).select('*').single();
  if(error){
    if(String(error.message).toLowerCase().includes('duplicate'))return null;
    throw new Error(error.message);
  }
  return data as FarmQuestion;
}

export async function answerFarmQuestion(questionId:string,answer:string,answerJson?:any){
  const clean=answer.trim();
  if(!clean)throw new Error('Svar kan ikke være tomt.');

  const selected=await supabase.from('farm_questions')
    .select('*')
    .eq('id',questionId)
    .single();
  if(selected.error)throw new Error(selected.error.message);
  const question=selected.data as FarmQuestion;
  const canonicalKey=questionSemanticKey(question);

  const openRes=await supabase.from('farm_questions')
    .select('*')
    .eq('status','open')
    .limit(250);
  if(openRes.error)throw new Error(openRes.error.message);
  const siblings=((openRes.data||[]) as FarmQuestion[]).filter(row=>
    (row.parcel_id||null)===(question.parcel_id||null)
    && questionSemanticKey(row)===canonicalKey
  );

  const siblingIds=siblings.map(row=>row.id);
  if(siblingIds.length){
    const canonicalize=await supabase.from('farm_questions')
      .update({related_knowledge_key:canonicalKey,updated_at:new Date().toISOString()})
      .in('id',siblingIds);
    if(canonicalize.error)throw new Error(canonicalize.error.message);
  }

  const {error}=await supabase.rpc('answer_farm_question',{
    p_question_id:questionId,
    p_answer:clean,
    p_answer_json:answerJson??null,
  });
  if(error)throw new Error(error.message);

  const remainingIds=siblingIds.filter(id=>id!==questionId);
  if(remainingIds.length){
    const now=new Date().toISOString();
    const closeSiblings=await supabase.from('farm_questions')
      .update({
        status:'answered',
        answer:clean,
        answer_json:answerJson??null,
        answered_at:now,
        updated_at:now,
      })
      .in('id',remainingIds)
      .eq('status','open');
    if(closeSiblings.error)throw new Error(closeSiblings.error.message);
  }
}

export async function dismissFarmQuestion(questionId:string){
  const {error}=await supabase.from('farm_questions')
    .update({status:'dismissed',updated_at:new Date().toISOString()})
    .eq('id',questionId);
  if(error)throw new Error(error.message);
}

export async function recordAgentAssessment(input:AgentAssessmentInput):Promise<{assessmentId:string;questions:FarmQuestion[]}>{
  const confidence=Math.max(0,Math.min(1,Number(input.confidence??0)));
  const uncertainties=(input.uncertainties||[]).map(v=>String(v).trim()).filter(Boolean).slice(0,12);
  const assessmentId=makeId('assessment');
  const {error}=await supabase.from('farm_agent_assessments').insert({
    id:assessmentId,
    agent_type:input.agentType,
    parcel_id:input.parcelId||null,
    confidence:Number.isFinite(confidence)?confidence:null,
    result_json:input.result||{},
    context_snapshot:(input.contextSnapshot||'').slice(0,20000)||null,
    uncertainties,
    source_ref:input.sourceRef||null,
    geo_context:geoContextToDb(input.geoContext)||null,
  });
  if(error)throw new Error(error.message);

  const created:FarmQuestion[]=[];
  for(const uncertainty of uncertainties){
    const q=await createFarmQuestion({
      question:questionFromUncertainty(uncertainty),
      reason:'Agenten manglet dette for å kunne gi en sikrere vurdering. Svaret blir del av Olivia sin kunnskapsbase og brukes i senere analyser.',
      questionType:'missing_fact',
      priority:confidence<0.45?'high':'medium',
      parcelId:input.parcelId,
      agentType:input.agentType,
      relatedKnowledgeKey:canonicalKnowledgeKey(uncertainty,input.parcelId),
      dedupeKey:'knowledge-need:'+(input.parcelId||'farm')+':'+semanticKnowledgeNeed(uncertainty),
    });
    if(q)created.push(q);
  }
  return{assessmentId,questions:created};
}

function questionFromUncertainty(value:string){
  const trimmed=value.replace(/[?.]+$/,'').trim();
  if(!trimmed)return'Hvilken informasjon mangler for å gjøre vurderingen sikrere?';
  if(/^(hva|hvilken|hvilke|er|har|når|hvor|kan)\b/i.test(trimmed))return trimmed+'?';
  return'Kan du avklare dette for Olivia: '+trimmed+'?';
}

export async function recordAgentFeedback(input:{
  assessmentId:string;
  status:'confirmed'|'corrected'|'partly_correct'|'rejected';
  feedback?:string;
  parcelId?:string;
  agentType:Exclude<FarmAgentType,'source_scanner'>;
}){
  const {error}=await supabase.from('farm_agent_assessments').update({
    feedback_status:input.status,
    user_feedback:input.feedback?.trim()||null,
  }).eq('id',input.assessmentId);
  if(error)throw new Error(error.message);

  if(input.feedback?.trim()){
    await supabase.from('farm_knowledge_items').insert({
      id:makeId('knowledge-feedback'),
      knowledge_key:'agent-feedback.'+input.agentType+'.'+input.assessmentId,
      subject_type:input.parcelId?'parcel':'farm',
      subject_id:input.parcelId||null,
      category:'agent_feedback',
      statement:input.feedback.trim(),
      value_json:{assessmentId:input.assessmentId,status:input.status},
      confidence:1,
      status:'verified',
      learned_from:'user_answer',
      source_ref:'Tilbakemelding på '+input.agentType,
      last_confirmed_at:new Date().toISOString(),
    });
  }
}

export async function buildLearningContext(parcelId?:string):Promise<string>{
  const [knowledge,questions,assessmentRes,varietyReferenceContext,pruningOutcomeRes]=await Promise.all([
    fetchFarmKnowledge({parcelId,limit:40}),
    fetchOpenFarmQuestions({parcelId,limit:15}),
    (()=> {
      let q=supabase.from('farm_agent_assessments')
        .select('agent_type,assessment_date,confidence,result_json,user_feedback,feedback_status')
        .order('assessment_date',{ascending:false})
        .limit(8);
      if(parcelId)q=q.or('parcel_id.eq.'+parcelId+',parcel_id.is.null');
      return q;
    })(),
    buildVarietyReferenceContext(parcelId).catch(err=>{console.warn('[farmIntelligence] variety reference context',err);return'';}),
    (()=> {
      let q=supabase.from('pruning_history')
        .select('id,date,tree_type,plan,execution_status,completed_at,outcome_rating,outcome_notes,step_feedback,outcome_verified_at,parcel_id')
        .not('outcome_verified_at','is',null)
        .order('outcome_verified_at',{ascending:false})
        .limit(8);
      if(parcelId)q=q.eq('parcel_id',parcelId);
      return q;
    })(),
  ]);
  if(assessmentRes.error)throw new Error(assessmentRes.error.message);
  if(pruningOutcomeRes.error)throw new Error(pruningOutcomeRes.error.message);

  const lines:string[]=[];
  if(varietyReferenceContext)lines.push(varietyReferenceContext);

  const pruningOutcomes=(pruningOutcomeRes.data||[]) as any[];
  if(pruningOutcomes.length){
    lines.push('BEKREFTET BESKJÆRINGSFASIT FRA GÅRDEN:');
    pruningOutcomes.slice(0,6).forEach(row=>{
      const feedback=Array.isArray(row.step_feedback)?row.step_feedback:[];
      const count=(status:string)=>feedback.filter((item:any)=>item?.status===status).length;
      const statusLabel=row.execution_status==='completed'?'UTFØRT'
        :row.execution_status==='partly_completed'?'DELVIS UTFØRT'
        :row.execution_status==='cancelled'?'AVLYST'
        :'PLANLAGT';
      const parts=[
        count('performed')?count('performed')+' råd utført som foreslått':'',
        count('corrected')?count('corrected')+' råd korrigert':'',
        count('skipped')?count('skipped')+' råd ikke utført':'',
        row.outcome_rating?('utfall '+row.outcome_rating):'',
        row.outcome_notes?String(row.outcome_notes).slice(0,320):'',
      ].filter(Boolean);
      lines.push('- ['+statusLabel+'] '+String(row.completed_at||row.date||'').slice(0,10)+' · '+String(row.tree_type||'oliventre')+(parts.length?' · '+parts.join(' · '):''));
    });
    lines.push('BESKJÆRINGSREGEL: Menneskelig verifisert utfallsfasit veier tyngre enn tidligere AI-planer. Korrigerte eller hoppede råd skal behandles som negativ/justerende erfaring, ikke som vellykkede anbefalinger.');
  }
  if(knowledge.length){
    lines.push('LÆRT OG BEKREFTET KUNNSKAP:');
    knowledge.slice(0,30).forEach(item=>{
      const certainty=item.status==='verified'?'BEKREFTET':item.status==='disputed'?'KONFLIKT':'FORELØPIG';
      lines.push('- ['+certainty+' '+Math.round(Number(item.confidence||0)*100)+'%] '+item.statement);
    });
  }

  const assessments=(assessmentRes.data||[]) as any[];
  if(assessments.length){
    lines.push('TIDLIGERE AGENTVURDERINGER (ikke automatisk fakta):');
    assessments.slice(0,5).forEach(row=>{
      const result=row.result_json||{};
      const summary=
        result?.diagnosis?.diagnosis||
        result?.timingAdvice||
        result?.nextKeyAction||
        result?.expertReport?.nextKeyAction||
        'Tidligere analyse lagret';
      lines.push('- '+String(row.assessment_date).slice(0,10)+' · '+row.agent_type+' · sikkerhet '+Math.round(Number(row.confidence||0)*100)+'% · '+String(summary).slice(0,350)+(row.user_feedback?' · BRUKERFEEDBACK: '+row.user_feedback:''));
    });
  }

  if(questions.length){
    lines.push('ÅPNE SPØRSMÅL / IKKE GJETT:');
    questions.slice(0,10).forEach(q=>lines.push('- '+q.question));
  }

  lines.push('LÆRINGSREGEL: Bekreftet brukersvar og verifiserte dokumenter veier tyngre enn tidligere AI-vurderinger. Hvis ny observasjon konflikter med kjent kunnskap, si det eksplisitt og still et spørsmål i stedet for å velge en versjon uten grunnlag.');
  return lines.join('\n').slice(0,16000);
}

export async function fetchFarmIntelligenceSummary(){
  const [knowledgeRes,questionsRes,assessmentsRes]=await Promise.all([
    supabase.from('farm_knowledge_items').select('id,status').in('status',['verified','provisional','disputed']),
    supabase.from('farm_questions').select('id,question,priority,status,parcel_id,related_knowledge_key').eq('status','open').limit(500),
    supabase.from('farm_agent_assessments').select('id,feedback_status').limit(1000),
  ]);
  const error=knowledgeRes.error||questionsRes.error||assessmentsRes.error;
  if(error)throw new Error(error.message);
  const questions=(questionsRes.data||[]) as FarmQuestion[];
  const grouped=new Map<string,FarmQuestion>();
  const rank:Record<FarmQuestionPriority,number>={critical:4,high:3,medium:2,low:1};
  for(const question of questions){
    const key=questionSemanticKey(question);
    const existing=grouped.get(key);
    if(!existing||rank[question.priority]>rank[existing.priority])grouped.set(key,question);
  }
  const uniqueQuestions=Array.from(grouped.values());
  return{
    knowledgeCount:(knowledgeRes.data||[]).length,
    openQuestionCount:uniqueQuestions.length,
    rawOpenQuestionRowCount:questions.length,
    highQuestionCount:uniqueQuestions.filter(q=>['high','critical'].includes(q.priority)).length,
    assessmentCount:(assessmentsRes.data||[]).length,
    feedbackCount:(assessmentsRes.data||[]).filter((row:any)=>row.feedback_status).length,
  };
}
