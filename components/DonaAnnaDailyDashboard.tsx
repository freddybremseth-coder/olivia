import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Droplets,
  Gauge,
  Leaf,
  ListChecks,
  Loader2,
  Mountain,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  ReceiptText,
  Truck,
  Waves,
  HelpCircle,
} from 'lucide-react';
import {
  DONA_ANNA_BIAR_SEASON_SETTINGS,
  type FarmObservation,
  type IrrigationEvent,
  type SensorAlert,
  type SensorReading,
} from '../types/farmIoT';
import {
  buildDonaAnnaDecisionAdvice,
  sensorReadingAgeHours,
  isSensorReadingQualityAcceptable,
  SENSOR_ACTION_MAX_AGE_HOURS,
  SENSOR_MIN_QUALITY_SCORE,
  fetchLatestSensorReadings,
  fetchOpenSensorAlerts,
  fetchRecentFarmObservations,
  fetchRecentIrrigationEvents,
  type FarmDecisionAdvice,
} from '../services/farmIoT';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import { fetchCommerceAttention, type CommerceAttention } from '../services/commerceAttention';
import { fetchCommercialReadiness, type CommercialReadiness } from '../services/commerceReadiness';
import { fetchSeasonReadiness, type SeasonReadiness } from '../services/seasonReadiness';
import SeasonReadinessPanel from './SeasonReadinessPanel';
import { fetchSeasonExecution, type SeasonExecution } from '../services/seasonExecution';
import SeasonExecutionPanel, { type SeasonExecutionAction } from './SeasonExecutionPanel';
import { fetchFarmTruthSummary } from '../services/farmJournal';
import { fetchFarmIntelligenceSummary, fetchOpenFarmQuestions, type FarmQuestion } from '../services/farmIntelligence';
import FarmQuestionsPanel from './FarmQuestionsPanel';

type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

type ActionCard = {
  title: string;
  description: string;
  priority: 'Lav' | 'Middels' | 'Høy' | 'Kritisk';
  icon: React.ReactNode;
  targetTab?: string;
  actionLabel?: string;
};

type DailyPriorityItem = {
  id:string;
  title:string;
  description:string;
  source:'Årshjul'|'Olivia'|'Sesong'|'Felt';
  priority:ActionCard['priority'];
  score:number;
  targetTab?:string;
  actionLabel?:string;
};

type SourceFreshness = {
  id:string;
  label:string;
  lastAt?:string;
  ageText:string;
  state:'fresh'|'aging'|'stale'|'missing'|'quality'|'context';
  note:string;
  targetTab:string;
};

function monthName(monthIndex: number): string {
  return new Date(2026, monthIndex - 1, 1).toLocaleString('no-NO', { month: 'long' });
}

function yearWheelStatusLabel(status:string):string {
  const labels:Record<string,string>={
    suggested:'Forslag',
    approved:'I årshjul',
    in_progress:'Pågår',
    postponed:'Utsatt',
    done:'Utført',
    skipped:'Ikke nødvendig',
  };
  return labels[status]||status;
}

function ageHours(value?:string|null,now=new Date()):number|null{
  if(!value)return null;
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return null;
  return Math.max(0,(now.getTime()-date.getTime())/3600000);
}

function humanAge(value?:string|null,now=new Date()):string{
  const hours=ageHours(value,now);
  if(hours==null)return'ingen data';
  if(hours<1)return'mindre enn 1 time siden';
  if(hours<24)return Math.floor(hours)+' t siden';
  const days=Math.floor(hours/24);
  return days+' dag'+(days===1?'':'er')+' siden';
}

function sensorTypeLabel(type:string):string{
  const labels:Record<string,string>={
    soil_moisture:'jordfukt',
    soil_ec:'jord-EC',
    water_ec:'vann-EC',
    flow:'flow',
    pressure:'trykk',
    leaf_wetness:'bladfukt',
    temperature:'temperatur',
    humidity:'luftfukt',
    rain:'regn',
  };
  return labels[type]||type.replaceAll('_',' ');
}

function buildSourceFreshness(
  readings:SensorReading[],
  observations:FarmObservation[],
  irrigationEvents:IrrigationEvent[],
  now=new Date()
):SourceFreshness[]{
  const latestReading=[...readings].sort((a,b)=>new Date(b.measured_at).getTime()-new Date(a.measured_at).getTime())[0];
  const latestByType=new Map<string,SensorReading>();
  for(const reading of readings){
    const existing=latestByType.get(reading.type);
    if(!existing||new Date(reading.measured_at)>new Date(existing.measured_at))latestByType.set(reading.type,reading);
  }
  const sensorTypes=Array.from(latestByType.values());
  const freshSensorTypes=sensorTypes.filter(reading=>{
    const age=sensorReadingAgeHours(reading,now);
    return age!=null&&age<=SENSOR_ACTION_MAX_AGE_HOURS;
  });
  const usableSensorTypes=freshSensorTypes.filter(reading=>isSensorReadingQualityAcceptable(reading));
  const lowQualitySensorTypes=freshSensorTypes.filter(reading=>!isSensorReadingQualityAcceptable(reading));
  const staleSensorTypes=sensorTypes.filter(reading=>{
    const age=sensorReadingAgeHours(reading,now);
    return age==null||age>SENSOR_ACTION_MAX_AGE_HOURS;
  });
  const latestUsableReading=[...usableSensorTypes].sort((a,b)=>new Date(b.measured_at).getTime()-new Date(a.measured_at).getTime())[0];
  const sensorBasisReading=latestUsableReading||latestReading;
  const sensorAge=sensorBasisReading?sensorReadingAgeHours(sensorBasisReading,now):null;
  const freshTypeText=usableSensorTypes.map(reading=>sensorTypeLabel(reading.type)).slice(0,5).join(', ');

  const latestObservation=[...observations].sort((a,b)=>new Date(b.observed_at).getTime()-new Date(a.observed_at).getTime())[0];
  const observationHours=latestObservation?ageHours(latestObservation.observed_at,now):null;
  const latestIrrigation=[...irrigationEvents].sort((a,b)=>new Date(b.started_at).getTime()-new Date(a.started_at).getTime())[0];
  const irrigationHours=latestIrrigation?ageHours(latestIrrigation.started_at,now):null;

  const sensorState:SourceFreshness['state']=!readings.length
    ?'missing'
    :freshSensorTypes.length&&!usableSensorTypes.length&&lowQualitySensorTypes.length
      ?'quality'
      :!usableSensorTypes.length
        ?'stale'
        :staleSensorTypes.length||lowQualitySensorTypes.length||((sensorAge??0)>6)
          ?'aging'
          :'fresh';
  const observationState:SourceFreshness['state']=observationHours==null?'missing':observationHours<=24*7?'fresh':observationHours<=24*21?'aging':'stale';
  const irrigationState:SourceFreshness['state']=irrigationHours==null?'context':irrigationHours<=24*7?'fresh':'context';

  const sensorNote=sensorState==='missing'
    ?'Ingen sensormålinger tilgjengelig.'
    :sensorState==='quality'
      ?'Ferske målinger finnes, men quality_score er under '+SENSOR_MIN_QUALITY_SCORE+'. Operative sensorråd er sperret til en brukbar måling finnes.'
      :sensorState==='stale'
        ?'Ingen registrerte sensortyper har brukbar fersk måling innen 24 timer. Operative sensorråd er sperret.'
        :(usableSensorTypes.length+' brukbar'+(usableSensorTypes.length===1?' fersk sensortype':'e ferske sensortyper')+(freshTypeText?': '+freshTypeText:'')+(lowQualitySensorTypes.length?'. '+lowQualitySensorTypes.length+' fersk'+(lowQualitySensorTypes.length===1?' type har':'e typer har')+' lav quality_score.':'')+(staleSensorTypes.length?'. '+staleSensorTypes.length+' registrert'+(staleSensorTypes.length===1?' type har':'e typer har')+' for gamle målinger.':'.'));

  return[
    {
      id:'sensors',
      label:'Sensorer',
      lastAt:sensorBasisReading?.measured_at,
      ageText:humanAge(sensorBasisReading?.measured_at,now),
      state:sensorState,
      note:sensorNote,
      targetTab:'iot',
    },
    {
      id:'observations',
      label:'Feltobservasjoner',
      lastAt:latestObservation?.observed_at,
      ageText:humanAge(latestObservation?.observed_at,now),
      state:observationState,
      note:observationState==='stale'?'Feltbildet bør oppdateres.':observationState==='missing'?'Ingen feltobservasjon registrert.':observationState==='aging'?'Begynner å bli gammelt som feltgrunnlag.':'Nylig feltobservasjon registrert.',
      targetTab:'field_observations',
    },
    {
      id:'irrigation',
      label:'Vanningslogg',
      lastAt:latestIrrigation?.started_at,
      ageText:humanAge(latestIrrigation?.started_at,now),
      state:irrigationState,
      note:irrigationHours==null?'Ingen vanningshendelser registrert. Dette er ikke avvik i seg selv.':irrigationHours>24*7?'Ingen nyere vanning registrert. Vurder sammen med regn og parselltype.':'Nylig vanningshendelse registrert.',
      targetTab:'irrigation_log',
    },
  ];
}

