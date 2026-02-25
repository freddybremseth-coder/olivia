
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
import { UserProfile } from './types';
import { Language } from './services/i18nService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [language, setLanguage] = useState<Language>('en');

  const [user, setUser] = useState<UserProfile>({
    id: 'u1',
    name: 'Henrik Olivenlund',
    email: 'henrik@olivia.ai',
    role: 'farmer',
    subscription: 'annual',
    subscriptionStart: '2024-01-15',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
  });

  useEffect(() => {
    const session = localStorage.getItem('olivia_session');
    if (session) {
      const { user: savedUser, isAdmin: savedAdmin } = JSON.parse(session);
      setUser(savedUser);
      setIsAdmin(savedAdmin);
      setIsLoggedIn(true);
    }

    const settings = localStorage.getItem('olivia_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.language) setLanguage(parsed.language);
    }
  }, []);

  const handleLogin = (admin = false) => {
    const finalUser = { ...user, role: (admin ? 'super_admin' : 'farmer') as any };
    setUser(finalUser);
    setIsAdmin(admin);
    setIsLoggedIn(true);
    localStorage.setItem('olivia_session', JSON.stringify({ user: finalUser, isAdmin: admin }));
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    localStorage.removeItem('olivia_session');
  };

  const updateLanguage = (newLang: Language) => {
    setLanguage(newLang);
    const settings = JSON.parse(localStorage.getItem('olivia_settings') || '{}');
    localStorage.setItem('olivia_settings', JSON.stringify({ ...settings, language: newLang }));
  };

  if (!isLoggedIn) {
    return <LandingPage onLogin={() => handleLogin(false)} onAdminLogin={() => handleLogin(true)} />;
  }

  const renderContent = () => {
    if (isAdmin && activeTab === 'admin') return <AdminDashboard />;
    
    switch (activeTab) {
      case 'dashboard': return <Dashboard language={language} />;
      case 'consultant': return <FieldConsultantView />;
      case 'pruning': return <PruningAdvisorView />;
      case 'map': return <FarmMap language={language} />;
      case 'weather': return <WeatherView />;
      case 'production': return <ProductionView />;
      case 'economy': return <EconomyView />;
      case 'fleet': return <FleetView />;
      case 'irrigation': return <IrrigationView />;
      case 'tasks': return <TasksView />;
      case 'settings': return <SettingsView language={language} onLanguageChange={updateLanguage} />;
      default: return <Dashboard language={language} />;
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
