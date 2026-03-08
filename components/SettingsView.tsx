
import React, { useState, useEffect } from 'react';
import { Save, MapPin, Globe, CheckCircle2, Building2, Key, Eye, EyeOff, ExternalLink, Crosshair } from 'lucide-react';
import { useTranslation } from '../services/i18nService';
import { Language } from '../types';
import { fetchSettings, saveSettings as dbSaveSettings } from '../services/db';

interface SettingsViewProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ language, onLanguageChange }) => {
  const { t } = useTranslation(language);
  const [settings, setSettings] = useState({
    farmName: 'My Olive Grove',
    farmAddress: 'Tuscany, Italy',
    farmLat: '',
    farmLon: '',
    language: language,
    currency: 'EUR'
  });
  const [apiKeys, setApiKeys] = useState({ gemini: '', claude: '' });
  const [showKeys, setShowKeys] = useState({ gemini: false, claude: false });
  const [saved, setSaved] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);

  useEffect(() => {
    // Load from Supabase, fall back to localStorage during transition
    fetchSettings().then(remote => {
      if (remote) {
        setSettings({
          farmName:    remote.farm_name,
          farmAddress: remote.farm_address,
          farmLat:     remote.farm_lat,
          farmLon:     remote.farm_lon,
          language:    remote.language as Language,
          currency:    remote.currency,
        });
      } else {
        const savedSettings = localStorage.getItem('olivia_settings');
        if (savedSettings) setSettings(JSON.parse(savedSettings));
      }
    });
    setApiKeys({
      gemini: localStorage.getItem('olivia_gemini_api_key') || '',
      claude: localStorage.getItem('olivia_claude_api_key') || ''
    });
  }, []);

  const handleSave = async () => {
    await dbSaveSettings({
      farm_name:    settings.farmName,
      farm_address: settings.farmAddress,
      farm_lat:     settings.farmLat,
      farm_lon:     settings.farmLon,
      language:     settings.language,
      currency:     settings.currency,
    });
    // Keep localStorage in sync for components that still read it (language, coords)
    localStorage.setItem('olivia_settings', JSON.stringify(settings));
    onLanguageChange(settings.language);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    window.dispatchEvent(new Event('storage'));
  };

  const handleSaveApiKeys = () => {
    if (apiKeys.gemini) localStorage.setItem('olivia_gemini_api_key', apiKeys.gemini);
    else localStorage.removeItem('olivia_gemini_api_key');
    if (apiKeys.claude) localStorage.setItem('olivia_claude_api_key', apiKeys.claude);
    else localStorage.removeItem('olivia_claude_api_key');
    setApiSaved(true);
    setTimeout(() => setApiSaved(false), 3000);
    window.dispatchEvent(new Event('storage'));
  };

  const maskKey = (key: string) => key ? key.slice(0, 8) + '•'.repeat(Math.max(0, key.length - 12)) + key.slice(-4) : '';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white">{t('settings')}</h2>
        <button onClick={handleSave} className="flex items-center gap-2 bg-green-500 text-black px-6 py-3 rounded-2xl font-bold hover:bg-green-400 transition-all">
          {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {saved ? t('saved') : t('save_settings')}
        </button>
      </div>

      <div className="glass rounded-[2.5rem] p-8 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.05)] space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2"><Key className="text-yellow-400" /> {t('api_keys')}</h3>
          <button onClick={handleSaveApiKeys} className="flex items-center gap-2 bg-yellow-500 text-black px-5 py-2.5 rounded-2xl font-bold hover:bg-yellow-400 transition-all text-sm">
            {apiSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {apiSaved ? t('saved') : t('save_keys')}
          </button>
        </div>
        <p className="text-slate-400 text-sm">{t('keys_stored_locally')}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('google_gemini_api_key')}</label>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                {t('get_key')} <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input type={showKeys.gemini ? 'text' : 'password'} placeholder="AIza..." className="..." value={apiKeys.gemini} onChange={e => setApiKeys({...apiKeys, gemini: e.target.value})} />
              <button onClick={() => setShowKeys(s => ({...s, gemini: !s.gemini}))} className="...">
                {showKeys.gemini ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {localStorage.getItem('olivia_gemini_api_key') && !apiKeys.gemini && (
              <p className="text-[10px] text-green-400">{t('active')}: {maskKey(localStorage.getItem('olivia_gemini_api_key')!)}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('anthropic_claude_api_key')}</label>
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="...">
                {t('get_key')} <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input type={showKeys.claude ? 'text' : 'password'} placeholder="sk-ant-..." className="..." value={apiKeys.claude} onChange={e => setApiKeys({...apiKeys, claude: e.target.value})} />
              <button onClick={() => setShowKeys(s => ({...s, claude: !s.claude}))} className="...">
                {showKeys.claude ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {localStorage.getItem('olivia_claude_api_key') && !apiKeys.claude && (
              <p className="text-[10px] text-green-400">{t('active')}: {maskKey(localStorage.getItem('olivia_claude_api_key')!)}</p>
            )}
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-sm text-blue-300 space-y-1">
          <p className="font-bold">{t('ai_analysis_priority')}</p>
          <p>{t('claude_key_set')}</p>
          <p>{t('gemini_key_only')}</p>
          <p>{t('no_keys')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><Building2 className="text-green-400" /> {t('farm_config')}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('farm_name')}</label>
              <input type="text" className="..." value={settings.farmName} onChange={e => setSettings({...settings, farmName: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('address_label')}</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" className="w-full bg-black/50 border border-white/10 rounded-2xl pl-11 pr-5 py-4 text-sm text-white outline-none focus:border-green-500/50" value={settings.farmAddress} onChange={e => setSettings({...settings, farmAddress: e.target.value})} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gårds-koordinater (for værvarsling)</label>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    navigator.geolocation.getCurrentPosition(pos => {
                      setSettings(s => ({
                        ...s,
                        farmLat: pos.coords.latitude.toFixed(6),
                        farmLon: pos.coords.longitude.toFixed(6),
                      }));
                    });
                  }}
                  className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 font-bold"
                >
                  <Crosshair size={12} /> Bruk GPS
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-slate-600 uppercase font-bold ml-1 mb-1 block">Breddegrad (lat)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="38.6294"
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50 font-mono"
                    value={settings.farmLat}
                    onChange={e => setSettings({...settings, farmLat: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-600 uppercase font-bold ml-1 mb-1 block">Lengdegrad (lon)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="-0.7667"
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50 font-mono"
                    value={settings.farmLon}
                    onChange={e => setSettings({...settings, farmLon: e.target.value})}
                  />
                </div>
              </div>
              {settings.farmLat && settings.farmLon && (
                <p className="text-[10px] text-green-400 mt-1 ml-1">
                  ✓ Koordinater satt · Brukes som standard i værvarslingen
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><Globe className="text-blue-400" /> {t('language_label')}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('language_label')}</label>
              <select className="..." value={settings.language} onChange={e => setSettings({...settings, language: e.target.value as Language})}>
                <option value="en">English 🇬🇧</option>
                <option value="es">Español 🇪🇸</option>
                <option value="it">Italiano 🇮🇹</option>
                <option value="fr">Français 🇫🇷</option>
                <option value="no">Norsk 🇳🇴</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('currency')}</label>
              <select className="..." value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}>
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
