import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
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
const PropertyDocumentsView = lazy(() => import('./components/PropertyDocumentsView'));
const CaecvDocumentsView = lazy(() => import('./components/CaecvDocumentsView'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const IoTDashboard = lazy(() => import('./components/IoTDashboard'));
const DonaAnnaDailyDashboard = lazy(() => import('./components/DonaAnnaDailyDashboard'));
const CommerceHub = lazy(() => import('./components/CommerceHub'));
const ProfitabilityPage = lazy(() => import('./pages/Profitability'));

import { portalForPath, resolvePortalNavigation, type PortalMode } from './services/portalRouting';

function isRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return /type=recovery/.test(window.location.hash) || /type=recovery/.test(window.location.search);
}

const B2B_PORTAL_PATH = '/b2b';
const OLIVIA_OS_PATH = '/olivia';

function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}

function isB2BUrl(): boolean {
  return portalForPath(currentPath()) === 'b2b';
}

function isOliviaUrl(): boolean {
  return portalForPath(currentPath()) === 'olivia';
}

function isPortalUrl(): boolean {
  return isB2BUrl() || isOliviaUrl();
}

function pathForTargetTab(targetTab: string): string {
  return targetTab === 'b2b_portal' ? B2B_PORTAL_PATH : OLIVIA_OS_PATH;
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
  const [activeTab, setActiveTab] = useState(() => isB2BUrl() ? 'b2b_portal' : 'dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPublicSite, setShowPublicSite] = useState(() => typeof window === 'undefined' ? true : !isPortalUrl() && !isRecoveryUrl() && !isTraceUrl());
  const [language, setLanguage] = useState<Language>('no');
  const [showLogin, setShowLogin] = useState(() => isPortalUrl() && !isRecoveryUrl());
  const [loginDefaultMode, setLoginDefaultMode] = useState<'login' | 'register'>('login');
  const [postLoginTab, setPostLoginTab] = useState(() => isB2BUrl() ? 'b2b_portal' : 'dashboard');
  const navigationRef = useRef(isB2BUrl() ? 'b2b_portal' : 'dashboard');
  const [portalMode, setPortalMode] = useState<PortalMode>(() => isB2BUrl() ? 'b2b' : 'olivia');
  const [authReady, setAuthReady] = useState(false);
  const [parcelError, setParcelError] = useState('');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(isRecoveryUrl);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [locationName] = useState(BIAR_DEFAULT_LOCATION_NAME);
  const [coords] = useState<{lat: number, lon: number}>(BIAR_DEFAULT_COORDS);
  const [user, setUser] = useState<UserProfile>(OLIVIA_FALLBACK_USER);

  const [parcels, setParcels] = useState<Parcel[]>(EMPTY_OLIVIA_PARCELS);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [, setParcelsLoaded] = useState(false);

  const activateTab = (target: string, profile = user) => {
    const next = resolvePortalNavigation(target, profile.role, portalForPath(currentPath()) ?? portalMode);
    navigationRef.current = next.tab;
    setPostLoginTab(next.portal === 'b2b' ? 'b2b_portal' : 'dashboard');
    setActiveTab(next.tab);
    setPortalMode(next.portal);
    if (currentPath() !== next.path) window.history.replaceState({}, '', next.path);
  };

  useEffect(() => {
    const onPopState = () => {
      const portal = portalForPath(currentPath());
      setShowPublicSite(!portal);
      if (portal) {
        const target = portal === 'b2b' ? 'b2b_portal' : 'dashboard';
        navigationRef.current = target;
        setPostLoginTab(target);
        setPortalMode(portal);
        if (isLoggedIn) activateTab(target);
        else setShowLogin(true);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isLoggedIn, user.role]);

  useEffect(() => {
    if (showPublicSite || isTraceUrl() || !isLoggedIn || portalMode === 'b2b' || !['farmer', 'super_admin'].includes(user.role)) {
      setParcelsLoaded(false);
      setParcels(EMPTY_OLIVIA_PARCELS);
      setSelectedParcel(null);
      return;
    }
    let cancelled = false;
    setParcelError('');
    import('./services/db').then(async ({ fetchParcels, fetchSettings }) => {
      try {
        const rows = await fetchParcels();
        if (cancelled) return;
        setParcels(rows);
        setSelectedParcel(rows[0] ?? null);
        setParcelsLoaded(true);
      } catch (err) {
        console.warn('[parcels] failed', err);
        if (!cancelled) { setParcelsLoaded(true); setParcelError('Kunne ikke hente gårdsdata. Last siden på nytt eller kontroller tilgangen til Olivia OS.'); }
      }

      fetchSettings().then(settings => {
        if (cancelled || !settings?.language) return;
        setLanguage(settings.language as Language);
      }).catch(err => console.warn('[settings] failed', err));
    }).catch(err => console.warn('[data] failed', err));
    return () => { cancelled = true; };
  }, [showPublicSite, isLoggedIn, portalMode, user.id, user.role]);

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
    const applySession = (result: Awaited<ReturnType<typeof getCurrentSession>>) => {
      if (cancelled) return;
      setAuthReady(true);
      if (result) {
        setUser(result.user); setIsAdmin(result.isAdmin); setIsLoggedIn(true); setShowLogin(false);
        if (isPortalUrl()) activateTab(navigationRef.current, result.user);
      } else {
        setIsLoggedIn(false); setIsAdmin(false); setUser(OLIVIA_FALLBACK_USER);
        setParcels(EMPTY_OLIVIA_PARCELS); setSelectedParcel(null);
        if (isPortalUrl()) setShowLogin(true);
      }
    };
    if (!isRecoveryUrl()) getCurrentSession().then(applySession).catch(error => {
      console.warn('[auth] session failed', error);
      if (!cancelled) setAuthReady(true);
    });
    else setAuthReady(true);
    const unsubscribe = onAuthChange(applySession,
      () => { if (!cancelled) setIsPasswordRecovery(true); });
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const handleLoginSuccess = (storedUser: StoredUser, admin: boolean) => {
    setUser(storedUser); setIsAdmin(admin); setIsLoggedIn(true); setAuthReady(true);
    activateTab(navigationRef.current, storedUser); setShowLogin(false);
  };

  const handleLogout = async () => { await authSignOut(); setIsLoggedIn(false); setIsAdmin(false); setUser(OLIVIA_FALLBACK_USER); setParcels(EMPTY_OLIVIA_PARCELS); setSelectedParcel(null); setActiveTab('dashboard'); };
  const updateLanguage = (newLang: Language) => { setLanguage(newLang); };
  const openLogin = (mode: 'login' | 'register' = 'login', targetTab = 'dashboard') => { setShowPublicSite(false); const targetPath = pathForTargetTab(targetTab); if (typeof window !== 'undefined' && window.location.pathname !== targetPath) window.history.pushState({}, '', targetPath); navigationRef.current = targetTab; setPostLoginTab(targetTab); setPortalMode(targetTab === 'b2b_portal' ? 'b2b' : 'olivia'); setLoginDefaultMode(mode); setShowLogin(true); };
  const openApp = (mode: 'login' | 'register' = 'login', targetTab = 'dashboard') => { setShowPublicSite(false); const targetPath = pathForTargetTab(targetTab); if (typeof window !== 'undefined' && window.location.pathname !== targetPath) window.history.pushState({}, '', targetPath); navigationRef.current = targetTab; setPostLoginTab(targetTab); setPortalMode(targetTab === 'b2b_portal' ? 'b2b' : 'olivia'); if (isLoggedIn) { activateTab(targetTab); return; } openLogin(mode, targetTab); };

  if (isTraceUrl()) return <Suspense fallback={<div className="min-h-screen bg-[#060807] p-8 text-slate-300">Laster DonaAnna sporbarhet...</div>}><PublicTracePage slug={getTraceSlug()} /></Suspense>;
  if (isPasswordRecovery) return <ResetPasswordPage onDone={() => setIsPasswordRecovery(false)} />;
  if (showPublicSite) return <><LandingPage onLogin={() => openApp('login', 'b2b_portal')} onAdminLogin={() => openApp('login', 'dashboard')} onRegister={() => openApp('register', 'b2b_portal')} /><PublicMobileLoginDock onLogin={() => openApp('login', 'b2b_portal')} onAdminLogin={() => openApp('login', 'dashboard')} />{showLogin && <LoginModal portalContext={postLoginTab === 'b2b_portal' ? 'b2b' : 'olivia'} defaultMode={loginDefaultMode} allowRegister={postLoginTab === 'b2b_portal'} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />}</>;
  if (!authReady) return <div className="min-h-screen bg-[#060807] p-8 text-white">Kontrollerer innlogging...</div>;
  if (!isLoggedIn) return <><LandingPage onLogin={() => openLogin('login', 'b2b_portal')} onAdminLogin={() => openLogin('login', 'dashboard')} onRegister={() => openLogin('register', 'b2b_portal')} /><PublicMobileLoginDock onLogin={() => openLogin('login', 'b2b_portal')} onAdminLogin={() => openLogin('login', 'dashboard')} />{showLogin && <LoginModal portalContext={postLoginTab === 'b2b_portal' ? 'b2b' : 'olivia'} defaultMode={loginDefaultMode} allowRegister={postLoginTab === 'b2b_portal'} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />}</>;

  const parcelCoords = selectedParcel ? { lat: selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0] ?? BIAR_DEFAULT_COORDS.lat, lon: selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1] ?? BIAR_DEFAULT_COORDS.lon } : coords;
  const renderContent = () => {
    if (portalMode === 'b2b' || !['farmer', 'super_admin'].includes(user.role)) {
      return activeTab === 'settings' ? <SettingsView language={language} onLanguageChange={updateLanguage} /> : <CommerceHub user={user} mode="customer" />;
    }
    if (isAdmin && activeTab === 'admin') return <AdminDashboard />;
    switch (activeTab) {
      case 'dashboard': return <FarmOverview language={language} weatherData={weatherData} locationName={selectedParcel?.name || locationName} parcels={parcels} onNavigate={activateTab} />;
      case 'dona_anna_daily': return <DonaAnnaDailyDashboard onNavigate={activateTab} />;
      case 'farm_advisor': return <FarmAdvisorView />;
      case 'dashboard_classic': return <Dashboard language={language} weatherData={weatherData} locationName={locationName} />;
      case 'consultant': return <FieldConsultantView />;
      case 'pruning': return <PruningAdvisorView />;
      case 'property_documents': return <PropertyDocumentsView />;
      case 'caecv_documents': return <CaecvDocumentsView />;
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
      default: return <FarmOverview language={language} weatherData={weatherData} locationName={selectedParcel?.name || locationName} parcels={parcels} onNavigate={activateTab} />;
    }
  };

  return <Suspense fallback={<div className="min-h-screen bg-[#0a0a0b] p-8 text-slate-300">{portalMode === 'b2b' ? 'Laster B2B-portalen...' : 'Laster Olivia OS...'}</div>}><Layout user={user} activeTab={activeTab} portalMode={portalMode} onTabChange={activateTab} onLogout={handleLogout} language={language}><Suspense fallback={<div className="p-8 text-slate-400">Laster modul...</div>}>{parcelError && portalMode === 'olivia' && <div role="alert" className="mb-4 rounded-xl bg-amber-950 p-4 text-amber-200">{parcelError}</div>}{renderContent()}</Suspense></Layout></Suspense>;
};

export default App;
