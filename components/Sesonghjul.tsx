/**
 * Sesonghjul – sirkulært årshjul som viser olivenårets faste aktiviteter
 * måned for måned, samt brukerens egne oppgaver pinned til riktig måned
 * basert på Task.dueDate.
 *
 * Klikk på en måned for å vise detaljer (faste aktiviteter + egne oppgaver)
 * i panelet under hjulet. Sentrert i hjulet vises gjeldende måned.
 *
 * Ren SVG, ingen eksterne avhengigheter.
 */

import React, { useMemo, useState } from 'react';
import { Task, Language } from '../types';
import { useTranslation } from '../services/i18nService';
import { CalendarDays, CircleDot, AlertTriangle } from 'lucide-react';

interface Props {
  tasks: Task[];
  language: Language;
  size?: number;
  /** Lat/lon for the user's farm. Used to pick a region-specific harvest
   *  calendar. Defaults to Biar (inland Alicante) which is the app's current
   *  primary user. Andalucía and northern regions get their own calendars. */
  lat?: number;
  lon?: number;
  /** Optional explicit region label for the panel header (e.g. "Biar, Spain"). */
  locationName?: string;
}

interface MonthInfo {
  index: number;          // 0–11
  label: string;          // 'Jan'
  full: string;           // 'Januar'
  activities: string[];   // faste oliven-aktiviteter
  color: string;          // tailwind text class for accent
  bg: string;             // hex for SVG fill
}

type RegionId = 'alicante_inland' | 'andalucia' | 'italy_north' | 'generic_med';

interface RegionProfile {
  id: RegionId;
  label: string;
  /** Months that count as "main harvest" — used for the panel subtitle. */
  harvestMonths: number[];
  /** Activities indexed by month (0–11). */
  months: string[][];
}

/**
 * Region detection. Olives have wildly different harvest windows:
 *  - Inland Alicante / Murcia (Biar etc.):  late Nov → end of Jan
 *  - Andalucía (Jaén, Córdoba):              late Oct → mid Dec
 *  - Italy (Toscana, Puglia):                Oct → mid Dec
 *
 * The app's primary user farms in Biar (38.6°N, -0.77°E) so that's the
 * default when lat/lon are missing.
 */
function detectRegion(lat?: number, lon?: number): RegionId {
  if (lat == null || lon == null) return 'alicante_inland';
  // Andalucía: roughly south-west Spain
  if (lat < 38.3 && lon < -2.5) return 'andalucia';
  // Italy: east of ~6°E and north of ~40°N
  if (lon > 6 && lat > 40) return 'italy_north';
  // Levante / Alicante / Murcia / inland Spain
  if (lat >= 37.5 && lat <= 40 && lon >= -2 && lon <= 1) return 'alicante_inland';
  return 'generic_med';
}

const MONTH_META: Pick<MonthInfo, 'label' | 'full' | 'color' | 'bg'>[] = [
  { label: 'Jan', full: 'Januar',    color: 'text-sky-300',     bg: '#0ea5e9' },
  { label: 'Feb', full: 'Februar',   color: 'text-sky-200',     bg: '#38bdf8' },
  { label: 'Mar', full: 'Mars',      color: 'text-emerald-300', bg: '#10b981' },
  { label: 'Apr', full: 'April',     color: 'text-emerald-300', bg: '#22c55e' },
  { label: 'Mai', full: 'Mai',       color: 'text-lime-300',    bg: '#84cc16' },
  { label: 'Jun', full: 'Juni',      color: 'text-yellow-300',  bg: '#eab308' },
  { label: 'Jul', full: 'Juli',      color: 'text-amber-300',   bg: '#f59e0b' },
  { label: 'Aug', full: 'August',    color: 'text-orange-300',  bg: '#f97316' },
  { label: 'Sep', full: 'September', color: 'text-orange-400',  bg: '#fb923c' },
  { label: 'Okt', full: 'Oktober',   color: 'text-rose-300',    bg: '#ef4444' },
  { label: 'Nov', full: 'November',  color: 'text-rose-400',    bg: '#dc2626' },
  { label: 'Des', full: 'Desember',  color: 'text-purple-300',  bg: '#a855f7' },
];

