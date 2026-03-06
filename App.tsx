
import React, { useState, useEffect } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
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
import LoginModal, { StoredUser } from './components/LoginModal';
import ProfitabilityPage from './pages/Profitability';
import { UserProfile, Language, Parcel } from './types';

const GOOGLE_MAPS_API_KEY = '12RW6scFNZqQtRP1RU0TJvZoZHMtiiRo';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState<Language>('no');
  const [showLogin, setShowLogin] = useState(false);
  const [loginDefaultMode, setLoginDefaultMode] = useState<'login' | 'register'>('login');
  
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
  
  const [parcels, setParcels] = useState<Parcel[]>([
    { id: 'p1', name: 'Hovedlunden', area: 12.5, crop: 'Arbequina', soilType: 'Leire', registrationDate: '2022-03-15', lat: 38.6300, lon: -0.7650, boundaries: [] },
    { id: 'p2', name: 'Nordhellinga', area: 8.2, crop: 'Picual', soilType: 'Sandholdig leire', registrationDate: '2021-09-20', lat: 38.6325, lon: -0.7680, boundaries: [] },
  ]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(parcels[0]);

  const handleParcelSave = (parcel: Parcel) => {
    const index = parcels.findIndex(p => p.id === parcel.id);
    if (index !== -1) {
      const newParcels = [...parcels];
      newParcels[index] = parcel;
      setParcels(newParcels);
    } else {
      const newParcel = { ...parcel, id: `p${Date.now()}`};
      setParcels([...parcels, newParcel]);
    }
  };

  const handleParcelDelete = (parcelId: string) => {
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

  useEffect(() => {
    const session = localStorage.getItem('olivia_session');
    if (session) {
      try {
        const { user: savedUser, isAdmin: savedAdmin } = JSON.parse(session);
        setUser(savedUser);
        setIsAdmin(savedAdmin);
        setIsLoggedIn(true);
      } catch { localStorage.removeItem('olivia_session'); }
    }

    const settings = localStorage.getItem('olivia_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.language) setLanguage(parsed.language);
    }
    if(selectedParcel) {
        fetchWeather(selectedParcel.lat, selectedParcel.lon);
    }
  }, [selectedParcel]);

  const handleLoginSuccess = (storedUser: StoredUser, admin: boolean) => {
    const profileUser: UserProfile = {
      id: storedUser.id, name: storedUser.name, email: storedUser.email,
      role: storedUser.role, subscription: storedUser.subscription,
      subscriptionStart: storedUser.subscriptionStart, avatar: storedUser.avatar
    };
    setUser(profileUser);
    setIsAdmin(admin);
    setIsLoggedIn(true);
    setShowLogin(false);
    localStorage.setItem('olivia_session', JSON.stringify({ user: profileUser, isAdmin: admin }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false); setIsAdmin(false); setActiveTab('dashboard');
    localStorage.removeItem('olivia_session');
  };

  const updateLanguage = (newLang: Language) => {
    setLanguage(newLang);
    const settings = JSON.parse(localStorage.getItem('olivia_settings') || '{}');
    localStorage.setItem('olivia_settings', JSON.stringify({ ...settings, language: newLang }));
  };

  const openLogin = (mode: 'login' | 'register' = 'login') => {
    setLoginDefaultMode(mode);
    setShowLogin(true);
  };

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

  const renderContent = () => {
    if (isAdmin && activeTab === 'admin') return <AdminDashboard />;
    
    switch (activeTab) {
      case 'dashboard': return <Dashboard language={language} weatherData={weatherData} locationName={locationName} />;
      case 'consultant': return <FieldConsultantView />;
      case 'pruning': return <PruningAdvisorView />;
      case 'map': return <FarmMap parcels={parcels} onParcelSave={handleParcelSave} onParcelDelete={handleParcelDelete} language={language} />;
      case 'weather': return <WeatherView 
                                initialData={weatherData} 
                                initialLocationName={selectedParcel?.name || ''} 
                                initialCoords={selectedParcel ? {lat: selectedParcel.lat, lon: selectedParcel.lon} : coords}
                                language={language}
                                parcels={parcels}
                                selectedParcel={selectedParcel}
                                onParcelSelect={setSelectedParcel}
                              />;
      case 'production': return <ProductionView parcels={parcels} language={language}/>;
      case 'economy': return <ProfitabilityPage language={language} />;
      case 'fleet': return <FleetView />;
      case 'irrigation': return <IrrigationView />;
      case 'tasks': return <TasksView />;
      case 'iot': return <IoTDashboard />;
      case 'settings': return <SettingsView language={language} onLanguageChange={updateLanguage} />;
      default: return <Dashboard language={language} weatherData={weatherData} locationName={locationName} />;
    }
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Layout 
        user={user} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        language={language}
      >
        {renderContent()}
      </Layout>
    </APIProvider>
  );
};

export default App;
