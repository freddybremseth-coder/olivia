
import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, User, MapPin, AlertCircle, X, CheckCircle2, ClipboardList, Edit2, Play } from 'lucide-react';
import { Task, Parcel } from '../types';

const SUGGESTED_TASKS: Partial<Task>[] = [
  { title: 'Innhøsting av oliven', priority: 'Kritisk', category: 'Innhøsting' },
  { title: 'Årlig hovedbeskjæring (Vinter)', priority: 'Høy', category: 'Vedlikehold' },
  { title: 'Sprøyting mot olivenflue', priority: 'Høy', category: 'Plantevern' },
  { title: 'Gjødsling (Vår)', priority: 'Middels', category: 'Gjødsel' },
  { title: 'Ettersyn av vanningsanlegg', priority: 'Middels', category: 'Vanning' },
  { title: 'Fjerning av døde/skadede grener', priority: 'Middels', category: 'Vedlikehold' },
  { title: 'Ugresskontroll', priority: 'Lav', category: 'Vedlikehold' },
  { title: 'Planlegging for planting av nye trær', priority: 'Lav', category: 'Planlegging' },
];

interface TasksViewProps {
  parcels: Parcel[];
}

const EMPTY_TASK: Partial<Task> = { priority: 'Middels', status: 'TODO', category: 'Vedlikehold', user: '' };

