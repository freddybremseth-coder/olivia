
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FarmMap from './components/FarmMap';
import WeatherView from './components/WeatherView';
import ProductionView from './components/ProductionView';
import EconomyView from './components/EconomyView';
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
import { UserProfile } from './types';
import { Language } from './services/i18nService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
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

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code' +
        '&hourly=temperature_2m,precipitation,wind_speed_10m,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration' +
        '&timezone=auto'
      );
      const data = await res.json();

      const hourly = data.hourly.time.slice(0, 24).map((t: string, i: number) => ({
        time: new Date(t).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }),
        temp: data.hourly.temperature_2m[i],
        rain: data.hourly.precipitation[i],
        wind: data.hourly.wind_speed_10m[i],
        code: data.hourly.weather_code[i]
      }));

      const daily = data.daily.time.map((t: string, i: number) => ({
        date: new Date(t).toLocaleDateString('no-NO', { weekday: 'short', day: 'numeric', month: 'short' }),
        maxTemp: data.daily.temperature_2m_max[i],
        minTemp: data.daily.temperature_2m_min[i],
        rainSum: data.daily.precipitation_sum[i],
        rainProb: data.daily.precipitation_probability_max[i],
        maxWind: data.daily.wind_speed_10m_max[i],
        evap: data.daily.et0_fao_evapotranspiration[i],
        code: data.daily.weather_code[i]
      }));

      setWeatherData({ current: data.current, hourly, daily });
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
      } catch {
        localStorage.removeItem('olivia_session');
      }
    }

    const settings = localStorage.getItem('olivia_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.language) setLanguage(parsed.language);
    }

    // Fetch initial weather data on load
    fetchWeather(coords.lat, coords.lon);

  }, []);

  const handleLoginSuccess = (storedUser: StoredUser, admin: boolean) => {
    const profileUser: UserProfile = {
      id: storedUser.id,
      name: storedUser.name,
      email: storedUser.email,
      role: storedUser.role,
      subscription: storedUser.subscription,
      subscriptionStart: storedUser.subscriptionStart,
      avatar: storedUser.avatar
    };
    setUser(profileUser);
    setIsAdmin(admin);
    setIsLoggedIn(true);
    setShowLogin(false);
    localStorage.setItem('olivia_session', JSON.stringify({ user: profileUser, isAdmin: admin }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setActiveTab('dashboard');
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
          <LoginModal
            defaultMode={loginDefaultMode}
            onClose={() => setShowLogin(false)}
            onLogin={handleLoginSuccess}
          />
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
      case 'map': return <FarmMap language={language} />;
      case 'weather': return <WeatherView initialData={weatherData} initialLocationName={locationName} initialCoords={coords} />;
      case 'production': return <ProductionView />;
      case 'economy': return <EconomyView />;
      case 'fleet': return <FleetView />;
      case 'irrigation': return <IrrigationView />;
      case 'tasks': return <TasksView />;
      case 'iot': return <IoTDashboard />;
      case 'settings': return <SettingsView language={language} onLanguageChange={updateLanguage} />;
      default: return <Dashboard language={language} weatherData={weatherData} locationName={locationName} />;
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
