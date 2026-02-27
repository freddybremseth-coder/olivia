
import React, { useState, useEffect } from 'react';
import { Save, MapPin, Globe, CheckCircle2, Building2, Key, Eye, EyeOff, ExternalLink } from 'lucide-react';
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
  const [apiKeys, setApiKeys] = useState({
    gemini: '',
    claude: ''
  });
  const [showKeys, setShowKeys] = useState({ gemini: false, claude: false });
  const [saved, setSaved] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('olivia_settings');
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    setApiKeys({
      gemini: localStorage.getItem('olivia_gemini_api_key') || '',
      claude: localStorage.getItem('olivia_claude_api_key') || ''
    });
  }, []);

  const handleSave = () => {
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
        <h2 className="text-3xl font-bold text-white">{getTranslation('settings', language)}</h2>
        <button onClick={handleSave} className="flex items-center gap-2 bg-green-500 text-black px-6 py-3 rounded-2xl font-bold hover:bg-green-400 transition-all">
          {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {saved ? getTranslation('saved', language) : getTranslation('save_settings', language)}
        </button>
      </div>

      {/* API Keys - first for visibility */}
      <div className="glass rounded-[2.5rem] p-8 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.05)] space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2"><Key className="text-yellow-400" /> API-nøkler</h3>
          <button onClick={handleSaveApiKeys} className="flex items-center gap-2 bg-yellow-500 text-black px-5 py-2.5 rounded-2xl font-bold hover:bg-yellow-400 transition-all text-sm">
            {apiSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {apiSaved ? 'Lagret!' : 'Lagre nøkler'}
          </button>
        </div>
        <p className="text-slate-400 text-sm">Nøklene lagres kun lokalt i nettleseren din (localStorage). De sendes aldri til noen server.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gemini */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Google Gemini API-nøkkel</label>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Hent nøkkel <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKeys.gemini ? 'text' : 'password'}
                placeholder="AIza..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-yellow-500/50 pr-12 font-mono text-sm"
                value={apiKeys.gemini}
                onChange={e => setApiKeys({...apiKeys, gemini: e.target.value})}
              />
              <button onClick={() => setShowKeys(s => ({...s, gemini: !s.gemini}))} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showKeys.gemini ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {localStorage.getItem('olivia_gemini_api_key') && !apiKeys.gemini && (
              <p className="text-[10px] text-green-400">Aktiv: {maskKey(localStorage.getItem('olivia_gemini_api_key')!)}</p>
            )}
          </div>

          {/* Claude */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Anthropic Claude API-nøkkel</label>
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Hent nøkkel <ExternalLink size={10} />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKeys.claude ? 'text' : 'password'}
                placeholder="sk-ant-..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-yellow-500/50 pr-12 font-mono text-sm"
                value={apiKeys.claude}
                onChange={e => setApiKeys({...apiKeys, claude: e.target.value})}
              />
              <button onClick={() => setShowKeys(s => ({...s, claude: !s.claude}))} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showKeys.claude ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {localStorage.getItem('olivia_claude_api_key') && !apiKeys.claude && (
              <p className="text-[10px] text-green-400">Aktiv: {maskKey(localStorage.getItem('olivia_claude_api_key')!)}</p>
            )}
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-sm text-blue-300 space-y-1">
          <p className="font-bold">Prioritet ved AI-analyse:</p>
          <p>Claude-nøkkel satt → bruker Claude (claude-opus-4-6 / claude-sonnet-4-6)</p>
          <p>Kun Gemini-nøkkel → bruker Google Gemini</p>
          <p>Ingen nøkler → bruker miljøvariabel (GEMINI_API_KEY fra .env)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6">
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

        <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6">
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
