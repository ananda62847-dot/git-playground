// Centralised IST (Asia/Kolkata) date/time formatting helpers.
const TZ = 'Asia/Kolkata';
const LOCALE = 'en-IN';

const toDate = (v: string | number | Date | null | undefined): Date | null => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

export const fmtIST = (v: string | number | Date | null | undefined): string => {
  const d = toDate(v); if (!d) return '—';
  return d.toLocaleString(LOCALE, { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
};

export const fmtISTDate = (v: string | number | Date | null | undefined): string => {
  const d = toDate(v); if (!d) return '—';
  return d.toLocaleDateString(LOCALE, { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtISTTime = (v: string | number | Date | null | undefined): string => {
  const d = toDate(v); if (!d) return '—';
  return d.toLocaleTimeString(LOCALE, { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true });
};
