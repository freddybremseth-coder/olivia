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
import type { Parcel } from '../types';
import type { FarmObservation } from '../types/farmIoT';
import {
  fetchRecentFarmObservations,
  insertFarmObservation,
} from '../services/farmIoT';
import { uploadFieldObservationImages } from '../services/fieldObservationStorage';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

type ObservationCategory = FarmObservation['category'];
type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

interface FieldObservationsViewProps {
  parcels?: Parcel[];
}

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

const EMPTY_FORM: Partial<FarmObservation> = {
  parcel_id: '',
  zone_id: '',
  tree_group: '',
  category: 'irrigation',
  title: '',
  notes: '',
  image_urls: [],
};

function categoryMeta(category: ObservationCategory) {
  return CATEGORY_OPTIONS.find(item => item.value === category) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}

function makeObservationDraftId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const FieldObservationsView: React.FC<FieldObservationsViewProps> = ({ parcels = [] }) => {
  const [observations, setObservations] = useState<FarmObservation[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [form, setForm] = useState<Partial<FarmObservation>>(EMPTY_FORM);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);

  const parcelNameById = useMemo(() => new Map(parcels.map(parcel => [parcel.id, parcel.name])), [parcels]);

  const loadObservations = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const rows = await fetchRecentFarmObservations(100);
      setObservations(rows);
      setLoadState(rows.length ? 'supabase' : 'empty');
      setLastRefresh(new Date());
    } catch (error) {
      setObservations([]);
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente feltobservasjoner fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadObservations();
  }, []);

  useEffect(() => {
    return () => {
      previewImageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewImageUrls]);

  const stats = useMemo(() => {
    const last7 = observations.filter(obs => Date.now() - new Date(obs.observed_at).getTime() < 7 * 24 * 36e5).length;
    const irrigation = observations.filter(obs => obs.category === 'irrigation').length;
    const pests = observations.filter(obs => obs.category === 'pest' || obs.category === 'disease').length;
    const organic = observations.filter(obs => obs.category === 'organic_certification').length;
    return { last7, irrigation, pests, organic };
  }, [observations]);

  const handleImageSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
    if (!files.length) return;
    const nextPreviews = files.map(file => URL.createObjectURL(file));
    setSelectedImageFiles(prev => [...prev, ...files]);
    setPreviewImageUrls(prev => [...prev, ...nextPreviews]);
    setErrorMessage(null);
  };

  const removeSelectedImage = (index: number) => {
    setPreviewImageUrls(prev => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setSelectedImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    previewImageUrls.forEach(url => URL.revokeObjectURL(url));
    setForm({ ...EMPTY_FORM });
    setSelectedImageFiles([]);
    setPreviewImageUrls([]);
  };

  const handleSave = async () => {
    if (!form.title?.trim() || !form.category) {
      setErrorMessage('Skriv inn en tydelig tittel og velg kategori før du lagrer.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    const observationDraftId = makeObservationDraftId();
    try {
      const imageUrls = await uploadFieldObservationImages(selectedImageFiles, {
        parcelId: form.parcel_id?.trim() || undefined,
        observationId: observationDraftId,
      });

      const observation: Omit<FarmObservation, 'id'> = {
        parcel_id: form.parcel_id?.trim() || undefined,
        zone_id: form.zone_id?.trim() || undefined,
        tree_group: form.tree_group?.trim() || undefined,
        category: form.category,
        title: form.title.trim(),
        notes: form.notes?.trim() || undefined,
        image_urls: imageUrls,
        observed_at: new Date().toISOString(),
        created_by: 'Olivia',
      };

      const saved = await insertFarmObservation(observation);
      setObservations(prev => [saved, ...prev]);
      setLoadState('supabase');
      setLastRefresh(new Date());
      resetForm();
      setIsFormOpen(false);
    } catch (error) {
      setLoadState(observations.length ? 'supabase' : 'error');
      setErrorMessage(error instanceof Error ? error.message : 'Observasjonen eller bildeopplastingen ble ikke lagret i Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen data ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(111,127,60,0.16),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1">
                Feltobservasjoner
              </h2>
              <p className="text-slate-400 text-sm mt-2">
                Mobil feltlogg for vanning, trehelse, skadedyr, modenhet og økologisk kontroll. Data lagres i Supabase-tabellen <span className="font-mono text-[#d9b657]">olivia.farm_observations</span>.
              </p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">
                {sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadObservations} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            </button>
            <button onClick={() => setIsFormOpen(true)} className="bg-[#d9b657] hover:bg-[#f0cf70] text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-[#d9b657]/20 flex items-center gap-2">
              <Plus size={20} /> Ny observasjon
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          <AlertTriangle className="mt-0.5 flex-shrink-0" size={18} />
          <p>{errorMessage}</p>
        </div>
      )}

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
        {isLoading && observations.length === 0 ? (
          <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3">
            <Loader2 size={18} className="animate-spin" /> Henter feltobservasjoner fra Supabase...
          </div>
        ) : observations.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center">
            <MapPin className="mx-auto text-[#d9b657] mb-3" size={34} />
            <h4 className="text-white font-bold text-lg">Ingen feltobservasjoner ennå</h4>
            <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">
              Start med å registrere det du faktisk ser på gården: dryppslanger, kaninskader, trehelse, jordfukt, modenhet eller økologisk dokumentasjon. Det opprettes ikke demo-observasjoner.
            </p>
            <button onClick={() => setIsFormOpen(true)} className="mt-5 bg-[#d9b657] hover:bg-[#f0cf70] text-black px-5 py-3 rounded-2xl font-bold inline-flex items-center gap-2">
              <Plus size={18} /> Opprett første observasjon
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {observations.map(obs => {
              const meta = categoryMeta(obs.category);
              const parcelLabel = obs.parcel_id ? (parcelNameById.get(obs.parcel_id) || obs.parcel_id) : 'hele gården';
              return (
                <div key={obs.id} className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl bg-white/5 ${meta.color}`}>{meta.icon}</div>
                      <div>
                        <p className="text-white font-bold">{obs.title}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">
                          {meta.label} · {parcelLabel} {obs.zone_id ? `· ${obs.zone_id}` : ''} {obs.tree_group ? `· ${obs.tree_group}` : ''}
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
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna feltlogg</p>
                <h3 className="text-2xl font-bold text-white mt-1">Ny feltobservasjon</h3>
                <p className="text-xs text-slate-500 mt-1">Registrer det du ser på tomten akkurat nå. Bilder og observasjon lagres i Supabase.</p>
              </div>
              <button onClick={() => { setIsFormOpen(false); resetForm(); }} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Kategori *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setForm(prev => ({ ...prev, category: option.value }))}
                    className={`p-3 rounded-2xl border text-left transition-all ${form.category === option.value ? 'border-[#d9b657] bg-[#d9b657]/10' : 'border-white/10 bg-white/5'}`}
                  >
                    <div className={option.color}>{option.icon}</div>
                    <p className="text-xs text-white font-bold mt-2">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Tittel *" help="Kort og konkret beskrivelse av observasjonen.">
              <input
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60"
                placeholder="F.eks. Kaninskade på dryppslange"
                value={form.title || ''}
                onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))}
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Parsell" help="Velg ekte parsell fra Supabase, eller la observasjonen gjelde hele gården.">
                {parcels.length > 0 ? (
                  <select
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60"
                    value={form.parcel_id || ''}
                    onChange={event => setForm(prev => ({ ...prev, parcel_id: event.target.value || undefined }))}
                  >
                    <option className="bg-slate-900" value="">Hele gården</option>
                    {parcels.map(parcel => (
                      <option key={parcel.id} className="bg-slate-900" value={parcel.id}>{parcel.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60"
                    placeholder="Ingen parseller lastet. Valgfri parcel_id."
                    value={form.parcel_id || ''}
                    onChange={event => setForm(prev => ({ ...prev, parcel_id: event.target.value }))}
                  />
                )}
              </Field>
              <Field label="Sone / sektor" help="Valgfritt. Brukes hvis du deler parsellen i soner.">
                <input
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60"
                  placeholder="F.eks. nordre felt eller dryppsektor 2"
                  value={form.zone_id || ''}
                  onChange={event => setForm(prev => ({ ...prev, zone_id: event.target.value }))}
                />
              </Field>
            </div>

            <Field label="Tregruppe / sort" help="Valgfritt. Skriv sort eller gruppe, f.eks. Gordal, Changlot Real eller eldre trær.">
              <input
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60"
                placeholder="F.eks. unge Gordal eller eldre blanding"
                value={form.tree_group || ''}
                onChange={event => setForm(prev => ({ ...prev, tree_group: event.target.value }))}
              />
            </Field>

            <Field label="Notat" help="Skriv hva du ser, hvor det er og hva som bør følges opp.">
              <textarea
                className="w-full min-h-[130px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60"
                placeholder="Notat: hva ser du, hvor er det, hva bør gjøres?"
                value={form.notes || ''}
                onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))}
              />
            </Field>

            <div>
              <label className="w-full flex items-center justify-center gap-3 p-5 rounded-2xl border border-dashed border-white/20 bg-white/5 text-slate-400 cursor-pointer hover:text-white hover:border-[#d9b657]/40 transition-all">
                <Camera size={20} /> Legg ved bilde fra mobil/kamera
                <input type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={event => handleImageSelect(event.target.files)} />
              </label>
              <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                Bilder lastes opp til Supabase Storage og URL-ene lagres i <span className="font-mono">farm_observations.image_urls</span>.
              </p>
            </div>

            {previewImageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewImageUrls.map((url, index) => (
                  <div key={url} className="relative group">
                    <img src={url} alt="Valgt" className="h-24 w-full object-cover rounded-xl border border-white/10" />
                    <button
                      type="button"
                      onClick={() => removeSelectedImage(index)}
                      className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white opacity-90 hover:bg-red-500"
                      title="Fjern bilde"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={handleSave} disabled={isSaving || !form.title?.trim()} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {isSaving ? 'Laster opp og lagrer...' : 'Lagre observasjon'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
      <span className="text-[11px] text-slate-600 block mb-2">{help}</span>
      {children}
    </label>
  );
}

export default FieldObservationsView;
