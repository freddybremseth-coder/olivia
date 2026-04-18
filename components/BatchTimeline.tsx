/**
 * BatchTimeline – horisontal pipeline-tidslinje per batch.
 *
 * Viser hvert aktivt batch som én rad med 7 steg-pillen (PLUKKING → SALG).
 * Fullførte steg er grønne, gjeldende steg pulserer, kommende steg er grå.
 * Hver rad viser også dager i gjeldende steg, estimert ferdig-dato (fra recipe)
 * og en "Fremover"-knapp som kaller onAdvance(batchId).
 *
 * Ren UI-komponent: tar inn data via props, ingen Supabase-kall her.
 */

import React, { useMemo } from 'react';
import { ChevronRight, Clock, MapPin, ChefHat, CheckCircle2, Layers } from 'lucide-react';
import { Batch, Parcel, Recipe, TableOliveStage, Language } from '../types';
import { useTranslation } from '../services/i18nService';

const STAGES: TableOliveStage[] = ['PLUKKING', 'LAKE', 'SKYLLING', 'MARINERING', 'LAGRING', 'PAKKING', 'SALG'];

interface Props {
  batches: Batch[];
  parcels: Parcel[];
  recipes?: Recipe[];
  language: Language;
  onAdvance?: (batchId: string) => void | Promise<void>;
  onSelect?: (batch: Batch) => void;
  /** Antall rader som vises før "se alle"-link. Default = 6. */
  maxRows?: number;
}

const daysBetween = (a: string | undefined, b: Date): number => {
  if (!a) return 0;
  const start = new Date(a);
  if (Number.isNaN(start.getTime())) return 0;
  const ms = b.getTime() - start.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
};

const formatDate = (iso: string | Date): string => {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('no-NO', { day: '2-digit', month: 'short' });
};

const BatchTimeline: React.FC<Props> = ({
  batches, parcels, recipes = [], language, onAdvance, onSelect, maxRows = 6
}) => {
  const { t } = useTranslation(language);
  const today = useMemo(() => new Date(), []);

  const STAGE_LABELS: Record<TableOliveStage, string> = {
    PLUKKING:  t('picking'),
    LAKE:      t('brine'),
    SKYLLING:  t('rinsing'),
    MARINERING:t('marinating'),
    LAGRING:   t('storage'),
    PAKKING:   t('packaging'),
    SALG:      t('sale'),
  };

  const active = batches.filter(b => b.status === 'ACTIVE');
  const visible = active.slice(0, maxRows);
  const hidden = active.length - visible.length;

  const parcelName = (id: string) => parcels.find(p => p.id === id)?.name ?? '—';
  const recipeFor = (b: Batch) => recipes.find(r => r.id === b.recipeId);

  if (active.length === 0) {
    return (
      <div className="glass rounded-3xl p-8 border border-white/10 text-center">
        <Layers className="mx-auto mb-3 text-slate-600" size={32} />
        <p className="text-sm text-slate-400">Ingen aktive batch akkurat nå.</p>
        <p className="text-xs text-slate-600 mt-1">
          Opprett et batch fra <span className="text-green-400">Produksjon → Nytt batch</span> for å se det her.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers size={18} className="text-green-400" /> Pipeline-tidslinje
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {active.length} aktive batch · 7 steg fra plukking til salg
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {visible.map(batch => {
          const currentStage = (batch.currentStage ?? 'PLUKKING') as TableOliveStage;
          const currentIdx = STAGES.indexOf(currentStage);
          const isFinal = currentIdx === STAGES.length - 1;
          const recipe = recipeFor(batch);
          const stageStart = batch.stageStartDate ?? batch.harvestDate;
          const daysInStage = daysBetween(stageStart, today);
          const expectedReady = recipe?.readyAfterDays
            ? new Date(new Date(batch.harvestDate).getTime() + recipe.readyAfterDays * 86_400_000)
            : null;
          const overdue = expectedReady && today > expectedReady && currentStage !== 'SALG';

          return (
            <div
              key={batch.id}
              className="rounded-2xl border border-white/5 bg-black/20 p-4 hover:border-green-500/30 transition-colors"
            >
              {/* Top: meta + advance button */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <button
                  onClick={() => onSelect?.(batch)}
                  className="text-left group"
                  disabled={!onSelect}
                >
                  <p className="font-bold text-white text-sm group-hover:text-green-300 transition-colors">
                    {batch.id} · {batch.weight} kg
                    {batch.oliveType && (
                      <span className="ml-2 text-xs font-normal text-slate-400">{batch.oliveType}</span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {parcelName(batch.parcelId)}</span>
                    {batch.recipeName && (
                      <span className="flex items-center gap-1 text-green-400">
                        <ChefHat size={11} /> {batch.recipeName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {daysInStage} d i {STAGE_LABELS[currentStage].toLowerCase()}
                    </span>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  {expectedReady && (
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${
                      overdue ? 'bg-red-500/15 text-red-300' : 'bg-white/5 text-slate-400'
                    }`}>
                      Klar {formatDate(expectedReady)}
                    </span>
                  )}
                  {onAdvance && (
                    <button
                      onClick={() => onAdvance(batch.id)}
                      className="text-xs bg-green-500/15 hover:bg-green-500/25 text-green-300 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all whitespace-nowrap"
                    >
                      {isFinal
                        ? (<><CheckCircle2 size={13} /> Arkiver</>)
                        : (<>Til {STAGE_LABELS[STAGES[currentIdx + 1]]} <ChevronRight size={13} /></>)
                      }
                    </button>
                  )}
                </div>
              </div>

              {/* Step pills */}
              <div className="flex items-center gap-1.5">
                {STAGES.map((stage, i) => {
                  const isDone = i < currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <React.Fragment key={stage}>
                      <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                        <div
                          className={`h-2 w-full rounded-full transition-all ${
                            isDone
                              ? 'bg-green-500'
                              : isCurrent
                                ? 'bg-green-400 animate-pulse'
                                : 'bg-white/10'
                          }`}
                        />
                        <span className={`text-[9px] uppercase tracking-wider truncate ${
                          isCurrent ? 'text-green-300 font-bold' : isDone ? 'text-slate-300' : 'text-slate-600'
                        }`}>
                          {STAGE_LABELS[stage]}
                        </span>
                      </div>
                      {i < STAGES.length - 1 && (
                        <div className={`h-px w-1.5 ${i < currentIdx ? 'bg-green-500' : 'bg-white/10'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {hidden > 0 && (
        <p className="text-xs text-slate-500 text-center mt-4">
          + {hidden} flere aktive batch · åpne <span className="text-green-400">Produksjon</span> for full liste
        </p>
      )}
    </div>
  );
};

export default BatchTimeline;
