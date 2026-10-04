import { supabase } from './supabaseClient';
import { buildVarietyReferenceContext } from './varietyReference';

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
  let query=supabase.from('farm_questions')
    .select('*')
    .eq('status','open')
    .order('created_at',{ascending:false})
    .limit(params.limit||50);
  if(params.parcelId)query=query.or('parcel_id.eq.'+params.parcelId+',parcel_id.is.null');
  if(params.agentType)query=query.or('agent_type.eq.'+params.agentType+',agent_type.is.null');
  const {data,error}=await query;
  if(error)throw new Error(error.message);
  const rows=(data||[]) as FarmQuestion[];
  const rank:Record<FarmQuestionPriority,number>={critical:4,high:3,medium:2,low:1};
  return rows.sort((a,b)=>rank[b.priority]-rank[a.priority]||String(b.created_at).localeCompare(String(a.created_at)));
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
  const {error}=await supabase.rpc('answer_farm_question',{
    p_question_id:questionId,
    p_answer:clean,
    p_answer_json:answerJson??null,
  });
  if(error)throw new Error(error.message);
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
      relatedKnowledgeKey:'agent.'+input.agentType+'.'+(input.parcelId||'farm')+'.'+normalizeKey(uncertainty),
      dedupeKey:'agent-missing:'+(input.agentType)+':'+(input.parcelId||'farm')+':'+normalizeKey(uncertainty),
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
  const [knowledge,questions,assessmentRes,varietyReferenceContext]=await Promise.all([
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
  ]);
  if(assessmentRes.error)throw new Error(assessmentRes.error.message);

  const lines:string[]=[];
  if(varietyReferenceContext)lines.push(varietyReferenceContext);
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
    supabase.from('farm_questions').select('id,priority,status').eq('status','open'),
    supabase.from('farm_agent_assessments').select('id,feedback_status').limit(1000),
  ]);
  const error=knowledgeRes.error||questionsRes.error||assessmentsRes.error;
  if(error)throw new Error(error.message);
  const questions=(questionsRes.data||[]) as any[];
  return{
    knowledgeCount:(knowledgeRes.data||[]).length,
    openQuestionCount:questions.length,
    highQuestionCount:questions.filter(q=>['high','critical'].includes(q.priority)).length,
    assessmentCount:(assessmentsRes.data||[]).length,
    feedbackCount:(assessmentsRes.data||[]).filter((row:any)=>row.feedback_status).length,
  };
}
