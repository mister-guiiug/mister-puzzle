import { describe, it, expect } from 'vitest';
import { computePseudoStatsFromHistory, PSEUDO_STATS_WINDOW_MS } from './pseudoStats';
import type { HistoryEntry } from '../hooks/useSocket';

const entry = (id: string, ts: number, placed: number, pseudo?: string): HistoryEntry => ({
  id,
  timestamp: ts,
  placedPieces: placed,
  ...(pseudo !== undefined ? { pseudo } : {}),
});

describe('computePseudoStatsFromHistory', () => {
  const now = 1_000_000_000_000;

  it('vide ou une entrée → aucune ligne', () => {
    expect(computePseudoStatsFromHistory([], now)).toEqual([]);
    expect(computePseudoStatsFromHistory([entry('a', now - 1000, 0)], now)).toEqual([]);
  });

  it('attribue les deltas positifs au pseudo de l’entrée courante (fenêtre 24 h)', () => {
    const day = PSEUDO_STATS_WINDOW_MS;
    const h: HistoryEntry[] = [
      entry('1', now - day - 20_000, 0),
      entry('2', now - day - 5000, 10, 'Alice'),
      entry('3', now - 5000, 25, 'Alice'),
      entry('4', now - 4000, 28, 'Bob'),
    ];
    const rows = computePseudoStatsFromHistory(h, now);
    const alice = rows.find((r) => r.pseudoKey === 'Alice');
    const bob = rows.find((r) => r.pseudoKey === 'Bob');
    expect(alice?.piecesInWindow).toBe(15);
    expect(alice?.maxSingleDelta).toBe(15);
    expect(bob?.piecesInWindow).toBe(3);
    expect(bob?.maxSingleDelta).toBe(3);
  });

  it('série consécutive même pseudo', () => {
    const h: HistoryEntry[] = [
      entry('1', now - 60_000, 0),
      entry('2', now - 50_000, 5, 'A'),
      entry('3', now - 40_000, 12, 'A'),
      entry('4', now - 30_000, 14, 'B'),
      entry('5', now - 20_000, 20, 'A'),
    ];
    const rows = computePseudoStatsFromHistory(h, now);
    const a = rows.find((r) => r.pseudoKey === 'A');
    expect(a?.piecesInWindow).toBe(5 + 7 + 6);
    expect(a?.maxConsecutiveDelta).toBe(12);
    expect(a?.positiveUpdatesInWindow).toBe(3);
  });

  it('ignore les deltas négatifs pour les pièces', () => {
    const h: HistoryEntry[] = [
      entry('1', now - 10_000, 100, 'X'),
      entry('2', now - 9000, 90, 'X'),
      entry('3', now - 8000, 95, 'X'),
    ];
    const rows = computePseudoStatsFromHistory(h, now);
    const x = rows.find((r) => r.pseudoKey === 'X');
    expect(x?.piecesInWindow).toBe(5);
    expect(x?.positiveUpdatesInWindow).toBe(1);
  });

  it('regroupe les anonymes sous pseudoKey vide', () => {
    const h: HistoryEntry[] = [entry('1', now - 5000, 0), entry('2', now - 4000, 3)];
    const rows = computePseudoStatsFromHistory(h, now);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.pseudoKey).toBe('');
    expect(rows[0]!.piecesInWindow).toBe(3);
  });
});
