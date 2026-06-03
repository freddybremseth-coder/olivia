import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Euro,
  Gauge,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Settings,
  Tractor,
  Trash2,
  Truck,
  Wrench,
  X,
} from 'lucide-react';
import { Language } from '../types';
import {
  deleteEquipment,
  EquipmentCondition,
  EquipmentItem,
  EquipmentServiceLog,
  EquipmentStatus,
  fetchEquipment,
  fetchEquipmentServiceLogs,
  insertEquipmentServiceLog,
  upsertEquipment,
} from '../services/equipment';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

interface FleetViewProps {
  language: Language;
}

type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

type EquipmentForm = {
  name: string;
  equipmentType: string;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  trackingUnit: string;
  currentValue: string;
  lastServiceDate: string;
  nextServiceDate: string;
  nextServiceValue: string;
  purchaseDate: string;
  purchasePrice: string;
  estimatedValue: string;
  serialNumber: string;
  location: string;
  notes: string;
};

type ServiceForm = {
  equipmentId: string;
  serviceDate: string;
  serviceType: string;
  valueAtService: string;
  cost: string;
  supplier: string;
  notes: string;
};

const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60';
const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1';
const helpClass = 'text-[11px] text-slate-600 block mb-2';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyEquipmentForm(): EquipmentForm {
  return {
    name: '',
    equipmentType: 'tractor',
    status: 'active',
    condition: 'good',
    trackingUnit: 'hours',
    currentValue: '',
    lastServiceDate: '',
    nextServiceDate: '',
    nextServiceValue: '',
    purchaseDate: '',
    purchasePrice: '',
    estimatedValue: '',
    serialNumber: '',
    location: '',
    notes: '',
  };
}

function emptyServiceForm(equipmentId = ''): ServiceForm {
  return {
    equipmentId,
    serviceDate: today(),
    serviceType: 'maintenance',
    valueAtService: '',
    cost: '',
    supplier: '',
    notes: '',
  };
}

function statusLabel(status: EquipmentStatus): string {
  if (status === 'active') return 'Aktiv';
  if (status === 'service') return 'Service';
  if (status === 'broken') return 'Ødelagt';
  return 'Inaktiv';
}

function statusClass(status: EquipmentStatus): string {
  if (status === 'active') return 'border-green-500/20 bg-green-500/10 text-green-400';
  if (status === 'service') return 'border-yellow-500/25 bg-yellow-500/10 text-yellow-300';
  if (status === 'broken') return 'border-red-500/25 bg-red-500/10 text-red-300';
  return 'border-slate-500/25 bg-slate-500/10 text-slate-300';
}

function conditionLabel(condition: EquipmentCondition): string {
  if (condition === 'excellent') return 'Svært god';
  if (condition === 'good') return 'God';
  if (condition === 'fair') return 'Middels';
  return 'Dårlig';
}

function isServiceDue(item: EquipmentItem): boolean {
  const now = today();
  if (item.nextServiceDate && item.nextServiceDate <= now) return true;
  if (typeof item.nextServiceValue === 'number' && item.currentValue >= item.nextServiceValue) return true;
  return false;
}

function toEquipmentItem(form: EquipmentForm): EquipmentItem {
  return {
    id: `eq-${Date.now()}`,
    name: form.name.trim(),
    equipmentType: form.equipmentType,
    status: form.status,
    condition: form.condition,
    trackingUnit: form.trackingUnit,
    currentValue: Number(form.currentValue || 0),
    lastServiceDate: form.lastServiceDate || undefined,
    nextServiceDate: form.nextServiceDate || undefined,
    nextServiceValue: Number(form.nextServiceValue || 0) || undefined,
    purchaseDate: form.purchaseDate || undefined,
    purchasePrice: Number(form.purchasePrice || 0) || undefined,
    estimatedValue: Number(form.estimatedValue || 0) || undefined,
    serialNumber: form.serialNumber || undefined,
    location: form.location || undefined,
    notes: form.notes || undefined,
  };
}

