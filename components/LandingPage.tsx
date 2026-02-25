
import React from 'react';
import { Sprout, ShieldCheck, TrendingUp, Zap, ChevronRight, Check, ShieldAlert } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
  onAdminLogin: () => void;
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onAdminLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-green-500/30">
      {/* Hero Section */}
      <nav className="h-20 border-b border-white/10 px-8 flex items-center justify-between glass sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center neon-glow-green">
            <span className="font-bold text-xl text-black">O</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">Olivia <span className="text-green-400">AI</span></h1>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onAdminLogin} className="text-xs text-slate-500 hover:text-purple-400 flex items-center gap-1 transition-colors">
            <ShieldAlert size={14} /> Admin Access
          </button>
          <button onClick={onLogin} className="bg-white/5 hover:bg-white/10 px-6 py-2 rounded-xl text-sm font-bold border border-white/10 transition-all">Logg inn</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-20">
        <div className="text-center space-y-8 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase border border-green-500/20">
            <Zap size={14} /> Fremtidens landbruk er her
          </div>
          <h2 className="text-6xl md:text-7xl font-bold tracking-tighter leading-none">
            Maksimalt utbytte med <span className="text-green-400">kunstig intelligens.</span>
          </h2>
          <p className="text-xl text-slate-400 leading-relaxed">
            Olivia AI gir deg full kontroll over olivenlunden din. Fra Catastro-intelligens til IoT-overvåking og økonomisk analyse.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <button onClick={onRegister} className="bg-green-500 text-black px-8 py-4 rounded-2xl font-bold text-lg hover:bg-green-400 transition-all shadow-xl shadow-green-500/20 flex items-center gap-2">
              Start din gratis prøveperiode <ChevronRight size={20} />
            </button>
            <p className="text-slate-500 text-sm italic">Ingen kredittkort kreves for å starte.</p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-32">
          {[
            { icon: Sprout, title: 'Presisjonslandbruk', desc: 'AI-drevet analyse av jordsmonn og plantehelse i sanntid.' },
            { icon: ShieldCheck, title: 'Nota Simple & Juridisk', desc: 'Sikker lagring og AI-analyse av skjøter og tillatelser.' },
            { icon: TrendingUp, title: 'Økonomisk Oversikt', desc: 'Full kontroll på marginer, innhøsting og produksjonskostnader.' }
          ].map((f, i) => (
            <div key={i} className="glass p-8 rounded-[2.5rem] border border-white/10 hover:border-green-500/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-400 mb-6 border border-green-500/20">
                <f.icon size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="py-20">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold mb-4">Enkel og transparent prising</h3>
            <p className="text-slate-400">Velg planen som passer din gårdsdrift.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Monthly */}
            <div className="glass p-10 rounded-[3rem] border border-white/10 relative overflow-hidden group hover:border-green-500/40 transition-all">
              <h4 className="text-xl font-bold mb-2">Månedlig</h4>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold">9€</span>
                <span className="text-slate-500">/mnd</span>
              </div>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-slate-300"><Check size={18} className="text-green-400" /> 1 Parsell inkludert</li>
                <li className="flex items-center gap-3 text-slate-300"><Check size={18} className="text-green-400" /> 1€ pr ekstra parsell</li>
                <li className="flex items-center gap-3 text-slate-300"><Check size={18} className="text-green-400" /> Full AI-analyse</li>
                <li className="flex items-center gap-3 text-slate-300"><Check size={18} className="text-green-400" /> Dokumenthvelv</li>
              </ul>
              <button onClick={onRegister} className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all">Velg Månedlig</button>
            </div>
            {/* Annual */}
            <div className="glass p-10 rounded-[3rem] border border-green-500/50 relative overflow-hidden bg-green-500/5 shadow-2xl shadow-green-500/10">
              <div className="absolute top-6 right-6 bg-green-500 text-black text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Best verdi</div>
              <h4 className="text-xl font-bold mb-2">Årlig</h4>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-5xl font-bold">92€</span>
                <span className="text-slate-500">/år</span>
              </div>
              <p className="text-green-400 text-sm font-bold mb-6">Spar 15% (ca. 16€ rabatt)</p>
              <ul className="space-y-4 mb-10">
                <li className="flex items-center gap-3 text-slate-300"><Check size={18} className="text-green-400" /> Alt i Månedlig</li>
                <li className="flex items-center gap-3 text-slate-300"><Check size={18} className="text-green-400" /> Prioritert support</li>
                <li className="flex items-center gap-3 text-slate-300"><Check size={18} className="text-green-400" /> Ubegrenset lagring</li>
              </ul>
              <button onClick={onRegister} className="w-full py-4 rounded-2xl bg-green-500 text-black font-bold hover:bg-green-400 transition-all shadow-lg">Velg Årlig</button>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 py-12 px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3 grayscale opacity-50">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="font-bold text-black">O</span>
            </div>
            <span className="font-bold">Olivia AI</span>
          </div>
          <p className="text-slate-600 text-sm">© 2024 Olivia AI S.L. Biar, Alicante.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
