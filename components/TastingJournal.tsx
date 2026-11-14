import React, { useState } from 'react';

type Kind = 'oil' | 'wine';
const dimensions: Record<Kind, { key: string; label: string; help: string }[]> = {
  oil: [
    { key: 'fruitiness', label: 'Fruktighet', help: 'Opplevd intensitet av frisk olivenfrukt' },
    { key: 'bitterness', label: 'Bitterhet', help: 'Hvor tydelig bitterheten kjennes' },
    { key: 'pungency', label: 'Skarphet', help: 'Prikkende eller pepperaktig følelse i halsen' },
    { key: 'harmony', label: 'Harmoni', help: 'Din subjektive vurdering av helheten' },
  ],
  wine: [
    { key: 'acidity', label: 'Syre', help: 'Opplevd friskhet i munnen' },
    { key: 'tannin', label: 'Tannin', help: 'Tørrende, snerpende munnfølelse (0 hvis ikke relevant)' },
    { key: 'body', label: 'Fylde', help: 'Opplevd kropp og tyngde' },
    { key: 'balance', label: 'Balanse', help: 'Din subjektive vurdering av helheten' },
  ],
};

const emptyScores = () => ({} as Record<string, number>);
export const TastingJournal: React.FC = () => {
  const [kind, setKind] = useState<Kind>('oil');
  const [scores, setScores] = useState<Record<string, number>>(emptyScores);
  const [aromas, setAromas] = useState('');
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);

  const changeKind = (next: Kind) => {
    setKind(next);
    setScores(emptyScores());
    setAromas('');
    setNotes('');
    setCopied(false);
  };
  const report = [
    kind === 'oil' ? 'Smakejournal · olivenolje' : 'Smakejournal · vin',
    ...dimensions[kind].map(item => `${item.label}: ${scores[item.key] ?? 'ikke vurdert'}/5`),
    `Aromaer: ${aromas || 'ikke angitt'}`,
    `Egne observasjoner: ${notes || 'ikke angitt'}`,
    'Egen smakeøvelse, ikke offisiell klassifisering eller laboratorieanalyse.',
  ].join('\n');

  return (
    <div className="mt-10 rounded-sm border border-[#bfae8b] bg-white p-5 md:p-8" data-testid="public-tasting-journal">
      <h3 className="font-serif text-3xl text-[#241d14]">Din smakejournal</h3>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-black/70">
        Tren sansene med én prøve om gangen. Vurder intensitet og egne opplevelser; en høy verdi er
        ikke automatisk bedre. Journalen lagres ikke på server og krever ingen innlogging.
      </p>
      <div className="mt-5 flex flex-wrap gap-3" role="group" aria-label="Velg smakejournal">
        <button type="button" aria-pressed={kind === 'oil'} onClick={() => changeKind('oil')}
          className={`min-h-11 border px-4 py-2 text-sm font-semibold ${kind === 'oil' ? 'bg-[#29281f] text-white' : 'border-[#bfae8b] text-[#29281f]'}`}>
          Olivenolje
        </button>
        <button type="button" aria-pressed={kind === 'wine'} onClick={() => changeKind('wine')}
          className={`min-h-11 border px-4 py-2 text-sm font-semibold ${kind === 'wine' ? 'bg-[#29281f] text-white' : 'border-[#bfae8b] text-[#29281f]'}`}>
          Vin
        </button>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {dimensions[kind].map(item => (
          <fieldset key={item.key} className="border border-[#e0d6c4] p-4">
            <legend className="px-1 text-sm font-bold">{item.label}</legend>
            <p className="mb-3 text-xs text-black/65">{item.help}</p>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5].map(value => (
                <label key={value} className={`cursor-pointer border px-3 py-2 text-sm ${scores[item.key] === value ? 'bg-[#29281f] text-white' : 'border-[#d5c9b1]'}`}>
                  <input type="radio" className="sr-only" name={`tasting-${item.key}`} value={value}
                    checked={scores[item.key] === value}
                    onChange={() => { setScores(previous => ({ ...previous, [item.key]: value })); setCopied(false); }} />
                  {value}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <label className="mt-5 block text-sm font-semibold" htmlFor="journal-aromas">Aromaer du kjenner</label>
      <input id="journal-aromas" maxLength={200} value={aromas} onChange={event => { setAromas(event.target.value); setCopied(false); }}
        placeholder={kind === 'oil' ? 'F.eks. grønt gress, mandel, tomatblad' : 'F.eks. sitrus, røde bær, krydder'}
        className="mt-2 min-h-11 w-full border border-[#d5c9b1] p-3 text-black" />
      <label className="mt-5 block text-sm font-semibold" htmlFor="journal-notes">Dine observasjoner</label>
      <textarea id="journal-notes" maxLength={1000} rows={3} value={notes}
        onChange={event => { setNotes(event.target.value); setCopied(false); }}
        placeholder="Beskriv ettersmak, utvikling og hva du selv liker."
        className="mt-2 w-full border border-[#d5c9b1] p-3 text-black" />
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            void navigator.clipboard.writeText(report).then(() => setCopied(true)).catch(() => setCopied(false));
          }
        }} className="min-h-11 bg-[#29281f] px-5 py-3 text-sm font-bold text-white">
          Kopier vurderingen
        </button>
        <button type="button" onClick={() => { setScores(emptyScores()); setAromas(''); setNotes(''); setCopied(false); }}
          className="min-h-11 border border-[#bfae8b] px-5 py-3 text-sm font-bold">Ny smaking</button>
        <span role="status" aria-live="polite" className="self-center text-sm">{copied ? 'Kopiert' : ''}</span>
      </div>
      <p className="mt-4 text-xs leading-5 text-black/60">
        Hjemmesmaking er ikke en offisiell sensorisk paneltest. Journalen brukes til læring, ikke til å
        erklære olivenolje extra virgin eller vin kvalitetsklassifisert.
      </p>
    </div>
  );
};
