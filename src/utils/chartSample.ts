/** Nombre max de points affichés sur le graphique (performance + lisibilité). */
export const MAX_CHART_HISTORY_POINTS = 80;

/**
 * Sous-échantillonnage uniforme en conservant le premier et le dernier point logique.
 */
export function sampleHistoryForChart<T extends { timestamp: number }>(
  sorted: T[],
  maxPoints: number,
): T[] {
  if (sorted.length <= maxPoints) return sorted;
  const n = maxPoints;
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i / Math.max(n - 1, 1)) * (sorted.length - 1));
    result.push(sorted[idx]!);
  }
  const deduped: T[] = [];
  let lastTs = Number.NEGATIVE_INFINITY;
  for (const e of result) {
    if (e.timestamp !== lastTs) {
      deduped.push(e);
      lastTs = e.timestamp;
    }
  }
  return deduped;
}
