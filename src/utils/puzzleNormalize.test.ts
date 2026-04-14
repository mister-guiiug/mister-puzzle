import { describe, it, expect } from 'vitest';
import { normalizePuzzleFromFirebase } from './puzzleNormalize';

describe('normalizePuzzleFromFirebase', () => {
  it('returns empty shell for non-object input', () => {
    const p = normalizePuzzleFromFirebase(null);
    expect(p.id).toBe('');
    expect(p.checkpoints).toEqual([]);
    expect(p.history).toEqual([]);
  });

  it('parses history entries with required fields only', () => {
    const p = normalizePuzzleFromFirebase({
      id: 'ABC',
      name: 'Test',
      totalPieces: 100,
      placedPieces: 5,
      history: {
        a: { timestamp: 1, placedPieces: 0 },
        b: { timestamp: 2, placedPieces: 5, pseudo: 'Bob' },
        bad: { foo: 1 },
      },
      checkpoints: {},
      photos: {},
    });
    expect(p.history).toHaveLength(2);
    expect(p.history.find((h) => h.placedPieces === 5)?.pseudo).toBe('Bob');
  });

  it('filters invalid checkpoints', () => {
    const p = normalizePuzzleFromFirebase({
      id: 'X',
      name: 'N',
      totalPieces: 1,
      placedPieces: 0,
      checkpoints: {
        ok: { id: '1', name: 'A', completed: false },
        bad: { id: '2' },
      },
      history: {},
      photos: {},
    });
    expect(p.checkpoints).toHaveLength(1);
    expect(p.checkpoints[0]!.name).toBe('A');
  });

  it('normalise schemaVersion (défaut 1)', () => {
    const p = normalizePuzzleFromFirebase({
      id: 'X',
      name: 'N',
      totalPieces: 10,
      placedPieces: 0,
      checkpoints: {},
      history: {},
      photos: {},
    });
    expect(p.schemaVersion).toBe(1);
    const p2 = normalizePuzzleFromFirebase({
      id: 'Y',
      schemaVersion: 2,
      name: 'N2',
      totalPieces: 1,
      placedPieces: 0,
      checkpoints: {},
      history: {},
      photos: {},
    });
    expect(p2.schemaVersion).toBe(2);
  });
});
