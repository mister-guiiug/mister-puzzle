import { useState, useEffect } from 'react';
import { ref, set, get, update, push, onValue, off, remove, query, orderByChild, equalTo, onDisconnect } from 'firebase/database';
import { db } from '../firebase';

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
  timestamp: number;
  placedPieces: number;
  pseudo?: string;
}

export interface PuzzleState {
  id: string;
  name: string;
  isPublic: boolean;
  passwordHash?: string;
  createdBy?: string;
  totalPieces: number;
  placedPieces: number;
  rows?: number;
  cols?: number;
  checkpoints: Checkpoint[];
  photos: string[];
  history: HistoryEntry[];
  members?: Record<string, Member>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizePuzzle = (data: any): PuzzleState => ({
  ...data,
  isPublic: data.isPublic ?? true,
  checkpoints: data.checkpoints ? Object.values(data.checkpoints) : [],
  photos: data.photos ? Object.values(data.photos) : [],
  history: data.history ? Object.values(data.history) : [],
  members: data.members ?? undefined,
});

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

  useEffect(() => {
    if (!roomCode) {
      setPuzzle(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const puzzleRef = ref(db, `puzzles/${roomCode}`);
    const unsubscribe = onValue(puzzleRef, (snapshot) => {
      setLoading(false);
      const data = snapshot.val();
      if (data) {
        setPuzzle(normalizePuzzle(data));
      } else {
        setPuzzle(null);
      }
    });

    return () => {
      off(puzzleRef, 'value', unsubscribe);
      setPuzzle(null);
      setLoading(false);
    };
  }, [roomCode]);

  return { puzzle, loading };
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.values(snapshot.val() as Record<string, any>)
      .map(normalizePuzzle)
      .filter((p) => !p.passwordHash); // never show password-protected puzzles in search
  } catch {
    const snapshot = await get(ref(db, 'puzzles'));
    if (!snapshot.exists()) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.values(snapshot.val() as Record<string, any>)
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

export const addPhoto = async (roomCode: string, photo: string): Promise<void> => {
  await push(ref(db, `puzzles/${roomCode}/photos`), photo);
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
