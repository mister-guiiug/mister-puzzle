import type { FC } from 'react';
import type { HistoryEntry } from '../hooks/useSocket';
import { MAX_CHART_HISTORY_POINTS, sampleHistoryForChart } from '../utils/chartSample';

export type ProgressMetric = 'placed' | 'remaining';

type ProgressChartProps = {
  history: HistoryEntry[];
  totalPieces: number;
  metric: ProgressMetric;
  label: string;
  emptyHint: string;
  /** Locale BCP 47 pour les axes temporels (ex. fr-FR). */
  chartLocale: string;
  /** Libellés accessibles pour le tableau résumé. */
  tableCaption: string;
  tableColTime: string;
  tableColValue: string;
  tableColAuthor: string;
};

const plot = { x0: 36, y0: 10, w: 332, h: 78 };

export const ProgressChart: FC<ProgressChartProps> = ({
  history,
  totalPieces,
  metric,
  label,
  emptyHint,
  chartLocale,
  tableCaption,
  tableColTime,
  tableColValue,
  tableColAuthor,
}) => {
  const sortedFull = [...history].sort((a, b) => a.timestamp - b.timestamp);
  const sorted = sampleHistoryForChart(sortedFull, MAX_CHART_HISTORY_POINTS);

  if (sorted.length < 2) {
    return (
      <p className="text-xs text-fg-faint mb-2" role="status">
        {emptyHint}
      </p>
    );
  }

  const w = 400;
  const h = 128;
  const { x0, y0, w: pw, h: ph } = plot;

  const values = sorted.map((e) =>
    metric === 'placed' ? e.placedPieces : Math.max(0, totalPieces - e.placedPieces),
  );
  const maxY = Math.max(totalPieces, ...values, 1);
  const minT = sorted[0]!.timestamp;
  const maxT = sorted[sorted.length - 1]!.timestamp;
  const tSpan = Math.max(maxT - minT, 1);

  const fmtTime = (ts: number) =>
    new Intl.DateTimeFormat(chartLocale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(ts);
  const fmtNum = (n: number) => Math.round(n).toLocaleString(chartLocale);

  const yTickVals = [0, maxY / 2, maxY].filter((v, i, a) => i === 0 || v !== a[i - 1]);

  const coords = sorted.map((e, i) => {
    const v = values[i]!;
    const x = x0 + ((e.timestamp - minT) / tSpan) * pw;
    const y = y0 + (1 - v / maxY) * ph;
    return { x, y, entry: e, value: v };
  });

  const linePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const first = coords[0]!;
  const last = coords[coords.length - 1]!;
  const areaPoints =
    metric === 'placed' ? `${first.x},${y0 + ph} ${linePoints} ${last.x},${y0 + ph}` : null;

  const strokeClass = metric === 'placed' ? 'text-primary-muted' : 'text-warm-muted';
  const gridClass = 'text-divide-strong';

  const tableRows = sortedFull.slice(-12).reverse();

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">{label}</p>

      <div className="sr-only">
        <table>
          <caption>{tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{tableColTime}</th>
              <th scope="col">{tableColValue}</th>
              <th scope="col">{tableColAuthor}</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((e, ri) => (
              <tr key={`${e.timestamp}-${e.placedPieces}-${ri}`}>
                <td>{fmtTime(e.timestamp)}</td>
                <td>
                  {metric === 'placed'
                    ? e.placedPieces.toLocaleString(chartLocale)
                    : Math.max(0, totalPieces - e.placedPieces).toLocaleString(chartLocale)}
                </td>
                <td>{e.pseudo ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className={`w-full max-w-xl h-32 ${strokeClass}`}
        role="img"
        aria-label={label}
      >
        <title>{label}</title>

        {yTickVals.map((tv) => {
          const gy = y0 + (1 - tv / maxY) * ph;
          return (
            <g key={tv}>
              <line
                x1={x0}
                y1={gy}
                x2={x0 + pw}
                y2={gy}
                className={gridClass}
                stroke="currentColor"
                strokeWidth={0.75}
              />
              <text x={4} y={gy + 3} className="fill-fg-muted text-[9px]" fontSize="9">
                {fmtNum(tv)}
              </text>
            </g>
          );
        })}

        <text x={x0} y={h - 4} className="fill-fg-muted text-[9px]" fontSize="9">
          {fmtTime(minT)}
        </text>
        <text
          x={x0 + pw}
          y={h - 4}
          textAnchor="end"
          className="fill-fg-muted text-[9px]"
          fontSize="9"
        >
          {fmtTime(maxT)}
        </text>

        {metric === 'placed' && areaPoints && (
          <polygon fill="currentColor" fillOpacity={0.14} points={areaPoints} stroke="none" />
        )}
        {metric === 'remaining' && (
          <line
            x1={x0}
            y1={y0 + ph}
            x2={x0 + pw}
            y2={y0 + ph}
            className="text-warm-axis"
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
        {coords.map((c, i) => (
          <circle
            key={`${c.entry.timestamp}-${i}`}
            cx={c.x}
            cy={c.y}
            r={3.5}
            fill="white"
            stroke="currentColor"
            strokeWidth={1.5}
            className={strokeClass}
          >
            <title>
              {fmtTime(c.entry.timestamp)} — {fmtNum(c.value)}
              {c.entry.pseudo ? ` — ${c.entry.pseudo}` : ''}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
};
