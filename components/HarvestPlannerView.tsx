import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  CloudRain,
  Factory,
  FlaskConical,
  Leaf,
  Loader2,
  Mountain,
  Plus,
  RefreshCcw,
  Save,
  Scale,
  ShieldCheck,
  Sun,
  Thermometer,
  X,
} from 'lucide-react';
import { DONA_ANNA_BIAR_SEASON_SETTINGS } from '../types/farmIoT';

type HarvestPurpose = 'table_olives' | 'oil' | 'mixed';
type HarvestReadiness = 'early' | 'monitor' | 'ready' | 'urgent';

type HarvestPlan = {
  id: string;
  variety: string;
  purpose: HarvestPurpose;
  zone_id: string;
  tree_group: string;
  estimated_kg: number;
  maturity_index: number;
  fruit_size: 'small' | 'medium' | 'large' | 'very_large';
  firmness: 'hard' | 'medium' | 'soft';
  notes?: string;
  planned_date?: string;
  created_at: string;
};

type WeatherWindow = {
  rainNext7d?: number;
  minTempNext7d?: number;
  maxTempNext7d?: number;
  dryDaysNext7d?: number;
};

const VARIETIES = ['Gordal', 'Genovesa', 'Changlot Real', 'Blanding'];

const demoPlans: HarvestPlan[] = [
  {
    id: 'demo-harvest-1',
    variety: 'Gordal',
    purpose: 'table_olives',
    zone_id: 'zone-a',
    tree_group: 'Unge Gordal',
    estimated_kg: 450,
    maturity_index: 2.2,
    fruit_size: 'large',
    firmness: 'hard',
    notes: 'Demo: følg størrelse og fasthet. Bordoliven vurderes tidligere enn olje.',
    planned_date: '2026-10-20',
    created_at: new Date().toISOString(),
  },
  {
    id: 'demo-harvest-2',
    variety: 'Changlot Real',
    purpose: 'oil',
    zone_id: 'zone-b',
    tree_group: 'Eldre blanding',
    estimated_kg: 5200,
    maturity_index: 1.8,
    fruit_size: 'medium',
    firmness: 'medium',
    notes: 'Demo: Biar 650 moh. oljehøsting normalt senere enn kyst/lavland.',
    planned_date: '2026-11-25',
    created_at: new Date().toISOString(),
  },
];

function defaultPlanDate(purpose: HarvestPurpose): string {
  const year = new Date().getFullYear();
  if (purpose === 'table_olives') return `${year}-10-20`;
  if (purpose === 'oil') return `${year}-11-25`;
  return `${year}-11-10`;
}

function purposeLabel(purpose: HarvestPurpose): string {
  if (purpose === 'table_olives') return 'Bordoliven';
  if (purpose === 'oil') return 'Olje';
  return 'Blandet';
}

function fruitSizeLabel(size: HarvestPlan['fruit_size']): string {
  if (size === 'very_large') return 'Svært stor';
  if (size === 'large') return 'Stor';
  if (size === 'medium') return 'Middels';
  return 'Liten';
}

function getLocalPlans(): HarvestPlan[] {
  try {
    const raw = localStorage.getItem('olivia_harvest_plans');
    if (!raw) return demoPlans;
    const parsed = JSON.parse(raw) as HarvestPlan[];
    return parsed.length ? parsed : demoPlans;
  } catch {
    return demoPlans;
  }
}

function saveLocalPlans(plans: HarvestPlan[]) {
  localStorage.setItem('olivia_harvest_plans', JSON.stringify(plans));
}

function monthName(month: number): string {
  return new Date(2026, month - 1, 1).toLocaleString('no-NO', { month: 'long' });
}

