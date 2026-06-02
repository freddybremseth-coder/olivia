import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Euro,
  FileCheck2,
  Leaf,
  Plus,
  Save,
  ShieldCheck,
  Sprout,
  X,
} from 'lucide-react';

type OrganicStatus = 'unknown' | 'in_transition' | 'certified' | 'needs_review' | 'non_compliant';
type TaskStatus = 'open' | 'in_progress' | 'done';
type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

type OrganicParcel = {
  id: string;
  location: string;
  polygon: string;
  parcela: string;
  area_m2?: number;
  crop: string;
  status: OrganicStatus;
  owner_name: string;
  notes?: string;
};

type OrganicTask = {
  id: string;
  title: string;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  responsible?: string;
  notes?: string;
};

type OrganicDocument = {
  id: string;
  title: string;
  type: 'deed' | 'catastro' | 'land_registry' | 'certification' | 'application' | 'inspection' | 'other';
  status: 'missing' | 'pending' | 'received' | 'submitted';
  notes?: string;
};

const demoParcels: OrganicParcel[] = [
  { id: 'p-9-190', location: 'Biar, Alicante', polygon: '9', parcela: '190', area_m2: 0, crop: 'Oliven', status: 'needs_review', owner_name: 'Anna Bremseth', notes: 'Må bekreftes mot endelige papirer, Catastro og økologisk register.' },
  { id: 'p-9-215', location: 'Biar, Alicante', polygon: '9', parcela: '215', area_m2: 0, crop: 'Oliven', status: 'needs_review', owner_name: 'Anna Bremseth', notes: 'Inkluder i henvendelse om økologisk kompensasjon og befaring.' },
  { id: 'p-biar-more', location: 'Biar, Alicante', polygon: '9', parcela: 'Flere parceller', area_m2: 60000, crop: 'Oliven / gårdsdrift', status: 'in_transition', owner_name: 'Anna Bremseth', notes: 'Samle full liste fra skjøte, Catastro og Land Registry.' },
];

const demoTasks: OrganicTask[] = [
  { id: 'task-1', title: 'Bekreft at alle parceller er registrert på riktig eier', due_date: '2026-06-20', priority: 'critical', status: 'open', responsible: 'Rafael Asencio / Freddy', notes: 'Viktig etter midlertidig POA/eierstruktur og endelig overdragelse.' },
  { id: 'task-2', title: 'Be om status fra økologisk sertifiseringsorgan', due_date: '2026-06-25', priority: 'high', status: 'open', responsible: 'Freddy', notes: 'Spør om Emilio Perez har gjort det han skal, og hvordan registreringen skjer i Anna sitt navn.' },
  { id: 'task-3', title: 'Forbered dokumentpakke før juli 2026 gjennomgang', due_date: '2026-07-01', priority: 'high', status: 'in_progress', responsible: 'Freddy / Anna', notes: 'Originalpapirer, Catastro, Land Registry, tidligere sertifisering, kvitteringer og dyrkingsnotater.' },
  { id: 'task-4', title: 'Avklar kompensasjon for økologisk drift', due_date: '2026-07-10', priority: 'medium', status: 'open', responsible: 'Freddy', notes: 'Hvilket skjema, frist, hvilke parceller og hvilket støtteår gjelder?' },
];

const demoDocuments: OrganicDocument[] = [
  { id: 'doc-1', title: 'Copia simple / skjøte', type: 'deed', status: 'received', notes: 'Brukes for eierskap og parcelldetaljer.' },
  { id: 'doc-2', title: 'Catastro-referanser', type: 'catastro', status: 'pending', notes: 'Må kvalitetssikres for alle parceller.' },
  { id: 'doc-3', title: 'Land Registry / Registro', type: 'land_registry', status: 'received', notes: 'Bekrefter endelig eierregistrering.' },
  { id: 'doc-4', title: 'Økologisk sertifikat / historikk', type: 'certification', status: 'pending', notes: 'Må bekrefte status, overgangsperiode og ansvarlig instans.' },
  { id: 'doc-5', title: 'Søknad om kompensasjon', type: 'application', status: 'missing', notes: 'Må avklares med myndighet/sertifiseringsorgan.' },
  { id: 'doc-6', title: 'Befaringsrapport juli 2026', type: 'inspection', status: 'missing', notes: 'Legges inn når inspeksjon er avtalt/gjennomført.' },
];

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function statusLabel(status: OrganicStatus): string {
  const labels: Record<OrganicStatus, string> = {
    unknown: 'Ukjent',
    in_transition: 'Overgang / avklares',
    certified: 'Sertifisert',
    needs_review: 'Må kontrolleres',
    non_compliant: 'Avvik',
  };
  return labels[status];
}

function statusClass(status: OrganicStatus): string {
  if (status === 'certified') return 'border-green-500/30 bg-green-500/10 text-green-400';
  if (status === 'in_transition') return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
  if (status === 'needs_review') return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
  if (status === 'non_compliant') return 'border-red-500/30 bg-red-500/10 text-red-400';
  return 'border-slate-500/20 bg-slate-500/10 text-slate-300';
}

