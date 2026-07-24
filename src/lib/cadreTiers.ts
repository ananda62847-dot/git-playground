// Professional 6-tier cadre rank system
// Aligns with the SQL public.compute_tier() function.

export type CadreTier = 'recruit' | 'volunteer' | 'organizer' | 'captain' | 'leader' | 'commander';

export interface TierDef {
  id: CadreTier;
  label: string;
  min: number;
  next: number | null;
  /** HSL accent for badge bg / ring */
  accent: string;
  fg: string;
  icon: string;
}

export const TIERS: TierDef[] = [
  { id: 'recruit',   label: 'Recruit',   min: 0,    next: 100,  accent: 'hsl(220 9% 46%)',  fg: 'hsl(0 0% 100%)', icon: '◦' },
  { id: 'volunteer', label: 'Volunteer', min: 100,  next: 300,  accent: 'hsl(173 58% 39%)', fg: 'hsl(0 0% 100%)', icon: '◇' },
  { id: 'organizer', label: 'Organizer', min: 300,  next: 700,  accent: 'hsl(217 91% 50%)', fg: 'hsl(0 0% 100%)', icon: '◆' },
  { id: 'captain',   label: 'Captain',   min: 700,  next: 1500, accent: 'hsl(262 73% 52%)', fg: 'hsl(0 0% 100%)', icon: '★' },
  { id: 'leader',    label: 'Leader',    min: 1500, next: 3000, accent: 'hsl(28 92% 50%)',  fg: 'hsl(0 0% 100%)', icon: '✦' },
  { id: 'commander', label: 'Commander', min: 3000, next: null, accent: 'hsl(346 78% 47%)', fg: 'hsl(0 0% 100%)', icon: '✪' },
];

export function tierFromPoints(points = 0): TierDef {
  let current = TIERS[0];
  for (const t of TIERS) if (points >= t.min) current = t;
  return current;
}

export function tierProgress(points = 0): { tier: TierDef; pctToNext: number; ptsToNext: number | null } {
  const tier = tierFromPoints(points);
  if (tier.next === null) return { tier, pctToNext: 100, ptsToNext: null };
  const span = tier.next - tier.min;
  const got = Math.max(0, points - tier.min);
  return { tier, pctToNext: Math.min(100, Math.round((got / span) * 100)), ptsToNext: tier.next - points };
}

/** Backwards-compat helper for old 5-tier names so existing UI doesn't break. */
export function legacyTierAlias(tier: string): CadreTier {
  switch (tier) {
    case 'bronze':   return 'recruit';
    case 'silver':   return 'volunteer';
    case 'gold':     return 'organizer';
    case 'platinum': return 'captain';
    case 'diamond':  return 'leader';
    default:         return (TIERS.some(t => t.id === tier) ? tier : 'recruit') as CadreTier;
  }
}
