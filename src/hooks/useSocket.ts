import { useState, useEffect } from 'react';
import { ref, set, get, update, push, onValue, off } from 'firebase/database';
import { db } from '../firebase';

export interface Checkpoint {
  id: string;
  name: string;
  completed: boolean;
}

export interface HistoryEntry {
  timestamp: number;
  placedPieces: number;
}

export interface PuzzleState {
  id: string;
  name: string;
  totalPieces: number;
  placedPieces: number;
  rows?: number;
  cols?: number;
  checkpoints: Checkpoint[];
  photos: string[];
  history: HistoryEntry[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizePuzzle = (data: any): PuzzleState => ({
  ...data,
  checkpoints: data.checkpoints ? Object.values(data.checkpoints) : [],
  photos: data.photos ? Object.values(data.photos) : [],
  history: data.history ? Object.values(data.history) : [],
});

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

export const createPuzzle = async (name: string, rows: number, cols: number): Promise<string> => {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  await set(ref(db, `puzzles/${roomCode}`), {
    id: roomCode,
    name,
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
    history: { '0': { timestamp: Date.now(), placedPieces: 0 } },
  });
  return roomCode;
};

export const joinPuzzle = async (roomCode: string): Promise<PuzzleState | null> => {
  const snapshot = await get(ref(db, `puzzles/${roomCode}`));
  if (!snapshot.exists()) return null;
  return normalizePuzzle(snapshot.val());
};

export const updatePieces = async (roomCode: string, placedPieces: number): Promise<void> => {
  const newKey = push(ref(db, `puzzles/${roomCode}/history`)).key;
  await update(ref(db), {
    [`puzzles/${roomCode}/placedPieces`]: placedPieces,
    [`puzzles/${roomCode}/history/${newKey}`]: { timestamp: Date.now(), placedPieces },
  });
};

export const toggleCheckpoint = async (
  roomCode: string,
  checkpointId: string,
  currentCompleted: boolean,
): Promise<void> => {
  await set(ref(db, `puzzles/${roomCode}/checkpoints/${checkpointId}/completed`), !currentCompleted);
};

export const addCheckpoint = async (roomCode: string, name: string): Promise<void> => {
  const newKey = push(ref(db, `puzzles/${roomCode}/checkpoints`)).key!;
  await set(ref(db, `puzzles/${roomCode}/checkpoints/${newKey}`), {
    id: newKey,
    name,
    completed: false,
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
