
import React, { useState, useEffect } from 'react';
import { 
  Droplets, Thermometer, Radio, Plus, X, Activity, Battery, 
  MapPin, Brain, Sparkles, Clock, Waves, Loader2, ArrowRight, 
  ShieldCheck, Zap, CloudSun, AlertTriangle, CheckCircle,
  RefreshCcw, AlertCircle 
} from 'lucide-react';
import { Sensor, Parcel } from '../types';
import { geminiService, IrrigationAdvice } from '../services/geminiService';
import { Language } from '../services/i18nService';

const IrrigationView: React.FC = () => {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<IrrigationAdvice | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('no');
  
  const [newSensor, setNewSensor] = useState<Partial<Sensor>>({
    type: 'Moisture',
    status: 'Online',
    parcelId: ''
  });

  const fetchAIRecommendation = async (currentSensors: Sensor[]) => {
    if (currentSensors.length === 0) return;
    setLoadingAI(true);
    try {
      // 1. Hent sanntids værvarsel
      const weatherRes = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=38.6294&longitude=-0.7667' +
        '&daily=temperature_2m_max,precipitation_sum,et0_fao_evapotranspiration&timezone=auto'
      );
      const weatherData = await weatherRes.json();
      const dailyForecast = weatherData.daily.time.map((t: string, i: number) => ({
        date: t,
        maxTemp: weatherData.daily.temperature_2m_max[i],
        rain: weatherData.daily.precipitation_sum[i],
        evap: weatherData.daily.et0_fao_evapotranspiration[i]
      }));

      // 2. Send sensorikk + vær + språk til AI
      const advice = await geminiService.getIrrigationRecommendation(currentSensors, dailyForecast, language);
      setAiAdvice(advice);
      setLastAnalysis(new Date().toLocaleString(language === 'no' ? 'no-NO' : 'en-GB'));
    } catch (error) {
      console.error("AI Decision Engine Error:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    const settings = localStorage.getItem('olivia_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      setLanguage(parsed.language || 'no');
    }

    const savedSensors = localStorage.getItem('olivia_sensors');
    const savedParcels = localStorage.getItem('olivia_parcels');
    
    if (savedParcels) setParcels(JSON.parse(savedParcels));
    if (savedSensors) {
      const parsed = JSON.parse(savedSensors);
      setSensors(parsed);
      fetchAIRecommendation(parsed);
    }
  }, []);

  const handleAddSensor = () => {
    if (!newSensor.name || !newSensor.parcelId) return;
    const sensor: Sensor = {
      ...(newSensor as Sensor),
      id: 's' + Date.now(),
      unit: newSensor.type === 'Moisture' ? '%' : '°C',
      value: (25 + Math.random() * 20).toFixed(1)
    };
    const updated = [...sensors, sensor];
    setSensors(updated);
    localStorage.setItem('olivia_sensors', JSON.stringify(updated));
    setIsModalOpen(false);
    fetchAIRecommendation(updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Waves className="text-blue-400" /> Beslutningsmotor: Vanning
          </h2>
          <p className="text-slate-400 text-sm">AI-drevet vanningsstrategi basert på sanntidsdata.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => fetchAIRecommendation(sensors)} disabled={loadingAI} className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2">
            {loadingAI ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />} Oppdater AI
          </button>
          <button onClick={() => setIsModalOpen(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2">
            <Plus size={20} /> Ny Sensor
          </button>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent p-10 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                {loadingAI ? <Loader2 className="animate-spin" size={32} /> : <Brain size={32} />}
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white tracking-tight">AI Strategi</h3>
                {lastAnalysis && <p className="text-xs text-slate-500 font-bold uppercase mt-1">Sist analysert: {lastAnalysis}</p>}
              </div>
            </div>

            {loadingAI ? (
              <div className="space-y-6 animate-pulse">
                <div className="h-12 bg-white/5 rounded-2xl w-3/4"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-24 bg-white/5 rounded-3xl"></div>
                  <div className="h-24 bg-white/5 rounded-3xl"></div>
                </div>
              </div>
            ) : aiAdvice ? (
              <div className="space-y-8">
                <div>
                  <p className="text-3xl font-bold text-white leading-tight mb-4">{aiAdvice.recommendation}</p>
                  <div className="flex flex-wrap gap-2">
                    {aiAdvice.criticalFactors.map((factor, i) => (
                      <span key={i} className="text-[10px] font-bold px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20 text-blue-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle size={10} /> {factor}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-3xl bg-black/40 border border-white/5">
                    <Waves className="text-blue-400 mb-2" size={24} />
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Vannmengde</p>
                    <p className="text-xl font-bold text-white mt-1">{aiAdvice.amount}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-black/40 border border-white/5">
                    <Clock className="text-yellow-400 mb-2" size={24} />
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Timing</p>
                    <p className="text-xl font-bold text-white mt-1">{aiAdvice.timing}</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-black/40 border border-white/5">
                    <Zap className="text-green-400 mb-2" size={24} />
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Sikkerhet</p>
                    <p className="text-xl font-bold text-white mt-1">{Math.round((aiAdvice.confidence || 0.9) * 100)}%</p>
                  </div>
                </div>
                <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20">
                  <p className="text-sm text-slate-300 leading-relaxed italic">"{aiAdvice.reasoning}"</p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-white/10 rounded-3xl">
                <p className="text-slate-500">Analyserer sensorer og værvarsel...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {sensors.map((sensor) => (
          <div key={sensor.id} className="glass rounded-3xl p-6 border border-white/10">
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 rounded-2xl bg-white/5 text-blue-400"><Droplets size={24} /></div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Aktiv</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{sensor.name}</h3>
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-6">
              <MapPin size={12} /> <span>{parcels.find(p => p.id === sensor.parcelId)?.name || 'Ukjent'}</span>
            </div>
            <div className="flex items-end gap-1 mb-6">
              <span className="text-4xl font-bold text-white tracking-tighter">{sensor.value}</span>
              <span className="text-lg text-slate-500 mb-1">{sensor.unit}</span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 text-slate-400"><Battery size={14} className="text-green-500" /> <span className="text-[10px] font-bold">84%</span></div>
              <div className="flex items-center gap-2 text-slate-400"><Radio size={14} className="text-blue-400" /> <span className="text-[10px] font-bold uppercase">LoRaWAN</span></div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-[2.5rem] p-10 border border-white/20 shadow-2xl space-y-8">
            <div className="flex justify-between items-center"><h3 className="text-2xl font-bold text-white">Installer Sensor</h3><button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400"><X size={24} /></button></div>
            <div className="space-y-6">
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Sensornavn</label><input type="text" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500/50" placeholder="F.eks. Fuktmåler Sone 1" onChange={e => setNewSensor({...newSensor, name: e.target.value})} /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Parsell</label><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none" value={newSensor.parcelId} onChange={e => setNewSensor({...newSensor, parcelId: e.target.value})}>{parcels.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</select></div>
            </div>
            <button onClick={handleAddSensor} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg">Koble til enhet</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IrrigationView;
