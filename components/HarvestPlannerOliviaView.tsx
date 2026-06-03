import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CloudRain,
  Edit3,
  Factory,
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
  Trash2,
  X,
} from 'lucide-react';
import type { Parcel } from '../types';
import { fetchOliviaParcels } from '../services/oliviaSchemaData';
import { DONA_ANNA_BIAR_SEASON_SETTINGS } from '../types/farmIoT';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

type HarvestPurpose = 'table_olives' | 'oil' | 'mixed';
type HarvestPlanStatus = 'planned' | 'approved' | 'done' | 'cancelled';
type HarvestReadiness = 'early' | 'monitor' | 'ready' | 'urgent';

type HarvestPlan = {
  id: string;
  parcel_id: string;
  parcel_name: string;
  variety: string;
  purpose: HarvestPurpose;
  status: HarvestPlanStatus;
  estimated_kg: number;
  actual_kg?: number;
  maturity_index: number;
  fruit_size: 'small' | 'medium' | 'large' | 'very_large';
  firmness: 'hard' | 'medium' | 'soft';
  planned_date: string;
  approved_at?: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
};

type WeatherWindow = {
  rainNext7d?: number;
  minTempNext7d?: number;
  maxTempNext7d?: number;
  dryDaysNext7d?: number;
};

const DEFAULT_VARIETIES = ['Gordal', 'Gordal Sevillana', 'Genovesa', 'Changlot Real', 'Arbequina', 'Picual', 'Hojiblanca', 'Manzanilla', 'Blanqueta', 'Blanding'];
const PLAN_KEY = 'olivia_harvest_plans_v2';
const VARIETY_KEY = 'olivia_olive_varieties_v1';

function fmtDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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

function statusLabel(status: HarvestPlanStatus): string {
  if (status === 'approved') return 'Godkjent';
  if (status === 'done') return 'Utført';
  if (status === 'cancelled') return 'Kansellert';
  return 'Planlagt';
}

function statusBadgeClass(status: HarvestPlanStatus): string {
  if (status === 'done') return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (status === 'approved') return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
  if (status === 'cancelled') return 'bg-red-500/15 text-red-400 border-red-500/30';
  return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
}

function fruitSizeLabel(size: HarvestPlan['fruit_size']): string {
  if (size === 'very_large') return 'Svært stor';
  if (size === 'large') return 'Stor';
  if (size === 'medium') return 'Middels';
  return 'Liten';
}

function monthName(month: number): string {
  return new Date(2026, month - 1, 1).toLocaleString('no-NO', { month: 'long' });
}

