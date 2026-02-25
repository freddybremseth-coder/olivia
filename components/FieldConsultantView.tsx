
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Camera, RefreshCcw, Sparkles, CheckCircle2, AlertTriangle, 
  AlertCircle, ChevronRight, Sprout, Bug, Info, Loader2, X, Upload,
  Scissors, Search, Calendar, Plus, Layers, ArrowRight, History, Trash2, Clock,
  Target, Tag, Award, Image as ImageIcon, ScanEye, Plane, Thermometer, Waves, Zap,
  Save, ArrowUpDown, MapPin, Filter
} from 'lucide-react';
import { geminiService, ComprehensiveAnalysisResult, DroneAnalysisResult } from '../services/geminiService';
import { Task, PruningHistoryItem, Parcel } from '../types';
import { Language } from '../services/i18nService';
import GlossaryText from './GlossaryText';

type ResultTab = 'health' | 'pruning' | 'drone';
type SortKey = 'date' | 'parcel' | 'type';

const FieldConsultantView: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDroneAnalyzing, setIsDroneAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ComprehensiveAnalysisResult | null>(null);
  const [droneResult, setDroneResult] = useState<DroneAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>('health');
  const [activeMarker, setActiveMarker] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('no');
  const [showCamera, setShowCamera] = useState(true);
  
  // History states
  const [history, setHistory] = useState<PruningHistoryItem[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PruningHistoryItem | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const settings = localStorage.getItem('olivia_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setLanguage(parsed.language || 'no');
    }

    const savedHistory = localStorage.getItem('olivia_consultant_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedParcels = localStorage.getItem('olivia_parcels');
    if (savedParcels) {
      const parsed = JSON.parse(savedParcels);
      setParcels(parsed);
      if (parsed.length > 0) setSelectedParcelId(parsed[0].id);
    }
    
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      setError("Kunne ikke starte kamera. Sjekk tillatelser.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8);
        setImages(prev => [...prev, base64]);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const runAnalysis = async () => {
    if (images.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    setDroneResult(null);
    
    try {
      const base64List = images.map(img => img.split(',')[1]);
      const result = await geminiService.analyzeComprehensive(base64List, language);
      setAnalysisResult(result);
      setShowCamera(false);
      stopCamera();
    } catch (err) {
      setError("AI-analysen feilet. Vennligst prøv klarere bilder.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveAnalysis = () => {
    if (!analysisResult || images.length === 0) return;

    try {
      const newItem: PruningHistoryItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        images: [images[0]], 
        treeType: analysisResult.diagnosis?.variety || 'Ukjent sort',
        ageEstimate: analysisResult.pruning?.ageEstimate || 'Ukjent alder',
        analysis: {
          diagnosis: analysisResult.diagnosis,
          pruning: analysisResult.pruning,
          varietyConfidence: analysisResult.varietyConfidence || 0,
          needsMoreImages: analysisResult.needsMoreImages || false,
          missingDetails: analysisResult.missingDetails || []
        },
        parcelId: selectedParcelId
      };

      const updatedHistory = [newItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('olivia_consultant_history', JSON.stringify(updatedHistory));
      
      // Send varsel til andre komponenter
      window.dispatchEvent(new Event('storage'));
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Save error:", err);
      alert("Kunne ikke lagre analysen. Sjekk konsollen for detaljer.");
    }
  };

  const runDroneAnalysis = async () => {
    if (images.length === 0) return;
    setIsDroneAnalyzing(true);
    setError(null);
    
    try {
      const base64List = images.map(img => img.split(',')[1]);
      const result = await geminiService.analyzeDrone(base64List, language);
      setDroneResult(result);
      setActiveTab('drone');
    } catch (err) {
      setError("Drone-analysen feilet.");
    } finally {
      setIsDroneAnalyzing(false);
    }
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Slette denne analysen fra historikken?")) return;
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('olivia_consultant_history', JSON.stringify(updated));
  };

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortKey === 'parcel') {
        const pA = parcels.find(p => p.id === a.parcelId)?.name || '';
        const pB = parcels.find(p => p.id === b.parcelId)?.name || '';
        comparison = pA.localeCompare(pB);
      } else if (sortKey === 'type') {
        comparison = (a.treeType || '').localeCompare(b.treeType || '');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [history, sortKey, sortOrder, parcels]);

  const reset = () => {
    setImages([]);
    setAnalysisResult(null);
    setDroneResult(null);
    setError(null);
    setShowCamera(true);
    startCamera();
  };

  const renderPruningMarkers = (steps: any[]) => {
    if (!steps) return null;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {steps.map((step, i) => {
          const color = step.priority === 'HØY' ? '#ef4444' : step.priority === 'MIDDELS' ? '#f59e0b' : '#22c55e';
          const isActive = activeMarker === i;
          return (
            <g key={i} className="transition-all duration-300">
              <circle cx={step.x} cy={step.y} r={isActive ? "4" : "2"} fill={color} fillOpacity="0.3" className={isActive ? "animate-ping" : ""} />
              <circle cx={step.x} cy={step.y} r={isActive ? "6" : "3"} stroke={color} strokeWidth="1" fill="none" />
              <circle cx={step.x} cy={step.y} r="1.5" fill={color} />
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="text-green-400" /> AI Feltkonsulent
          </h2>
          <p className="text-slate-400 text-sm">Alt-i-ett diagnose og beskjæringsekspert.</p>
        </div>
        
        {analysisResult && (
          <div className="flex items-center gap-3">
             <button 
                onClick={saveAnalysis}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold transition-all border shadow-lg ${saveSuccess ? 'bg-green-500 text-black border-green-500' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}
             >
               {saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />} 
               {saveSuccess ? 'Lagret i arkiv' : 'Lagre analyse'}
             </button>
             {!droneResult && (
               <button 
                 onClick={runDroneAnalysis} 
                 disabled={isDroneAnalyzing}
                 className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 px-6 py-3 rounded-2xl text-xs font-bold transition-all border border-blue-500/20 text-blue-400"
               >
                 {isDroneAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Plane size={16} />} 
                 {isDroneAnalyzing ? 'Kjører drone...' : 'Drone-analyse'}
               </button>
             )}
             <button onClick={reset} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-3 rounded-2xl text-xs font-bold transition-all border border-white/10">
               <RefreshCcw size={16} /> Ny
             </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Camera & Multi-Image Capture */}
        <div className="space-y-6">
          {showCamera ? (
            <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden glass border border-white/10 shadow-2xl bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" />
              
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-8">
                <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all">
                  <Upload size={24} />
                </button>
                <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border-4 border-white flex items-center justify-center group active:scale-95 transition-all">
                  <div className="w-14 h-14 rounded-full bg-white group-hover:bg-green-400 transition-colors"></div>
                </button>
                <div className="w-14 h-14" />
              </div>
            </div>
          ) : (
            <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden glass border border-white/10 shadow-2xl bg-black">
              <img src={images[0]} className="w-full h-full object-cover" alt="Main result" />
              {activeTab === 'pruning' && analysisResult?.pruning && renderPruningMarkers(analysisResult.pruning.pruningSteps)}
              {activeTab === 'drone' && droneResult && (
                <div className="absolute inset-0 bg-blue-500/10 pointer-events-none flex items-center justify-center">
                  <div className="w-[80%] h-[80%] border-2 border-blue-400/30 border-dashed rounded-full animate-[spin_10s_linear_infinite]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 opacity-20">
                    <ScanEye size={120} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filmstrip / Gallery */}
          <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar min-h-[100px]">
            {images.map((img, i) => (
              <div key={i} className="relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border border-white/10 group">
                <img src={img} className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          
          <div className="glass rounded-2xl p-4 border border-white/5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Parsell for analyse</label>
            <select 
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
              value={selectedParcelId}
              onChange={e => setSelectedParcelId(e.target.value)}
            >
              {parcels.length > 0 ? parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">Ingen parseller funnet</option>}
            </select>
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Right Side: Analysis Results */}
        <div className="space-y-6 overflow-y-auto max-h-[80vh] custom-scrollbar pr-2">
          {isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center space-y-6 glass rounded-[3rem] p-12">
               <Loader2 className="animate-spin text-green-400" size={48} />
               <div className="text-center">
                 <h3 className="text-lg font-bold text-white uppercase tracking-widest">Kjører dyp analyse...</h3>
                 <p className="text-slate-500 text-sm italic mt-2">Vurderer helse, sort og arkitektonisk struktur basert på {images.length} bilder.</p>
               </div>
            </div>
          )}

          {analysisResult && (
            <div className="animate-in slide-in-from-right-6 duration-700 space-y-6">
              {/* Variety/Sort Card */}
              <div className="glass p-6 rounded-[2rem] border border-white/10 bg-white/5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Award size={14} className="text-yellow-400" />
                      <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">Sort-Identifisering</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{analysisResult.diagnosis?.variety || 'Ukjent sort'}</h3>
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Sikkerhet: {Math.round((analysisResult.varietyConfidence || 0) * 100)}%</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${analysisResult.diagnosis?.condition === 'SUNN' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {analysisResult.diagnosis?.condition === 'SUNN' ? <CheckCircle2 size={32} /> : <AlertTriangle size={32} />}
                  </div>
                </div>

                {analysisResult.needsMoreImages && (
                  <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-200 text-xs flex gap-3">
                    <Info size={20} className="shrink-0" />
                    <div>
                      <p className="font-bold uppercase tracking-widest text-[10px] mb-1 text-orange-400">Usikkerhet observert</p>
                      <p className="opacity-80 italic">For 100% sikkerhet trengs: {analysisResult.missingDetails?.join(", ") || 'flere bilder'}.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tab Selector */}
              <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                <button 
                  onClick={() => setActiveTab('health')}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'health' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                  <Search size={14} className="inline mr-2" /> Helse
                </button>
                <button 
                  onClick={() => setActiveTab('pruning')}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'pruning' ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                  <Scissors size={14} className="inline mr-2" /> Beskjæring
                </button>
                {droneResult && (
                  <button 
                    onClick={() => setActiveTab('drone')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'drone' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                  >
                    <Plane size={14} className="inline mr-2" /> Drone
                  </button>
                )}
              </div>

              {activeTab === 'health' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="p-6 rounded-[2rem] glass border border-white/10 space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Bug size={14} className="text-orange-400" /> Patologisk Vurdering
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed italic">"{analysisResult.diagnosis?.diagnosis || 'Ingen diagnose tilgjengelig.'}"</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Anbefalte Tiltak</h4>
                      {analysisResult.diagnosis?.actions?.map((action, i) => (
                        <div key={i} className="flex gap-4 text-sm text-slate-300 p-4 rounded-2xl bg-white/5 border border-white/5">
                          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-[10px] font-bold flex-shrink-0 mt-0.5">{i+1}</div>
                          {action}
                        </div>
                      )) || <p className="text-xs text-slate-500 px-2 italic">Ingen spesifikke tiltak funnet.</p>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pruning' && analysisResult.pruning && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="glass rounded-[2rem] p-6 border border-white/10 space-y-6">
                    <div className="flex justify-between items-center">
                       <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Arkitektoniske Snitt</h4>
                       <span className="text-[10px] font-bold text-blue-400">Status: {analysisResult.pruning.ageEstimate}</span>
                    </div>
                    <div className="space-y-3">
                      {analysisResult.pruning.pruningSteps?.map((step, i) => (
                        <div 
                          key={i} 
                          onMouseEnter={() => setActiveMarker(i)}
                          onMouseLeave={() => setActiveMarker(null)}
                          className={`p-4 rounded-2xl border transition-all flex gap-4 cursor-pointer ${
                            activeMarker === i ? 'bg-green-500/10 border-green-500/40 translate-x-1' : 'bg-black/40 border-white/5'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                            step.priority === 'HØY' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-green-500/20 text-green-400 border border-green-500/20'
                          }`}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">{step.area}</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{step.action}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'drone' && droneResult && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="glass p-4 rounded-2xl border border-white/10 bg-blue-500/5">
                      <div className="flex items-center gap-2 mb-2 text-blue-400">
                        <Layers size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">NDVI Indeks</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{(droneResult.ndviSimulated * 1.0).toFixed(2)}</p>
                    </div>
                    <div className="glass p-4 rounded-2xl border border-white/10 bg-red-500/5">
                      <div className="flex items-center gap-2 mb-2 text-red-400">
                        <Waves size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Vannstress</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{droneResult.waterStressLevel}</p>
                    </div>
                  </div>
                  <div className="glass p-6 rounded-[2.5rem] border border-blue-500/20 bg-blue-500/5">
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Zap size={14} /> Drone-oppsummering
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed italic">
                      <GlossaryText text={droneResult.aerialSummary} />
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isAnalyzing && !analysisResult && !error && (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 glass rounded-[3rem] border border-dashed border-white/10">
               {images.length > 0 ? (
                 <div className="space-y-8 animate-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center text-green-400 mx-auto border border-green-500/20 neon-glow-green">
                      <ImageIcon size={48} />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-white tracking-tight">Klar for analyse</h3>
                      <p className="text-sm text-slate-400 italic max-w-xs mx-auto">
                        Du har lastet opp {images.length} {images.length === 1 ? 'bilde' : 'bilder'}.
                      </p>
                    </div>
                    <button 
                      onClick={runAnalysis}
                      className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-3 text-xl transition-all active:scale-95 group overflow-hidden"
                    >
                      <Sparkles size={24} className="group-hover:rotate-12 transition-transform" />
                      Start Analyse
                      <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                 </div>
               ) : (
                 <>
                   <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-slate-500 mb-6 mx-auto">
                     <ScanEye size={40} />
                   </div>
                   <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Klar for felt-analyse</h3>
                   <p className="text-sm text-slate-500 mt-4 max-w-xs leading-relaxed italic mx-auto">
                     Ta bilder av blader, struktur og frukt. AI-en gir deg en komplett helse- og beskjæringsrapport.
                   </p>
                 </>
               )}
            </div>
          )}

          {error && (
            <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-4 animate-in slide-in-from-top-4">
              <AlertTriangle size={32} />
              <div>
                <p className="text-sm font-bold uppercase tracking-widest mb-1">Analyse Feilet</p>
                <p className="text-xs opacity-80 leading-relaxed">{error}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-6 pt-12 border-t border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="text-blue-400" /> Arkiverte analyser
          </h3>
          <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/10">
            {(['date', 'parcel', 'type'] as SortKey[]).map((key) => (
              <button 
                key={key}
                onClick={() => setSortKey(key)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${sortKey === key ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                {key === 'date' ? 'Dato' : key === 'parcel' ? 'Parsell' : 'Sort'}
              </button>
            ))}
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-2 text-slate-400 hover:text-white transition-all"
            >
              <ArrowUpDown size={16} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
            </button>
          </div>
        </div>

        {sortedHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedHistory.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedHistoryItem(item)}
                className="glass rounded-[2rem] overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group"
              >
                <div className="relative aspect-video">
                  <img src={item.images[0]} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt="Tree" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <button onClick={(e) => deleteHistoryItem(item.id, e)} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all shadow-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em]">{new Date(item.date).toLocaleDateString('no-NO')}</span>
                      <div className="flex items-center gap-1.5 bg-green-500/20 px-2 py-0.5 rounded-full border border-green-500/20">
                        <MapPin size={10} className="text-green-400" />
                        <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">{parcels.find(p => p.id === item.parcelId)?.name || 'Ukjent'}</span>
                      </div>
                    </div>
                    <h4 className="text-lg font-bold text-white truncate">{item.treeType}</h4>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 glass rounded-[3rem] border border-dashed border-white/10 text-center">
            <Clock className="mx-auto text-slate-600 mb-4" size={40} />
            <p className="text-slate-500 italic text-sm">Ingen historikk ennå.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass w-full max-w-6xl h-[90vh] rounded-[3rem] border border-white/20 shadow-2xl overflow-hidden flex flex-col md:flex-row">
            <div className="md:w-1/2 relative bg-black flex items-center justify-center">
              <img src={selectedHistoryItem.images[0]} className="w-full h-full object-contain" alt="Archive" />
              {selectedHistoryItem.analysis?.pruning && renderPruningMarkers(selectedHistoryItem.analysis.pruning.pruningSteps)}
              <button onClick={() => setSelectedHistoryItem(null)} className="absolute top-6 left-6 p-4 bg-black/60 rounded-full text-white md:hidden shadow-lg"><X size={24} /></button>
            </div>
            <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto custom-scrollbar space-y-10 bg-gradient-to-br from-white/[0.02] to-transparent">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-4xl font-bold text-white tracking-tight">{selectedHistoryItem.treeType}</h3>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{new Date(selectedHistoryItem.date).toLocaleString('no-NO')}</span>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin size={14} className="text-green-500" />
                      <span className="text-xs font-bold uppercase tracking-widest">{parcels.find(p => p.id === selectedHistoryItem.parcelId)?.name || 'Parsell'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedHistoryItem(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all hidden md:block border border-transparent hover:border-white/10">
                  <X size={32} className="text-slate-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="p-6 rounded-[2rem] glass border border-white/10 space-y-4">
                   <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Diagnose</h4>
                   <p className="text-sm text-slate-300 italic">"{selectedHistoryItem.analysis?.diagnosis?.diagnosis || 'Ingen data.'}"</p>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Planlagte tiltak</h4>
                   <div className="space-y-2">
                     {selectedHistoryItem.analysis?.pruning?.pruningSteps?.map((step, idx) => (
                       <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4">
                          <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                          <div>
                            <p className="text-xs font-bold text-white uppercase tracking-widest">{step.area}</p>
                            <p className="text-[11px] text-slate-400">{step.action}</p>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>

              <button onClick={() => setSelectedHistoryItem(null)} className="w-full py-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl font-bold text-white transition-all uppercase tracking-widest text-xs">Lukk Arkiv</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default FieldConsultantView;
