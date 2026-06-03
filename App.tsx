import React, { Suspense, lazy, useState, useEffect } from 'react';
import LandingPage from './components/PublicB2BLandingPage';
import LoginModal, { StoredUser } from './components/LoginModal';
import ResetPasswordPage from './components/ResetPasswordPage';
import { UserProfile, Language, Parcel } from './types';
import { getCurrentSession, onAuthChange, signOut as authSignOut } from './services/auth';
import { BIAR_DEFAULT_COORDS, BIAR_DEFAULT_LOCATION_NAME, EMPTY_OLIVIA_PARCELS, OLIVIA_FALLBACK_USER } from './services/oliviaAppDefaults';

const Layout = lazy(() => import('./components/Layout'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const FarmOverview = lazy(() => import('./components/FarmOverview'));
const FarmMap = lazy(() => import('./components/FarmMap'));
const WeatherView = lazy(() => import('./components/WeatherView'));
const ClimateDecisionStats = lazy(() => import('./components/ClimateDecisionStats'));
const ProductionView = lazy(() => import('./components/ProductionView'));
const FleetView = lazy(() => import('./components/FleetView'));
const IrrigationView = lazy(() => import('./components/IrrigationView'));
const IrrigationAdvisorView = lazy(() => import('./components/IrrigationAdvisorView'));
const IrrigationLogView = lazy(() => import('./components/IrrigationLogView'));
const FieldObservationsView = lazy(() => import('./components/FieldObservationsView'));
const SalinityDashboard = lazy(() => import('./components/SalinityDashboard'));
const ZoneStatusMapView = lazy(() => import('./components/ZoneStatusMapView'));
const HarvestPlannerView = lazy(() => import('./components/HarvestPlannerView'));
const TraceabilityBatchesView = lazy(() => import('./components/TraceabilityBatchesView'));
const LabelQrGeneratorView = lazy(() => import('./components/LabelQrGeneratorView'));
const ProfessionalLabelTemplateView = lazy(() => import('./components/ProfessionalLabelTemplateView'));
const PrintLabelTemplatesView = lazy(() => import('./components/PrintLabelTemplatesView'));
const DonaAnnaSalesInventoryView = lazy(() => import('./components/DonaAnnaSalesInventoryView'));
const DonaAnnaOrderDocumentsView = lazy(() => import('./components/DonaAnnaOrderDocumentsView'));
const OrganicCertificationView = lazy(() => import('./components/OrganicCertificationView'));
const AutoTasksView = lazy(() => import('./components/AutoTasksView'));
const SeasonReportView = lazy(() => import('./components/SeasonReportView'));
const FarmAdvisorView = lazy(() => import('./components/FarmAdvisorView'));
const PublicTracePage = lazy(() => import('./components/PublicTracePage'));
const TasksView = lazy(() => import('./components/TasksView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const FieldConsultantView = lazy(() => import('./components/FieldConsultantView'));
const PruningAdvisorView = lazy(() => import('./components/PruningAdvisorView'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const IoTDashboard = lazy(() => import('./components/IoTDashboard'));
const DonaAnnaDailyDashboard = lazy(() => import('./components/DonaAnnaDailyDashboard'));
const CommerceHub = lazy(() => import('./components/CommerceHub'));
const ProfitabilityPage = lazy(() => import('./pages/Profitability'));

function isRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return /type=recovery/.test(window.location.hash) || /type=recovery/.test(window.location.search);
}

function isAppUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/app';
}

function isTraceUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.startsWith('/trace/');
}

function getTraceSlug(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[0] === 'trace' ? parts[1] : undefined;
}

function PublicMobileLoginDock({ onLogin, onAdminLogin }: { onLogin: () => void; onAdminLogin: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] md:hidden border-t border-white/10 bg-[#070b08]/95 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur-xl shadow-2xl shadow-black/50">
      <div className="mx-auto flex max-w-md gap-2">
        <button onClick={onLogin} className="flex-1 rounded-2xl bg-[#d9b657] px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-black shadow-lg shadow-[#d9b657]/20">
          Logg inn
        </button>
        <button onClick={onAdminLogin} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white">
          Olivia OS
        </button>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => isAppUrl() && !isRecoveryUrl() ? 'b2b_portal' : 'dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPublicSite, setShowPublicSite] = useState(() => typeof window === 'undefined' ? true : !isAppUrl() && !isRecoveryUrl() && !isTraceUrl());
  const [language, setLanguage] = useState<Language>('no');
  const [showLogin, setShowLogin] = useState(() => isAppUrl() && !isRecoveryUrl());
  const [loginDefaultMode, setLoginDefaultMode] = useState<'login' | 'register'>('login');
  const [postLoginTab, setPostLoginTab] = useState(() => isAppUrl() && !isRecoveryUrl() ? 'b2b_portal' : 'dashboard');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(isRecoveryUrl);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [locationName] = useState(BIAR_DEFAULT_LOCATION_NAME);
  const [coords] = useState<{lat: number, lon: number}>(BIAR_DEFAULT_COORDS);
  const [user, setUser] = useState<UserProfile>(OLIVIA_FALLBACK_USER);

  const [parcels, setParcels] = useState<Parcel[]>(EMPTY_OLIVIA_PARCELS);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [, setParcelsLoaded] = useState(false);

  useEffect(() => {
    if (showPublicSite || isTraceUrl()) return;
    let cancelled = false;
    import('./services/db').then(({ fetchParcels, fetchSettings }) => {
      fetchParcels().then(rows => {
        if (cancelled) return;
        setParcels(rows);
        setSelectedParcel(rows[0] ?? null);
        setParcelsLoaded(true);
      });
      fetchSettings().then(settings => {
        if (cancelled || !settings?.language) return;
        setLanguage(settings.language as Language);
      }).catch(err => console.warn('[settings] failed', err));
    });
    return () => { cancelled = true; };
  }, [showPublicSite]);

  const handleParcelSave = async (parcel: Parcel) => {
    const { upsertParcel } = await import('./services/db');
    await upsertParcel(parcel);
    const index = parcels.findIndex(p => p.id === parcel.id);
    if (index !== -1) {
      const newParcels = [...parcels];
      newParcels[index] = parcel;
      setParcels(newParcels);
    } else setParcels([...parcels, parcel]);
  };

  const handleParcelDelete = async (parcelId: string) => {
    const { deleteParcel } = await import('./services/db');
    await deleteParcel(parcelId);
    const remainingParcels = parcels.filter(p => p.id !== parcelId);
    setParcels(remainingParcels);
    if (selectedParcel?.id === parcelId) setSelectedParcel(remainingParcels[0] ?? null);
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,sunrise,sunset&timezone=auto`);
      setWeatherData(await res.json());
    } catch (err) { console.error('Weather fetch error:', err); }
  };

  useEffect(() => {
    if (selectedParcel && !isTraceUrl()) {
      const lat = selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0];
      const lon = selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1];
      if (lat && lon) fetchWeather(lat, lon);
    }
  }, [selectedParcel]);

  useEffect(() => {
    if (isTraceUrl()) return;
    let cancelled = false;
    if (!isRecoveryUrl()) getCurrentSession().then(result => {
      if (cancelled || !result) return;
      setUser(result.user); setIsAdmin(result.isAdmin); setIsLoggedIn(true); setShowLogin(false);
    });
    const unsubscribe = onAuthChange(
      result => {
        if (cancelled) return;
        if (result) { setUser(result.user); setIsAdmin(result.isAdmin); setIsLoggedIn(true); setShowLogin(false); }
        else { setIsLoggedIn(false); setIsAdmin(false); }
      },
      () => { if (!cancelled) setIsPasswordRecovery(true); },
    );
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const handleLoginSuccess = (storedUser: StoredUser, admin: boolean) => {
    setUser(storedUser); setIsAdmin(admin); setIsLoggedIn(true); setActiveTab(postLoginTab === 'admin' && !admin ? 'commerce' : postLoginTab); setShowLogin(false);
  };

  const handleLogout = async () => { await authSignOut(); setIsLoggedIn(false); setIsAdmin(false); setUser(OLIVIA_FALLBACK_USER); setActiveTab('dashboard'); };
  const updateLanguage = (newLang: Language) => { setLanguage(newLang); };
  const openLogin = (mode: 'login' | 'register' = 'login', targetTab = 'dashboard') => { setShowPublicSite(false); if (typeof window !== 'undefined' && window.location.pathname !== '/app') window.history.pushState({}, '', '/app'); setPostLoginTab(targetTab); setLoginDefaultMode(mode); setShowLogin(true); };
  const openApp = (mode: 'login' | 'register' = 'login', targetTab = 'dashboard') => { setShowPublicSite(false); if (typeof window !== 'undefined' && window.location.pathname !== '/app') window.history.pushState({}, '', '/app'); setPostLoginTab(targetTab); if (isLoggedIn) { setActiveTab(targetTab === 'admin' && !isAdmin ? 'commerce' : targetTab); return; } openLogin(mode, targetTab); };

  if (isTraceUrl()) return <Suspense fallback={<div className="min-h-screen bg-[#060807] p-8 text-slate-300">Laster DonaAnna sporbarhet...</div>}><PublicTracePage slug={getTraceSlug()} /></Suspense>;
  if (isPasswordRecovery) return <ResetPasswordPage onDone={() => setIsPasswordRecovery(false)} />;
  if (showPublicSite) return <><LandingPage onLogin={() => openApp('login', 'b2b_portal')} onAdminLogin={() => openApp('login', 'admin')} onRegister={() => openApp('register', 'b2b_portal')} /><PublicMobileLoginDock onLogin={() => openApp('login', 'b2b_portal')} onAdminLogin={() => openApp('login', 'admin')} />{showLogin && <LoginModal defaultMode={loginDefaultMode} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />}</>;
  if (!isLoggedIn) return <><LandingPage onLogin={() => openLogin('login', 'b2b_portal')} onAdminLogin={() => openLogin('login', 'admin')} onRegister={() => openLogin('register', 'b2b_portal')} /><PublicMobileLoginDock onLogin={() => openLogin('login', 'b2b_portal')} onAdminLogin={() => openLogin('login', 'admin')} />{showLogin && <LoginModal defaultMode={loginDefaultMode} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />}</>;

  const parcelCoords = selectedParcel ? { lat: selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0] ?? BIAR_DEFAULT_COORDS.lat, lon: selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1] ?? BIAR_DEFAULT_COORDS.lon } : coords;
  const renderContent = () => {
    if (isAdmin && activeTab === 'admin') return <AdminDashboard />;
    switch (activeTab) {
      case 'dashboard': return <FarmOverview language={language} weatherData={weatherData} locationName={selectedParcel?.name || locationName} parcels={parcels} onNavigate={setActiveTab} />;
      case 'dona_anna_daily': return <DonaAnnaDailyDashboard />;
      case 'farm_advisor': return <FarmAdvisorView />;
      case 'dashboard_classic': return <Dashboard language={language} weatherData={weatherData} locationName={locationName} />;
      case 'consultant': return <FieldConsultantView />;
      case 'pruning': return <PruningAdvisorView />;
      case 'map': return <FarmMap parcels={parcels} onParcelSave={handleParcelSave} onParcelDelete={handleParcelDelete} language={language} />;
      case 'weather': return <WeatherView initialData={weatherData} initialLocationName={selectedParcel?.name || ''} initialCoords={parcelCoords} language={language} parcels={parcels} selectedParcel={selectedParcel} onParcelSelect={setSelectedParcel} />;
      case 'climate_stats': return <ClimateDecisionStats />;
      case 'production': return <ProductionView parcels={parcels} language={language} />;
      case 'commerce': return <CommerceHub user={user} mode="backend" />;
      case 'b2b_portal': return <CommerceHub user={user} mode="customer" />;
      case 'economy': return <ProfitabilityPage language={language} parcels={parcels} />;
      case 'fleet': return <FleetView />;
      case 'irrigation': return <IrrigationView />;
      case 'irrigation_advisor': return <IrrigationAdvisorView />;
      case 'irrigation_log': return <IrrigationLogView />;
      case 'salinity': return <SalinityDashboard />;
      case 'zone_status': return <ZoneStatusMapView />;
      case 'harvest_planner': return <HarvestPlannerView />;
      case 'traceability_batches': return <TraceabilityBatchesView />;
      case 'label_qr': return <LabelQrGeneratorView />;
      case 'professional_label': return <ProfessionalLabelTemplateView />;
      case 'print_labels': return <PrintLabelTemplatesView />;
      case 'sales_inventory': return <DonaAnnaSalesInventoryView />;
      case 'order_documents': return <DonaAnnaOrderDocumentsView />;
      case 'organic_certification': return <OrganicCertificationView />;
      case 'auto_tasks': return <AutoTasksView />;
      case 'season_report': return <SeasonReportView />;
      case 'field_observations': return <FieldObservationsView parcels={parcels} />;
      case 'tasks': return <TasksView parcels={parcels} />;
      case 'iot': return <IoTDashboard />;
      case 'settings': return <SettingsView language={language} onLanguageChange={updateLanguage} />;
      default: return <FarmOverview language={language} weatherData={weatherData} locationName={selectedParcel?.name || locationName} parcels={parcels} onNavigate={setActiveTab} />;
    }
  };

  return <Suspense fallback={<div className="min-h-screen bg-[#0a0a0b] p-8 text-slate-300">Laster Olivia OS...</div>}><Layout user={user} activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} language={language}><Suspense fallback={<div className="p-8 text-slate-400">Laster modul...</div>}>{renderContent()}</Suspense></Layout></Suspense>;
};

export default App;
