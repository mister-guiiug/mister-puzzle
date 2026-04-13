export type ErrorReportDetail = {
  scope: string;
  message: string;
  ctx?: Record<string, unknown>;
  ts: number;
};

/**
 * Point central pour erreurs runtime : console structurée + événement personnalisable (Sentry, etc.).
 */
export function reportError(scope: string, err: unknown, ctx?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  const detail: ErrorReportDetail = { scope, message, ctx, ts: Date.now() };
  if (import.meta.env.DEV) {
    console.error('[reportError]', detail, err);
  } else {
    console.warn('[reportError]', detail);
  }
  try {
    window.dispatchEvent(new CustomEvent<ErrorReportDetail>('mister-puzzle-error', { detail }));
  } catch {
    /* ignore */
  }
}
