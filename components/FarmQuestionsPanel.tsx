import React,{useEffect,useState} from 'react';
import { CheckCircle2, HelpCircle, Loader2, MessageSquareText, RefreshCcw, X } from 'lucide-react';
import {
  answerFarmQuestion,
  dismissFarmQuestion,
  fetchOpenFarmQuestions,
  type FarmAgentType,
  type FarmQuestion,
} from '../services/farmIntelligence';

function priorityClass(priority:string){
  if(priority==='critical')return'border-red-500/30 bg-red-500/10 text-red-300';
  if(priority==='high')return'border-amber-400/30 bg-amber-400/10 text-amber-200';
  if(priority==='medium')return'border-blue-500/25 bg-blue-500/10 text-blue-200';
  return'border-white/10 bg-white/5 text-slate-300';
}

const FarmQuestionsPanel:React.FC<{
  parcelId?:string;
  agentType?:FarmAgentType;
  title?:string;
  compact?:boolean;
  onAnswered?:()=>void;
}>=({parcelId,agentType,title='Olivia trenger svar',compact=false,onAnswered})=>{
  const[rows,setRows]=useState<FarmQuestion[]>([]);
  const[answers,setAnswers]=useState<Record<string,string>>({});
  const[loading,setLoading]=useState(false);
  const[saving,setSaving]=useState('');
  const[error,setError]=useState('');

  const load=async()=>{
    setLoading(true);setError('');
    try{setRows(await fetchOpenFarmQuestions({parcelId,agentType,limit:compact?5:25}));}
    catch(e:any){setError(e?.message||'Kunne ikke hente spørsmål.');}
    finally{setLoading(false);}
  };

  useEffect(()=>{load();},[parcelId,agentType]);

  const answer=async(row:FarmQuestion,value?:string)=>{
    const text=(value??answers[row.id]??'').trim();
    if(!text)return;
    setSaving(row.id);setError('');
    try{
      await answerFarmQuestion(row.id,text);
      setAnswers(prev=>({...prev,[row.id]:''}));
      await load();
      onAnswered?.();
    }catch(e:any){setError(e?.message||'Kunne ikke lagre svaret.');}
    finally{setSaving('');}
  };

  const dismiss=async(id:string)=>{
    setSaving(id);setError('');
    try{await dismissFarmQuestion(id);await load();onAnswered?.();}
    catch(e:any){setError(e?.message||'Kunne ikke lukke spørsmålet.');}
    finally{setSaving('');}
  };

  if(!loading&&!rows.length&&!error){
    return <div className="rounded-2xl border border-green-500/15 bg-green-500/[0.04] p-4 flex items-center gap-3"><CheckCircle2 size={18} className="text-green-400"/><div><p className="text-sm font-bold text-white">Ingen åpne spørsmål</p><p className="text-xs text-slate-500 mt-1">Olivia har ikke registrert noe den trenger avklaring på i denne konteksten.</p></div></div>;
  }

  return <div className="glass rounded-[2rem] border border-blue-500/20 bg-blue-500/[0.04] p-5">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-[10px] uppercase tracking-widest font-black text-blue-300">Læringssløyfe</p><h3 className="text-lg font-black text-white mt-1 flex items-center gap-2"><HelpCircle size={18}/>{title}</h3><p className="text-xs text-slate-500 mt-1">Når Olivia er usikker, spør den i stedet for å gjette. Svaret lagres som bekreftet kunnskap og brukes senere.</p></div>
      <button onClick={load} disabled={loading} className="p-2 rounded-xl border border-white/10 bg-white/5 text-blue-300 disabled:opacity-40">{loading?<Loader2 size={15} className="animate-spin"/>:<RefreshCcw size={15}/>}</button>
    </div>
    {error&&<div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}
    <div className="space-y-3 mt-4">
      {rows.map(row=><div key={row.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="flex flex-wrap gap-2 items-center"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+priorityClass(row.priority)}>{row.priority==='critical'?'Kritisk':row.priority==='high'?'Høy':row.priority==='medium'?'Middels':'Lav'}</span>{row.agent_type&&<span className="text-[9px] uppercase tracking-widest text-slate-600">{row.agent_type.replaceAll('_',' ')}</span>}</div>
        <p className="text-sm font-bold text-white mt-2">{row.question}</p>
        {row.reason&&<p className="text-xs text-slate-500 mt-2">{row.reason}</p>}
        {Array.isArray(row.suggested_choices)&&row.suggested_choices.length>0&&<div className="flex flex-wrap gap-2 mt-3">{row.suggested_choices.map((choice:any)=><button key={String(choice)} disabled={saving===row.id} onClick={()=>answer(row,String(choice))} className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/20">{String(choice)}</button>)}</div>}
        <div className="flex flex-col md:flex-row gap-2 mt-3">
          <input value={answers[row.id]||''} onChange={e=>setAnswers(prev=>({...prev,[row.id]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter')answer(row);}} placeholder="Skriv svaret..." className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500/40"/>
          <button onClick={()=>answer(row)} disabled={saving===row.id||!(answers[row.id]||'').trim()} className="rounded-xl bg-blue-400 px-4 py-2.5 text-xs font-black text-black disabled:opacity-40 flex items-center justify-center gap-2">{saving===row.id?<Loader2 size={14} className="animate-spin"/>:<MessageSquareText size={14}/>}Svar</button>
          <button onClick={()=>dismiss(row.id)} disabled={saving===row.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-slate-400 flex items-center justify-center gap-1"><X size={13}/>Ikke relevant</button>
        </div>
      </div>)}
    </div>
  </div>;
};

export default FarmQuestionsPanel;
