
import React, { useState } from 'react';
import { 
  Users, UserPlus, UserMinus, UserCheck, TrendingUp, 
  DollarSign, Mail, Phone, Calendar, Search, Filter, 
  MoreVertical, CheckCircle, Clock, AlertCircle, Sparkles
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const mockSaaSData = [
  { month: 'Jan', active: 450, churn: 12, trials: 85 },
  { month: 'Feb', active: 520, churn: 15, trials: 92 },
  { month: 'Mar', active: 610, churn: 10, trials: 110 },
  { month: 'Apr', active: 780, churn: 18, trials: 145 },
  { month: 'May', active: 940, churn: 22, trials: 180 },
  { month: 'Jun', active: 1120, churn: 25, trials: 210 },
];

const AdminDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'users' | 'leads'>('users');

  const subscribers = [
    { id: 1, name: 'Juan Garcia', email: 'juan@biar.es', plan: 'Annual', status: 'Active', since: '15.01.2024', revenue: 92 },
    { id: 2, name: 'Maria Martinez', email: 'maria@olive.com', plan: 'Monthly', status: 'Active', since: '10.05.2024', revenue: 9 },
    { id: 3, name: 'Ole Berg', email: 'ole@norge.no', plan: 'Trial', status: 'Trialing', since: '20.06.2024', revenue: 0 },
    { id: 4, name: 'Antonio Soler', email: 'antonio@farm.es', plan: 'Monthly', status: 'Cancelled', since: '12.02.2024', revenue: 0 },
  ];

  const leads = [
    { id: 1, name: 'Gårdsselskapet AS', contact: 'Knut Gård', status: 'Hot', interest: 'Precision Pruning' },
    { id: 2, name: 'Alicante Olives S.L.', contact: 'Jose Ramos', status: 'New', interest: 'Cadastral AI' },
    { id: 3, name: 'Green Gold Co.', contact: 'Elena V.', status: 'Contacted', interest: 'IoT Irrigation' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Sparkles className="text-purple-400" /> SaaS Administrasjon
          </h2>
          <p className="text-slate-400 mt-1">Full oversikt over vekst, abonnenter og lead-oppfølging.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg">
            <UserPlus size={18} /> Manuelt abonnement
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Aktive Abonnenter', value: '1,120', icon: UserCheck, color: 'text-green-400', bg: 'bg-green-500/10' },
          { label: 'Nye Prøveperioder', value: '210', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Månedlig MRR', value: '€14,250', icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Churn Rate', value: '2.4%', icon: UserMinus, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map((stat, i) => (
          <div key={i} className="glass rounded-[2rem] p-6 border border-white/10">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon size={24} />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-bold text-white mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Growth Chart */}
        <div className="lg:col-span-2 glass rounded-[2.5rem] p-8 border border-white/10">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <TrendingUp className="text-green-400" /> Abonnementsvekst
            </h3>
            <div className="flex gap-2">
              <button className="text-[10px] font-bold px-3 py-1 bg-white/5 rounded-full text-slate-400">7D</button>
              <button className="text-[10px] font-bold px-3 py-1 bg-green-500 text-black rounded-full">30D</button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockSaaSData}>
                <defs>
                  <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#0a0a0b', border: '1px solid #333' }} />
                <Area type="monotone" dataKey="active" stroke="#a855f7" strokeWidth={3} fill="url(#colorGrowth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Section */}
        <div className="glass rounded-[2.5rem] p-8 border border-white/10">
          <h3 className="text-xl font-bold flex items-center gap-2 text-white mb-6">
            <Mail className="text-blue-400" /> Lead Oppfølging
          </h3>
          <div className="space-y-4">
            {leads.map(lead => (
              <div key={lead.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white text-sm">{lead.name}</h4>
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                    lead.status === 'Hot' ? 'bg-orange-500/20 text-orange-400' : 
                    lead.status === 'New' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {lead.status}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 flex items-center gap-1"><Users size={10} /> {lead.contact}</p>
                <div className="mt-3 flex justify-between items-center">
                  <span className="text-[9px] text-blue-400 font-mono italic">{lead.interest}</span>
                  <button className="opacity-0 group-hover:opacity-100 p-1.5 bg-blue-500/10 text-blue-400 rounded-lg transition-all">
                    <Mail size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-3 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-all">
            Vis alle leads
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass rounded-[2.5rem] border border-white/10 overflow-hidden">
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/5">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveView('users')}
              className={`text-sm font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeView === 'users' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}
            >
              Abonnenter
            </button>
            <button 
              onClick={() => setActiveView('leads')}
              className={`text-sm font-bold uppercase tracking-widest pb-1 border-b-2 transition-all ${activeView === 'leads' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}
            >
              Historikk & Churn
            </button>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input type="text" placeholder="Søk brukere..." className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-green-500/50" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            </div>
            <button className="p-2 bg-white/5 border border-white/10 rounded-xl text-slate-400"><Filter size={18} /></button>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white/5 text-[10px] text-slate-500 uppercase font-bold tracking-widest border-b border-white/10">
                <th className="px-8 py-4">Bruker</th>
                <th className="px-8 py-4">Plan</th>
                <th className="px-8 py-4">Status</th>
                <th className="px-8 py-4">Medlem siden</th>
                <th className="px-8 py-4 text-right">Lifetime Value</th>
                <th className="px-8 py-4 text-center">Handlinger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {subscribers.map(sub => (
                <tr key={sub.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center font-bold text-white text-xs">
                        {sub.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{sub.name}</p>
                        <p className="text-[10px] text-slate-500">{sub.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-bold px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-slate-300">
                      {sub.plan}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        sub.status === 'Active' ? 'bg-green-500' : 
                        sub.status === 'Trialing' ? 'bg-blue-500 animate-pulse' : 'bg-red-500'
                      }`} />
                      <span className="text-xs text-white font-medium">{sub.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-slate-500 text-xs font-mono">{sub.since}</td>
                  <td className="px-8 py-5 text-right font-bold text-white">€{sub.revenue}</td>
                  <td className="px-8 py-5 text-center">
                    <button className="p-2 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