function readinessForPlan(plan: HarvestPlan, weather?: WeatherWindow): { status: HarvestReadiness; title: string; reasons: string[]; action: string } {
  const reasons: string[] = [];
  let status: HarvestReadiness = 'monitor';
  let title = 'Følg modning';
  let action = 'Fortsett modenhetskontroll med feltobservasjoner, bilder og notater.';

  if (plan.purpose === 'table_olives') {
    if (plan.maturity_index >= 1.5 && plan.maturity_index <= 3.2 && ['large', 'very_large'].includes(plan.fruit_size) && plan.firmness !== 'soft') {
      status = 'ready';
      title = 'Aktuell for bordoliven-vurdering';
      action = 'Kontroller størrelse, fasthet, skadegrad og smak. Planlegg rask prosessering/lake hvis kvaliteten er god.';
      reasons.push('Bordoliven prioriterer størrelse, fasthet og lav skadegrad mer enn høy modenhetsindeks.');
    } else if (plan.maturity_index > 3.5 || plan.firmness === 'soft') {
      status = 'urgent';
      title = 'Risiko for sen bordoliven';
      action = 'Vurder om partiet bør gå til olje i stedet for bordoliven.';
      reasons.push('Mykere/fruktere frukt kan være mindre egnet til premium bordoliven.');
    } else {
      status = 'monitor';
      reasons.push('Bordoliven bør følges tett fra oktober i Biar, men faktisk dato styres av sort og kvalitet.');
    }
  }

  if (plan.purpose === 'oil') {
    if (plan.maturity_index >= 2.5 && plan.maturity_index <= 4.5) {
      status = 'ready';
      title = 'Aktuell for premium olje-vurdering';
      action = 'Planlegg høsting og pressing med kort tid fra tre til mølle/presse. Vurder ønsket profil: grønn/pungent vs. mildere.';
      reasons.push('Modenhetsindeks er innenfor et aktuelt premium olje-vindu.');
    } else if (plan.maturity_index > 5) {
      status = 'urgent';
      title = 'Sen oljehøsting';
      action = 'Prioriter høsting hvis kvalitet, vær og kapasitet tillater det.';
      reasons.push('Høy modenhetsindeks kan gi mildere olje og risiko for lavere friskhet.');
    } else {
      status = 'monitor';
      reasons.push('For olje i Biar er november–desember ofte mer aktuelt enn lavland, men prøver må avgjøre.');
    }
  }

  if (plan.purpose === 'mixed') {
    status = plan.maturity_index >= 2.5 ? 'ready' : 'monitor';
    title = plan.maturity_index >= 2.5 ? 'Klar for sortering mellom bordoliven og olje' : 'Følg videre og sorter senere';
    action = 'Sorter frukt etter størrelse/skadegrad: beste store frukt til bordoliven, resten til olje.';
    reasons.push('Blandet parti bør vurderes med både størrelse, fasthet og modenhet.');
  }

  if (weather?.rainNext7d && weather.rainNext7d > 20) {
    reasons.push(`Det er meldt ca. ${Math.round(weather.rainNext7d)} mm regn neste 7 dager.`);
    if (status === 'ready') action = 'Vurder å høste før større regn hvis kvalitet og logistikk er klar.';
  }

  if (weather?.minTempNext7d !== undefined && weather.minTempNext7d <= 2) {
    reasons.push(`Lav temperatur/frostrisiko i prognosen: ${Math.round(weather.minTempNext7d)} °C.`);
    if (status === 'ready') status = 'urgent';
    action = 'Følg frostfare tett. Prioriter utsatte soner hvis frukten er nær ønsket modenhet.';
  }

  if (!reasons.length) reasons.push('Ingen klare avvik. Bruk feltkontroll som fasit.');
  return { status, title, reasons, action };
}

