// Lightweight, privacy-friendly device fingerprint for anonymous voting.
// Persisted per-browser; combined with backend UNIQUE constraint to enforce 1 vote / device.
const KEY = 'mc_device_fp_v1';

export const getDeviceFingerprint = (): string => {
  try {
    let v = localStorage.getItem(KEY);
    if (v && v.length >= 12) return v;
    const seed = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      Math.random().toString(36).slice(2, 12),
      Date.now().toString(36),
    ].join('|');
    // Simple non-crypto hash → readable id
    let h = 5381;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i);
    v = 'fp_' + (h >>> 0).toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(KEY, v);
    return v;
  } catch {
    // Fallback when storage is unavailable
    return 'fp_anon_' + Math.random().toString(36).slice(2, 14);
  }
};
