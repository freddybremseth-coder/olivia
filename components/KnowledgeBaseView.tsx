import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  Leaf,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import {
  fetchKnowledgeChunks,
  fetchKnowledgeSources,
  fetchOliveVarietyProfiles,
  KnowledgeCategory,
  KnowledgeChunk,
  KnowledgeSource,
  OliveVarietyProfile,
  upsertKnowledgeChunk,
  upsertKnowledgeSource,
  upsertOliveVarietyProfile,
} from '../services/oliviaKnowledge';

type Tab = 'varieties' | 'chunks' | 'sources';
type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

const inputClass = 'w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60';
const textareaClass = 'w-full min-h-[120px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60';
const labelClass = 'text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1';
const helpClass = 'text-[11px] text-slate-600 block mb-2';

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}`;
}

function splitList(value: string): string[] {
  return value.split(',').map(v => v.trim()).filter(Boolean);
}

function emptyVariety(): OliveVarietyProfile {
  return {
    id: makeId('variety'),
    name: '',
    synonyms: [],
    primary_use: 'unknown',
    required_photos: ['heltre', 'blad overside', 'blad underside', 'frukt med skala', 'stein/kjerne hvis mulig'],
    source_ids: [],
    is_verified: false,
    is_active: true,
  };
}

function emptyChunk(): KnowledgeChunk {
  return {
    id: makeId('chunk'),
    title: '',
    category: 'general',
    tags: [],
    content: '',
    applies_to_varieties: [],
    applies_to_season: [],
    language: 'no',
    reliability_score: 3,
    is_active: true,
  };
}

function emptySource(): KnowledgeSource {
  return {
    id: makeId('source'),
    title: '',
    source_type: 'manual',
    language: 'no',
    reliability_score: 3,
  };
}

const categories: KnowledgeCategory[] = ['olive_variety', 'disease', 'pest', 'soil', 'water', 'irrigation', 'pruning', 'regenerative', 'table_olives', 'olive_oil', 'organic_certification', 'farm_operations', 'local_biar', 'sop', 'general'];

const KnowledgeBaseView: React.FC = () => {
  const [tab, setTab] = useState<Tab>('varieties');
  const [varieties, setVarieties] = useState<OliveVarietyProfile[]>([]);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [varietyForm, setVarietyForm] = useState<OliveVarietyProfile>(() => emptyVariety());
  const [chunkForm, setChunkForm] = useState<KnowledgeChunk>(() => emptyChunk());
  const [sourceForm, setSourceForm] = useState<KnowledgeSource>(() => emptySource());
  const [isVarietyOpen, setIsVarietyOpen] = useState(false);
  const [isChunkOpen, setIsChunkOpen] = useState(false);
  const [isSourceOpen, setIsSourceOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [sourceRows, varietyRows, chunkRows] = await Promise.all([
        fetchKnowledgeSources(),
        fetchOliveVarietyProfiles(),
        fetchKnowledgeChunks(undefined, undefined, 100),
      ]);
      setSources(sourceRows);
      setVarieties(varietyRows);
      setChunks(chunkRows);
      setLoadState(sourceRows.length || varietyRows.length || chunkRows.length ? 'supabase' : 'empty');
    } catch (error) {
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente kunnskapsbase fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredVarieties = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return varieties;
    return varieties.filter(v => [v.name, ...(v.synonyms || []), v.primary_use, v.local_relevance || '', v.identification_tips || ''].join(' ').toLowerCase().includes(q));
  }, [varieties, search]);

  const filteredChunks = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return chunks;
    return chunks.filter(c => [c.title, c.category, c.content, c.summary || '', ...(c.tags || [])].join(' ').toLowerCase().includes(q));
  }, [chunks, search]);

  const saveVariety = async () => {
    if (!varietyForm.name.trim()) { setErrorMessage('Sortprofil må ha navn.'); return; }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await upsertOliveVarietyProfile({ ...varietyForm, name: varietyForm.name.trim() });
      setVarieties(prev => [saved, ...prev.filter(v => v.id !== saved.id && v.name !== saved.name)]);
      setIsVarietyOpen(false);
      setVarietyForm(emptyVariety());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke lagre sortprofil.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveChunk = async () => {
    if (!chunkForm.title.trim() || !chunkForm.content.trim()) { setErrorMessage('Kunnskapsbit må ha tittel og innhold.'); return; }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await upsertKnowledgeChunk(chunkForm);
      setChunks(prev => [saved, ...prev.filter(c => c.id !== saved.id)]);
      setIsChunkOpen(false);
      setChunkForm(emptyChunk());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke lagre kunnskapsbit.');
    } finally {
      setIsSaving(false);
    }
  };

  const saveSource = async () => {
    if (!sourceForm.title.trim()) { setErrorMessage('Kilde må ha tittel.'); return; }
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const saved = await upsertKnowledgeSource(sourceForm);
      setSources(prev => [saved, ...prev.filter(s => s.id !== saved.id)]);
      setIsSourceOpen(false);
      setSourceForm(emptySource());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke lagre kilde.');
    } finally {
      setIsSaving(false);
    }
  };

  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen kunnskap ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.13),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia Expert Brain</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1"><Database className="text-green-400" /> Kunnskapsbase</h2>
              <p className="text-slate-400 text-sm mt-2">Sortprofiler, lokal kunnskap, regenerativ drift og fagnotater som AI kan bruke som støtte.</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">{sourceLabel}</p>
            </div>
          </div>
          <button onClick={loadData} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">{isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}</button>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Sortprofiler" value={varieties.length} icon={<Leaf size={18} />} />
        <Stat label="Kunnskapsbiter" value={chunks.length} icon={<BookOpen size={18} />} />
        <Stat label="Kilder" value={sources.length} icon={<FileText size={18} />} />
        <Stat label="Verifiserte sorter" value={varieties.filter(v => v.is_verified).length} icon={<CheckCircle2 size={18} />} />
      </div>

      <div className="glass rounded-[2rem] p-4 border border-white/10 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
          {(['varieties', 'chunks', 'sources'] as Tab[]).map(item => <button key={item} onClick={() => setTab(item)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest ${tab === item ? 'bg-[#d9b657] text-black' : 'text-slate-500 hover:text-white'}`}>{item === 'varieties' ? 'Sorter' : item === 'chunks' ? 'Kunnskap' : 'Kilder'}</button>)}
        </div>
        <div className="flex gap-2 flex-1 md:max-w-lg">
          <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input className={`${inputClass} pl-10`} placeholder="Søk..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button onClick={() => tab === 'varieties' ? setIsVarietyOpen(true) : tab === 'chunks' ? setIsChunkOpen(true) : setIsSourceOpen(true)} className="bg-[#d9b657] text-black rounded-2xl px-4 font-bold flex items-center gap-2"><Plus size={18} /> Ny</button>
        </div>
      </div>

      {isLoading && loadState === 'loading' ? <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter kunnskapsbase...</div> : null}

      {tab === 'varieties' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{filteredVarieties.map(v => <button key={v.id} onClick={() => { setVarietyForm(v); setIsVarietyOpen(true); }} className="text-left glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02] hover:border-[#d9b657]/30 transition-all"><div className="flex justify-between gap-4"><div><p className="text-white font-bold text-xl">{v.name}</p><p className="text-xs text-slate-500 mt-1">{v.synonyms?.join(', ') || 'Ingen synonymer'} · {v.primary_use}</p></div><span className={`text-[10px] px-3 py-1 rounded-full h-fit border font-bold uppercase tracking-widest ${v.is_verified ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300'}`}>{v.is_verified ? 'Verifisert' : 'Uverifisert'}</span></div><p className="text-sm text-slate-400 mt-4 line-clamp-3">{v.identification_tips || v.local_relevance || 'Ingen identifikasjonsnotater ennå.'}</p></button>)}</div>}

      {tab === 'chunks' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{filteredChunks.map(c => <button key={c.id} onClick={() => { setChunkForm(c); setIsChunkOpen(true); }} className="text-left glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02] hover:border-[#d9b657]/30 transition-all"><p className="text-[10px] text-[#d9b657] uppercase font-bold tracking-widest">{c.category} · {c.reliability_score}/5</p><p className="text-white font-bold text-lg mt-1">{c.title}</p><p className="text-sm text-slate-400 mt-3 line-clamp-4">{c.summary || c.content}</p><div className="flex flex-wrap gap-2 mt-4">{c.tags.slice(0, 5).map(tag => <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-white/5 text-slate-400 border border-white/5">{tag}</span>)}</div></button>)}</div>}

      {tab === 'sources' && <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{sources.map(s => <button key={s.id} onClick={() => { setSourceForm(s); setIsSourceOpen(true); }} className="text-left glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02] hover:border-[#d9b657]/30 transition-all"><p className="text-[10px] text-[#d9b657] uppercase font-bold tracking-widest">{s.source_type} · {s.reliability_score}/5</p><p className="text-white font-bold text-lg mt-1">{s.title}</p><p className="text-sm text-slate-400 mt-3 line-clamp-2">{s.notes || s.url || 'Ingen notater.'}</p></button>)}</div>}

      {loadState === 'empty' && !isLoading && <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center"><Sparkles className="mx-auto text-[#d9b657] mb-3" size={34} /><h4 className="text-white font-bold text-lg">Ingen kunnskap registrert ennå</h4><p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">Kjør migrasjonen, eller legg inn første sortprofil/kunnskapsbit manuelt.</p></div>}

      {isVarietyOpen && <Modal title="Sortprofil" onClose={() => setIsVarietyOpen(false)}><VarietyForm form={varietyForm} setForm={setVarietyForm} /><SaveButton onClick={saveVariety} loading={isSaving} /></Modal>}
      {isChunkOpen && <Modal title="Kunnskapsbit" onClose={() => setIsChunkOpen(false)}><ChunkForm form={chunkForm} setForm={setChunkForm} /><SaveButton onClick={saveChunk} loading={isSaving} /></Modal>}
      {isSourceOpen && <Modal title="Kilde" onClose={() => setIsSourceOpen(false)}><SourceForm form={sourceForm} setForm={setSourceForm} /><SaveButton onClick={saveSource} loading={isSaving} /></Modal>}
    </div>
  );
};

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="glass rounded-[2rem] p-5 border border-white/10"><div className="text-[#d9b657] mb-2">{icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{label}</p><p className="text-3xl font-black text-white mt-1">{value}</p></div>;
}

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span><span className={helpClass}>{help}</span>{children}</label>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md"><div className="glass w-full md:max-w-4xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"><div className="flex justify-between items-start gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Olivia Knowledge Base</p><h3 className="text-2xl font-bold text-white mt-1">{title}</h3></div><button onClick={onClose} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button></div>{children}</div></div>;
}

function SaveButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return <button onClick={onClick} disabled={loading} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50">{loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Lagre i Supabase</button>;
}

function VarietyForm({ form, setForm }: { form: OliveVarietyProfile; setForm: React.Dispatch<React.SetStateAction<OliveVarietyProfile>> }) {
  return <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Navn" help="Hovednavn på sorten."><input className={inputClass} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field><Field label="Synonymer" help="Komma-separert."><input className={inputClass} value={form.synonyms.join(', ')} onChange={e => setForm(p => ({ ...p, synonyms: splitList(e.target.value) }))} /></Field><Field label="Bruk" help="Olje, bordoliven eller begge."><select className={inputClass} value={form.primary_use} onChange={e => setForm(p => ({ ...p, primary_use: e.target.value as OliveVarietyProfile['primary_use'] }))}><option className="bg-slate-900" value="oil">Olje</option><option className="bg-slate-900" value="table">Bordoliven</option><option className="bg-slate-900" value="dual">Begge</option><option className="bg-slate-900" value="unknown">Ukjent</option></select></Field></div><Field label="Lokal relevans" help="Hvor finnes den på gården, hva vet vi lokalt?"><textarea className={textareaClass} value={form.local_relevance || ''} onChange={e => setForm(p => ({ ...p, local_relevance: e.target.value }))} /></Field><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Bladkjennetegn" help="Form, farge, underside, størrelse."><textarea className={textareaClass} value={form.leaf_traits || ''} onChange={e => setForm(p => ({ ...p, leaf_traits: e.target.value }))} /></Field><Field label="Fruktkjennetegn" help="Størrelse, form, modning, bord/olje."><textarea className={textareaClass} value={form.fruit_traits || ''} onChange={e => setForm(p => ({ ...p, fruit_traits: e.target.value }))} /></Field></div><Field label="Identifikasjonstips" help="Hvordan AI/feltperson bør vurdere sorten."><textarea className={textareaClass} value={form.identification_tips || ''} onChange={e => setForm(p => ({ ...p, identification_tips: e.target.value }))} /></Field><Field label="Forvekslingsrisiko" help="Hvilke sorter kan den ligne på?"><textarea className={textareaClass} value={form.confusion_risks || ''} onChange={e => setForm(p => ({ ...p, confusion_risks: e.target.value }))} /></Field><div className="flex items-center gap-3"><input id="verified" type="checkbox" checked={form.is_verified} onChange={e => setForm(p => ({ ...p, is_verified: e.target.checked }))} /><label htmlFor="verified" className="text-sm text-slate-300">Verifisert av lokal ekspert/dokumentasjon</label></div></div>;
}

function ChunkForm({ form, setForm }: { form: KnowledgeChunk; setForm: React.Dispatch<React.SetStateAction<KnowledgeChunk>> }) {
  return <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Tittel" help="Kort navn."><input className={inputClass} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Field><Field label="Kategori" help="Hva kunnskapen gjelder."><select className={inputClass} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as KnowledgeCategory }))}>{categories.map(c => <option key={c} className="bg-slate-900" value={c}>{c}</option>)}</select></Field><Field label="Pålitelighet" help="1-5."><input type="number" min={1} max={5} className={inputClass} value={form.reliability_score} onChange={e => setForm(p => ({ ...p, reliability_score: Number(e.target.value) }))} /></Field></div><Field label="Tags" help="Komma-separert."><input className={inputClass} value={form.tags.join(', ')} onChange={e => setForm(p => ({ ...p, tags: splitList(e.target.value) }))} /></Field><Field label="Sammendrag" help="Kort versjon AI kan lese raskt."><textarea className={textareaClass} value={form.summary || ''} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} /></Field><Field label="Innhold" help="Selve kunnskapen."><textarea className="w-full min-h-[260px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} /></Field><Field label="Gjelder sorter" help="Komma-separert, valgfritt."><input className={inputClass} value={form.applies_to_varieties.join(', ')} onChange={e => setForm(p => ({ ...p, applies_to_varieties: splitList(e.target.value) }))} /></Field></div>;
}

function SourceForm({ form, setForm }: { form: KnowledgeSource; setForm: React.Dispatch<React.SetStateAction<KnowledgeSource>> }) {
  return <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Field label="Tittel" help="Kildenavn."><input className={inputClass} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Field><Field label="Type" help="Kildetype."><select className={inputClass} value={form.source_type} onChange={e => setForm(p => ({ ...p, source_type: e.target.value as KnowledgeSource['source_type'] }))}><option className="bg-slate-900" value="manual">Manual</option><option className="bg-slate-900" value="book">Book</option><option className="bg-slate-900" value="research">Research</option><option className="bg-slate-900" value="web">Web</option><option className="bg-slate-900" value="local_expert">Local expert</option><option className="bg-slate-900" value="farm_observation">Farm observation</option><option className="bg-slate-900" value="sop">SOP</option><option className="bg-slate-900" value="other">Other</option></select></Field><Field label="Pålitelighet" help="1-5."><input type="number" min={1} max={5} className={inputClass} value={form.reliability_score} onChange={e => setForm(p => ({ ...p, reliability_score: Number(e.target.value) }))} /></Field></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Field label="Forfatter" help="Valgfritt."><input className={inputClass} value={form.author || ''} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} /></Field><Field label="URL" help="Valgfritt."><input className={inputClass} value={form.url || ''} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} /></Field></div><Field label="Notater" help="Hva brukes kilden til?"><textarea className={textareaClass} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></Field></div>;
}

export default KnowledgeBaseView;
