import React, { useState } from 'react';
import {
  LayoutDashboard, Map as MapIcon, CloudSun, Sprout, TrendingUp, Truck, Droplets,
  ClipboardList, Settings, LogOut, ShieldCheck, Sparkles, Scissors, Menu, X, ChevronLeft, ChevronRight,
  Activity, Store, Leaf, BarChart3, Gauge, MapPin, Clock, FlaskConical, MapPinned, CalendarDays, PackageCheck, FileCheck2, FileText, QrCode, ScrollText, Ruler, ShoppingBag, ReceiptText, ChevronDown
} from 'lucide-react';
import { UserProfile } from '../types';
import { useTranslation } from '../services/i18nService';
import { Language } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  language: Language;
}

type MenuItem = { id: string; icon: React.ElementType; label: string };
type MenuGroup = { id: string; label: string; icon: React.ElementType; items: MenuItem[] };

const Layout: React.FC<LayoutProps> = ({ children, user, activeTab, onTabChange, onLogout, language }) => {
  const { t } = useTranslation(language);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    main: true,
    field: true,
    water: true,
    production: false,
    commerce: false,
    reports: false,
  });

  const menuGroups: MenuGroup[] = [
    {
      id: 'main',
      label: 'Hovedoversikt',
      icon: LayoutDashboard,
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard') },
        { id: 'dona_anna_daily', icon: Leaf, label: 'DonaAnna Daily' },
        { id: 'farm_advisor', icon: Sparkles, label: 'Olivia Advisor' },
      ],
    },
    {
      id: 'field',
      label: 'Gård og felt',
      icon: MapPinned,
      items: [
        { id: 'map', icon: MapIcon, label: t('map') },
        { id: 'property_documents', icon: ShieldCheck, label: 'Eierskapsdokumenter' },
        { id: 'zone_status', icon: MapPinned, label: 'Sonekart' },
        { id: 'field_observations', icon: MapPin, label: 'Feltlogg' },
        { id: 'consultant', icon: Sparkles, label: t('consultant') },
        { id: 'pruning', icon: Scissors, label: t('pruning') },
      ],
    },
    {
      id: 'water',
      label: 'Vanning, IoT og klima',
      icon: Droplets,
      items: [
        { id: 'weather', icon: CloudSun, label: t('weather') },
        { id: 'climate_stats', icon: BarChart3, label: 'Klima Stats' },
        { id: 'iot', icon: Activity, label: t('iot_sensors_menu') },
        { id: 'irrigation', icon: Droplets, label: t('irrigation') },
        { id: 'irrigation_advisor', icon: Gauge, label: 'Vannråd 2.0' },
        { id: 'irrigation_log', icon: Clock, label: 'Vanningslogg' },
        { id: 'salinity', icon: FlaskConical, label: 'Salt / pH' },
      ],
    },
    {
      id: 'production',
      label: 'Produksjon og sporbarhet',
      icon: PackageCheck,
      items: [
        { id: 'production', icon: Sprout, label: t('production') },
        { id: 'harvest_planner', icon: CalendarDays, label: 'Høsteplan' },
        { id: 'traceability_batches', icon: PackageCheck, label: 'Batch / QR' },
        { id: 'label_qr', icon: QrCode, label: 'QR / etikett' },
        { id: 'professional_label', icon: ScrollText, label: 'EU etikett' },
        { id: 'print_labels', icon: Ruler, label: 'Trykkmaler' },
      ],
    },
    {
      id: 'commerce',
      label: 'Salg og commerce',
      icon: Store,
      items: [
        { id: 'commerce', icon: Store, label: 'B2B & Commerce' },
        { id: 'sales_inventory', icon: ShoppingBag, label: 'Salg / lager' },
        { id: 'order_documents', icon: ReceiptText, label: 'Ordredokumenter' },
        { id: 'economy', icon: TrendingUp, label: t('economy') },
      ],
    },
    {
      id: 'reports',
      label: 'Oppgaver, støtte og rapport',
      icon: ClipboardList,
      items: [
        { id: 'organic_certification', icon: FileCheck2, label: 'Øko / støtte' },
        { id: 'auto_tasks', icon: Sparkles, label: 'Auto-oppgaver' },
        { id: 'season_report', icon: FileText, label: 'Sesongrapport' },
        { id: 'tasks', icon: ClipboardList, label: t('tasks') },
        { id: 'fleet', icon: Truck, label: t('fleet') },
      ],
    },
  ];

  const adminItems: MenuItem[] = user.role === 'super_admin' ? [
    { id: 'admin', icon: ShieldCheck, label: t('admin') }
  ] : [];

  const toggleGroup = (groupId: string) => setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));

  const renderMenuItem = (item: MenuItem, isMobile: boolean) => (
    <button
      key={item.id}
      onClick={() => {
        onTabChange(item.id);
        if (isMobile) setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-4 p-${isMobile ? '4' : '3'} rounded-xl font-medium transition-all group ${
        activeTab === item.id
          ? isMobile
            ? 'bg-green-500/10 text-green-400'
            : 'bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]'
          : `text-slate-500 hover:text-slate-300 ${!isMobile && 'hover:bg-white/5'}`
      }`}
    >
      <item.icon size={18} className={activeTab === item.id ? '' : 'group-hover:scale-110 transition-transform'} />
      { (isSidebarOpen || isMobile) && <span className="text-sm truncate">{item.label}</span>}
      {!isSidebarOpen && !isMobile && (
        <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
          {item.label}
        </div>
      )}
    </button>
  );

  const renderGroup = (group: MenuGroup, isMobile: boolean) => {
    const isOpen = openGroups[group.id] || !isSidebarOpen || isMobile;
    const hasActive = group.items.some(item => item.id === activeTab);
    return (
      <div key={group.id} className="space-y-1">
        {(isSidebarOpen || isMobile) ? (
          <button
            onClick={() => toggleGroup(group.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${hasActive ? 'text-green-400 bg-green-500/5' : 'text-slate-600 hover:text-slate-400'}`}
          >
            <span className="flex items-center gap-2"><group.icon size={13} /> {group.label}</span>
            <ChevronDown size={13} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        ) : null}
        {isOpen && <div className={`${isSidebarOpen || isMobile ? 'space-y-1' : 'space-y-1'}`}>{group.items.map(item => renderMenuItem(item, isMobile))}</div>}
      </div>
    );
  };

  const menuContent = (isMobile: boolean) => (
    <div className="space-y-3">
      {menuGroups.map(group => renderGroup(group, isMobile))}
      {adminItems.length > 0 && <div className="pt-3 border-t border-white/10 space-y-1">{adminItems.map(item => renderMenuItem(item, isMobile))}</div>}
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-slate-200 overflow-hidden">
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/10 bg-black/80 backdrop-blur-lg z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center font-bold text-black text-sm">O</div>
          <span className="font-bold text-white tracking-tight">Olivia AI</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/95 pt-20 px-6 overflow-y-auto">
          {menuContent(true)}
          <div className="pt-8 border-t border-white/10 mt-8 space-y-2">
            <button onClick={() => { onTabChange('settings'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-medium ${activeTab === 'settings' ? 'text-green-400' : 'text-slate-500'}`}>
              <Settings size={20} /> <span>{t('settings')}</span>
            </button>
            <button onClick={onLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl font-medium text-red-400">
              <LogOut size={20} /> <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      )}

      <aside className={`hidden lg:flex flex-col border-r border-white/10 bg-[#0d0d0f] transition-all duration-300 relative ${isSidebarOpen ? 'w-80' : 'w-20'}`}>
        <div className="p-6 flex items-center gap-4 mb-4">
          <div className="min-w-[40px] h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center neon-glow-green shadow-lg"><span className="font-bold text-xl text-black">O</span></div>
          {isSidebarOpen && <h1 className="text-xl font-bold tracking-tight text-white whitespace-nowrap overflow-hidden">Olivia <span className="text-green-400">AI</span></h1>}
        </div>

        <nav className="flex-1 px-4 space-y-3 overflow-y-auto custom-scrollbar">
          {menuContent(false)}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1 bg-black/20">
          <button onClick={() => onTabChange('settings')} className={`w-full flex items-center gap-4 p-3.5 rounded-xl font-medium transition-all group ${activeTab === 'settings' ? 'text-green-400 bg-green-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
            <Settings size={20} /> {isSidebarOpen && <span className="text-sm">{t('settings')}</span>}
          </button>
          <button onClick={onLogout} className="w-full flex items-center gap-4 p-3.5 rounded-xl font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={20} /> {isSidebarOpen && <span className="text-sm">{t('logout')}</span>}
          </button>
          {isSidebarOpen && (
            <div className="mt-4 p-4 rounded-2xl glass bg-white/5 border border-white/5">
              <div className="flex items-center gap-3">
                <img src={user.avatar} className="w-10 h-10 rounded-full border border-white/20" alt="Avatar" />
                <div className="overflow-hidden"><p className="text-xs font-bold text-white truncate">{user.name}</p><p className="text-[10px] text-slate-500 truncate uppercase tracking-widest">{user.role}</p></div>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors z-50 shadow-xl">
          {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#0a0a0b]"><div className="flex-1 overflow-y-auto p-4 md:p-8 mt-16 lg:mt-0 custom-scrollbar">{children}</div></main>
    </div>
  );
};

export default Layout;
