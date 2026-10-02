import React, { useMemo, useRef, useState } from 'react';
import { Camera, FileText, Loader2, Plus, ReceiptText, Save, ScanLine, Upload, X } from 'lucide-react';
import type { Parcel } from '../types';
import type { ExpenseCategory } from '../services/oliviaSchemaData';
import { analyzeExpenseDocument, saveExpenseWithDocument, type ExpenseDraft } from '../services/expenseCapture';

type Props = {
  parcels: Parcel[];
  onSaved: () => void | Promise<void>;
};

const categories: Array<{ value: ExpenseCategory; label: string }> = [
  { value: 'innhøsting', label: 'Innhøsting' },
  { value: 'beskjæring', label: 'Beskjæring / arbeid' },
  { value: 'nye_planter', label: 'Nye planter' },
  { value: 'trefelling', label: 'Trefelling / rydding' },
  { value: 'sprøyting', label: 'Sprøyting / behandling' },
  { value: 'vann', label: 'Vann / vanning' },
  { value: 'gjødsel', label: 'Gjødsel' },
  { value: 'forsikring', label: 'Forsikring' },
  { value: 'vedlikehold', label: 'Vedlikehold / maskiner' },
  { value: 'administrasjon', label: 'Administrasjon / regnskap' },
  { value: 'transport', label: 'Transport / drivstoff' },
  { value: 'emballasje', label: 'Emballasje / etiketter' },
  { value: 'annet', label: 'Annet' },
];

const inputClass = 'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white outline-none focus:border-amber-300/60';
const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500';

function emptyDraft(): ExpenseDraft {
  const date = new Date().toISOString().slice(0, 10);
  return {
    vendor: '',
    date,
    season: date.slice(0, 4),
    totalAmount: 0,
    currency: 'EUR',
    category: 'annet',
    description: '',
    scope: 'farm',
    invoiceNumber: '',
    taxAmount: 0,
    netAmount: 0,
    paymentMethod: '',
    workerName: '',
    workHours: 0,
    unitRate: 0,
    note: '',
    items: [],
  };
}