const TasksView: React.FC<TasksViewProps> = ({ parcels }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formTask, setFormTask] = useState<Partial<Task>>(EMPTY_TASK);

  useEffect(() => {
    const saved = localStorage.getItem('olivia_tasks');
    if (saved) {
      setTasks(JSON.parse(saved));
    } else {
      const initial: Task[] = [
        { id: '1', title: 'Beskjæring sektor Nord', priority: 'Høy', category: 'Vedlikehold', user: 'Juan', status: 'TODO', parcelId: parcels[0]?.id },
        { id: '3', title: 'Reparasjon av traktor', priority: 'Kritisk', category: 'Flåte', user: 'Mario', status: 'IN_PROGRESS' },
        { id: '4', title: 'Innhøsting batch 002', priority: 'Lav', category: 'Produksjon', user: 'Team', status: 'DONE', parcelId: parcels[1]?.id },
      ];
      setTasks(initial);
      localStorage.setItem('olivia_tasks', JSON.stringify(initial));
    }
  }, []);

  const saveTasks = (updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem('olivia_tasks', JSON.stringify(updated));
  };

  const openNew = () => {
    setEditingTask(null);
    setFormTask({ ...EMPTY_TASK, parcelId: undefined });
    setIsModalOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setFormTask({ ...task });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formTask.title) return;
    if (editingTask) {
      saveTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...formTask } as Task : t));
    } else {
      saveTasks([{ ...(formTask as Task), id: Date.now().toString(), status: 'TODO' }, ...tasks]);
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const updateStatus = (id: string, status: Task['status']) => {
    saveTasks(tasks.map(t => t.id === id ? { ...t, status } : t));
  };

  const deleteTask = (id: string) => {
    if (!confirm('Slette oppgaven?')) return;
    saveTasks(tasks.filter(t => t.id !== id));
  };

  const columns: { title: string; status: Task['status']; color: string }[] = [
    { title: 'Gjøremål', status: 'TODO', color: 'text-slate-400' },
    { title: 'Pågår', status: 'IN_PROGRESS', color: 'text-blue-400' },
    { title: 'Fullført', status: 'DONE', color: 'text-green-400' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Oppgaver & Planlegging</h2>
          <p className="text-slate-400 text-sm">Administrer arbeidet knyttet til dine parseller.</p>
        </div>
        <button onClick={openNew}
          className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
          <Plus size={20} /> Ny Oppgave
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 -mx-8 px-8">
        {columns.map((col) => {
          const colTasks = tasks.filter(t => t.status === col.status);
          return (
            <div key={col.status} className="min-w-[300px] w-[300px] flex flex-col gap-3">
              <div className="flex justify-between items-center px-1">
                <h3 className={`font-bold flex items-center gap-2 uppercase tracking-widest text-xs ${col.color}`}>
                  {col.title}
                  <span className="bg-white/5 px-2 py-0.5 rounded-full text-[10px] text-slate-500">{colTasks.length}</span>
                </h3>
              </div>

              <div className="flex-1 space-y-3 min-h-[400px]">
                {colTasks.map((task) => {
                  const parcel = parcels.find(p => p.id === task.parcelId);
                  return (
                    <div key={task.id} className="glass rounded-2xl p-4 border border-white/10 hover:border-white/20 transition-all">
                      {/* Priority + actions */}
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          task.priority === 'Kritisk' ? 'bg-red-500/20 text-red-400' :
                          task.priority === 'Høy' ? 'bg-yellow-500/20 text-yellow-400' :
                          task.priority === 'Middels' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>{task.priority}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(task)} title="Rediger"
                            className="p-1.5 text-slate-600 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                            <Edit2 size={13} />
                          </button>
                          {task.status === 'TODO' && (
                            <button onClick={() => updateStatus(task.id, 'IN_PROGRESS')} title="Sett til Pågår"
                              className="p-1.5 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all">
                              <Play size={13} />
                            </button>
                          )}
                          {task.status !== 'DONE' && (
                            <button onClick={() => updateStatus(task.id, 'DONE')} title="Merk fullført"
                              className="p-1.5 text-slate-600 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-all">
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          {task.status === 'DONE' && (
                            <button onClick={() => updateStatus(task.id, 'TODO')} title="Gjenåpne"
                              className="p-1.5 text-slate-600 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all">
                              <AlertCircle size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 className={`font-bold leading-tight mb-2 text-sm ${task.status === 'DONE' ? 'line-through text-slate-500' : 'text-white'}`}>
                        {task.title}
                      </h4>

                      {parcel ? (
                        <div className="flex items-center gap-1 text-slate-500 text-[10px] mb-2">
                          <MapPin size={11} className="text-green-400" />
                          <span className="uppercase tracking-widest font-bold text-green-400/70">{parcel.name}</span>
                        </div>
                      ) : task.parcelId ? null : (
                        <div className="flex items-center gap-1 text-slate-600 text-[10px] mb-2">
                          <MapPin size={11} /> <span>Hele gården</span>
                        </div>
                      )}

                      {task.dueDate && (
                        <p className="text-[10px] text-orange-400/70 mb-2">Frist: {task.dueDate}</p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <User size={12} />
                          <span className="text-xs">{task.user || '—'}</span>
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-tighter text-slate-600">{task.category}</span>
                      </div>
                    </div>
                  );
                })}
                {colTasks.length === 0 && (
                  <div className="border-2 border-dashed border-white/5 rounded-2xl h-28 flex items-center justify-center">
                    <p className="text-slate-700 text-xs">Ingen oppgaver</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Task modal (new + edit) ────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-lg rounded-[2.5rem] border border-white/20 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-8 pt-8 pb-4 flex-shrink-0">
              <h3 className="text-xl font-bold">{editingTask ? 'Rediger oppgave' : 'Ny oppgave'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-4 space-y-5">
              {/* Title */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Hva skal gjøres? *</label>
                <input type="text" autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500/50 text-white"
                  placeholder="Eks. Beskjæring av trær"
                  value={formTask.title || ''}
                  onChange={e => setFormTask({ ...formTask, title: e.target.value })}
                />
              </div>

              {/* Parcel + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Parsell</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white"
                    value={formTask.parcelId || ''}
                    onChange={e => setFormTask({ ...formTask, parcelId: e.target.value || undefined })}>
                    <option value="">Hele gården</option>
                    {parcels.map(p => <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Prioritet</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white"
                    value={formTask.priority || 'Middels'}
                    onChange={e => setFormTask({ ...formTask, priority: e.target.value as Task['priority'] })}>
                    <option value="Lav">Lav</option>
                    <option value="Middels">Middels</option>
                    <option value="Høy">Høy</option>
                    <option value="Kritisk">Kritisk</option>
                  </select>
                </div>
              </div>

              {/* Status (edit only) + Due date */}
              <div className="grid grid-cols-2 gap-4">
                {editingTask && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Status</label>
                    <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white"
                      value={formTask.status || 'TODO'}
                      onChange={e => setFormTask({ ...formTask, status: e.target.value as Task['status'] })}>
                      <option value="TODO">Gjøremål</option>
                      <option value="IN_PROGRESS">Pågår</option>
                      <option value="DONE">Fullført</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Frist (valgfritt)</label>
                  <input type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white"
                    value={formTask.dueDate || ''}
                    onChange={e => setFormTask({ ...formTask, dueDate: e.target.value || undefined })} />
                </div>
              </div>

              {/* Category + User */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Kategori</label>
                  <input type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white"
                    value={formTask.category || ''}
                    onChange={e => setFormTask({ ...formTask, category: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Ansvarlig</label>
                  <input type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none text-white"
                    value={formTask.user || ''}
                    onChange={e => setFormTask({ ...formTask, user: e.target.value })} />
                </div>
              </div>

              {/* Delete button for edit mode */}
              {editingTask && (
                <button onClick={() => { deleteTask(editingTask.id); setIsModalOpen(false); }}
                  className="w-full text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl py-3 transition-all">
                  Slett oppgave
                </button>
              )}

              {/* Suggestions (new only) */}
              {!editingTask && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <ClipboardList size={14} /> Vanlige oppgaver
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_TASKS.map((s, i) => (
                      <button key={i} onClick={() => setFormTask(prev => ({ ...prev, ...s }))}
                        className="text-left text-xs bg-white/5 border border-transparent hover:border-green-500/50 hover:bg-green-500/10 px-3 py-2 rounded-lg transition-all">
                        <span className={`text-[9px] font-bold ${s.priority === 'Kritisk' ? 'text-red-400' : s.priority === 'Høy' ? 'text-yellow-400' : 'text-blue-400'}`}>{s.priority}</span>
                        <p className="text-slate-300">{s.title}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 pb-8 pt-4 flex-shrink-0">
              <button onClick={handleSave} disabled={!formTask.title}
                className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-bold py-4 rounded-2xl transition-all">
                {editingTask ? 'Lagre endringer' : 'Opprett oppgave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksView;
