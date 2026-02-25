
import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Zap, 
  Droplets, 
  Sprout, 
  TrendingUp, 
  AlertCircle,
  Wind,
  Thermometer,
  Brain,
  RefreshCcw
} from 'lucide-react';
import { geminiService, FarmInsight } from '../services/geminiService';
import { Language, getTranslation } from '../services/i18nService';
import GlossaryText from './GlossaryText';

interface DashboardProps {
  language: Language;
}

const mockEconomicData = [
  { month: 'Jan', revenue: 4500, cost: 3200 },
  { month: 'Feb', revenue: 5200, cost: 3400 },
  { month: 'Mar', revenue: 4800, cost: 3100 },
  { month: 'Apr', revenue: 6100, cost: 3800 },
  { month: 'May', revenue: 5900, cost: 4000 },
  { month: 'Jun', revenue: 7200, cost: 4200 },
];

const mockHarvestData = [
  { parcel: 'Nord', weight: 1200 },
  { parcel: 'Sør', weight: 850 },
  { parcel: 'Øst', weight: 1500 },
  { parcel: 'Vest', weight: 600 },
];

const Dashboard: React.FC<DashboardProps> = ({ language }) => {
  const [insights, setInsights] = useState<FarmInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const data = await geminiService.getFarmInsights(
        { temp: 28, rain: 2 }, 
        { moisture: 45 }, 
        language,
        'Biar, Alicante, ES'
      );
      setInsights(data);
    } catch (err) {
      console.error("Dashboard Insights Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [language]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: getTranslation('total_yield', language), value: '45,2 t', change: '+12%', icon: Sprout, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: getTranslation('water_usage', language), value: '1,2k m³', change: '-5%', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: getTranslation('operating_cost', language), value: '€12 400', change: '+2%', icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: getTranslation('iot_sensors', language), value: '24 Aktive', change: '100%', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-3xl p-6 border border-white/10 hover:border-white/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
            <h3 className="text-2xl font-bold text-white mt-1 group-hover:scale-105 transition-transform origin-left">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass rounded-3xl p-8 border border-white/10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp size={20} className="text-green-400" />
                {getTranslation('economic_analysis', language)}
              </h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockEconomicData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#22c55e" fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="cost" stroke="#ef4444" fillOpacity={1} fill="url(#colorCost)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass rounded-3xl p-6 border border-white/10 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                 <Wind size={80} className="text-white" />
               </div>
               <div className="relative z-10 space-y-4">
                 <h4 className="text-slate-400 font-medium">Biar, Spania • {getTranslation('weather_now', language)}</h4>
                 <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                     <Thermometer className="text-yellow-400" size={32} />
                     <span className="text-4xl font-bold">28°C</span>
                   </div>
                   <div className="h-10 w-px bg-white/10"></div>
                   <div className="space-y-1">
                     <p className="text-xs text-slate-500 uppercase tracking-widest">{getTranslation('humidity', language)}</p>
                     <p className="text-sm font-bold text-green-400">{getTranslation('perfect_spraying', language)}</p>
                   </div>
                 </div>
               </div>
            </div>

            <div className="glass rounded-3xl p-6 border border-white/10">
              <h4 className="text-slate-400 font-medium mb-4 uppercase text-xs tracking-widest">{getTranslation('harvest_per_sector', language)}</h4>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockHarvestData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="parcel" type="category" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Bar dataKey="weight" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight Sidebar */}
        <div className="space-y-6">
          <div className="glass rounded-3xl p-8 border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.1)] relative">
            <div className="absolute top-4 right-4 animate-pulse">
               <Brain size={24} className="text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              {getTranslation('ai_intelligence', language)}
            </h3>
            
            <div className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-2xl"></div>)}
                </div>
              ) : (
                insights.map((insight, i) => (
                  <div key={insight.id || i} className="flex gap-4 group">
                    <div className="w-1.5 h-auto bg-green-500 rounded-full group-hover:scale-y-110 transition-transform"></div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-green-400 uppercase tracking-tighter mb-0.5">{insight.tittel}</p>
                      <p className="text-sm text-slate-300 leading-relaxed italic">
                        "<GlossaryText text={insight.beskrivelse} />"
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button onClick={fetchInsights} disabled={loading} className="w-full mt-8 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-green-400 hover:bg-green-500/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
              {loading ? <RefreshCcw size={14} className="animate-spin" /> : <Brain size={14} />} {getTranslation('update_analysis', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