function statusClass(status: HarvestReadiness): string {
  if (status === 'urgent') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (status === 'ready') return 'border-green-500/25 bg-green-500/10 text-green-400';
  if (status === 'monitor') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function statusLabel(status: HarvestReadiness): string {
  if (status === 'urgent') return 'Prioriter';
  if (status === 'ready') return 'Klar/aktuell';
  if (status === 'monitor') return 'Følg med';
  return 'Tidlig';
}

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function fetchWeatherWindow(): Promise<WeatherWindow> {
  const lat = 38.6294;
  const lon = -0.7667;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&elevation=650&daily=precipitation_sum,temperature_2m_min,temperature_2m_max&forecast_days=7&timezone=auto`;
  const response = await fetch(url);
  const json = await response.json();
  const daily = json?.daily;
  if (!daily) return {};
  const rain = (daily.precipitation_sum || []).reduce((acc: number, value: number) => acc + (Number(value) || 0), 0);
  const minTemp = Math.min(...(daily.temperature_2m_min || []).map(Number).filter(Number.isFinite));
  const maxTemp = Math.max(...(daily.temperature_2m_max || []).map(Number).filter(Number.isFinite));
  const dryDays = (daily.precipitation_sum || []).filter((v: number) => Number(v) < 1).length;
  return { rainNext7d: Math.round(rain), minTempNext7d: Number.isFinite(minTemp) ? minTemp : undefined, maxTempNext7d: Number.isFinite(maxTemp) ? maxTemp : undefined, dryDaysNext7d: dryDays };
}

const HarvestPlannerView: React.FC = () => {
  const [plans, setPlans] = useState<HarvestPlan[]>(demoPlans);
  const [weather, setWeather] = useState<WeatherWindow>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [form, setForm] = useState<Partial<HarvestPlan>>({
    variety: 'Gordal',
    purpose: 'table_olives',
    zone_id: 'zone-a',
    tree_group: 'Gordal',
    estimated_kg: 500,
    maturity_index: 2,
    fruit_size: 'large',
    firmness: 'hard',
    planned_date: defaultPlanDate('table_olives'),
    notes: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      setPlans(getLocalPlans());
      const window = await fetchWeatherWindow();
      setWeather(window);
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('[HarvestPlannerView] Could not load weather window.', error);
      setPlans(getLocalPlans());
      setLastRefresh(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const enrichedPlans = useMemo(() => plans.map(plan => ({ plan, advice: readinessForPlan(plan, weather) })).sort((a, b) => {
    const order = { urgent: 4, ready: 3, monitor: 2, early: 1 };
    return order[b.advice.status] - order[a.advice.status];
  }), [plans, weather]);

  const stats = useMemo(() => {
    const totalKg = plans.reduce((acc, plan) => acc + (plan.estimated_kg || 0), 0);
    const tableKg = plans.filter(plan => plan.purpose === 'table_olives').reduce((acc, plan) => acc + (plan.estimated_kg || 0), 0);
    const oilKg = plans.filter(plan => plan.purpose === 'oil').reduce((acc, plan) => acc + (plan.estimated_kg || 0), 0);
    const ready = enrichedPlans.filter(item => item.advice.status === 'ready' || item.advice.status === 'urgent').length;
    return { totalKg, tableKg, oilKg, ready };
  }, [plans, enrichedPlans]);

  const savePlan = () => {
    if (!form.variety || !form.purpose || !form.zone_id) return;
    const plan: HarvestPlan = {
      id: `harvest-${Date.now()}`,
      variety: form.variety,
      purpose: form.purpose,
      zone_id: form.zone_id,
      tree_group: form.tree_group || form.variety,
      estimated_kg: Number(form.estimated_kg || 0),
      maturity_index: Number(form.maturity_index || 0),
      fruit_size: form.fruit_size || 'medium',
      firmness: form.firmness || 'medium',
      planned_date: form.planned_date,
      notes: form.notes,
      created_at: new Date().toISOString(),
    };
    const updated = [plan, ...plans];
    setPlans(updated);
    saveLocalPlans(updated);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Leaf className="text-green-400" /> Høsteplan Biar</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">DonaAnna · 650 moh. · Gordal / Genovesa / Changlot Real · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <button onClick={() => setIsFormOpen(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Plus size={20} /> Ny høsteplan</button>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4">
          <Mountain className="text-green-400 mt-1" />
          <div>
            <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-2">Biar 650 moh. høsteprofil</p>
            <p className="text-white font-bold">Bordoliven: {monthName(DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_table_olives.start_month)}–{monthName(DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_table_olives.end_month)} · Olje: {monthName(DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_oil.start_month)}–{monthName(DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_oil.end_month)}</p>
            <p className="text-xs text-slate-500 mt-2">Biar ligger høyt og kjøligere enn kyst/lavland. Kalenderen er veiledende; modenhet, sort, vær og ønsket kvalitet bestemmer faktisk høsting.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Planlagt kg', value: stats.totalKg.toLocaleString('no-NO'), icon: <Scale size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Bordoliven kg', value: stats.tableKg.toLocaleString('no-NO'), icon: <ShieldCheck size={18} />, cls: 'border-lime-500/20 bg-lime-500/10 text-lime-400' },
          { label: 'Olje kg', value: stats.oilKg.toLocaleString('no-NO'), icon: <Factory size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Klar/aktuell', value: stats.ready, icon: <CheckCircle2 size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass rounded-[2rem] p-5 border border-white/10"><CloudRain className="text-blue-400 mb-3" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Regn neste 7 dager</p><p className="text-3xl text-white font-black mt-1">{weather.rainNext7d ?? '—'} mm</p></div>
        <div className="glass rounded-[2rem] p-5 border border-white/10"><Thermometer className="text-orange-400 mb-3" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Min / maks temp</p><p className="text-3xl text-white font-black mt-1">{weather.minTempNext7d !== undefined ? Math.round(weather.minTempNext7d) : '—'}° / {weather.maxTempNext7d !== undefined ? Math.round(weather.maxTempNext7d) : '—'}°</p></div>
        <div className="glass rounded-[2rem] p-5 border border-white/10"><Sun className="text-yellow-400 mb-3" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tørre dager</p><p className="text-3xl text-white font-black mt-1">{weather.dryDaysNext7d ?? '—'} / 7</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {enrichedPlans.map(({ plan, advice }) => (
          <div key={plan.id} className={`glass rounded-[2rem] p-6 border ${statusClass(advice.status)}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{statusLabel(advice.status)} · {purposeLabel(plan.purpose)}</p>
                <h3 className="text-xl text-white font-bold">{plan.variety} · {plan.zone_id}</h3>
                <p className="text-xs text-slate-500 mt-1">{plan.tree_group} · planlagt {plan.planned_date || 'ikke satt'}</p>
              </div>
              <div className="text-right"><p className="text-[10px] text-slate-500">kg</p><p className="text-3xl text-white font-black">{plan.estimated_kg}</p></div>
            </div>

            <p className="text-white font-bold mt-5">{advice.title}</p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{advice.action}</p>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Modning</p><p className="text-sm text-white font-bold mt-1">{plan.maturity_index}</p></div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Størrelse</p><p className="text-sm text-white font-bold mt-1">{fruitSizeLabel(plan.fruit_size)}</p></div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Fasthet</p><p className="text-sm text-white font-bold mt-1">{plan.firmness}</p></div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 space-y-1">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Grunnlag</p>
              {advice.reasons.map(reason => <p key={reason} className="text-xs text-slate-400 leading-relaxed">• {reason}</p>)}
              {plan.notes && <p className="text-xs text-slate-500 mt-3">Notat: {plan.notes}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
        <div className="flex items-start gap-3">
          <FlaskConical size={18} className="text-green-400 mt-0.5" />
          <div>
            <p className="text-sm text-white font-bold">Premium kvalitet</p>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">For premium EVOO og høyt polyfenolnivå er rask prosessering, frisk frukt, ren høsting og riktig modenhetsgrad viktig. Bruk høsteplanen sammen med feltlogg, værvindu og batch/sporbarhet.</p>
          </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center"><div><h3 className="text-2xl font-bold text-white">Ny høsteplan</h3><p className="text-xs text-slate-500 mt-1">Registrer sort, formål og modenhet</p></div><button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button></div>
            <div className="grid grid-cols-2 gap-3">
              <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" value={form.variety} onChange={e => setForm(prev => ({ ...prev, variety: e.target.value }))}>{VARIETIES.map(v => <option key={v} value={v}>{v}</option>)}</select>
              <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" value={form.purpose} onChange={e => { const purpose = e.target.value as HarvestPurpose; setForm(prev => ({ ...prev, purpose, planned_date: defaultPlanDate(purpose) })); }}><option value="table_olives">Bordoliven</option><option value="oil">Olje</option><option value="mixed">Blandet</option></select>
            </div>
            <div className="grid grid-cols-2 gap-3"><input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Sone" value={form.zone_id || ''} onChange={e => setForm(prev => ({ ...prev, zone_id: e.target.value }))} /><input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Tregruppe" value={form.tree_group || ''} onChange={e => setForm(prev => ({ ...prev, tree_group: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3"><input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Estimert kg" value={form.estimated_kg || ''} onChange={e => setForm(prev => ({ ...prev, estimated_kg: Number(e.target.value) }))} /><input type="number" step="0.1" min="0" max="7" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" placeholder="Modenhetsindeks 0-7" value={form.maturity_index || ''} onChange={e => setForm(prev => ({ ...prev, maturity_index: Number(e.target.value) }))} /></div>
            <div className="grid grid-cols-2 gap-3"><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" value={form.fruit_size} onChange={e => setForm(prev => ({ ...prev, fruit_size: e.target.value as HarvestPlan['fruit_size'] }))}><option value="small">Liten</option><option value="medium">Middels</option><option value="large">Stor</option><option value="very_large">Svært stor</option></select><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" value={form.firmness} onChange={e => setForm(prev => ({ ...prev, firmness: e.target.value as HarvestPlan['firmness'] }))}><option value="hard">Hard</option><option value="medium">Middels</option><option value="soft">Myk</option></select></div>
            <input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none" value={form.planned_date || fmtDate(new Date())} onChange={e => setForm(prev => ({ ...prev, planned_date: e.target.value }))} />
            <textarea className="w-full min-h-[110px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none" placeholder="Notat om kvalitet, skade, størrelse, smak, logistikk eller presse" value={form.notes || ''} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} />
            <button onClick={savePlan} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-2"><Save size={20} /> Lagre høsteplan</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HarvestPlannerView;