function getBiarSeasonText(date = new Date()): string {
  const month = date.getMonth() + 1;
  if ([1, 2].includes(month)) return 'Beskjæring, vedlikehold, planlegging og jordforbedring.';
  if ([3, 4].includes(month)) return 'Jordprøver, gjødsling, kontroll av vanningssystem og vårvekst.';
  if ([5, 6].includes(month)) return 'Blomstring, fruktsetting og stabil vannbalanse.';
  if ([7, 8].includes(month)) return 'Tørkestress, dryppslanger, unge trær og EC/salt bør følges tett.';
  if (month === 9) return 'Bordoliven-vurdering, skadedyr, saltstatus og høsteforberedelser.';
  if (month === 10) return 'Modningsovervåkning, bordoliven og planlegging av utstyr/batcher.';
  if ([11, 12].includes(month)) return 'Senere Biar-høsting, pressing, bordoliven og kvalitetsmålinger.';
  return 'Overvåk sesong, vær og feltdata.';
}

function buildActionCards(advice: FarmDecisionAdvice, readings: SensorReading[], alerts: SensorAlert[], irrigationEvents: IrrigationEvent[], observations: FarmObservation[]): ActionCard[] {
  const cards: ActionCard[] = [];

  const newestReading=[...readings].sort((a,b)=>new Date(b.measured_at).getTime()-new Date(a.measured_at).getTime())[0];
  const newestReadingAge=newestReading?sensorReadingAgeHours(newestReading):null;
  const newestByType=new Map<string,SensorReading>();
  for(const reading of readings){
    const existing=newestByType.get(reading.type);
    if(!existing||new Date(reading.measured_at)>new Date(existing.measured_at))newestByType.set(reading.type,reading);
  }
  const latestTypes=Array.from(newestByType.values());
  const lowQualityFreshTypes=latestTypes.filter(reading=>{
    const age=sensorReadingAgeHours(reading);
    return age!=null&&age<=SENSOR_ACTION_MAX_AGE_HOURS&&!isSensorReadingQualityAcceptable(reading);
  });
  const usableFreshTypes=latestTypes.filter(reading=>{
    const age=sensorReadingAgeHours(reading);
    return age!=null&&age<=SENSOR_ACTION_MAX_AGE_HOURS&&isSensorReadingQualityAcceptable(reading);
  });
  if(newestReadingAge!=null&&newestReadingAge>SENSOR_ACTION_MAX_AGE_HOURS){
    cards.push({
      title:'Forny sensordata',
      description:'Siste sensormåling er '+humanAge(newestReading.measured_at)+'. Gamle målinger brukes ikke til operative råd.',
      priority:'Høy',
      icon:<Gauge size={18}/>,
      targetTab:'iot',
      actionLabel:'Kontroller sensorer',
    });
  }

  if(lowQualityFreshTypes.length){
    cards.push({
      title:'Kontroller sensordatakvalitet',
      description:lowQualityFreshTypes.length+' fersk sensortype'+(lowQualityFreshTypes.length===1?' har':'r har')+' quality_score under '+SENSOR_MIN_QUALITY_SCORE+'. '+(usableFreshTypes.length?'De er utelatt fra råd.':'Ingen ferske sensortyper er brukbare til operative råd akkurat nå.'),
      priority:usableFreshTypes.length?'Middels':'Høy',
      icon:<ShieldCheck size={18}/>,
      targetTab:'iot',
      actionLabel:'Kontroller sensorer',
    });
  }

  if (!readings.length && !alerts.length && !irrigationEvents.length && !observations.length) {
    cards.push({
      title: 'Bygg første datagrunnlag',
      description: 'Registrer sensor, manuell måling, vanning eller feltobservasjon. Dashboardet viser ikke demo-data.',
      priority: 'Høy',
      icon: <ShieldCheck size={18} />,
      targetTab: 'field_observations',
      actionLabel: 'Registrer første observasjon',
    });
    return cards;
  }

  if (advice.recommended_action === 'irrigate') {
    cards.push({
      title: 'Prioriter vanning',
      description: 'Sjekk jordfukt på riktig dybde og vann unge/svake trær først.',
      priority: 'Kritisk',
      icon: <Droplets size={18} />,
      targetTab: 'irrigation',
      actionLabel: 'Åpne vanning',
    });
  }

  if (advice.recommended_action === 'inspect_dripline') {
    cards.push({
      title: 'Kontroller dryppslanger',
      description: 'Lavt trykk eller avvik mellom flow og pressure kan bety lekkasje, tett filter eller ødelagt slange.',
      priority: 'Høy',
      icon: <Gauge size={18} />,
      targetTab: 'irrigation',
      actionLabel: 'Kontroller vanning',
    });
  }

  if (advice.recommended_action === 'check_salinity') {
    cards.push({
      title: 'Kontroller salt/EC',
      description: 'Sammenlign jord-EC og vann-EC før mer intensiv vanning.',
      priority: 'Høy',
      icon: <Waves size={18} />,
      targetTab: 'salinity',
      actionLabel: 'Åpne EC / salt',
    });
  }

  const lowBattery = readings.find(reading => typeof reading.battery_percent === 'number' && reading.battery_percent < 30);
  if (lowBattery) {
    cards.push({
      title: 'Bytt eller lad batteri',
      description: `${lowBattery.sensor_id} har lavt batterinivå.`,
      priority: 'Middels',
      icon: <AlertTriangle size={18} />,
      targetTab: 'iot',
      actionLabel: 'Åpne sensorer',
    });
  }

  const criticalAlert = alerts.find(alert => alert.severity === 'critical');
  if (criticalAlert) {
    cards.push({
      title: criticalAlert.title,
      description: criticalAlert.message,
      priority: 'Kritisk',
      icon: <AlertTriangle size={18} />,
      targetTab: 'iot',
      actionLabel: 'Åpne varselkilde',
    });
  }

  if (!irrigationEvents.length) {
    cards.push({
      title: 'Registrer neste vanning',
      description: 'Ingen vanningshendelser finnes ennå. Vanningsloggen gir Olivia bedre grunnlag for råd.',
      priority: 'Middels',
      icon: <Droplets size={18} />,
      targetTab: 'irrigation_log',
      actionLabel: 'Registrer vanning',
    });
  }

  if (!observations.length) {
    cards.push({
      title: 'Ta feltobservasjon',
      description: 'Legg inn bilder/notater fra feltet slik at tall kan kobles til faktisk tilstand på trær og vanningssystem.',
      priority: 'Lav',
      icon: <Leaf size={18} />,
      targetTab: 'field_observations',
      actionLabel: 'Legg inn observasjon',
    });
  }

  if (cards.length === 0) {
    cards.push({
      title: 'Fortsett overvåkning',
      description: 'Ingen kritiske avvik. Ta en visuell kontroll av unge trær, dryppslanger og feltobservasjoner.',
      priority: 'Lav',
      icon: <CheckCircle2 size={18} />,
      targetTab: 'farm_journal',
      actionLabel: 'Se driftsjournal',
    });
  }

  return cards.slice(0, 4);
}

