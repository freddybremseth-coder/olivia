
import React, { useState } from 'react';
import { highlightGlossaryTerms } from '../services/glossaryService';
import { Info, X } from 'lucide-react';

interface GlossaryTextProps {
  text: string;
  className?: string;
}

const GlossaryText: React.FC<GlossaryTextProps> = ({ text, className = "" }) => {
  const [activeDef, setActiveDef] = useState<{term: string, def: string} | null>(null);
  const parts = highlightGlossaryTerms(text);

  return (
    <span className={`relative ${className}`}>
      {parts.map((part, i) => (
        part.isTerm ? (
          <span key={i} className="relative inline-block group">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveDef({ term: part.text, def: part.definition! });
              }}
              className="text-green-400 font-bold border-b border-dashed border-green-500/50 hover:border-green-400 transition-all px-0.5 rounded-sm hover:bg-green-500/10 cursor-help"
            >
              {part.text}
            </button>
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        )
      ))}

      {activeDef && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px]"
          onClick={() => setActiveDef(null)}
        >
          <div 
            className="glass max-w-xs w-full p-6 rounded-2xl border border-green-500/30 shadow-2xl shadow-green-500/20 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2 text-green-400">
                <Info size={16} />
                <h4 className="font-bold text-sm uppercase tracking-widest">{activeDef.term}</h4>
              </div>
              <button onClick={() => setActiveDef(null)} className="text-slate-500 hover:text-white p-1">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed italic">
              {activeDef.def}
            </p>
          </div>
        </div>
      )}
    </span>
  );
};

export default GlossaryText;
