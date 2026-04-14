export type FirebaseErrorKind = 'permission' | 'network' | 'unknown';

/**
 * Catégorise un message d’erreur Firebase / navigateur pour afficher un libellé adapté.
 */
export function classifyFirebaseError(message: string | null | undefined): FirebaseErrorKind {
  if (!message) return 'unknown';
  const m = message.toLowerCase();
  if (m.includes('permission_denied') || m.includes('permission denied')) return 'permission';
  if (
    m.includes('network') ||
    m.includes('failed to fetch') ||
    m.includes('internet') ||
    m.includes('offline') ||
    m.includes('err_internet_disconnected')
  ) {
    return 'network';
  }
  return 'unknown';
}
