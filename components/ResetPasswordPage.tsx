/**
 * ResetPasswordPage — shown when the user arrives via a Supabase
 * password-recovery link. At that point Supabase has already exchanged
 * the hash-fragment tokens for a real session (it fires `PASSWORD_RECOVERY`
 * on onAuthStateChange). We just need to:
 *
 *  1) Collect a new password (twice, to catch typos).
 *  2) Call `updatePassword(...)`.
 *  3) Sign the user out and send them back to the login screen so they
 *     authenticate with the new password — this avoids leaving them in a
 *     "half-signed-in" state where the recovery session grants access.
 */

import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Sprout, Loader2 } from 'lucide-react';
import { updatePassword, signOut } from '../services/auth';

interface ResetPasswordPageProps {
  /** Called after the user either completes the flow or cancels. Parent
   *  clears the recovery flag and re-renders the normal login screen. */
  onDone: () => void;
}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (password.length < 6) { setError('Passordet må være minst 6 tegn.'); return; }
    if (password !== confirm) { setError('Passordene er ikke like.'); return; }
    setLoading(true);
    try {
      await updatePassword(password);
      // Sign out so the user has to log in explicitly with the new password —
      // this matches most apps' UX and avoids confusion about which session
      // is active after recovery.
      await signOut();
      setDone(true);
    } catch (e: any) {
      console.error('[ResetPassword] updatePassword failed:', e);
      setError(e?.message || 'Kunne ikke oppdatere passordet.');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = () => {
    // Scrub the recovery fragment/query so refreshing doesn't re-enter this view.
    if (typeof window !== 'undefined') {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex items-center justify-center p-4">
      <div className="bg-[#0f0f10] border border-white/10 rounded-[2.5rem] p-10 w-full max-w-md relative shadow-2xl">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
            <Sprout size={20} className="text-black" />
          </div>
          <h1 className="text-xl font-bold text-white">Olivia <span className="text-green-400">AI</span></h1>
        </div>

        {done ? (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Passordet er oppdatert</h2>
              <p className="text-slate-400 text-sm mt-2">Logg inn med det nye passordet for å fortsette.</p>
            </div>
            <button
              onClick={handleReturn}
              className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold text-base hover:bg-green-400 transition-all"
            >
              Gå til innlogging
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Velg nytt passord</h2>
              <p className="text-slate-500 text-sm mt-1">Passordet må være minst 6 tegn. Du blir logget inn på nytt etterpå.</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nytt passord"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white focus:outline-none focus:border-green-500/50 placeholder:text-slate-600"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  disabled={loading}
                  autoComplete="new-password"
                  autoFocus
                />
                <button onClick={() => setShowPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Gjenta passord"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:outline-none focus:border-green-500/50 placeholder:text-slate-600"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold text-base hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Oppdaterer...' : 'Lagre nytt passord'}
              </button>

              <button
                onClick={handleReturn}
                disabled={loading}
                className="w-full text-slate-500 hover:text-white text-xs font-bold py-2 transition-colors"
              >
                Avbryt og gå tilbake
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
