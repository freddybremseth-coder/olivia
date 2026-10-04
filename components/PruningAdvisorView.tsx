import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  History,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  Scissors,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { geminiService, PruningPlan, PruningStep } from '../services/geminiService';
import {
  Parcel,
  PruningExecutionStatus,
  PruningHistoryItem,
  PruningOutcomeRating,
  PruningStepFeedback,
  PruningStepFeedbackStatus,
  Task,
} from '../types';
import { Language } from '../services/i18nService';
import { filesToResizedDataUrls } from '../lib/imageUpload';
import { deletePruningItem, fetchParcels, fetchPruningHistory, fetchSettings, upsertPruningItem, upsertTask } from '../services/db';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import { buildFarmContext, fetchFarmContextImages } from '../services/farmJournal';
import { buildLearningContext, recordAgentAssessment } from '../services/farmIntelligence';
import FarmQuestionsPanel from './FarmQuestionsPanel';
import AgentFeedbackPanel from './AgentFeedbackPanel';
import OlivePhotoProtocol from './OlivePhotoProtocol';
import { removePruningOutcomeTruth, savePruningOutcome } from '../services/pruningOutcome';

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}`;
}

const MAX_ANALYSIS_IMAGES = 5;

function normalizePriority(priority: any): 'HØY' | 'MIDDELS' | 'LAV' {
  const value = String(priority || '').toUpperCase();
  if (value.includes('H')) return 'HØY';
  if (value.includes('M')) return 'MIDDELS';
  return 'LAV';
}

function confidencePercent(value: unknown): number {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  const normalized = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function qualityLabel(value: unknown): string {
  const raw = String(value || '').toUpperCase();
  if (raw === 'GOOD') return 'Godt';
  if (raw === 'INSUFFICIENT') return 'Svakt';
  return 'Begrenset';
}

function normalizeStep(step: Partial<PruningStep>, index: number): PruningStep {
  return {
    area: step.area || `Område ${index + 1}`,
    action: step.action || 'Vurder forsiktig tynning etter visuell kontroll. Ikke utfør hard beskjæring uten bedre bildegrunnlag.',
    priority: normalizePriority(step.priority),
    x: Math.max(5, Math.min(95, Number(step.x || 50))),
    y: Math.max(5, Math.min(95, Number(step.y || 50))),
    confidence: confidencePercent(step.confidence || 50),
    evidence: step.evidence,
    riskLevel: step.riskLevel,
    actionType: step.actionType,
    whyNow: step.whyNow,
    consequenceIfSkipped: step.consequenceIfSkipped,
  };
}

function normalizePlan(raw: PruningPlan | null | undefined): PruningPlan {
  const steps = Array.isArray(raw?.pruningSteps) ? raw!.pruningSteps : [];
  return {
    treeType: raw?.treeType || 'Oliven · sort usikker',
    ageEstimate: raw?.ageEstimate || 'Ukjent alder',
    pruningSteps: steps.filter(step => step && step.action).slice(0, 8).map(normalizeStep),
    recommendedDate: raw?.recommendedDate || new Date().toISOString().slice(0, 10),
    timingAdvice: raw?.timingAdvice || 'AI kunne ikke fastslå optimal timing med høy sikkerhet. Bruk lokal sesong, vær og treets vitalitet før tiltak.',
    toolsNeeded: Array.isArray(raw?.toolsNeeded) && raw!.toolsNeeded.length ? raw!.toolsNeeded : ['Beskjæringssaks', 'Sag', 'Desinfeksjon av verktøy'],
    confidence: confidencePercent(raw?.confidence),
    ageConfidence: confidencePercent(raw?.ageConfidence),
    observationQuality: raw?.observationQuality || (confidencePercent(raw?.confidence) >= 70 ? 'GOOD' : confidencePercent(raw?.confidence) >= 40 ? 'LIMITED' : 'INSUFFICIENT'),
    limitations: Array.isArray(raw?.limitations) ? raw!.limitations : [],
    missingDetails: Array.isArray(raw?.missingDetails) ? raw!.missingDetails : [],
    safetyNotes: Array.isArray(raw?.safetyNotes) ? raw!.safetyNotes : [],
    treeStage: raw?.treeStage,
    trainingSystem: raw?.trainingSystem,
    pruningGoal: raw?.pruningGoal,
    decisionSummary: raw?.decisionSummary,
    expertReview: raw?.expertReview,
  };
}

const PruningAdvisorView: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [plan, setPlan] = useState<PruningPlan | null>(null);
  const [history, setHistory] = useState<PruningHistoryItem[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [activeMarker, setActiveMarker] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>('no');
  const [showCamera, setShowCamera] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const [taskSaved, setTaskSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmContext, setFarmContext] = useState('');
  const [contextLoading, setContextLoading] = useState(false);
  const [historicalImages, setHistoricalImages] = useState<Array<{url:string;title:string;observedAt:string}>>([]);
  const [lastAssessmentId,setLastAssessmentId]=useState<string|null>(null);
  const [outcomeItem,setOutcomeItem]=useState<PruningHistoryItem|null>(null);
  const [outcomeStatus,setOutcomeStatus]=useState<Exclude<PruningExecutionStatus,'planned'>>('completed');
  const [outcomeDate,setOutcomeDate]=useState(new Date().toISOString().slice(0,10));
  const [outcomeRating,setOutcomeRating]=useState<PruningOutcomeRating|''>('');
  const [outcomeNotes,setOutcomeNotes]=useState('');
  const [outcomeAfterImages,setOutcomeAfterImages]=useState<string[]>([]);
  const [outcomeStepFeedback,setOutcomeStepFeedback]=useState<Record<number,{status?:PruningStepFeedbackStatus;note?:string}>>({});
  const [isSavingOutcome,setIsSavingOutcome]=useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const outcomeFileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectedParcel = parcels.find(parcel => parcel.id === selectedParcelId);

  const startCamera = async () => {
    try {
      stopCamera();
      setShowCamera(true);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Kamera er ikke tilgjengelig i denne nettleseren. Du kan fortsatt laste opp bilder.');
        return;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = mediaStream;
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setError(null);
    } catch {
      setError('Kunne ikke få tilgang til kamera. Du kan fortsatt laste opp bilder.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const loadData = async () => {
    try {
      const [settings, parcelRows, historyRows] = await Promise.all([
        fetchSettings(),
        fetchParcels(),
        fetchPruningHistory(),
      ]);
      if (settings?.language) setLanguage(settings.language as Language);
      setParcels(parcelRows);
      setSelectedParcelId(prev => prev || parcelRows[0]?.id || '');
      setHistory(historyRows);
    } catch (err) {
      console.error('[PruningAdvisorView] loadData', err);
      setError('Kunne ikke hente parseller/historikk fra Supabase.');
    }
  };

  useEffect(() => {
    loadData();
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedParcelId) { setFarmContext(''); return; }
    setContextLoading(true);
    Promise.all([buildFarmContext(selectedParcelId), buildLearningContext(selectedParcelId), fetchFarmContextImages(selectedParcelId, 6)])
      .then(([context, learningContext, images]) => { if (!cancelled) { setFarmContext([context,learningContext].filter(Boolean).join('\n\n')); setHistoricalImages(images); } })
      .catch(() => { if (!cancelled) { setFarmContext(''); setHistoricalImages([]); } })
      .finally(() => { if (!cancelled) setContextLoading(false); });
    return () => { cancelled = true; };
  }, [selectedParcelId]);

  const capturePhoto = () => {
    if (images.length >= MAX_ANALYSIS_IMAGES) {
      setError(`Maks ${MAX_ANALYSIS_IMAGES} bilder per analyse. Fjern et bilde før du legger til flere.`);
      return;
    }
    if (!videoRef.current || !canvasRef.current) return;
    if (!videoRef.current.videoWidth || !videoRef.current.videoHeight) {
      setError('Kameraet er ikke klart ennå. Vent et øyeblikk eller last opp bilder.');
      return;
    }
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    const maxDim=1280;
    const sourceW=videoRef.current.videoWidth;
    const sourceH=videoRef.current.videoHeight;
    const scale=Math.min(1,maxDim/Math.max(sourceW,sourceH));
    canvasRef.current.width=Math.max(1,Math.round(sourceW*scale));
    canvasRef.current.height=Math.max(1,Math.round(sourceH*scale));
    context.drawImage(videoRef.current,0,0,canvasRef.current.width,canvasRef.current.height);
    setImages(prev => [...prev, canvasRef.current!.toDataURL('image/jpeg', 0.74)]);
    setError(null);
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setIsUploading(true);
    setError(null);
    try {
      const remainingSlots = MAX_ANALYSIS_IMAGES - images.length;
      if (remainingSlots <= 0) {
        setError(`Maks ${MAX_ANALYSIS_IMAGES} bilder per analyse. Fjern et bilde før du legger til flere.`);
        return;
      }
      const selectedFiles = Array.from(files).slice(0, remainingSlots);
      const dataUrls = await filesToResizedDataUrls(selectedFiles,{maxDim:1280,quality:0.74});
      if (!dataUrls.length) {
        setError('Ingen av bildene kunne leses.');
        return;
      }
      setImages(prev => [...prev, ...dataUrls]);
      if (files.length > remainingSlots) {
        setError(`Tok med de første ${remainingSlots} bildene. Maks er ${MAX_ANALYSIS_IMAGES} per analyse.`);
      }
    } catch (err: any) {
      setError(`Kunne ikke lese bilder: ${err?.message || String(err)}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const analyze = async () => {
    if (!images.length) return;
    const base64List = images.map(img => img.split(',')[1]).filter(Boolean);
    const approxPayloadMb=base64List.reduce((sum,item)=>sum+item.length,0)*0.75/1024/1024;
    if(approxPayloadMb>3.8){
      setError('Bildene er fortsatt for store for sikker analyse. Fjern ett bilde eller last dem opp på nytt; Olivia komprimerer nye bilder automatisk.');
      return;
    }
    if (!base64List.length) {
      setError('Bildene kunne ikke klargjøres for analyse. Prøv å laste dem opp på nytt.');
      return;
    }
    setIsAnalyzing(true);
    setPlan(null);
    setError(null);
    setHistorySaved(false);
    setTaskSaved(false);
    try {
      const raw = await geminiService.analyzePruning(base64List, language, farmContext, selectedParcelId||undefined);
      const normalized = normalizePlan(raw);
      setPlan(normalized);
      const uncertainties=Array.from(new Set([
        ...(normalized.missingDetails||[]),
        ...(normalized.limitations||[]).filter(item=>/mangler|ukjent|kan ikke|ikke synlig|krever/i.test(item)),
      ])).slice(0,8);
      const learning=await recordAgentAssessment({
        agentType:'pruning_assistant',
        parcelId:selectedParcelId||undefined,
        result:normalized,
        contextSnapshot:farmContext,
        confidence:Math.max(0,Math.min(1,Number(normalized.confidence||0)/100)),
        uncertainties,
        sourceRef:'Beskjæringsassistent '+new Date().toISOString(),
      }).catch(err=>{console.warn('[PruningAdvisorView] learning loop',err);return null;});
      setLastAssessmentId(learning?.assessmentId||null);
      setScheduledDate(normalized.recommendedDate);
      setShowCamera(false);
      stopCamera();
    } catch (err: any) {
      setError(`Analyse feilet: ${err?.message || String(err)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToHistory = async (): Promise<PruningHistoryItem | null> => {
    if (!plan || !images.length) return null;
    setIsSavingHistory(true);
    setError(null);
    try {
      const item: PruningHistoryItem = {
        id: makeId('prune'),
        date: new Date().toISOString(),
        images,
        treeType: plan.treeType,
        ageEstimate: plan.ageEstimate,
        plan,
        parcelId: selectedParcelId || undefined,
        scheduledTime: scheduledDate || plan.recommendedDate,
      };
      await upsertPruningItem(item);
      setHistory(prev => [item, ...prev]);
      setHistorySaved(true);
      setTimeout(() => setHistorySaved(false), 3000);
      return item;
    } catch (err: any) {
      setError(`Kunne ikke lagre historikk i Supabase: ${err?.message || String(err)}`);
      return null;
    } finally {
      setIsSavingHistory(false);
    }
  };

  const addTask = async () => {
    if (!plan) return;
    setIsSavingTask(true);
    setError(null);
    try {
      await saveToHistory();
      const task: Task = {
        id: makeId('task'),
        title: `Beskjæring: ${plan.treeType}`,
        priority: plan.pruningSteps.some(step => step.priority === 'HØY') ? 'Høy' : 'Middels',
        category: 'Vedlikehold',
        user: 'Olivia AI',
        status: 'TODO',
        dueDate: scheduledDate || plan.recommendedDate,
        parcelId: selectedParcelId || undefined,
      };
      await upsertTask(task);
      setTaskSaved(true);
      setTimeout(() => setTaskSaved(false), 3000);
    } catch (err: any) {
      setError(`Kunne ikke lage oppgave i Supabase: ${err?.message || String(err)}`);
    } finally {
      setIsSavingTask(false);
    }
  };

  const openOutcome=(item:PruningHistoryItem)=>{
    setOutcomeItem(item);
    const existing=item.executionStatus;
    setOutcomeStatus(existing==='partly_completed'||existing==='cancelled'||existing==='completed'?existing:'completed');
    setOutcomeDate(String(item.completedAt||new Date().toISOString()).slice(0,10));
    setOutcomeRating(item.outcomeRating||'');
    setOutcomeNotes(item.outcomeNotes||'');
    setOutcomeAfterImages([]);
    const mapped:Record<number,{status?:PruningStepFeedbackStatus;note?:string}>={};
    (item.stepFeedback||[]).forEach(entry=>{mapped[entry.index]={status:entry.status,note:entry.note};});
    setOutcomeStepFeedback(mapped);
    setError(null);
  };

  const handleOutcomeImageUpload=async(event:React.ChangeEvent<HTMLInputElement>)=>{
    const files=event.target.files;
    if(!files?.length)return;
    try{
      const remaining=3-outcomeAfterImages.length;
      if(remaining<=0){setError('Maks 3 etterbilder per fasit.');return;}
      const dataUrls=await filesToResizedDataUrls(Array.from(files).slice(0,remaining),{maxDim:1280,quality:0.74});
      setOutcomeAfterImages(current=>[...current,...dataUrls].slice(0,3));
    }catch(err:any){
      setError('Kunne ikke lese etterbilder: '+(err?.message||String(err)));
    }finally{
      if(outcomeFileInputRef.current)outcomeFileInputRef.current.value='';
    }
  };

  const saveOutcome=async()=>{
    if(!outcomeItem)return;
    const stepFeedback:PruningStepFeedback[]=(outcomeItem.plan?.pruningSteps||[]).flatMap((step,index)=>{
      const entry=outcomeStepFeedback[index];
      if(!entry?.status)return[];
      return[{
        index,
        area:step.area||('Område '+(index+1)),
        status:entry.status,
        note:entry.note?.trim()||undefined,
      }];
    });
    if(outcomeStatus==='partly_completed'&&!outcomeNotes.trim()&&!stepFeedback.length){
      setError('Beskriv hva som faktisk ble gjort når jobben registreres som delvis utført.');
      return;
    }
    setIsSavingOutcome(true);setError(null);
    try{
      const updated=await savePruningOutcome(outcomeItem,{
        executionStatus:outcomeStatus,
        outcomeDate,
        outcomeRating:outcomeRating||undefined,
        outcomeNotes,
        stepFeedback,
        afterImageDataUrls:outcomeAfterImages,
      });
      setHistory(current=>current.map(item=>item.id===updated.id?updated:item));
      setOutcomeItem(null);
      setOutcomeAfterImages([]);
      window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
    }catch(err:any){
      setError('Kunne ikke lagre beskjæringsfasit: '+(err?.message||String(err)));
    }finally{
      setIsSavingOutcome(false);
    }
  };

  const deleteHistory = async (id: string) => {
    try {
      await removePruningOutcomeTruth(id);
      await deletePruningItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
      window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
    } catch (err: any) {
      setError(`Kunne ikke slette historikk: ${err?.message || String(err)}`);
    }
  };

  const reset = () => {
    setImages([]);
    setPlan(null);
    setLastAssessmentId(null);
    setError(null);
    setActiveMarker(null);
    setScheduledDate('');
    setHistorySaved(false);
    setTaskSaved(false);
    setShowCamera(true);
    startCamera();
  };

  const renderMarkers = () => {
    if (!plan?.pruningSteps?.length) return null;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {plan.pruningSteps.map((step, i) => {
          const color = step.riskLevel === 'RED' ? '#ef4444' : step.riskLevel === 'YELLOW' ? '#f59e0b' : '#22c55e';
          const active = activeMarker === i;
          return <g key={`${step.area}-${i}`}><circle cx={step.x} cy={step.y} r={active ? 5 : 3} fill={color} fillOpacity="0.25" className="animate-ping" /><circle cx={step.x} cy={step.y} r={active ? 6 : 4} stroke={color} strokeWidth="1" fill="none" /><circle cx={step.x} cy={step.y} r="1.4" fill={color} /></g>;
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-24">
      {outcomeItem&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
        <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] border border-[#d9b657]/20 bg-[#080b09] p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-[#d9b657]">Beskjæringsfasit</p>
              <h3 className="text-xl font-black text-white mt-1">{outcomeItem.treeType||'Oliventre'}</h3>
              <p className="text-xs text-slate-500 mt-1">Registrer bare det som faktisk ble gjort. Denne fasiten brukes i senere ekspertvurderinger.</p>
            </div>
            <button onClick={()=>setOutcomeItem(null)} disabled={isSavingOutcome} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400"><X size={18}/></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <label className="text-xs text-slate-400">Status
              <select value={outcomeStatus} onChange={e=>setOutcomeStatus(e.target.value as Exclude<PruningExecutionStatus,'planned'>)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white">
                <option value="completed">Utført</option>
                <option value="partly_completed">Delvis utført</option>
                <option value="cancelled">Avlyst / ikke utført</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">Dato
              <input type="date" value={outcomeDate} onChange={e=>setOutcomeDate(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white"/>
            </label>
            <label className="text-xs text-slate-400">Resultat
              <select value={outcomeRating} onChange={e=>setOutcomeRating(e.target.value as PruningOutcomeRating|'')} disabled={outcomeStatus==='cancelled'} className="mt-1 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white disabled:opacity-40">
                <option value="">Ikke vurdert ennå</option>
                <option value="good">Bra</option>
                <option value="mixed">Blandet</option>
                <option value="poor">Dårlig</option>
              </select>
            </label>
          </div>

          {(outcomeItem.plan?.pruningSteps?.length||0)>0&&<div className="mt-5">
            <p className="text-[10px] uppercase tracking-widest font-black text-purple-300">Fasit per AI-råd</p>
            <div className="space-y-2 mt-2">
              {(outcomeItem.plan?.pruningSteps||[]).map((step,index)=>{
                const entry=outcomeStepFeedback[index]||{};
                return <div key={index} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
                  <p className="text-xs font-black text-white">{index+1}. {step.area}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{step.action}</p>
                  <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] gap-2 mt-3">
                    <select value={entry.status||''} onChange={e=>setOutcomeStepFeedback(current=>({...current,[index]:{...current[index],status:(e.target.value||undefined) as PruningStepFeedbackStatus|undefined}}))} className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white">
                      <option value="">Ikke vurdert</option>
                      <option value="performed">Utført som foreslått</option>
                      <option value="corrected">Endret / korrigert</option>
                      <option value="skipped">Ikke utført</option>
                      <option value="not_applicable">Ikke relevant</option>
                    </select>
                    <input value={entry.note||''} onChange={e=>setOutcomeStepFeedback(current=>({...current,[index]:{...current[index],note:e.target.value}}))} placeholder="Kort forklaring ved endring/ikke utført" className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-white"/>
                  </div>
                </div>;
              })}
            </div>
          </div>}

          <div className="mt-5">
            <label className="text-xs text-slate-400">Notat om faktisk arbeid / resultat
              <textarea value={outcomeNotes} onChange={e=>setOutcomeNotes(e.target.value)} className="mt-1 min-h-[90px] w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white" placeholder="Hva ble gjort annerledes? Hvordan så treet ut etterpå?"/>
            </label>
          </div>

          <div className="mt-5">
            <input ref={outcomeFileInputRef} type="file" accept="image/*" multiple onChange={handleOutcomeImageUpload} className="hidden"/>
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-xs font-bold text-white">Etterbilder</p><p className="text-[10px] text-slate-500">Valgfritt, maks 3. Gir Olivia før/etter-grunnlag.</p></div>
              <button onClick={()=>outcomeFileInputRef.current?.click()} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 flex items-center gap-2"><Upload size={13}/> Legg til</button>
            </div>
            {(outcomeItem.afterImages?.length||0)>0&&<div className="mt-3">
              <p className="text-[9px] uppercase tracking-widest font-black text-slate-500 mb-2">Lagrede etterbilder</p>
              <div className="grid grid-cols-3 gap-2">{(outcomeItem.afterImages||[]).slice(-3).map((img,index)=><a key={img+index} href={img} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-white/10"><img src={img} className="h-28 w-full object-cover"/></a>)}</div>
            </div>}
            {outcomeAfterImages.length>0&&<div className="mt-3">
              <p className="text-[9px] uppercase tracking-widest font-black text-purple-300 mb-2">Nye etterbilder</p>
              <div className="grid grid-cols-3 gap-2">{outcomeAfterImages.map((img,index)=><div key={index} className="relative overflow-hidden rounded-xl border border-white/10"><img src={img} className="h-28 w-full object-cover"/><button onClick={()=>setOutcomeAfterImages(current=>current.filter((_,i)=>i!==index))} className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white"><X size={12}/></button></div>)}</div>
            </div>}
          </div>

          {outcomeItem.outcomeAiReview&&<div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.035] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className="text-[9px] uppercase tracking-widest font-black text-cyan-300">Visuell etterkontroll · AI</p><p className="text-xs font-bold text-white mt-1">Observasjon, ikke gårdsfasit</p></div>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-black text-slate-400">{outcomeItem.outcomeAiReview.confidence}% · {qualityLabel(outcomeItem.outcomeAiReview.observationQuality)}</span>
            </div>
            <p className="text-xs text-slate-300 mt-3">{outcomeItem.outcomeAiReview.summary}</p>
            {outcomeItem.outcomeAiReview.visibleChanges.length>0&&<div className="mt-3 space-y-1">{outcomeItem.outcomeAiReview.visibleChanges.slice(0,5).map((item,index)=><p key={index} className="text-[10px] text-slate-400">• {item}</p>)}</div>}
            {outcomeItem.outcomeAiReview.concerns.length>0&&<p className="text-[10px] text-amber-200 mt-3">Begrensninger: {outcomeItem.outcomeAiReview.concerns.slice(0,3).join(' · ')}</p>}
          </div>}

          <div className="flex justify-end gap-2 mt-6">
            <button onClick={()=>setOutcomeItem(null)} disabled={isSavingOutcome} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300">Avbryt</button>
            <button onClick={saveOutcome} disabled={isSavingOutcome} className="rounded-xl bg-[#d9b657] px-5 py-3 text-xs font-black text-black disabled:opacity-40 flex items-center gap-2">{isSavingOutcome?<Loader2 size={14} className="animate-spin"/>:<CheckCircle2 size={14}/>} Lagre verifisert fasit</button>
          </div>
        </div>
      </div>}
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(217,182,87,0.12),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><Scissors className="text-green-400" /> AI Beskjæringsekspert</h2>
              <p className="text-slate-400 text-sm mt-2">Mer presis bildeveiledning, normaliserte snittpunkter og Supabase-lagret historikk/oppgaver.</p>
            </div>
          </div>
          {(plan || images.length > 0 || error) && <button onClick={reset} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-3 rounded-2xl text-xs font-bold border border-white/10"><RefreshCcw size={16} /> Ny analyse</button>}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden glass border border-white/10 bg-black shadow-2xl">
            {showCamera ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-75" /> : images[0] ? <img src={images[0]} className="w-full h-full object-cover" alt="Beskjæring" /> : null}
            {!showCamera && renderMarkers()}
            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
            {showCamera && <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4"><button onClick={handleFilePick} disabled={isUploading} className="w-14 h-14 rounded-full bg-black/50 border-2 border-white/40 text-white flex items-center justify-center hover:border-white/80 disabled:opacity-40">{isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}</button><button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white/10 border-4 border-white flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-white" /></button></div>}
            {isAnalyzing && <div className="absolute inset-0 bg-black/75 backdrop-blur-lg flex flex-col items-center justify-center gap-4"><Loader2 size={44} className="animate-spin text-green-400" /><p className="text-white font-bold uppercase tracking-widest text-xs">Mapper snittpunkter...</p></div>}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 min-h-[84px]">
            {images.map((img, i) => <div key={`${img.slice(0, 18)}-${i}`} className="relative flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border border-white/10"><img src={img} className="w-full h-full object-cover" /><button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full"><X size={12} /></button></div>)}
            <button onClick={showCamera ? capturePhoto : startCamera} className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-white"><Camera size={18} /><span className="text-[9px] font-bold uppercase">{showCamera ? 'Ta bilde' : 'Kamera'}</span></button>
            <button onClick={handleFilePick} disabled={isUploading} className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-green-500/30 flex flex-col items-center justify-center gap-1 text-green-400"><Upload size={18} /><span className="text-[9px] font-bold uppercase">Last opp</span></button>
          </div>

          <OlivePhotoProtocol imageCount={images.length} mode="pruning" />

          <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Parsell</label>
            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" value={selectedParcelId} onChange={e => setSelectedParcelId(e.target.value)}>{parcels.length ? parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">Ingen parseller funnet i Supabase</option>}</select>
            {selectedParcel && <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={12} /> {selectedParcel.municipality || 'Biar'} · {selectedParcel.treeVariety || selectedParcel.crop || 'oliven'}</p>}
            <div className="rounded-xl border border-green-500/15 bg-green-500/[0.04] p-3">
              <p className="text-[9px] uppercase tracking-widest font-black text-green-400">Historikk som beskjæringsassistenten kjenner</p>
              {contextLoading ? <p className="text-xs text-slate-500 mt-1">Henter driftsjournal…</p> : farmContext ? <p className="text-xs text-slate-400 mt-1 line-clamp-5 whitespace-pre-line">{farmContext}</p> : <p className="text-xs text-slate-600 mt-1">Ingen verifisert historikk for valgt parsell ennå.</p>}
            </div>
            {historicalImages.length>0&&<div>
              <p className="text-[9px] uppercase tracking-widest font-black text-slate-500 mb-2">Siste historiske feltbilder</p>
              <div className="grid grid-cols-3 gap-2">{historicalImages.slice(0,6).map((item,index)=><div key={item.url+'-'+index} className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30"><img src={item.url} alt={item.title} className="h-24 w-full object-cover"/><div className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-[8px] text-slate-300">{item.observedAt.slice(0,10)}</div></div>)}</div>
              <p className="text-[9px] text-slate-600 mt-2">Historiske bilder vises som referanse. De legges ikke automatisk inn som nye analysebilder.</p>
            </div>}
          </div>
          <FarmQuestionsPanel key={'pruning-questions-'+(lastAssessmentId||selectedParcelId)} parcelId={selectedParcelId||undefined} agentType="pruning_assistant" title="Beskjæringsassistenten trenger avklaring" compact />
          <AgentFeedbackPanel assessmentId={lastAssessmentId} agentType="pruning_assistant" parcelId={selectedParcelId||undefined} />

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-100 leading-relaxed"><p className="font-bold text-white mb-2">For presise snittpunkter</p><p>Ta heltrebilde rett forfra med god avstand. Ta også sidebilde og nærbilde av hovedgreiner. AI bør ikke brukes alene for harde kutt i gamle trær.</p></div>

          <button onClick={analyze} disabled={!images.length || isAnalyzing} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2"><Scissors size={18} /> Analyser beskjæring</button>
        </div>

        <div className="space-y-6">
          {!plan ? <div className="glass rounded-[2rem] p-8 border border-white/10 text-center"><ImageIcon className="mx-auto text-[#d9b657] mb-4" size={42} /><h3 className="text-white font-bold text-xl">Klar for beskjæringsanalyse</h3><p className="text-slate-400 text-sm mt-2">Legg inn minst ett godt heltrebilde. Flere vinkler gir bedre verdi.</p></div> : <div className="space-y-5 animate-in slide-in-from-right-6 duration-500"><div className="glass rounded-[2rem] p-6 border border-white/10"><p className="text-[10px] font-bold text-[#d9b657] uppercase tracking-widest">Ekspertbeslutning</p><h3 className="text-2xl font-bold text-white mt-1">{plan.treeType}</h3><p className="text-xs text-slate-500 mt-1">{plan.ageEstimate}{plan.treeStage?' · '+plan.treeStage:''}{plan.trainingSystem?' · '+plan.trainingSystem:''}</p>{plan.pruningGoal&&<p className="text-xs text-green-300 mt-3"><span className="font-black">Mål:</span> {plan.pruningGoal}</p>}{plan.decisionSummary&&<p className="text-sm text-slate-300 mt-3">{plan.decisionSummary}</p>}<p className="text-sm text-slate-400 mt-4">{plan.timingAdvice}</p><div className="grid grid-cols-2 gap-3 mt-5"><Metric label="Anbefalt dato" value={scheduledDate || plan.recommendedDate} /><Metric label="Antall punkter" value={String(plan.pruningSteps.length)} /><Metric label="Sikkerhet" value={`${confidencePercent(plan.confidence)}%`} /><Metric label="Bildegrunnlag" value={qualityLabel(plan.observationQuality)} /></div>{(plan.limitations?.length || plan.missingDetails?.length || plan.safetyNotes?.length) ? <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100 space-y-1">{plan.limitations?.length ? <p>Begrensning: {plan.limitations.join(', ')}</p> : null}{plan.missingDetails?.length ? <p>Mangler: {plan.missingDetails.join(', ')}</p> : null}{plan.safetyNotes?.length ? <p>Sikkerhet: {plan.safetyNotes.join(', ')}</p> : null}</div> : null}</div>

            {plan.expertReview&&<div className={'rounded-[2rem] border p-5 '+(plan.expertReview.verdict==='APPROVE'?'border-green-500/20 bg-green-500/[0.04]':plan.expertReview.verdict==='ADJUST'?'border-amber-500/20 bg-amber-500/[0.04]':'border-red-500/20 bg-red-500/[0.04]')}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] uppercase tracking-widest font-black text-purple-300">Ekspertpanel · Kritiker</p><p className="text-sm font-bold text-white mt-1">Andre vurdering av planen</p></div>
                <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-black text-slate-300">{plan.expertReview.verdict==='APPROVE'?'GODKJENT':plan.expertReview.verdict==='ADJUST'?'JUSTERING':'MER BEVIS'}</span>
              </div>
              <p className="text-xs text-slate-300 mt-3">{plan.expertReview.summary}</p>
              {plan.expertReview.agreements.length>0&&<p className="text-[10px] text-green-200 mt-3">Enig: {plan.expertReview.agreements.slice(0,3).join(' · ')}</p>}
              {plan.expertReview.concerns.length>0&&<div className="mt-3"><p className="text-[9px] uppercase tracking-widest font-black text-amber-300">Kritiske punkter</p>{plan.expertReview.concerns.slice(0,4).map((item,i)=><p key={i} className="text-xs text-slate-400 mt-1">• {item}</p>)}</div>}
              {plan.expertReview.blockingQuestions.length>0&&<p className="text-[10px] text-red-200 mt-3">Før større inngrep: {plan.expertReview.blockingQuestions.join(' · ')}</p>}
            </div>}

            <div className="glass rounded-[2rem] p-5 border border-white/10 space-y-3"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Planlagt dato</label><input type="date" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} /></div>

            <div className="space-y-3">{plan.pruningSteps.length ? plan.pruningSteps.map((step, i) => {
              const risk=step.riskLevel||'YELLOW';
              const riskLabel=risk==='GREEN'?'GRØNN · normalt trygg':risk==='RED'?'RØD · ikke kutt ennå':'GUL · kontroller først';
              const riskClass=risk==='GREEN'?'border-green-500/25 bg-green-500/[0.04] text-green-300':risk==='RED'?'border-red-500/25 bg-red-500/[0.04] text-red-300':'border-amber-500/25 bg-amber-500/[0.04] text-amber-300';
              return <button key={`${step.area}-${i}`} onMouseEnter={() => setActiveMarker(i)} onMouseLeave={() => setActiveMarker(null)} className={`w-full text-left p-4 rounded-2xl border transition-all ${activeMarker === i ? 'border-green-500/30 bg-green-500/10' : 'border-white/10 bg-white/5'}`}>
                <div className="flex flex-wrap justify-between gap-2"><p className="text-white font-bold flex-1 min-w-0"><Scissors size={14} className="inline mr-2" />{step.area}</p><div className="flex gap-2"><span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+riskClass}>{riskLabel}</span><span className="text-[10px] text-[#d9b657] font-bold">{confidencePercent(step.confidence)}%</span></div></div>
                <p className="text-sm text-slate-300 mt-2">{step.action}</p>
                {step.whyNow&&<p className="text-xs text-green-200 mt-2"><span className="font-black">Hvorfor:</span> {step.whyNow}</p>}
                {step.evidence&&<p className="text-xs text-slate-500 mt-2">Synlig grunnlag: {step.evidence}</p>}
                {step.consequenceIfSkipped&&<p className="text-[10px] text-slate-600 mt-2">Hvis det utsettes: {step.consequenceIfSkipped}</p>}
              </button>;
            }) : <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">Ingen synlige tiltak ble vurdert som forsvarlige. Følg foto-protokollen over og kjør analysen på nytt.</div>}</div>

            <div className="flex flex-col md:flex-row gap-3"><button onClick={saveToHistory} disabled={isSavingHistory} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${historySaved ? 'bg-green-500 text-black' : 'bg-white/10 text-white hover:bg-white/15'}`}>{isSavingHistory ? <Loader2 size={18} className="animate-spin" /> : historySaved ? <CheckCircle2 size={18} /> : <Save size={18} />} {historySaved ? 'Lagret' : 'Lagre historikk'}</button><button onClick={addTask} disabled={isSavingTask} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${taskSaved ? 'bg-green-500 text-black' : 'bg-[#d9b657] text-black hover:bg-[#f0cf70]'}`}>{isSavingTask ? <Loader2 size={18} className="animate-spin" /> : taskSaved ? <CheckCircle2 size={18} /> : <Calendar size={18} />} {taskSaved ? 'Oppgave laget' : 'Lag oppgave'}</button></div>

            <p className="text-xs text-slate-500">Verktøy: {plan.toolsNeeded.join(', ')}</p></div>}
        </div>
      </div>

      <div className="space-y-4"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={14} /> Supabase historikk</h3>{history.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{history.slice(0, 8).map(item => {
        const status=item.executionStatus||'planned';
        const statusText=status==='completed'?'Utført':status==='partly_completed'?'Delvis utført':status==='cancelled'?'Avlyst':'Ingen fasit';
        return <div key={item.id} className="glass rounded-2xl p-4 border border-white/10">
          <div className="flex justify-between gap-3">
            <div><p className="text-white font-bold">{item.treeType || 'Beskjæring'}</p><p className="text-xs text-slate-500 mt-1">{new Date(item.date).toLocaleDateString('no-NO')} · {parcels.find(p => p.id === item.parcelId)?.name || 'Ingen parsell'}</p></div>
            <button onClick={() => deleteHistory(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={'rounded-full border px-2 py-0.5 text-[9px] font-black '+(status==='completed'?'border-green-500/25 text-green-300':status==='partly_completed'?'border-amber-500/25 text-amber-300':status==='cancelled'?'border-red-500/25 text-red-300':'border-white/10 text-slate-500')}>{statusText}</span>
            {item.outcomeRating&&<span className="text-[9px] text-slate-500">Resultat: {item.outcomeRating}</span>}
            {(item.afterImages?.length||0)>0&&<span className="text-[9px] text-purple-300">{item.afterImages?.length} etterbilder</span>}
          </div>
          {item.outcomeNotes&&<p className="text-xs text-slate-500 mt-2 line-clamp-2">{item.outcomeNotes}</p>}
          {item.outcomeAiReview&&<div className="mt-2 rounded-xl border border-cyan-500/10 bg-cyan-500/[0.025] p-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300">AI etterkontroll · {item.outcomeAiReview.confidence}%</p>
            <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.outcomeAiReview.summary}</p>
          </div>}
          <button onClick={()=>openOutcome(item)} className="mt-3 w-full rounded-xl border border-[#d9b657]/20 bg-[#d9b657]/[0.05] px-3 py-2 text-xs font-black text-[#d9b657]">{item.outcomeVerifiedAt?'Rediger fasit':'Registrer fasit'}</button>
        </div>;
      })}</div> : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Ingen beskjæringsanalyser lagret ennå.</div>}</div>
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/5 border border-white/5 p-3"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-sm text-white font-bold mt-1 line-clamp-2">{value}</p></div>;
}

export default PruningAdvisorView;