const REGIONS: Record<RegionId, RegionProfile> = {
  alicante_inland: {
    id: 'alicante_inland',
    label: 'Inland Alicante / Murcia',
    harvestMonths: [10, 11, 0],
    months: [
      // Jan
      ['HOVEDINNHØSTING avsluttes', 'Vinterbeskjæring starter', 'Olje-tapping'],
      // Feb
      ['Vinterbeskjæring fortsetter', 'Verktøy-vedlikehold', 'Planlegging av sesong'],
      // Mar
      ['Avslutt beskjæring', 'Første gjødsling', 'Plantingsvindu'],
      // Apr
      ['Knoppdannelse', 'Sjekk vanning', 'Forebygg flueangrep'],
      // Mai
      ['Blomstring', 'Pollineringskontroll', 'Ugrasbekjempelse'],
      // Jun
      ['Frukt-set', 'Vanning ramper opp', 'Lett sommerbeskjæring'],
      // Jul
      ['Vekstfase', 'Olivenflue-feller settes ut', 'Daglig vanning'],
      // Aug
      ['Maks vannbehov', 'Sjekk for skadedyr', 'Forbered innhøstings­utstyr'],
      // Sep
      ['Forbered batch-tønner', 'Salt-innkjøp', 'Inspeksjon og siste gjødsling'],
      // Okt
      ['Forbered innhøsting', 'Lake-prosess klargjøres', 'Test-modning av frukten'],
      // Nov
      ['HOVEDINNHØSTING starter (slutten av nov)', 'Bordoliven til lake', 'Press til olje'],
      // Des
      ['HOVEDINNHØSTING pågår', 'Olje-tapping', 'Skattepapirer (Spania)'],
    ],
  },
  andalucia: {
    id: 'andalucia',
    label: 'Andalucía',
    harvestMonths: [9, 10, 11],
    months: [
      ['Vinterbeskjæring', 'Verktøy-vedlikehold', 'Planlegging av sesong'],
      ['Beskjæring av eldre trær', 'Kalking', 'Bestilling av planter'],
      ['Avslutt beskjæring', 'Første gjødsling', 'Plantingsvindu'],
      ['Knoppdannelse', 'Sjekk vanning', 'Forebygg flueangrep'],
      ['Blomstring', 'Pollineringskontroll', 'Ugrasbekjempelse'],
      ['Frukt-set', 'Vanning ramper opp', 'Lett sommerbeskjæring'],
      ['Vekstfase', 'Olivenflue-feller settes ut', 'Daglig vanning'],
      ['Maks vannbehov', 'Sjekk for skadedyr', 'Forbered innhøstings­utstyr'],
      ['Tidlig innhøsting (grønne oliven)', 'Forbered batch-tønner', 'Salt-innkjøp'],
      ['HOVEDINNHØSTING starter', 'Lake-prosess for bordoliven', 'Press til olje'],
      ['Hovedinnhøsting fortsetter', 'Olje-tapping', 'Skattepapirer (Spania)'],
      ['Sluttføring av innhøsting', 'Salgskampanjer', 'Start vinterbeskjæring'],
    ],
  },
  italy_north: {
    id: 'italy_north',
    label: 'Italia (Toscana / nord)',
    harvestMonths: [9, 10],
    months: [
      ['Vinterbeskjæring', 'Verktøy-vedlikehold', 'Planlegging av sesong'],
      ['Beskjæring av eldre trær', 'Kalking', 'Bestilling av planter'],
      ['Avslutt beskjæring', 'Første gjødsling', 'Plantingsvindu'],
      ['Knoppdannelse', 'Sjekk vanning', 'Forebygg flueangrep'],
      ['Blomstring (sent)', 'Pollineringskontroll', 'Ugrasbekjempelse'],
      ['Frukt-set', 'Vanning starter', 'Lett sommerbeskjæring'],
      ['Vekstfase', 'Olivenflue-feller', 'Vanning'],
      ['Vekstfase fortsetter', 'Sjekk for skadedyr', 'Forbered innhøstings­utstyr'],
      ['Tidlig innhøsting starter', 'Forbered tønner', 'Salt-innkjøp'],
      ['HOVEDINNHØSTING (Toscana)', 'Press til ekstra virgin olje', 'Lake-prosess'],
      ['Sluttføring av innhøsting', 'Olje-tapping', 'Salgskampanjer'],
      ['Avslutning av sesong', 'Vinterbeskjæring starter', 'Skatt og papirarbeid'],
    ],
  },
  generic_med: {
    id: 'generic_med',
    label: 'Middelhavet (generisk)',
    harvestMonths: [9, 10, 11],
    months: [
      ['Vinterbeskjæring', 'Verktøy-vedlikehold', 'Planlegging av sesong'],
      ['Beskjæring av eldre trær', 'Kalking', 'Bestilling av planter'],
      ['Avslutt beskjæring', 'Første gjødsling', 'Plantingsvindu'],
      ['Knoppdannelse', 'Sjekk vanning', 'Forebygg flueangrep'],
      ['Blomstring', 'Pollineringskontroll', 'Ugrasbekjempelse'],
      ['Frukt-set', 'Vanning ramper opp', 'Lett sommerbeskjæring'],
      ['Vekstfase', 'Olivenflue-feller settes ut', 'Daglig vanning'],
      ['Maks vannbehov', 'Sjekk for skadedyr', 'Forbered innhøstings­utstyr'],
      ['Tidlig innhøsting', 'Forbered batch-tønner', 'Salt-innkjøp'],
      ['HOVEDINNHØSTING', 'Lake-prosess for bordoliven', 'Press til olje'],
      ['Sluttføring av innhøsting', 'Olje-tapping', 'Salgskampanjer'],
      ['Avslutning av sesong', 'Vinterbeskjæring starter', 'Skatt og papirarbeid'],
    ],
  },
};

