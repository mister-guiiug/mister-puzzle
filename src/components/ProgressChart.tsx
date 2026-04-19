import type { FC } from 'react';
import type { HistoryEntry } from '../hooks/useSocket';
import { MAX_CHART_HISTORY_POINTS, sampleHistoryForChart } from '../utils/chartSample';
import { useState, useRef, useCallback, useMemo } from 'react';

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
  /** Plage de temps pour le zoom (null = vue complète). */
  zoomRange?: { start: number; end: number } | null;
  /** Callback quand le zoom change. */
  onZoomChange?: (range: { start: number; end: number } | null) => void;
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
  zoomRange,
  onZoomChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef<number>(0);
  const dragStartRange = useRef<{ start: number; end: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const sortedFull = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    if (zoomRange) {
      return sorted.filter((e) => e.timestamp >= zoomRange.start && e.timestamp <= zoomRange.end);
    }
    return sorted;
  }, [history, zoomRange]);

  const sorted = sampleHistoryForChart(sortedFull, MAX_CHART_HISTORY_POINTS);

  // Définir fmtTime pour l'utiliser dans les hooks (déplacé avant les useCallback)
  const fmtTime = useCallback((ts: number) =>
    new Intl.DateTimeFormat(chartLocale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(ts),
  [chartLocale],
  );

  const fmtNum = useCallback((n: number) => Math.round(n).toLocaleString(chartLocale), [chartLocale]);

  // Calculer les bornes temporelles complètes pour le zoom
  const { fullMinTimestamp, fullMaxTimestamp } = useMemo(() => {
    const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
    return {
      fullMinTimestamp: sortedHistory[0]?.timestamp ?? 0,
      fullMaxTimestamp: sortedHistory[sortedHistory.length - 1]?.timestamp ?? 0,
    };
  }, [history]);

  // Gestion du zoom avec la molette
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (!onZoomChange || history.length === 0) return;
      e.preventDefault();

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const svgX = (mouseX / rect.width) * 400; // w = 400

      // Calculer le timestamp correspondant à la position de la souris
      const minT = sortedFull[0]?.timestamp ?? fullMinTimestamp;
      const maxT = sortedFull[sortedFull.length - 1]?.timestamp ?? fullMaxTimestamp;
      const tSpan = Math.max(maxT - minT, 1);
      const mouseTimestamp = minT + ((svgX - plot.x0) / plot.w) * tSpan;

      // Facteur de zoom (1.2x par tick)
      const zoomFactor = e.deltaY < 0 ? 0.8 : 1.2;

      const currentRange = zoomRange || { start: fullMinTimestamp, end: fullMaxTimestamp };
      const currentSpan = currentRange.end - currentRange.start;
      const newSpan = Math.max(currentSpan * zoomFactor, currentSpan * 0.01); // Limiter le zoom max

      // Calculer la nouvelle plage pour que mouseTimestamp reste à la même position
      const mouseRatio = (mouseTimestamp - currentRange.start) / currentSpan;
      let newStart = mouseTimestamp - mouseRatio * newSpan;
      let newEnd = newStart + newSpan;

      // Empêcher de sortir des données complètes
      if (newStart < fullMinTimestamp) {
        newStart = fullMinTimestamp;
        newEnd = Math.min(newStart + newSpan, fullMaxTimestamp);
      }
      if (newEnd > fullMaxTimestamp) {
        newEnd = fullMaxTimestamp;
        newStart = Math.max(newEnd - newSpan, fullMinTimestamp);
      }

      onZoomChange({ start: newStart, end: newEnd });
    },
    [zoomRange, history, sortedFull, fullMinTimestamp, fullMaxTimestamp, onZoomChange],
  );

  // Gestion du drag pour pan
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Uniquement clic gauche
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartRange.current = zoomRange || null;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [zoomRange]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isDragging || !onZoomChange || history.length === 0) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dxPx = e.clientX - dragStartX.current;

      const baseRange = dragStartRange.current || {
        start: fullMinTimestamp,
        end: fullMaxTimestamp,
      };

      const currentSpan = baseRange.end - baseRange.start;
      const dxTime = (dxPx / rect.width) * 400 * (currentSpan / plot.w); // w = 400

      let newStart = baseRange.start - dxTime;
      let newEnd = baseRange.end - dxTime;

      // Empêcher de sortir des données
      if (newStart < fullMinTimestamp) {
        newEnd += fullMinTimestamp - newStart;
        newStart = fullMinTimestamp;
      }
      if (newEnd > fullMaxTimestamp) {
        newStart -= newEnd - fullMaxTimestamp;
        newEnd = fullMaxTimestamp;
      }

      onZoomChange({ start: newStart, end: newEnd });
    },
    [isDragging, onZoomChange, fullMinTimestamp, fullMaxTimestamp, history.length],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  // Formater la plage de zoom actuelle pour l'affichage
  const zoomRangeText = useMemo(() => {
    if (!zoomRange) return null;
    const start = new Date(zoomRange.start);
    const end = new Date(zoomRange.end);
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
      return `${fmtTime(zoomRange.start)} - ${new Intl.DateTimeFormat(chartLocale, {
        hour: '2-digit',
        minute: '2-digit',
      }).format(zoomRange.end)}`;
    }
    return `${fmtTime(zoomRange.start)} - ${fmtTime(zoomRange.end)}`;
  }, [zoomRange, chartLocale, fmtTime]);

  if (sorted.length < 2) {
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">{label}</p>
        <p className="text-xs text-fg-faint mb-2" role="status">
          {sorted.length === 0 ? emptyHint : 'Pas assez de données pour cette plage'}
        </p>
        {zoomRange && onZoomChange && (
          <button
            type="button"
            onClick={() => onZoomChange(null)}
            className="text-xs text-primary hover:text-primary-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring rounded px-2 py-1"
          >
            Réinitialiser le zoom
          </button>
        )}
      </div>
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
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
          {zoomRangeText && (
            <span className="text-xs text-fg-faint" aria-live="polite">
              {zoomRangeText}
            </span>
          )}
          {zoomRange && onZoomChange && (
            <button
              type="button"
              onClick={() => onZoomChange(null)}
              className="text-xs text-primary hover:text-primary-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring rounded px-2 py-1 transition-colors"
              aria-label="Réinitialiser le zoom"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

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
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        className={`w-full max-w-xl h-32 ${strokeClass} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        role="img"
        aria-label={label}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
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

      <p className="text-xs text-fg-faint mt-1">
        Ctrl + molette pour zoomer • Glisser pour se déplacer
      </p>
    </div>
  );
};