function getLocalPlans(): HarvestPlan[] {
  try {
    return JSON.parse(localStorage.getItem(PLAN_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalPlans(plans: HarvestPlan[]) {
  localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
}

function getLocalVarieties(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(VARIETY_KEY) || '[]');
    return Array.from(new Set([...DEFAULT_VARIETIES, ...stored])).filter(Boolean);
  } catch {
    return DEFAULT_VARIETIES;
  }
}

function saveLocalVariety(variety: string) {
  if (!variety.trim()) return;
  const current = getLocalVarieties();
  const updated = Array.from(new Set([...current, variety.trim()]));
  localStorage.setItem(VARIETY_KEY, JSON.stringify(updated));
}

function readinessForPlan(plan: HarvestPlan, weather?: WeatherWindow): { status: HarvestReadiness; title: string; reasons: string[]; action: string } {
  const reasons: string[] = [];
  let status: HarvestReadiness = 'monitor';
  let title = 'Følg modning';
  let action = 'Fortsett modenhetskontroll med feltobservasjoner, bilder og notater.';

  if (plan.status === 'done') {
    return { status: 'ready', title: 'Utført', reasons: ['Planen er markert som utført.'], action: 'Kontroller at faktisk kg, batch og økonomi er registrert.' };
  }

  if (plan.purpose === 'table_olives') {
    if (plan.maturity_index >= 1.5 && plan.maturity_index <= 3.2 && ['large', 'very_large'].includes(plan.fruit_size) && plan.firmness !== 'soft') {
      status = 'ready';
      title = 'Aktuell for bordoliven-vurdering';
      action = 'Kontroller størrelse, fasthet, skadegrad og smak. Godkjenn planen hvis logistikk og prosessering er klar.';
      reasons.push('Bordoliven prioriterer størrelse, fasthet og lav skadegrad mer enn høy modenhetsindeks.');
    } else if (plan.maturity_index > 3.5 || plan.firmness === 'soft') {
      status = 'urgent';
      title = 'Risiko for sen bordoliven';
      action = 'Vurder om denne parsellen bør flyttes fra bordoliven til olje.';
      reasons.push('Mykere eller mer moden frukt kan være mindre egnet til premium bordoliven.');
    } else {
      status = 'monitor';
      reasons.push('Bordoliven bør følges tett fra oktober i Biar, men faktisk dato styres av sort og kvalitet.');
    }
  }

  if (plan.purpose === 'oil') {
    if (plan.maturity_index >= 2.5 && plan.maturity_index <= 4.5) {
      status = 'ready';
      title = 'Aktuell for premium olje-vurdering';
      action = 'Godkjenn høsting når presse/logistikk er klar og du har ønsket modenhetsprofil.';
      reasons.push('Modenhetsindeks er innenfor aktuelt premium olje-vindu.');
    } else if (plan.maturity_index > 5) {
      status = 'urgent';
      title = 'Sen oljehøsting';
      action = 'Prioriter høsting hvis kvalitet, vær og kapasitet tillater det.';
      reasons.push('Høy modenhetsindeks kan gi mildere olje og risiko for lavere friskhet.');
    } else {
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
    action = 'Følg frostfare tett. Prioriter utsatte parceller hvis frukten er nær ønsket modenhet.';
  }

  if (!reasons.length) reasons.push('Ingen klare avvik. Bruk feltkontroll som fasit.');
  return { status, title, reasons, action };
}

function readinessClass(status: HarvestReadiness): string {
  if (status === 'urgent') return 'border-red-500/30 bg-red-500/10 text-red-400';
  if (status === 'ready') return 'border-green-500/25 bg-green-500/10 text-green-400';
  if (status === 'monitor') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
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

function emptyForm(parcels: Parcel[], varieties: string[]): Partial<HarvestPlan> {
  const firstParcel = parcels[0];
  return {
    parcel_id: firstParcel?.id || '',
    parcel_name: firstParcel?.name || '',
    variety: varieties[0] || 'Gordal',
    purpose: 'table_olives',
    status: 'planned',
    estimated_kg: 500,
    maturity_index: 2,
    fruit_size: 'large',
    firmness: 'hard',
    planned_date: defaultPlanDate('table_olives'),
    notes: '',
  };
}

const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50';
const labelClass = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2';

const HarvestPlannerOliviaView: React.FC = () => {
  const [plans, setPlans] = useState<HarvestPlan[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [varieties, setVarieties] = useState<string[]>(DEFAULT_VARIETIES);
  const [weather, setWeather] = useState<WeatherWindow>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVariety, setNewVariety] = useState('');
  const [form, setForm] = useState<Partial<HarvestPlan>>({});
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [parcelRows, weatherRows] = await Promise.all([fetchOliviaParcels().catch(() => []), fetchWeatherWindow().catch(() => ({}))]);
      const v = getLocalVarieties();
      setParcels(parcelRows);
      setVarieties(v);
      setPlans(getLocalPlans());
      setWeather(weatherRows);
      setForm(current => Object.keys(current).length ? current : emptyForm(parcelRows, v));
      setLastRefresh(new Date());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const enrichedPlans = useMemo(() => plans.map(plan => ({ plan, advice: readinessForPlan(plan, weather) })).sort((a, b) => {
    const statusOrder: Record<HarvestPlanStatus, number> = { planned: 4, approved: 3, done: 2, cancelled: 1 };
    const readinessOrder: Record<HarvestReadiness, number> = { urgent: 4, ready: 3, monitor: 2, early: 1 };
    return statusOrder[b.plan.status] - statusOrder[a.plan.status] || readinessOrder[b.advice.status] - readinessOrder[a.advice.status];
  }), [plans, weather]);

  const stats = useMemo(() => {
    const active = plans.filter(p => p.status !== 'cancelled');
    const totalKg = active.reduce((acc, plan) => acc + (plan.estimated_kg || 0), 0);
    const tableKg = active.filter(plan => plan.purpose === 'table_olives').reduce((acc, plan) => acc + (plan.estimated_kg || 0), 0);
    const oilKg = active.filter(plan => plan.purpose === 'oil').reduce((acc, plan) => acc + (plan.estimated_kg || 0), 0);
    const approved = plans.filter(plan => plan.status === 'approved').length;
    const done = plans.filter(plan => plan.status === 'done').length;
    return { totalKg, tableKg, oilKg, approved, done };
  }, [plans]);

  const openNewForm = () => {
    setEditingId(null);
    setForm(emptyForm(parcels, varieties));
    setIsFormOpen(true);
  };

  const openEditForm = (plan: HarvestPlan) => {
    setEditingId(plan.id);
    setForm(plan);
    setIsFormOpen(true);
  };

  const savePlan = () => {
    if (!form.variety || !form.purpose || !form.parcel_id || !form.planned_date) return;
    const parcel = parcels.find(p => p.id === form.parcel_id);
    const now = new Date().toISOString();
    const plan: HarvestPlan = {
      id: editingId || `harvest-${Date.now()}`,
      parcel_id: form.parcel_id,
      parcel_name: parcel?.name || form.parcel_name || form.parcel_id,
      variety: form.variety,
      purpose: form.purpose,
      status: form.status || 'planned',
      estimated_kg: Number(form.estimated_kg || 0),
      actual_kg: form.actual_kg ? Number(form.actual_kg) : undefined,
      maturity_index: Number(form.maturity_index || 0),
      fruit_size: form.fruit_size || 'medium',
      firmness: form.firmness || 'medium',
      planned_date: form.planned_date,
      approved_at: form.approved_at,
      completed_at: form.completed_at,
      notes: form.notes,
      created_at: form.created_at || now,
      updated_at: now,
    };
    const updated = editingId ? plans.map(p => p.id === editingId ? plan : p) : [plan, ...plans];
    setPlans(updated);
    saveLocalPlans(updated);
    setIsFormOpen(false);
    setEditingId(null);
  };

  const updatePlanStatus = (id: string, status: HarvestPlanStatus) => {
    const now = new Date().toISOString();
    const updated = plans.map(plan => plan.id === id ? {
      ...plan,
      status,
      approved_at: status === 'approved' ? now : plan.approved_at,
      completed_at: status === 'done' ? now : plan.completed_at,
      updated_at: now,
    } : plan);
    setPlans(updated);
    saveLocalPlans(updated);
  };

  const deletePlan = (id: string) => {
    const updated = plans.filter(plan => plan.id !== id);
    setPlans(updated);
    saveLocalPlans(updated);
  };

  const addVariety = () => {
    const value = newVariety.trim();
    if (!value) return;
    saveLocalVariety(value);
    const updated = getLocalVarieties();
    setVarieties(updated);
    setForm(prev => ({ ...prev, variety: value }));
    setNewVariety('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="glass rounded-[2rem] p-6 border border-[#d9b657]/20 bg-[#d9b657]/5"><DonaAnnaBrandMark variant="symbol" size="md" /></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Leaf className="text-green-400" /> Høsteplan Biar</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">Planlegg · rediger · godkjenn · sett som utført · parceller · alle sorter · oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
          <button onClick={openNewForm} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Plus size={20} /> Ny plan</button>
        </div>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4">
          <Mountain className="text-green-400 mt-1" />
          <div>
            <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-2">Biar 650 moh. høsteprofil</p>
            <p className="text-white font-bold">Bordoliven: {monthName(DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_table_olives.start_month)}–{monthName(DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_table_olives.end_month)} · Olje: {monthName(DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_oil.start_month)}–{monthName(DONA_ANNA_BIAR_SEASON_SETTINGS.harvest_window_oil.end_month)}</p>
            <p className="text-xs text-slate-500 mt-2">Dette er en plan, ikke bare historikk. Planer kan endres, godkjennes og settes som utført når høstingen faktisk er gjort.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Planlagt kg', value: stats.totalKg.toLocaleString('no-NO'), icon: <Scale size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Bordoliven kg', value: stats.tableKg.toLocaleString('no-NO'), icon: <ShieldCheck size={18} />, cls: 'border-lime-500/20 bg-lime-500/10 text-lime-400' },
          { label: 'Olje kg', value: stats.oilKg.toLocaleString('no-NO'), icon: <Factory size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Godkjent', value: stats.approved, icon: <CheckCircle2 size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Utført', value: stats.done, icon: <CalendarDays size={18} />, cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass rounded-[2rem] p-5 border border-white/10"><CloudRain className="text-blue-400 mb-3" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Regn neste 7 dager</p><p className="text-3xl text-white font-black mt-1">{weather.rainNext7d ?? '—'} mm</p></div>
        <div className="glass rounded-[2rem] p-5 border border-white/10"><Thermometer className="text-orange-400 mb-3" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Min / maks temp</p><p className="text-3xl text-white font-black mt-1">{weather.minTempNext7d !== undefined ? Math.round(weather.minTempNext7d) : '—'}° / {weather.maxTempNext7d !== undefined ? Math.round(weather.maxTempNext7d) : '—'}°</p></div>
        <div className="glass rounded-[2rem] p-5 border border-white/10"><Sun className="text-yellow-400 mb-3" /><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tørre dager</p><p className="text-3xl text-white font-black mt-1">{weather.dryDaysNext7d ?? '—'} / 7</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {enrichedPlans.map(({ plan, advice }) => (
          <div key={plan.id} className={`glass rounded-[2rem] p-6 border ${readinessClass(advice.status)}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="flex flex-wrap gap-2 mb-2"><span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full border ${statusBadgeClass(plan.status)}`}>{statusLabel(plan.status)}</span><span className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full bg-white/5 border border-white/10">{purposeLabel(plan.purpose)}</span></div>
                <h3 className="text-xl text-white font-bold">{plan.variety} · {plan.parcel_name}</h3>
                <p className="text-xs text-slate-500 mt-1">Planlagt {plan.planned_date} · estimert {plan.estimated_kg} kg</p>
              </div>
              <div className="text-right"><p className="text-[10px] text-slate-500">kg</p><p className="text-3xl text-white font-black">{plan.status === 'done' && plan.actual_kg ? plan.actual_kg : plan.estimated_kg}</p></div>
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
              <button onClick={() => openEditForm(plan)} className="bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Edit3 size={16} /> Rediger</button>
              <button onClick={() => updatePlanStatus(plan.id, 'approved')} disabled={plan.status === 'approved' || plan.status === 'done'} className="bg-blue-500/15 hover:bg-blue-500/25 disabled:opacity-40 text-blue-300 font-bold py-3 rounded-2xl">Godkjenn</button>
              <button onClick={() => updatePlanStatus(plan.id, 'done')} disabled={plan.status === 'done'} className="bg-green-500/15 hover:bg-green-500/25 disabled:opacity-40 text-green-300 font-bold py-3 rounded-2xl">Utført</button>
              <button onClick={() => deletePlan(plan.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-300 font-bold py-3 rounded-2xl flex items-center justify-center gap-2"><Trash2 size={16} /> Slett</button>
            </div>
          </div>
        ))}
      </div>

      {!plans.length && <div className="glass rounded-[2rem] p-8 border border-white/10 text-center text-slate-500">Ingen høsteplaner ennå. Klikk “Ny plan” og planlegg per parsell.</div>}

      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center"><div><h3 className="text-2xl font-bold text-white">{editingId ? 'Rediger høsteplan' : 'Ny høsteplan'}</h3><p className="text-xs text-slate-500 mt-1">Planlegg per parsell, ikke sone. Alle felt har ledetekst.</p></div><button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Parsell</label><select className={inputClass} value={form.parcel_id || ''} onChange={e => { const parcel = parcels.find(p => p.id === e.target.value); setForm(prev => ({ ...prev, parcel_id: e.target.value, parcel_name: parcel?.name || e.target.value })); }}><option value="">Velg parsell</option>{parcels.map(parcel => <option key={parcel.id} value={parcel.id}>{parcel.name}</option>)}</select><p className="text-[10px] text-slate-600 mt-1">Velg parcellen som skal planlegges for bordoliven, olje eller blandet høsting.</p></div>
              <div><label className={labelClass}>Formål</label><select className={inputClass} value={form.purpose} onChange={e => { const purpose = e.target.value as HarvestPurpose; setForm(prev => ({ ...prev, purpose, planned_date: defaultPlanDate(purpose) })); }}><option value="table_olives">Bordoliven</option><option value="oil">Olje</option><option value="mixed">Blandet</option></select><p className="text-[10px] text-slate-600 mt-1">Bordoliven planlegges vanligvis tidligere enn olje, spesielt etter størrelse og fasthet.</p></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={labelClass}>Olivensort</label><select className={inputClass} value={form.variety || ''} onChange={e => setForm(prev => ({ ...prev, variety: e.target.value }))}>{varieties.map(v => <option key={v} value={v}>{v}</option>)}</select><p className="text-[10px] text-slate-600 mt-1">Velg eksisterende sort eller legg til en ny under.</p></div>
              <div><label className={labelClass}>Legg til ny sort</label><div className="flex gap-2"><input className={inputClass} placeholder="F.eks. Royal / Empeltre / lokal sort" value={newVariety} onChange={e => setNewVariety(e.target.value)} /><button onClick={addVariety} className="px-4 rounded-2xl bg-[#d9b657] text-black font-bold">Legg til</button></div><p className="text-[10px] text-slate-600 mt-1">Nye sorter lagres i listen og kan brukes i senere planer.</p></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={labelClass}>Planlagt dato</label><input type="date" className={inputClass} value={form.planned_date || fmtDate(new Date())} onChange={e => setForm(prev => ({ ...prev, planned_date: e.target.value }))} /></div>
              <div><label className={labelClass}>Estimert kg</label><input type="number" className={inputClass} placeholder="F.eks. 500" value={form.estimated_kg || ''} onChange={e => setForm(prev => ({ ...prev, estimated_kg: Number(e.target.value) }))} /></div>
              <div><label className={labelClass}>Faktisk kg når utført</label><input type="number" className={inputClass} placeholder="Fylles ut etter høsting" value={form.actual_kg || ''} onChange={e => setForm(prev => ({ ...prev, actual_kg: Number(e.target.value) }))} /></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className={labelClass}>Modenhetsindeks 0–7</label><input type="number" step="0.1" min="0" max="7" className={inputClass} placeholder="F.eks. 2.0" value={form.maturity_index || ''} onChange={e => setForm(prev => ({ ...prev, maturity_index: Number(e.target.value) }))} /></div>
              <div><label className={labelClass}>Fruktstørrelse</label><select className={inputClass} value={form.fruit_size} onChange={e => setForm(prev => ({ ...prev, fruit_size: e.target.value as HarvestPlan['fruit_size'] }))}><option value="small">Liten</option><option value="medium">Middels</option><option value="large">Stor</option><option value="very_large">Svært stor</option></select></div>
              <div><label className={labelClass}>Fasthet</label><select className={inputClass} value={form.firmness} onChange={e => setForm(prev => ({ ...prev, firmness: e.target.value as HarvestPlan['firmness'] }))}><option value="hard">Hard</option><option value="medium">Middels</option><option value="soft">Myk</option></select></div>
            </div>

            <div><label className={labelClass}>Status</label><select className={inputClass} value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as HarvestPlanStatus }))}><option value="planned">Planlagt</option><option value="approved">Godkjent</option><option value="done">Utført</option><option value="cancelled">Kansellert</option></select></div>
            <div><label className={labelClass}>Notat og ledetekst</label><textarea className="w-full min-h-[120px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-green-500/50" placeholder="Skriv vurdering av størrelse, skadegrad, smak, logistikk, mannskap, kasser, pressing/lake eller hva som må sjekkes før godkjenning." value={form.notes || ''} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} /></div>

            <button onClick={savePlan} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-2"><Save size={20} /> {editingId ? 'Lagre endringer' : 'Lagre plan'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HarvestPlannerOliviaView;
