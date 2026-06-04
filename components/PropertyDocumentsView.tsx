import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import type { Parcel } from '../types';
import { fetchParcels } from '../services/db';
import {
  archivePropertyDocument,
  fetchPropertyDocuments,
  getPropertyDocumentSignedUrl,
  PropertyDocument,
  PropertyDocumentInput,
  PropertyDocumentType,
  uploadPropertyDocumentFile,
} from '../services/propertyDocuments';

type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60';
const textareaClass = 'w-full min-h-[120px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60';
const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1';
const helpClass = 'text-[11px] text-slate-600 block mb-2';

const DOCUMENT_TYPES: { value: PropertyDocumentType; label: string }[] = [
  { value: 'copia_simple', label: 'Copia simple / skjøte' },
  { value: 'escritura', label: 'Escritura notarial' },
  { value: 'nota_simple', label: 'Nota simple' },
  { value: 'catastro', label: 'Catastro' },
  { value: 'tax', label: 'Skatt / IBI' },
  { value: 'ownership_proof', label: 'Eierskapsbevis' },
  { value: 'other', label: 'Annet' },
];

const DEFAULT_CADASTRAL_REFS = [
  '03043A009001900000WH',
  '03043A009001910000WW',
  '03043A009001920000WA',
  '03043A009001940000WY',
  '03043A009001950000WG',
  '03043A009001330000WP',
  '03043A009002150000WZ',
];

const DEFAULT_REGISTRY_NUMBERS = ['7730', '248', '4546', '7729', '2526', '7369', '5537', '7728'];

