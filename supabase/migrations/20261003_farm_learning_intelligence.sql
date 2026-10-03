
create table if not exists olivia.farm_knowledge_items (
  id text primary key default gen_random_uuid()::text,
  knowledge_key text not null,
  subject_type text not null default 'farm'
    check (subject_type in ('farm','parcel','tree_group','well','product','supplier','operation','other')),
  subject_id text null,
  category text not null default 'general',
  statement text not null,
  value_json jsonb null,
  confidence numeric not null default 0.5 check (confidence between 0 and 1),
  status text not null default 'provisional'
    check (status in ('verified','provisional','disputed','superseded')),
  learned_from text not null default 'derived'
    check (learned_from in ('document','event','user_answer','agent_analysis','observation','derived')),
  source_document_id text null references olivia.farm_documents(id) on delete set null,
  source_event_id text null references olivia.farm_events(id) on delete set null,
  source_observation_id text null,
  source_ref text null,
  valid_from date null,
  valid_to date null,
  last_confirmed_at timestamptz null,
  supersedes_id text null references olivia.farm_knowledge_items(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_farm_knowledge_key on olivia.farm_knowledge_items(knowledge_key);
create index if not exists idx_farm_knowledge_subject on olivia.farm_knowledge_items(subject_type,subject_id);
create index if not exists idx_farm_knowledge_status on olivia.farm_knowledge_items(status);
create index if not exists idx_farm_knowledge_category on olivia.farm_knowledge_items(category);

create table if not exists olivia.farm_questions (
  id text primary key default gen_random_uuid()::text,
  dedupe_key text null,
  question text not null,
  reason text null,
  question_type text not null default 'clarification'
    check (question_type in ('clarification','conflict','missing_fact','confirmation','follow_up')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','critical')),
  status text not null default 'open'
    check (status in ('open','answered','dismissed')),
  parcel_id text null references olivia.parcels(id) on delete set null,
  source_document_id text null references olivia.farm_documents(id) on delete set null,
  source_event_id text null references olivia.farm_events(id) on delete set null,
  source_observation_id text null,
  agent_type text null
    check (agent_type is null or agent_type in ('field_consultant','pruning_assistant','farm_advisor','source_scanner')),
  related_knowledge_key text null,
  suggested_choices jsonb not null default '[]'::jsonb,
  answer text null,
  answer_json jsonb null,
  answered_by text null,
  answered_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_farm_questions_open_dedupe
  on olivia.farm_questions(dedupe_key)
  where dedupe_key is not null and status='open';
create index if not exists idx_farm_questions_status on olivia.farm_questions(status,priority,created_at desc);
create index if not exists idx_farm_questions_parcel on olivia.farm_questions(parcel_id);

create table if not exists olivia.farm_agent_assessments (
  id text primary key default gen_random_uuid()::text,
  agent_type text not null
    check (agent_type in ('field_consultant','pruning_assistant','farm_advisor')),
  parcel_id text null references olivia.parcels(id) on delete set null,
  assessment_date timestamptz not null default now(),
  confidence numeric null check (confidence is null or (confidence >= 0 and confidence <= 1)),
  result_json jsonb not null default '{}'::jsonb,
  context_snapshot text null,
  uncertainties jsonb not null default '[]'::jsonb,
  source_ref text null,
  user_feedback text null,
  feedback_status text null
    check (feedback_status is null or feedback_status in ('confirmed','corrected','partly_correct','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_assessments_agent on olivia.farm_agent_assessments(agent_type,assessment_date desc);
create index if not exists idx_agent_assessments_parcel on olivia.farm_agent_assessments(parcel_id,assessment_date desc);

alter table olivia.farm_knowledge_items enable row level security;
alter table olivia.farm_questions enable row level security;
alter table olivia.farm_agent_assessments enable row level security;

do $$ begin
  create policy olivia_internal_all_farm_knowledge_items on olivia.farm_knowledge_items
    for all to authenticated
    using (olivia_private.is_internal_user())
    with check (olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy olivia_internal_all_farm_questions on olivia.farm_questions
    for all to authenticated
    using (olivia_private.is_internal_user())
    with check (olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy olivia_internal_all_farm_agent_assessments on olivia.farm_agent_assessments
    for all to authenticated
    using (olivia_private.is_internal_user())
    with check (olivia_private.is_internal_user());
exception when duplicate_object then null; end $$;

create or replace function olivia.answer_farm_question(
  p_question_id text,
  p_answer text,
  p_answer_json jsonb default null
)
returns void
language plpgsql
security definer
set search_path='olivia','public'
as $$
declare
  q olivia.farm_questions%rowtype;
  auth_user text;
  item_id text;
begin
  if not olivia_private.is_internal_user() then
    raise exception 'Internal Olivia access required';
  end if;

  select * into q from olivia.farm_questions where id=p_question_id for update;
  if not found then
    raise exception 'Farm question not found';
  end if;

  auth_user := auth.uid()::text;

  update olivia.farm_questions
     set status='answered',
         answer=p_answer,
         answer_json=p_answer_json,
         answered_by=auth_user,
         answered_at=now(),
         updated_at=now()
   where id=p_question_id;

  if q.related_knowledge_key is not null then
    update olivia.farm_knowledge_items
       set status='superseded', updated_at=now()
     where knowledge_key=q.related_knowledge_key
       and status in ('verified','provisional','disputed');

    item_id := 'knowledge-answer-'||replace(p_question_id,' ','-');

    insert into olivia.farm_knowledge_items(
      id,knowledge_key,subject_type,subject_id,category,statement,value_json,
      confidence,status,learned_from,source_document_id,source_event_id,
      source_observation_id,source_ref,last_confirmed_at,notes
    ) values(
      item_id,
      q.related_knowledge_key,
      case when q.parcel_id is null then 'farm' else 'parcel' end,
      q.parcel_id,
      'user_clarification',
      p_answer,
      p_answer_json,
      1.0,
      'verified',
      'user_answer',
      q.source_document_id,
      q.source_event_id,
      q.source_observation_id,
      'Svar på spørsmål '||q.id,
      now(),
      'Brukersvar har høyeste prioritet foran tidligere AI-antakelser.'
    )
    on conflict (id) do update set
      statement=excluded.statement,
      value_json=excluded.value_json,
      confidence=1.0,
      status='verified',
      last_confirmed_at=now(),
      updated_at=now();
  end if;
end;
$$;

grant execute on function olivia.answer_farm_question(text,text,jsonb) to authenticated;
