import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bug,
  Camera,
  CheckCircle2,
  Droplets,
  FileCheck2,
  Leaf,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Save,
  ShieldCheck,
  Sprout,
  Wrench,
  X,
} from 'lucide-react';
import type { Parcel } from '../types';
import type { FarmObservation, FarmZone, TreeGroup } from '../types/farmIoT';
import {
  fetchFarmZones,
  fetchRecentFarmObservations,
  fetchTreeGroups,
} from '../services/farmIoT';
import { assignGeoParcelManually, geoContextSummary, requestFarmGeo } from '../services/farmGeo';
import {
  shouldAutoApplyTreeGroup,
  shouldAutoApplyZone,
  suggestOperationalContextForGeo,
  type OperationalGeoSuggestion,
} from '../services/farmOperationalGeo';
import { filesToResizedDataUrls } from '../lib/imageUpload';
import type { FarmGeoContext } from '../types/farmGeo';
import {
  listQueuedFieldObservations,
  queueFieldObservation,
  syncPendingFieldObservations,
  syncQueuedFieldObservation,
  type QueuedFieldObservation,
} from '../services/fieldOfflineQueue';
import DonaAnnaBrandMark from './DonaAnnaBrandMark';
import {
  fetchFarmIssues,
  issueTypeForObservation,
  makeFarmIssueId,
  updateFarmIssueStatus,
  type FarmIssue,
  type FarmIssueSeverity,
  type FarmIssueStatus,
} from '../services/farmIssues';

type ObservationCategory = FarmObservation['category'];
type LoadState = 'loading' | 'supabase' | 'empty' | 'error';

interface FieldObservationsViewProps {
  parcels?: Parcel[];
}

const CATEGORY_OPTIONS: { value: ObservationCategory; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'irrigation', label: 'Vanning / dryppslange', icon: <Droplets size={18} />, color: 'text-blue-400' },
  { value: 'tree_health', label: 'Trehelse', icon: <Leaf size={18} />, color: 'text-green-400' },
  { value: 'pest', label: 'Skadedyr / kanin', icon: <Bug size={18} />, color: 'text-yellow-400' },
  { value: 'disease', label: 'Sykdom / sopp', icon: <AlertTriangle size={18} />, color: 'text-red-400' },
  { value: 'soil', label: 'Jord / fukt', icon: <Sprout size={18} />, color: 'text-emerald-400' },
  { value: 'water', label: 'Vann / EC / pH', icon: <Droplets size={18} />, color: 'text-cyan-400' },
  { value: 'maintenance', label: 'Vedlikehold', icon: <Wrench size={18} />, color: 'text-slate-300' },
  { value: 'organic_certification', label: 'Økologisk kontroll', icon: <FileCheck2 size={18} />, color: 'text-lime-400' },
  { value: 'harvest', label: 'Høsting / modenhet', icon: <ShieldCheck size={18} />, color: 'text-orange-400' },
  { value: 'other', label: 'Annet', icon: <MapPin size={18} />, color: 'text-slate-400' },
];

const EMPTY_FORM: Partial<FarmObservation> = {
  parcel_id: '',
  zone_id: '',
  tree_group_id: '',
  tree_group: '',
  category: 'irrigation',
  title: '',
  notes: '',
  image_urls: [],
};

function categoryMeta(category: ObservationCategory) {
  return CATEGORY_OPTIONS.find(item => item.value === category) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 1];
}

function makeObservationDraftId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `obs-${Date.now()}-${performance?.now?.().toString(36).replace('.', '') || 'manual'}`;
}

function defaultReviewDate(days=7){
  const date=new Date();
  date.setDate(date.getDate()+days);
  return date.toISOString().slice(0,10);
}

function issueStatusLabel(status:FarmIssueStatus){
  if(status==='open')return'Åpen';
  if(status==='monitoring')return'Følges opp';
  if(status==='resolved')return'Løst';
  return'Avvist';
}

function issueSeverityLabel(severity:FarmIssueSeverity){
  if(severity==='critical')return'Kritisk';
  if(severity==='high')return'Høy';
  if(severity==='low')return'Lav';
  return'Middels';
}