function priorityClass(priority: TaskPriority): string {
  if (priority === 'critical') return 'text-red-400 bg-red-500/10 border-red-500/30';
  if (priority === 'high') return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  if (priority === 'medium') return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  return 'text-slate-300 bg-white/5 border-white/10';
}

function taskStatusLabel(status: TaskStatus): string {
  if (status === 'done') return 'Ferdig';
  if (status === 'in_progress') return 'Pågår';
  return 'Åpen';
}

function docStatusLabel(status: OrganicDocument['status']): string {
  if (status === 'received') return 'Mottatt';
  if (status === 'submitted') return 'Sendt inn';
  if (status === 'pending') return 'Avventer';
  return 'Mangler';
}

const OrganicCertificationView: React.FC = () => {
  const [parcels, setParcels] = useState<OrganicParcel[]>(() => getLocal('olivia_organic_parcels', demoParcels));
  const [tasks, setTasks] = useState<OrganicTask[]>(() => getLocal('olivia_organic_tasks', demoTasks));
  const [documents, setDocuments] = useState<OrganicDocument[]>(() => getLocal('olivia_organic_documents', demoDocuments));
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<Partial<OrganicTask>>({ title: '', due_date: new Date().toISOString().slice(0, 10), priority: 'medium', status: 'open', responsible: '', notes: '' });

  const stats = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== 'done').length;
    const criticalTasks = tasks.filter(t => t.priority === 'critical' && t.status !== 'done').length;
    const missingDocs = documents.filter(d => d.status === 'missing').length;
    const certifiedParcels = parcels.filter(p => p.status === 'certified').length;
    const reviewParcels = parcels.filter(p => p.status === 'needs_review' || p.status === 'unknown').length;
    return { openTasks, criticalTasks, missingDocs, certifiedParcels, reviewParcels };
  }, [tasks, documents, parcels]);

  const saveTask = () => {
    if (!taskForm.title) return;
    const task: OrganicTask = {
      id: `organic-task-${Date.now()}`,
      title: taskForm.title,
      due_date: taskForm.due_date || new Date().toISOString().slice(0, 10),
      priority: taskForm.priority || 'medium',
      status: taskForm.status || 'open',
      responsible: taskForm.responsible,
      notes: taskForm.notes,
    };
    const updated = [task, ...tasks];
    setTasks(updated);
    saveLocal('olivia_organic_tasks', updated);
    setIsTaskFormOpen(false);
    setTaskForm({ title: '', due_date: new Date().toISOString().slice(0, 10), priority: 'medium', status: 'open', responsible: '', notes: '' });
  };

  const toggleTaskDone = (taskId: string) => {
    const updated = tasks.map(task => task.id === taskId ? { ...task, status: task.status === 'done' ? 'open' : 'done' } : task);
    setTasks(updated);
    saveLocal('olivia_organic_tasks', updated);
  };

  const updateDocStatus = (docId: string, status: OrganicDocument['status']) => {
    const updated = documents.map(doc => doc.id === docId ? { ...doc, status } : doc);
    setDocuments(updated);
    saveLocal('olivia_organic_documents', updated);
  };

  const nextInspectionDate = 'Juli 2026';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3"><Leaf className="text-green-400" /> Økologisk sertifisering</h2>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">DonaAnna · Biar parceller · dokumenter · befaring · kompensasjon</p>
        </div>
        <button onClick={() => setIsTaskFormOpen(true)} className="bg-green-500 hover:bg-green-400 text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"><Plus size={20} /> Ny oppgave</button>
      </div>

      <div className="glass rounded-[2rem] p-6 border border-green-500/20 bg-green-500/5">
        <div className="flex items-start gap-4">
          <ShieldCheck className="text-green-400 mt-1" />
          <div>
            <p className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-2">Status og forklaring</p>
            <p className="text-white font-bold">Overdragelse signert 6. august 2025. Endelig eierregistrering må kobles mot økologisk register og støtte/kompensasjon.</p>
            <p className="text-xs text-slate-500 mt-2">Modulen hjelper med å holde kontroll på parceller, Catastro, Land Registry, sertifisering, kontaktpersoner, frister og planlagt gjennomgang/befaring i {nextInspectionDate}.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Åpne oppgaver', value: stats.openTasks, icon: <ClipboardCheck size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Kritiske', value: stats.criticalTasks, icon: <AlertTriangle size={18} />, cls: 'border-red-500/20 bg-red-500/10 text-red-400' },
          { label: 'Mangler dokument', value: stats.missingDocs, icon: <FileCheck2 size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Sertifiserte parceller', value: stats.certifiedParcels, icon: <CheckCircle2 size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Må kontrolleres', value: stats.reviewParcels, icon: <Sprout size={18} />, cls: 'border-white/10 bg-white/5 text-slate-300' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Parceller og økologisk status</h3>
          <div className="space-y-3">
            {parcels.map(parcel => (
              <div key={parcel.id} className={`rounded-2xl p-4 border ${statusClass(parcel.status)}`}>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-white font-bold">{parcel.location} · Polygon {parcel.polygon} · Parcela {parcel.parcela}</p>
                    <p className="text-xs text-slate-500 mt-1">{parcel.crop} · Eier: {parcel.owner_name} {parcel.area_m2 ? `· ${parcel.area_m2.toLocaleString('no-NO')} m²` : ''}</p>
                  </div>
                  <p className="text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">{statusLabel(parcel.status)}</p>
                </div>
                {parcel.notes && <p className="text-xs text-slate-400 mt-3 leading-relaxed">{parcel.notes}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Dokumentpakke</h3>
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="rounded-2xl p-4 border border-white/10 bg-white/[0.03]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <p className="text-white font-bold">{doc.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{doc.notes}</p>
                  </div>
                  <select value={doc.status} onChange={e => updateDocStatus(doc.id, e.target.value as OrganicDocument['status'])} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
                    <option value="missing">Mangler</option>
                    <option value="pending">Avventer</option>
                    <option value="received">Mottatt</option>
                    <option value="submitted">Sendt inn</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-2">Status: {docStatusLabel(doc.status)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass rounded-[2rem] p-6 border border-white/10">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Oppgaver og frister</h3>
          <div className="space-y-3">
            {tasks.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()).map(task => (
              <button key={task.id} onClick={() => toggleTaskDone(task.id)} className="w-full text-left rounded-2xl p-4 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all">
                <div className="flex justify-between gap-4 items-start">
                  <div>
                    <p className={`text-white font-bold ${task.status === 'done' ? 'line-through opacity-60' : ''}`}>{task.title}</p>
                    <p className="text-xs text-slate-500 mt-1">Frist: {task.due_date} · {task.responsible || 'ikke satt'} · {taskStatusLabel(task.status)}</p>
                  </div>
                  <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-lg border ${priorityClass(task.priority)}`}>{task.priority}</span>
                </div>
                {task.notes && <p className="text-xs text-slate-400 mt-3 leading-relaxed">{task.notes}</p>}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass rounded-[2rem] p-6 border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-start gap-3">
              <Euro size={18} className="text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm text-white font-bold">Kompensasjon / støtte</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Avklar hvilke parceller som er støtteberettiget, hvilket støtteår som gjelder, hvilke skjema som kreves, frister, og om tidligere/ny eier påvirker retten til kompensasjon for økologisk drift.</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-blue-500/20 bg-blue-500/5">
            <div className="flex items-start gap-3">
              <CalendarDays size={18} className="text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm text-white font-bold">Neste befaringspunkt</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Planlegg for ny gjennomgang/befaring i juli 2026. Før dette bør alle parceller, eierstatus, økologisk historikk, dokumenter og kompensasjonsspørsmål være avklart.</p>
              </div>
            </div>
          </div>

          <div className="glass rounded-[2rem] p-6 border border-white/10 bg-white/[0.02]">
            <p className="text-sm text-white font-bold">Spørsmål som bør avklares skriftlig</p>
            <div className="text-xs text-slate-500 mt-3 space-y-2 leading-relaxed">
              <p>• Hvordan registreres papirene og økologisk drift i Anna Bremseth sitt navn?</p>
              <p>• Har Emilio Perez gjort det han skal i overføringen/registreringen?</p>
              <p>• Hvilke parceller gjelder sertifiseringen og kompensasjonen?</p>
              <p>• Når skjer befaringen, og hva må være klart før juli 2026?</p>
              <p>• Hvilken dokumentasjon må sendes inn for støtte/kompensasjon?</p>
            </div>
          </div>
        </div>
      </div>

      {isTaskFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center"><div><h3 className="text-2xl font-bold text-white">Ny økologisk oppgave</h3><p className="text-xs text-slate-500 mt-1">Legg til frist, ansvarlig og prioritet</p></div><button onClick={() => setIsTaskFormOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={24} /></button></div>
            <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white" placeholder="Oppgave" value={taskForm.title || ''} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3"><input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={taskForm.due_date || ''} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} /><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white" value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value as TaskPriority }))}><option value="low">Lav</option><option value="medium">Medium</option><option value="high">Høy</option><option value="critical">Kritisk</option></select></div>
            <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white" placeholder="Ansvarlig" value={taskForm.responsible || ''} onChange={e => setTaskForm(p => ({ ...p, responsible: e.target.value }))} />
            <textarea className="w-full min-h-[120px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white" placeholder="Notat" value={taskForm.notes || ''} onChange={e => setTaskForm(p => ({ ...p, notes: e.target.value }))} />
            <button onClick={saveTask} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-2"><Save size={20} /> Lagre oppgave</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganicCertificationView;