function priorityClass(priority: ActionCard['priority']): string {
  if (priority === 'Kritisk') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (priority === 'Høy') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (priority === 'Middels') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-green-500/20 bg-green-500/10 text-green-400';
}

function farmDelayConsequence(activityType:string):string {
  const type=String(activityType||'').toLowerCase();
  if(['irrigation'].includes(type))return'Kan påvirke vannbalanse og stress dersom behovet fortsatt er reelt.';
  if(['pest_control','disease_control','spraying'].includes(type))return'Forsinkelse kan gi større skade dersom problemet fortsatt er aktivt. Behov må bekreftes i felt før behandling.';
  if(['harvest'].includes(type))return'Kan påvirke modenhet, kvalitet og videre produksjonsflyt. Faktisk høstetid må styres av feltforhold.';
  if(['maintenance'].includes(type))return'Kan påvirke driftssikkerheten dersom utstyret eller anlegget fortsatt har et avvik.';
  if(['fertilization','soil_work','cultivation'].includes(type))return'Tidspunktet kan være viktig, men tiltaket må fortsatt vurderes mot vær, jord og faktisk behov.';
  if(['pruning','desuckering','young_tree_care'].includes(type))return'Forsinkelsen bør avklares mot treets utvikling og arbeidsvindu før tiltaket gjennomføres.';
  if(['inspection'].includes(type))return'En forsinket kontroll kan bety at et feltavvik ikke er avklart ennå.';
  return'Forsinkelsen bør avklares: utført, fortsatt nødvendig, utsatt med grunn eller ikke nødvendig.';
}

function daysSince(value?:string|null):number|null {
  if(!value)return null;
  const date=new Date(String(value).slice(0,10)+'T12:00:00');
  if(Number.isNaN(date.getTime()))return null;
  const today=new Date();today.setHours(12,0,0,0);
  return Math.max(0,Math.round((today.getTime()-date.getTime())/86400000));
}

type DelaySummary = {
  criticalOverdue:number;
  overdue:number;
  inProgress:number;
  postponed:number;
  dueToday:number;
};

function buildDelaySummary(farmTruth:any):DelaySummary {
  const today=new Date();today.setHours(12,0,0,0);
  const summary:DelaySummary={criticalOverdue:0,overdue:0,inProgress:0,postponed:0,dueToday:0};

  for(const item of farmTruth?.yearWheel||[]){
    if(item.status==='in_progress')summary.inProgress++;
    if(item.status==='postponed')summary.postponed++;
    if(['done','skipped','suggested','postponed'].includes(item.status))continue;

    const hasExactDay=Boolean(item.target_day);
    const target=hasExactDay
      ?new Date(item.target_year,item.target_month-1,item.target_day)
      :new Date(item.target_year,item.target_month,0);
    target.setHours(12,0,0,0);
    const days=Math.round((target.getTime()-today.getTime())/86400000);

    if(days===0&&hasExactDay)summary.dueToday++;
    if(days<0){
      summary.overdue++;
      if(hasExactDay&&Math.abs(days)>=3)summary.criticalOverdue++;
    }
  }

  for(const item of farmTruth?.yearWheel||[]){
    if(item.status!=='postponed'||!item.postponed_until)continue;
    const followUp=new Date(item.postponed_until+'T12:00:00');
    if(Number.isNaN(followUp.getTime()))continue;
    const days=Math.round((followUp.getTime()-today.getTime())/86400000);
    if(days<0){
      summary.overdue++;
      if(Math.abs(days)>=3)summary.criticalOverdue++;
    }
  }
  return summary;
}

type ParcelAttentionRow = {
  parcelId:string;
  parcelName:string;
  critical:number;
  overdue:number;
  inProgress:number;
  postponed:number;
  score:number;
  lastActivityTitle?:string;
  lastActivityDate?:string;
  lastObservationDate?:string;
  observationAgeDays:number|null;
  observationMissing:boolean;
};

