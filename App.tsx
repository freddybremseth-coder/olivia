import React, { Suspense, lazy, useState, useEffect } from 'react';
import LandingPage from './components/PublicB2BLandingPage';
import LoginModal, { StoredUser } from './components/LoginModal';
import ResetPasswordPage from './components/ResetPasswordPage';
import { UserProfile, Language, Parcel } from './types';
import { getCurrentSession, onAuthChange, signOut as authSignOut } from './services/auth';

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
  const [locationName] = useState('Biar, Spain');
  const [coords] = useState<{lat: number, lon: number}>({ lat: 38.6294, lon: -0.7667 });
  const [user, setUser] = useState<UserProfile>({
    id: 'u1', name: 'Henrik Olivenlund', email: 'henrik@olivia.ai', role: 'farmer', subscription: 'annual', subscriptionStart: '2024-01-15', avatar: ''
  });

  const DEFAULT_PARCELS: Parcel[] = [
    { id: 'p1', name: 'Hovedlunden', area: 125000, cropType: 'Arbequina', soilType: 'Leire', treeCount: 350, irrigationStatus: 'Optimal', coordinates: [[38.6300, -0.7650]], lat: 38.6300, lon: -0.7650 },
    { id: 'p2', name: 'Nordhellinga', area: 82000, cropType: 'Picual', soilType: 'Sandholdig leire', treeCount: 220, irrigationStatus: 'Optimal', coordinates: [[38.6325, -0.7680]], lat: 38.6325, lon: -0.7680 },
  ];
  const [parcels, setParcels] = useState<Parcel[]>(DEFAULT_PARCELS);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(DEFAULT_PARCELS[0]);
  const [, setParcelsLoaded] = useState(false);

  useEffect(() => {
    if (showPublicSite || isTraceUrl()) return;
    let cancelled = false;
    import('./services/db').then(({ fetchParcels, migrateLocalStorageToSupabase }) => {
      fetchParcels().then(rows => {
        if (cancelled) return;
        if (rows.length > 0) { setParcels(rows); setSelectedParcel(rows[0]); }
        setParcelsLoaded(true);
      });
      migrateLocalStorageToSupabase().catch(err => console.warn('[migration] failed', err));
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
    setParcels(parcels.filter(p => p.id !== parcelId));
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,sunrise,sunset&timezone=auto`);
      setWeatherData(await res.json());
    } catch (err) { console.error('Weather fetch error:', err); }
  };

  useEffect(() => {
    const settings = localStorage.getItem('olivia_settings');
    if (settings) { const parsed = JSON.parse(settings); if (parsed.language) setLanguage(parsed.language); }
  }, []);

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

  const handleLogout = async () => { await authSignOut(); setIsLoggedIn(false); setIsAdmin(false); setActiveTab('dashboard'); localStorage.removeItem('olivia_session'); };
  const updateLanguage = (newLang: Language) => { setLanguage(newLang); const settings = JSON.parse(localStorage.getItem('olivia_settings') || '{}'); localStorage.setItem('olivia_settings', JSON.stringify({ ...settings, language: newLang })); };
  const openLogin = (mode: 'login' | 'register' = 'login', targetTab = 'dashboard') => { setShowPublicSite(false); if (typeof window !== 'undefined' && window.location.pathname !== '/app') window.history.pushState({}, '', '/app'); setPostLoginTab(targetTab); setLoginDefaultMode(mode); setShowLogin(true); };
  const openApp = (mode: 'login' | 'register' = 'login', targetTab = 'dashboard') => { setShowPublicSite(false); if (typeof window !== 'undefined' && window.location.pathname !== '/app') window.history.pushState({}, '', '/app'); setPostLoginTab(targetTab); if (isLoggedIn) { setActiveTab(targetTab === 'admin' && !isAdmin ? 'commerce' : targetTab); return; } openLogin(mode, targetTab); };

  if (isTraceUrl()) return <Suspense fallback={<div className="min-h-screen bg-[#060807] p-8 text-slate-300">Laster DonaAnna sporbarhet...</div>}><PublicTracePage slug={getTraceSlug()} /></Suspense>;
  if (isPasswordRecovery) return <ResetPasswordPage onDone={() => setIsPasswordRecovery(false)} />;
  if (showPublicSite) return <><LandingPage onLogin={() => openApp('login', 'b2b_portal')} onAdminLogin={() => openApp('login', 'admin')} onRegister={() => openApp('register', 'b2b_portal')} />{showLogin && <LoginModal defaultMode={loginDefaultMode} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />}</>;
  if (!isLoggedIn) return <><LandingPage onLogin={() => openLogin('login', 'b2b_portal')} onAdminLogin={() => openLogin('login', 'admin')} onRegister={() => openLogin('register', 'b2b_portal')} />{showLogin && <LoginModal defaultMode={loginDefaultMode} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />}</>;

  const parcelCoords = selectedParcel ? { lat: selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0] ?? 38.6294, lon: selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1] ?? -0.7667 } : coords;
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
      case 'field_observations': return <FieldObservationsView />;
      case 'tasks': return <TasksView parcels={parcels} />;
      case 'iot': return <IoTDashboard />;
      case 'settings': return <SettingsView language={language} onLanguageChange={updateLanguage} />;
      default: return <FarmOverview language={language} weatherData={weatherData} locationName={selectedParcel?.name || locationName} parcels={parcels} onNavigate={setActiveTab} />;
    }
  };

  return <Suspense fallback={<div className="min-h-screen bg-[#0a0a0b] p-8 text-slate-300">Laster Olivia OS...</div>}><Layout user={user} activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} language={language}><Suspense fallback={<div className="p-8 text-slate-400">Laster modul...</div>}>{renderContent()}</Suspense></Layout></Suspense>;
};

export default App;