const FleetView: React.FC<FleetViewProps> = () => {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [serviceLogs, setServiceLogs] = useState<EquipmentServiceLog[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isSavingEquipment, setIsSavingEquipment] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [equipmentForm, setEquipmentForm] = useState<EquipmentForm>(() => emptyEquipmentForm());
  const [serviceForm, setServiceForm] = useState<ServiceForm>(() => emptyServiceForm());

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [items, logs] = await Promise.all([
        fetchEquipment(),
        fetchEquipmentServiceLogs(),
      ]);
      setEquipment(items);
      setServiceLogs(logs);
      setLoadState(items.length || logs.length ? 'supabase' : 'empty');
      setLastRefresh(new Date());
    } catch (error) {
      setEquipment([]);
      setServiceLogs([]);
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente utstyr fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const stats = useMemo(() => {
    const active = equipment.filter(item => item.status === 'active').length;
    const service = equipment.filter(item => item.status === 'service' || isServiceDue(item)).length;
    const broken = equipment.filter(item => item.status === 'broken').length;
    const value = equipment.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);
    const cost30 = serviceLogs.filter(log => Date.now() - new Date(log.serviceDate).getTime() < 30 * 24 * 36e5).reduce((sum, log) => sum + (log.cost || 0), 0);
    return { active, service, broken, value, cost30 };
  }, [equipment, serviceLogs]);

  const saveEquipment = async () => {
    setErrorMessage(null);
    if (!equipmentForm.name.trim() || !equipmentForm.equipmentType) {
      setErrorMessage('Navn og type må fylles ut før lagring.');
      return;
    }
    setIsSavingEquipment(true);
    try {
      const saved = await upsertEquipment(toEquipmentItem(equipmentForm));
      setEquipment(prev => [saved, ...prev]);
      setLoadState('supabase');
      setIsEquipmentModalOpen(false);
      setEquipmentForm(emptyEquipmentForm());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Utstyret ble ikke lagret i Supabase.');
    } finally {
      setIsSavingEquipment(false);
    }
  };

  const saveServiceLog = async () => {
    setErrorMessage(null);
    if (!serviceForm.equipmentId || !serviceForm.serviceDate) {
      setErrorMessage('Velg utstyr og servicedato før du lagrer service.');
      return;
    }
    const item = equipment.find(eq => eq.id === serviceForm.equipmentId);
    const log: EquipmentServiceLog = {
      id: `srv-${Date.now()}`,
      equipmentId: serviceForm.equipmentId,
      serviceDate: serviceForm.serviceDate,
      serviceType: serviceForm.serviceType,
      valueAtService: Number(serviceForm.valueAtService || 0) || item?.currentValue,
      cost: Number(serviceForm.cost || 0) || undefined,
      supplier: serviceForm.supplier || undefined,
      notes: serviceForm.notes || undefined,
    };

    setIsSavingService(true);
    try {
      const saved = await insertEquipmentServiceLog(log);
      setServiceLogs(prev => [saved, ...prev]);
      if (item) {
        const updated: EquipmentItem = {
          ...item,
          lastServiceDate: serviceForm.serviceDate,
          currentValue: Number(serviceForm.valueAtService || item.currentValue || 0),
          status: item.status === 'service' ? 'active' : item.status,
        };
        const savedEquipment = await upsertEquipment(updated);
        setEquipment(prev => prev.map(eq => eq.id === savedEquipment.id ? savedEquipment : eq));
      }
      setLoadState('supabase');
      setIsServiceModalOpen(false);
      setServiceForm(emptyServiceForm());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Serviceloggen ble ikke lagret i Supabase.');
    } finally {
      setIsSavingService(false);
    }
  };

  const removeEquipment = async (id: string) => {
    setErrorMessage(null);
    try {
      await deleteEquipment(id);
      setEquipment(prev => prev.filter(item => item.id !== id));
      setServiceLogs(prev => prev.filter(log => log.equipmentId !== id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke slette utstyret.');
    }
  };

  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen utstyr ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.12),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><Truck className="text-green-400" /> Maskiner og utstyr</h2>
              <p className="text-slate-400 text-sm mt-2">Utstyrsregister, status, service og verdi lagret i Supabase. Ingen localStorage og ingen demo-data.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
            <button onClick={() => setIsServiceModalOpen(true)} disabled={!equipment.length} className="bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white px-5 py-3.5 rounded-2xl font-bold transition-all flex items-center gap-2"><Wrench size={18} /> Registrer service</button>
            <button onClick={() => setIsEquipmentModalOpen(true)} className="bg-[#d9b657] hover:bg-[#f0cf70] text-black px-5 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-[#d9b657]/20 flex items-center gap-2"><Plus size={20} /> Registrer utstyr</button>
          </div>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Aktive', value: stats.active, icon: <CheckCircle2 size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Service', value: stats.service, icon: <Wrench size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Ødelagt', value: stats.broken, icon: <AlertTriangle size={18} />, cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
          { label: 'Verdi', value: stats.value ? `€${Math.round(stats.value).toLocaleString('no-NO')}` : '—', icon: <Euro size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Service 30d', value: stats.cost30 ? `€${Math.round(stats.cost30).toLocaleString('no-NO')}` : '—', icon: <CalendarClock size={18} />, cls: 'border-purple-500/20 bg-purple-500/10 text-purple-400' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-2xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      {isLoading && loadState === 'loading' ? <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter utstyr fra Supabase...</div> : null}

      {loadState === 'empty' ? (
        <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center">
          <Tractor className="mx-auto text-[#d9b657] mb-3" size={34} />
          <h4 className="text-white font-bold text-lg">Ingen maskiner eller utstyr registrert ennå</h4>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">Registrer traktor, tilhenger, vanningspumpe, tank, verktøy eller høsteutstyr. Det opprettes ikke demo-utstyr.</p>
          <button onClick={() => setIsEquipmentModalOpen(true)} className="mt-5 bg-[#d9b657] hover:bg-[#f0cf70] text-black px-5 py-3 rounded-2xl font-bold inline-flex items-center gap-2"><Plus size={18} /> Registrer første utstyr</button>
        </div>
      ) : null}

      {equipment.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {equipment.map(item => {
            const due = isServiceDue(item);
            const logs = serviceLogs.filter(log => log.equipmentId === item.id);
            return (
              <div key={item.id} className={`glass rounded-[2rem] p-5 border ${due ? 'border-yellow-500/25 bg-yellow-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-3">
                    <div className="p-3 rounded-2xl bg-white/5 text-green-400"><Truck size={22} /></div>
                    <div>
                      <p className="text-white font-bold text-lg">{item.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">{item.equipmentType} · {item.location || 'ingen plassering'}</p>
                    </div>
                  </div>
                  <button onClick={() => removeEquipment(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <span className={`text-[10px] px-3 py-1 rounded-full border font-bold uppercase tracking-widest ${statusClass(item.status)}`}>{statusLabel(item.status)}</span>
                  <span className="text-[10px] px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300 font-bold uppercase tracking-widest">{conditionLabel(item.condition)}</span>
                  {due && <span className="text-[10px] px-3 py-1 rounded-full border border-yellow-500/25 bg-yellow-500/10 text-yellow-300 font-bold uppercase tracking-widest">Service nå</span>}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                  <Metric label={item.trackingUnit} value={item.currentValue.toLocaleString('no-NO')} />
                  <Metric label="Sist service" value={item.lastServiceDate || '—'} />
                  <Metric label="Neste dato" value={item.nextServiceDate || '—'} />
                  <Metric label="Neste verdi" value={item.nextServiceValue !== undefined ? item.nextServiceValue.toLocaleString('no-NO') : '—'} />
                </div>

                {item.notes && <p className="text-sm text-slate-400 mt-4 leading-relaxed">{item.notes}</p>}

                <div className="mt-5 pt-4 border-t border-white/10">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Siste service</p>
                  {logs.length ? logs.slice(0, 2).map(log => <div key={log.id} className="text-xs text-slate-400 mb-2"><strong className="text-white">{log.serviceDate}</strong> · {log.serviceType}{log.cost ? ` · €${log.cost}` : ''}{log.notes ? ` · ${log.notes}` : ''}</div>) : <p className="text-xs text-slate-500 italic">Ingen servicehistorikk ennå.</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isEquipmentModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full md:max-w-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"><ModalHeader title="Registrer utstyr" onClose={() => setIsEquipmentModalOpen(false)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Navn *" help="F.eks. traktor, pumpe, tank eller høsteutstyr."><input className={inputClass} value={equipmentForm.name} onChange={e => setEquipmentForm(p => ({ ...p, name: e.target.value }))} placeholder="Traktor / vannpumpe" /></Field><Field label="Type *" help="Kategori for utstyret."><select className={inputClass} value={equipmentForm.equipmentType} onChange={e => setEquipmentForm(p => ({ ...p, equipmentType: e.target.value }))}><option className="bg-slate-900" value="tractor">Traktor</option><option className="bg-slate-900" value="pump">Pumpe</option><option className="bg-slate-900" value="irrigation">Vanning</option><option className="bg-slate-900" value="harvest">Høsting</option><option className="bg-slate-900" value="vehicle">Kjøretøy</option><option className="bg-slate-900" value="tool">Verktøy</option><option className="bg-slate-900" value="other">Annet</option></select></Field></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3"><Field label="Status" help="Driftsstatus."><select className={inputClass} value={equipmentForm.status} onChange={e => setEquipmentForm(p => ({ ...p, status: e.target.value as EquipmentStatus }))}><option className="bg-slate-900" value="active">Aktiv</option><option className="bg-slate-900" value="service">Service</option><option className="bg-slate-900" value="broken">Ødelagt</option><option className="bg-slate-900" value="inactive">Inaktiv</option></select></Field><Field label="Tilstand" help="Visuell/teknisk tilstand."><select className={inputClass} value={equipmentForm.condition} onChange={e => setEquipmentForm(p => ({ ...p, condition: e.target.value as EquipmentCondition }))}><option className="bg-slate-900" value="excellent">Svært god</option><option className="bg-slate-900" value="good">God</option><option className="bg-slate-900" value="fair">Middels</option><option className="bg-slate-900" value="poor">Dårlig</option></select></Field><Field label="Måleenhet" help="Timer, km, liter eller annet."><input className={inputClass} value={equipmentForm.trackingUnit} onChange={e => setEquipmentForm(p => ({ ...p, trackingUnit: e.target.value }))} /></Field><Field label="Nåverdi" help="Driftstimer/km osv."><input type="number" className={inputClass} value={equipmentForm.currentValue} onChange={e => setEquipmentForm(p => ({ ...p, currentValue: e.target.value }))} /></Field></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Sist service" help="Valgfritt."><input type="date" className={inputClass} value={equipmentForm.lastServiceDate} onChange={e => setEquipmentForm(p => ({ ...p, lastServiceDate: e.target.value }))} /></Field><Field label="Neste service dato" help="Valgfritt."><input type="date" className={inputClass} value={equipmentForm.nextServiceDate} onChange={e => setEquipmentForm(p => ({ ...p, nextServiceDate: e.target.value }))} /></Field><Field label="Neste service verdi" help="F.eks. timer/km."><input type="number" className={inputClass} value={equipmentForm.nextServiceValue} onChange={e => setEquipmentForm(p => ({ ...p, nextServiceValue: e.target.value }))} /></Field></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Kjøpsdato" help="Valgfritt."><input type="date" className={inputClass} value={equipmentForm.purchaseDate} onChange={e => setEquipmentForm(p => ({ ...p, purchaseDate: e.target.value }))} /></Field><Field label="Kjøpspris" help="Valgfritt."><input type="number" className={inputClass} value={equipmentForm.purchasePrice} onChange={e => setEquipmentForm(p => ({ ...p, purchasePrice: e.target.value }))} /></Field><Field label="Estimert verdi" help="Valgfritt."><input type="number" className={inputClass} value={equipmentForm.estimatedValue} onChange={e => setEquipmentForm(p => ({ ...p, estimatedValue: e.target.value }))} /></Field></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Serienummer" help="Valgfritt."><input className={inputClass} value={equipmentForm.serialNumber} onChange={e => setEquipmentForm(p => ({ ...p, serialNumber: e.target.value }))} /></Field><Field label="Plassering" help="F.eks. Biar, pumpehus, lager."><input className={inputClass} value={equipmentForm.location} onChange={e => setEquipmentForm(p => ({ ...p, location: e.target.value }))} /></Field></div>
          <Field label="Notat" help="Vedlikehold, forsikring, eierforhold eller teknisk info."><textarea className="w-full min-h-[110px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60" value={equipmentForm.notes} onChange={e => setEquipmentForm(p => ({ ...p, notes: e.target.value }))} /></Field>
          <button onClick={saveEquipment} disabled={isSavingEquipment} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isSavingEquipment ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Lagre utstyr</button>
        </div></div>
      )}

      {isServiceModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"><ModalHeader title="Registrer service" onClose={() => setIsServiceModalOpen(false)} />
          <Field label="Utstyr *" help="Velg hvilket utstyr servicen gjelder."><select className={inputClass} value={serviceForm.equipmentId} onChange={e => setServiceForm(p => ({ ...p, equipmentId: e.target.value }))}><option className="bg-slate-900" value="">Velg utstyr</option>{equipment.map(item => <option key={item.id} className="bg-slate-900" value={item.id}>{item.name}</option>)}</select></Field>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Dato *" help="Når service ble utført."><input type="date" className={inputClass} value={serviceForm.serviceDate} onChange={e => setServiceForm(p => ({ ...p, serviceDate: e.target.value }))} /></Field><Field label="Type service" help="F.eks. vedlikehold, reparasjon, olje, filter."><input className={inputClass} value={serviceForm.serviceType} onChange={e => setServiceForm(p => ({ ...p, serviceType: e.target.value }))} /></Field></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Verdi ved service" help="Timer/km ved service."><input type="number" className={inputClass} value={serviceForm.valueAtService} onChange={e => setServiceForm(p => ({ ...p, valueAtService: e.target.value }))} /></Field><Field label="Kostnad" help="Valgfritt."><input type="number" className={inputClass} value={serviceForm.cost} onChange={e => setServiceForm(p => ({ ...p, cost: e.target.value }))} /></Field><Field label="Leverandør" help="Valgfritt."><input className={inputClass} value={serviceForm.supplier} onChange={e => setServiceForm(p => ({ ...p, supplier: e.target.value }))} /></Field></div>
          <Field label="Notat" help="Hva ble gjort, deler, filter, olje, feil eller oppfølging."><textarea className="w-full min-h-[120px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60" value={serviceForm.notes} onChange={e => setServiceForm(p => ({ ...p, notes: e.target.value }))} /></Field>
          <button onClick={saveServiceLog} disabled={isSavingService} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isSavingService ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Lagre service</button>
        </div></div>
      )}
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="p-3 bg-white/5 rounded-xl border border-white/5"><p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-sm text-white font-bold mt-1">{value}</p></div>;
}

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span><span className={helpClass}>{help}</span>{children}</label>;
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return <div className="flex justify-between items-start gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Supabase · olivia.equipment</p><h3 className="text-2xl font-bold text-white mt-1">{title}</h3></div><button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button></div>;
}

export default FleetView;
