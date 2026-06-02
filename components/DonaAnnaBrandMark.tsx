import React from 'react';
import { Leaf } from 'lucide-react';
import { DONA_ANNA_BRAND } from '../services/donaAnnaBrand';

type DonaAnnaBrandMarkProps = {
  variant?: 'logo' | 'symbol' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
};

const sizeMap = {
  sm: { box: 'w-10 h-10', text: 'text-lg', sub: 'text-[8px]' },
  md: { box: 'w-14 h-14', text: 'text-2xl', sub: 'text-[10px]' },
  lg: { box: 'w-20 h-20', text: 'text-4xl', sub: 'text-xs' },
};

const DonaAnnaBrandMark: React.FC<DonaAnnaBrandMarkProps> = ({ variant = 'compact', size = 'md', showText = true, className = '' }) => {
  const s = sizeMap[size];
  const src = variant === 'logo' ? DONA_ANNA_BRAND.logoPath : DONA_ANNA_BRAND.symbolPath;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${s.box} rounded-2xl bg-[#070b08] border border-[#d9b657]/30 flex items-center justify-center overflow-hidden shadow-lg shadow-black/20`}>
        <img
          src={src}
          alt={variant === 'logo' ? `${DONA_ANNA_BRAND.name} logo` : `${DONA_ANNA_BRAND.name} symbol`}
          className="w-full h-full object-contain p-1"
          onError={(event) => {
            const target = event.currentTarget;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className="hidden w-full h-full items-center justify-center text-[#d9b657]">
          <Leaf size={size === 'lg' ? 34 : size === 'md' ? 24 : 18} />
        </div>
      </div>
      {showText && (
        <div>
          <p className={`${s.text} font-serif tracking-[0.16em] text-white leading-none`}>{DONA_ANNA_BRAND.name.toUpperCase()}</p>
          <p className={`${s.sub} text-[#d9b657] tracking-[0.45em] uppercase mt-2`}>{DONA_ANNA_BRAND.location}</p>
        </div>
      )}
    </div>
  );
};

export default DonaAnnaBrandMark;
