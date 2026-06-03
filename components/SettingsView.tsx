import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Crosshair,
  Globe,
  Key,
  Loader2,
  MapPin,
  RefreshCcw,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useTranslation } from '../services/i18nService';
import { Language } from '../types';
import { fetchSettings, saveSettings as dbSaveSettings } from '../services/db';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

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
type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

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
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saved, setSaved] = useState(false);
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

  const loadSettings = async () => {
    setLoadState('loading');
    setSaveWarning(null);
    try {
      const remote = await fetchSettings();
      if (remote) {
        const merged: SettingsState = {
          farmName: remote.farm_name || DEFAULT_SETTINGS.farmName,
          farmAddress: remote.farm_address || DEFAULT_SETTINGS.farmAddress,
          farmLat: remote.farm_lat || DEFAULT_SETTINGS.farmLat,
          farmLon: remote.farm_lon || DEFAULT_SETTINGS.farmLon,
          language: (remote.language as Language) || language,
          currency: remote.currency || DEFAULT_SETTINGS.currency,
        };
        setSettings(merged);
        setLoadState('supabase');
      } else {
        setSettings({ ...DEFAULT_SETTINGS, language });
        setLoadState('empty');
      }
    } catch (error) {
      setLoadState('error');
      setSaveWarning(error instanceof Error ? error.message : 'Kunne ikke hente innstillinger fra Supabase.');
    }
  };

  useEffect(() => {
    loadSettings();
    checkHealth('env');
  }, []);

  const handleSave = async () => {
    setSaveWarning(null);
    try {
      await dbSaveSettings({
        farm_name: settings.farmName,
        farm_address: settings.farmAddress,
        farm_lat: settings.farmLat,
        farm_lon: settings.farmLon,
        language: settings.language,
        currency: settings.currency,
      });
      onLanguageChange(settings.language);
      setLoadState('supabase');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('[SettingsView] Supabase save failed', message);
      setSaveWarning('Innstillingene ble ikke lagret. Sjekk farm_settings-tabellen og RLS i Supabase. Ingen viktig innstilling lagres lokalt i nettleseren.');
    }
  };

  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · standardverdier vises' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white mt-1">{t('settings')}</h2>
              <p className="text-xs text-slate-500 mt-2">Innstillinger lagres i Supabase `olivia.farm_settings`. API-nøkler lagres ikke i browser.</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-2">{sourceLabel}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadSettings} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all">
              {loadState === 'loading' ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            </button>
            <button onClick={handleSave} className="flex items-center gap-2 bg-[#d9b657] text-black px-6 py-3 rounded-2xl font-bold hover:bg-[#f0cf70] transition-all">
              {saved ? <CheckCircle2 size={20} /> : <Save size={20} />}
              {saved ? t('saved') : t('save_settings')}
            </button>
          </div>
        </div>
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

      <div className="glass rounded-[2.5rem] p-8 border border-yellow-500/20 space-y-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="text-yellow-400 flex-shrink-0" size={22} />
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2"><Key className="text-yellow-400" /> API-nøkler</h3>
            <p className="text-slate-400 text-sm mt-1">API-nøkler skal ikke lagres i nettleseren eller Supabase-tabeller. Legg dem i Vercel Environment Variables: <code className="bg-black/30 px-1.5 py-0.5 rounded">GEMINI_API_KEY</code>, <code className="bg-black/30 px-1.5 py-0.5 rounded">ANTHROPIC_API_KEY</code> og <code className="bg-black/30 px-1.5 py-0.5 rounded">OPENAI_API_KEY</code>.</p>
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