function buildParcelAttention(farmTruth:any):ParcelAttentionRow[] {
  const today=new Date();today.setHours(12,0,0,0);
  const parcelNames=new Map<string,string>((farmTruth?.parcels||[]).map((p:any)=>[String(p.id),String(p.name||p.id)] as [string,string]));
  const rows=new Map<string,ParcelAttentionRow>();

  const ensure=(parcelId:string)=>{
    const id=parcelId||'farm';
    if(!rows.has(id)){
      const latestEvent=farmTruth?.latestEventByParcel?.[id];
      const latestObservation=farmTruth?.latestObservationByParcel?.[id];
      const observationAgeDays=daysSince(latestObservation?.observed_at);
      rows.set(id,{
        parcelId:id,
        parcelName:id==='farm'?'Hele gården':(parcelNames.get(id)||id),
        critical:0,overdue:0,inProgress:0,postponed:0,score:0,
        lastActivityTitle:latestEvent?.title||undefined,
        lastActivityDate:latestEvent?.occurred_on||latestEvent?.planned_for||latestEvent?.period_label||undefined,
        lastObservationDate:latestObservation?.observed_at?String(latestObservation.observed_at).slice(0,10):undefined,
        observationAgeDays,
        observationMissing:!latestObservation,
      });
    }
    return rows.get(id)!;
  };

  for(const item of farmTruth?.yearWheel||[]){
    if(['done','skipped','suggested'].includes(item.status))continue;
    const row=ensure(item.parcel_id||'farm');
    if(item.status==='in_progress'){
      row.inProgress++;
      row.score+=8;
    }
    if(item.status==='postponed'){
      row.postponed++;
      row.score+=4;
      if(item.postponed_until){
        const followUp=new Date(item.postponed_until+'T12:00:00');
        if(!Number.isNaN(followUp.getTime())){
          const days=Math.round((followUp.getTime()-today.getTime())/86400000);
          if(days<0){
            row.overdue++;
            row.score+=12;
            if(Math.abs(days)>=3){row.critical++;row.score+=20;}
          }
        }
      }
      continue;
    }

    const hasExactDay=Boolean(item.target_day);
    const target=hasExactDay
      ?new Date(item.target_year,item.target_month-1,item.target_day)
      :new Date(item.target_year,item.target_month,0);
    target.setHours(12,0,0,0);
    const days=Math.round((target.getTime()-today.getTime())/86400000);
    if(days<0){
      row.overdue++;
      row.score+=12;
      if(hasExactDay&&Math.abs(days)>=3){row.critical++;row.score+=20;}
    }
  }

  for(const parcel of farmTruth?.parcels||[]){
    const row=ensure(String(parcel.id));
    if(row.observationMissing)row.score+=4;
    else if((row.observationAgeDays??0)>=30)row.score+=6;
    else if((row.observationAgeDays??0)>=21)row.score+=3;
  }

  return Array.from(rows.values())
    .filter(row=>row.critical||row.overdue||row.inProgress||row.postponed||row.observationMissing||(row.observationAgeDays??0)>=21)
    .sort((a,b)=>b.score-a.score||a.parcelName.localeCompare(b.parcelName,'no'))
    .slice(0,8);
}

type WeekBrief = {
  completed7:number;
  dueNext7:number;
  postponedFollowUps7:number;
  observations7:number;
};

function buildWeekBrief(farmTruth:any):WeekBrief {
  const today=new Date();today.setHours(12,0,0,0);
  const sevenAgo=new Date(today);sevenAgo.setDate(sevenAgo.getDate()-7);
  const sevenAhead=new Date(today);sevenAhead.setDate(sevenAhead.getDate()+7);

  const completed7=(farmTruth?.events||[]).filter((event:any)=>{
    if(event.event_status!=='completed'||!event.occurred_on)return false;
    const date=new Date(String(event.occurred_on).slice(0,10)+'T12:00:00');
    return !Number.isNaN(date.getTime())&&date>=sevenAgo&&date<=today;
  }).length;

  let dueNext7=0;
  let postponedFollowUps7=0;
  for(const item of farmTruth?.yearWheel||[]){
    if(['done','skipped','suggested'].includes(item.status))continue;
    if(item.status==='postponed'&&item.postponed_until){
      const date=new Date(item.postponed_until+'T12:00:00');
      if(!Number.isNaN(date.getTime())&&date>=today&&date<=sevenAhead)postponedFollowUps7++;
      continue;
    }
    if(!item.target_day)continue;
    const date=new Date(item.target_year,item.target_month-1,item.target_day);
    date.setHours(12,0,0,0);
    if(date>=today&&date<=sevenAhead)dueNext7++;
  }

  const observations7=(farmTruth?.observations||[]).filter((observation:any)=>{
    if(!observation.observed_at)return false;
    const date=new Date(String(observation.observed_at).slice(0,10)+'T12:00:00');
    return !Number.isNaN(date.getTime())&&date>=sevenAgo&&date<=today;
  }).length;

  return{completed7,dueNext7,postponedFollowUps7,observations7};
}

function buildDailyTopFive(params:{
  farmTruth:any;
  farmQuestions:FarmQuestion[];
  seasonExecution:SeasonExecution|null;
  actions:ActionCard[];
}):DailyPriorityItem[]{
  const items:DailyPriorityItem[]=[];
  const today=new Date();
  today.setHours(12,0,0,0);

  for(const item of params.farmTruth?.yearWheel||[]){
    if(['done','skipped','suggested'].includes(item.status))continue;
    const hasExactDay=Boolean(item.target_day);
    const target=hasExactDay
      ?new Date(item.target_year,item.target_month-1,item.target_day)
      :new Date(item.target_year,item.target_month,0);
    target.setHours(12,0,0,0);
    const days=Math.round((target.getTime()-today.getTime())/86400000);
    if(item.status==='in_progress'){
      const overdueDays=days<0?Math.abs(days):0;
      const activeDays=daysSince(item.started_at);
      items.push({
        id:'wheel-progress-'+item.id,
        title:item.title,
        description:(overdueDays>0?overdueDays+' dag'+(overdueDays===1?'':'er')+' forsinket. ':'')+(activeDays!=null?'Pågår i '+activeDays+' dag'+(activeDays===1?'':'er')+'. ':'')+farmDelayConsequence(item.activity_type),
        source:'Årshjul',
        priority:overdueDays>=3?'Kritisk':'Høy',
        score:overdueDays>=3?104:overdueDays>0?98:88,
        targetTab:'farm_journal:yearwheel',
        actionLabel:'Fullfør / avklar',
      });
    }else if(item.status==='postponed'){
      const followUp=item.postponed_until?new Date(item.postponed_until+'T12:00:00'):null;
      const followUpDays=followUp&&!Number.isNaN(followUp.getTime())?Math.round((followUp.getTime()-today.getTime())/86400000):null;
      const followUpOverdue=followUpDays!=null&&followUpDays<0?Math.abs(followUpDays):0;
      items.push({
        id:'wheel-postponed-'+item.id,
        title:item.title,
        description:(followUpOverdue>0?'Ny oppfølgingsdato er '+followUpOverdue+' dag'+(followUpOverdue===1?'':'er')+' passert. ':followUpDays===0?'Skal følges opp i dag. ':item.postponed_until?'Utsatt til '+item.postponed_until+'. ':'')+(item.postponed_reason?'Grunn: '+item.postponed_reason+'. ':'')+farmDelayConsequence(item.activity_type),
        source:'Årshjul',
        priority:followUpOverdue>=3?'Kritisk':followUpOverdue>0?'Høy':'Middels',
        score:followUpOverdue>=3?101:followUpOverdue>0?89:68,
        targetTab:'farm_journal:yearwheel',
        actionLabel:'Avklar utsettelse',
      });
    }else if(item.status==='approved'&&days<0){
      const overdueDays=Math.abs(days);
      items.push({
        id:'wheel-overdue-'+item.id,
        title:item.title,
        description:(hasExactDay?overdueDays+' dag'+(overdueDays===1?'':'er')+' forsinket. ':'Planlagt måned er passert. ')+farmDelayConsequence(item.activity_type),
        source:'Årshjul',
        priority:hasExactDay&&overdueDays>=3?'Kritisk':'Høy',
        score:hasExactDay?(overdueDays>=7?103:overdueDays>=3?99:86+overdueDays):90,
        targetTab:'farm_journal:yearwheel',
        actionLabel:'Utført / pågår / utsett',
      });
    }else if(item.status==='approved'&&days<=7){
      items.push({
        id:'wheel-soon-'+item.id,
        title:item.title,
        description:hasExactDay?(days===0?'Planlagt tidspunkt er i dag.':'Planlagt tidspunkt er om '+days+' dag'+(days===1?'':'er')+'.'):'Planlagt i inneværende måned.',
        source:'Årshjul',
        priority:'Middels',
        score:64+(7-days),
        targetTab:'farm_journal:yearwheel',
        actionLabel:'Åpne årshjul',
      });
    }
  }

  const qScore:Record<string,number>={critical:98,high:86,medium:62,low:42};
  const qPriority:Record<string,ActionCard['priority']>={critical:'Kritisk',high:'Høy',medium:'Middels',low:'Lav'};
  for(const q of params.farmQuestions||[]){
    items.push({
      id:'question-'+q.id,
      title:q.question,
      description:q.reason||'Olivia trenger et svar før den kan bruke informasjonen sikkert.',
      source:'Olivia',
      priority:qPriority[q.priority]||'Middels',
      score:qScore[q.priority]||60,
      targetTab:'farm_journal:learning',
      actionLabel:'Svar Olivia',
    });
  }

  for(const row of params.seasonExecution?.parcels||[]){
    if(row.attentionLevel==='none')continue;
    items.push({
      id:'season-'+row.parcelId+'-'+row.stage,
      title:row.parcelName+' · '+row.stageLabel,
      description:row.attentionText||row.nextAction,
      source:'Sesong',
      priority:row.attentionLevel==='critical'?'Kritisk':row.attentionLevel==='warning'?'Høy':'Middels',
      score:row.attentionLevel==='critical'?96:row.attentionLevel==='warning'?80:58,
      targetTab:row.targetTab,
      actionLabel:'Åpne arbeidsflate',
    });
  }

  for(const action of params.actions){
    if(action.priority==='Lav'&&items.length>=5)continue;
    items.push({
      id:'field-'+action.title,
      title:action.title,
      description:action.description,
      source:'Felt',
      priority:action.priority,
      score:action.priority==='Kritisk'?94:action.priority==='Høy'?78:action.priority==='Middels'?56:30,
      targetTab:action.targetTab,
      actionLabel:action.actionLabel,
    });
  }

  const seen=new Set<string>();
  return items
    .sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title,'no'))
    .filter(item=>{
      const key=(item.title+'|'+item.targetTab).toLowerCase();
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    })
    .slice(0,5);
}

