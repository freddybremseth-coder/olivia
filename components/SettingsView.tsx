
import React, { useState, useEffect } from 'react';
import { Save, MapPin, Globe, CheckCircle2, User, Building2 } from 'lucide-react';
import { Language, getTranslation } from '../services/i18nService';

interface SettingsViewProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ language, onLanguageChange }) => {
  const [settings, setSettings] = useState({
    farmName: 'My Olive Grove',
    farmAddress: 'Tuscany, Italy',
    language: language,
    currency: 'EUR'
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('olivia_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  const handleSave = () => {
    localStorage.setItem('olivia_settings', JSON.stringify(settings));
    onLanguageChange(settings.language);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">{getTranslation('settings', language)}</h2>
        <button onClick={handleSave} className="flex items-center gap-2 bg-green-500 text-black px-6 py-3 rounded-2xl font-bold hover:bg-green-400 transition-all">
          {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {saved ? getTranslation('saved', language) : getTranslation('save_settings', language)}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass rounded-[2.5rem] p-10 border border-white/10 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><Building2 className="text-green-400" /> {getTranslation('farm_config', language)}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{getTranslation('farm_name', language)}</label>
              <input type="text" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none" value={settings.farmName} onChange={e => setSettings({...settings, farmName: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{getTranslation('address_label', language)}</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-5 py-3 text-white focus:outline-none" value={settings.farmAddress} onChange={e => setSettings({...settings, farmAddress: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-[2.5rem] p-10 border border-white/10 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><Globe className="text-blue-400" /> {getTranslation('language_label', language)}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{getTranslation('language_label', language)}</label>
              <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none" value={settings.language} onChange={e => setSettings({...settings, language: e.target.value as Language})}>
                <option value="en">English 🇬🇧</option>
                <option value="es">Español 🇪🇸</option>
                <option value="it">Italiano 🇮🇹</option>
                <option value="fr">Français 🇫🇷</option>
                <option value="no">Norsk 🇳🇴</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{getTranslation('currency', language)}</label>
              <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="NOK">NOK (kr)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
