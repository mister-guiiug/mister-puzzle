import { describe, it, expect } from 'vitest';
import { sampleHistoryForChart, MAX_CHART_HISTORY_POINTS } from './chartSample';

describe('sampleHistoryForChart', () => {
  it('returns all when under cap', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ timestamp: i, placedPieces: i }));
    expect(sampleHistoryForChart(rows, MAX_CHART_HISTORY_POINTS)).toHaveLength(10);
  });

  it('reduces long series', () => {
    const rows = Array.from({ length: 500 }, (_, i) => ({ timestamp: i * 1000, placedPieces: i }));
    const out = sampleHistoryForChart(rows, 40);
    expect(out.length).toBeLessThanOrEqual(40);
    expect(out[0]!.timestamp).toBe(0);
    expect(out[out.length - 1]!.timestamp).toBe(499000);
  });
});
