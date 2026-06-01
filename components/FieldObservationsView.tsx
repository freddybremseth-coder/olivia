import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  Camera,
  CheckCircle2,
  Droplets,
  FileCheck2,
  Leaf,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sprout,
  Wrench,
  X,
} from 'lucide-react';
import type { FarmObservation } from '../types/farmIoT';
import {
  fetchRecentFarmObservations,
  insertFarmObservation,
} from '../services/farmIoT';

type DataSource = 'supabase' | 'local_demo';

type ObservationCategory = FarmObservation['category'];

const CATEGORY_OPTIONS: { value: ObservationCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'irrigation', label: 'Vanning / dryppslange', icon: <Droplets size={18} />, color: 'text-blue-400' },
  { value: 'tree_health', label: 'Trehelse', icon: <Leaf size={18} />, color: 'text-green-400' },
  { value: 'pest', label: 'Skadedyr / kanin', icon: <Bug size={18} />, color: 'text-yellow-400' },
  { value: 'disease', label: 'Sykdom / sopp', icon: <AlertTriangle size={18} />, color: 'text-red-400' },
  { value: 'soil', label: 'Jord / fukt', icon: <Sprout size={18} />, color: 'text-emerald-400' },
  { value: 'water', label: 'Vann / EC / pH', icon: <Droplets size={18} />, color: 'text-cyan-400' },
  { value: 'maintenance', label: 'Vedlikehold', icon: <Wrench size={18} />, color: 'text-slate-300' },
  { value: 'organic_certification', label: 'Økologisk kontroll', icon: <FileCheck2 size={18} />, color: 'text-lime-400' },
  { value: 'harvest', label: 'Høsting / modenhet', icon: <ShieldCheck size={18} />, color: 'text-orange-400' },
  { value: 'other', label: 'Annet', icon: <MapPin size={18} />, color: 'text-slate-400' },
];

const demoObservations: FarmObservation[] = [
  {
    id: 'demo-obs-1',
    parcel_id: 'biar-main',
    zone_id: 'zone-a',
    tree_group: 'Unge Gordal',
    category: 'irrigation',
    title: 'Sjekk dryppslange i Sone A',
    notes: 'Lavt trykk i vanningsrådgiver. Se etter lekkasje, tette filter eller kaninskade.',
    observed_at: new Date().toISOString(),
    created_by: 'Olivia demo',
  },
  {
    id: 'demo-obs-2',
    parcel_id: 'biar-main',
    zone_id: 'zone-b',
    tree_group: 'Eldre blanding',
    category: 'soil',
    title: 'Jord-EC bør følges',
    notes: 'Sone B har forhøyet EC i demo-data. Vurder jordprøve og sammenlign med vann-EC.',
    observed_at: new Date(Date.now() - 36e5 * 8).toISOString(),
    created_by: 'Olivia demo',
  },
];

function categoryMeta(category: ObservationCategory) {
  return CATEGORY_OPTIONS.find(item => item.value === category) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}

function getLocalObservations(): FarmObservation[] {
  try {
    const raw = localStorage.getItem('olivia_farm_observations');
    if (!raw) return demoObservations;
    const parsed = JSON.parse(raw) as FarmObservation[];
    return parsed.length ? parsed : demoObservations;
  } catch {
    return demoObservations;
  }
}

function saveLocalObservations(observations: FarmObservation[]) {
  localStorage.setItem('olivia_farm_observations', JSON.stringify(observations));
}

