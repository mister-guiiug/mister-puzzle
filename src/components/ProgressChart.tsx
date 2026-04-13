import type { FC } from 'react';
import type { HistoryEntry } from '../hooks/useSocket';

export type ProgressMetric = 'placed' | 'remaining';

type ProgressChartProps = {
  history: HistoryEntry[];
  totalPieces: number;
  /** Même préférence que le compteur : courbe des placées vs des restantes. */
  metric: ProgressMetric;
  label: string;
  emptyHint: string;
};

export const ProgressChart: FC<ProgressChartProps> = ({
  history,
  totalPieces,
  metric,
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
  const values = sorted.map((e) =>
    metric === 'placed' ? e.placedPieces : Math.max(0, totalPieces - e.placedPieces),
  );
  const maxY = Math.max(totalPieces, ...values, 1);
  const minT = sorted[0].timestamp;
  const maxT = sorted[sorted.length - 1].timestamp;
  const tSpan = Math.max(maxT - minT, 1);

  const coords = sorted.map((e, i) => {
    const v = values[i]!;
    const x = padX + ((e.timestamp - minT) / tSpan) * (w - 2 * padX);
    const y = padY + (1 - v / maxY) * (h - 2 * padY);
    return { x, y };
  });

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const areaPoints =
    metric === 'placed'
      ? `${first.x},${h - padY} ${linePoints} ${last.x},${h - padY}`
      : null;

  const strokeClass = metric === 'placed' ? 'text-indigo-500' : 'text-orange-500';

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={`w-full max-w-xl h-24 ${strokeClass}`}
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        {metric === 'placed' && areaPoints && (
          <polygon fill="currentColor" fillOpacity={0.14} points={areaPoints} stroke="none" />
        )}
        {metric === 'remaining' && (
          <line
            x1={padX}
            y1={h - padY}
            x2={w - padX}
            y2={h - padY}
            className="text-orange-200"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        )}
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth={metric === 'remaining' ? 2.25 : 2.5}
          strokeDasharray={metric === 'remaining' ? '6 5' : undefined}
          strokeLinejoin="round"
          strokeLinecap="round"
          points={linePoints}
        />
      </svg>
    </div>
  );
};
