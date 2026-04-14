import { useState, useEffect } from 'react';
import { ref, set, get, update, push, onValue, off, remove, query, orderByChild, equalTo, onDisconnect } from 'firebase/database';
import { db } from '../firebase';
import { normalizePuzzleFromFirebase } from '../utils/puzzleNormalize';
import { reportError } from '../utils/reportError';
import { PUZZLE_SCHEMA_VERSION } from '../constants/schema';
import { enqueueOfflinePieceUpdate, isLikelyNetworkError } from '../utils/offlinePieceQueue';

export interface Photo {
  id: string;
  data: string;
  rotation: number;
  caption?: string;
  /** ms epoch, set when the photo is added */
  addedAt?: number;
  /** lower values appear first */
  sortOrder?: number;
}

export interface Member {
  pseudo: string;
  lastSeen: number;
}

export interface Checkpoint {
  id: string;
  name: string;
  completed: boolean;
  createdBy?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  placedPieces: number;
  pseudo?: string;
}

export interface PuzzleState {
  id: string;
  name: string;
  /** Présent sur les puzzles créés après introduction du versioning document. */
  schemaVersion?: number;
  isPublic: boolean;
  passwordHash?: string;
  createdBy?: string;
  totalPieces: number;
  placedPieces: number;
  rows?: number;
  cols?: number;
  checkpoints: Checkpoint[];
  photos: Photo[];
  history: HistoryEntry[];
  members?: Record<string, Member>;
}

const normalizePuzzle = (data: unknown): PuzzleState => normalizePuzzleFromFirebase(data);

/** Hash a password with SHA-256 (client-side UX-level privacy). */
export const hashPassword = async (password: string): Promise<string> => {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/** Subscribe to live updates for a puzzle room. */
export const usePuzzle = (roomCode: string | null) => {
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    /* Pièces d’état alignées sur le cycle d’abonnement Firebase (onValue / cleanup). */
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!roomCode) {
      setPuzzle(null);
      setLoading(false);
      setLoadError(null);
      return;
    }

    setLoading(true);
    setLoadError(null);
    const puzzleRef = ref(db, `puzzles/${roomCode}`);
    const unsubscribe = onValue(
      puzzleRef,
      (snapshot) => {
        setLoading(false);
        setLoadError(null);
        const data = snapshot.val();
        if (data) {
          setPuzzle(normalizePuzzle(data));
        } else {
          setPuzzle(null);
        }
      },
      (err) => {
        setLoading(false);
        setPuzzle(null);
        const msg = err instanceof Error ? err.message : String(err);
        setLoadError(msg);
        reportError('usePuzzle_onValue', err, { roomCode });
      },
    );

    return () => {
      off(puzzleRef, 'value', unsubscribe);
      setPuzzle(null);
      setLoading(false);
      setLoadError(null);
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [roomCode]);

  return { puzzle, loading, loadError };
};

export const createPuzzle = async (
  name: string,
  rows: number,
  cols: number,
  isPublic: boolean,
  passwordHash: string | null,
  pseudo: string,
): Promise<string> => {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  await set(ref(db, `puzzles/${roomCode}`), {
    id: roomCode,
    schemaVersion: PUZZLE_SCHEMA_VERSION,
    name,
    isPublic,
    ...(passwordHash ? { passwordHash } : {}),
    ...(pseudo ? { createdBy: pseudo } : {}),
    rows,
    cols,
    totalPieces: rows * cols,
    placedPieces: 0,
    checkpoints: {
      '1': { id: '1', name: 'Contour fini', completed: false },
      '2': { id: '2', name: '50% terminé', completed: false },
      '3': { id: '3', name: '75% terminé', completed: false },
    },
    photos: {},
    history: { '0': { timestamp: Date.now(), placedPieces: 0, ...(pseudo ? { pseudo } : {}) } },
  });
  return roomCode;
};

export const joinPuzzle = async (roomCode: string): Promise<PuzzleState | null> => {
  const snapshot = await get(ref(db, `puzzles/${roomCode}`));
  if (!snapshot.exists()) return null;
  return normalizePuzzle(snapshot.val());
};

