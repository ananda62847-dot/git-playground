import React from 'react';
import { tierFromPoints, tierProgress, legacyTierAlias, TIERS } from '@/lib/cadreTiers';

interface Props {
  points?: number;
  tier?: string;
  compact?: boolean;
  showProgress?: boolean;
  className?: string;
}

const CadreTierBadge: React.FC<Props> = ({ points = 0, tier, compact, showProgress, className = '' }) => {
  const def = tier
    ? (TIERS.find(t => t.id === legacyTierAlias(tier)) ?? tierFromPoints(points))
    : tierFromPoints(points);
  const { pctToNext, ptsToNext } = tierProgress(points);

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase ${compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}
        style={{ background: def.accent, color: def.fg }}
        title={`${def.label} · ${points} pts`}
      >
        <span aria-hidden>{def.icon}</span>
        {def.label}
        {!compact && <span className="font-mono opacity-90 normal-case">· {points}</span>}
      </span>
      {showProgress && def.next !== null && (
        <div className="w-full">
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pctToNext}%`, background: def.accent }} />
          </div>
          {ptsToNext !== null && (
            <div className="text-[10px] text-muted-foreground mt-0.5">{ptsToNext} pts to next tier</div>
          )}
        </div>
      )}
    </div>
  );
};

export default CadreTierBadge;
