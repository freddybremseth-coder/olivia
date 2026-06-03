import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Edit2,
  Loader2,
  MapPin,
  Plus,
  Play,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';
import type { Parcel, Task } from '../types';
import { deleteTask as dbDeleteTask, fetchTasks, upsertTask } from '../services/db';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';

interface TasksKanbanOliviaViewProps {
  parcels: Parcel[];
}

type TaskStatus = Task['status'];
type TaskPriority = Task['priority'];

const STATUS_COLUMNS: { status: TaskStatus; title: string; description: string; accent: string }[] = [
  { status: 'TODO', title: 'Planlagt', description: 'Oppgaver som skal gjøres', accent: 'text-slate-300' },
  { status: 'IN_PROGRESS', title: 'Pågår', description: 'Arbeid som er startet', accent: 'text-blue-300' },
  { status: 'DONE', title: 'Fullført', description: 'Utførte og lukkede oppgaver', accent: 'text-emerald-300' },
];

const PRIORITIES: TaskPriority[] = ['Lav', 'Middels', 'Høy', 'Kritisk'];
const CATEGORIES = ['Vedlikehold', 'Vanning', 'Innhøsting', 'Bordoliven', 'Olje', 'Plantevern', 'Økologi', 'Salg', 'Auto-oppgave', 'Annet'];

const EMPTY_TASK: Partial<Task> = {
  title: '',
  priority: 'Middels',
  category: 'Vedlikehold',
  status: 'TODO',
  user: '',
  parcelId: undefined,
  dueDate: undefined,
};

function makeTaskId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function priorityClasses(priority: TaskPriority) {
  if (priority === 'Kritisk') return 'bg-red-500/15 text-red-300 border-red-500/25';
  if (priority === 'Høy') return 'bg-amber-500/15 text-amber-300 border-amber-500/25';
  if (priority === 'Middels') return 'bg-blue-500/15 text-blue-300 border-blue-500/25';
  return 'bg-slate-500/15 text-slate-300 border-slate-500/25';
}

function formatDate(date?: string) {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
  } catch {
    return date;
  }
}

