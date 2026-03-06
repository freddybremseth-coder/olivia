
import React, { useEffect, useState, useMemo } from 'react';
import {
  Sun, Wind, Droplets, MapPin, RefreshCcw, Waves, Zap, Loader2,
  Cloud, CloudRain, CloudLightning, Navigation, Thermometer,
  ChevronRight, CalendarDays, Clock, CloudSun, Brain, Locate,
  Layers, History, TrendingUp, AlertTriangle, Snowflake, BarChart2,
  LineChart, X
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, CartesianGrid,
  BarChart, Bar, YAxis, Legend, ComposedChart, Line, ReferenceLine
} from 'recharts';
import { Parcel, Language } from '../types';
import GlossaryText from './GlossaryText';
import { geminiService } from '../services/geminiService';
import { useTranslation } from '../services/i18nService';

type WeatherTab = 'forecast' | 'history' | 'yearly';

interface WeatherViewProps {
  initialData: any;
  initialLocationName: string;
  initialCoords: { lat: number; lon: number };
  language: Language;
}

const WeatherView: React.FC<WeatherViewProps> = ({ initialData, initialLocationName, initialCoords, language }) => {
  const { t } = useTranslation(language);
  // ... (all other state variables remain the same)
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [fullAnalysisText, setFullAnalysisText] = useState('');


  // ... (all other functions and useEffect hooks remain the same)

  const generateAIAnalysis = (weather: any, location: string): string => {
    // This is a simplified version. The real implementation would be more complex.
    // In a real scenario, this would call the Gemini API
    const summary = `Lokale forhold ved ${location} indikerer optimale sprøyteforhold i morgen tidlig rundt kl. 05:00, 83% sjanse for 11.6mm nedbør på fre...`;
    return summary;
  };

  const handleSeeFullReport = async () => {
    if (fullAnalysisText) {
      setIsAnalysisModalOpen(true);
      return;
    }
    setLoading(true);
    try {
      // This would be a more detailed call to the AI service
      const detailedReport = await geminiService.getDetailedWeatherAnalysis(weatherData, locationName, language);
      setFullAnalysisText(detailedReport);
      setIsAnalysisModalOpen(true);
    } catch (error) {
      console.error("Failed to get detailed analysis:", error);
      setFullAnalysisText(t('analysis_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (loading || !weatherData) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-green-400" size={48} />
      <p className="text-slate-500 italic">{t('fetching_real_time_data')}</p>
    </div>
  );

  const aiAnalysisText = generateAIAnalysis(weatherData, locationName);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {/* ... (rest of the JSX remains the same up to the AI analysis card) */}
      
      <div className="lg:col-span-4 space-y-6">
        {/* ... (other cards in this column) */}
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Brain size={16} /> {t('ai_microclimate_analysis')}
          </h3>
          <p className="text-sm text-slate-300 mb-5 leading-relaxed font-medium italic">"<GlossaryText text={aiAnalysisText} />"</p>
          <button 
            onClick={handleSeeFullReport}
            className="w-full text-center text-xs font-bold py-2.5 rounded-xl bg-white/5 hover:bg-green-500/10 hover:text-green-400 text-slate-400 border border-white/5 hover:border-green-500/20 transition-all flex items-center justify-center gap-1"
          >
            {t('see_full_report')} <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Analysis Modal */}
      {isAnalysisModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-2xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl space-y-6 animate-in fade-in-90 zoom-in-95">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white flex items-center gap-3"><Brain size={22} className="text-purple-400"/> AI Mikroklima-analyse</h3>
                <button onClick={() => setIsAnalysisModalOpen(false)} className="p-2 text-slate-500 hover:text-white transition-colors rounded-full">
                    <X size={24} />
                </button>
            </div>
            <div className="prose prose-invert prose-sm max-h-[60vh] overflow-y-auto pr-2">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-green-400" size={32} />
                </div>
              ) : (
                <p>{fullAnalysisText}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherView;
