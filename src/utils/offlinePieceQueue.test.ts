import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isLikelyNetworkError,
  enqueueOfflinePieceUpdate,
  hasPendingForRoom,
  clearQueue,
} from './offlinePieceQueue';

const KEY = 'mister_puzzle_offline_piece_queue';

function createMemoryStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k]! : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe('offlinePieceQueue', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('isLikelyNetworkError détecte les messages réseau', () => {
    expect(isLikelyNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isLikelyNetworkError(new Error('Network error'))).toBe(true);
    expect(isLikelyNetworkError(new Error('permission_denied'))).toBe(false);
  });

  it('enqueue remplace la même salle', () => {
    enqueueOfflinePieceUpdate({ roomCode: 'ABC', placedPieces: 5 });
    enqueueOfflinePieceUpdate({ roomCode: 'ABC', placedPieces: 10 });
    expect(hasPendingForRoom('ABC')).toBe(true);
    const pending = JSON.parse(localStorage.getItem(KEY) || '[]') as { placedPieces: number }[];
    expect(pending).toHaveLength(1);
    expect(pending[0]?.placedPieces).toBe(10);
  });

  it('clearQueue vide la file', () => {
    enqueueOfflinePieceUpdate({ roomCode: 'X', placedPieces: 1 });
    clearQueue();
    expect(hasPendingForRoom('X')).toBe(false);
  });
});
