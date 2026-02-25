
import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, User, MapPin, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import { Task, Parcel } from '../types';

const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    priority: 'Middels',
    status: 'TODO',
    category: 'Vedlikehold',
    user: 'Juan'
  });

  const loadData = () => {
    const savedTasks = localStorage.getItem('olivia_tasks');
    const savedParcels = localStorage.getItem('olivia_parcels');
    
    if (savedParcels) {
      const parsedParcels = JSON.parse(savedParcels);
      setParcels(parsedParcels);
      if (!newTask.parcelId && parsedParcels.length > 0) {
        setNewTask(prev => ({ ...prev, parcelId: parsedParcels[0].id }));
      }
    }

    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    } else {
      const initial: Task[] = [
        { id: '1', title: 'Beskjæring sektor Nord', priority: 'Høy', category: 'Vedlikehold', user: 'Juan', status: 'TODO', parcelId: 'p1' },
        { id: '3', title: 'Reparasjon av traktor', priority: 'Kritisk', category: 'Flåte', user: 'Mario', status: 'IN_PROGRESS' },
        { id: '4', title: 'Innhøsting batch 002', priority: 'Lav', category: 'Produksjon', user: 'Team', status: 'DONE', parcelId: 'p2' },
      ];
      setTasks(initial);
      localStorage.setItem('olivia_tasks', JSON.stringify(initial));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, []);

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('olivia_tasks', JSON.stringify(newTasks));
  };

  const handleAddTask = () => {
    if (!newTask.title) return;
    const task: Task = {
      ...(newTask as Task),
      id: Date.now().toString(),
    };
    saveTasks([...tasks, task]);
    setIsModalOpen(false);
    setNewTask({ priority: 'Middels', status: 'TODO', category: 'Vedlikehold', user: 'Juan', parcelId: parcels[0]?.id });
  };

  const updateTaskStatus = (id: string, newStatus: Task['status']) => {
    const updated = tasks.map(t => t.id === id ? { ...t, status: newStatus } : t);
    saveTasks(updated);
  };

  const columns = [
    { title: 'Gjøremål', status: 'TODO' as const },
    { title: 'Pågår', status: 'IN_PROGRESS' as const },
    { title: 'Fullført', status: 'DONE' as const },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Oppgaver & Planlegging</h2>
          <p className="text-slate-400 text-sm">Administrer arbeidet knyttet til dine parceller.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        >
          <Plus size={20} /> Ny Oppgave
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6 -mx-8 px-8">
        {columns.map((col) => {
          const colTasks = tasks.filter(t => t.status === col.status);
          return (
            <div key={col.status} className="min-w-[320px] w-[320px] flex flex-col gap-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-slate-400 flex items-center gap-2 uppercase tracking-widest text-xs">
                  {col.title} <span className="bg-white/5 px-2 py-0.5 rounded-full text-[10px]">{colTasks.length}</span>
                </h3>
                <button className="text-slate-600 hover:text-white"><MoreHorizontal size={18} /></button>
              </div>
              
              <div className="flex-1 space-y-4 min-h-[500px]">
                {colTasks.map((task) => {
                  const parcel = parcels.find(p => p.id === task.parcelId);
                  return (
                    <div key={task.id} className="glass rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all group relative">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          task.priority === 'Kritisk' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 
                          task.priority === 'Høy' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'
                        }`}>
                          {task.priority}
                        </span>
                        {task.status !== 'DONE' && (
                          <button 
                            onClick={() => updateTaskStatus(task.id, 'DONE')}
                            className="text-slate-600 hover:text-green-400 transition-colors"
                          >
                            <CheckCircle2 size={18} />
                          </button>
                        )}
                      </div>
                      <h4 className="font-bold text-white leading-tight mb-3">{task.title}</h4>
                      
                      {parcel && (
                        <div className="flex items-center gap-2 text-slate-500 text-[10px] mb-4">
                          <MapPin size={12} className="text-green-400" />
                          <span className="uppercase tracking-widest font-bold">{parcel.name}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-slate-500">
                          <User size={14} />
                          <span className="text-xs">{task.user}</span>
                        </div>
                        <span className="text-[10px] font-mono uppercase tracking-tighter text-slate-600">{task.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass w-full max-w-md rounded-[2.5rem] p-8 border border-white/20 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Opprett Ny Oppgave</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Hva skal gjøres?</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-green-500/50"
                  placeholder="Eks. Beskjæring av trær"
                  value={newTask.title || ''}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Lokasjon (Parsell)</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
                    value={newTask.parcelId}
                    onChange={e => setNewTask({...newTask, parcelId: e.target.value})}
                  >
                    <option value="">Ingen (Gården generelt)</option>
                    {parcels.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Prioritet</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                  >
                    <option value="Lav">Lav</option>
                    <option value="Middels">Middels</option>
                    <option value="Høy">Høy</option>
                    <option value="Kritisk">Kritisk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Ansvarlig</label>
                <input 
                  type="text"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none"
                  value={newTask.user || ''}
                  onChange={e => setNewTask({...newTask, user: e.target.value})}
                />
              </div>
            </div>

            <button 
              onClick={handleAddTask}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-2xl transition-all"
            >
              Lagre Oppgave
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksView;