async function safeLoad<T>(promise: Promise<T>, label: string, fallback: T, failures?: string[]): Promise<T> {
  try { return await promise; }
  catch (error) {
    failures?.push(label);
    console.warn('[DonaAnnaDailyDashboard] '+label+' failed', error);
    return fallback;
  }
}

const DonaAnnaDailyDashboard: React.FC<{ onNavigate?: (tab: string) => void; onSeasonAction?: (action: SeasonExecutionAction) => void }> = ({ onNavigate, onSeasonAction }) => {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<SensorAlert[]>([]);
  const [irrigationEvents, setIrrigationEvents] = useState<IrrigationEvent[]>([]);
  const [observations, setObservations] = useState<FarmObservation[]>([]);
  const [commerceAttention, setCommerceAttention] = useState<CommerceAttention[]>([]);
  const [commercialReadiness, setCommercialReadiness] = useState<CommercialReadiness | null>(null);
  const [seasonReadiness, setSeasonReadiness] = useState<SeasonReadiness | null>(null);
  const [seasonExecution, setSeasonExecution] = useState<SeasonExecution | null>(null);
  const [farmTruth, setFarmTruth] = useState<any>(null);
  const [farmIntelligence, setFarmIntelligence] = useState<any>(null);
  const [farmQuestions, setFarmQuestions] = useState<FarmQuestion[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceFailures, setSourceFailures] = useState<string[]>([]);

  const advice = useMemo(() => buildDonaAnnaDecisionAdvice(readings, alerts), [readings, alerts]);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const failures:string[]=[];
      const [latestReadings, openAlerts, recentIrrigation, recentObservations, commerceRows, readiness, seasonStatus, executionStatus, truthStatus, intelligenceStatus, questionRows] = await Promise.all([
        safeLoad(fetchLatestSensorReadings(300),'Sensorer',[],failures),
        safeLoad(fetchOpenSensorAlerts(),'Sensorvarsler',[],failures),
        safeLoad(fetchRecentIrrigationEvents(10),'Vanningslogg',[],failures),
        safeLoad(fetchRecentFarmObservations(10),'Feltobservasjoner',[],failures),
        safeLoad(fetchCommerceAttention(),'Ordre og faktura',[],failures),
        safeLoad(fetchCommercialReadiness(),'Kommersiell klargjøring',null,failures),
        safeLoad(fetchSeasonReadiness(),'Sesongklarhet',null,failures),
        safeLoad(fetchSeasonExecution(),'Sesonggjennomføring',null,failures),
        safeLoad(fetchFarmTruthSummary(),'Driftsjournal',null,failures),
        safeLoad(fetchFarmIntelligenceSummary(),'Olivia Intelligence',null,failures),
        safeLoad(fetchOpenFarmQuestions({limit:5}),'Olivia-spørsmål',[],failures),
      ]);
      setSourceFailures(failures);

      setReadings(latestReadings);
      setAlerts(openAlerts);
      setIrrigationEvents(recentIrrigation);
      setObservations(recentObservations);
      setCommerceAttention(commerceRows);
      setCommercialReadiness(readiness);
      setSeasonReadiness(seasonStatus);
      setSeasonExecution(executionStatus);
      setFarmTruth(truthStatus);
      setFarmIntelligence(intelligenceStatus);
      setFarmQuestions(questionRows);
      setLoadState(latestReadings.length || openAlerts.length || recentIrrigation.length || recentObservations.length || commerceRows.length || (readiness && readiness.issues ? readiness.issues.length : 0) || (seasonStatus && seasonStatus.steps ? seasonStatus.steps.length : 0) || (executionStatus && executionStatus.parcels ? executionStatus.parcels.length : 0) || truthStatus || (intelligenceStatus && intelligenceStatus.openQuestionCount ? intelligenceStatus.openQuestionCount : 0) ? 'supabase' : 'empty');
      setLastRefresh(new Date());
    } catch (error) {
      setReadings([]);
      setAlerts([]);
      setIrrigationEvents([]);
      setObservations([]);
      setCommerceAttention([]);
      setCommercialReadiness(null);
      setSeasonReadiness(null);
      setSeasonExecution(null);
      setFarmTruth(null);
      setFarmIntelligence(null);
      setFarmQuestions([]);
      setSourceFailures(['Daily']);
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente Daily Dashboard-data fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  },[]);

  useEffect(() => {
    const refresh=()=>{ if(document.visibilityState!=='hidden') void loadDashboard(); };
    void loadDashboard();
    window.addEventListener('olivia:farm-truth-updated',refresh as EventListener);
    window.addEventListener('focus',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{
      window.removeEventListener('olivia:farm-truth-updated',refresh as EventListener);
      window.removeEventListener('focus',refresh);
      document.removeEventListener('visibilitychange',refresh);
    };
  }, [loadDashboard]);

  const actions = buildActionCards(advice, readings, alerts, irrigationEvents, observations);
  const topFive = buildDailyTopFive({farmTruth,farmQuestions,seasonExecution,actions});
  const delaySummary = buildDelaySummary(farmTruth);
  const parcelAttention = buildParcelAttention(farmTruth);
  const weekBrief = buildWeekBrief(farmTruth);
  const sourceFreshness = buildSourceFreshness(readings,observations,irrigationEvents);
  const currentMonth = new Date().getMonth() + 1;
  const oilWindow = DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_oil;
  const tableWindow = DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_table_olives;
  const sourceLabel = loadState === 'supabase' ? (sourceFailures.length ? `Supabase · ${11-sourceFailures.length}/11 kilder` : 'Supabase · 11/11 kilder') : loadState === 'empty' ? 'Supabase · ingen data ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';
  const orderAttention = commerceAttention.filter(item => item.event_type === 'order_process');
  const readyToShip = commerceAttention.filter(item => item.event_type === 'order_ready_to_ship');
  const overdueInvoices = commerceAttention.filter(item => item.event_type === 'invoice_overdue');
  const dueSoonInvoices = commerceAttention.filter(item => item.event_type === 'invoice_due_soon');

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,0.12),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><Leaf className="text-green-400" /> Daily Dashboard</h2>
              <p className="text-slate-400 text-sm mt-2">Dagsbilde basert på ekte Supabase-data fra sensorer, varsler, vanning og feltobservasjoner.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Biar · {sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <button onClick={loadDashboard} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all">
            <RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {farmTruth&&<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          {label:'Kritisk forsinket',value:delaySummary.criticalOverdue,tone:delaySummary.criticalOverdue?'border-red-500/30 bg-red-500/10 text-red-300':'border-white/10 bg-white/[0.03] text-slate-300'},
          {label:'Forsinket totalt',value:delaySummary.overdue,tone:delaySummary.overdue?'border-amber-400/25 bg-amber-400/[0.07] text-amber-200':'border-white/10 bg-white/[0.03] text-slate-300'},
          {label:'Pågår',value:delaySummary.inProgress,tone:delaySummary.inProgress?'border-cyan-500/25 bg-cyan-500/[0.07] text-cyan-200':'border-white/10 bg-white/[0.03] text-slate-300'},
          {label:'Utsatt',value:delaySummary.postponed,tone:delaySummary.postponed?'border-amber-300/20 bg-amber-300/[0.05] text-amber-100':'border-white/10 bg-white/[0.03] text-slate-300'},
          {label:'Forfaller i dag',value:delaySummary.dueToday,tone:delaySummary.dueToday?'border-blue-400/25 bg-blue-400/[0.07] text-blue-200':'border-white/10 bg-white/[0.03] text-slate-300'},
        ].map(item=><button key={item.label} onClick={()=>onNavigate?.('farm_journal:yearwheel')} className={'rounded-2xl border p-4 text-left transition hover:bg-white/[0.05] '+item.tone}>
          <p className="text-[9px] uppercase tracking-widest font-black opacity-80">{item.label}</p>
          <p className="text-2xl font-black mt-1">{item.value}</p>
        </button>)}
      </div>}

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}
      {sourceFailures.length>0&&loadState!=='error'&&<div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4"><div className="flex items-start gap-3"><AlertTriangle size={17} className="text-amber-300 mt-0.5"/><div><p className="text-sm font-bold text-white">Daily er lastet, men noen datakilder svarte ikke</p><p className="text-xs text-slate-500 mt-1">Manglende kilde skal ikke tolkes som at det ikke finnes data. Feilet nå: {sourceFailures.join(', ')}.</p></div></div></div>}

      {isLoading && loadState === 'loading' ? (
        <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter dagsdata fra Supabase...</div>
      ) : null}

      <div className="glass rounded-[2rem] p-6 border border-white/10">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] font-black text-blue-300">Datakvalitet</p>
          <h3 className="text-xl font-black text-white mt-1">Hvor ferskt er beslutningsgrunnlaget?</h3>
          <p className="text-xs text-slate-500 mt-2">Gamle sensormålinger beholdes som historikk, men Olivia bruker dem ikke som om de beskriver gården nå.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
          {sourceFreshness.map(source=>{
            const tone=source.state==='fresh'?'border-green-500/20 bg-green-500/[0.05]':source.state==='aging'||source.state==='quality'?'border-amber-300/20 bg-amber-300/[0.05]':source.state==='stale'||source.state==='missing'?'border-red-500/20 bg-red-500/[0.05]':'border-white/10 bg-black/20';
            const textTone=source.state==='fresh'?'text-green-300':source.state==='aging'||source.state==='quality'?'text-amber-200':source.state==='stale'||source.state==='missing'?'text-red-300':'text-slate-300';
            return <button key={source.id} onClick={()=>onNavigate?.(source.targetTab)} className={'rounded-2xl border p-4 text-left transition hover:bg-white/[0.05] '+tone}>
              <div className="flex items-start justify-between gap-3"><p className="text-sm font-black text-white">{source.label}</p><span className={'text-[9px] uppercase tracking-widest font-black '+textTone}>{source.state==='fresh'?'Fersk':source.state==='aging'?'Aldrende':source.state==='quality'?'Lav kvalitet':source.state==='stale'?'For gammel':source.state==='missing'?'Mangler':'Kontekst'}</span></div>
              <p className={'text-xs font-bold mt-3 '+textTone}>{source.ageText}</p>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{source.note}</p>
            </button>;
          })}
        </div>
      </div>

      {farmTruth&&<div className="glass rounded-[2rem] p-6 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] font-black text-green-300">Denne uken</p>
            <h3 className="text-xl font-black text-white mt-1">Kort driftsbrief</h3>
            <p className="text-xs text-slate-500 mt-2">Faktisk utført siste 7 dager og det som har eksakt dato de neste 7 dagene. Månedspunkter får ikke en oppdiktet ukedato.</p>
          </div>
          {onNavigate&&<button onClick={()=>onNavigate('farm_journal')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white">Åpne driftsjournal →</button>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="rounded-2xl border border-green-500/15 bg-green-500/[0.04] p-4"><p className="text-[9px] uppercase tracking-widest text-green-300 font-black">Utført siste 7d</p><p className="text-2xl font-black text-white mt-1">{weekBrief.completed7}</p></div>
          <div className="rounded-2xl border border-blue-400/15 bg-blue-400/[0.04] p-4"><p className="text-[9px] uppercase tracking-widest text-blue-200 font-black">Forfaller neste 7d</p><p className="text-2xl font-black text-white mt-1">{weekBrief.dueNext7}</p></div>
          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-4"><p className="text-[9px] uppercase tracking-widest text-amber-200 font-black">Utsatt oppfølging</p><p className="text-2xl font-black text-white mt-1">{weekBrief.postponedFollowUps7}</p></div>
          <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4"><p className="text-[9px] uppercase tracking-widest text-cyan-200 font-black">Feltobservasjoner 7d</p><p className="text-2xl font-black text-white mt-1">{weekBrief.observations7}</p></div>
        </div>
      </div>}

      {farmTruth&&<div className="glass rounded-[2rem] p-6 border border-white/10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] font-black text-cyan-300">Oppmerksomhet per parsell</p>
            <h3 className="text-xl font-black text-white mt-1">Hvor på gården må dere se først?</h3>
            <p className="text-xs text-slate-500 mt-2">Viser parseller med driftsoppfølging eller manglende/gammel feltobservasjon. Klikk en parsell for filtrert årshjul.</p>
          </div>
          {onNavigate&&<button onClick={()=>onNavigate('farm_journal:yearwheel')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white">Åpne årshjul →</button>}
        </div>
        {parcelAttention.length>0?<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-5">
          {parcelAttention.map(row=><button key={row.parcelId} onClick={()=>onNavigate?.(row.parcelId==='farm'?'farm_journal:yearwheel':'farm_journal:yearwheel:'+row.parcelId)} className={'rounded-2xl border p-4 text-left transition hover:bg-white/[0.05] '+(row.critical?'border-red-500/25 bg-red-500/[0.06]':row.overdue?'border-amber-400/20 bg-amber-400/[0.05]':'border-white/10 bg-black/20')}>
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-sm font-black text-white">{row.parcelName}</p><p className="text-[10px] uppercase tracking-widest text-slate-600 mt-1">Driftsoppfølging</p></div>
              <div className={'rounded-full px-2.5 py-1 text-[10px] font-black '+(row.critical?'bg-red-500/15 text-red-300':row.overdue?'bg-amber-400/10 text-amber-200':'bg-cyan-500/10 text-cyan-200')}>{row.score}</div>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div><p className="text-[9px] text-slate-600 uppercase">Kritisk</p><p className={'font-black mt-1 '+(row.critical?'text-red-300':'text-slate-500')}>{row.critical}</p></div>
              <div><p className="text-[9px] text-slate-600 uppercase">Forsinket</p><p className={'font-black mt-1 '+(row.overdue?'text-amber-200':'text-slate-500')}>{row.overdue}</p></div>
              <div><p className="text-[9px] text-slate-600 uppercase">Pågår</p><p className={'font-black mt-1 '+(row.inProgress?'text-cyan-200':'text-slate-500')}>{row.inProgress}</p></div>
              <div><p className="text-[9px] text-slate-600 uppercase">Utsatt</p><p className={'font-black mt-1 '+(row.postponed?'text-amber-100':'text-slate-500')}>{row.postponed}</p></div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-3 space-y-1">
              <p className={'text-[10px] '+(row.observationMissing||(row.observationAgeDays??0)>=21?'text-amber-200':'text-slate-500')}>
                Feltobservasjon: {row.observationMissing?'ingen registrert':row.observationAgeDays===0?'i dag':row.observationAgeDays+' dag'+(row.observationAgeDays===1?'':'er')+' siden'}
              </p>
              {row.lastActivityTitle&&<p className="text-[10px] text-slate-500">Siste aktivitet: {row.lastActivityTitle}{row.lastActivityDate?' · '+String(row.lastActivityDate).slice(0,10):''}</p>}
            </div>
          </button>)}
        </div>:<div className="mt-5 rounded-2xl border border-green-500/15 bg-green-500/[0.04] p-4 text-sm text-green-100"><p className="font-bold">Ingen parseller krever særskilt oppfølging akkurat nå.</p><p className="text-xs text-slate-500 mt-1">Årshjulet har ingen aktive forsinkelser, pågående eller utsatte punkter per parsell.</p></div>}
      </div>}

      <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/[0.035]">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] font-black text-[#d9b657]">Dette bør du gjøre i dag</p>
            <h3 className="text-2xl font-black text-white mt-1">Olivia Top 5</h3>
            <p className="text-xs text-slate-500 mt-2">Prioritert fra årshjul, åpne avklaringer, sesongstatus og feltdata. Utført arbeid registreres fortsatt bare når du bekrefter det.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-400">{topFive.length} prioritert{topFive.length===1?'':'e'}</div>
        </div>
        <div className="space-y-3 mt-5">
          {topFive.map((item,index)=><div key={item.id} className={`rounded-2xl border p-4 ${priorityClass(item.priority)}`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
              <div className="flex gap-3 min-w-0">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/20 text-xs font-black">{index+1}</div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-widest">{item.priority}</span><span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[9px] text-slate-400">{item.source}</span></div>
                  <p className="text-sm font-black text-white mt-1">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
              {item.targetTab&&onNavigate&&<button onClick={()=>onNavigate(item.targetTab!)} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white hover:bg-black/30 whitespace-nowrap">{item.actionLabel||'Åpne'} →</button>}
            </div>
          </div>)}
          {!topFive.length&&<div className="rounded-2xl border border-green-500/15 bg-green-500/[0.04] p-4 text-sm text-green-100 flex items-center gap-3"><CheckCircle2 size={18}/><div><p className="font-bold">Ingen prioriterte handlinger akkurat nå</p><p className="text-xs text-slate-500 mt-1">Daily finner ingen forsinkede, pågående eller kritiske oppgaver i de tilgjengelige kildene.</p></div></div>}
        </div>
      </div>

      <div className={`glass rounded-[2rem] p-6 border ${advice.severity === 'critical' ? 'border-red-500/20 bg-red-500/5' : advice.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-green-500/20 bg-green-500/5'}`}>
        <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest mb-2">Dagens beslutning</p>
        {loadState === 'empty' ? (
          <>
            <p className="text-xl text-white font-bold">Ingen driftsdata registrert ennå</p>
            <p className="text-sm text-slate-400 mt-2">Registrer en sensor, manuell måling, vanningshendelse eller feltobservasjon. Dashboardet viser ikke demo-data.</p>
          </>
        ) : (
          <>
            <p className="text-xl text-white font-bold">{advice.title}</p>
            <p className="text-sm text-slate-400 mt-2">{advice.message}</p>
            {advice.reasons.length > 0 && <p className="text-xs text-slate-500 mt-3">Grunnlag: {advice.reasons.join(' ')}</p>}
          </>
        )}
      </div>

      {farmTruth && <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/[0.04]">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] font-black text-[#d9b657]">Daglig drift · gårdens fasit</p>
            <h3 className="text-xl font-black text-white mt-1">Hva har skjedd — og hva må følges opp?</h3>
            <p className="text-xs text-slate-500 mt-2">Bygger på verifiserte dokumenter, meldinger, feltobservasjoner, regnmålinger og registrert treantall.</p>
          </div>
          {onNavigate&&<button onClick={()=>onNavigate('farm_journal')} className="rounded-xl bg-[#d9b657] px-4 py-3 text-xs font-black text-black flex items-center gap-2"><ClipboardList size={15}/> Åpne Driftsjournal</button>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-5">
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Registrerte trær</p><p className="font-black text-white mt-1">{Number(farmTruth.treeCount||0).toLocaleString('no-NO')}</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Verifiserte hendelser</p><p className="font-black text-white mt-1">{farmTruth.events?.length||0}</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Må kontrolleres</p><p className={"font-black mt-1 "+(farmTruth.needsReview?"text-amber-300":"text-white")}>{farmTruth.needsReview||0}</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Regn 30 dager</p><p className="font-black text-blue-300 mt-1">{Number(farmTruth.rain30||0).toLocaleString('no-NO')} mm</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Årshjul nærmer seg</p><p className="font-black text-white mt-1">{farmTruth.upcoming?.length||0}</p></div>
          <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Olivia spør</p><p className={"font-black mt-1 "+(farmIntelligence?.openQuestionCount?"text-blue-300":"text-white")}>{farmIntelligence?.openQuestionCount||0}</p></div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-black">Siste dokumenterte arbeid / observasjon</p>
            {(farmTruth.events||[]).slice(0,4).map((event:any)=><div key={event.id} className="mt-3 border-l-2 border-green-500/30 pl-3"><p className="text-xs font-bold text-white">{event.title}</p><p className="text-[10px] text-slate-500 mt-1">{event.occurred_on||event.planned_for||event.period_label||'dato ikke dokumentert'} · {event.event_status}</p></div>)}
            {!farmTruth.events?.length&&<p className="text-xs text-slate-600 mt-3">Ingen verifiserte driftshendelser ennå.</p>}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[9px] uppercase tracking-widest text-slate-500 font-black">Neste fra årshjul</p>
            {(farmTruth.upcoming||[]).slice(0,4).map((item:any)=><div key={item.id} className="mt-3 border-l-2 border-[#d9b657]/40 pl-3"><p className="text-xs font-bold text-white">{item.title}</p><p className="text-[10px] text-slate-500 mt-1">{item.target_day?item.target_day+'. ':''}{new Date(item.target_year,item.target_month-1,1).toLocaleString('no-NO',{month:'long'})} · {yearWheelStatusLabel(item.status)}</p></div>)}
            {!farmTruth.upcoming?.length&&<p className="text-xs text-slate-600 mt-3">Ingen årshjulspunkter nærmer seg akkurat nå.</p>}
          </div>
        </div>
        {farmQuestions.length>0&&<div className="mt-4"><FarmQuestionsPanel compact title="Svar Olivia direkte her" onAnswered={loadDashboard}/></div>}
      </div>}

      <SeasonReadinessPanel data={seasonReadiness} onNavigate={onNavigate} />

      <SeasonExecutionPanel data={seasonExecution} onNavigate={onNavigate} onAction={onSeasonAction} />

      <div className="glass rounded-[2rem] p-6 border border-amber-300/20 bg-amber-300/[0.04]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-amber-300 font-bold uppercase tracking-widest">Salg og betaling</p>
            <h3 className="text-xl font-bold text-white mt-1">Dette må følges opp</h3>
            <p className="text-xs text-slate-500 mt-1">Automatisk fra reelle commerce-ordre og fakturaer. Testordre er ikke med.</p>
          </div>
          <ReceiptText className="text-amber-300" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            ['Ordre å behandle', orderAttention.length, <ShoppingCart size={17} />, 'text-yellow-300'],
            ['Klar til sending', readyToShip.length, <Truck size={17} />, 'text-blue-300'],
            ['Forfalte fakturaer', overdueInvoices.length, <AlertTriangle size={17} />, 'text-red-300'],
            ['Forfaller snart', dueSoonInvoices.length, <ReceiptText size={17} />, 'text-amber-300'],
          ].map(([label,value,icon,tone]) => (
            <div key={String(label)} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className={String(tone)}>{icon}</div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500 mt-2">{label}</p>
              <p className="text-2xl font-black text-white mt-1">{value}</p>
            </div>
          ))}
        </div>
        {commercialReadiness && commercialReadiness.issues.length > 0 && (
          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-black/20 p-4">
            <p className="text-xs font-black text-amber-300">Kommersielt oppsett</p>
            <p className="text-sm text-white mt-1">{commercialReadiness.issues.filter(issue=>issue.severity==='critical').length} kritiske felt · {commercialReadiness.productsReady}/{commercialReadiness.productCount} produkter klare</p>
            <p className="text-xs text-slate-500 mt-1">{commercialReadiness.issues[0]?.title}</p>
          </div>
        )}
        {commerceAttention.length > 0 ? (
          <div className="mt-5 space-y-2">
            {commerceAttention.slice(0,6).map(item => (
              <div key={item.id} className={`rounded-xl border p-3 ${item.severity === 'critical' ? 'border-red-500/20 bg-red-500/10' : item.severity === 'warning' ? 'border-yellow-500/20 bg-yellow-500/10' : 'border-blue-500/20 bg-blue-500/10'}`}>
                <p className="text-sm font-bold text-white">{item.title}</p>
                <p className="text-xs text-slate-400 mt-1">{item.body}</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500 mt-5">Ingen ordre- eller fakturaoppfølging krever handling akkurat nå.</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <Mountain className="text-green-400 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Biar sesongstatus</p>
          <p className="text-white font-bold mt-2">{monthName(currentMonth)}</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">{getBiarSeasonText()}</p>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <CalendarDays className="text-yellow-400 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Senere høsteprofil</p>
          <p className="text-white font-bold mt-2">Bordoliven: {monthName(tableWindow.start_month)}–{monthName(tableWindow.end_month)}</p>
          <p className="text-white font-bold mt-1">Olje: {monthName(oilWindow.start_month)}–{monthName(oilWindow.end_month)}</p>
          <p className="text-xs text-slate-500 mt-2">Faktisk høsting må styres av modenhet, sort, kvalitet og vær.</p>
        </div>
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <ShieldCheck className="text-blue-400 mb-3" />
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Datagrunnlag</p>
          <p className="text-white font-bold mt-2">{readings.length} målinger</p>
          <p className="text-xs text-slate-500 mt-2">{alerts.length} åpne varsler · {irrigationEvents.length} vanningshendelser · {observations.length} observasjoner</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><ListChecks size={14} /> Prioriterte handlinger</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions.map(action => (
              <div key={action.title} className={`glass rounded-[2rem] p-5 border ${priorityClass(action.priority)}`}>
                <div className="flex items-center gap-3 mb-3">
                  {action.icon}
                  <p className="text-[10px] font-bold uppercase tracking-widest">{action.priority}</p>
                </div>
                <p className="text-white font-bold">{action.title}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{action.description}</p>
                {action.targetTab&&onNavigate&&<button onClick={()=>onNavigate(action.targetTab!)} className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-white hover:bg-black/30">{action.actionLabel||'Åpne arbeidsflate'} →</button>}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14} /> Åpne varsler</h3>
          <div className="glass rounded-[2rem] p-5 border border-white/10 space-y-3">
            {alerts.length > 0 ? alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-xs font-bold text-white">{alert.title}</p>
                <p className="text-[10px] text-yellow-400 mt-1">{alert.message}</p>
              </div>
            )) : (
              <p className="text-sm text-slate-500">Ingen åpne varsler fra Supabase akkurat nå.</p>
            )}
          </div>

          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Droplets size={14} /> Siste vanning</h3>
          <div className="glass rounded-[2rem] p-5 border border-white/10 space-y-3">
            {irrigationEvents.length > 0 ? irrigationEvents.slice(0, 3).map(event => (
              <div key={event.id} className="p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs font-bold text-white">{event.irrigation_sector_id || event.zone_id || event.parcel_id}</p>
                <p className="text-[10px] text-slate-500 mt-1">{new Date(event.started_at).toLocaleString('no-NO')} · {event.duration_minutes || '—'} min</p>
              </div>
            )) : (
              <p className="text-sm text-slate-500">Ingen registrerte vanningshendelser ennå.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonaAnnaDailyDashboard;
