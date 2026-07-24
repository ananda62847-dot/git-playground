// Trailing-edge throttle: collapses bursts of realtime events into one
// fetch per `wait` window. Critical for surviving 10k+ concurrent users
// where every insert can otherwise trigger a refetch storm.
export function throttle<T extends (...args: any[]) => void>(fn: T, wait: number): T {
  let lastCall = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: any[] = [];

  return ((...args: any[]) => {
    lastArgs = args;
    const now = Date.now();
    const remaining = wait - (now - lastCall);
    if (remaining <= 0) {
      lastCall = now;
      fn(...lastArgs);
    } else if (!pending) {
      pending = setTimeout(() => {
        lastCall = Date.now();
        pending = null;
        fn(...lastArgs);
      }, remaining);
    }
  }) as T;
}