const TasksKanbanOliviaView: React.FC<TasksKanbanOliviaViewProps> = ({ parcels }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formTask, setFormTask] = useState<Partial<Task>>(EMPTY_TASK);

  const parcelById = useMemo(() => new Map(parcels.map(parcel => [parcel.id, parcel])), [parcels]);

  const loadTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchTasks();
      setTasks(rows);
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke hente oppgaver fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const refresh = () => loadTasks();
    window.addEventListener('storage', refresh);
    window.addEventListener('olivia:tasks:changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('olivia:tasks:changed', refresh);
    };
  }, []);

  const kpis = useMemo(() => {
    const open = tasks.filter(task => task.status !== 'DONE').length;
    const critical = tasks.filter(task => task.priority === 'Kritisk' && task.status !== 'DONE').length;
    const completed = tasks.filter(task => task.status === 'DONE').length;
    const parcelLinked = tasks.filter(task => !!task.parcelId).length;
    return { open, critical, completed, parcelLinked };
  }, [tasks]);

  const priorityCounts = useMemo(() => {
    return PRIORITIES.map(priority => ({ priority, count: tasks.filter(task => task.priority === priority).length }));
  }, [tasks]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach(task => counts.set(task.category || 'Uten kategori', (counts.get(task.category || 'Uten kategori') || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [tasks]);

  const openNew = () => {
    setEditingTask(null);
    setFormTask({ ...EMPTY_TASK });
    setIsModalOpen(true);
    setError(null);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setFormTask({ ...task });
    setIsModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setFormTask({ ...EMPTY_TASK });
  };

  const persistTask = async (task: Task) => {
    setIsSaving(true);
    setError(null);
    try {
      await upsertTask(task);
      setTasks(prev => {
        const exists = prev.some(item => item.id === task.id);
        if (!exists) return [task, ...prev];
        return prev.map(item => (item.id === task.id ? task : item));
      });
      window.dispatchEvent(new Event('olivia:tasks:changed'));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke lagre oppgaven i Supabase.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formTask.title?.trim()) {
      setError('Skriv inn en tydelig tittel på oppgaven før du lagrer.');
      return;
    }

    const task: Task = {
      id: editingTask?.id || makeTaskId(),
      title: formTask.title.trim(),
      priority: (formTask.priority || 'Middels') as TaskPriority,
      category: (formTask.category || 'Vedlikehold').trim(),
      user: (formTask.user || '').trim(),
      status: (formTask.status || editingTask?.status || 'TODO') as TaskStatus,
      parcelId: formTask.parcelId || undefined,
      dueDate: formTask.dueDate || undefined,
    };

    await persistTask(task);
    closeModal();
  };

  const updateStatus = async (task: Task, status: TaskStatus) => {
    await persistTask({ ...task, status });
  };

  const handleDelete = async (task: Task) => {
    if (!confirm('Slette denne oppgaven fra Doña Anna/Supabase?')) return;
    setIsSaving(true);
    setError(null);
    try {
      await dbDeleteTask(task.id);
      setTasks(prev => prev.filter(item => item.id !== task.id));
      closeModal();
      window.dispatchEvent(new Event('olivia:tasks:changed'));
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke slette oppgaven.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(111,127,60,0.16),transparent_34%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <DonaAnnaBrandMark variant="symbol" size="md" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Olivia · Supabase</p>
              <h2 className="mt-2 text-3xl font-bold text-white">Oppgaver & Kanban</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Planlegg, fordel og fullfør gårdsarbeid for Doña Anna. Oppgavene hentes og lagres i Supabase-tabellen <span className="font-mono text-[#d9b657]">olivia.tasks</span>.
              </p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d9b657] px-6 py-3 font-bold text-[#070b08] transition-all hover:brightness-110"
          >
            <Plus size={20} /> Ny oppgave
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
          <div>
            <p className="font-bold">Supabase-varsel</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="Åpne oppgaver" value={kpis.open} hint="Planlagt + pågår" icon={<ClipboardList size={18} />} />
        <KpiCard label="Kritiske" value={kpis.critical} hint="Ikke fullført" icon={<AlertCircle size={18} />} />
        <KpiCard label="Fullført" value={kpis.completed} hint="Historikk i Supabase" icon={<CheckCircle2 size={18} />} />
        <KpiCard label="Knyttet til parsell" value={kpis.parcelLinked} hint="Med parcel_id" icon={<MapPin size={18} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className="flex gap-5 overflow-x-auto pb-4">
          {STATUS_COLUMNS.map(column => {
            const columnTasks = tasks.filter(task => task.status === column.status);
            return (
              <section key={column.status} className="min-w-[310px] flex-1 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${column.accent}`}>{column.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{column.description}</p>
                  </div>
                  <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-slate-400">{columnTasks.length}</span>
                </div>

                <div className="space-y-3">
                  {isLoading && column.status === 'TODO' && (
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-slate-400">
                      <Loader2 className="animate-spin" size={16} /> Henter oppgaver fra Supabase
                    </div>
                  )}

                  {!isLoading && tasks.length === 0 && column.status === 'TODO' && (
                    <div className="rounded-2xl border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-6 text-center">
                      <ClipboardList className="mx-auto mb-3 text-[#d9b657]" size={28} />
                      <h4 className="font-bold text-white">Ingen oppgaver ennå</h4>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        Start med én ekte oppgave for gården. Ingenting legges inn som demo-data, og alt du oppretter lagres i Supabase.
                      </p>
                      <button onClick={openNew} className="mt-4 rounded-xl bg-[#d9b657] px-4 py-2 text-xs font-bold text-[#070b08]">
                        Opprett første oppgave
                      </button>
                    </div>
                  )}

                  {!isLoading && columnTasks.length === 0 && tasks.length > 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-600">
                      Ingen oppgaver i denne kolonnen.
                    </div>
                  )}

                  {columnTasks.map(task => {
                    const parcel = task.parcelId ? parcelById.get(task.parcelId) : undefined;
                    return (
                      <article key={task.id} className="rounded-2xl border border-white/10 bg-[#0b120d]/85 p-4 shadow-lg shadow-black/10 transition-all hover:border-[#d9b657]/30">
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${priorityClasses(task.priority)}`}>{task.priority}</span>
                          <button onClick={() => openEdit(task)} title="Rediger oppgave" className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-white">
                            <Edit2 size={14} />
                          </button>
                        </div>

                        <h4 className={`text-sm font-bold leading-snug ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-white'}`}>{task.title}</h4>

                        <div className="mt-3 space-y-2 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className={parcel ? 'text-[#d9b657]' : ''} />
                            <span>{parcel?.name || (task.parcelId ? 'Parsell ikke funnet' : 'Hele gården')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User size={13} />
                            <span>{task.user || 'Ingen ansvarlig satt'}</span>
                          </div>
                          {task.dueDate && <p className="text-[#d9b657]">Frist: {formatDate(task.dueDate)}</p>}
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{task.category || 'Uten kategori'}</span>
                          <div className="flex items-center gap-1">
                            {task.status !== 'TODO' && (
                              <button onClick={() => updateStatus(task, 'TODO')} title="Flytt til planlagt" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/10 hover:text-slate-200">
                                <ClipboardList size={14} />
                              </button>
                            )}
                            {task.status !== 'IN_PROGRESS' && task.status !== 'DONE' && (
                              <button onClick={() => updateStatus(task, 'IN_PROGRESS')} title="Sett som pågår" className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-500/10 hover:text-blue-300">
                                <Play size={14} />
                              </button>
                            )}
                            {task.status !== 'DONE' && (
                              <button onClick={() => updateStatus(task, 'DONE')} title="Merk som fullført" className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-500/10 hover:text-emerald-300">
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-300">
              <BarChart3 size={18} />
              <h3 className="font-bold">Fordeling</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Prioritet</p>
                <div className="space-y-2">
                  {priorityCounts.map(item => (
                    <div key={item.priority} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-xs">
                      <span className="text-slate-300">{item.priority}</span>
                      <span className="font-bold text-white">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Kategori</p>
                <div className="space-y-2">
                  {categoryCounts.length === 0 ? (
                    <p className="rounded-xl bg-black/20 px-3 py-2 text-xs text-slate-600">Ingen kategorier ennå.</p>
                  ) : categoryCounts.map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between rounded-xl bg-black/20 px-3 py-2 text-xs">
                      <span className="text-slate-300">{category}</span>
                      <span className="font-bold text-white">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-[2rem] border border-white/15 bg-[#070b08] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna oppgave</p>
                <h3 className="mt-1 text-xl font-bold text-white">{editingTask ? 'Rediger oppgave' : 'Ny oppgave'}</h3>
              </div>
              <button onClick={closeModal} className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <Field label="Oppgavetittel *" helper="Skriv kort og konkret hva som skal gjøres.">
                <input
                  autoFocus
                  type="text"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#d9b657]/60"
                  placeholder="F.eks. Kontrollere dryppvanning på parcela 190"
                  value={formTask.title || ''}
                  onChange={event => setFormTask(prev => ({ ...prev, title: event.target.value }))}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Status" helper="Flytt oppgaven mellom planlagt, pågår og fullført.">
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#d9b657]/60"
                    value={formTask.status || 'TODO'}
                    onChange={event => setFormTask(prev => ({ ...prev, status: event.target.value as TaskStatus }))}
                  >
                    <option className="bg-slate-900" value="TODO">Planlagt</option>
                    <option className="bg-slate-900" value="IN_PROGRESS">Pågår</option>
                    <option className="bg-slate-900" value="DONE">Fullført</option>
                  </select>
                </Field>
                <Field label="Prioritet" helper="Bruk Kritisk kun når oppgaven haster eller kan gi tap/skade.">
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#d9b657]/60"
                    value={formTask.priority || 'Middels'}
                    onChange={event => setFormTask(prev => ({ ...prev, priority: event.target.value as TaskPriority }))}
                  >
                    {PRIORITIES.map(priority => <option key={priority} className="bg-slate-900" value={priority}>{priority}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Kategori" helper="Velg eller skriv egen kategori, f.eks. Auto-oppgave.">
                  <input
                    list="task-categories"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#d9b657]/60"
                    placeholder="F.eks. Vanning, Økologi eller Auto-oppgave"
                    value={formTask.category || ''}
                    onChange={event => setFormTask(prev => ({ ...prev, category: event.target.value }))}
                  />
                  <datalist id="task-categories">
                    {CATEGORIES.map(category => <option key={category} value={category} />)}
                  </datalist>
                </Field>
                <Field label="Ansvarlig" helper="Navn på personen som skal følge opp oppgaven.">
                  <input
                    type="text"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#d9b657]/60"
                    placeholder="F.eks. Freddy, Anna, Emilio eller Rafael"
                    value={formTask.user || ''}
                    onChange={event => setFormTask(prev => ({ ...prev, user: event.target.value }))}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Parsell" helper="Knytt oppgaven til én parsell, eller la den gjelde hele gården.">
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#d9b657]/60"
                    value={formTask.parcelId || ''}
                    onChange={event => setFormTask(prev => ({ ...prev, parcelId: event.target.value || undefined }))}
                  >
                    <option className="bg-slate-900" value="">Hele gården</option>
                    {parcels.map(parcel => <option key={parcel.id} className="bg-slate-900" value={parcel.id}>{parcel.name}</option>)}
                  </select>
                </Field>
                <Field label="Frist" helper="Valgfri dato for når oppgaven bør være utført.">
                  <input
                    type="date"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#d9b657]/60"
                    value={formTask.dueDate || ''}
                    onChange={event => setFormTask(prev => ({ ...prev, dueDate: event.target.value || undefined }))}
                  />
                </Field>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              {editingTask ? (
                <button
                  onClick={() => handleDelete(editingTask)}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/25 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 size={16} /> Slett
                </button>
              ) : <span />}
              <button
                onClick={handleSave}
                disabled={isSaving || !formTask.title?.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#d9b657] px-6 py-3 text-sm font-bold text-[#070b08] transition hover:brightness-110 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {editingTask ? 'Lagre endringer' : 'Opprett oppgave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function KpiCard({ label, value, hint, icon }: { label: string; value: number; hint: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between text-slate-400">
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
        {icon}
      </div>
      <p className="text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function Field({ label, helper, children }: { label: string; helper: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</span>
      <span className="mb-2 block text-xs text-slate-500">{helper}</span>
      {children}
    </label>
  );
}

export default TasksKanbanOliviaView;
