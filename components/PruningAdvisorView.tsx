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
import { Parcel, PruningHistoryItem, Task } from '../types';
import { Language } from '../services/i18nService';
import { filesToResizedDataUrls } from '../lib/imageUpload';
import { deletePruningItem, fetchParcels, fetchPruningHistory, fetchSettings, upsertPruningItem, upsertTask } from '../services/db';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}`;
}

function normalizePriority(priority: any): 'HØY' | 'MIDDELS' | 'LAV' {
  const value = String(priority || '').toUpperCase();
  if (value.includes('H')) return 'HØY';
  if (value.includes('M')) return 'MIDDELS';
  return 'LAV';
}

function normalizeStep(step: Partial<PruningStep>, index: number): PruningStep {
  return {
    area: step.area || `Område ${index + 1}`,
    action: step.action || 'Vurder forsiktig tynning etter visuell kontroll. Ikke utfør hard beskjæring uten bedre bildegrunnlag.',
    priority: normalizePriority(step.priority),
    x: Math.max(5, Math.min(95, Number(step.x || 50))),
    y: Math.max(5, Math.min(95, Number(step.y || 50))),
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
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingHistory, setIsSavingHistory] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const [taskSaved, setTaskSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedParcel = parcels.find(parcel => parcel.id === selectedParcelId);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setError(null);
    } catch {
      setError('Kunne ikke få tilgang til kamera. Du kan fortsatt laste opp bilder.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
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

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    setImages(prev => [...prev, canvasRef.current!.toDataURL('image/jpeg', 0.85)]);
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setIsUploading(true);
    setError(null);
    try {
      const dataUrls = await filesToResizedDataUrls(files);
      setImages(prev => [...prev, ...dataUrls]);
    } catch (err: any) {
      setError(`Kunne ikke lese bilder: ${err?.message || String(err)}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const analyze = async () => {
    if (!images.length) return;
    setIsAnalyzing(true);
    setPlan(null);
    setError(null);
    setHistorySaved(false);
    setTaskSaved(false);
    try {
      const mainImage = images[0].split(',')[1];
      const raw = await geminiService.analyzePruning(mainImage, language);
      const normalized = normalizePlan(raw);
      setPlan(normalized);
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

  const deleteHistory = async (id: string) => {
    try {
      await deletePruningItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      setError(`Kunne ikke slette historikk: ${err?.message || String(err)}`);
    }
  };

  const reset = () => {
    setImages([]);
    setPlan(null);
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
          const color = step.priority === 'HØY' ? '#ef4444' : step.priority === 'MIDDELS' ? '#f59e0b' : '#22c55e';
          const active = activeMarker === i;
          return <g key={`${step.area}-${i}`}><circle cx={step.x} cy={step.y} r={active ? 5 : 3} fill={color} fillOpacity="0.25" className="animate-ping" /><circle cx={step.x} cy={step.y} r={active ? 6 : 4} stroke={color} strokeWidth="1" fill="none" /><circle cx={step.x} cy={step.y} r="1.4" fill={color} /></g>;
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-24">
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
            <button onClick={capturePhoto} className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-white"><Camera size={18} /><span className="text-[9px] font-bold uppercase">Ta bilde</span></button>
            <button onClick={handleFilePick} disabled={isUploading} className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-green-500/30 flex flex-col items-center justify-center gap-1 text-green-400"><Upload size={18} /><span className="text-[9px] font-bold uppercase">Last opp</span></button>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Parsell</label>
            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" value={selectedParcelId} onChange={e => setSelectedParcelId(e.target.value)}>{parcels.length ? parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">Ingen parseller funnet i Supabase</option>}</select>
            {selectedParcel && <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={12} /> {selectedParcel.municipality || 'Biar'} · {selectedParcel.treeVariety || selectedParcel.crop || 'oliven'}</p>}
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-100 leading-relaxed"><p className="font-bold text-white mb-2">For presise snittpunkter</p><p>Ta heltrebilde rett forfra med god avstand. Ta også sidebilde og nærbilde av hovedgreiner. AI bør ikke brukes alene for harde kutt i gamle trær.</p></div>

          <button onClick={analyze} disabled={!images.length || isAnalyzing} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2"><Scissors size={18} /> Analyser beskjæring</button>
        </div>

        <div className="space-y-6">
          {!plan ? <div className="glass rounded-[2rem] p-8 border border-white/10 text-center"><ImageIcon className="mx-auto text-[#d9b657] mb-4" size={42} /><h3 className="text-white font-bold text-xl">Klar for beskjæringsanalyse</h3><p className="text-slate-400 text-sm mt-2">Legg inn minst ett godt heltrebilde. Flere vinkler gir bedre verdi.</p></div> : <div className="space-y-5 animate-in slide-in-from-right-6 duration-500"><div className="glass rounded-[2rem] p-6 border border-white/10"><p className="text-[10px] font-bold text-[#d9b657] uppercase tracking-widest">Plan</p><h3 className="text-2xl font-bold text-white mt-1">{plan.treeType}</h3><p className="text-xs text-slate-500 mt-1">{plan.ageEstimate}</p><p className="text-sm text-slate-400 mt-4">{plan.timingAdvice}</p><div className="grid grid-cols-2 gap-3 mt-5"><Metric label="Anbefalt dato" value={scheduledDate || plan.recommendedDate} /><Metric label="Antall punkter" value={String(plan.pruningSteps.length)} /></div></div>

            <div className="glass rounded-[2rem] p-5 border border-white/10 space-y-3"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Planlagt dato</label><input type="date" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} /></div>

            <div className="space-y-3">{plan.pruningSteps.length ? plan.pruningSteps.map((step, i) => <button key={`${step.area}-${i}`} onMouseEnter={() => setActiveMarker(i)} onMouseLeave={() => setActiveMarker(null)} className={`w-full text-left p-4 rounded-2xl border transition-all ${activeMarker === i ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}><div className="flex justify-between"><p className="text-white font-bold"><Scissors size={14} className="inline mr-2" />{step.area}</p><span className="text-[10px] text-[#d9b657] font-bold">{step.priority}</span></div><p className="text-sm text-slate-400 mt-2">{step.action}</p></button>) : <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">AI kunne ikke markere trygge snittpunkter. Ta flere bilder før du beskjærer.</div>}</div>

            <div className="flex flex-col md:flex-row gap-3"><button onClick={saveToHistory} disabled={isSavingHistory} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${historySaved ? 'bg-green-500 text-black' : 'bg-white/10 text-white hover:bg-white/15'}`}>{isSavingHistory ? <Loader2 size={18} className="animate-spin" /> : historySaved ? <CheckCircle2 size={18} /> : <Save size={18} />} {historySaved ? 'Lagret' : 'Lagre historikk'}</button><button onClick={addTask} disabled={isSavingTask} className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${taskSaved ? 'bg-green-500 text-black' : 'bg-[#d9b657] text-black hover:bg-[#f0cf70]'}`}>{isSavingTask ? <Loader2 size={18} className="animate-spin" /> : taskSaved ? <CheckCircle2 size={18} /> : <Calendar size={18} />} {taskSaved ? 'Oppgave laget' : 'Lag oppgave'}</button></div>

            <p className="text-xs text-slate-500">Verktøy: {plan.toolsNeeded.join(', ')}</p></div>}
        </div>
      </div>

      <div className="space-y-4"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><History size={14} /> Supabase historikk</h3>{history.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{history.slice(0, 8).map(item => <div key={item.id} className="glass rounded-2xl p-4 border border-white/10 flex justify-between gap-3"><div><p className="text-white font-bold">{item.treeType || 'Beskjæring'}</p><p className="text-xs text-slate-500 mt-1">{new Date(item.date).toLocaleDateString('no-NO')} · {parcels.find(p => p.id === item.parcelId)?.name || 'Ingen parsell'}</p></div><button onClick={() => deleteHistory(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></div>)}</div> : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">Ingen beskjæringsanalyser lagret ennå.</div>}</div>
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/5 border border-white/5 p-3"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-sm text-white font-bold mt-1 line-clamp-2">{value}</p></div>;
}

export default PruningAdvisorView;