const FieldObservationsView: React.FC<FieldObservationsViewProps> = ({ parcels = [] }) => {
  const [observations, setObservations] = useState<FarmObservation[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFarmContext, setIsLoadingFarmContext] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [form, setForm] = useState<Partial<FarmObservation>>(EMPTY_FORM);
  const [farmZones, setFarmZones] = useState<FarmZone[]>([]);
  const [treeGroups, setTreeGroups] = useState<TreeGroup[]>([]);
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [previewImageUrls, setPreviewImageUrls] = useState<string[]>([]);
  const [geoContext,setGeoContext]=useState<FarmGeoContext|null>(null);
  const [isLocating,setIsLocating]=useState(false);
  const [parcelSelectionSource,setParcelSelectionSource]=useState<'none'|'manual'|'geo'>('none');
  const [zoneSelectionSource,setZoneSelectionSource]=useState<'none'|'manual'|'geo'>('none');
  const [treeGroupSelectionSource,setTreeGroupSelectionSource]=useState<'none'|'manual'|'geo'>('none');
  const [operationalGeoSuggestion,setOperationalGeoSuggestion]=useState<OperationalGeoSuggestion|null>(null);
  const [offlineQueueCount,setOfflineQueueCount]=useState(0);
  const [isSyncingOffline,setIsSyncingOffline]=useState(false);
  const [isOnline,setIsOnline]=useState(()=>typeof navigator==='undefined'?true:navigator.onLine);
  const [syncMessage,setSyncMessage]=useState('');
  const [activeView,setActiveView]=useState<'observations'|'issues'>('observations');
  const [issues,setIssues]=useState<FarmIssue[]>([]);
  const [trackAsIssue,setTrackAsIssue]=useState(false);
  const [linkedIssueId,setLinkedIssueId]=useState<string|undefined>(undefined);
  const [issueSeverity,setIssueSeverity]=useState<FarmIssueSeverity>('medium');
  const [issueNextReview,setIssueNextReview]=useState(defaultReviewDate());
  const [closingIssue,setClosingIssue]=useState<FarmIssue|null>(null);
  const [closingStatus,setClosingStatus]=useState<'resolved'|'dismissed'>('resolved');
  const [resolutionNotes,setResolutionNotes]=useState('');
  const [isUpdatingIssue,setIsUpdatingIssue]=useState(false);

  const parcelNameById = useMemo(() => new Map(parcels.map(parcel => [parcel.id, parcel.name])), [parcels]);
  const zoneNameById = useMemo(() => new Map(farmZones.map(zone => [zone.id, zone.name])), [farmZones]);
  const treeGroupNameById = useMemo(() => new Map(treeGroups.map(group => [group.id, group.name])), [treeGroups]);
  const filteredTreeGroups = useMemo(() => {
    if (!form.zone_id) return treeGroups;
    return treeGroups.filter(group => group.zone_id === form.zone_id);
  }, [form.zone_id, treeGroups]);

  const refreshOfflineQueue=async()=>{
    try{setOfflineQueueCount((await listQueuedFieldObservations()).length);}
    catch(err){console.warn('[FieldObservationsView] offline queue count',err);}
  };

  const syncOfflineQueue=async()=>{
    if(typeof navigator!=='undefined'&&!navigator.onLine){await refreshOfflineQueue();return;}
    setIsSyncingOffline(true);
    try{
      const result=await syncPendingFieldObservations();
      await refreshOfflineQueue();
      if(result.synced){
        setSyncMessage(result.synced+' feltobservasjon'+(result.synced===1?'':'er')+' synkronisert.');
        await loadObservations();
      }else if(result.failed){
        setSyncMessage('Synkronisering ble ikke fullført. Posten ligger fortsatt trygt lokalt.');
      }
    }catch(err:any){
      setSyncMessage('Synkronisering feilet, men feltdata ligger fortsatt lokalt.');
      console.warn('[FieldObservationsView] offline sync',err);
    }finally{
      setIsSyncingOffline(false);
    }
  };

  const loadObservations = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [rows,issueRows] = await Promise.all([
        fetchRecentFarmObservations(100),
        fetchFarmIssues({status:'all',limit:200}),
      ]);
      setObservations(rows);
      setIssues(issueRows);
      setLoadState(rows.length||issueRows.length ? 'supabase' : 'empty');
      setLastRefresh(new Date());
    } catch (error) {
      setObservations([]);
      setIssues([]);
      setLoadState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke hente feltobservasjoner eller oppfølgingssaker fra Supabase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadObservations();
    void refreshOfflineQueue();
    const onOnline=()=>{setIsOnline(true);void syncOfflineQueue();};
    const onOffline=()=>setIsOnline(false);
    window.addEventListener('online',onOnline);
    window.addEventListener('offline',onOffline);
    return()=>{
      window.removeEventListener('online',onOnline);
      window.removeEventListener('offline',onOffline);
    };
  }, []);

  useEffect(() => {
    return () => {
      previewImageUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewImageUrls]);

  useEffect(() => {
    if (!isFormOpen || !form.parcel_id) {
      setFarmZones([]);
      setTreeGroups([]);
      return;
    }

    let cancelled = false;
    setIsLoadingFarmContext(true);
    fetchFarmZones(form.parcel_id)
      .then(async zones => {
        if (cancelled) return;
        setFarmZones(zones);
        const allGroups=await fetchTreeGroups(undefined);
        if (cancelled) return;
        setTreeGroups(allGroups.filter(group=>group.parcel_id===form.parcel_id));
      })
      .catch(error => {
        console.warn('[FieldObservationsView] Could not load zones/tree groups', error);
        if (!cancelled) {
          setFarmZones([]);
          setTreeGroups([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingFarmContext(false);
      });

    return () => { cancelled = true; };
  }, [isFormOpen, form.parcel_id]);

  const stats = useMemo(() => {
    const last7 = observations.filter(obs => Date.now() - new Date(obs.observed_at).getTime() < 7 * 24 * 36e5).length;
    const irrigation = observations.filter(obs => obs.category === 'irrigation').length;
    const pests = observations.filter(obs => obs.category === 'pest' || obs.category === 'disease').length;
    const activeIssues=issues.filter(issue=>issue.status==='open'||issue.status==='monitoring').length;
    return { last7, irrigation, pests, activeIssues };
  }, [observations,issues]);

  const locateCurrentPosition=async(source:'device_live_capture'|'device_at_upload')=>{
    setIsLocating(true);setErrorMessage(null);setOperationalGeoSuggestion(null);
    try{
      const rawGeo=await requestFarmGeo(parcels,source);
      let geo=rawGeo;
      let targetParcelId=rawGeo.parcelId||'';

      if(parcelSelectionSource==='manual'&&form.parcel_id){
        const selected=parcels.find(parcel=>parcel.id===form.parcel_id);
        if(selected){
          if(rawGeo.parcelId&&rawGeo.parcelId!==selected.id){
            setErrorMessage('GPS foreslo '+(rawGeo.parcelName||rawGeo.parcelId)+', men manuelt valgt parsell beholdes. Kontroller at du står på riktig sted.');
          }
          geo=assignGeoParcelManually(rawGeo,selected)||rawGeo;
          targetParcelId=selected.id;
        }
      }else if(rawGeo.parcelId){
        targetParcelId=rawGeo.parcelId;
        setParcelSelectionSource('geo');
      }

      setGeoContext(geo);

      if(targetParcelId){
        let suggestion:OperationalGeoSuggestion|null=null;
        try{
          suggestion=await suggestOperationalContextForGeo({geo,parcelId:targetParcelId});
          setOperationalGeoSuggestion(suggestion);
        }catch(error){
          console.warn('[FieldObservationsView] operational GEO suggestion',error);
        }

        setForm(prev=>{
          const next={...prev,parcel_id:targetParcelId};
          if(parcelSelectionSource!=='manual'&&prev.parcel_id!==targetParcelId){
            next.zone_id='';
            next.tree_group_id='';
          }
          if(suggestion&&zoneSelectionSource!=='manual'&&shouldAutoApplyZone(suggestion)){
            next.zone_id=suggestion.zoneId;
          }
          if(suggestion&&treeGroupSelectionSource!=='manual'&&shouldAutoApplyTreeGroup(suggestion)){
            next.tree_group_id=suggestion.treeGroupId;
          }
          return next;
        });

        if(suggestion&&zoneSelectionSource!=='manual'&&shouldAutoApplyZone(suggestion))setZoneSelectionSource('geo');
        if(suggestion&&treeGroupSelectionSource!=='manual'&&shouldAutoApplyTreeGroup(suggestion))setTreeGroupSelectionSource('geo');
      }
      return geo;
    }catch(error:any){
      setErrorMessage(error?.message||'Kunne ikke hente GPS-posisjon.');
      return null;
    }finally{
      setIsLocating(false);
    }
  };

  const handleImageSelect = async (fileList: FileList | null, liveCapture=false) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(file => file.type.startsWith('image/'));
    if (!files.length) return;
    const nextPreviews = files.map(file => URL.createObjectURL(file));
    setSelectedImageFiles(prev => [...prev, ...files]);
    setPreviewImageUrls(prev => [...prev, ...nextPreviews]);
    setErrorMessage(null);
    if(liveCapture)await locateCurrentPosition('device_live_capture');
  };

  const removeSelectedImage = (index: number) => {
    setPreviewImageUrls(prev => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setSelectedImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    previewImageUrls.forEach(url => URL.revokeObjectURL(url));
    setForm({ ...EMPTY_FORM });
    setFarmZones([]);
    setTreeGroups([]);
    setSelectedImageFiles([]);
    setPreviewImageUrls([]);
    setGeoContext(null);
    setParcelSelectionSource('none');
    setZoneSelectionSource('none');
    setTreeGroupSelectionSource('none');
    setOperationalGeoSuggestion(null);
    setTrackAsIssue(false);
    setLinkedIssueId(undefined);
    setIssueSeverity('medium');
    setIssueNextReview(defaultReviewDate());
  };

  const openIssueFollowUp=(issue:FarmIssue)=>{
    resetForm();
    setActiveView('observations');
    setLinkedIssueId(issue.id);
    setForm({
      ...EMPTY_FORM,
      parcel_id:issue.parcel_id||'',
      zone_id:issue.zone_id||'',
      tree_group_id:issue.tree_group_id||'',
      category:(issue.issue_type==='other'?'other':issue.issue_type) as ObservationCategory,
      title:'Kontroll: '+issue.title,
    });
    setIsFormOpen(true);
  };

  const markIssueMonitoring=async(issue:FarmIssue)=>{
    setIsUpdatingIssue(true);setErrorMessage(null);
    try{
      const updated=await updateFarmIssueStatus({
        id:issue.id,
        status:'monitoring',
        nextReviewAt:issue.next_review_at||new Date(defaultReviewDate()+'T12:00:00').toISOString(),
      });
      setIssues(current=>current.map(item=>item.id===updated.id?updated:item));
      window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
    }catch(error:any){
      setErrorMessage(error?.message||'Kunne ikke oppdatere oppfølgingssaken.');
    }finally{setIsUpdatingIssue(false);}
  };

  const closeIssue=async()=>{
    if(!closingIssue)return;
    setIsUpdatingIssue(true);setErrorMessage(null);
    try{
      const updated=await updateFarmIssueStatus({
        id:closingIssue.id,
        status:closingStatus,
        resolutionNotes,
      });
      setIssues(current=>current.map(item=>item.id===updated.id?updated:item));
      setClosingIssue(null);setResolutionNotes('');
      window.dispatchEvent(new CustomEvent('olivia:farm-truth-updated'));
    }catch(error:any){
      setErrorMessage(error?.message||'Kunne ikke lukke oppfølgingssaken.');
    }finally{setIsUpdatingIssue(false);}
  };

  const handleSave = async () => {
    if (!form.title?.trim() || !form.category) {
      setErrorMessage('Skriv inn en tydelig tittel og velg kategori før du lagrer.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSyncMessage('');
    const observationDraftId = makeObservationDraftId();
    try {
      const selectedTreeGroupName = form.tree_group_id ? treeGroupNameById.get(form.tree_group_id) : undefined;
      const imageDataUrls=selectedImageFiles.length
        ?await filesToResizedDataUrls(selectedImageFiles,{maxDim:1600,quality:0.8})
        :[];

      const observation: Omit<FarmObservation, 'id'|'image_urls'> = {
        parcel_id: form.parcel_id?.trim() || undefined,
        zone_id: form.zone_id?.trim() || undefined,
        tree_group_id: form.tree_group_id?.trim() || undefined,
        tree_group: selectedTreeGroupName || form.tree_group?.trim() || undefined,
        category: form.category,
        title: form.title.trim(),
        notes: form.notes?.trim() || undefined,
        observed_at: new Date().toISOString(),
        created_by: 'Olivia',
        geo_lat:geoContext?.lat,
        geo_lon:geoContext?.lon,
        geo_accuracy_m:geoContext?.accuracyM,
        geo_captured_at:geoContext?.capturedAt,
        geo_source:geoContext?.source,
        geo_match_method:geoContext?.matchMethod,
        geo_match_confidence:geoContext?.matchConfidence,
      };

      const issueDraft=trackAsIssue&&!linkedIssueId
        ?{
          id:makeFarmIssueId(),
          issueType:issueTypeForObservation(form.category),
          title:form.title.trim(),
          description:form.notes?.trim()||undefined,
          severity:issueSeverity,
          nextReviewAt:issueNextReview?new Date(issueNextReview+'T12:00:00').toISOString():undefined,
          parcelId:form.parcel_id?.trim()||undefined,
          zoneId:form.zone_id?.trim()||undefined,
          treeGroupId:form.tree_group_id?.trim()||undefined,
          geo:geoContext,
        }
        :undefined;

      const queued:QueuedFieldObservation={
        id:observationDraftId,
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString(),
        attempts:0,
        observation,
        imageDataUrls,
        geo:geoContext,
        issueDraft,
        existingIssueId:linkedIssueId,
      };

      await queueFieldObservation(queued);
      await refreshOfflineQueue();

      let synced=false;
      if(typeof navigator==='undefined'||navigator.onLine){
        try{
          const saved=await syncQueuedFieldObservation(queued);
          setObservations(prev=>[saved,...prev.filter(item=>item.id!==saved.id)]);
          setLoadState('supabase');
          setLastRefresh(new Date());
          synced=true;
          setSyncMessage(linkedIssueId?'Ny kontroll er lagret og koblet til oppfølgingssaken.':issueDraft?'Feltobservasjonen og oppfølgingssaken er lagret.':'Feltobservasjonen er lagret og synkronisert.');
          await loadObservations();
        }catch(err:any){
          console.warn('[FieldObservationsView] immediate sync failed',err);
          setSyncMessage('Feltobservasjonen er lagret lokalt og venter på synkronisering.');
        }
      }else{
        setSyncMessage('Du er offline. Feltobservasjonen er lagret lokalt og synkroniseres når nettet er tilbake.');
      }

      await refreshOfflineQueue();
      resetForm();
      setIsFormOpen(false);
      if(!synced)setLoadState(observations.length?'supabase':'empty');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Kunne ikke lagre observasjonen lokalt.');
    } finally {
      setIsSaving(false);
    }
  };

  const sourceLabel = loadState === 'supabase' ? 'Supabase' : loadState === 'empty' ? 'Supabase · ingen data ennå' : loadState === 'error' ? 'Supabase-feil' : 'Laster Supabase';

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      <div className="relative overflow-hidden rounded-[2rem] border border-[#d9b657]/20 bg-[#070b08] p-6 shadow-2xl shadow-black/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(217,182,87,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(111,127,60,0.16),transparent_34%)]" />
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <DonaAnnaBrandMark variant="symbol" size="md" showText={false} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#d9b657]">Doña Anna · Olivia</p>
              <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 mt-1">Feltobservasjoner</h2>
              <p className="text-slate-400 text-sm mt-2">
                Mobil feltlogg for vanning, trehelse, skadedyr, modenhet og økologisk kontroll. Data lagres i Supabase-tabellen <span className="font-mono text-[#d9b657]">olivia.farm_observations</span>.
              </p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">
                {sourceLabel} · Oppdatert {lastRefresh.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadObservations} disabled={isLoading} className="p-3.5 glass border border-white/10 rounded-2xl text-[#d9b657] hover:bg-white/5 transition-all disabled:opacity-50">
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCcw size={18} />}
            </button>
            <button onClick={() => setIsFormOpen(true)} className="bg-[#d9b657] hover:bg-[#f0cf70] text-black px-6 py-3.5 rounded-2xl font-bold transition-all shadow-xl shadow-[#d9b657]/20 flex items-center gap-2">
              <Plus size={20} /> Ny observasjon
            </button>
          </div>
        </div>
      </div>

      {errorMessage && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100 flex gap-3"><AlertTriangle size={18} className="flex-shrink-0 mt-0.5" /> {errorMessage}</div>}

      {(offlineQueueCount>0||!isOnline)&&<div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.07] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-white">{isOnline?'Feltdata venter på synkronisering':'Offline feltmodus'}</p>
          <p className="text-xs text-slate-400 mt-1">{offlineQueueCount} {offlineQueueCount===1?'lokal post':'lokale poster'} venter. {isOnline?'Du kan synkronisere nå.':'Du kan fortsette å registrere observasjoner og bilder uten dekning.'}</p>
        </div>
        {isOnline&&offlineQueueCount>0&&<button onClick={syncOfflineQueue} disabled={isSyncingOffline} className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-xs font-black text-blue-200 flex items-center justify-center gap-2">{isSyncingOffline?<Loader2 size={14} className="animate-spin"/>:<RefreshCcw size={14}/>} Synkroniser</button>}
      </div>}
      {syncMessage&&<div className="rounded-xl border border-green-500/15 bg-green-500/[0.04] px-4 py-3 text-xs text-green-200">{syncMessage}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Siste 7 dager', value: stats.last7, icon: <CheckCircle2 size={18} />, cls: 'border-green-500/20 bg-green-500/10 text-green-400' },
          { label: 'Vanning', value: stats.irrigation, icon: <Droplets size={18} />, cls: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
          { label: 'Skadedyr/sykdom', value: stats.pests, icon: <Bug size={18} />, cls: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' },
          { label: 'Åpne saker', value: stats.activeIssues, icon: <ShieldCheck size={18} />, cls: 'border-purple-500/20 bg-purple-500/10 text-purple-300' },
        ].map(card => <div key={card.label} className={`glass rounded-[2rem] p-5 border ${card.cls}`}><div className="mb-2">{card.icon}</div><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{card.label}</p><p className="text-3xl font-black text-white mt-1">{card.value}</p></div>)}
      </div>

      <div className="flex gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-2">
        <button onClick={()=>setActiveView('observations')} className={'flex-1 rounded-xl px-4 py-3 text-sm font-black transition '+(activeView==='observations'?'bg-[#d9b657] text-black':'text-slate-400 hover:bg-white/5')}>Observasjoner · {observations.length}</button>
        <button onClick={()=>setActiveView('issues')} className={'flex-1 rounded-xl px-4 py-3 text-sm font-black transition '+(activeView==='issues'?'bg-purple-500/20 text-purple-200 border border-purple-500/20':'text-slate-400 hover:bg-white/5')}>Oppfølgingssaker · {issues.filter(issue=>issue.status==='open'||issue.status==='monitoring').length}</button>
      </div>

      {activeView==='observations' && loadState === 'empty' && !isLoading && (
        <div className="rounded-[2rem] border border-dashed border-[#d9b657]/30 bg-[#d9b657]/5 p-8 text-center">
          <Camera className="mx-auto text-[#d9b657] mb-3" size={34} />
          <h4 className="text-white font-bold text-lg">Ingen feltobservasjoner ennå</h4>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto leading-relaxed">Legg inn første observasjon fra gården. Bilder lastes til Supabase Storage og observasjonen lagres i `olivia.farm_observations`.</p>
          <button onClick={() => setIsFormOpen(true)} className="mt-5 bg-[#d9b657] hover:bg-[#f0cf70] text-black px-5 py-3 rounded-2xl font-bold inline-flex items-center gap-2"><Plus size={18} /> Ny observasjon</button>
        </div>
      )}

      {isLoading && loadState === 'loading' && <div className="glass rounded-[2rem] p-8 border border-white/10 text-slate-400 flex items-center gap-3"><Loader2 size={18} className="animate-spin" /> Henter feltobservasjoner fra Supabase...</div>}

      {activeView==='observations' && observations.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {observations.map(obs => {
            const meta = categoryMeta(obs.category);
            const parcelName = obs.parcel_id ? parcelNameById.get(obs.parcel_id) || obs.parcel_id : 'Ingen parsell';
            const zoneName = obs.zone_id ? zoneNameById.get(obs.zone_id) || obs.zone_id : 'Ingen sone';
            return (
              <div key={obs.id} className="glass rounded-[2rem] p-5 border border-white/10 bg-white/[0.02]">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex gap-3">
                    <div className={`p-3 rounded-2xl bg-white/5 ${meta.color}`}>{meta.icon}</div>
                    <div>
                      <p className="text-white font-bold text-lg">{obs.title}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">{meta.label} · {new Date(obs.observed_at).toLocaleString('no-NO')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="text-[10px] px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300 font-bold uppercase tracking-widest">{parcelName}</span>
                  <span className="text-[10px] px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300 font-bold uppercase tracking-widest">{zoneName}</span>
                  {obs.tree_group && <span className="text-[10px] px-3 py-1 rounded-full border border-white/10 bg-white/5 text-slate-300 font-bold uppercase tracking-widest">{obs.tree_group}</span>}
                  {obs.issue_id&&<span className="text-[10px] px-3 py-1 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-200 font-bold uppercase tracking-widest">Oppfølgingssak</span>}
                  {obs.geo_lat!=null&&obs.geo_lon!=null&&<span className="text-[10px] px-3 py-1 rounded-full border border-green-500/15 bg-green-500/[0.05] text-green-300 font-bold uppercase tracking-widest">GEO ±{Math.round(Number(obs.geo_accuracy_m||0))}m</span>}
                </div>
                {obs.notes && <p className="text-sm text-slate-400 mt-4 leading-relaxed whitespace-pre-line">{obs.notes}</p>}
                {obs.image_urls?.length ? <div className="grid grid-cols-3 gap-2 mt-4">{obs.image_urls.slice(0, 6).map(url => <img key={url} src={url} alt="Feltobservasjon" className="h-24 w-full object-cover rounded-xl border border-white/10" />)}</div> : null}
              </div>
            );
          })}
        </div>
      )}

      {activeView==='issues'&&<div className="space-y-4">
        {issues.length===0?<div className="rounded-[2rem] border border-dashed border-purple-500/20 bg-purple-500/[0.04] p-8 text-center"><ShieldCheck className="mx-auto text-purple-300 mb-3" size={34}/><p className="font-black text-white">Ingen oppfølgingssaker ennå</p><p className="text-sm text-slate-500 mt-2">Opprett sak fra en feltobservasjon når et problem må kontrolleres igjen.</p></div>:
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{issues.map(issue=>{
          const parcelName=issue.parcel_id?parcelNameById.get(issue.parcel_id)||issue.parcel_id:'Ingen parsell';
          const active=issue.status==='open'||issue.status==='monitoring';
          const reviewAt=issue.next_review_at?new Date(issue.next_review_at):null;
          const overdue=active&&reviewAt&&!Number.isNaN(reviewAt.getTime())&&reviewAt.getTime()<Date.now();
          return <article key={issue.id} className={'rounded-[2rem] border p-5 '+(issue.severity==='critical'?'border-red-500/25 bg-red-500/[0.05]':issue.severity==='high'?'border-amber-500/20 bg-amber-500/[0.04]':active?'border-purple-500/15 bg-purple-500/[0.03]':'border-white/10 bg-white/[0.02]')}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-black text-slate-300">{issueStatusLabel(issue.status)}</span><span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] font-black text-slate-400">{issueSeverityLabel(issue.severity)}</span>{overdue&&<span className="rounded-full border border-red-500/20 px-2 py-0.5 text-[9px] font-black text-red-300">Kontroll forfalt</span>}</div><h3 className="text-lg font-black text-white mt-2">{issue.title}</h3><p className="text-xs text-slate-500 mt-1">{parcelName} · {issue.issue_type.replaceAll('_',' ')}</p></div>
              <ShieldCheck size={20} className={active?'text-purple-300':'text-slate-600'}/>
            </div>
            {issue.description&&<p className="text-sm text-slate-400 mt-3">{issue.description}</p>}
            <div className="grid grid-cols-2 gap-2 mt-4"><div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-600">Åpnet</p><p className="text-xs font-bold text-slate-300 mt-1">{new Date(issue.opened_at).toLocaleDateString('no-NO')}</p></div><div className="rounded-xl bg-black/20 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-600">Neste kontroll</p><p className={'text-xs font-bold mt-1 '+(overdue?'text-red-300':'text-slate-300')}>{reviewAt?reviewAt.toLocaleDateString('no-NO'):'Ikke satt'}</p></div></div>
            {issue.resolution_notes&&<p className="text-xs text-green-200 mt-3">Avslutning: {issue.resolution_notes}</p>}
            {active&&<div className="flex flex-wrap gap-2 mt-4">
              <button onClick={()=>openIssueFollowUp(issue)} className="rounded-xl bg-purple-500/15 px-3 py-2 text-xs font-black text-purple-200"><Camera size={13} className="inline mr-1"/>Ny kontroll</button>
              {issue.status==='open'&&<button onClick={()=>markIssueMonitoring(issue)} disabled={isUpdatingIssue} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">Følges opp</button>}
              <button onClick={()=>{setClosingIssue(issue);setClosingStatus('resolved');setResolutionNotes('');}} className="rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs font-bold text-green-300">Løst</button>
              <button onClick={()=>{setClosingIssue(issue);setClosingStatus('dismissed');setResolutionNotes('');}} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-400">Ikke relevant</button>
            </div>}
          </article>;
        })}</div>}
      </div>}

      {closingIssue&&<div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-[2rem] border border-white/15 bg-[#080b09] p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest font-black text-purple-300">Avslutt oppfølgingssak</p><h3 className="text-xl font-black text-white mt-1">{closingIssue.title}</h3></div><button onClick={()=>setClosingIssue(null)} className="p-2 text-slate-400"><X size={18}/></button></div>
          <p className="text-xs text-slate-500 mt-3">{closingStatus==='resolved'?'Løst betyr at dere faktisk har kontrollert og vurderer problemet som avsluttet.':'Ikke relevant brukes når saken ikke skal følges videre.'}</p>
          <textarea value={resolutionNotes} onChange={e=>setResolutionNotes(e.target.value)} className="mt-4 min-h-[100px] w-full rounded-xl border border-white/10 bg-black/35 p-3 text-sm text-white" placeholder="Hva ble kontrollert / hvorfor lukkes saken?"/>
          <div className="flex justify-end gap-2 mt-4"><button onClick={()=>setClosingIssue(null)} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300">Avbryt</button><button onClick={closeIssue} disabled={isUpdatingIssue} className="rounded-xl bg-green-500 px-4 py-2.5 text-xs font-black text-black disabled:opacity-40">{isUpdatingIssue?'Lagrer…':closingStatus==='resolved'?'Bekreft løst':'Lukk som ikke relevant'}</button></div>
        </div>
      </div>}

      {isFormOpen && (
        <div className="fixed inset-0 z-[2000] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md">
          <div className="glass w-full md:max-w-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-white/20 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#d9b657]">Supabase · feltdata</p><h3 className="text-2xl font-bold text-white mt-1">{linkedIssueId?'Ny kontroll':'Ny feltobservasjon'}</h3><p className="text-xs text-slate-500 mt-1">{linkedIssueId?'Denne observasjonen kobles til eksisterende oppfølgingssak.':'Dokumenter faktisk observasjon fra gården.'}</p></div><button onClick={() => { resetForm(); setIsFormOpen(false); }} className="p-2 text-slate-400 hover:text-white"><X size={24} /></button></div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Parsell" help="Velg parsell manuelt, eller la GPS foreslå den."><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60" value={form.parcel_id || ''} onChange={event => {
      const parcelId=event.target.value;
      setParcelSelectionSource(parcelId?'manual':'none');
      setZoneSelectionSource('none');
      setTreeGroupSelectionSource('none');
      setOperationalGeoSuggestion(null);
      setForm(prev=>({...prev,parcel_id:parcelId,zone_id:'',tree_group_id:''}));
      if(geoContext&&parcelId){
        const parcel=parcels.find(item=>item.id===parcelId);
        if(parcel)setGeoContext(assignGeoParcelManually(geoContext,parcel)||geoContext);
      }
    }}><option className="bg-slate-900" value="">Ingen parsell</option>{parcels.map(parcel => <option key={parcel.id} className="bg-slate-900" value={parcel.id}>{parcel.name}</option>)}</select></Field>
              <Field label="Kategori" help="Velg hva observasjonen handler om."><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60" value={form.category || 'irrigation'} onChange={event => {const category=event.target.value as ObservationCategory;setForm(prev => ({ ...prev, category }));if(category==='pest'||category==='disease')setTrackAsIssue(true);}}>{CATEGORY_OPTIONS.map(option => <option key={option.value} className="bg-slate-900" value={option.value}>{option.label}</option>)}</select></Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Sone" help="Velg sone hvis den finnes i Supabase.">{isLoadingFarmContext ? <div className="text-xs text-slate-500 py-3 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Laster soner...</div> : <select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60" value={form.zone_id || ''} onChange={event => {
                const zoneId=event.target.value;
                setZoneSelectionSource(zoneId?'manual':'none');
                setTreeGroupSelectionSource('none');
                setForm(prev=>({...prev,zone_id:zoneId,tree_group_id:''}));
              }}><option className="bg-slate-900" value="">Ingen sone</option>{farmZones.map(zone => <option key={zone.id} className="bg-slate-900" value={zone.id}>{zone.name}</option>)}</select>}</Field>
              <Field label="Tregruppe" help="Valgfritt, hvis observasjonen gjelder en gruppe trær."><select className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60" value={form.tree_group_id || ''} onChange={event => {
                const treeGroupId=event.target.value;
                setTreeGroupSelectionSource(treeGroupId?'manual':'none');
                setForm(prev=>({...prev,tree_group_id:treeGroupId}));
              }}><option className="bg-slate-900" value="">Ingen tregruppe</option>{filteredTreeGroups.map(group => <option key={group.id} className="bg-slate-900" value={group.id}>{group.name}</option>)}</select></Field>
            </div>

            <Field label="Tittel *" help="Kort og tydelig observasjon."><input className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#d9b657]/60" placeholder="F.eks. lav fukt ved unge Gordal" value={form.title || ''} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} /></Field>
            <Field label="Notat" help="Beskriv hva du så, hvor og hva som bør gjøres."><textarea className="w-full min-h-[140px] bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-[#d9b657]/60" value={form.notes || ''} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} /></Field>

            {!linkedIssueId&&<div className="rounded-2xl border border-purple-500/15 bg-purple-500/[0.035] p-4">
              <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={trackAsIssue} onChange={e=>setTrackAsIssue(e.target.checked)} className="mt-1"/><span><span className="text-sm font-black text-white">Opprett oppfølgingssak</span><span className="block text-xs text-slate-500 mt-1">Bruk når dette må kontrolleres igjen. Skadedyr og sykdom foreslås automatisk som sak, men du bestemmer.</span></span></label>
              {trackAsIssue&&<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <Field label="Alvorlighet" help="Styrer prioritet i oppfølgingen."><select value={issueSeverity} onChange={e=>setIssueSeverity(e.target.value as FarmIssueSeverity)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white"><option value="low">Lav</option><option value="medium">Middels</option><option value="high">Høy</option><option value="critical">Kritisk</option></select></Field>
                <Field label="Neste kontroll" help="Dato for ny feltkontroll, ikke automatisk løsning."><input type="date" value={issueNextReview} onChange={e=>setIssueNextReview(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white"/></Field>
              </div>}
            </div>}

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Bilder + GEO</label>
              <p className="text-[11px] text-slate-600 block mb-2">Live kamerabilder kan kobles til GPS-posisjonen der du står. Galleribilder får ikke automatisk dagens GPS som bildeposisjon.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="rounded-2xl bg-[#d9b657] px-4 py-3 text-center text-sm font-bold text-black cursor-pointer hover:bg-[#f0cf70]">
                  <Camera size={16} className="inline mr-2"/>Ta bilde nå
                  <input type="file" accept="image/*" capture="environment" onChange={event=>handleImageSelect(event.target.files,true)} className="hidden"/>
                </label>
                <label className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-bold text-slate-300 cursor-pointer">
                  Velg fra galleri
                  <input type="file" accept="image/*" multiple onChange={event=>handleImageSelect(event.target.files,false)} className="hidden"/>
                </label>
                <button type="button" onClick={()=>locateCurrentPosition('device_at_upload')} disabled={isLocating} className="rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-300 disabled:opacity-50">
                  {isLocating?<Loader2 size={16} className="inline animate-spin mr-2"/>:<MapPin size={16} className="inline mr-2"/>}Bruk posisjon
                </button>
              </div>
              {geoContext&&<div className={'mt-3 rounded-xl border p-3 '+(geoContext.parcelId?'border-green-500/20 bg-green-500/[0.04]':'border-amber-500/20 bg-amber-500/[0.04]')}>
                <p className="text-[9px] uppercase tracking-widest font-black text-green-300">GEO registrert</p>
                <p className="text-xs text-slate-300 mt-1">{geoContextSummary(geoContext)}</p>
                <p className="text-[10px] text-slate-500 mt-1">{geoContext.source==='device_live_capture'?'Posisjon hentet sammen med live bildeopptak.':'Posisjon hentet ved opplasting/registrering, ikke fra bildefilens EXIF.'}</p>
                {operationalGeoSuggestion&&<div className="mt-2 border-t border-white/10 pt-2">
                  <p className="text-[9px] uppercase tracking-widest font-black text-[#d9b657]">Operativ GEO-match</p>
                  {operationalGeoSuggestion.zoneId?<p className="text-[10px] text-slate-400 mt-1">Sone: <span className="text-white font-bold">{operationalGeoSuggestion.zoneName}</span> · {Math.round(operationalGeoSuggestion.zoneConfidence*100)}%{zoneSelectionSource==='geo'?' · foreslått automatisk':''}</p>:operationalGeoSuggestion.zoneMethod==='ambiguous'?<p className="text-[10px] text-amber-200 mt-1">Flere soner passer omtrent like godt. Velg sone manuelt.</p>:<p className="text-[10px] text-slate-500 mt-1">Ingen sone kan foreslås sikkert her ennå.</p>}
                  {operationalGeoSuggestion.treeGroupId?<p className="text-[10px] text-slate-400 mt-1">Tregruppe: <span className="text-white font-bold">{operationalGeoSuggestion.treeGroupName}</span> · {Math.round(operationalGeoSuggestion.treeGroupConfidence*100)}%{treeGroupSelectionSource==='geo'?' · foreslått automatisk':''}</p>:operationalGeoSuggestion.treeGroupMethod==='ambiguous'?<p className="text-[10px] text-amber-200 mt-1">Flere tregrupper ligger for tett til sikker match.</p>:null}
                  <p className="text-[9px] text-slate-600 mt-2">Manuelt valg overstyrer alltid GEO-forslaget.</p>
                </div>}
              </div>}
              {previewImageUrls.length > 0 && <div className="grid grid-cols-3 gap-2 mt-3">{previewImageUrls.map((url, index) => <div key={url} className="relative"><img src={url} alt="Forhåndsvisning" className="h-24 w-full object-cover rounded-xl border border-white/10" /><button type="button" onClick={() => removeSelectedImage(index)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12} /></button></div>)}</div>}
            </div>

            <button onClick={handleSave} disabled={isSaving} className="w-full bg-[#d9b657] text-black font-bold py-5 rounded-[2rem] text-lg shadow-2xl hover:bg-[#f0cf70] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} {isSaving ? 'Lagrer...' : 'Lagre observasjon'}</button>
          </div>
        </div>
      )}
    </div>
  );
};

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{label}</span><span className="text-[11px] text-slate-600 block mb-2">{help}</span>{children}</label>;
}

export default FieldObservationsView;