const HARVEST_LABEL: Record<RegionId, string> = {
  alicante_inland: 'Hovedinnhøsting: slutten av nov → januar',
  andalucia:       'Hovedinnhøsting: oktober → desember',
  italy_north:     'Hovedinnhøsting: oktober → november',
  generic_med:     'Hovedinnhøsting: oktober → desember',
};

function buildMonths(region: RegionProfile): MonthInfo[] {
  return MONTH_META.map((meta, i) => ({ index: i, ...meta, activities: region.months[i] }));
}

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const wedgePath = (cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number) => {
  const p1 = polar(cx, cy, rOuter, startDeg);
  const p2 = polar(cx, cy, rOuter, endDeg);
  const p3 = polar(cx, cy, rInner, endDeg);
  const p4 = polar(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
};

const Sesonghjul: React.FC<Props> = ({ tasks, language, size = 320, lat, lon, locationName }) => {
  // Future: i18n the activity strings. For now Norwegian-only matches the rest of the app.
  void useTranslation(language);

  const today = useMemo(() => new Date(), []);
  const currentMonth = today.getMonth();
  const [selected, setSelected] = useState<number>(currentMonth);

  // Region-aware activity calendar. Recomputed only when lat/lon change.
  const region = useMemo(() => REGIONS[detectRegion(lat, lon)], [lat, lon]);
  const MONTHS_NO = useMemo(() => buildMonths(region), [region]);
  const harvestNote = HARVEST_LABEL[region.id];

  // Group tasks by month based on dueDate
  const tasksByMonth = useMemo(() => {
    const m: Record<number, Task[]> = {};
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const d = new Date(task.dueDate);
      if (Number.isNaN(d.getTime())) continue;
      const k = d.getMonth();
      (m[k] ??= []).push(task);
    }
    return m;
  }, [tasks]);

  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 4;
  const rInner = size * 0.32;
  const wedgeDeg = 360 / 12;

  const sel = MONTHS_NO[selected];
  const selectedTasks = tasksByMonth[selected] ?? [];

  const totalOpenTasks = tasks.filter(t => t.status !== 'DONE' && t.dueDate).length;
  const overdueTasks = tasks.filter(t => {
    if (t.status === 'DONE' || !t.dueDate) return false;
    return new Date(t.dueDate) < today;
  }).length;

  return (
    <div className="glass rounded-3xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarDays size={18} className="text-green-400" /> Sesonghjul
          </h3>
          <p className="text-[11px] text-green-300/80 mt-0.5">
            {locationName ? `${locationName} · ` : ''}{harvestNote}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {totalOpenTasks} åpne oppgaver
            {overdueTasks > 0 && (
              <span className="ml-2 text-red-400">· {overdueTasks} forfalt</span>
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="select-none"
          role="img"
          aria-label="Sesonghjul med 12 måneder"
        >
          {MONTHS_NO.map(month => {
            const start = month.index * wedgeDeg;
            const end = start + wedgeDeg;
            const isCurrent = month.index === currentMonth;
            const isSelected = month.index === selected;
            const isHarvest = region.harvestMonths.includes(month.index);
            const taskCount = (tasksByMonth[month.index] ?? []).length;
            const labelPos = polar(cx, cy, (rOuter + rInner) / 2, start + wedgeDeg / 2);
            const dotPos = polar(cx, cy, rOuter - 14, start + wedgeDeg / 2);
            // Harvest months get a stronger fill so the user can see their
            // harvest window at a glance regardless of which month is selected.
            const baseOpacity = isSelected ? 0.55 : isCurrent ? 0.32 : isHarvest ? 0.28 : 0.14;
            const strokeColor = isSelected
              ? '#22c55e'
              : isHarvest
                ? 'rgba(251, 146, 60, 0.55)'
                : 'rgba(255,255,255,0.08)';

            return (
              <g key={month.index} onClick={() => setSelected(month.index)} style={{ cursor: 'pointer' }}>
                <path
                  d={wedgePath(cx, cy, rOuter, rInner, start, end)}
                  fill={month.bg}
                  fillOpacity={baseOpacity}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 2 : isHarvest ? 1.5 : 1}
                  className="transition-all"
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontWeight={isCurrent || isSelected || isHarvest ? 700 : 500}
                  fill={isSelected ? '#fff' : isCurrent ? '#fff' : isHarvest ? '#fef3c7' : 'rgba(226,232,240,0.85)'}
                  style={{ pointerEvents: 'none' }}
                >
                  {month.label}
                </text>
                {taskCount > 0 && (
                  <g style={{ pointerEvents: 'none' }}>
                    <circle cx={dotPos.x} cy={dotPos.y} r={7} fill="#0f172a" stroke="#22c55e" strokeWidth={1.5} />
                    <text
                      x={dotPos.x}
                      y={dotPos.y + 0.5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={9}
                      fontWeight={700}
                      fill="#22c55e"
                    >
                      {taskCount}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Center text */}
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            fontSize={11}
            fill="rgba(148,163,184,0.8)"
            style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}
          >
            Nå
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fontSize={20}
            fontWeight={700}
            fill="#fff"
          >
            {MONTHS_NO[currentMonth].full}
          </text>
        </svg>

        {/* Selected month details */}
        <div className="w-full mt-5 rounded-2xl bg-black/30 border border-white/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className={`text-sm font-bold ${sel.color}`}>{sel.full}</h4>
            {selected === currentMonth && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/15 text-green-300">
                Denne måneden
              </span>
            )}
          </div>

          <ul className="space-y-1.5 mb-4">
            {sel.activities.map(a => (
              <li key={a} className="flex items-start gap-2 text-xs text-slate-300">
                <CircleDot size={11} className={`${sel.color} mt-0.5 flex-shrink-0`} />
                <span>{a}</span>
              </li>
            ))}
          </ul>

          {selectedTasks.length > 0 ? (
            <div className="border-t border-white/5 pt-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                Mine oppgaver ({selectedTasks.length})
              </p>
              <ul className="space-y-1.5">
                {selectedTasks.slice(0, 4).map(task => {
                  const overdue = task.dueDate && new Date(task.dueDate) < today && task.status !== 'DONE';
                  return (
                    <li key={task.id} className="flex items-center gap-2 text-xs">
                      {overdue ? (
                        <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />
                      ) : (
                        <CircleDot size={11} className="text-green-400 flex-shrink-0" />
                      )}
                      <span className={`flex-1 truncate ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                        {task.title}
                      </span>
                      <span className="text-[10px] text-slate-500 flex-shrink-0">
                        {task.dueDate?.slice(8, 10)}.{task.dueDate?.slice(5, 7)}
                      </span>
                    </li>
                  );
                })}
                {selectedTasks.length > 4 && (
                  <li className="text-[10px] text-slate-500 italic">
                    + {selectedTasks.length - 4} flere oppgaver
                  </li>
                )}
              </ul>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic border-t border-white/5 pt-3">
              Ingen egne oppgaver pinned til {sel.full.toLowerCase()}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sesonghjul;
