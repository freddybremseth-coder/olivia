import React,{useState} from 'react';
import { CheckCircle2, Loader2, MessageSquareText, ThumbsDown, ThumbsUp } from 'lucide-react';
import { recordAgentFeedback, type FarmAgentType } from '../services/farmIntelligence';

const AgentFeedbackPanel:React.FC<{
  assessmentId?:string|null;
  agentType:Exclude<FarmAgentType,'source_scanner'>;
  parcelId?:string;
}>=({assessmentId,agentType,parcelId})=>{
  const[text,setText]=useState('');
  const[saving,setSaving]=useState(false);
  const[saved,setSaved]=useState('');
  const[error,setError]=useState('');

  if(!assessmentId)return null;

  const submit=async(status:'confirmed'|'corrected'|'partly_correct'|'rejected')=>{
    setSaving(true);setError('');
    try{
      await recordAgentFeedback({assessmentId,status,feedback:text||undefined,parcelId,agentType});
      setSaved(status);
      setText('');
    }catch(e:any){setError(e?.message||'Kunne ikke lagre tilbakemeldingen.');}
    finally{setSaving(false);}
  };

  return <div className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-4">
    <p className="text-[10px] uppercase tracking-widest font-black text-purple-300">Lær av vurderingen</p>
    <p className="text-xs text-slate-500 mt-1">Fortell Olivia om analysen stemmer. Korrigeringer blir lagret som bekreftet læring for senere analyser.</p>
    {saved&&<div className="mt-3 rounded-xl border border-green-500/20 bg-green-500/10 p-2 text-xs text-green-300 flex items-center gap-2"><CheckCircle2 size={14}/>Tilbakemelding lagret.</div>}
    {error&&<div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-200">{error}</div>}
    <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Korriger eller legg til noe Olivia bør lære (valgfritt ved «Stemmer»)" className="mt-3 w-full min-h-[76px] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none focus:border-purple-500/40"/>
    <div className="flex flex-wrap gap-2 mt-2">
      <button onClick={()=>submit('confirmed')} disabled={saving} className="rounded-xl bg-green-500 px-3 py-2 text-xs font-black text-black disabled:opacity-40 flex items-center gap-1">{saving?<Loader2 size={13} className="animate-spin"/>:<ThumbsUp size={13}/>}Stemmer</button>
      <button onClick={()=>submit('partly_correct')} disabled={saving} className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold text-amber-200 disabled:opacity-40 flex items-center gap-1"><MessageSquareText size={13}/>Delvis</button>
      <button onClick={()=>submit('corrected')} disabled={saving||!text.trim()} className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-200 disabled:opacity-40">Lagre korrigering</button>
      <button onClick={()=>submit('rejected')} disabled={saving} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 disabled:opacity-40 flex items-center gap-1"><ThumbsDown size={13}/>Feil</button>
    </div>
  </div>;
};

export default AgentFeedbackPanel;
