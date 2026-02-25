
import React, { useState } from 'react';
import {
  LayoutDashboard, Map as MapIcon, CloudSun, Sprout, TrendingUp, Truck, Droplets,
  ClipboardList, Settings, LogOut, ShieldCheck, Sparkles, Scissors, Menu, X, ChevronLeft, ChevronRight, User,
  Activity
} from 'lucide-react';
import { UserProfile } from '../types';
import { Language, getTranslation } from '../services/i18nService';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  language: Language;
}

const Layout: React.FC<LayoutProps> = ({ children, user, activeTab, onTabChange, onLogout, language }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: getTranslation('dashboard', language) },
    { id: 'consultant', icon: Sparkles, label: getTranslation('consultant', language) },
    { id: 'pruning', icon: Scissors, label: getTranslation('pruning', language) },
    { id: 'map', icon: MapIcon, label: getTranslation('map', language) },
    { id: 'weather', icon: CloudSun, label: getTranslation('weather', language) },
    { id: 'production', icon: Sprout, label: getTranslation('production', language) },
    { id: 'economy', icon: TrendingUp, label: getTranslation('economy', language) },
    { id: 'fleet', icon: Truck, label: getTranslation('fleet', language) },
    { id: 'irrigation', icon: Droplets, label: getTranslation('irrigation', language) },
    { id: 'tasks', icon: ClipboardList, label: getTranslation('tasks', language) },
    { id: 'iot', icon: Activity, label: 'IoT Sensorer' },
  ];

  const adminItems = user.role === 'super_admin' ? [
    { id: 'admin', icon: ShieldCheck, label: getTranslation('admin', language) }
  ] : [];

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-slate-200 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/80 backdrop-blur-lg z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center font-bold text-black text-sm">O</div>
          <span className="font-bold text-white tracking-tight">Olivia AI</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/95 pt-20 px-6 overflow-y-auto">
          <div className="space-y-2">
            {[...menuItems, ...adminItems].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl font-medium transition-all ${
                  activeTab === item.id ? 'bg-green-500/10 text-green-400' : 'text-slate-500'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="pt-8 border-t border-white/10 mt-8 space-y-2">
              <button 
                onClick={() => { onTabChange('settings'); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl font-medium ${activeTab === 'settings' ? 'text-green-400' : 'text-slate-500'}`}
              >
                <Settings size={20} />
                <span>{getTranslation('settings', language)}</span>
              </button>
              <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl font-medium text-red-400">
                <LogOut size={20} />
                <span>{getTranslation('logout', language)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col border-r border-white/10 bg-[#0d0d0f] transition-all duration-300 relative ${isSidebarOpen ? 'w-72' : 'w-20'}`}>
        <div className="p-6 flex items-center gap-4 mb-4">
          <div className="min-w-[40px] h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center neon-glow-green shadow-lg">
            <span className="font-bold text-xl text-black">O</span>
          </div>
          {isSidebarOpen && <h1 className="text-xl font-bold tracking-tight text-white whitespace-nowrap overflow-hidden">Olivia <span className="text-green-400">AI</span></h1>}
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {[...menuItems, ...adminItems].map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-4 p-3.5 rounded-xl font-medium transition-all group ${
                activeTab === item.id 
                  ? 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? '' : 'group-hover:scale-110 transition-transform'} />
              {isSidebarOpen && <span className="text-sm truncate">{item.label}</span>}
              {!isSidebarOpen && (
                 <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                   {item.label}
                 </div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1 bg-black/20">
          <button 
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center gap-4 p-3.5 rounded-xl font-medium transition-all group ${
              activeTab === 'settings' ? 'text-green-400 bg-green-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            <Settings size={20} />
            {isSidebarOpen && <span className="text-sm">{getTranslation('settings', language)}</span>}
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 p-3.5 rounded-xl font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm">{getTranslation('logout', language)}</span>}
          </button>
          
          {isSidebarOpen && (
            <div className="mt-4 p-4 rounded-2xl glass bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <img src={user.avatar} className="w-10 h-10 rounded-full border border-white/20" alt="Avatar" />
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">{user.role}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-50 shadow-xl"
        >
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0a0a0b]">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 lg:mt-0 custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
