import type { FC } from 'react';
import type { HistoryEntry } from '../hooks/useSocket';

type ProgressChartProps = {
  history: HistoryEntry[];
  totalPieces: number;
  label: string;
  emptyHint: string;
};

export const ProgressChart: FC<ProgressChartProps> = ({
  history,
  totalPieces,
  label,
  emptyHint,
}) => {
  const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length < 2) {
    return (
      <p className="text-xs text-gray-400 mb-2" role="status">
        {emptyHint}
      </p>
    );
  }

  const w = 400;
  const h = 96;
  const padX = 8;
  const padY = 8;
  const maxY = Math.max(totalPieces, ...sorted.map((e) => e.placedPieces), 1);
  const minT = sorted[0].timestamp;
  const maxT = sorted[sorted.length - 1].timestamp;
  const tSpan = Math.max(maxT - minT, 1);

  const pts = sorted.map((e) => {
    const x = padX + ((e.timestamp - minT) / tSpan) * (w - 2 * padX);
    const y = padY + (1 - e.placedPieces / maxY) * (h - 2 * padY);
    return `${x},${y}`;
  });

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full max-w-xl h-24 text-indigo-500"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={pts.join(' ')}
        />
      </svg>
    </div>
  );
};
