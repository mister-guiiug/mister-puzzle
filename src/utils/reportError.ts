export type ErrorReportDetail = {
  scope: string;
  message: string;
  ctx?: Record<string, unknown>;
  ts: number;
};

/**
 * Point central pour erreurs runtime : console structurée + événement personnalisable (Sentry, etc.).
 */
function postErrorIngest(detail: ErrorReportDetail): void {
  const url = import.meta.env.VITE_ERROR_INGEST_URL;
  if (!url || typeof fetch !== 'function') return;
  const body = JSON.stringify({
    ...detail,
    href: typeof window !== 'undefined' ? window.location?.pathname : undefined,
  });
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    mode: 'cors',
  }).catch(() => {});
}

export function reportError(scope: string, err: unknown, ctx?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  const detail: ErrorReportDetail = { scope, message, ctx, ts: Date.now() };
  if (import.meta.env.DEV) {
    console.error('[reportError]', detail, err);
  } else {
    console.warn('[reportError]', detail);
  }
  postErrorIngest(detail);
  try {
    window.dispatchEvent(new CustomEvent<ErrorReportDetail>('mister-puzzle-error', { detail }));
  } catch {
    /* ignore */
  }
}
