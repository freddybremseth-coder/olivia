import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, Clock3, Sprout } from 'lucide-react';
import type { SeasonReadiness, SeasonReadinessStatus } from '../services/seasonReadiness';

function statusStyle(status:SeasonReadinessStatus){
  if(status==='ready')return'border-green-500/20 bg-green-500/10 text-green-300';
  if(status==='action')return'border-red-500/20 bg-red-500/10 text-red-300';
  if(status==='attention')return'border-amber-300/20 bg-amber-300/10 text-amber-200';
  return'border-white/10 bg-white/[0.03] text-slate-400';
}

function statusIcon(status:SeasonReadinessStatus){
  if(status==='ready')return <CheckCircle2 size={16}/>;
  if(status==='action')return <AlertTriangle size={16}/>;
  if(status==='attention')return <Clock3 size={16}/>;
  return <CircleDashed size={16}/>;
}

const tabForStep:Record<SeasonReadiness['nextStepId'],string>={
  plan:'harvest_planner',
  intake:'production',
  production:'production',
  packing:'traceability_batches',
  cost:'economy',
  organic:'organic_certification',
};

const SeasonReadinessPanel:React.FC<{data:SeasonReadiness|null;onNavigate?:(tab:string)=>void}>=({data,onNavigate})=>{
  if(!data)return null;
  return <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/[0.04]">
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] font-black text-green-400">Sesong {data.season}</p>
        <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2"><Sprout size={20} className="text-green-400"/> Fra høsteplan til ferdig vare</h3>
        <p className="text-xs text-slate-500 mt-2">Status bygger bare på registrerte planer, mottak, batcher, pakkelot, kostnader og CAECV-saker.</p>
      </div>
      <div className="rounded-2xl border border-green-500/20 bg-black/20 px-4 py-3 lg:max-w-md">
        <p className="text-[9px] uppercase tracking-widest text-green-400 font-black">Neste naturlige handling</p>
        <p className="text-sm text-white mt-1">{data.nextAction}</p>
        {onNavigate&&<button onClick={()=>onNavigate(tabForStep[data.nextStepId])} className="mt-3 rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black flex items-center gap-1">Åpne neste steg <ArrowRight size={14}/></button>}
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-5">
      {data.steps.map(step=>{const Card=onNavigate?'button':'div';return <Card key={step.id} onClick={onNavigate?()=>onNavigate(tabForStep[step.id]):undefined} className={'rounded-2xl border p-4 text-left '+statusStyle(step.status)+(onNavigate?' hover:border-green-400/40 transition-colors':'')}>
        <div className="flex items-center gap-2">{statusIcon(step.status)}<p className="text-[9px] uppercase tracking-widest font-black">{step.label}</p></div>
        <p className="text-2xl font-black text-white mt-2">{step.value}</p>
        <p className="text-[10px] leading-4 text-slate-500 mt-1">{step.detail}</p>
      </Card>})}
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
      <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Planlagt høst</p><p className="font-black text-white mt-1">{Math.round(data.plannedKg).toLocaleString('no-NO')} kg</p></div>
      <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Mottatt råvare</p><p className="font-black text-white mt-1">{Math.round(data.receivedKg).toLocaleString('no-NO')} kg</p></div>
      <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Aktive batcher</p><p className="font-black text-white mt-1">{data.activeBatchCount}</p></div>
      <div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">Pakket</p><p className="font-black text-white mt-1">{data.packedUnits.toLocaleString('no-NO')} enheter</p></div>
    </div>
  </div>;
};

export default SeasonReadinessPanel;