/** Fetch all public puzzles. */
export const getPublicPuzzles = async (): Promise<PuzzleState[]> => {
  // Try indexed query first; fall back to full fetch+filter if index not yet deployed
  try {
    const publicQuery = query(ref(db, 'puzzles'), orderByChild('isPublic'), equalTo(true));
    const snapshot = await get(publicQuery);
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val() as Record<string, unknown>)
      .map(normalizePuzzle)
      .filter((p) => !p.passwordHash); // never show password-protected puzzles in search
  } catch (e) {
    reportError('getPublicPuzzles_indexed', e, {});
    const snapshot = await get(ref(db, 'puzzles'));
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val() as Record<string, unknown>)
      .map(normalizePuzzle)
      .filter((p) => p.isPublic !== false && !p.passwordHash);
  }
};

/** Register the current session as an active member. Uses onDisconnect to auto-remove. */
export const joinMember = async (roomCode: string, sessionId: string, pseudo: string): Promise<void> => {
  const memberRef = ref(db, `puzzles/${roomCode}/members/${sessionId}`);
  await set(memberRef, { pseudo: pseudo || 'Anonyme', lastSeen: Date.now() });
  await onDisconnect(memberRef).remove();
};

export const leaveMember = async (roomCode: string, sessionId: string): Promise<void> => {
  await remove(ref(db, `puzzles/${roomCode}/members/${sessionId}`));
};

export const changePassword = async (roomCode: string, newPasswordHash: string | null): Promise<void> => {
  await update(ref(db, `puzzles/${roomCode}`), { passwordHash: newPasswordHash });
};

export const updateVisibility = async (roomCode: string, isPublic: boolean): Promise<void> => {
  await update(ref(db, `puzzles/${roomCode}`), { isPublic });
};

const MAX_HISTORY_ENTRIES = 120;

const trimHistoryIfNeeded = async (roomCode: string): Promise<void> => {
  const snap = await get(ref(db, `puzzles/${roomCode}/history`));
  if (!snap.exists()) return;
  const val = snap.val() as Record<string, HistoryEntry>;
  const keys = Object.keys(val);
  if (keys.length <= MAX_HISTORY_ENTRIES) return;
  const rows = keys.map((k) => ({ key: k, ...val[k] }));
  rows.sort((a, b) => a.timestamp - b.timestamp);
  const toDelete = rows.slice(0, rows.length - MAX_HISTORY_ENTRIES);
  const updates: Record<string, null> = {};
  for (const { key } of toDelete) {
    updates[`puzzles/${roomCode}/history/${key}`] = null;
  }
  await update(ref(db), updates);
};

export const updatePieces = async (roomCode: string, placedPieces: number, pseudo?: string): Promise<void> => {
  const newKey = push(ref(db, `puzzles/${roomCode}/history`)).key;
  await update(ref(db), {
    [`puzzles/${roomCode}/placedPieces`]: placedPieces,
    [`puzzles/${roomCode}/history/${newKey}`]: {
      timestamp: Date.now(),
      placedPieces,
      ...(pseudo ? { pseudo } : {}),
    },
  });
  trimHistoryIfNeeded(roomCode).catch(() => {});
};

/**
 * Envoie le compteur ou le met en file locale si hors ligne / erreur réseau.
 * Retourne `{ queued: true }` si la valeur sera envoyée plus tard (ne pas traiter comme erreur).
 */
export const updatePiecesResilient = async (
  roomCode: string,
  placedPieces: number,
  pseudo?: string,
): Promise<{ queued: boolean }> => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueueOfflinePieceUpdate({ roomCode, placedPieces, pseudo });
    return { queued: true };
  }
  try {
    await updatePieces(roomCode, placedPieces, pseudo);
    return { queued: false };
  } catch (err) {
    if (isLikelyNetworkError(err)) {
      enqueueOfflinePieceUpdate({ roomCode, placedPieces, pseudo });
      reportError('updatePiecesResilient_queued', err, { roomCode });
      return { queued: true };
    }
    throw err;
  }
};