function splitList(value: string): string[] {
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultInput(parcels: Parcel[] = []): PropertyDocumentInput {
  const relevantParcelIds = parcels
    .filter(parcel => {
      const haystack = [parcel.name, parcel.cadastralId, parcel.registryDetails].filter(Boolean).join(' ');
      return ['190', '191', '192', '194', '195', '133', '215'].some(num => haystack.includes(num));
    })
    .map(parcel => parcel.id);

  return {
    title: 'Copia simple – compraventa fincas rústicas Biar 2025',
    document_type: 'copia_simple',
    owner_name: 'Doña Anna Bremseth',
    notary_name: 'Rafael Moreno Olivares',
    notary_place: 'Aspe, Alicante',
    deed_number: '2296/2025',
    deed_date: '2025-08-06',
    registry: 'Registro de la Propiedad de Villena',
    registry_entry: 'Asiento de entrada 6541 / asiento de presentación 2709 diario 2025',
    protocol_info: 'Compraventa de fincas rústicas. Copia electrónica expedida para inscripción registral.',
    linked_parcel_ids: relevantParcelIds,
    cadastral_refs: DEFAULT_CADASTRAL_REFS,
    registry_property_numbers: DEFAULT_REGISTRY_NUMBERS,
    verification_status: 'pending_review',
    is_ownership_document: true,
    summary: 'Escritura/copia simple de compraventa de fincas rústicas en Biar, Alicante. La compradora indicada es Doña Anna Bremseth. Incluye parcelas del polígono 9 y referencias catastrales vinculadas a las fincas transmitidas.',
    notes: 'Documento subido como prueba de propiedad. Revisar contra nota simple/registro cuando esté disponible la inscripción final completa.',
  };
}

const PropertyDocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyDocumentInput>(() => defaultInput());

  const parcelNameById = useMemo(() => new Map(parcels.map(parcel => [parcel.id, parcel.name])), [parcels]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [documentRows, parcelRows] = await Promise.all([fetchPropertyDocuments(), fetchParcels()]);
      setDocuments(documentRows);
      setParcels(parcelRows);
      setForm(prev => ({ ...defaultInput(parcelRows), ...prev, linked_parcel_ids: prev.linked_parcel_ids?.length ? prev.linked_parcel_ids : defaultInput(parcelRows).linked_parcel_ids }));
      setLoadState(documentRows.length ? 'supabase' : 'empty');
    } catch (error) {
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente dokumenter fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveDocument = async () => {
    if (!selectedFile) { setErrorMessage('Velg PDF eller bilde før du lagrer.'); return; }
    if (!form.title.trim()) { setErrorMessage('Dokumentet må ha tittel.'); return; }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await uploadPropertyDocumentFile(selectedFile, form);
      setDocuments(prev => [saved, ...prev]);
      setSelectedFile(null);
      setForm(defaultInput(parcels));
      setIsModalOpen(false);
      setLoadState('supabase');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Dokumentet ble ikke lagret i Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const openDocument = async (document: PropertyDocument) => {
    try {
      const url = await getPropertyDocumentSignedUrl(document);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke åpne dokumentet.');
    }
  };

  const archiveDocument = async (id: string) => {
    try {
      await archivePropertyDocument(id);
      setDocuments(prev => prev.filter(document => document.id !== id));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke arkivere dokumentet.');
    }
  };

  const stats = useMemo(() => ({
    ownership: documents.filter(d => d.is_ownership_document).length,
    verified: documents.filter(d => d.verification_status === 'verified').length,
    pending: documents.filter(d => d.verification_status === 'pending_review').length,
    parcels: new Set(documents.flatMap(d => d.linked_parcel_ids || [])).size,
  }), [documents]);

  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen dokumenter ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.13),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><ShieldCheck className="text-green-400" /> Eierskapsdokumenter</h2>
              <p className="text-slate-400 text-sm mt-2">Privat dokumentarkiv for skjøter, nota simple, catastro og bevis på eierskap. Filer lagres i Supabase Storage, metadata i olivia.property_documents.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{sourceLabel}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
            <button onClick={() => { setForm(defaultInput(parcels)); setIsModalOpen(true); }} className="bg-[#d9b657] hover:bg-[#f0cf70] text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-[#d9b657]/20 flex items-center gap-2"><Plus size={20} /> Last opp dokument</button>
          </div>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Eierskapsbevis" value={stats.ownership} icon={<ShieldCheck size={18} />} />
        <Stat label="Verifisert" value={stats.verified} icon={<CheckCircle2 size={18} />} />
        <Stat label="Til gjennomgang" value={stats.pending} icon={<FileCheck2 size={18} />} />
        <Stat label="Knyttede parseller" value={stats.parcels} icon={<FileText size={18} />} />
      </div>

      {isLoading && loadState === 'loading' ? <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter dokumenter fra Supabase...</div> : null}

      {loadState === 'empty' && !isLoading && <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center"><FileText className="mx-auto text-[#d9b657] mb-3" size={34} /><h4 className="text-white font-bold text-lg">Ingen dokumenter registrert ennå</h4><p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">Last opp copia simple, nota simple eller skjøte. Metadata er forhåndsutfylt med opplysninger fra Biar-skjøtet.</p><button onClick={() => setIsModalOpen(true)} className="mt-5 bg-[#d9b657] hover:bg-[#f0cf70] text-black px-5 py-3 rounded-2xl font-bold inline-flex items-center gap-2"><Upload size={18} /> Last opp første dokument</button></div>}

      {documents.length > 0 && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{documents.map(document => <div key={document.id} className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]"><div className="flex justify-between gap-4"><div><p className="text-[10px] text-[#d9b657] uppercase font-bold tracking-widest">{document.document_type} · {document.verification_status}</p><h3 className="text-xl font-bold text-white mt-1">{document.title}</h3><p className="text-xs text-slate-500 mt-1">{document.owner_name || 'Ukjent eier'} · {document.deed_date || 'ukjent dato'}</p></div><div className="flex gap-2"><button onClick={() => openDocument(document)} className="p-3 rounded-2xl bg-white/5 text-green-400 hover:bg-white/10"><ExternalLink size={18} /></button><button onClick={() => archiveDocument(document.id)} className="p-3 rounded-2xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={18} /></button></div></div><p className="text-sm text-slate-400 mt-4 line-clamp-3">{document.summary || document.notes || 'Ingen sammendrag.'}</p><div className="flex flex-wrap gap-2 mt-4">{document.linked_parcel_ids.slice(0, 8).map(id => <span key={id} className="text-[10px] px-2 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300">{parcelNameById.get(id) || id}</span>)}</div><div className="flex flex-wrap gap-2 mt-3">{document.cadastral_refs.slice(0, 6).map(ref => <span key={ref} className="text-[10px] px-2 py-1 rounded-full border border-[#d9b657]/20 bg-[#d9b657]/10 text-[#d9b657] font-mono">{ref}</span>)}</div><p className="text-[10px] text-slate-600 mt-4">{document.original_filename || 'fil'} · {formatBytes(document.file_size_bytes)}</p></div>)}</div>}

      {isModalOpen && <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full md:max-w-4xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"><div className="flex justify-between items-start gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Supabase Storage · privat</p><h3 className="text-2xl font-bold text-white mt-1">Last opp eierskapsdokument</h3><p className="text-xs text-slate-500 mt-1">Velg PDF/bilde og kontroller metadata før lagring.</p></div><button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button></div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><label className="block"><span className={labelClass}>Fil *</span><span className={helpClass}>PDF, JPG, PNG eller WEBP. Lagring skjer i privat Supabase bucket.</span><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-[#d9b657] file:px-4 file:py-2 file:text-sm file:font-bold file:text-black hover:file:bg-[#f0cf70]" /></label>{selectedFile && <p className="text-xs text-green-400 mt-3">Valgt: {selectedFile.name} · {formatBytes(selectedFile.size)}</p>}</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Tittel" help="Navn i arkivet."><input className={inputClass} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Field><Field label="Dokumenttype" help="Hva slags dokument?"><select className={inputClass} value={form.document_type} onChange={e => setForm(p => ({ ...p, document_type: e.target.value as PropertyDocumentType }))}>{DOCUMENT_TYPES.map(type => <option key={type.value} className="bg-slate-900" value={type.value}>{type.label}</option>)}</select></Field><Field label="Status" help="Verifisering."><select className={inputClass} value={form.verification_status} onChange={e => setForm(p => ({ ...p, verification_status: e.target.value as any }))}><option className="bg-slate-900" value="pending_review">Til gjennomgang</option><option className="bg-slate-900" value="verified">Verifisert</option><option className="bg-slate-900" value="needs_followup">Må følges opp</option></select></Field></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Eier" help="Navn i skjøte/nota simple."><input className={inputClass} value={form.owner_name || ''} onChange={e => setForm(p => ({ ...p, owner_name: e.target.value }))} /></Field><Field label="Skjøtedato" help="Dato for notarialdokument."><input type="date" className={inputClass} value={form.deed_date || ''} onChange={e => setForm(p => ({ ...p, deed_date: e.target.value }))} /></Field><Field label="Skjøte/protokollnr." help="F.eks. 2296/2025."><input className={inputClass} value={form.deed_number || ''} onChange={e => setForm(p => ({ ...p, deed_number: e.target.value }))} /></Field></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Notar" help="Notarens navn."><input className={inputClass} value={form.notary_name || ''} onChange={e => setForm(p => ({ ...p, notary_name: e.target.value }))} /></Field><Field label="Register" help="Eiendomsregister."><input className={inputClass} value={form.registry || ''} onChange={e => setForm(p => ({ ...p, registry: e.target.value }))} /></Field></div>
        <Field label="Koble til parseller" help="Velg parseller dokumentet gjelder."><div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3">{parcels.map(parcel => <label key={parcel.id} className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={(form.linked_parcel_ids || []).includes(parcel.id)} onChange={e => setForm(p => ({ ...p, linked_parcel_ids: e.target.checked ? [...(p.linked_parcel_ids || []), parcel.id] : (p.linked_parcel_ids || []).filter(id => id !== parcel.id) }))} /> {parcel.name}</label>)}</div></Field>
        <Field label="Referanser catastrales" help="Komma-separert."><textarea className={textareaClass} value={(form.cadastral_refs || []).join(', ')} onChange={e => setForm(p => ({ ...p, cadastral_refs: splitList(e.target.value) }))} /></Field>
        <Field label="Registrerte finca-nummer" help="Komma-separert."><input className={inputClass} value={(form.registry_property_numbers || []).join(', ')} onChange={e => setForm(p => ({ ...p, registry_property_numbers: splitList(e.target.value) }))} /></Field>
        <Field label="Sammendrag" help="Kort forklaring av hva dokumentet beviser."><textarea className={textareaClass} value={form.summary || ''} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} /></Field>
        <Field label="Notater" help="Oppfølging, mangler eller kontrollpunkter."><textarea className={textareaClass} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></Field>
        <button onClick={saveDocument} disabled={isSaving} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {isSaving ? 'Lagrer i Supabase...' : 'Lagre dokument'}</button>
      </div></div>}
    </div>
  );
};

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="glass rounded-[2rem] p-5 border border-white/10"><div className="text-[#d9b657] mb-2">{icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-3xl font-black text-white mt-1">{value}</p></div>;
}

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span><span className={helpClass}>{help}</span>{children}</label>;
}

export default PropertyDocumentsView;
