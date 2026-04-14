const STORAGE_KEY = 'mister_puzzle_offline_piece_queue';

export type OfflinePiecePending = {
  roomCode: string;
  placedPieces: number;
  pseudo?: string;
  createdAt: number;
};

function loadRaw(): OfflinePiecePending[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is OfflinePiecePending =>
        typeof x === 'object' &&
        x !== null &&
        typeof (x as OfflinePiecePending).roomCode === 'string' &&
        typeof (x as OfflinePiecePending).placedPieces === 'number' &&
        typeof (x as OfflinePiecePending).createdAt === 'number',
    );
  } catch {
    return [];
  }
}

function saveRaw(items: OfflinePiecePending[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

/** Indique si l’erreur ressemble à un problème réseau (hors ligne ou requête échouée). */
export function isLikelyNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.toLowerCase();
  return (
    m.includes('network') ||
    m.includes('offline') ||
    m.includes('failed to fetch') ||
    m.includes('internet') ||
    m.includes('unavailable') ||
    m.includes('auth/network') ||
    m.includes('err_network')
  );
}

export function getOfflineQueueForRoom(roomCode: string): OfflinePiecePending | undefined {
  return loadRaw().find((x) => x.roomCode === roomCode);
}

export function hasPendingForRoom(roomCode: string): boolean {
  return loadRaw().some((x) => x.roomCode === roomCode);
}

/**
 * Une entrée par salle : la dernière valeur demandée remplace la précédente.
 */
export function enqueueOfflinePieceUpdate(
  entry: Omit<OfflinePiecePending, 'createdAt'> & { createdAt?: number },
): void {
  const items = loadRaw().filter((x) => x.roomCode !== entry.roomCode);
  items.push({
    roomCode: entry.roomCode,
    placedPieces: entry.placedPieces,
    pseudo: entry.pseudo,
    createdAt: entry.createdAt ?? Date.now(),
  });
  saveRaw(items);
  try {
    window.dispatchEvent(new CustomEvent('mister-puzzle-offline-queue'));
  } catch {
    /* ignore */
  }
}

export function clearQueue(): void {
  saveRaw([]);
}

/**
 * Envoie chaque entrée (dernière valeur par salle), retire les réussites, garde les échecs.
 */
export async function flushOfflinePieceQueue(
  send: (roomCode: string, placedPieces: number, pseudo?: string) => Promise<void>,
): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  let items = loadRaw();
  if (items.length === 0) return;

  const byRoom = new Map<string, OfflinePiecePending>();
  for (const it of items) {
    const prev = byRoom.get(it.roomCode);
    if (!prev || it.createdAt >= prev.createdAt) byRoom.set(it.roomCode, it);
  }
  items = [...byRoom.values()].sort((a, b) => a.createdAt - b.createdAt);

  const failed: OfflinePiecePending[] = [];
  for (const it of items) {
    try {
      await send(it.roomCode, it.placedPieces, it.pseudo);
    } catch {
      failed.push(it);
    }
  }
  saveRaw(failed);
  try {
    window.dispatchEvent(new CustomEvent('mister-puzzle-offline-queue'));
  } catch {
    /* ignore */
  }
}