const ExpenseCapturePanel: React.FC<Props> = ({ parcels, onSaved }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'manual' | 'scan'>('scan');
  const [draft, setDraft] = useState<ExpenseDraft>(emptyDraft);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const isWork = useMemo(() => ['beskjæring','innhøsting','trefelling','sprøyting'].includes(draft.category), [draft.category]);

  const reset = () => {
    setDraft(emptyDraft());
    setFile(null);
    setPreviewUrl('');
    setStatus('');
    setScanning(false);
    setSaving(false);
  };

  const chooseFile = (next?: File | null) => {
    if (!next) return;
    const allowed = ['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'];
    if (!allowed.includes(next.type)) {
      setStatus('Bruk PDF, JPG, PNG, WEBP eller HEIC.');
      return;
    }
    setFile(next);
    setPreviewUrl(next.type.startsWith('image/') ? URL.createObjectURL(next) : '');
    setStatus('Bilag valgt. Trykk «Les bilag med AI».');
  };

  const scan = async () => {
    if (!file) return;
    setScanning(true);
    setStatus('Leser bilaget og foreslår bokføring...');
    try {
      const result = await analyzeExpenseDocument(file);
      setDraft(current => ({
        ...current,
        ...result,
        season: result.date.slice(0, 4),
        parcelId: undefined,
        scope: result.scope || 'farm',
      }));
      setStatus('AI-forslaget er klart. Kontroller feltene før du lagrer.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Kunne ikke analysere bilaget.');
    } finally {
      setScanning(false);
    }
  };

  const save = async () => {
    if (!draft.description.trim()) { setStatus('Legg inn en beskrivelse.'); return; }
    if (!draft.totalAmount || draft.totalAmount <= 0) { setStatus('Beløpet må være større enn 0.'); return; }
    setSaving(true);
    setStatus('Lagrer kostnad og bilag...');
    try {
      await saveExpenseWithDocument({
        ...draft,
        season: draft.date.slice(0, 4),
        scope: draft.parcelId ? 'parcel' : 'farm',
      }, file);
      setStatus('Kostnaden er bokført i Olivia.');
      await onSaved();
      setTimeout(() => { setOpen(false); reset(); }, 500);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Kunne ikke lagre kostnaden.');
    } finally {
      setSaving(false);
    }
  };

  const openDialog = (nextMode: 'manual' | 'scan') => {
    reset();
    setMode(nextMode);
    setOpen(true);
  };

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => openDialog('manual')} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white hover:bg-white/10">
          <Plus size={17} /> Ny kostnad
        </button>
        <button onClick={() => openDialog('scan')} className="inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-bold text-black hover:bg-amber-200">
          <ScanLine size={17} /> Scan kvittering / faktura
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md md:items-center md:p-4">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/15 bg-[#0b0d0c] p-5 shadow-2xl md:max-w-5xl md:rounded-[2rem] md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-300">Doña Anna · Olivia Økonomi</p>
                <h3 className="mt-1 text-2xl font-bold text-white">{mode === 'scan' ? 'Scan og bokfør bilag' : 'Registrer ny kostnad'}</h3>
                <p className="mt-2 text-sm text-slate-400">Bilaget lagres privat. AI foreslår bokføring, men ingenting lagres før du godkjenner.</p>
              </div>
              <button onClick={() => { setOpen(false); reset(); }} className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={22} /></button>
            </div>

            {mode === 'scan' && (
              <div className="mt-6 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={e => chooseFile(e.target.files?.[0])} />
                  <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => chooseFile(e.target.files?.[0])} />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <button onClick={() => cameraRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/15"><Camera size={17} /> Ta bilde</button>
                    <button onClick={() => fileRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"><Upload size={17} /> Last opp bilde/PDF</button>
                  </div>
                  <div className="mt-4 flex min-h-52 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/10 bg-black/20">
                    {previewUrl ? <img src={previewUrl} alt="Bilag" className="max-h-72 w-full object-contain" /> : file ? <div className="text-center text-slate-400"><FileText size={40} className="mx-auto mb-3" /><p className="font-bold text-white">{file.name}</p><p className="mt-1 text-xs">{Math.round(file.size / 1024)} KB</p></div> : <div className="text-center text-sm text-slate-500"><ReceiptText size={42} className="mx-auto mb-3" />Ingen fil valgt</div>}
                  </div>
                  <button onClick={scan} disabled={!file || scanning} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-bold text-black disabled:opacity-50">
                    {scanning ? <Loader2 size={17} className="animate-spin" /> : <ScanLine size={17} />} Les bilag med AI
                  </button>
                </div>
                <ExpenseForm draft={draft} setDraft={setDraft} parcels={parcels} isWork={isWork} />
              </div>
            )}

            {mode === 'manual' && <div className="mt-6"><ExpenseForm draft={draft} setDraft={setDraft} parcels={parcels} isWork={isWork} /></div>}

            {status && <div className="mt-5 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">{status}</div>}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => { setOpen(false); reset(); }} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-slate-300 hover:bg-white/5">Avbryt</button>
              <button onClick={save} disabled={saving || scanning} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-400 px-6 py-3 text-sm font-bold text-black disabled:opacity-50">
                {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />} Godkjenn og bokfør
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function ExpenseForm({ draft, setDraft, parcels, isWork }: {
  draft: ExpenseDraft;
  setDraft: React.Dispatch<React.SetStateAction<ExpenseDraft>>;
  parcels: Parcel[];
  isWork: boolean;
}) {
  const update = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <h4 className="font-bold text-white">Kontroller bokføringen</h4>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label><span className={labelClass}>Dato</span><input type="date" className={inputClass} value={draft.date} onChange={e => update('date', e.target.value)} /></label>
        <label><span className={labelClass}>Leverandør / person</span><input className={inputClass} value={draft.vendor} onChange={e => update('vendor', e.target.value)} /></label>
        <label><span className={labelClass}>Kategori</span><select className={inputClass} value={draft.category} onChange={e => update('category', e.target.value as ExpenseCategory)}>{categories.map(c => <option key={c.value} value={c.value} className="bg-slate-900">{c.label}</option>)}</select></label>
        <label><span className={labelClass}>Parsell</span><select className={inputClass} value={draft.parcelId || ''} onChange={e => update('parcelId', e.target.value || undefined)}><option value="" className="bg-slate-900">Hele gården</option>{parcels.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}</select></label>
        <label><span className={labelClass}>Beløp</span><input type="number" step="0.01" className={inputClass} value={draft.totalAmount || ''} onChange={e => update('totalAmount', Number(e.target.value))} /></label>
        <label><span className={labelClass}>Valuta</span><select className={inputClass} value={draft.currency} onChange={e => update('currency', e.target.value)}><option className="bg-slate-900">EUR</option><option className="bg-slate-900">NOK</option><option className="bg-slate-900">USD</option></select></label>
        <label><span className={labelClass}>IVA / MVA</span><input type="number" step="0.01" className={inputClass} value={draft.taxAmount || ''} onChange={e => update('taxAmount', Number(e.target.value))} /></label>
        <label><span className={labelClass}>Netto</span><input type="number" step="0.01" className={inputClass} value={draft.netAmount || ''} onChange={e => update('netAmount', Number(e.target.value))} /></label>
        <label><span className={labelClass}>Faktura-/kvitteringsnr.</span><input className={inputClass} value={draft.invoiceNumber || ''} onChange={e => update('invoiceNumber', e.target.value)} /></label>
        <label><span className={labelClass}>Betalingsmåte</span><input className={inputClass} value={draft.paymentMethod || ''} onChange={e => update('paymentMethod', e.target.value)} placeholder="Kort, bank, kontant..." /></label>
      </div>

      {isWork && <div className="mt-4 grid gap-4 rounded-2xl border border-green-400/15 bg-green-400/5 p-4 md:grid-cols-3">
        <label><span className={labelClass}>Arbeider / firma</span><input className={inputClass} value={draft.workerName || ''} onChange={e => update('workerName', e.target.value)} /></label>
        <label><span className={labelClass}>Timer</span><input type="number" step="0.25" className={inputClass} value={draft.workHours || ''} onChange={e => update('workHours', Number(e.target.value))} /></label>
        <label><span className={labelClass}>Sats</span><input type="number" step="0.01" className={inputClass} value={draft.unitRate || ''} onChange={e => update('unitRate', Number(e.target.value))} /></label>
      </div>}

      <div className="mt-4 grid gap-4">
        <label><span className={labelClass}>Beskrivelse</span><input className={inputClass} value={draft.description} onChange={e => update('description', e.target.value)} placeholder="Hva ble kjøpt eller hvilket arbeid ble utført?" /></label>
        <label><span className={labelClass}>Notat</span><textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white outline-none focus:border-amber-300/60" value={draft.note || ''} onChange={e => update('note', e.target.value)} /></label>
      </div>

      {draft.items && draft.items.length > 0 && <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Leste varelinjer</p><div className="mt-3 space-y-2">{draft.items.slice(0, 12).map((item, index) => <div key={index} className="flex justify-between gap-4 text-sm"><span className="text-slate-300">{item.quantity || 1} × {item.name}</span><span className="font-semibold text-white">{item.amount ? `€${Number(item.amount).toFixed(2)}` : ''}</span></div>)}</div></div>}
    </div>
  );
}

export default ExpenseCapturePanel;
