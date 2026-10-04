import React from 'react';
import { Camera, CheckCircle2, Circle, Image as ImageIcon } from 'lucide-react';

type Props={
  imageCount:number;
  mode:'field'|'pruning';
};

const fieldSteps=[
  ['Heltre','Ta hele treet fra 4–6 meters avstand.'],
  ['Stamme & hovedgreiner','Vis stammebasis og hvor hovedgreinene deler seg.'],
  ['Bladverk','Nærbilde av bladoverside og underside, gjerne flere blader.'],
  ['Frukt / skudd','Vis oliven, blomster eller årsskudd når de finnes.'],
  ['Stein / målestokk','Hvis mulig: stein/endokarp eller frukt/blader mot linjal.'],
];

const pruningSteps=[
  ['Heltre forfra','Hele kronen og bakken rundt treet.'],
  ['Heltre fra siden','Andre vinkel for dybde og kronebalanse.'],
  ['Stamme & hovedgreiner','Vis greininnfesting og tidligere store snitt.'],
  ['Innside av kronen','Vis vannskudd, kryssgreiner og lysforhold.'],
  ['Produktiv grein','Bladverk/fruktved som bør bevares.'],
];

export default function OlivePhotoProtocol({imageCount,mode}:Props){
  const steps=mode==='pruning'?pruningSteps:fieldSteps;
  const ready=Math.min(imageCount,steps.length);
  return <div className="rounded-2xl border border-[#d9b657]/20 bg-[#d9b657]/[0.04] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-black text-[#d9b657] flex items-center gap-2"><Camera size={13}/> Foto-protokoll</p>
        <p className="text-sm font-bold text-white mt-1">{mode==='pruning'?'Ta bildene i denne rekkefølgen før beskjæring':'Bedre bilder gir bedre sort- og helsevurdering'}</p>
      </div>
      <div className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-black text-slate-300">{ready}/{steps.length}</div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
      {steps.map(([title,text],index)=>{
        const done=imageCount>index;
        return <div key={title} className={'rounded-xl border p-3 '+(done?'border-green-500/20 bg-green-500/[0.05]':'border-white/10 bg-black/20')}>
          <div className="flex gap-2">
            {done?<CheckCircle2 size={15} className="text-green-400 mt-0.5 flex-shrink-0"/>:<Circle size={15} className="text-slate-600 mt-0.5 flex-shrink-0"/>}
            <div><p className="text-xs font-black text-white">{index+1}. {title}</p><p className="text-[10px] text-slate-500 mt-1">{text}</p></div>
          </div>
        </div>;
      })}
    </div>
    <p className="text-[10px] text-slate-600 mt-3 flex items-center gap-1"><ImageIcon size={11}/> Olivia verifiserer hva som faktisk er synlig; rekkefølgen er veiledning, ikke fasit.</p>
  </div>;
}
