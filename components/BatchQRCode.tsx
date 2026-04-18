import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, Download } from 'lucide-react';
import type { Batch } from '../types';

interface Props {
  batch: Batch;
  /**
   * Public base URL where the trace page lives. When batches move to Supabase
   * (next PR) we'll add a server-rendered /trace/:id page; until then the URL
   * encodes enough info that any phone scanner shows the batch id and recipe.
   */
  baseUrl?: string;
}

const BatchQRCode: React.FC<Props> = ({ batch, baseUrl }) => {
  const [copied, setCopied] = React.useState(false);

  const traceUrl = useMemo(() => {
    const origin =
      baseUrl ||
      (typeof window !== 'undefined' ? window.location.origin : 'https://olivia-murex.vercel.app');
    return `${origin}/?trace=${encodeURIComponent(batch.id)}`;
  }, [batch.id, baseUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(traceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore — older browsers */
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById(`batch-qr-${batch.id}`);
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${batch.id}-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 print:bg-white print:border-black/20">
      <div className="flex items-center justify-between mb-3 print:hidden">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
          <QrCode size={11} /> Sporbarhets-QR
        </p>
        <div className="flex gap-1">
          <button
            onClick={handleCopy}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Kopier sporbarhetslenke"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Last ned QR som SVG"
          >
            <Download size={12} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="bg-white p-2 rounded-lg flex-shrink-0">
          <QRCodeSVG
            id={`batch-qr-${batch.id}`}
            value={traceUrl}
            size={120}
            level="M"
            marginSize={0}
          />
        </div>
        <div className="flex-1 min-w-0 text-xs space-y-1">
          <p className="font-bold text-white print:text-black">Batch #{batch.id}</p>
          {batch.traceabilityCode && (
            <p className="text-slate-400 font-mono text-[10px] truncate">Kode: {batch.traceabilityCode}</p>
          )}
          <p className="text-slate-400 print:text-slate-700">{batch.weight} kg · {batch.harvestDate}</p>
          <p className="text-emerald-400 print:text-emerald-700 break-all text-[10px] mt-2">{traceUrl}</p>
        </div>
      </div>
    </div>
  );
};

export default BatchQRCode;
