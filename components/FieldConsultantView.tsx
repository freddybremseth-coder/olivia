import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Award,
  Camera,
  CheckCircle2,
  FileText,
  History,
  Image as ImageIcon,
  Leaf,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  Scissors,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { geminiService, ComprehensiveAnalysisResult, PruningPlan } from '../services/geminiService';
import { Parcel, PruningHistoryItem } from '../types';
import { Language } from '../services/i18nService';
import { filesToResizedDataUrls } from '../lib/imageUpload';
import { deletePruningItem, fetchParcels, fetchPruningHistory, fetchSettings, upsertPruningItem } from '../services/db';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

type ResultTab = 'summary' | 'health' | 'pruning' | 'history';

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}`;
}

function confidencePercent(value: unknown): number {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  const normalized = n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function normalizePriority(priority: any): 'HØY' | 'MIDDELS' | 'LAV' {
  const value = String(priority || '').toUpperCase();
  if (value.includes('H')) return 'HØY';
  if (value.includes('M')) return 'MIDDELS';
  return 'LAV';
}

function normalizePlan(plan?: Partial<PruningPlan>): PruningPlan {
  const steps = Array.isArray(plan?.pruningSteps) ? plan!.pruningSteps : [];
  return {
    treeType: plan?.treeType || 'Oliven · sort usikker',
    ageEstimate: plan?.ageEstimate || 'Ukjent alder',
    pruningSteps: steps
      .filter(step => step && step.action)
      .slice(0, 8)
      .map((step, index) => ({
        area: step.area || `Område ${index + 1}`,
        action: step.action || 'Vurder forsiktig tynning etter visuell kontroll.',
        priority: normalizePriority(step.priority),
        x: Math.max(5, Math.min(95, Number(step.x || 50))),
        y: Math.max(5, Math.min(95, Number(step.y || 50))),
      })),
    recommendedDate: plan?.recommendedDate || new Date().toISOString().slice(0, 10),
    timingAdvice: plan?.timingAdvice || 'AI kunne ikke fastslå optimal timing med høy sikkerhet. Bruk lokal sesong, treets vitalitet og vær før tiltak.',
    toolsNeeded: Array.isArray(plan?.toolsNeeded) && plan!.toolsNeeded.length ? plan!.toolsNeeded : ['Beskjæringssaks', 'Sag', 'Desinfeksjon av verktøy'],
  };
}

function normalizeAnalysis(raw: ComprehensiveAnalysisResult | null): ComprehensiveAnalysisResult {
  const pruning = normalizePlan(raw?.pruning);
  const actions = Array.isArray(raw?.diagnosis?.actions) && raw!.diagnosis.actions.length
    ? raw!.diagnosis.actions
    : [
        'Ta minst ett heltrebilde, ett nærbilde av bladverk og ett bilde av stamme/hovedgreiner.',
        'Kontroller jordfukt, skuddvekst, døde greiner og tegn til skadedyr før tiltak.',
        'Ikke utfør harde kutt før treets struktur er tydelig dokumentert.',
      ];

  return {
    diagnosis: {
      subject: raw?.diagnosis?.subject || 'Olivenanalyse fra bilde',
      variety: raw?.diagnosis?.variety || 'Ukjent sort',
      condition: raw?.diagnosis?.condition || 'OBSERVASJON',
      diagnosis: raw?.diagnosis?.diagnosis || 'AI fikk ikke nok sikre detaljer til en presis diagnose. Analysen er derfor en praktisk feltvurdering og bør støttes med flere bilder og observasjoner.',
      actions,
    },
    pruning,
    expertReport: {
      urgencyScore: Math.max(0, Math.min(10, Number(raw?.expertReport?.urgencyScore ?? 4))),
      economicImpact: raw?.expertReport?.economicImpact || 'Ukjent. Trenger bedre bildegrunnlag og feltdata for å anslå produksjonstap.',
      yieldEstimate: raw?.expertReport?.yieldEstimate || 'Ikke sikkert estimert fra tilgjengelig bilde.',
      fertilizerRecommendation: raw?.expertReport?.fertilizerRecommendation || 'Ikke anbefal gjødsling kun fra bilde. Bruk jord-/bladprøve ved større tiltak.',
      irrigationNote: raw?.expertReport?.irrigationNote || 'Kontroller jordfukt og siste vanning før konklusjon.',
      rejuvenationNeeded: !!raw?.expertReport?.rejuvenationNeeded,
      nextKeyAction: raw?.expertReport?.nextKeyAction || actions[0],
    },
    varietyConfidence: confidencePercent(raw?.varietyConfidence),
    needsMoreImages: raw?.needsMoreImages ?? confidencePercent(raw?.varietyConfidence) < 60,
    missingDetails: Array.isArray(raw?.missingDetails) && raw!.missingDetails.length
      ? raw!.missingDetails
      : ['heltre', 'bladverk nærbilde', 'stamme/hovedgreiner', 'frukt/skudd hvis relevant'],
  };
}

const FieldConsultantView: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<ComprehensiveAnalysisResult | null>(null);
  const [history, setHistory] = useState<PruningHistoryItem[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [activeTab, setActiveTab] = useState<ResultTab>('summary');
  const [activeMarker, setActiveMarker] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>('no');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedParcel = useMemo(() => parcels.find(p => p.id === selectedParcelId), [parcels, selectedParcelId]);
  const confidence = confidencePercent(analysis?.varietyConfidence);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setError(null);
    } catch {
      setError('Kunne ikke starte kamera. Du kan fortsatt laste opp bilder fra enheten.');
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
      console.error('[FieldConsultantView] loadData', err);
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
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
    setImages(prev => [...prev, dataUrl]);
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

  const runAnalysis = async () => {
    if (!images.length) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    try {
      const base64List = images.map(img => img.split(',')[1]).filter(Boolean);
      const raw = await geminiService.analyzeComprehensive(base64List, language);
      const normalized = normalizeAnalysis(raw);
      setAnalysis(normalized);
      setShowCamera(false);
      setActiveTab('summary');
      stopCamera();
    } catch (err: any) {
      setError(`Analyse feilet: ${err?.message || String(err)}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysis = async () => {
    if (!analysis || !images.length) return;
    setIsSaving(true);
    setError(null);
    try {
      const item: PruningHistoryItem = {
        id: makeId('consultant'),
        date: new Date().toISOString(),
        images,
        treeType: analysis.diagnosis.variety || analysis.pruning.treeType,
        ageEstimate: analysis.pruning.ageEstimate,
        analysis: {
          diagnosis: analysis.diagnosis,
          pruning: analysis.pruning,
          varietyConfidence: confidence,
          needsMoreImages: analysis.needsMoreImages,
          missingDetails: analysis.missingDetails,
        },
        plan: analysis.pruning,
        parcelId: selectedParcelId || undefined,
        scheduledTime: analysis.pruning.recommendedDate,
      };
      await upsertPruningItem(item);
      setHistory(prev => [item, ...prev.filter(h => h.id !== item.id)]);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(`Kunne ikke lagre analysen i Supabase: ${err?.message || String(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteHistory = async (id: string) => {
    try {
      await deletePruningItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      setError(`Kunne ikke slette analyse: ${err?.message || String(err)}`);
    }
  };

  const reset = () => {
    setImages([]);
    setAnalysis(null);
    setError(null);
    setShowCamera(true);
    setActiveTab('summary');
    setActiveMarker(null);
    startCamera();
  };

  const renderMarkers = (plan?: PruningPlan) => {
    if (!plan?.pruningSteps?.length) return null;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {plan.pruningSteps.map((step, i) => {
          const color = step.priority === 'HØY' ? '#ef4444' : step.priority === 'MIDDELS' ? '#f59e0b' : '#22c55e';
          const isActive = activeMarker === i;
          return (
            <g key={`${step.area}-${i}`}>
              <circle cx={step.x} cy={step.y} r={isActive ? 5 : 3} fill={color} fillOpacity="0.25" className="animate-ping" />
              <circle cx={step.x} cy={step.y} r={isActive ? 6 : 4} stroke={color} strokeWidth="1" fill="none" />
              <circle cx={step.x} cy={step.y} r="1.4" fill={color} />
            </g>
          );
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
              <h2 className="text-3xl font-bold text-white flex items-center gap-3 mt-1"><Sparkles className="text-green-400" /> AI Feltkonsulent</h2>
              <p className="text-slate-400 text-sm mt-2">Smart feltanalyse med flere bilder, normalisert sikkerhet og Supabase-lagret historikk.</p>
            </div>
          </div>
          {(analysis || images.length > 0) && <button onClick={reset} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-3 rounded-2xl text-xs font-bold border border-white/10"><RefreshCcw size={16} /> Ny analyse</button>}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden glass border border-white/10 bg-black shadow-2xl">
            {showCamera ? <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" /> : images[0] ? <img src={images[0]} className="w-full h-full object-cover" alt="Analyse" /> : null}
            {!showCamera && analysis && renderMarkers(analysis.pruning)}
            <canvas ref={canvasRef} className="hidden" />
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
            {showCamera && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
                <button onClick={handleFilePick} disabled={isUploading} className="w-14 h-14 rounded-full bg-black/50 border-2 border-white/40 text-white flex items-center justify-center hover:border-white/80 disabled:opacity-40">{isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}</button>
                <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white/10 border-4 border-white flex items-center justify-center"><div className="w-14 h-14 rounded-full bg-white" /></button>
              </div>
            )}
            {isAnalyzing && <div className="absolute inset-0 bg-black/75 backdrop-blur-lg flex flex-col items-center justify-center gap-4"><Loader2 size={44} className="animate-spin text-green-400" /><p className="text-white font-bold uppercase tracking-widest text-xs">Analyserer {images.length} bilde(r)...</p></div>}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 min-h-[84px]">
            {images.map((img, index) => <div key={`${img.slice(0, 18)}-${index}`} className="relative flex-shrink-0 w-20 h-20 rounded-2xl overflow-hidden border border-white/10"><img src={img} className="w-full h-full object-cover" /><button onClick={() => setImages(prev => prev.filter((_, i) => i !== index))} className="absolute top-1 right-1 p-1 bg-black/70 text-white rounded-full"><X size={12} /></button></div>)}
            <button onClick={capturePhoto} className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-white"><Camera size={18} /><span className="text-[9px] font-bold uppercase">Ta bilde</span></button>
            <button onClick={handleFilePick} disabled={isUploading} className="flex-shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-green-500/30 flex flex-col items-center justify-center gap-1 text-green-400"><Upload size={18} /><span className="text-[9px] font-bold uppercase">Last opp</span></button>
          </div>

          <div className="glass rounded-2xl p-4 border border-white/10 space-y-3">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Parsell for analyse</label>
            <select className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white" value={selectedParcelId} onChange={e => setSelectedParcelId(e.target.value)}>
              {parcels.length ? parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">Ingen parseller funnet i Supabase</option>}
            </select>
            {selectedParcel && <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={12} /> {selectedParcel.municipality || 'Biar'} · {selectedParcel.treeVariety || selectedParcel.crop || 'oliven'}</p>}
          </div>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-100 leading-relaxed">
            <p className="font-bold text-white mb-2">For bedre treff: ta 3–5 bilder</p>
            <p>1 heltrebilde, 1 bilde av stamme/hovedgreiner, 1 nærbilde av bladverk, og gjerne frukt/skudd eller skade. Da slipper du “0 treff” og får mer presise tiltak.</p>
          </div>

          <button onClick={runAnalysis} disabled={!images.length || isAnalyzing} className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2"><Sparkles size={18} /> Start smart analyse</button>
        </div>

        <div className="space-y-6">
          {!analysis ? (
            <div className="glass rounded-[2rem] p-8 border border-white/10 text-center">
              <ImageIcon className="mx-auto text-[#d9b657] mb-4" size={42} />
              <h3 className="text-white font-bold text-xl">Klar for analyse</h3>
              <p className="text-slate-400 text-sm mt-2">Legg inn flere bilder og kjør analyse. Resultatet lagres i Supabase når du trykker “Lagre analyse”.</p>
            </div>
          ) : (
            <div className="space-y-5 animate-in slide-in-from-right-6 duration-500">
              <div className="glass rounded-[2rem] p-6 border border-white/10">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-[#d9b657] uppercase tracking-widest flex items-center gap-2"><Award size={13} /> Sort / sikkerhet</p>
                    <h3 className="text-3xl font-bold text-white mt-1">{analysis.diagnosis.variety}</h3>
                    <p className="text-xs text-slate-500 mt-1">Sikkerhet: {confidence}% · {analysis.needsMoreImages ? 'flere bilder anbefales' : 'godt nok grunnlag'}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${analysis.diagnosis.condition === 'SUNN' ? 'bg-green-500/20 text-green-400' : analysis.diagnosis.condition === 'SYK' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {analysis.diagnosis.condition === 'SUNN' ? <CheckCircle2 size={30} /> : <AlertTriangle size={30} />}
                  </div>
                </div>
                {analysis.needsMoreImages && <div className="mt-4 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-xs text-orange-100">Mangler for bedre presisjon: {analysis.missingDetails.join(', ')}</div>}
              </div>

              <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                {(['summary', 'health', 'pruning', 'history'] as ResultTab[]).map(tab => <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest ${activeTab === tab ? 'bg-green-500 text-black' : 'text-slate-500 hover:text-white'}`}>{tab === 'summary' ? 'Kort' : tab === 'health' ? 'Helse' : tab === 'pruning' ? 'Beskjæring' : 'Historikk'}</button>)}
              </div>

              {activeTab === 'summary' && <SummaryTab analysis={analysis} />}
              {activeTab === 'health' && <HealthTab analysis={analysis} />}
              {activeTab === 'pruning' && <PruningTab plan={analysis.pruning} activeMarker={activeMarker} setActiveMarker={setActiveMarker} />}
              {activeTab === 'history' && <HistoryTab history={history} parcels={parcels} onDelete={deleteHistory} />}

              <button onClick={saveAnalysis} disabled={isSaving} className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 ${saveSuccess ? 'bg-green-500 text-black' : 'bg-[#d9b657] text-black hover:bg-[#f0cf70]'}`}>{isSaving ? <Loader2 size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />} {saveSuccess ? 'Lagret i Supabase' : 'Lagre analyse'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function SummaryTab({ analysis }: { analysis: ComprehensiveAnalysisResult }) {
  return <div className="glass rounded-[2rem] p-5 border border-white/10 space-y-4"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Viktigste tiltak nå</p><p className="text-lg text-white font-bold">{analysis.expertReport.nextKeyAction}</p><div className="grid grid-cols-2 gap-3"><Metric label="Hastegrad" value={`${analysis.expertReport.urgencyScore}/10`} /><Metric label="Foryngelse" value={analysis.expertReport.rejuvenationNeeded ? 'Ja' : 'Nei'} /><Metric label="Produksjon" value={analysis.expertReport.yieldEstimate} /><Metric label="Vanning" value={analysis.expertReport.irrigationNote} /></div></div>;
}

function HealthTab({ analysis }: { analysis: ComprehensiveAnalysisResult }) {
  return <div className="space-y-4"><div className="glass rounded-[2rem] p-5 border border-white/10"><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-3"><Leaf size={13} className="inline mr-1" /> Diagnose</p><p className="text-sm text-slate-300 leading-relaxed">{analysis.diagnosis.diagnosis}</p></div><div className="space-y-2">{analysis.diagnosis.actions.map((action, i) => <div key={action} className="flex gap-3 text-sm text-slate-300 p-3 rounded-xl bg-white/5 border border-white/5"><div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs font-bold flex-shrink-0">{i + 1}</div>{action}</div>)}</div></div>;
}

function PruningTab({ plan, activeMarker, setActiveMarker }: { plan: PruningPlan; activeMarker: number | null; setActiveMarker: (index: number | null) => void }) {
  return <div className="space-y-4"><div className="glass rounded-[2rem] p-5 border border-white/10"><p className="text-white font-bold">{plan.treeType}</p><p className="text-xs text-slate-500 mt-1">{plan.ageEstimate} · anbefalt dato {plan.recommendedDate}</p><p className="text-sm text-slate-400 mt-3">{plan.timingAdvice}</p></div>{plan.pruningSteps.length ? plan.pruningSteps.map((step, i) => <button key={`${step.area}-${i}`} onMouseEnter={() => setActiveMarker(i)} onMouseLeave={() => setActiveMarker(null)} className={`w-full text-left p-4 rounded-2xl border transition-all ${activeMarker === i ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'}`}><div className="flex justify-between"><p className="text-white font-bold"><Scissors size={14} className="inline mr-2" />{step.area}</p><span className="text-[10px] text-[#d9b657] font-bold">{step.priority}</span></div><p className="text-sm text-slate-400 mt-2">{step.action}</p></button>) : <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">AI kunne ikke markere trygge snittpunkter. Ta flere bilder før du beskjærer.</div>}<p className="text-xs text-slate-500">Verktøy: {plan.toolsNeeded.join(', ')}</p></div>;
}

function HistoryTab({ history, parcels, onDelete }: { history: PruningHistoryItem[]; parcels: Parcel[]; onDelete: (id: string) => void }) {
  return <div className="space-y-3">{history.length ? history.slice(0, 12).map(item => <div key={item.id} className="glass rounded-2xl p-4 border border-white/10 flex justify-between gap-3"><div><p className="text-white font-bold">{item.treeType || 'Analyse'}</p><p className="text-xs text-slate-500 mt-1"><History size={12} className="inline mr-1" />{new Date(item.date).toLocaleDateString('no-NO')} · {parcels.find(p => p.id === item.parcelId)?.name || 'Ingen parsell'}</p></div><button onClick={() => onDelete(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></div>) : <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500"><FileText className="mx-auto mb-2" />Ingen analyser lagret i Supabase ennå.</div>}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-white/5 border border-white/5 p-3"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-sm text-white font-bold mt-1 line-clamp-2">{value}</p></div>;
}

export default FieldConsultantView;
