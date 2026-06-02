import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Crosshair,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  Loader2,
  MapPin,
  RefreshCcw,
  Save,
} from 'lucide-react';
import { useTranslation } from '../services/i18nService';
import { Language } from '../types';
import { fetchSettings, saveSettings as dbSaveSettings } from '../services/db';

interface SettingsViewProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

type SettingsState = {
  farmName: string;
  farmAddress: string;
  farmLat: string;
  farmLon: string;
  language: Language;
  currency: string;
};

type Health = { configured: boolean; ok: boolean; status?: number; error?: string };

const DEFAULT_SETTINGS: SettingsState = {
  farmName: 'DonaAnna',
  farmAddress: 'Biar, Alicante, Spain',
  farmLat: '38.6294',
  farmLon: '-0.7667',
  language: 'no',
  currency: 'EUR',
};

const inputClass = 'w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-green-500/50';

const SettingsView: React.FC<SettingsViewProps> = ({ language, onLanguageChange }) => {
  const { t } = useTranslation(language);
  const [settings, setSettings] = useState<SettingsState>({ ...DEFAULT_SETTINGS, language });
  const [apiKeys, setApiKeys] = useState({ gemini: '', claude: '' });
  const [showKeys, setShowKeys] = useState({ gemini: false, claude: false });
  const [saved, setSaved] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [health, setHealth] = useState<{ gemini: Health; anthropic: Health; openai: Health } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthMode, setHealthMode] = useState<'env' | 'probe'>('env');

  const checkHealth = async (mode: 'env' | 'probe' = 'env') => {
    setHealthLoading(true);
    setHealthMode(mode);
    try {
      const res = await fetch(`/api/ai/health${mode === 'probe' ? '?probe=1' : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setHealth(await res.json());
    } catch (err) {
      console.error('[SettingsView] health check failed', err);
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    const local = localStorage.getItem('olivia_settings');
    if (local) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(local) });
      } catch {
        setSettings({ ...DEFAULT_SETTINGS, language });
      }
    }

    fetchSettings()
      .then(remote => {
        if (!remote) return;
        const merged: SettingsState = {
          farmName: remote.farm_name || DEFAULT_SETTINGS.farmName,
          farmAddress: remote.farm_address || DEFAULT_SETTINGS.farmAddress,
          farmLat: remote.farm_lat || DEFAULT_SETTINGS.farmLat,
          farmLon: remote.farm_lon || DEFAULT_SETTINGS.farmLon,
          language: (remote.language as Language) || language,
          currency: remote.currency || DEFAULT_SETTINGS.currency,
        };
        setSettings(merged);
        localStorage.setItem('olivia_settings', JSON.stringify(merged));
      })
      .catch(error => console.warn('[SettingsView] fetchSettings fallback to localStorage', error));

    setApiKeys({
      gemini: localStorage.getItem('olivia_gemini_api_key') || '',
      claude: localStorage.getItem('olivia_claude_api_key') || '',
    });
    checkHealth('env');
  }, []);

  const handleSave = async () => {
    setSaveWarning(null);

    localStorage.setItem('olivia_settings', JSON.stringify(settings));
    onLanguageChange(settings.language);
    window.dispatchEvent(new Event('storage'));

    try {
      await dbSaveSettings({
        farm_name: settings.farmName,
        farm_address: settings.farmAddress,
        farm_lat: settings.farmLat,
        farm_lon: settings.farmLon,
        language: settings.language,
        currency: settings.currency,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[SettingsView] Supabase save failed, local settings saved', message);
      setSaveWarning('Lagret lokalt i nettleseren. Supabase-lagring feilet, sannsynligvis fordi farm_settings-tabellen/kolonnene eller RLS ikke er riktig satt opp ennå.');
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">{t('settings')}</h2>
          <p className="text-xs text-slate-500 mt-1">DonaAnna / Olivia OS · lokale innstillinger med Supabase-synk når tabellen er klar</p>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 bg-green-500 text-black px-6 py-3 rounded-2xl font-bold hover:bg-green-400 transition-all">
          {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
          {saved ? t('saved') : t('save_settings')}
        </button>
      </div>

      {saveWarning && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-200 flex gap-3">
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
          <p>{saveWarning}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><Building2 className="text-green-400" /> {t('farm_config')}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('farm_name')}</label>
              <input type="text" className={inputClass} value={settings.farmName} onChange={e => setSettings({ ...settings, farmName: e.target.value })} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('address_label')}</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input type="text" className={`${inputClass} pl-11`} value={settings.farmAddress} onChange={e => setSettings({ ...settings, farmAddress: e.target.value })} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gårds-koordinater</label>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) return;
                    navigator.geolocation.getCurrentPosition(pos => setSettings(s => ({ ...s, farmLat: pos.coords.latitude.toFixed(6), farmLon: pos.coords.longitude.toFixed(6) })));
                  }}
                  className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 font-bold"
                >
                  <Crosshair size={12} /> Bruk GPS
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.0001" placeholder="38.6294" className={`${inputClass} font-mono`} value={settings.farmLat} onChange={e => setSettings({ ...settings, farmLat: e.target.value })} />
                <input type="number" step="0.0001" placeholder="-0.7667" className={`${inputClass} font-mono`} value={settings.farmLon} onChange={e => setSettings({ ...settings, farmLon: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-[2.5rem] p-8 border border-white/10 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><Globe className="text-blue-400" /> {t('language_label')}</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('language_label')}</label>
              <select className={inputClass} value={settings.language} onChange={e => setSettings({ ...settings, language: e.target.value as Language })}>
                <option value="en">English 🇬🇧</option>
                <option value="es">Español 🇪🇸</option>
                <option value="it">Italiano 🇮🇹</option>
                <option value="fr">Français 🇫🇷</option>
                <option value="no">Norsk 🇳🇴</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">{t('currency')}</label>
              <select className={inputClass} value={settings.currency} onChange={e => setSettings({ ...settings, currency: e.target.value })}>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="NOK">NOK (kr)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] p-8 border border-yellow-500/20 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2"><Key className="text-yellow-400" /> {t('api_keys')}</h3>
            <p className="text-slate-400 text-sm mt-1">{t('keys_stored_locally')}</p>
          </div>
          <button onClick={handleSaveApiKeys} className="flex items-center gap-2 bg-yellow-500 text-black px-5 py-2.5 rounded-2xl font-bold hover:bg-yellow-400 transition-all text-sm">
            {apiSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {apiSaved ? t('saved') : t('save_keys')}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('google_gemini_api_key')}</label>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">{t('get_key')} <ExternalLink size={10} /></a>
            </div>
            <div className="relative">
              <input type={showKeys.gemini ? 'text' : 'password'} placeholder="AIza..." className={`${inputClass} pr-12`} value={apiKeys.gemini} onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })} />
              <button onClick={() => setShowKeys(s => ({ ...s, gemini: !s.gemini }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showKeys.gemini ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            {apiKeys.gemini && <p className="text-[10px] text-green-400">Aktiv: {maskKey(apiKeys.gemini)}</p>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('anthropic_claude_api_key')}</label>
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">{t('get_key')} <ExternalLink size={10} /></a>
            </div>
            <div className="relative">
              <input type={showKeys.claude ? 'text' : 'password'} placeholder="sk-ant-..." className={`${inputClass} pr-12`} value={apiKeys.claude} onChange={e => setApiKeys({ ...apiKeys, claude: e.target.value })} />
              <button onClick={() => setShowKeys(s => ({ ...s, claude: !s.claude }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{showKeys.claude ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            {apiKeys.claude && <p className="text-[10px] text-green-400">Aktiv: {maskKey(apiKeys.claude)}</p>}
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-8 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Activity size={18} className="text-green-400" /> AI-helsesjekk</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sjekker om Gemini, Claude og OpenAI er konfigurert i Vercel.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => checkHealth('env')} disabled={healthLoading} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl border border-white/10 flex items-center gap-2">{healthLoading && healthMode === 'env' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />} Nøkler</button>
            <button onClick={() => checkHealth('probe')} disabled={healthLoading} className="px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 text-xs font-bold rounded-xl border border-green-500/20 flex items-center gap-2">{healthLoading && healthMode === 'probe' ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />} Sjekk live</button>
          </div>
        </div>

        {!health && !healthLoading && <p className="text-xs text-slate-500 italic">Ingen helsedata. Klikk en av knappene over.</p>}
        {health && (
          <div className="space-y-3">
            {(['gemini', 'anthropic', 'openai'] as const).map(provider => {
              const h = health[provider];
              const label = provider === 'gemini' ? 'Gemini (Google)' : provider === 'anthropic' ? 'Claude (Anthropic)' : 'OpenAI (ChatGPT)';
              const envName = provider === 'gemini' ? 'GEMINI_API_KEY' : provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY';
              return (
                <div key={provider} className={`rounded-2xl border p-4 flex items-start gap-3 ${h.ok ? 'border-green-500/30 bg-green-500/5' : h.configured ? 'border-amber-500/30 bg-amber-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                  {h.ok ? <CheckCircle2 size={18} className="text-green-400 flex-shrink-0 mt-0.5" /> : <AlertTriangle size={18} className={`flex-shrink-0 mt-0.5 ${h.configured ? 'text-amber-400' : 'text-red-400'}`} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-bold text-white">{label}</p>
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full ${h.ok ? 'bg-green-500/15 text-green-400' : h.configured ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>{h.ok ? 'OK' : h.configured ? (healthMode === 'probe' ? 'FEIL' : 'KONFIGURERT') : 'MANGLER'}</span>
                    </div>
                    {!h.configured && <p className="text-xs text-red-300">Sett <code className="bg-black/30 px-1.5 py-0.5 rounded text-red-200">{envName}</code> i Vercel → Settings → Environment Variables, og redeploy.</p>}
                    {h.configured && h.error && <p className="text-xs text-amber-200 break-all">Status {h.status ?? '—'} · {h.error.slice(0, 200)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