export const updateHistoryEntry = async (roomCode: string, entryId: string, newPieces: number): Promise<void> => {
  const historyRef = ref(db, `puzzles/${roomCode}/history`);
  const snap = await get(historyRef);
  if (!snap.exists()) return;
  const history = snap.val() as Record<string, HistoryEntry>;

  const updates: Record<string, unknown> = {
    [`puzzles/${roomCode}/history/${entryId}/placedPieces`]: newPieces,
  };

  const entries = Object.entries(history)
    .map(([id, data]) => ({ ...data, id }))
    .sort((a, b) => b.timestamp - a.timestamp);

  if (entries.length > 0 && entries[0].id === entryId) {
    updates[`puzzles/${roomCode}/placedPieces`] = newPieces;
  }

  await update(ref(db), updates);
};

export const deleteHistoryEntry = async (roomCode: string, entryId: string): Promise<void> => {
  const historyRef = ref(db, `puzzles/${roomCode}/history`);
  const snap = await get(historyRef);
  if (!snap.exists()) return;
  const history = snap.val() as Record<string, HistoryEntry>;

  const updates: Record<string, unknown> = {
    [`puzzles/${roomCode}/history/${entryId}`]: null,
  };

  const entries = Object.entries(history)
    .map(([id, data]) => ({ ...data, id }))
    .sort((a, b) => b.timestamp - a.timestamp);

  if (entries.length > 0 && entries[0].id === entryId) {
    const nextLatest = entries[1];
    updates[`puzzles/${roomCode}/placedPieces`] = nextLatest ? nextLatest.placedPieces : 0;
  }

  await update(ref(db), updates);
};

export const toggleCheckpoint = async (
  roomCode: string,
  checkpointId: string,
  currentCompleted: boolean,
): Promise<void> => {
  await set(ref(db, `puzzles/${roomCode}/checkpoints/${checkpointId}/completed`), !currentCompleted);
};

export const addCheckpoint = async (roomCode: string, name: string, pseudo?: string): Promise<void> => {
  const newKey = push(ref(db, `puzzles/${roomCode}/checkpoints`)).key!;
  await set(ref(db, `puzzles/${roomCode}/checkpoints/${newKey}`), {
    id: newKey,
    name,
    completed: false,
    ...(pseudo ? { createdBy: pseudo } : {}),
  });
};

export const uncheckAllCheckpoints = async (roomCode: string, checkpointIds: string[]): Promise<void> => {
  const updates: Record<string, boolean> = {};
  for (const id of checkpointIds) {
    updates[`puzzles/${roomCode}/checkpoints/${id}/completed`] = false;
  }
  await update(ref(db), updates);
};

export const deleteCheckpoint = async (roomCode: string, checkpointId: string): Promise<void> => {
  await remove(ref(db, `puzzles/${roomCode}/checkpoints/${checkpointId}`));
};

export const addPhoto = async (roomCode: string, photo: string): Promise<void> => {
  const now = Date.now();
  const newRef = push(ref(db, `puzzles/${roomCode}/photos`));
  await set(newRef, { data: photo, rotation: 0, addedAt: now, sortOrder: now });
};

export const updatePhoto = async (
  roomCode: string,
  photoId: string,
  patch: { caption?: string | null; sortOrder?: number },
): Promise<void> => {
  await update(ref(db, `puzzles/${roomCode}/photos/${photoId}`), patch as Record<string, unknown>);
};

export const reorderPhotos = async (roomCode: string, orderedIds: string[]): Promise<void> => {
  const updates: Record<string, number> = {};
  orderedIds.forEach((id, index) => {
    updates[`puzzles/${roomCode}/photos/${id}/sortOrder`] = index;
  });
  await update(ref(db), updates);
};

export const deletePhoto = async (roomCode: string, photoId: string): Promise<void> => {
  await remove(ref(db, `puzzles/${roomCode}/photos/${photoId}`));
};

export const rotatePhoto = async (roomCode: string, photoId: string, newRotation: number): Promise<void> => {
  await update(ref(db, `puzzles/${roomCode}/photos/${photoId}`), { rotation: newRotation });
};

export const updateGridSize = async (roomCode: string, rows: number, cols: number): Promise<void> => {
  await update(ref(db, `puzzles/${roomCode}`), {
    rows,
    cols,
    totalPieces: rows * cols,
  });
};

export const renamePuzzle = async (roomCode: string, name: string): Promise<void> => {
  await update(ref(db, `puzzles/${roomCode}`), { name });
};

export const deletePuzzle = async (roomCode: string): Promise<void> => {
  await remove(ref(db, `puzzles/${roomCode}`));
};
