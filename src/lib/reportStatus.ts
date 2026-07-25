// Single source of truth for "closed" reports — once closed, nothing is editable.
// Paused (on_hold) and recalled items are also treated as locked (view-only).
export const CLOSED_STATUSES = ['resolved', 'completed', 'citizen_confirmed', 'rejected', 'duplicate'] as const;

export type ProblemLike = {
  status?: string | null;
  closed_as_false?: boolean | null;
  on_hold?: boolean | null;
} | null | undefined;

export const isReportPaused = (p: ProblemLike): boolean => !!p && !!p.on_hold;

export const isReportClosed = (p: ProblemLike): boolean =>
  !!p && (
    !!p.closed_as_false ||
    !!p.on_hold ||
    (!!p.status && (CLOSED_STATUSES as readonly string[]).includes(p.status))
  );

export const closedBadgeLabel = (statusOrRow?: string | null | { status?: string | null; closed_as_false?: boolean | null; on_hold?: boolean | null }): string => {
  const row = typeof statusOrRow === 'object' && statusOrRow !== null ? statusOrRow : null;
  const status = row ? row.status : (statusOrRow as string | null | undefined);
  if (row?.on_hold) return '⏸ Paused by super admin — view only';
  if (row?.closed_as_false) return '🚫 Closed as false report — locked';
  switch (status) {
    case 'citizen_confirmed': return '✅ Citizen confirmed — view only';
    case 'completed':         return '✅ Completed — view only';
    case 'resolved':          return '✅ Resolved — view only';
    case 'rejected':          return '🚫 Rejected — view only';
    case 'duplicate':         return '♻️ Duplicate — view only';
    default:                  return '🔒 Closed — view only';
  }
};

// Human reasons for gamification events shown on the cadre score history page.
export const SCORE_REASONS: Record<string, { label: string; tone: 'pos' | 'neg' | 'neutral' }> = {
  claimed:                  { label: 'Claimed a report',                       tone: 'pos' },
  proof_uploaded:           { label: 'Uploaded proof photo',                   tone: 'pos' },
  resolved:                 { label: 'Resolved a report',                      tone: 'pos' },
  citizen_rating_bonus:     { label: 'Citizen rated 4★ or higher',             tone: 'pos' },
  citizen_rating_penalty:   { label: 'Citizen rated 2★ or lower',              tone: 'neg' },
  escalation_against:       { label: 'Report was escalated by admin',          tone: 'neg' },
  sla_breach:               { label: 'Missed SLA deadline',                    tone: 'neg' },
  manual_bonus:             { label: 'Admin awarded bonus',                    tone: 'pos' },
  manual_penalty:           { label: 'Admin applied penalty',                  tone: 'neg' },
};