const FieldObservationsView: React.FC = () => {
  const [observations, setObservations] = useState<FarmObservation[]>(demoObservations);
  const [dataSource, setDataSource] = useState<DataSource>('local_demo');
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [form, setForm] = useState<Partial<FarmObservation>>({
    parcel_id: 'biar-main',
    zone_id: 'zone-a',
    tree_group: '',
    category: 'irrigation',
    title: '',
    notes: '',
    image_urls: [],
  });

  const loadObservations = async () => {
    setIsLoading(true);
    try {
      const rows = await fetchRecentFarmObservations(100);
      if (rows.length) {
        setObservations(rows);
        setDataSource('supabase');
      } else {
        setObservations(getLocalObservations());
        setDataSource('local_demo');
      }
      setLastRefresh(new Date());
    } catch (error) {
      console.warn('[FieldObservationsView] Could not load Supabase observations. Using local data.', error);
      setObservations(getLocalObservations());
      setDataSource('local_demo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadObservations();
  }, []);

  const stats = useMemo(() => {
    const last7 = observations.filter(obs => Date.now() - new Date(obs.observed_at).getTime() < 7 * 24 * 36e5).length;
    const irrigation = observations.filter(obs => obs.category === 'irrigation').length;
    const pests = observations.filter(obs => obs.category === 'pest' || obs.category === 'disease').length;
    const organic = observations.filter(obs => obs.category === 'organic_certification').length;
    return { last7, irrigation, pests, organic };
  }, [observations]);

  const handleImageSelect = (fileList: FileList | null) => {
    if (!fileList || !fileList[0]) return;
    const file = fileList[0];
    const localUrl = URL.createObjectURL(file);
    setForm(prev => ({ ...prev, image_urls: [...(prev.image_urls || []), localUrl] }));
  };

  const handleSave = async () => {
    if (!form.title || !form.category) return;

    const observation: Omit<FarmObservation, 'id'> = {
      parcel_id: form.parcel_id || 'biar-main',
      zone_id: form.zone_id || undefined,
      tree_group: form.tree_group || undefined,
      category: form.category,
      title: form.title,
      notes: form.notes || undefined,
      image_urls: form.image_urls || [],
      observed_at: new Date().toISOString(),
      created_by: 'Freddy / Olivia',
    };

    let saved: FarmObservation = { ...observation, id: `local-${Date.now()}` };

    if (dataSource === 'supabase') {
      try {
        saved = await insertFarmObservation(observation);
      } catch (error) {
        console.warn('[FieldObservationsView] Supabase save failed. Keeping local observation.', error);
      }
    }

    const updated = [saved, ...observations];
    setObservations(updated);
    if (dataSource !== 'supabase') saveLocalObservations(updated);
    setForm({ parcel_id: 'biar-main', zone_id: 'zone-a', tree_group: '', category: 'irrigation', title: '', notes: '', image_urls: [] });
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <MapPin className="text-green-400" /> Feltobservasjoner
          </h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            DonaAnna · mobil feltlogg · {dataSource === 'supabase' ? 'Supabase' : 'Lokal demo'} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadObservations} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-green-400 hover:bg-white/5 transition-all disabled:opacity-50">
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
          </button>
          <button onClick={() => setIsFormOpen(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2">
            <Plus size={20} /> Ny observasjon
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Siste 7 dager', value: stats.last7, icon: <CheckCircle2 size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Vanning', value: stats.irrigation, icon: <Droplets size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Skadedyr/sykdom', value: stats.pests, icon: <Bug size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Økologisk', value: stats.organic, icon: <FileCheck2 size={18} />, cls: 'border-lime-500/20 bg-lime-500/10 text-lime-400' },
        ].map(card => (
          <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}>
            <div className="mb-2">{card.icon}</div>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p>
            <p className="text-3xl font-black text-white mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]">
        <p className="text-sm text-white font-bold">Hvorfor dette er viktig</p>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Sensorer og værdata viser tall, men feltobservasjoner forklarer hvorfor tallene endrer seg: kaninskade, tett filter, tørre flekker, sykdomstegn, olivenstørrelse, modenhet og økologisk kontroll. Over tid blir dette et sterkt beslutningsgrunnlag for vanning, høsting og drift.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Siste observasjoner</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {observations.map(obs => {
            const meta = categoryMeta(obs.category);
            return (
              <div key={obs.id} className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl bg-white/5 ${meta.color}`}>{meta.icon}</div>
                    <div>
                      <p className="text-white font-bold">{obs.title}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                        {meta.label} · {obs.zone_id || 'ingen sone'} {obs.tree_group ? `· ${obs.tree_group}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600 whitespace-nowrap">{new Date(obs.observed_at).toLocaleDateString('no-NO')}</p>
                </div>
                {obs.notes && <p className="text-sm text-slate-400 mt-4 leading-relaxed">{obs.notes}</p>}
                {obs.image_urls && obs.image_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {obs.image_urls.slice(0, 3).map(url => (
                      <img key={url} src={url} alt="Observasjon" className="h-20 w-full object-cover rounded-xl border border-white/10" />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-white">Ny feltobservasjon</h3>
                <p className="text-xs text-slate-500 mt-1">Registrer det du ser på tomten akkurat nå</p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setForm(prev => ({ ...prev, category: option.value }))}
                  className={`p-3 rounded-2xl border text-left transition-all ${form.category === option.value ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5'}`}
                >
                  <div className={option.color}>{option.icon}</div>
                  <p className="text-xs text-white font-bold mt-2">{option.label}</p>
                </button>
              ))}
            </div>

            <input
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none"
              placeholder="Tittel, f.eks. Kaninskade på dryppslange"
              value={form.title || ''}
              onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none"
                placeholder="Sone, f.eks. zone-a"
                value={form.zone_id || ''}
                onChange={event => setForm(prev => ({ ...prev, zone_id: event.target.value }))}
              />
              <input
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none"
                placeholder="Tregruppe"
                value={form.tree_group || ''}
                onChange={event => setForm(prev => ({ ...prev, tree_group: event.target.value }))}
              />
            </div>

            <textarea
              className="w-full min-h-[130px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none"
              placeholder="Notat: hva ser du, hvor er det, hva bør gjøres?"
              value={form.notes || ''}
              onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
            />

            <label className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl border border-dashed border-white/20 bg-white/5 text-slate-400 cursor-pointer hover:text-white hover:border-green-500/40 transition-all">
              <Camera size={20} /> Legg ved bilde fra mobil/kamera
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={event => handleImageSelect(event.target.files)} />
            </label>

            {form.image_urls && form.image_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.image_urls.map(url => <img key={url} src={url} alt="Valgt" className="h-24 w-full object-cover rounded-xl border border-white/10" />)}
              </div>
            )}

            <button onClick={handleSave} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-2">
              <Save size={20} /> Lagre observasjon
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldObservationsView;
