import React from 'react';
import { ArrowRight, CheckCircle2, CircleDashed, Factory, PackageCheck, Sprout, Truck } from 'lucide-react';
import type { ParcelExecutionRow, ParcelExecutionStage, SeasonExecution } from '../services/seasonExecution';

function stageTone(stage:ParcelExecutionStage){
  if(stage==='packed')return'border-green-500/30 bg-green-500/10 text-green-300';
  if(stage==='ready_to_pack')return'border-blue-500/30 bg-blue-500/10 text-blue-300';
  if(stage==='production')return'border-purple-500/30 bg-purple-500/10 text-purple-300';
  if(stage==='received'||stage==='harvested')return'border-amber-300/30 bg-amber-300/10 text-amber-200';
  if(stage==='approved_waiting_harvest')return'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  if(stage==='plan_pending')return'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
  if(stage==='cooperative_received')return'border-teal-500/30 bg-teal-500/10 text-teal-300';
  return'border-white/10 bg-white/[0.03] text-slate-400';
}

function stageIcon(stage:ParcelExecutionStage){
  if(stage==='packed')return <PackageCheck size={15}/>;
  if(stage==='ready_to_pack'||stage==='production')return <Factory size={15}/>;
  if(stage==='received'||stage==='harvested'||stage==='cooperative_received')return <Truck size={15}/>;
  if(stage==='approved_waiting_harvest'||stage==='plan_pending')return <Sprout size={15}/>;
  return <CircleDashed size={15}/>;
}

function progressPercent(row:ParcelExecutionRow){
  const order:ParcelExecutionStage[]=[
    'no_plan','plan_pending','approved_waiting_harvest','harvested','received','production','ready_to_pack','packed'
  ];
  if(row.stage==='cooperative_received')return 100;
  const index=order.indexOf(row.stage);
  return index<0?0:Math.round((index/(order.length-1))*100);
}

const SeasonExecutionPanel:React.FC<{
  data:SeasonExecution|null;
  onNavigate?:(tab:string)=>void;
}>=({data,onNavigate})=>{
  if(!data)return null;

  return <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.24em] font-black text-[#d9b657]">Sesonggjennomføring · {data.season}</p>
        <h3 className="text-xl font-black text-white mt-1">Parsell for parsell</h3>
        <p className="text-xs text-slate-500 mt-2">Hver status er avledet fra registrerte planer, høstemottak, produksjonsbatcher og pakkelot. Ingen fremdrift antas.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-full lg:min-w-0">
        <Mini label="Planlagt" value={data.plannedParcelCount+'/'+data.productiveParcelCount}/>
        <Mini label="Godkjent" value={data.approvedParcelCount}/>
        <Mini label="Startet" value={data.startedParcelCount}/>
        <Mini label="Pakket" value={data.packedParcelCount}/>
      </div>
    </div>

    <div className="space-y-3 mt-5">
      {data.parcels.map(row=>{
        const pct=progressPercent(row);
        return <div key={row.parcelId} className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={'rounded-full border px-2.5 py-1 text-[10px] font-black '+stageTone(row.stage)}>
                  <span className="inline-flex items-center gap-1">{stageIcon(row.stage)}{row.stageLabel}</span>
                </span>
                <span className="text-[10px] text-slate-600">{pct}% i registrert kjede</span>
              </div>
              <div className="mt-2 flex flex-col md:flex-row md:items-baseline gap-1 md:gap-3">
                <h4 className="text-lg font-black text-white">{row.parcelName}</h4>
                <p className="text-xs text-slate-500">{row.variety||'Sort ikke registrert'} · {row.treeCount.toLocaleString('no-NO')} trær</p>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full bg-green-500 transition-all" style={{width:pct+'%'}} />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {row.details.length
                  ? row.details.map(detail=><span key={detail} className="text-[11px] text-slate-500">{detail}</span>)
                  : <span className="text-[11px] text-slate-600">Ingen sesonghendelser registrert.</span>}
              </div>
            </div>

            <div className="xl:w-[330px] rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[9px] uppercase tracking-widest font-black text-slate-500">Neste handling</p>
              <p className="text-xs text-white mt-1 leading-5">{row.nextAction}</p>
              {onNavigate&&<button onClick={()=>onNavigate(row.targetTab)} className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15 flex items-center gap-1">Åpne arbeidsflate <ArrowRight size={14}/></button>}
            </div>
          </div>
        </div>;
      })}
    </div>

    {!data.parcels.length&&<div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-slate-500">Ingen produktive parceller med registrert treantall.</div>}
  </div>;
};

const Mini:React.FC<{label:string;value:React.ReactNode}>=({label,value})=><div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2"><p className="text-[9px] uppercase tracking-widest text-slate-500">{label}</p><p className="font-black text-white mt-1">{value}</p></div>;

export default SeasonExecutionPanel;
