
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FarmOverview from './components/FarmOverview';
import FarmMap from './components/FarmMap';
import WeatherView from './components/WeatherView';
import ProductionView from './components/ProductionView';
import FleetView from './components/FleetView';
import IrrigationView from './components/IrrigationView';
import TasksView from './components/TasksView';
import SettingsView from './components/SettingsView';
import FieldConsultantView from './components/FieldConsultantView';
import PruningAdvisorView from './components/PruningAdvisorView';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import IoTDashboard from './components/IoTDashboard';
import CommerceHub from './components/CommerceHub';
import LoginModal, { StoredUser } from './components/LoginModal';
import ResetPasswordPage from './components/ResetPasswordPage';
import ProfitabilityPage from './pages/Profitability';
import { UserProfile, Language, Parcel } from './types';
import { fetchParcels, upsertParcel, deleteParcel, migrateLocalStorageToSupabase } from './services/db';
import { getCurrentSession, onAuthChange, signOut as authSignOut } from './services/auth';

/**
 * Detect a Supabase recovery URL synchronously — used as the initial state
 * so we never flash the login/dashboard during the brief window before the
 * PASSWORD_RECOVERY event fires. Supabase v2 uses either a `#...type=recovery`
 * hash fragment (implicit) or `?code=...&type=recovery` query string (PKCE).
 */
function isRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return /type=recovery/.test(window.location.hash) || /type=recovery/.test(window.location.search);
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPublicSite, setShowPublicSite] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.location.pathname !== '/app' && !isRecoveryUrl();
  });
  const [language, setLanguage] = useState<Language>('no');
  const [showLogin, setShowLogin] = useState(false);
  const [loginDefaultMode, setLoginDefaultMode] = useState<'login' | 'register'>('login');
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(isRecoveryUrl);

  const [weatherData, setWeatherData] = useState<any>(null);
  const [locationName, setLocationName] = useState('Biar, Spain');
  const [coords, setCoords] = useState<{lat: number, lon: number}>({ lat: 38.6294, lon: -0.7667 });

  const [user, setUser] = useState<UserProfile>({
    id: 'u1',
    name: 'Henrik Olivenlund',
    email: 'henrik@olivia.ai',
    role: 'farmer',
    subscription: 'annual',
    subscriptionStart: '2024-01-15',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  });

  const DEFAULT_PARCELS: Parcel[] = [
    { id: 'p1', name: 'Hovedlunden', area: 125000, cropType: 'Arbequina', soilType: 'Leire', treeCount: 350, irrigationStatus: 'Optimal', coordinates: [[38.6300, -0.7650]], lat: 38.6300, lon: -0.7650 },
    { id: 'p2', name: 'Nordhellinga', area: 82000, cropType: 'Picual', soilType: 'Sandholdig leire', treeCount: 220, irrigationStatus: 'Optimal', coordinates: [[38.6325, -0.7680]], lat: 38.6325, lon: -0.7680 },
  ];

  const [parcels, setParcels] = useState<Parcel[]>(DEFAULT_PARCELS);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(DEFAULT_PARCELS[0]);
  const [parcelsLoaded, setParcelsLoaded] = useState(false);

  // Load parcels from Supabase on mount + run one-time localStorage migration
  useEffect(() => {
    fetchParcels().then(rows => {
      if (rows.length > 0) {
        setParcels(rows);
        setSelectedParcel(rows[0]);
      }
      setParcelsLoaded(true);
    });
    // One-shot upload of any pre-existing localStorage data (tasks, batches,
    // recipes, pruning history). Safe to run on every startup; does nothing
    // after the first successful run thanks to a flag in localStorage.
    migrateLocalStorageToSupabase()
      .then(({ migrated, skipped }) => {
        if (!skipped) {
          console.info('[migration] uploaded to Supabase', migrated);
        }
      })
      .catch(err => console.warn('[migration] failed', err));
  }, []);

  const handleParcelSave = async (parcel: Parcel) => {
    await upsertParcel(parcel);
    const index = parcels.findIndex(p => p.id === parcel.id);
    if (index !== -1) {
      const newParcels = [...parcels];
      newParcels[index] = parcel;
      setParcels(newParcels);
    } else {
      setParcels([...parcels, parcel]);
    }
  };

  const handleParcelDelete = async (parcelId: string) => {
    await deleteParcel(parcelId);
    setParcels(parcels.filter(p => p.id !== parcelId));
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,is_day' +
        '&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration,sunrise,sunset' +
        '&timezone=auto'
      );
      const data = await res.json();
      setWeatherData(data);
    } catch (err) {
      console.error("Weather fetch error:", err);
    }
  };

  // Settings (language only — no longer used for session storage)
  useEffect(() => {
    const settings = localStorage.getItem('olivia_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.language) setLanguage(parsed.language);
    }
  }, []);

  // Weather refresh whenever the selected parcel changes
  useEffect(() => {
    if (selectedParcel) {
      const lat = selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0];
      const lon = selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1];
      if (lat && lon) fetchWeather(lat, lon);
    }
  }, [selectedParcel]);

  // Supabase auth: hydrate from stored session on load + subscribe to changes.
  useEffect(() => {
    let cancelled = false;
    // Skip hydration if we're in the recovery flow — we don't want to land the
    // user on the dashboard before they've chosen a new password.
    if (!isRecoveryUrl()) {
      getCurrentSession().then(result => {
        if (cancelled || !result) return;
        setUser(result.user);
        setIsAdmin(result.isAdmin);
        setIsLoggedIn(true);
      });
    }
    // Single shared subscription for both sign-in/out and PASSWORD_RECOVERY —
    // see auth.ts for why this matters (gotrue lock contention).
    const unsubscribe = onAuthChange(
      result => {
        if (cancelled) return;
        if (result) {
          setUser(result.user);
          setIsAdmin(result.isAdmin);
          setIsLoggedIn(true);
          setShowLogin(false);
        } else {
          setIsLoggedIn(false);
          setIsAdmin(false);
        }
      },
      () => {
        if (cancelled) return;
        setIsPasswordRecovery(true);
      },
    );
    return () => { cancelled = true; unsubscribe(); };
  }, []);

  const handleLoginSuccess = (storedUser: StoredUser, admin: boolean) => {
    // The auth listener will set state too, but doing it here makes the
    // transition feel instant.
    setUser(storedUser);
    setIsAdmin(admin);
    setIsLoggedIn(true);
    setShowLogin(false);
  };

  const handleLogout = async () => {
    await authSignOut();
    setIsLoggedIn(false);
    setIsAdmin(false);
    setActiveTab('dashboard');
    // Wipe any legacy localStorage session left over from the old flow
    localStorage.removeItem('olivia_session');
  };

  const updateLanguage = (newLang: Language) => {
    setLanguage(newLang);
    const settings = JSON.parse(localStorage.getItem('olivia_settings') || '{}');
    localStorage.setItem('olivia_settings', JSON.stringify({ ...settings, language: newLang }));
  };

  const openLogin = (mode: 'login' | 'register' = 'login') => {
    setShowPublicSite(false);
    if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
      window.history.pushState({}, '', '/app');
    }
    setLoginDefaultMode(mode);
    setShowLogin(true);
  };

  const openApp = (mode: 'login' | 'register' = 'login') => {
    setShowPublicSite(false);
    if (typeof window !== 'undefined' && window.location.pathname !== '/app') {
      window.history.pushState({}, '', '/app');
    }
    if (!isLoggedIn) openLogin(mode);
  };

  // Password-recovery takes priority over everything else: the user arrived
  // via the email link and needs to set a new password before anything else
  // matters (dashboard, login modal, etc).
  if (isPasswordRecovery) {
    return <ResetPasswordPage onDone={() => setIsPasswordRecovery(false)} />;
  }

  if (showPublicSite) {
    return (
      <>
        <LandingPage onLogin={() => openApp('login')} onAdminLogin={() => openApp('login')} onRegister={() => openApp('register')} />
        {showLogin && (
          <LoginModal defaultMode={loginDefaultMode} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />
        )}
      </>
    );
  }

  if (!isLoggedIn) {
    return (
      <>
        <LandingPage onLogin={() => openLogin('login')} onAdminLogin={() => openLogin('login')} onRegister={() => openLogin('register')} />
        {showLogin && (
          <LoginModal defaultMode={loginDefaultMode} onClose={() => setShowLogin(false)} onLogin={handleLoginSuccess} />
        )}
      </>
    );
  }

  const parcelCoords = selectedParcel
    ? { lat: selectedParcel.lat ?? selectedParcel.coordinates?.[0]?.[0] ?? 38.6294, lon: selectedParcel.lon ?? selectedParcel.coordinates?.[0]?.[1] ?? -0.7667 }
    : coords;

  const renderContent = () => {
    if (isAdmin && activeTab === 'admin') return <AdminDashboard />;

    switch (activeTab) {
      case 'dashboard': return <FarmOverview
        language={language}
        weatherData={weatherData}
        locationName={selectedParcel?.name || locationName}
        parcels={parcels}
        onNavigate={setActiveTab}
      />;
      case 'dashboard_classic': return <Dashboard language={language} weatherData={weatherData} locationName={locationName} />;
      case 'consultant': return <FieldConsultantView />;
      case 'pruning': return <PruningAdvisorView />;
      case 'map': return <FarmMap parcels={parcels} onParcelSave={handleParcelSave} onParcelDelete={handleParcelDelete} language={language} />;
      case 'weather': return <WeatherView
        initialData={weatherData}
        initialLocationName={selectedParcel?.name || ''}
        initialCoords={parcelCoords}
        language={language}
        parcels={parcels}
        selectedParcel={selectedParcel}
        onParcelSelect={setSelectedParcel}
      />;
      case 'production': return <ProductionView parcels={parcels} language={language} />;
      case 'commerce': return <CommerceHub />;
      case 'economy': return <ProfitabilityPage language={language} parcels={parcels} />;
      case 'fleet': return <FleetView />;
      case 'irrigation': return <IrrigationView />;
      case 'tasks': return <TasksView parcels={parcels} />;
      case 'iot': return <IoTDashboard />;
      case 'settings': return <SettingsView language={language} onLanguageChange={updateLanguage} />;
      default: return <FarmOverview
        language={language}
        weatherData={weatherData}
        locationName={selectedParcel?.name || locationName}
        parcels={parcels}
        onNavigate={setActiveTab}
      />;
    }
  };

  return (
    <Layout
      user={user}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onLogout={handleLogout}
      language={language}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
