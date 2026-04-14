import type { HistoryEntry } from '../hooks/useSocket';

export const PSEUDO_STATS_WINDOW_MS = 24 * 60 * 60 * 1000;

export type PseudoStatRow = {
  /** Libellé affiché (pseudo tel quel ou chaîne vide = anonyme). */
  pseudoKey: string;
  /** Somme des deltas positifs sur la fenêtre glissante. */
  piecesInWindow: number;
  /** Plus grand delta positif sur un seul enregistrement dans la fenêtre. */
  maxSingleDelta: number;
  /** Somme max de deltas positifs consécutifs (même pseudo, sans autre pseudo entre deux) dans la fenêtre. */
  maxConsecutiveDelta: number;
  /** Nombre d’enregistrements dans la fenêtre avec delta positif attribués à ce pseudo. */
  positiveUpdatesInWindow: number;
};

function sortHistoryChrono(entries: HistoryEntry[]): HistoryEntry[] {
  return [...entries].sort((a, b) => {
    if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
    return a.id.localeCompare(b.id);
  });
}

function labelPseudo(raw: string | undefined): string {
  const t = (raw ?? '').trim();
  return t.length ? t : '';
}

/**
 * Agrège des stats par pseudo à partir du journal d’historique (deltas entre entrées consécutives).
 * Seuls les deltas **strictement positifs** comptent comme « pièces trouvées » sur la période.
 */
export function computePseudoStatsFromHistory(
  history: HistoryEntry[],
  nowMs: number,
  windowMs: number = PSEUDO_STATS_WINDOW_MS,
): PseudoStatRow[] {
  const sorted = sortHistoryChrono(history);
  const cutoff = nowMs - windowMs;

  const agg = new Map<
    string,
    { pieces: number; maxSingle: number; maxStreak: number; updates: number }
  >();

  const bump = (key: string, fn: (v: { pieces: number; maxSingle: number; maxStreak: number; updates: number }) => void) => {
    if (!agg.has(key)) {
      agg.set(key, { pieces: 0, maxSingle: 0, maxStreak: 0, updates: 0 });
    }
    fn(agg.get(key)!);
  };

  let streakPseudo: string | null = null;
  let streakSum = 0;

  const finalizeStreak = (pseudoKey: string | null, sum: number) => {
    if (!pseudoKey || sum <= 0) return;
    bump(pseudoKey, (v) => {
      v.maxStreak = Math.max(v.maxStreak, sum);
    });
  };

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const cur = sorted[i]!;
    const delta = cur.placedPieces - prev.placedPieces;
    const inWindow = cur.timestamp >= cutoff && cur.timestamp <= nowMs + 60_000;
    const key = labelPseudo(cur.pseudo);

    if (delta <= 0) {
      if (inWindow) {
        finalizeStreak(streakPseudo, streakSum);
        streakPseudo = null;
        streakSum = 0;
      }
      continue;
    }

    if (!inWindow) {
      if (delta > 0) {
        streakPseudo = null;
        streakSum = 0;
      }
      continue;
    }

    bump(key, (v) => {
      v.pieces += delta;
      v.maxSingle = Math.max(v.maxSingle, delta);
      v.updates += 1;
    });

    if (key === streakPseudo) {
      streakSum += delta;
    } else {
      finalizeStreak(streakPseudo, streakSum);
      streakPseudo = key;
      streakSum = delta;
    }
    bump(key, (v) => {
      v.maxStreak = Math.max(v.maxStreak, streakSum);
    });
  }

  finalizeStreak(streakPseudo, streakSum);

  const rows: PseudoStatRow[] = [...agg.entries()].map(([pseudoKey, v]) => ({
    pseudoKey,
    piecesInWindow: v.pieces,
    maxSingleDelta: v.maxSingle,
    maxConsecutiveDelta: v.maxStreak,
    positiveUpdatesInWindow: v.updates,
  }));

  rows.sort((a, b) => b.piecesInWindow - a.piecesInWindow || a.pseudoKey.localeCompare(b.pseudoKey));
  return rows;
}
