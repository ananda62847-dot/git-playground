import React from 'react';

interface State { hasError: boolean }

/**
 * Catches dynamic-import / lazy chunk load failures that otherwise leave the
 * page blank after a deploy. Auto-reloads once when detected.
 */
export default class ChunkErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    const msg = (error as any)?.message || String(error);
    const isChunkErr =
      /Loading chunk|ChunkLoadError|Importing a module script failed|Failed to fetch dynamically imported module|Unable to preload CSS/i.test(msg);
    if (isChunkErr) {
      const key = 'mc_chunk_reload_at';
      const last = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - last > 5_000) {
        sessionStorage.setItem(key, String(Date.now()));
        window.location.reload();
        return;
      }
    }
    // eslint-disable-next-line no-console
    console.error('App error boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6 text-center">
          <div className="max-w-md">
            <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">Please reload the page to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold"
            >Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
