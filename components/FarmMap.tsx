
import {
  Search, MapPin, Layers, X, CheckCircle2, Loader2, Brain, Undo2, Save,
  ChevronRight, Trash2, Globe, Locate, Building, Zap, Droplets,
  Eye, EyeOff, Navigation, Target, Radar, SearchCode, ArrowRight,
  ShieldCheck, AlertTriangle, Map as MapTypeIcon
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Parcel, Language } from '../types';
import L from 'leaflet';
import { geminiService, CadastralDetails } from '../services/geminiService';
import { sedecService } from '../services/sedecService';
import { useTranslation } from '../services/i18nService';
import { MUNICIPALITIES, Municipality } from '../data/es_municipalities';

import * as turf from '@turf/turf';

type MapLayer = 'satellite' | 'terrain';

interface FarmMapProps {
  parcels: Parcel[];
  onParcelSave: (parcel: Parcel) => void;
  onParcelDelete: (parcelId: string) => void;
  language: Language;
}

const FarmMap: React.FC<FarmMapProps> = ({ parcels, onParcelSave, onParcelDelete, language }) => {
  const { t } = useTranslation(language);
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

  const [munSearchText, setMunSearchText] = useState('Biar, Alicante');
  const [munSuggestions, setMunSuggestions] = useState<Municipality[]>([]);
  const [lastLookupParams, setLastLookupParams] = useState<{ provCod: string; munCod: string; pol: string } | null>(null);
  const [relatedInput, setRelatedInput] = useState('');
  const [relatedResults, setRelatedResults] = useState<Array<{ data: any; polygon: [number, number][] | null; areaSqm: number; selected: boolean }>>([]);
  const [isFetchingRelated, setIsFetchingRelated] = useState(false);

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

  const getParcelCenter = (p: Parcel): [number, number] => {
    if (p.lat && p.lon) return [p.lat, p.lon];
    if (p.coordinates && p.coordinates.length > 0) return p.coordinates[0];
    return MAP_CENTER;
  };

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
        });
      }
      cadastreWmsRef.current.addTo(mapRef.current).bringToFront();
    } else if (cadastreWmsRef.current) {
      mapRef.current.removeLayer(cadastreWmsRef.current);
    }
  }, [isCadastreLayerActive]);

  useEffect(() => {
    if (!mapRef.current) return;
    parcelsLayerRef.current.clearLayers();
    parcels.forEach(p => {
      const center = getParcelCenter(p);
      const area = p.area ? ` · ${(p.area / 10000).toFixed(2)} ha` : '';
      const trees = p.treeCount ? ` · ${p.treeCount} trær` : '';
      const label = `<b>${p.name}</b>${area}${trees}`;

      if (p.coordinates && p.coordinates.length > 2) {
        L.polygon(p.coordinates, { color: '#22c55e', weight: 2, fillOpacity: 0.15, dashArray: '3, 3' })
          .addTo(parcelsLayerRef.current)
          .bindTooltip(label, { direction: 'center', className: 'parcel-tooltip', permanent: false })
          .on('click', () => setSelectedParcel(p));
      } else {
        L.marker(center, {
          icon: L.divIcon({
            className: '',
            html: `<div style="width:14px;height:14px;background:#22c55e;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(34,197,94,0.6)"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          })
        })
          .addTo(parcelsLayerRef.current)
          .bindTooltip(label, { className: 'parcel-tooltip' })
          .on('click', () => setSelectedParcel(p));
      }
    });
  }, [parcels]);

  const verifySelectedParcel = async () => {
    if (!selectedParcel || isVerifying) return;
    setIsVerifying(true);
    setVerifyStatus(null);
    try {
      const details = await geminiService.analyzeParcelCadastre(selectedParcel.cadastralId || '', language);
      if (details.cadastralId === selectedParcel.cadastralId) {
        setVerifyStatus({ success: true, message: "Matrikkeldata verifisert OK" });
      } else {
        setVerifyStatus({ success: false, message: "Data avviker fra registeret" });
      }
    } catch {
      setVerifyStatus({ success: false, message: "Kunne ikke koble til registeret" });
    } finally {
      setIsVerifying(false);
      setTimeout(() => setVerifyStatus(null), 5000);
    }
  };

  const processCadastralDetails = async (details: CadastralDetails, polygonCoords?: [number, number][]) => {
    setAnalysisStatus('Verifiserer grenser og areal...');

    setAnalysisStatus('Tegner eiendomsgrenser...');
    const finalPolygon = polygonCoords || await sedecService.getParcelPolygon(details.cadastralId, [details.latitude, details.longitude]);

    // Compute area from polygon if API returned 0 or missing
    if ((!details.areaSqm || details.areaSqm <= 0) && finalPolygon && finalPolygon.length > 2) {
      try {
        const turfPoly = turf.polygon([finalPolygon.map(p => [p[1], p[0]])]);
        details.areaSqm = Math.round(turf.area(turfPoly));
      } catch {}
    }

    setAnalyzedDetails(details);
    setEditName(`${details.municipality || 'Ukjent'} Pol ${details.cadastralId.slice(6, 9)} Par ${details.cadastralId.slice(9, 14)}`);
    setEditTreeCount(details.treeCount || 0);
    setEditVariety('Picual');

    if (mapRef.current) {
      mapRef.current.flyTo([details.latitude, details.longitude], 18);
    }

    if (finalPolygon) {
      setDrawingCoords(finalPolygon);
      if (mapRef.current) L.polygon(finalPolygon, { color: '#22c55e', fillOpacity: 0.4, weight: 4 }).addTo(drawingLayerRef.current);
    }
    setShowManualEntry(false);
  };

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
      setLastLookupParams({ provCod: manualProvCod, munCod: manualMunCod, pol: manualPol });
      setRelatedResults([]);
      setRelatedInput('');
    } catch (err: any) {
      alert(err.message || "En feil oppstod under direkte søk.");
    } finally {
      setIsAnalyzing(false);
      setAnalysisStatus('');
    }
  };

  const handleMunSearch = (text: string) => {
    setMunSearchText(text);
    if (text.length < 2) { setMunSuggestions([]); return; }
    const lower = text.toLowerCase();
    setMunSuggestions(
      MUNICIPALITIES.filter(m =>
        m.municipalityName.toLowerCase().includes(lower) ||
        m.provinceName.toLowerCase().includes(lower)
      ).slice(0, 8)
    );
  };

  const selectMunicipality = (m: Municipality) => {
    setMunSearchText(`${m.municipalityName}, ${m.provinceName}`);
    setManualProvCod(m.provinceCode);
    setManualMunCod(m.municipalityCode);
    setMunSuggestions([]);
  };

  const fetchRelatedParcels = async () => {
    if (!lastLookupParams || !relatedInput.trim() || isFetchingRelated) return;
    setIsFetchingRelated(true);
    const nums = relatedInput.split(/[,\s]+/).map(n => n.trim()).filter(Boolean);
    const results: typeof relatedResults = [];
    for (const num of nums) {
      try {
        const data = await sedecService.getAlphanumericDataByCode(
          lastLookupParams.provCod, lastLookupParams.munCod, lastLookupParams.pol, num
        );
        if (!data?.cadastralId) continue;
        const polygon = await sedecService.getParcelPolygon(data.cadastralId);
        let areaSqm = data.areaSqm || 0;
        if (areaSqm <= 0 && polygon && polygon.length > 2) {
          try {
            const tp = turf.polygon([polygon.map((p: [number,number]) => [p[1], p[0]])]);
            areaSqm = Math.round(turf.area(tp));
          } catch {}
        }
        results.push({ data, polygon, areaSqm, selected: true });
      } catch {}
    }
    setRelatedResults(results);
    setIsFetchingRelated(false);
  };

  const importSelectedRelated = () => {
    if (!lastLookupParams) return;
    relatedResults.filter(r => r.selected).forEach(r => {
      let lat = 0, lon = 0;
      if (r.polygon && r.polygon.length > 0) {
        try {
          const tp = turf.polygon([r.polygon.map((p: [number,number]) => [p[1], p[0]])]);
          const c = turf.centerOfMass(tp);
          lat = c.geometry.coordinates[1];
          lon = c.geometry.coordinates[0];
        } catch {
          lat = r.polygon[0][0]; lon = r.polygon[0][1];
        }
      }
      const newParcel: Parcel = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: `Pol ${lastLookupParams.pol} Par ${r.data.cadastralId.slice(12, 14).trim() || r.data.cadastralId.slice(-5)}`,
        cadastralId: r.data.cadastralId,
        area: r.areaSqm,
        treeCount: 0,
        treeVariety: 'Picual',
        coordinates: r.polygon || [[lat, lon]],
        cropType: r.data.landUse,
        irrigationStatus: 'Optimal',
        lat, lon,
      };
      onParcelSave(newParcel);
    });
    setRelatedResults([]);
    setRelatedInput('');
  };

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
        if (selectedParcel && selectedParcel.coordinates && selectedParcel.coordinates.length > 2) {
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
      irrigationStatus: 'Optimal',
      lat: analyzedDetails.latitude,
      lon: analyzedDetails.longitude,
    };
    onParcelSave(newParcel);
    setAnalyzedDetails(null);
    drawingLayerRef.current.clearLayers();
  };

  const deleteParcel = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Slette denne parsellen permanent?")) return;
    onParcelDelete(id);
    if (selectedParcel?.id === id) {
      setSelectedParcel(null);
      drawingLayerRef.current.clearLayers();
    }
  };

  const handleZoomToParcel = (p: Parcel) => {
    if (!mapRef.current) return;
    drawingLayerRef.current.clearLayers();
    setSelectedParcel(p);
    setVerifyStatus(null);
    if (p.coordinates && p.coordinates.length > 2) {
      const poly = L.polygon(p.coordinates, { color: '#22c55e', fillOpacity: 0.4, weight: 4 }).addTo(drawingLayerRef.current);
      mapRef.current.fitBounds(poly.getBounds(), { padding: [80, 80], animate: true });
    } else {
      const center = getParcelCenter(p);
      mapRef.current.flyTo(center, 17);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] relative overflow-hidden flex flex-col lg:flex-row gap-4">
      {/* Map Container */}
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
            <div className={`flex items-center gap-3 py-2 px-4 rounded-full border text-xs font-bold uppercase tracking-widest ${geofenceAlert.type === 'inside' ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
              <Navigation size={14} /> {geofenceAlert.message}
            </div>
          )}
        </div>

        {/* MANUAL ENTRY MODAL */}
        {showManualEntry && (
          <div className="absolute inset-0 z-[2000] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <form onSubmit={performDirectCadastralSearch} className="w-full max-w-sm glass bg-[#0a0a0b] p-6 md:p-8 rounded-[2rem] border border-white/20 shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg text-green-400"><SearchCode size={20} /></div>
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">Direkteoppslag (Spania)</h4>
                </div>
                <button type="button" onClick={() => setShowManualEntry(false)} className="text-slate-500 hover:text-white p-2"><X size={20} /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1 relative">
                  <label className="text-[10px] text-slate-500 uppercase font-bold ml-1 tracking-widest">Kommune / Provins</label>
                  <input
                    type="text"
                    value={munSearchText}
                    onChange={e => handleMunSearch(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white outline-none focus:border-green-500/50"
                    placeholder="Skriv kommunenavn..."
                    autoComplete="off"
                  />
                  {munSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-[9999] mt-1 bg-[#111] border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                      {munSuggestions.map(m => (
                        <button
                          key={`${m.provinceCode}-${m.municipalityCode}`}
                          type="button"
                          onClick={() => selectMunicipality(m)}
                          className="w-full text-left px-5 py-3 hover:bg-white/10 border-b border-white/5 last:border-none flex items-center justify-between"
                        >
                          <span className="text-sm text-white font-bold">{m.municipalityName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{m.provinceCode}{m.municipalityCode} · {m.provinceName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {manualProvCod && manualMunCod && (
                    <p className="text-[10px] text-slate-500 ml-1 font-mono">Prov: {manualProvCod} · Mun: {manualMunCod}</p>
                  )}
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

        {/* LAYER PANEL */}
        <div className="absolute bottom-6 left-6 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className={`p-3.5 rounded-xl glass bg-black/80 border shadow-2xl transition-all active:scale-95 ${showLayerPanel ? 'text-green-400 border-green-500/50' : 'text-slate-400 border-white/20'}`}
          >
            <Layers size={20} />
          </button>
          {showLayerPanel && (
            <div className="glass bg-black/90 p-4 rounded-2xl border border-white/20 shadow-2xl space-y-2 min-w-[180px]">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Kartlag</p>
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
                <button onClick={() => updateMapBaseLayer('satellite')} className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${activeLayer === 'satellite' ? 'bg-white/15 text-white' : 'text-slate-500'}`}>
                  <Globe size={12} /> Satellitt
                </button>
                <button onClick={() => updateMapBaseLayer('terrain')} className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${activeLayer === 'terrain' ? 'bg-white/15 text-white' : 'text-slate-500'}`}>
                  <MapTypeIcon size={12} /> Terreng
                </button>
              </div>
              <div className="border-t border-white/10 pt-2 space-y-1.5">
                <button onClick={() => setIsCadastreLayerActive(!isCadastreLayerActive)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${isCadastreLayerActive ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-white/5 text-slate-400 border border-white/5'}`}>
                  <Building size={14} /><span>Matrikkel (Catastro)</span>
                  {isCadastreLayerActive ? <Eye size={12} className="ml-auto" /> : <EyeOff size={12} className="ml-auto" />}
                </button>
                <button onClick={() => setIsElectricityLayerActive(!isElectricityLayerActive)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${isElectricityLayerActive ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' : 'bg-white/5 text-slate-400 border border-white/5'}`}>
                  <Zap size={14} /><span>Strøm & Høyspent</span>
                  {isElectricityLayerActive ? <Eye size={12} className="ml-auto" /> : <EyeOff size={12} className="ml-auto" />}
                </button>
                <button onClick={() => setIsWaterLayerActive(!isWaterLayerActive)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all ${isWaterLayerActive ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-slate-400 border border-white/5'}`}>
                  <Droplets size={14} /><span>Vann & Irrigasjon</span>
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

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-96 overflow-y-auto flex flex-col gap-4 pb-4">
        {analyzedDetails && (
          <div className="glass bg-[#0a0a0b] rounded-[2rem] p-7 border-2 border-green-500/40 shadow-2xl">
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

        {lastLookupParams && (
          <div className="glass bg-[#0a0a0b] rounded-[2rem] p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><SearchCode size={16} /></div>
              <div>
                <p className="text-xs font-bold text-white">Andre parseller i Pol {lastLookupParams.pol}</p>
                <p className="text-[10px] text-slate-500 font-mono">Prov {lastLookupParams.provCod} · Mun {lastLookupParams.munCod}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={relatedInput}
                onChange={e => setRelatedInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchRelatedParcels()}
                placeholder="Parcela-nr, f.eks. 191, 192, 193"
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500/50 placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={fetchRelatedParcels}
                disabled={isFetchingRelated || !relatedInput.trim()}
                className="px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl border border-blue-500/30 disabled:opacity-40 transition-all"
              >
                {isFetchingRelated ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
              </button>
            </div>
            {relatedResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Funnet {relatedResults.length} parseller</p>
                {relatedResults.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${r.selected ? 'border-blue-500/40 bg-blue-500/5' : 'border-white/5 bg-white/2 opacity-50'}`}
                    onClick={() => setRelatedResults(prev => prev.map((x, j) => j === i ? { ...x, selected: !x.selected } : x))}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${r.selected ? 'border-blue-500 bg-blue-500' : 'border-white/20'}`}>
                      {r.selected && <CheckCircle2 size={10} className="text-black" />}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs text-white font-bold font-mono truncate">{r.data.cadastralId}</p>
                      <p className="text-[10px] text-slate-500">{r.areaSqm > 0 ? `${r.areaSqm.toLocaleString()} m²` : 'Ukjent areal'} · {r.data.landUse || 'Ukjent bruk'}</p>
                    </div>
                  </div>
                ))}
                <button
                  onClick={importSelectedRelated}
                  disabled={!relatedResults.some(r => r.selected)}
                  className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                >
                  <Save size={14} /> Importer valgte ({relatedResults.filter(r => r.selected).length})
                </button>
              </div>
            )}
          </div>
        )}

        <div className="glass bg-slate-900/20 rounded-[2rem] p-7 border border-white/10 flex-1 min-h-[250px] relative">
          {verifyStatus && (
            <div className={`absolute top-4 left-4 right-4 z-50 p-4 rounded-2xl border flex items-center gap-3 ${verifyStatus.success ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-red-500/20 border-red-500/40 text-red-400'}`}>
              {verifyStatus.success ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
              <span className="text-xs font-bold uppercase tracking-widest">{verifyStatus.message}</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mine Parseller</h3>
            <span className="bg-white/5 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-400 border border-white/10">{parcels.length}</span>
          </div>
          {parcels.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">
              <MapPin size={32} className="mx-auto mb-3 opacity-30" />
              <p>Ingen parseller ennå.</p>
              <p className="text-xs mt-1">Søk etter matrikkel eller bruk direkteoppslag.</p>
            </div>
          )}
          <div className="space-y-3">
            {parcels.map(p => (
              <div key={p.id} onClick={() => handleZoomToParcel(p)} className={`p-5 rounded-2xl border transition-all cursor-pointer ${selectedParcel?.id === p.id ? 'border-green-500 bg-green-500/5' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                <div className="flex items-center gap-4 overflow-hidden mb-4">
                  <div className="p-2.5 bg-green-500/10 text-green-400 rounded-xl"><MapPin size={18} /></div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-white truncate">{p.name}</p>
                    <p className="text-[9px] text-slate-500 font-mono truncate">{p.cadastralId || `${p.lat?.toFixed(4)}, ${p.lon?.toFixed(4)}`}</p>
                  </div>
                </div>
                {selectedParcel?.id === p.id && (
                  <div className="flex gap-2">
                    {p.cadastralId && (
                      <button
                        onClick={(e) => { e.stopPropagation(); verifySelectedParcel(); }}
                        disabled={isVerifying}
                        className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold py-2 rounded-xl border border-blue-500/20 flex items-center justify-center gap-2"
                      >
                        {isVerifying ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} VERIFISER DATA
                      </button>
                    )}
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
        .gps-marker { width: 20px; height: 20px; background-color: #4ade80; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 10px #4ade80; }
        .leaflet-container { background: #0a0a0b !important; }
      `}</style>
    </div>
  );
};

export default FarmMap;
