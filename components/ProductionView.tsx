
import React, { useState, useEffect } from 'react';
import {
  Plus, Sprout, X, ShoppingCart, Layers, Star, Edit3, Wand2,
  TrendingUp, History, Info, Sparkles, BarChart3, LineChart,
  Target, Award, Archive, Trash2, CheckCircle2, FlaskConical,
  Scale, Calendar, MapPin, ChevronRight, Loader2, RefreshCcw,
  ChefHat, Save, MessageSquare, AlertCircle, Utensils,
  PlusCircle, MinusCircle, Check, Clock, BookOpen,
  Droplets, Thermometer, Timer
} from 'lucide-react';
import { Batch, Parcel, Recipe, Ingredient } from '../types';
import { geminiService } from '../services/geminiService';

const ProductionView: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'recipes' | 'guide'>('active');

  // Recipe Editor State
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe> | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Form State for ny batch
  const [newBatch, setNewBatch] = useState<Partial<Batch>>({
    yieldType: 'Oil',
    quality: 'Premium',
    status: 'ACTIVE',
    weight: 0,
    harvestDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const savedBatches = localStorage.getItem('olivia_batches');
    const savedParcels = localStorage.getItem('olivia_parcels');
    const savedRecipes = localStorage.getItem('olivia_recipes');
    
    if (savedParcels) setParcels(JSON.parse(savedParcels));
    
    if (savedBatches) {
      setBatches(JSON.parse(savedBatches));
    } else {
      const initialBatches: Batch[] = [
        { 
          id: 'B-24-001', parcelId: 'p1', harvestDate: '2024-10-15', weight: 1200, 
          quality: 'Premium', qualityScore: 96, status: 'ACTIVE', 
          laborHours: 45, laborCost: 900, yieldType: 'Oil', 
          oilYieldLiters: 216, traceabilityCode: 'BIAR-24-N', currentStage: 'LAKE' 
        }
      ];
      setBatches(initialBatches);
      localStorage.setItem('olivia_batches', JSON.stringify(initialBatches));
    }
    
    if (savedRecipes) {
      setRecipes(JSON.parse(savedRecipes));
    } else {
      const initialRecipes: Recipe[] = [
        {
          id: 'r1',
          name: 'Tradisjonell Biar-Lake (10% saltlake)',
          ingredients: [
            { name: 'Vann', amount: '1', unit: 'liter' },
            { name: 'Havsalt (grovt)', amount: '100', unit: 'g (10%)' },
            { name: 'Hvitløk', amount: '4', unit: 'fedd' },
            { name: 'Fersk rosmarin', amount: '2', unit: 'kvister' },
            { name: 'Timian', amount: '1', unit: 'kvist' },
            { name: 'Laurbærblad', amount: '2', unit: 'stk' },
            { name: 'Svart pepper (hel)', amount: '10', unit: 'korn' }
          ],
          rating: 5,
          notes: 'Klassisk Biar-oppskrift fra 1920-tallet. Grønne oliven legges i syre-lake i 8-12 måneder. Saltlaken byttes hver 3. måned. Bruk Manzanilla eller Gordal for beste resultat.',
          isAiGenerated: false,
          isQualityAssured: true
        },
        {
          id: 'r2',
          name: 'Spansk Mojo-Marinade (Kanarisk stil)',
          ingredients: [
            { name: 'Ekstra virgin olivenolje', amount: '200', unit: 'ml' },
            { name: 'Rød chili', amount: '2', unit: 'stk' },
            { name: 'Hvitløk', amount: '6', unit: 'fedd' },
            { name: 'Paprika (røkt)', amount: '2', unit: 'ts' },
            { name: 'Spidskommen', amount: '1', unit: 'ts' },
            { name: 'Eplecidereddik', amount: '50', unit: 'ml' },
            { name: 'Havsalt', amount: '1', unit: 'ts' },
            { name: 'Frisk oregano', amount: '1', unit: 'ss' }
          ],
          rating: 5,
          notes: 'Oliven marineres i 48-72 timer ved romtemperatur. Ypperlig for Picual-sort pga høyt polyfenolinhold. Kan lagres opptil 3 måneder kjølig.',
          isAiGenerated: false,
          isQualityAssured: true
        },
        {
          id: 'r3',
          name: 'Sitrus & Urte Gourmet-Lake',
          ingredients: [
            { name: 'Vann', amount: '1', unit: 'liter' },
            { name: 'Havsalt', amount: '80', unit: 'g (8%)' },
            { name: 'Sitronskall (biologisk)', amount: '2', unit: 'stk' },
            { name: 'Appelsinskall', amount: '1', unit: 'stk' },
            { name: 'Fersk timian', amount: '4', unit: 'kvister' },
            { name: 'Rosmarin', amount: '2', unit: 'kvister' },
            { name: 'Fennikelfroe', amount: '1', unit: 'ts' },
            { name: 'Hvit pepper (hel)', amount: '5', unit: 'korn' }
          ],
          rating: 4,
          notes: 'Skandinavisk-inspirert oppskrift for premium gourmetmarkedet. Lagringstid: 6-8 måneder. Passer utmerket for Arbequina-sorten pga mildere smak.',
          isAiGenerated: false,
          isQualityAssured: true
        },
        {
          id: 'r4',
          name: 'Lut-Behandlet (Alm. Prosess)',
          ingredients: [
            { name: 'Matningstjenlig natronlut (NaOH)', amount: '20', unit: 'g/liter (2%)' },
            { name: 'Vann', amount: '1', unit: 'liter' },
            { name: 'Deretter saltlake: Havsalt', amount: '80-100', unit: 'g/liter' },
            { name: 'Sitronskall', amount: '1', unit: 'stk (valgfritt)' }
          ],
          rating: 4,
          notes: 'Tradisjonell spansk prosess for å fjerne bitterhet raskt (6-12 timer vs. 6-12 måneder). Oliven bades i 2% lut til de er gjennombehandlet (sjekk kjernen – beige = klar). Skyll grundig 3x, deretter i saltlake i 2-4 uker. VIKTIG: Bruk kun matningstjenlig NaOH, ikke industriell.',
          isAiGenerated: false,
          isQualityAssured: true
        },
        {
          id: 'r5',
          name: 'Tørrherdet med Salt (Marokkansk stil)',
          ingredients: [
            { name: 'Grovt havsalt', amount: '1', unit: 'kg per kg oliven' },
            { name: 'Olivenolje (etterbehandling)', amount: '50', unit: 'ml' },
            { name: 'Spidskommen (valgfritt)', amount: '1', unit: 'ts' },
            { name: 'Rød chili (valgfritt)', amount: '1', unit: 'stk' }
          ],
          rating: 4,
          notes: 'Svarte, overmodne oliven legges lagvis med grovt salt. Rist daglig i 4-6 uker. Saltet trekker ut fuktigheten og bitterstoffene. Resultatet er rynkede, konsentrerte oliven med intens smak. Avslutt med lett oljebehandling og krydder.',
          isAiGenerated: false,
          isQualityAssured: true
        }
      ];
      setRecipes(initialRecipes);
      localStorage.setItem('olivia_recipes', JSON.stringify(initialRecipes));
    }
  }, []);

  const saveToLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event('storage'));
  };

  const handleCreateBatch = () => {
    if (!newBatch.parcelId || !newBatch.weight) {
      alert("Vennligst velg parsell og oppgi vekt.");
      return;
    }
    const batch: Batch = {
      ...(newBatch as Batch),
      id: `B-${new Date().getFullYear().toString().slice(-2)}-${(batches.length + 1).toString().padStart(3, '0')}`,
      traceabilityCode: `TRC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      qualityScore: Math.floor(Math.random() * 15) + 85,
      laborHours: 0,
      laborCost: 0
    };
    const updated = [batch, ...batches];
    setBatches(updated);
    saveToLocal('olivia_batches', updated);
    setIsModalOpen(false);
  };

  const handleOpenRecipeModal = (recipe?: Recipe) => {
    setEditingRecipe(recipe || { 
      name: '', 
      ingredients: [{ name: '', amount: '', unit: '' }], 
      rating: 0, 
      notes: '', 
      isAiGenerated: false, 
      isQualityAssured: false 
    });
    setIsRecipeModalOpen(true);
  };

  const handleSaveRecipe = () => {
    if (!editingRecipe?.name) return;
    const recipe: Recipe = {
      ...(editingRecipe as Recipe),
      id: editingRecipe.id || `R-${Date.now()}`
    };
    const updated = editingRecipe.id 
      ? recipes.map(r => r.id === recipe.id ? recipe : r)
      : [recipe, ...recipes];
    setRecipes(updated);
    saveToLocal('olivia_recipes', updated);
    setIsRecipeModalOpen(false);
  };

  const handleAiAdjust = async () => {
    if (!aiPrompt) return;
    setIsAiLoading(true);
    try {
      const adjusted = await geminiService.adjustRecipe(editingRecipe || {}, aiPrompt, 'no');
      setEditingRecipe(prev => ({
        ...prev,
        ...adjusted,
        isAiGenerated: true
      }));
      setAiPrompt('');
    } catch (error) {
      alert("AI-kokken opplevde en feil. Vennligst prøv igjen.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const updateRecipeRating = (id: string, rating: number) => {
    const updated = recipes.map(r => r.id === id ? { ...r, rating } : r);
    setRecipes(updated);
    saveToLocal('olivia_recipes', updated);
  };

  const deleteRecipe = (id: string) => {
    if (confirm("Vil du slette denne oppskriften permanent?")) {
      const updated = recipes.filter(r => r.id !== id);
      setRecipes(updated);
      saveToLocal('olivia_recipes', updated);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Layers className="text-green-400" /> Produksjonskontroll
          </h2>
          <p className="text-slate-400 text-sm italic">Fra innhøsting til eksklusiv tapping - optimalisert med AI.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenRecipeModal()} 
            className="glass hover:bg-white/10 text-white border border-white/10 px-6 py-4 rounded-2xl font-bold transition-all flex items-center gap-2"
          >
            <ChefHat size={20} /> Ny Oppskrift
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-green-500 hover:bg-green-400 text-black px-8 py-4 rounded-2xl font-bold transition-all shadow-xl shadow-green-500/20 flex items-center gap-2"
          >
            <Plus size={20} /> Ny Innhøsting
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex gap-4 border-b border-white/10 pb-4">
            <button onClick={() => setActiveTab('active')} className={`text-sm font-bold uppercase tracking-widest transition-all pb-2 border-b-2 ${activeTab === 'active' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}>Aktive ({batches.filter(b=>b.status==='ACTIVE').length})</button>
            <button onClick={() => setActiveTab('history')} className={`text-sm font-bold uppercase tracking-widest transition-all pb-2 border-b-2 ${activeTab === 'history' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}>Historikk ({batches.filter(b=>b.status==='ARCHIVED').length})</button>
            <button onClick={() => setActiveTab('recipes')} className={`text-sm font-bold uppercase tracking-widest transition-all pb-2 border-b-2 ${activeTab === 'recipes' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}>Oppskriftsbok ({recipes.length})</button>
            <button onClick={() => setActiveTab('guide')} className={`text-sm font-bold uppercase tracking-widest transition-all pb-2 border-b-2 flex items-center gap-1.5 ${activeTab === 'guide' ? 'text-green-400 border-green-400' : 'text-slate-500 border-transparent'}`}><BookOpen size={13} /> Prosessguide</button>
          </div>

          <div className="space-y-4">
            {activeTab === 'guide' ? (
              <div className="space-y-6 animate-in fade-in">
                {/* Processing Methods Overview */}
                <div className="glass rounded-[2rem] p-7 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <BookOpen size={20} className="text-green-400" /> Bordoliven – Komplett Prosessguide
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                      { method: 'Saltlake', time: '6–12 måneder', bitterness: 'Mild', color: 'Grønn/Sort', icon: <Droplets size={20} />, color2: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                      { method: 'Lut (NaOH)', time: '2–4 uker', bitterness: 'Ingen', color: 'Grønn', icon: <FlaskConical size={20} />, color2: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                      { method: 'Tørrherding', time: '4–6 uker', bitterness: 'Konsentrert', color: 'Sort', icon: <Thermometer size={20} />, color2: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' }
                    ].map(m => (
                      <div key={m.method} className={`p-5 rounded-2xl border ${m.bg}`}>
                        <div className={`${m.color2} mb-3`}>{m.icon}</div>
                        <h4 className="font-bold text-white mb-2">{m.method}</h4>
                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex justify-between text-slate-400">
                            <span>Tid:</span><span className="text-white font-bold">{m.time}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Bitterhet:</span><span className="text-white font-bold">{m.bitterness}</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Farge:</span><span className="text-white font-bold">{m.color}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7-Stage Processing Pipeline */}
                <div className="glass rounded-[2rem] p-7 border border-white/10">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Timer size={14} /> 7-Stegs Saltlake-Prosess (Tradisjonell)
                  </h3>
                  <div className="space-y-4">
                    {[
                      { stage: 'PLUKKING', num: '01', title: 'Innhøsting', time: 'Okt–Nov', desc: 'Plukk ved riktig modenhetsindeks (0-4 skala). Grønne: index 1-2. Sorte: index 5-7. Unngå mekanisk skade. Bruk åndbar emballasje. Sorter etter størrelse og farge innen 12 timer.', icon: <Sprout size={16} />, color: 'text-green-400' },
                      { stage: 'LAKE', num: '02', title: 'Saltlake', time: '1–3 måneder', desc: 'Forbered 8-10% saltlake (80-100g NaCl per liter). Bruk rent vann (klorinnhold < 0.1ppm). Dekk oliven helt. Legg press på toppen. Hold 15-20°C. Kontroller pH (mål: 3.5-4.5 etter gjæring).', icon: <Droplets size={16} />, color: 'text-blue-400' },
                      { stage: 'SKYLLING', num: '03', title: 'Skylling & Rens', time: '1–3 dager', desc: 'Skyll grundig med rent vann. Fjern hvitt lag (gjæringsslam = normalt). Vurder om bitterhet er akseptabel. Lukt: fermentert/frisk = OK. Unngå skadede bær.', icon: <RefreshCcw size={16} />, color: 'text-cyan-400' },
                      { stage: 'MARINERING', num: '04', title: 'Marinering & Smakssetting', time: '2–8 uker', desc: 'Velg marinadetype (se oppskriftsbok). Tilsett urter, hvitløk og krydder. Bruk glasskrukker eller food-grade plastbeholdere. Temp: 18-22°C. Smak jevnlig – oliven absorberer smak gradvis.', icon: <ChefHat size={16} />, color: 'text-purple-400' },
                      { stage: 'LAGRING', num: '05', title: 'Lagring & Modning', time: '1–6 måneder', desc: 'Mørkt, kjølig rom (10-15°C ideelt). Kontroller pH månedlig (mål: 3.8-4.5). Sjekk for mugg (hvit flott = ofte ufarlig, grønn/sort = kast). Dokumenter dato og batch-nummer.', icon: <Archive size={16} />, color: 'text-yellow-400' },
                      { stage: 'PAKKING', num: '06', title: 'Pakking & Merking', time: '1–2 dager', desc: 'Bruk steriliserte glass (kok 10 min). Fyll med frisk saltlake (samme konsentrasjon). La 2cm luftrom. Lukk tett. Merk: produsent, sort, innhøstingsdato, best-før (18-24 mnd). Vakuumforseglet = lengre holdbarhet.', icon: <Scale size={16} />, color: 'text-orange-400' },
                      { stage: 'SALG', num: '07', title: 'Salg & Distribusjon', time: 'Løpende', desc: 'Oppbevar kjølig (under 12°C) inntil salg. Ferske markeder: direkte salg. Grossister: krever HACCP-sertifikat. Nettbutikk: isolert frakt. Pris: grønn gourmet €8-15/kg, premium sort €10-20/kg.', icon: <ShoppingCart size={16} />, color: 'text-green-400' }
                    ].map((s, i) => (
                      <div key={s.stage} className="flex gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/20 transition-all">
                        <div className="flex flex-col items-center gap-2">
                          <div className={`p-2.5 rounded-xl ${s.color.replace('text-', 'bg-').replace('400', '500/10')} border ${s.color.replace('text-', 'border-').replace('400', '500/20')} ${s.color}`}>
                            {s.icon}
                          </div>
                          {i < 6 && <div className="w-px flex-1 bg-white/10" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-slate-600">{s.num}</span>
                            <h4 className="font-bold text-white">{s.title}</h4>
                            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-white/5 rounded-full text-slate-500">{s.time}</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quality Control Table */}
                <div className="glass rounded-[2rem] p-7 border border-white/10">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Award size={14} /> Kvalitetskontroll – Kritiske Parametere
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[9px] text-slate-600 uppercase font-bold tracking-widest border-b border-white/5">
                          <th className="pb-3 pr-4">Parameter</th>
                          <th className="pb-3 pr-4">Optimal</th>
                          <th className="pb-3 pr-4">Advarsel</th>
                          <th className="pb-3">Tiltak</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-xs">
                        {[
                          { param: 'pH', opt: '3.8–4.5', warn: '< 3.5 eller > 5.0', action: 'Juster salt, konsulter ekspert' },
                          { param: 'Saltinnhold', opt: '6–10%', warn: '< 5% (risiko for råte)', action: 'Øk saltkonsentrasjon' },
                          { param: 'Temperatur', opt: '10–20°C', warn: '> 25°C', action: 'Flytt til kjøligere sted' },
                          { param: 'Modenhetsindeks', opt: '1–3 (grønn)', warn: '> 5 (overmodig)', action: 'Bruk til olje i stedet' },
                          { param: 'Tekstur', opt: 'Fast, krispy', warn: 'Myk, klissete', action: 'Undersøk for sykdom' }
                        ].map(r => (
                          <tr key={r.param} className="hover:bg-white/5">
                            <td className="py-3 pr-4 font-bold text-white">{r.param}</td>
                            <td className="py-3 pr-4 text-green-400">{r.opt}</td>
                            <td className="py-3 pr-4 text-yellow-400">{r.warn}</td>
                            <td className="py-3 text-slate-400">{r.action}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : activeTab === 'recipes' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipes.map(recipe => (
                  <div key={recipe.id} className="glass rounded-[2rem] p-6 border border-white/10 hover:border-green-500/30 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${recipe.isAiGenerated ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'} border`}>
                        {recipe.isAiGenerated ? <Sparkles size={24} /> : <ChefHat size={24} />}
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button key={star} onClick={() => updateRecipeRating(recipe.id, star)}>
                            <Star size={14} className={star <= recipe.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-lg mb-2">{recipe.name}</h4>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {recipe.ingredients.slice(0, 3).map((ing, idx) => (
                        <span key={idx} className="text-[10px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-400">{ing.name} ({ing.amount}{ing.unit})</span>
                      ))}
                      {recipe.ingredients.length > 3 && <span className="text-[10px] text-slate-600">+{recipe.ingredients.length-3} flere</span>}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 italic mb-4">"{recipe.notes}"</p>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                      <button onClick={() => handleOpenRecipeModal(recipe)} className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"><Edit3 size={14} /> Rediger</button>
                      <button onClick={() => deleteRecipe(recipe.id)} className="text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              (activeTab === 'active' ? batches.filter(b=>b.status==='ACTIVE') : batches.filter(b=>b.status==='ARCHIVED')).map(batch => (
                <div key={batch.id} className="glass rounded-[2rem] p-6 border border-white/10 hover:border-green-500/30 transition-all group relative overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
                     <div className="flex items-center gap-4">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${batch.yieldType === 'Oil' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-400'} border border-white/10`}>
                          {batch.yieldType === 'Oil' ? <FlaskConical size={28} /> : <Sprout size={28} />}
                       </div>
                       <div>
                         <div className="flex items-center gap-2">
                           <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">{batch.id}</span>
                           <h4 className="font-bold text-white text-lg">{batch.yieldType === 'Oil' ? 'Extra Virgin Cold Press' : 'Gourmet Table Olives'}</h4>
                         </div>
                         <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                           <MapPin size={12} className="text-green-400" /> {parcels.find(p => p.id === batch.parcelId)?.name || 'Ukjent'} • {batch.harvestDate}
                         </p>
                       </div>
                     </div>
                     <div className="flex items-center gap-6 bg-black/40 px-6 py-3 rounded-2xl border border-white/5">
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Kvalitet</p>
                          <p className="text-xl font-bold text-white flex items-center gap-2"><Award size={18} className="text-yellow-400" /> {batch.qualityScore}</p>
                        </div>
                        <div className="h-8 w-px bg-white/10"></div>
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Vekt</p>
                          <p className="text-xl font-bold text-white">{batch.weight}kg</p>
                        </div>
                     </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 space-y-6">
           <div className="glass rounded-[2.5rem] p-8 border border-purple-500/20 bg-purple-500/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform text-purple-400">
                <Utensils size={64} />
              </div>
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Sparkles size={16} /> Michelin-Kokk Analyse
              </h3>
              <p className="text-xs text-slate-300 italic leading-relaxed relative z-10">
                "Trends viser at bordoliven med sitrus og chili har 24% høyere marginer i det skandinaviske markedet. Prøv å justere din Tradisjonelle Biar-lake for å fange denne trenden."
              </p>
              <button onClick={() => setActiveTab('recipes')} className="mt-6 flex items-center gap-2 text-[10px] font-bold text-purple-400 uppercase tracking-widest group-hover:gap-3 transition-all">
                Gå til oppskriftsboken <ChevronRight size={14} />
              </button>
           </div>
        </div>
      </div>

      {/* Recipe Modal */}
      {isRecipeModalOpen && editingRecipe && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="glass w-full max-w-2xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl my-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20">
                   <ChefHat size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Rediger Oppskrift</h3>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Gourmet Oliven & Lake</p>
                </div>
              </div>
              <button onClick={() => setIsRecipeModalOpen(false)} className="p-2 text-slate-500 hover:text-white"><X size={28} /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 block">Navn på oppskriften</label>
                <input 
                  type="text" 
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold focus:outline-none focus:border-purple-500/50"
                  value={editingRecipe.name}
                  onChange={e => setEditingRecipe({...editingRecipe, name: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Ingredienser & Mengder</label>
                  <button 
                    onClick={() => setEditingRecipe({
                      ...editingRecipe, 
                      ingredients: [...(editingRecipe.ingredients || []), { name: '', amount: '', unit: '' }]
                    })}
                    className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <PlusCircle size={14} /> Legg til
                  </button>
                </div>
                <div className="space-y-2">
                  {editingRecipe.ingredients?.map((ing, idx) => (
                    <div key={idx} className="flex gap-2 animate-in slide-in-from-left-2 duration-300">
                      <input 
                        placeholder="Ingrediens" 
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                        value={ing.name}
                        onChange={e => {
                          const newIngs = [...editingRecipe.ingredients!];
                          newIngs[idx].name = e.target.value;
                          setEditingRecipe({...editingRecipe, ingredients: newIngs});
                        }}
                      />
                      <input 
                        placeholder="Mengde" 
                        className="w-24 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                        value={ing.amount}
                        onChange={e => {
                          const newIngs = [...editingRecipe.ingredients!];
                          newIngs[idx].amount = e.target.value;
                          setEditingRecipe({...editingRecipe, ingredients: newIngs});
                        }}
                      />
                      <input 
                        placeholder="Enhet" 
                        className="w-20 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                        value={ing.unit}
                        onChange={e => {
                          const newIngs = [...editingRecipe.ingredients!];
                          newIngs[idx].unit = e.target.value;
                          setEditingRecipe({...editingRecipe, ingredients: newIngs});
                        }}
                      />
                      <button 
                        onClick={() => {
                          const newIngs = editingRecipe.ingredients!.filter((_, i) => i !== idx);
                          setEditingRecipe({...editingRecipe, ingredients: newIngs});
                        }}
                        className="p-3 text-slate-600 hover:text-red-400"
                      >
                        <MinusCircle size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Adjustment Tool */}
              <div className="p-6 rounded-[2rem] bg-purple-500/5 border border-purple-500/20 space-y-4">
                <div className="flex items-center gap-2 text-purple-400">
                  <Wand2 size={18} />
                  <h4 className="text-xs font-bold uppercase tracking-widest">AI-Kokk Justering</h4>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Eks: 'Legg til chili for mer sting' eller 'balanser syren'..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                  />
                  <button 
                    onClick={handleAiAdjust}
                    disabled={isAiLoading || !aiPrompt}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    {isAiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
                    Juster
                  </button>
                </div>
                {editingRecipe.notes && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] text-purple-400 font-bold uppercase mb-1">Kokke-notat</p>
                    <p className="text-xs text-slate-400 italic">"{editingRecipe.notes}"</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button onClick={() => setIsRecipeModalOpen(false)} className="flex-1 py-4 rounded-2xl glass text-white font-bold hover:bg-white/5 transition-all">Avbryt</button>
                <button onClick={handleSaveRecipe} className="flex-1 py-4 rounded-2xl bg-green-500 text-black font-bold hover:bg-green-400 transition-all shadow-xl shadow-green-500/20 flex items-center justify-center gap-2">
                  <Save size={20} /> Lagre oppskrift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Harvest Modal (Existing) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full max-w-md rounded-[2.5rem] p-10 border border-white/20 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-white">Ny Innhøsting</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500"><X size={24} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Type avling</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none" value={newBatch.yieldType} onChange={e => setNewBatch({...newBatch, yieldType: e.target.value as any})}>
                  <option value="Oil">Olje (Oil)</option>
                  <option value="Table">Bordoliven (Table)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Parsell</label>
                <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none" value={newBatch.parcelId} onChange={e => setNewBatch({...newBatch, parcelId: e.target.value})}>
                  <option value="">Velg parsell...</option>
                  {parcels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Vekt (kg)</label>
                   <input type="number" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none" onChange={e => setNewBatch({...newBatch, weight: Number(e.target.value)})} />
                </div>
                <div>
                   <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dato</label>
                   <input type="date" className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none" value={newBatch.harvestDate} onChange={e => setNewBatch({...newBatch, harvestDate: e.target.value})} />
                </div>
              </div>
            </div>
            <button onClick={handleCreateBatch} className="w-full bg-green-500 text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl">Opprett Batch</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionView;
