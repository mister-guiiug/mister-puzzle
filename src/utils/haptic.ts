/** Retour haptique discret après une action réussie (mobile). */
export function notifySaveSuccess(): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(14);
  } catch {
    /* ignore */
  }
}
