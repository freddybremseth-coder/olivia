
import React, { useState, useEffect } from 'react';
import { Truck, AlertTriangle, CheckCircle2, Settings, PenLine, History, Plus, X, Gauge, LayoutGrid, List } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  type: string;
  status: 'ACTIVE' | 'SERVICE' | 'BROKEN';
  lastService: string;
  condition: string;
  trackingUnit: string; // f.eks. 'timer', 'liter', 'km'
  currentValue: number;
}

const FleetView: React.FC = () => {
  const [fleet, setFleet] = useState<Equipment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [newItem, setNewItem] = useState<Partial<Equipment>>({
    status: 'ACTIVE',
    type: 'Traktor',
    lastService: new Date().toISOString().split('T')[0],
    condition: 'God',
    trackingUnit: 'Timer',
    currentValue: 0
  });

  useEffect(() => {
    const saved = localStorage.getItem('olivia_fleet');
    if (saved) {
      setFleet(JSON.parse(saved));
    } else {
      const initial: Equipment[] = [
        { id: '1', name: 'John Deere 5075E', type: 'Traktor', status: 'ACTIVE', lastService: '2024-08-10', condition: 'Utmerket', trackingUnit: 'Timer', currentValue: 1240 },
        { id: '2', name: 'New Holland T4', type: 'Traktor', status: 'SERVICE', lastService: '2023-11-20', condition: 'Trenger oljeskift', trackingUnit: 'Timer', currentValue: 890 },
        { id: '3', name: 'Pellenc Optimum', type: 'Innhøster', status: 'ACTIVE', lastService: '2024-09-01', condition: 'God', trackingUnit: 'Timer', currentValue: 450 },
        { id: '4', name: 'Hardy Navigator 3000', type: 'Sprøyteutstyr', status: 'ACTIVE', lastService: '2024-05-15', condition: 'Ny-overhalt', trackingUnit: 'Liter', currentValue: 15400 },
      ];
      setFleet(initial);
      localStorage.setItem('olivia_fleet', JSON.stringify(initial));
    }
  }, []);

  const handleAddItem = () => {
    if (!newItem.name) return;
    const item: Equipment = {
      ...(newItem as Equipment),
      id: Date.now().toString(),
      currentValue: newItem.currentValue || 0
    };
    const updated = [...fleet, item];
    setFleet(updated);
    localStorage.setItem('olivia_fleet', JSON.stringify(updated));
    setIsModalOpen(false);
    setNewItem({ status: 'ACTIVE', type: 'Traktor', lastService: new Date().toISOString().split('T')[0], condition: 'God', trackingUnit: 'Timer', currentValue: 0 });
  };

  const getStatusStyle = (status: Equipment['status']) => {
    switch(status) {
      case 'ACTIVE': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'SERVICE': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'BROKEN': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Maskinpark & Utstyr</h2>
          <p className="text-slate-400 text-sm italic">Administrer din flåte og overvåk driftsmålinger.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-green-500 text-black' : 'text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-green-500 text-black' : 'text-slate-400 hover:text-white'}`}
            >
              <List size={18} />
            </button>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]"
          >
            <Plus size={20} /> Registrer Utstyr
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {fleet.map((item) => (
            <div key={item.id} className="glass rounded-3xl p-6 border border-white/10 hover:border-white/20 transition-all group">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${
                  item.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 
                  item.status === 'SERVICE' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  <Truck size={24} />
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getStatusStyle(item.status)}`}>
                  {item.status}
                </span>
              </div>
              
              <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">{item.name}</h3>
              <p className="text-xs text-slate-500 font-medium mb-4">{item.type}</p>
              
              {/* NY SEKSJON: Sporing & Måleenhet */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-4 group-hover:bg-white/10 transition-all">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Akkumulert Driftsdata</p>
                  <Gauge size={12} className="text-blue-400" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-white">{item.currentValue.toLocaleString()}</span>
                  <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{item.trackingUnit}</span>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Tilstand:</span>
                  <span className="text-slate-300 font-bold">{item.condition}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Siste service:</span>
                  <span className="text-slate-300 font-mono">{item.lastService}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-[2rem] border border-white/10 overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[10px] text-slate-500 uppercase font-bold tracking-widest border-b border-white/10">
                <th className="px-6 py-4">Maskin / Modell</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Måleenhet</th>
                <th className="px-6 py-4 text-right">Driftsverdi</th>
                <th className="px-6 py-4">Tilstand</th>
                <th className="px-6 py-4">Siste Service</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {fleet.map((item) => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white text-sm">{item.name}</td>
                  <td className="px-6 py-4 text-slate-400 text-xs">{item.type}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusStyle(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Gauge size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{item.trackingUnit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm text-white">{item.currentValue.toLocaleString()}</td>
                  <td className="px-6 py-4 text-slate-300 text-xs">{item.condition}</td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{item.lastService}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="glass w-full max-w-md rounded-[2.5rem] p-8 border border-white/20 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white tracking-tight">Registrer Nytt Utstyr</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Modell/Navn</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50"
                  placeholder="F.eks John Deere 6M"
                  value={newItem.name || ''}
                  onChange={e => setNewItem({...newItem, name: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Type</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    value={newItem.type}
                    onChange={e => {
                      const val = e.target.value;
                      let unit = 'Timer';
                      if (val === 'Sprøyteutstyr') unit = 'Liter';
                      setNewItem({...newItem, type: val, trackingUnit: unit});
                    }}
                  >
                    <option value="Traktor">Traktor</option>
                    <option value="Innhøster">Innhøster</option>
                    <option value="Gjødselsspreder">Gjødselsspreder</option>
                    <option value="Sprøyteutstyr">Sprøyteutstyr</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Måleenhet</label>
                  <input 
                    type="text"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50"
                    placeholder="Eks. Timer / Liter / KM"
                    value={newItem.trackingUnit || ''}
                    onChange={e => setNewItem({...newItem, trackingUnit: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Status</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    value={newItem.status}
                    onChange={e => setNewItem({...newItem, status: e.target.value as any})}
                  >
                    <option value="ACTIVE">Aktiv</option>
                    <option value="SERVICE">Service</option>
                    <option value="BROKEN">Defekt</option>
                  </select>
                </div>
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Startverdi ({newItem.trackingUnit})</label>
                   <input 
                    type="number"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
                    placeholder="0"
                    value={newItem.currentValue}
                    onChange={e => setNewItem({...newItem, currentValue: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleAddItem}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
            >
              Registrer i flåten <Truck size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetView;
