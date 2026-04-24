
import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, Sprout, ShieldAlert, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { signInWithPassword, signUpWithPassword, sendPasswordReset, AuthResult } from '../services/auth';
import { isSupabaseConfigured } from '../services/supabaseClient';
import type { UserProfile } from '../types';

// Re-exported for legacy callers (App.tsx). Kept identical to the old shape so
// nothing else needs to change.
export type StoredUser = UserProfile;

interface LoginModalProps {
  onClose: () => void;
  onLogin: (user: StoredUser, isAdmin: boolean) => void;
  defaultMode?: 'login' | 'register';
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin, defaultMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(''); setInfo('');
    if (!email || !password) { setError('Fyll inn e-post og passord.'); return; }
    setLoading(true);
    try {
      const result: AuthResult = await signInWithPassword(email.trim(), password);
      onLogin(result.user, result.isAdmin);
    } catch (e: any) {
      // Always log the raw error — makes it easy to diagnose from DevTools
      // even when the UI shows the translated Norwegian text.
      console.error('[Login] signInWithPassword failed:', e);
      setError(e?.message || 'Innlogging feilet.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(''); setInfo('');
    if (!name.trim()) { setError('Skriv inn ditt navn.'); return; }
    if (!email || !email.includes('@')) { setError('Ugyldig e-postadresse.'); return; }
    if (password.length < 6) { setError('Passordet må være minst 6 tegn.'); return; }
    setLoading(true);
    try {
      const result = await signUpWithPassword(email.trim(), password, name.trim(), adminCode || undefined);
      onLogin(result.user, result.isAdmin);
    } catch (e: any) {
      console.error('[Login] signUpWithPassword failed:', e);
      setError(e?.message || 'Kontoen kunne ikke opprettes.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setError(''); setInfo('');
    if (!email || !email.includes('@')) { setError('Ugyldig e-postadresse.'); return; }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setInfo('Hvis en konto finnes for denne e-posten, har vi sendt en lenke for å tilbakestille passordet. Sjekk innboks og spam-mappe.');
    } catch (e: any) {
      console.error('[Login] sendPasswordReset failed:', e);
      setError(e?.message || 'Kunne ikke sende e-post.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f0f10] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-md relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors">
          <X size={20} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
            <Sprout size={20} className="text-black" />
          </div>
          <h1 className="text-xl font-bold text-white">Olivia <span className="text-green-400">AI</span></h1>
        </div>

        {/* Config missing banner (surfaces the real cause of "spinner hangs forever") */}
        {!isSupabaseConfigured && (
          <div className="flex items-start gap-2 text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 mb-6">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Pålogging er ikke konfigurert.</p>
              <p className="opacity-80 mt-0.5">Administrator må sette <code>VITE_SUPABASE_URL</code> og <code>VITE_SUPABASE_ANON_KEY</code> på Vercel og re-deploye uten build-cache.</p>
            </div>
          </div>
        )}

        {/* Tab switch (hidden in reset mode so it doesn't steal focus) */}
        {mode !== 'reset' && (
          <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-8">
            <button
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? 'bg-green-500 text-black' : 'text-slate-400 hover:text-white'}`}
            >
              Logg inn
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); setInfo(''); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'register' ? 'bg-green-500 text-black' : 'text-slate-400 hover:text-white'}`}
            >
              Opprett konto
            </button>
          </div>
        )}

        {mode === 'reset' && (
          <div className="mb-6">
            <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-bold">
              <ArrowLeft size={14} /> Tilbake til innlogging
            </button>
            <h2 className="text-lg font-bold text-white mt-4">Tilbakestill passord</h2>
            <p className="text-slate-500 text-sm mt-1">Fyll inn e-posten din, så sender vi en lenke for å velge nytt passord.</p>
          </div>
        )}

        <div className="space-y-4">
          {mode === 'register' && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Ditt navn"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:outline-none focus:border-green-500/50 placeholder:text-slate-600"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRegister()}
                disabled={loading}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="email"
              placeholder="E-post"
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:outline-none focus:border-green-500/50 placeholder:text-slate-600"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => {
                if (e.key !== 'Enter') return;
                if (mode === 'login') handleLogin();
                else if (mode === 'register') handleRegister();
                else handleReset();
              }}
              disabled={loading}
              autoComplete="email"
            />
          </div>

          {mode !== 'reset' && (
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'Passord (min. 6 tegn)' : 'Passord'}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white focus:outline-none focus:border-green-500/50 placeholder:text-slate-600"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button onClick={() => setShowPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex justify-end -mt-1">
              <button
                onClick={() => { setMode('reset'); setError(''); setInfo(''); }}
                className="text-xs text-slate-400 hover:text-green-400 font-bold transition-colors"
                disabled={loading}
              >
                Glemt passord?
              </button>
            </div>
          )}

          {mode === 'register' && (
            <div className="relative">
              <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Admin-kode (valgfritt)"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:outline-none focus:border-purple-500/50 placeholder:text-slate-600"
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {info && (
            <div className="flex items-start gap-2 text-green-300 text-sm bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleReset}
            disabled={loading}
            className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold text-base hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading
              ? (mode === 'login' ? 'Logger inn...' : mode === 'register' ? 'Oppretter konto...' : 'Sender e-post...')
              : (mode === 'login' ? 'Logg inn' : mode === 'register' ? 'Opprett konto' : 'Send tilbakestillingslenke')}
          </button>
        </div>

        {mode === 'login' && (
          <p className="text-center text-slate-500 text-sm mt-6">
            Har du ikke konto?{' '}
            <button onClick={() => { setMode('register'); setError(''); setInfo(''); }} className="text-green-400 hover:text-green-300 font-bold">
              Registrer deg
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginModal;
