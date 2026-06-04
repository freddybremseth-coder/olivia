import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import { ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS, OrganicApplicationItem } from '../services/organicCertificationPackage';
import {
  archiveCaecvDocument,
  CaecvDocument,
  CaecvDocumentInput,
  CaecvDocumentStatus,
  defaultCaecvDocumentInput,
  fetchCaecvDocuments,
  getCaecvDocumentSignedUrl,
  uploadCaecvDocument,
} from '../services/caecvDocuments';

const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60';
const textareaClass = 'w-full min-h-[110px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60';
const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1';
const helpClass = 'text-[11px] text-slate-600 block mb-2';

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusClass(status?: string) {
  if (status === 'accepted') return 'border-green-500/30 bg-green-500/10 text-green-300';
  if (status === 'submitted' || status === 'signed') return 'border-blue-500/30 bg-blue-500/10 text-blue-300';
  if (status === 'ready_for_signature') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300';
  if (status === 'rejected') return 'border-red-500/30 bg-red-500/10 text-red-300';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function itemUploaded(item: OrganicApplicationItem, documents: CaecvDocument[]) {
  return documents.some(doc => doc.caecv_item_id === item.id);
}

const CaecvDocumentsView: React.FC = () => {
  const [documents, setDocuments] = useState<CaecvDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<CaecvDocumentInput>(() => defaultCaecvDocumentInput());

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchCaecvDocuments();
      setDocuments(rows);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente CAECV-dokumenter fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const required = ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.filter(i => i.required).length;
    const uploadedRequired = ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.filter(i => i.required && itemUploaded(i, documents)).length;
    const submitted = documents.filter(d => d.status === 'submitted' || d.status === 'accepted').length;
    const signed = documents.filter(d => d.status === 'signed' || d.status === 'submitted' || d.status === 'accepted').length;
    return { required, uploadedRequired, submitted, signed };
  }, [documents]);

  const openUpload = (item?: OrganicApplicationItem) => {
    setSelectedFile(null);
    setForm(defaultCaecvDocumentInput(item?.id));
    setModalOpen(true);
  };

  const save = async () => {
    if (!selectedFile) { setError('Velg en fil først.'); return; }
    if (!form.title.trim()) { setError('Dokumentet må ha tittel.'); return; }
    setIsSaving(true);
    setError(null);
    try {
      const saved = await uploadCaecvDocument(selectedFile, form);
      setDocuments(prev => [saved, ...prev]);
      setModalOpen(false);
      setSelectedFile(null);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke lagre CAECV-dokumentet.');
    } finally {
      setIsSaving(false);
    }
  };

  const openDocument = async (doc: CaecvDocument) => {
    try {
      const url = await getCaecvDocumentSignedUrl(doc);
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke åpne dokumentet.');
    }
  };

  const archive = async (id: string) => {
    try {
      await archiveCaecvDocument(id);
      setDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke arkivere dokumentet.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.13),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">CAECV · Doña Anna</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><ShieldCheck className="text-green-400" /> CAECV dokumentpakke</h2>
              <p className="text-slate-400 text-sm mt-2">Privat arkiv for søknad, maler, signerte skjema, NIE, parselliste, kvitteringer og korrespondanse ved økologisk sertifisering.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
            <button onClick={() => openUpload()} className="bg-[#d9b657] hover:bg-[#f0cf70] text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-[#d9b657]/20 flex items-center gap-2"><Plus size={20} /> Last opp</button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Obligatoriske lastet opp" value={`${stats.uploadedRequired}/${stats.required}`} icon={<CheckCircle2 size={18} />} />
        <Stat label="Dokumenter" value={String(documents.length)} icon={<FileText size={18} />} />
        <Stat label="Signert" value={String(stats.signed)} icon={<ShieldCheck size={18} />} />
        <Stat label="Sendt/akseptert" value={String(stats.submitted)} icon={<Upload size={18} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sjekkliste fra CAECV</h3>
          {ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.map(item => {
            const docs = documents.filter(doc => doc.caecv_item_id === item.id);
            const done = docs.length > 0;
            return (
              <div key={item.id} className={`glass rounded-[2rem] p-5 border ${done ? 'border-green-500/25 bg-green-500/5' : item.required ? 'border-amber-500/25 bg-amber-500/5' : 'border-white/10 bg-white/[0.02]'}`}>
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-widest mb-1 text-slate-500">{item.required ? 'Obligatorisk' : 'Betinget'} · {item.caecvCode || 'støttedokument'}</p>
                    <h4 className="text-white font-bold">{item.title}</h4>
                    <p className="text-xs text-slate-500 mt-1">{item.fileName || 'Ingen filnavn registrert'}</p>
                  </div>
                  {done ? <CheckCircle2 className="text-green-400 flex-shrink-0" /> : <button onClick={() => openUpload(item)} className="p-3 rounded-2xl bg-white/5 text-[#d9b657] hover:bg-white/10 flex-shrink-0"><Upload size={18} /></button>}
                </div>
                <p className="text-sm text-slate-400 mt-3 line-clamp-2">{item.summary}</p>
                {docs.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{docs.map(doc => <button key={doc.id} onClick={() => openDocument(doc)} className={`text-[10px] px-2 py-1 rounded-full border ${statusClass(doc.status)}`}>{doc.status} · {doc.original_filename}</button>)}</div>}
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Opplastede CAECV-dokumenter</h3>
          {documents.map(doc => (
            <div key={doc.id} className={`glass rounded-[2rem] p-5 border ${statusClass(doc.status)}`}>
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-widest mb-1">{doc.document_code || doc.document_type} · {doc.status}</p>
                  <h4 className="text-white font-bold">{doc.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">{doc.original_filename || 'fil'} · {formatBytes(doc.file_size_bytes)}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openDocument(doc)} className="p-3 rounded-2xl bg-white/5 text-green-400 hover:bg-white/10"><ExternalLink size={18} /></button>
                  <button onClick={() => archive(doc.id)} className="p-3 rounded-2xl bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10"><Archive size={18} /></button>
                </div>
              </div>
              {doc.notes && <p className="text-sm text-slate-400 mt-3 line-clamp-3">{doc.notes}</p>}
              {doc.next_action && <p className="text-xs text-[#d9b657] mt-3 line-clamp-2">Neste: {doc.next_action}</p>}
            </div>
          ))}
          {!documents.length && <div className="rounded-[2rem] border border-dashed border-white/10 p-8 text-center text-slate-500"><FileText className="mx-auto mb-3" />Ingen CAECV-dokumenter er lastet opp ennå.</div>}
        </div>
      </div>

      {modalOpen && <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full md:max-w-4xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"><div className="flex justify-between items-start gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Supabase Storage · caecv-documents</p><h3 className="text-2xl font-bold text-white mt-1">Last opp CAECV-dokument</h3></div><button onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button></div>
        <Field label="Fil" help="PDF, DOCX, XLSX eller bilde. Lagring skjer privat i Supabase Storage."><input type="file" accept="application/pdf,.doc,.docx,.xls,.xlsx,image/jpeg,image/png,image/webp" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-[#d9b657] file:px-4 file:py-2 file:text-sm file:font-bold file:text-black hover:file:bg-[#f0cf70]" />{selectedFile && <p className="text-xs text-green-400 mt-2">Valgt: {selectedFile.name} · {formatBytes(selectedFile.size)}</p>}</Field>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Tittel" help="Navn i arkivet."><input className={inputClass} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Field><Field label="CAECV-punkt" help="Hvilket punkt hører filen til?"><select className={inputClass} value={form.caecv_item_id || ''} onChange={e => setForm(defaultCaecvDocumentInput(e.target.value))}><option className="bg-slate-900" value="">Velg punkt</option>{ORGANIC_CHANGE_OF_OWNERSHIP_ITEMS.map(item => <option key={item.id} className="bg-slate-900" value={item.id}>{item.title}</option>)}</select></Field><Field label="Status" help="Hvor langt er dokumentet?"><select className={inputClass} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as CaecvDocumentStatus }))}><option className="bg-slate-900" value="template">Mal</option><option className="bg-slate-900" value="draft">Utkast</option><option className="bg-slate-900" value="ready_for_signature">Klar for signatur</option><option className="bg-slate-900" value="signed">Signert</option><option className="bg-slate-900" value="submitted">Sendt</option><option className="bg-slate-900" value="accepted">Akseptert</option><option className="bg-slate-900" value="rejected">Avvist</option></select></Field></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Dokumentkode" help="F.eks. FPO05164."><input className={inputClass} value={form.document_code || ''} onChange={e => setForm(p => ({ ...p, document_code: e.target.value }))} /></Field><Field label="Signert av" help="Valgfritt."><input className={inputClass} value={form.signed_by || ''} onChange={e => setForm(p => ({ ...p, signed_by: e.target.value }))} /></Field><Field label="Signert dato" help="Valgfritt."><input type="date" className={inputClass} value={form.signed_at || ''} onChange={e => setForm(p => ({ ...p, signed_at: e.target.value }))} /></Field></div>
        <Field label="Notater" help="Hva er dette dokumentet, og hva må gjøres videre?"><textarea className={textareaClass} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></Field>
        <Field label="Neste handling" help="Oppgave eller kontrollpunkt."><textarea className={textareaClass} value={form.next_action || ''} onChange={e => setForm(p => ({ ...p, next_action: e.target.value }))} /></Field>
        <button onClick={save} disabled={isSaving} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50">{isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Lagre CAECV-dokument</button>
      </div></div>}
    </div>
  );
};

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span><span className={helpClass}>{help}</span>{children}</label>;
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="glass rounded-[2rem] p-5 border border-white/10"><div className="text-[#d9b657] mb-2">{icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-3xl font-black text-white mt-1">{value}</p></div>;
}

export default CaecvDocumentsView;
