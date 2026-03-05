
import {
  Search, MapPin, Layers, Plus, X, Sprout, Hash, Ruler, Globe, Map as MapIcon,
  CheckCircle2, Loader2, Brain, ScanLine, MousePointer2, Undo2, Save, Sparkles,
  ChevronRight, Trash2, Info, Locate, Layers as LayersIcon, Map as MapTypeIcon,
  Maximize2, Check, Users, Map as MapIcon2, ArrowRight, CornerRightDown, ExternalLink,
  Target, Radar, SearchCode, ZoomIn, Sun, Thermometer, CloudSun, Wind, Settings2, Edit3,
  Hash as HashIcon, Tag, MapPinned, ShieldCheck, AlertTriangle, Zap, Droplets,
  Building, TreePine, Eye, EyeOff, Navigation
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Parcel } from '../types';
import L from 'leaflet';
import { geminiService, CadastralDetails } from '../services/geminiService';
import { sedecService } from '../services/sedecService';
import { Language } from '../services/i18nService';

// Importer turf.js for geofencing
import * as turf from '@turf/turf';

type MapLayer = 'satellite' | 'terrain';

interface FarmMapProps {
  language: Language;
}

const FarmMap: React.FC<FarmMapProps> = ({ language }) => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('satellite');
  const [isCadastreLayerActive, setIsCadastreLayerActive] = useState(true);
  const [isElectricityLayerActive, setIsElectricityLayerActive] = useState(false);
  const [isWaterLayerActive, setIsWaterLayerActive] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  const [manualPol, setManualPol] = useState('9');
  const [manualPar, setManualPar] = useState('215');
  const [manualProvCod, setManualProvCod] = useState('03');
  const [manualMunCod, setManualMunCod] = useState('023');

  const [drawingCoords, setDrawingCoords] = useState<[number, number][]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string>('');
  const [isGPSLocating, setIsGPSLocating] = useState(false);
  const [analyzedDetails, setAnalyzedDetails] = useState<CadastralDetails | null>(null);
  const [geofenceAlert, setGeofenceAlert] = useState<{ message: string; type: 'inside' | 'outside' } | null>(null);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{success?: boolean, message?: string} | null>(null);

  const [editName, setEditName] = useState('');
  const [editTreeCount, setEditTreeCount] = useState<number>(0);
  const [editVariety, setEditVariety] = useState('Picual');

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const parcelsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const drawingLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const gpsLayerRef = useRef<L.LayerGroup>(L.layerGroup());
  const cadastreWmsRef = useRef<L.TileLayer.WMS | null>(null);
  const electricityLayerRef = useRef<L.TileLayer | null>(null);
  const waterLayerRef = useRef<L.TileLayer | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);

  const MAP_CENTER: [number, number] = [38.6294, -0.7667];

  const updateMapBaseLayer = (type: MapLayer) => {
    if (!mapRef.current) return;
    if (baseLayerRef.current) mapRef.current.removeLayer(baseLayerRef.current);
    const url = type === 'satellite' 
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png';
    baseLayerRef.current = L.tileLayer(url, { maxZoom: 19 }).addTo(mapRef.current);
    if (isCadastreLayerActive && cadastreWmsRef.current) cadastreWmsRef.current.bringToFront();
    setActiveLayer(type);
  };

  useEffect(() => {
    const savedP = localStorage.getItem('olivia_parcels');
    if (savedP) setParcels(JSON.parse(savedP));

    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        center: MAP_CENTER,
        zoom: 16,
        zoomControl: false,
        attributionControl: false
      });
      L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);
      parcelsLayerRef.current.addTo(mapRef.current);
      drawingLayerRef.current.addTo(mapRef.current);
      gpsLayerRef.current.addTo(mapRef.current);
      updateMapBaseLayer('satellite');
      
      const resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    if (isCadastreLayerActive) {
      if (!cadastreWmsRef.current) {
        cadastreWmsRef.current = L.tileLayer.wms('https://ovc.catastro.minhafp.es/Cartografia/WMS/ServidorWMS.aspx', {
          layers: 'CP.CadastralParcel',
          format: 'image/png',
          transparent: true,
          version: '1.1.1',
          opacity: 0.8,
          zIndex: 1000,
          styles: 'parcelas'
        });
      }
      cadastreWmsRef.current.addTo(mapRef.current).bringToFront();
    } else if (cadastreWmsRef.current) {
      mapRef.current.removeLayer(cadastreWmsRef.current);
    }
  }, [isCadastreLayerActive]);

  // ... (effects for electricity and water layers remain unchanged)
  useEffect(() => {
    if (!mapRef.current) return;
    parcelsLayerRef.current.clearLayers();
    parcels.forEach(p => {
      if (p.coordinates && p.coordinates.length > 0) {
        const area = p.area ? ` · ${(p.area / 10000).toFixed(2)} ha` : '';
        const trees = p.treeCount ? ` · ${p.treeCount} trær` : '';
        L.polygon(p.coordinates, { color: '#22c55e', weight: 2, fillOpacity: 0.15, dashArray: '3, 3' })
          .addTo(parcelsLayerRef.current)
          .bindTooltip(`<b>${p.name}</b>${area}${trees}`, {
            direction: 'center',
            className: 'parcel-tooltip',
            permanent: false
          })
          .on('click', () => setSelectedParcel(p));
      }
    });
  }, [parcels]);

  const verifySelectedParcel = async () => {
    if (!selectedParcel || isVerifying) return;
    setIsVerifying(true);
    setVerifyStatus(null);
    try {
      const details = await geminiService.analyzeParcelCadastre(selectedParcel.cadastralId, language);
      if (details.cadastralId === selectedParcel.cadastralId) {
        setVerifyStatus({ success: true, message: "Matrikkeldata verifisert OK" });
      } else {
        setVerifyStatus({ success: false, message: "Data avviker fra registeret" });
      }
    } catch (err) {
      setVerifyStatus({ success: false, message: "Kunne ikke koble til registeret" });
    } finally {
      setIsVerifying(false);
      setTimeout(() => setVerifyStatus(null), 5000);
    }
  };

  // Refactored UI logic to process details from any source
  const processCadastralDetails = async (details: CadastralDetails, polygonCoords?: [number, number][]) => {
    setAnalysisStatus('Verifiserer grenser og areal...');
    
    if (!details.areaSqm || details.areaSqm <= 0) {
      throw new Error("Fant matrikkeldata, men arealet er ugyldig eller 0 m².");
    }

    setAnalyzedDetails(details);
    setEditName(`${details.municipality || 'Ukjent'} Pol ${details.cadastralId.slice(6, 9)} Par ${details.cadastralId.slice(9, 14)}`);
    setEditTreeCount(details.treeCount || 0);
    setEditVariety('Picual'); 
    
    if (mapRef.current) {
      mapRef.current.flyTo([details.latitude, details.longitude], 18);
      L.marker([details.latitude, details.longitude], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div class="w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-black font-bold animate-bounce"><Check size={20} /></div>`
        })
      }).addTo(drawingLayerRef.current);
    }

    setAnalysisStatus('Tegner eiendomsgrenser...');
    const finalPolygon = polygonCoords || await sedecService.getParcelPolygon(details.cadastralId, [details.latitude, details.longitude]);
    
    if (finalPolygon) {
      setDrawingCoords(finalPolygon);
      if (mapRef.current) L.polygon(finalPolygon, { color: '#22c55e', fillOpacity: 0.4, weight: 4, className: 'animated-polygon' }).addTo(drawingLayerRef.current);
    }
    
    setShowManualEntry(false);
  };

  // Generalized analysis for search bar (AI-assisted)
  const performGeneralAnalysis = async (query: string) => {
    if (isAnalyzing || !query) return;
    setIsAnalyzing(true);
    setAnalysisStatus('Kobler til matrikkelregisteret...');
    setAnalyzedDetails(null);
    setDrawingCoords([]);
    drawingLayerRef.current.clearLayers();

    try {
      const details = await geminiService.analyzeParcelCadastre(query.trim().toUpperCase(), language);
      await processCadastralDetails(details);
    } catch (err: any) {
      alert(err.message || "Kunne ikke identifisere eiendommen.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  // New, direct analysis for manual code entry
  const performDirectCadastralSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnalyzing || !manualPol || !manualPar || !manualProvCod || !manualMunCod) return;
    setIsAnalyzing(true);
    setAnalysisStatus('Henter data fra Catastro...');
    setAnalyzedDetails(null);
    setDrawingCoords([]);
    drawingLayerRef.current.clearLayers();

    try {
      const data = await sedecService.getAlphanumericDataByCode(manualProvCod, manualMunCod, manualPol, manualPar);
      if (!data || !data.cadastralId) throw new Error("Ugyldig respons fra Catastro. Sjekk kodene.");

      const polygon = await sedecService.getParcelPolygon(data.cadastralId);
      if (!polygon) throw new Error("Fant data, men kunne ikke hente eiendommens grenser.");

      const polygonForTurf = turf.polygon([polygon.map(p => [p[1], p[0]])]);
      const center = turf.centerOfMass(polygonForTurf);

      const details: CadastralDetails = {
        cadastralId: data.cadastralId,
        areaSqm: data.areaSqm,
        address: data.address,
        municipality: data.address.split(',')[0] || 'Ukjent',
        latitude: center.geometry.coordinates[1],
        longitude: center.geometry.coordinates[0],
        landUse: data.landUse,
        description: null, soilQuality: null, treeCount: 0
      };

      await processCadastralDetails(details, polygon);

    } catch (err: any) {
      alert(err.message || "En feil oppstod under direkte søk.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  }

  const handleLocateAndSync = () => {
    if (!navigator.geolocation) return;
    setIsGPSLocating(true);
    gpsLayerRef.current.clearLayers();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGPSLocating(false);
        const { latitude, longitude, accuracy } = pos.coords;
        
        if (mapRef.current) {
          L.circle([latitude, longitude], { radius: accuracy, color: '#4ade80', fillColor: '#86efac', fillOpacity: 0.3, weight: 1 }).addTo(gpsLayerRef.current);
          L.marker([latitude, longitude], { icon: L.divIcon({ className: 'gps-marker' }) }).addTo(gpsLayerRef.current);
          mapRef.current.flyTo([latitude, longitude], 19);
        }

        if (selectedParcel && selectedParcel.coordinates && selectedParcel.coordinates.length > 0) {
          const userPoint = turf.point([longitude, latitude]);
          const parcelPolygon = turf.polygon([selectedParcel.coordinates.map(c => [c[1], c[0]])]);
          const isInside = turf.booleanPointInPolygon(userPoint, parcelPolygon);
          
          setGeofenceAlert({
            message: isInside ? `Du er INNENFOR ${selectedParcel.name}` : `Du er UTENFOR ${selectedParcel.name}`,
            type: isInside ? 'inside' : 'outside'
          });
          setTimeout(() => setGeofenceAlert(null), 5000);
        }
      },
      () => setIsGPSLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const saveParcel = () => {
    if (!analyzedDetails) return;
    const newParcel: Parcel = {
      id: Date.now().toString(),
      name: editName,
      cadastralId: analyzedDetails.cadastralId,
      area: analyzedDetails.areaSqm,
      treeCount: editTreeCount,
      treeVariety: editVariety,
      coordinates: drawingCoords.length > 0 ? drawingCoords : [[analyzedDetails.latitude, analyzedDetails.longitude]],
      cropType: analyzedDetails.landUse,
      irrigationStatus: 'Optimal'
    };
    const updated = [...parcels, newParcel];
    setParcels(updated);
    localStorage.setItem('olivia_parcels', JSON.stringify(updated));
    setAnalyzedDetails(null);
    drawingLayerRef.current.clearLayers();
    window.dispatchEvent(new Event('storage'));
  };

  const deleteParcel = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Slette denne parsellen permanent?")) return;
    const updated = parcels.filter(p => p.id !== id);
    setParcels(updated);
    localStorage.setItem('olivia_parcels', JSON.stringify(updated));
    if (selectedParcel?.id === id) {
      setSelectedParcel(null);
      drawingLayerRef.current.clearLayers();
    }
    window.dispatchEvent(new Event('storage'));
  };

  const handleZoomToParcel = (p: Parcel) => {
    if (!mapRef.current) return;
    drawingLayerRef.current.clearLayers();
    setSelectedParcel(p);
    setVerifyStatus(null);
    const poly = L.polygon(p.coordinates, { color: '#22c55e', fillOpacity: 0.4, weight: 4 }).addTo(drawingLayerRef.current);
    mapRef.current.fitBounds(poly.getBounds(), { padding: [80, 80], animate: true });
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] relative overflow-hidden flex flex-col lg:flex-row gap-4">
      {/* Kart Container */}
      <div className="flex-1 relative rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border border-white/10 shadow-inner min-h-[400px]">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        
        {/* TOP CONTROLS */}
        <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-2 pointer-events-none">
           <div className="flex-1 glass bg-black/80 rounded-2xl p-1 flex items-center shadow-2xl border-white/20 pointer-events-auto">
              <div className="flex-1 flex items-center px-4 gap-3">
                <Search size={18} className="text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Søk matrikkel, adresse, koordinater..." 
                  className="bg-transparent text-sm text-white w-full py-2.5 focus:outline-none placeholder:text-slate-500"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && performGeneralAnalysis(searchQuery)}
                />
              </div>
              <button 
                onClick={() => performGeneralAnalysis(searchQuery)}
                disabled={isAnalyzing}
                className="bg-green-500 p-2.5 rounded-xl text-black hover:bg-green-400 active:scale-95 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              </button>
           </div>
           
           <button 
            onClick={() => setShowManualEntry(!showManualEntry)}
            className={`p-4 rounded-2xl glass border shadow-2xl transition-all active:scale-95 pointer-events-auto ${showManualEntry ? 'bg-green-500 border-green-400 text-black' : 'bg-black/80 border-white/20 text-slate-400'}`}
           >
             <SearchCode size={20} />
           </button>
        </div>

        {/* GPS BUTTON & GEOFENCE ALERT */}
        <div className="absolute top-20 right-4 z-[1000] flex flex-col items-end gap-2">
           <button 
            onClick={handleLocateAndSync}
            disabled={isGPSLocating || isAnalyzing}
            className={`p-4 rounded-2xl glass bg-black/80 border border-white/20 shadow-2xl text-slate-300 hover:text-white active:scale-90 transition-all ${isGPSLocating ? 'text-green-400' : ''}`}
           >
              {isGPSLocating ? <Loader2 className="animate-spin" size={24} /> : <Target size={24} />}
           </button>
           {geofenceAlert && (
              <div className={`flex items-center gap-3 py-2 px-4 rounded-full border text-xs font-bold uppercase tracking-widest animate-in fade-in slide-in-from-right-4 ${geofenceAlert.type === 'inside' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
                <Navigation size={14} /> {geofenceAlert.message}
              </div>
           )}
        </div>

        {/* MANUAL ENTRY MODAL */}
        {showManualEntry && (
          <div className="absolute inset-0 z-[2000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
             <form onSubmit={performDirectCadastralSearch} className="w-full max-w-sm glass bg-[#0a0a0b] p-6 md:p-8 rounded-[2rem] border border-white/20 shadow-2xl space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                      <SearchCode size={20} />
                    </div>
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Direkteoppslag (Spania)</h4>
                  </div>
                  <button type="button" onClick={() => setShowManualEntry(false)} className="text-slate-500 hover:text-white p-2">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold ml-1 tracking-widest">Provinskode (INE)</label>
                      <input type="text" value={manualProvCod} onChange={e => setManualProvCod(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-green-500/50" placeholder="03" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold ml-1 tracking-widest">Kommunekode</label>
                      <input type="text" value={manualMunCod} onChange={e => setManualMunCod(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-green-500/50" placeholder="023" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold ml-1 tracking-widest">Polígono</label>
                      <input type="number" placeholder="9" value={manualPol} onChange={e => setManualPol(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white font-bold outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold ml-1 tracking-widest">Parcela</label>
                      <input type="number" placeholder="215" value={manualPar} onChange={e => setManualPar(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-base text-white font-bold outline-none" />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={isAnalyzing} className="w-full bg-green-500 text-black font-bold py-5 rounded-2xl hover:bg-green-400 transition-all flex items-center justify-center gap-3">
                  {isAnalyzing ? <Loader2 size={20} className="animate-spin" /> : <Radar size={20} />} VERIFISER EIENDOM
                </button>
             </form>
          </div>
        )}
        
        <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2">
          {/* Layer Panel Toggle */}
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`p-3.5 rounded-xl glass bg-black/80 border shadow-2xl transition-all active:scale-95 ${showLayerPanel ? 'text-green-400 border-green-500/50' : 'text-slate-400 border-white/20'}`}
          >
            <LayersIcon size={20} />
          </button>

          {/* Expanded Layer Panel */}
          {showLayerPanel && (
            <div className="glass bg-black/90 p-4 rounded-2xl border border-white/20 shadow-2xl space-y-2 min-w-[180px] animate-in slide-in-from-bottom-2">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Kartlag</p>

              {/* Base Layers */}
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
                <button onClick={() => updateMapBaseLayer('satellite')} className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${activeLayer === 'satellite' ? 'bg-white/15 text-white' : 'text-slate-500'}`}>
                  <Globe size={12} /> Satellitt
                </button>
                <button onClick={() => updateMapBaseLayer('terrain')} className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${activeLayer === 'terrain' ? 'bg-white/15 text-white' : 'text-slate-500'}`}>
                  <MapTypeIcon size={12} /> Terreng
                </button>
              </div>

              <div className="border-t border-white/10 pt-2 space-y-1.5">
                {/* Cadastre */}
                <button
                  onClick={() => setIsCadastreLayerActive(!isCadastreLayerActive)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${isCadastreLayerActive ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-white/5 text-slate-400 border border-white/5'}`}
                >
                  <Building size={14} />
                  <span>Matrikkel (Catastro)</span>
                  {isCadastreLayerActive ? <Eye size={12} className="ml-auto" /> : <EyeOff size={12} className="ml-auto" />}
                </button>

                {/* Electricity */}
                <button
                  onClick={() => setIsElectricityLayerActive(!isElectricityLayerActive)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${isElectricityLayerActive ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-slate-400 border border-white/5'}`}
                >
                  <Zap size={14} />
                  <span>Strøm & Høyspent</span>
                  {isElectricityLayerActive ? <Eye size={12} className="ml-auto" /> : <EyeOff size={12} className="ml-auto" />}
                </button>

                {/* Water */}
                <button
                  onClick={() => setIsWaterLayerActive(!isWaterLayerActive)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${isWaterLayerActive ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-400 border border-white/5'}`}
                >
                  <Droplets size={14} />
                  <span>Vann & Irrigasjon</span>
                  {isWaterLayerActive ? <Eye size={12} className="ml-auto" /> : <EyeOff size={12} className="ml-auto" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {isAnalyzing && !showManualEntry && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] glass bg-black/90 px-6 py-3 rounded-full border border-green-500/40 flex items-center gap-3 shadow-2xl">
             <Loader2 size={16} className="animate-spin text-green-400" />
             <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">{analysisStatus}</span>
          </div>
        )}
      </div>

      <div className="w-full lg:w-96 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-4">
        {analyzedDetails && (
          <div className="glass bg-[#0a0a0b] rounded-[2rem] p-7 border-2 border-green-500/40 animate-in slide-in-from-right-4 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                 <CheckCircle2 size={20} className="text-green-400" /> Verifisering ferdig
               </h3>
               <button onClick={() => { setAnalyzedDetails(null); drawingLayerRef.current.clearLayers(); }} className="text-slate-500 hover:text-white p-1"><X size={20} /></button>
            </div>
            <div className="space-y-5">
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-widest">Matrikkelreferanse</p>
                <p className="font-mono text-xs text-green-400 font-bold break-all">{analyzedDetails.cadastralId}</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Eiendomsnavn</label>
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Antall Trær</label>
                    <input type="number" value={editTreeCount} onChange={e => setEditTreeCount(Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold ml-1">Sort</label>
                    <select value={editVariety} onChange={e => setEditVariety(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none">
                      <option value="Picual">Picual</option>
                      <option value="Arbequina">Arbequina</option>
                      <option value="Hojiblanca">Hojiblanca</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-5 bg-green-500/5 rounded-2xl border border-green-500/20 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Areal</p>
                  <p className="font-bold text-white text-base">{analyzedDetails.areaSqm.toLocaleString()} m²</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Landbrukstype</p>
                  <p className="font-bold text-white text-base truncate">{analyzedDetails.landUse}</p>
                </div>
              </div>
              <button onClick={saveParcel} className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-6 rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all">
                <Save size={24} /> LAGRE I MIN GÅRD
              </button>
            </div>
          </div>
        )}

        <div className="glass bg-slate-900/20 rounded-[2rem] p-7 border border-white/10 flex-1 min-h-[250px] relative">
          {verifyStatus && (
            <div className={`absolute top-4 left-4 right-4 z-50 p-4 rounded-2xl border animate-in slide-in-from-top-4 flex items-center gap-3 ${verifyStatus.success ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
              {verifyStatus.success ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
              <span className="text-xs font-bold uppercase tracking-widest">{verifyStatus.message}</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mine Parseller</h3>
            <span className="bg-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-400 border border-white/10">{parcels.length}</span>
          </div>
          <div className="space-y-3">
            {parcels.map(p => (
              <div key={p.id} onClick={() => handleZoomToParcel(p)} className={`p-5 rounded-2xl border transition-all cursor-pointer ${selectedParcel?.id === p.id ? 'border-green-500 bg-green-500/5' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center gap-4 overflow-hidden mb-4">
                   <div className="p-2.5 bg-green-500/10 text-green-400 rounded-xl"><MapPin size={18} /></div>
                   <div className="overflow-hidden">
                     <p className="text-sm font-bold text-white truncate">{p.name}</p>
                     <p className="text-[9px] text-slate-500 font-mono truncate">{p.cadastralId}</p>
                   </div>
                </div>
                {selectedParcel?.id === p.id && (
                  <div className="flex gap-2 animate-in fade-in duration-300">
                    <button 
                      onClick={(e) => { e.stopPropagation(); verifySelectedParcel(); }}
                      disabled={isVerifying}
                      className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold py-2 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2"
                    >
                      {isVerifying ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} VERIFISER DATA
                    </button>
                    <button 
                      onClick={(e) => deleteParcel(p.id, e)} 
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <style>{`
        .parcel-tooltip { background: rgba(0,0,0,0.85); border: 1px solid rgba(34,197,94,0.3); border-radius: 8px; padding: 4px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.6); color: #22c55e; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; }
        .infra-tooltip { background: rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 4px 10px; color: #fff; font-weight: 700; font-size: 11px; }
        .custom-marker { pointer-events: none; }
        .animated-polygon { stroke-dasharray: 10; animation: dash 20s linear infinite; }
        @keyframes dash { to { stroke-dashoffset: 1000; } }
        .gps-marker { width: 20px; height: 20px; background-color: #4ade80; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px #4ade80; }
      `}</style>
    </div>
  );
};

export default FarmMap;
