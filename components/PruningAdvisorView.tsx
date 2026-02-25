
import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, RefreshCcw, Scissors, CheckCircle2, AlertTriangle, 
  Calendar, ChevronRight, Info, Loader2, Plus, ArrowRight, Layers, Upload,
  Clock, CalendarCheck, CalendarDays, History, Trash2, Eye, MapPin, X, Sparkles, Save
} from 'lucide-react';
import { geminiService, PruningPlan } from '../services/geminiService';
import { Task, PruningHistoryItem, Parcel } from '../types';
import { Language } from '../services/i18nService';

const PruningAdvisorView: React.FC = () => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [plan, setPlan] = useState<PruningPlan | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [taskSaved, setTaskSaved] = useState(false);
  const [historySaved, setHistorySaved] = useState(false);
  const [history, setHistory] = useState<PruningHistoryItem[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<PruningHistoryItem | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState<string>('');
  const [activeMarker, setActiveMarker] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    const settings = localStorage.getItem('olivia_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setLanguage(parsed.language || 'en');
    }

    const savedHistory = localStorage.getItem('olivia_pruning_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedParcels = localStorage.getItem('olivia_parcels');
    if (savedParcels) {
      const parsed = JSON.parse(savedParcels);
      setParcels(parsed);
      if (parsed.length > 0 && !selectedParcelId) setSelectedParcelId(parsed[0].id);
    }
  };

  useEffect(() => {
    loadData();
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setError(null);
    } catch (err) { 
      console.error("Kamerafeil:", err);
      setError("Kunne ikke få tilgang til kameraet.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
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
        setCapturedImage(base64);
        stopCamera();
        analyzeImage(base64.split(',')[1]);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCapturedImage(base64);
        stopCamera();
        analyzeImage(base64.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    setPlan(null);
    setError(null);
    setScheduledDate('');
    setHistorySaved(false);
    setTaskSaved(false);
    
    try {
      const result = await geminiService.analyzePruning(base64, language);
      setPlan(result);
      if (result.recommendedDate) {
        setScheduledDate(result.recommendedDate);
      }
    } catch (err) { 
      setError("Beskjæringsanalysen feilet. Vennligst prøv et klarere bilde."); 
    }
    finally { setIsAnalyzing(false); }
  };

  const saveToHistory = () => {
    if (!plan || !capturedImage) return;

    const newItem: PruningHistoryItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      images: [capturedImage],
      treeType: plan.treeType,
      ageEstimate: plan.ageEstimate,
      plan: plan,
      parcelId: selectedParcelId,
      scheduledTime: scheduledDate
    };

    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('olivia_pruning_history', JSON.stringify(updatedHistory));
    setHistorySaved(true);
    setTimeout(() => setHistorySaved(false), 3000);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    localStorage.setItem('olivia_pruning_history', JSON.stringify(updated));
  };

  const addToCalendar = () => {
    if (!plan || !capturedImage) return;
    
    // Save to history for record keeping
    saveToHistory();

    const savedTasks = localStorage.getItem('olivia_tasks');
    const tasks: Task[] = savedTasks ? JSON.parse(savedTasks) : [];
    
    const parcelName = parcels.find(p => p.id === selectedParcelId)?.name || 'Ukjent parsell';
    
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: `Add to Calendar: Beskjæring av ${plan.treeType}`,
      priority: 'Høy',
      category: 'Vedlikehold',
      user: 'AI-Planlegger',
      status: 'TODO',
      dueDate: scheduledDate || plan.recommendedDate,
      parcelId: selectedParcelId
    };

    const updatedTasks = [...tasks, newTask];
    localStorage.setItem('olivia_tasks', JSON.stringify(updatedTasks));
    
    window.dispatchEvent(new Event('storage'));
    
    setTaskSaved(true);
    setTimeout(() => setTaskSaved(false), 4000);
  };

  const reset = () => {
    setCapturedImage(null);
    setPlan(null);
    setError(null);
    setActiveMarker(null);
    setScheduledDate('');
    setTaskSaved(false);
    setHistorySaved(false);
    startCamera();
  };

  const renderMarkers = (steps: any[]) => {
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {steps.map((step, i) => {
          const color = step.priority === 'HØY' ? '#ef4444' : step.priority === 'MIDDELS' ? '#f59e0b' : '#22c55e';
          const isActive = activeMarker === i;
          return (
            <g key={i} className="transition-all duration-300">
              <circle 
                cx={step.x} 
                cy={step.y} 
                r={isActive ? "4" : "2"} 
                fill={color} 
                fillOpacity="0.2"
                className="animate-ping"
              />
              <circle 
                cx={step.x} 
                cy={step.y} 
                r={isActive ? "6" : "3"} 
                stroke={color} 
                strokeWidth="0.5" 
                strokeDasharray="1,1" 
                fill="none" 
              />
              <circle cx={step.x} cy={step.y} r="1" fill={color} />
              {isActive && (
                <g transform={`translate(${step.x}, ${step.y - 8})`}>
                   <rect x="-15" y="-5" width="30" height="10" rx="2" fill="black" fillOpacity="0.8" />
                   <text x="0" y="2" fill="white" fontSize="4" textAnchor="middle" fontWeight="bold">
                     SNITT {i+1}
                   </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Scissors className="text-green-400" /> AI Beskjæringsekspert
          </h2>
          <p className="text-slate-400 text-sm italic">Analyser treets arkitektur og planlegg vedlikehold</p>
        </div>
        {(capturedImage || error) && (
          <button onClick={reset} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/10">
            <RefreshCcw size={16} /> Ny analyse
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden glass border border-white/10 shadow-2xl bg-black">
            {!capturedImage ? (
              <>
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 border-[2px] border-white/10 m-12 rounded-[2rem] pointer-events-none flex items-center justify-center opacity-10">
                  <Scissors size={140} className="text-white" />
                </div>
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-8">
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition-all"><Upload size={24} /></button>
                  <button onClick={capturePhoto} className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border-4 border-white flex items-center justify-center group active:scale-95 transition-all"><div className="w-14 h-14 rounded-full bg-white group-hover:bg-green-400 transition-colors"></div></button>
                  <div className="w-14 h-14"></div>
                </div>
              </>
            ) : (
              <div className="relative w-full h-full">
                <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                {plan && renderMarkers(plan.pruningSteps)}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-lg flex flex-col items-center justify-center space-y-6">
                    <Loader2 className="animate-spin text-green-400" size={48} />
                    <p className="text-white font-bold tracking-widest uppercase text-xs">Mapper snittpunkter...</p>
                  </div>
                )}
                {plan && (
                  <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                    <Sparkles size={12} className="text-yellow-400" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Markører aktivisert</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {!capturedImage && (
            <div className="glass rounded-2xl p-4 border border-white/5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Tilknytt Parsell</label>
              <select 
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                value={selectedParcelId}
                onChange={e => setSelectedParcelId(e.target.value)}
              >
                {parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-6 overflow-y-auto max-h-[80vh] pr-2 custom-scrollbar">
          {plan ? (
            <div className="space-y-6 animate-in slide-in-from-right-6 duration-700">
              <div className="glass rounded-3xl p-6 border border-white/10 bg-gradient-to-br from-green-500/5 to-transparent">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">{plan.treeType}</h3>
                    <p className="text-green-400 text-xs font-bold uppercase tracking-widest mt-1">Estimert alder: {plan.ageEstimate}</p>
                  </div>
                  <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                    <Scissors size={28} className="text-green-400" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
                     <CalendarCheck size={20} className="text-blue-400" />
                     <div>
                       <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Anbefalt av AI</p>
                       <p className="text-xs font-bold text-white">{new Date(plan.recommendedDate).toLocaleDateString('no-NO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                     <Clock size={20} className="text-slate-400" />
                     <div className="flex-1">
                       <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Planlegg tidspunkt</p>
                       <input 
                        type="datetime-local" 
                        className="w-full bg-transparent text-xs text-white focus:outline-none"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                       />
                     </div>
                  </div>
                </div>
              </div>

              <div className="glass rounded-3xl p-6 border border-white/10">
                <h4 className="text-sm font-bold text-white mb-6 flex items-center justify-between">
                   <div className="flex items-center gap-2"><Layers size={16} className="text-slate-400" /> Handlingsplan</div>
                   <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Hold over for å se punkt</span>
                </h4>
                <div className="space-y-3">
                  {plan.pruningSteps.map((step, i) => (
                    <div 
                      key={i} 
                      onMouseEnter={() => setActiveMarker(i)}
                      onMouseLeave={() => setActiveMarker(null)}
                      className={`p-4 rounded-2xl border transition-all flex gap-4 cursor-pointer ${
                        activeMarker === i ? 'bg-green-500/10 border-green-500/40' : 'bg-white/5 border-white/5 hover:border-white/20'
                      }`}
                    >
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                         step.priority === 'HØY' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 
                         step.priority === 'MIDDELS' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                         'bg-green-500/20 text-green-400 border border-green-500/20'
                       }`}>
                         {i + 1}
                       </div>
                       <div className="flex-1">
                         <div className="flex justify-between items-center mb-1">
                           <p className="text-xs font-bold text-white uppercase tracking-tighter">{step.area}</p>
                           {step.priority === 'HØY' && <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">KRITISK</span>}
                         </div>
                         <p className="text-sm text-slate-400 leading-relaxed">{step.action}</p>
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={saveToHistory}
                  disabled={historySaved}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    historySaved 
                      ? 'bg-blue-500 text-white shadow-lg' 
                      : 'bg-white/5 hover:bg-white/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {historySaved ? <CheckCircle2 size={20} /> : <Save size={20} />}
                  <span>{historySaved ? 'Arkivert' : 'Kun arkiver'}</span>
                </button>
                <button 
                  onClick={addToCalendar}
                  disabled={taskSaved}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                    taskSaved 
                      ? 'bg-green-500 text-black shadow-lg' 
                      : 'bg-green-500 hover:bg-green-400 text-black shadow-2xl shadow-green-500/20'
                  }`}
                >
                  {taskSaved ? <CheckCircle2 size={20} /> : <CalendarDays size={20} />}
                  <span>{taskSaved ? 'Planlagt i kalender' : 'Add to Calendar'}</span>
                </button>
              </div>
              
              <p className="text-[10px] text-center text-slate-500 uppercase tracking-widest font-bold">
                Bilder og metadata lagres automatisk i arkivet ved lagring.
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-12 glass rounded-[3rem] border border-dashed border-white/10">
               <Scissors size={48} className="text-slate-600 mb-8 animate-pulse" />
               <h3 className="text-xl font-bold text-slate-400">Klar for analyse</h3>
               <p className="text-sm text-slate-500 mt-3 max-w-xs leading-relaxed">
                 Ta et bilde for å få en visualisert beskjæringsplan og arkivere metadata med bilde.
               </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 pt-12 border-t border-white/10">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <History className="text-blue-400" /> Arkiverte analyser
        </h3>
        {history.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {history.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedHistoryItem(item)}
                className="glass rounded-2xl overflow-hidden border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group"
              >
                <div className="relative aspect-video">
                  <img src={item.images[0]} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" alt="Tree" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                        {item.scheduledTime ? `PLANLAGT: ${new Date(item.scheduledTime).toLocaleDateString('no-NO')}` : new Date(item.date).toLocaleDateString('no-NO')}
                      </p>
                      <p className="text-sm font-bold text-white truncate">{item.treeType}</p>
                    </div>
                    <button onClick={(e) => deleteHistoryItem(item.id, e)} className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500 italic text-sm text-center py-10">Ingen historikk ennå.</p>
        )}
      </div>

      {selectedHistoryItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="glass w-full max-w-5xl rounded-[2.5rem] border border-white/20 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            <div className="md:w-1/2 relative bg-black">
              <img src={selectedHistoryItem.images[0]} className="w-full h-full object-contain" alt="Analysis" />
              {selectedHistoryItem.plan && renderMarkers(selectedHistoryItem.plan.pruningSteps)}
            </div>
            <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto custom-scrollbar space-y-8 bg-black/40">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-3xl font-bold text-white">{selectedHistoryItem.treeType}</h3>
                  <p className="text-slate-500 text-sm mt-1">Analysert {new Date(selectedHistoryItem.date).toLocaleString('no-NO')}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedHistoryItem.scheduledTime && (
                      <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-1 rounded-full text-blue-400 border border-blue-500/20">
                        <Clock size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Planlagt: {new Date(selectedHistoryItem.scheduledTime).toLocaleDateString('no-NO')}</span>
                      </div>
                    )}
                    {selectedHistoryItem.parcelId && (
                      <div className="flex items-center gap-2 bg-green-500/10 px-3 py-1 rounded-full text-green-400 border border-green-500/20">
                        <MapPin size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{parcels.find(p => p.id === selectedHistoryItem.parcelId)?.name || 'Parsell'}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedHistoryItem(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={28} className="text-slate-500" /></button>
              </div>
              
              <div className="space-y-4">
                 <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Planlagte Snitt</h4>
                 <div className="space-y-2">
                   {selectedHistoryItem.plan && selectedHistoryItem.plan.pruningSteps.map((step, idx) => (
                     <div key={idx} className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                        <div>
                          <p className="text-xs font-bold text-white">{step.area}</p>
                          <p className="text-[11px] text-slate-400">{step.action}</p>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>

              <button onClick={() => setSelectedHistoryItem(null)} className="w-full py-4 bg-white/10 rounded-2xl font-bold text-white">Lukk arkiv</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        @keyframes ping { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(3); opacity: 0; } }
        .animate-ping { animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};

export default PruningAdvisorView;
