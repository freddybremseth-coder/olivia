
import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff, AlertCircle, Sprout, ShieldAlert } from 'lucide-react';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'farmer' | 'super_admin';
  subscription: 'trial' | 'monthly' | 'annual';
  subscriptionStart: string;
  avatar: string;
}

function hashPassword(password: string): string {
  // Simple deterministic hash for local storage (not for production)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash * 31 + password.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0') + btoa(password.slice(0, 4)).replace(/=/g, '');
}

function getUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem('olivia_users') || '[]');
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem('olivia_users', JSON.stringify(users));
}

const ADMIN_CODE = 'OLIVIA-ADMIN-2024';

interface LoginModalProps {
  onClose: () => void;
  onLogin: (user: StoredUser, isAdmin: boolean) => void;
  defaultMode?: 'login' | 'register';
}

const LoginModal: React.FC<LoginModalProps> = ({ onClose, onLogin, defaultMode = 'login' }) => {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setError('');
    if (!email || !password) { setError('Fyll inn e-post og passord.'); return; }

    const users = getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) { setError('Finner ingen konto med denne e-posten.'); return; }
    if (user.passwordHash !== hashPassword(password)) { setError('Feil passord. Prøv igjen.'); return; }

    const isAdmin = user.role === 'super_admin';
    onLogin(user, isAdmin);
  };

  const handleRegister = () => {
    setError('');
    if (!name.trim()) { setError('Skriv inn ditt navn.'); return; }
    if (!email || !email.includes('@')) { setError('Ugyldig e-postadresse.'); return; }
    if (password.length < 6) { setError('Passordet må være minst 6 tegn.'); return; }

    const users = getUsers();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      setError('En konto med denne e-posten finnes allerede.'); return;
    }

    const isAdmin = adminCode === ADMIN_CODE;
    const newUser: StoredUser = {
      id: 'u_' + Date.now(),
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      role: isAdmin ? 'super_admin' : 'farmer',
      subscription: 'trial',
      subscriptionStart: new Date().toISOString().split('T')[0],
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=22c55e&color=000&size=256`
    };

    setLoading(true);
    setTimeout(() => {
      saveUsers([...users, newUser]);
      setLoading(false);
      onLogin(newUser, isAdmin);
    }, 600);
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

        {/* Tab switch */}
        <div className="flex gap-1 bg-white/5 rounded-2xl p-1 mb-8">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'login' ? 'bg-green-500 text-black' : 'text-slate-400 hover:text-white'}`}
          >
            Logg inn
          </button>
          <button
            onClick={() => { setMode('register'); setError(''); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'register' ? 'bg-green-500 text-black' : 'text-slate-400 hover:text-white'}`}
          >
            Opprett konto
          </button>
        </div>

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
              onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={mode === 'register' ? 'Passord (min. 6 tegn)' : 'Passord'}
              className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-12 py-3.5 text-white focus:outline-none focus:border-green-500/50 placeholder:text-slate-600"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
            />
            <button onClick={() => setShowPassword(s => !s)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {mode === 'register' && (
            <div className="relative">
              <ShieldAlert className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Admin-kode (valgfritt)"
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-5 py-3.5 text-white focus:outline-none focus:border-purple-500/50 placeholder:text-slate-600"
                value={adminCode}
                onChange={e => setAdminCode(e.target.value)}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={mode === 'login' ? handleLogin : handleRegister}
            disabled={loading}
            className="w-full bg-green-500 text-black py-4 rounded-2xl font-bold text-base hover:bg-green-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Oppretter konto...' : mode === 'login' ? 'Logg inn' : 'Opprett konto'}
          </button>
        </div>

        {mode === 'login' && (
          <p className="text-center text-slate-500 text-sm mt-6">
            Har du ikke konto?{' '}
            <button onClick={() => { setMode('register'); setError(''); }} className="text-green-400 hover:text-green-300 font-bold">
              Registrer deg
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export { hashPassword, getUsers, type StoredUser };
export default LoginModal;
