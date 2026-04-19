import type { FC } from 'react';
import type { HistoryEntry } from '../hooks/useSocket';
import { MAX_CHART_HISTORY_POINTS, sampleHistoryForChart } from '../utils/chartSample';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

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
const MIN_SELECTION_PX = 20; // Distance minimale pour valider la sélection (augmenté pour mobile)
const DOUBLE_TAP_MS = 300; // Délai max pour détecter un double-tap

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
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pour le double-tap et le pinch-to-zoom
  const lastTapRef = useRef<number>(0);
  const initialPinchDistanceRef = useRef<number>(0);
  const initialZoomRangeRef = useRef<{ start: number; end: number } | null>(null);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sortedFull = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
    if (zoomRange) {
      return sorted.filter((e) => e.timestamp >= zoomRange.start && e.timestamp <= zoomRange.end);
    }
    return sorted;
  }, [history, zoomRange]);

  const sorted = sampleHistoryForChart(sortedFull, MAX_CHART_HISTORY_POINTS);

  // Tous les hooks doivent être appelés avant tout return conditionnel
  const fmtTime = useCallback(
    (ts: number) =>
      new Intl.DateTimeFormat(chartLocale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(ts),
    [chartLocale],
  );

  const fmtNum = useCallback(
    (n: number) => Math.round(n).toLocaleString(chartLocale),
    [chartLocale],
  );

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

  // Calculer les bornes temporelles complètes pour le zoom mobile
  const fullTimeRange = useMemo(() => {
    const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
    return {
      start: sortedHistory[0]?.timestamp ?? 0,
      end: sortedHistory[sortedHistory.length - 1]?.timestamp ?? 0,
    };
  }, [history]);

  // Calculer les bornes temporelles et valeurs pour le graphique
  const chartData = useMemo(() => {
    if (sorted.length < 2) return null;

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

    return { w, h, x0, y0, pw, ph, maxY, minT, maxT, tSpan, yTickVals, coords, linePoints, first, last, areaPoints };
  }, [sorted, totalPieces, metric]);

  // Convertir position X en timestamp
  const xToTimestamp = useCallback(
    (x: number) => {
      if (!chartData) return 0;
      const { x0, pw, minT, tSpan } = chartData;
      const clampedX = Math.max(x0, Math.min(x0 + pw, x));
      return minT + ((clampedX - x0) / pw) * tSpan;
    },
    [chartData],
  );

  // Zoom mobile : zoomer autour d'un centre
  const zoomMobile = useCallback(
    (factor: number, centerX?: number) => {
      if (!onZoomChange || history.length === 0) return;

      const currentRange = zoomRange || fullTimeRange;
      const currentSpan = currentRange.end - currentRange.start;
      const newSpan = Math.max(currentSpan * factor, currentSpan * 0.05); // Zoom limité à 5% de la plage totale

      let centerTimestamp: number;
      if (centerX !== undefined && chartData) {
        // Centrer sur la position donnée
        centerTimestamp = xToTimestamp(centerX);
      } else {
        // Centrer sur le milieu de la plage actuelle
        centerTimestamp = currentRange.start + currentSpan / 2;
      }

      const newStart = Math.max(fullTimeRange.start, centerTimestamp - (newSpan / 2));
      const newEnd = Math.min(fullTimeRange.end, centerTimestamp + (newSpan / 2));

      // Ajuster si on a atteint les limites
      let finalStart = newStart;
      let finalEnd = newEnd;
      if (newEnd - newStart < newSpan) {
        if (newStart === fullTimeRange.start) {
          finalEnd = newStart + newSpan;
        } else if (newEnd === fullTimeRange.end) {
          finalStart = newEnd - newSpan;
        }
      }

      onZoomChange({ start: finalStart, end: finalEnd });
    },
    [onZoomChange, zoomRange, fullTimeRange, history.length, chartData, xToTimestamp],
  );

  // Gestion du début de sélection (pointer down)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.pointerType === 'touch' && e.isPrimary) {
        // Gestion du double-tap sur mobile
        const now = Date.now();
        if (now - lastTapRef.current < DOUBLE_TAP_MS) {
          // Double-tap détecté : réinitialiser le zoom
          onZoomChange?.(null);
          lastTapRef.current = 0;
          e.preventDefault();
          return;
        }
        lastTapRef.current = now;
      }

      if (e.button !== 0 && e.pointerType !== 'touch') return; // Clic gauche ou touch
      if (!onZoomChange || history.length === 0 || !chartData) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const svgX = (x / rect.width) * chartData.w;

      // Vérifier si on clique dans la zone du graphique
      if (svgX < chartData.x0 || svgX > chartData.x0 + chartData.pw) return;

      setIsSelecting(true);
      setSelectionStart(svgX);
      setSelectionEnd(svgX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // Sur mobile, empêcher le scroll pendant la sélection
      if (e.pointerType === 'touch') {
        e.preventDefault();
      }
    },
    [onZoomChange, history.length, chartData],
  );

  // Gestion du déplacement pendant la sélection
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isSelecting || !chartData) return;

      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const svgX = Math.max(chartData.x0, Math.min(chartData.x0 + chartData.pw, (x / rect.width) * chartData.w));
      setSelectionEnd(svgX);
    },
    [isSelecting, chartData],
  );

  // Gestion de la fin de sélection
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isSelecting || selectionStart === null || selectionEnd === null) {
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionEnd(null);
        return;
      }

      (e.target as HTMLElement).releasePointerCapture(e.pointerId);

      const start = Math.min(selectionStart, selectionEnd);
      const end = Math.max(selectionStart, selectionEnd);

      // Ignorer si la sélection est trop petite
      if (end - start < MIN_SELECTION_PX) {
        setIsSelecting(false);
        setSelectionStart(null);
        setSelectionEnd(null);
        return;
      }

      // Calculer la plage de temps correspondante
      const startTime = xToTimestamp(start);
      const endTime = xToTimestamp(end);

      onZoomChange?.({ start: startTime, end: endTime });

      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    },
    [isSelecting, selectionStart, selectionEnd, xToTimestamp, onZoomChange],
  );

  // Gestion du touch pour pinch-to-zoom
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 2) {
        // Pinch-to-zoom : deux doigts
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

        initialPinchDistanceRef.current = distance;
        initialZoomRangeRef.current = zoomRange || null;

        // Empêcher le scroll
        e.preventDefault();
      }
    },
    [zoomRange],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 2 && initialPinchDistanceRef.current > 0) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

        const factor = initialPinchDistanceRef.current / distance;
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect && chartData) {
          const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
          const svgCenterX = (centerX / rect.width) * chartData.w;

          // Utiliser la plage initiale comme base
          const baseRange = initialZoomRangeRef.current || fullTimeRange;
          const baseSpan = baseRange.end - baseRange.start;

          // Calculer la nouvelle plage
          const newSpan = Math.max(baseSpan * factor, fullTimeRange.end - fullTimeRange.start * 0.05);

          // Trouver le centre en timestamp
          const centerTimestamp = xToTimestamp(svgCenterX);

          // Calculer les nouvelles bornes
          let newStart = Math.max(fullTimeRange.start, centerTimestamp - (newSpan / 2));
          let newEnd = Math.min(fullTimeRange.end, centerTimestamp + (newSpan / 2));

          // Ajuster si nécessaire
          if (newEnd - newStart < newSpan) {
            if (newStart === fullTimeRange.start) {
              newEnd = newStart + newSpan;
            } else if (newEnd === fullTimeRange.end) {
              newStart = newEnd - newSpan;
            }
          }

          onZoomChange?.({ start: newStart, end: newEnd });
        }

        e.preventDefault();
      }
    },
    [chartData, fullTimeRange, onZoomChange, xToTimestamp],
  );

  const handleTouchEnd = useCallback(() => {
    initialPinchDistanceRef.current = 0;
    initialZoomRangeRef.current = null;
  }, []);

  // Calculer les coordonnées du rectangle de sélection
  const selectionRect = useMemo(() => {
    if (!isSelecting || selectionStart === null || selectionEnd === null || !chartData) return null;
    const start = Math.min(selectionStart, selectionEnd);
    const end = Math.max(selectionStart, selectionEnd);
    return {
      x: start,
      y: chartData.y0,
      width: end - start,
      height: chartData.ph,
    };
  }, [isSelecting, selectionStart, selectionEnd, chartData]);

  const tableRows = useMemo(() => sortedFull.slice(-12).reverse(), [sortedFull]);

  // Affichage si pas assez de données
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

  // chartData est garanti non-null ici
  const { w, h, x0, y0, pw, ph, maxY, minT, maxT, yTickVals, coords, linePoints, areaPoints } = chartData!;

  const strokeClass = metric === 'placed' ? 'text-primary-muted' : 'text-warm-muted';
  const gridClass = 'text-divide-strong';

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-xs font-semibold text-fg-muted uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1 sm:gap-2">
          {zoomRangeText && (
            <span className="text-xs text-fg-faint truncate max-w-[120px] sm:max-w-none" aria-live="polite">
              {zoomRangeText}
            </span>
          )}
          {/* Boutons de zoom sur mobile */}
          {isMobile && onZoomChange && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => zoomMobile(1.5)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface border border-divide text-fg-muted hover:text-fg hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring text-sm font-bold"
                aria-label="Zoom arrière"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => zoomMobile(0.7)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface border border-divide text-fg-muted hover:text-fg hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring text-sm font-bold"
                aria-label="Zoom avant"
              >
                +
              </button>
            </div>
          )}
          {zoomRange && onZoomChange && (
            <button
              type="button"
              onClick={() => onZoomChange(null)}
              className="text-xs text-primary hover:text-primary-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring rounded px-2 py-1 transition-colors whitespace-nowrap"
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
        className={`w-full max-w-xl h-32 ${strokeClass} ${isSelecting ? 'cursor-crosshair' : 'cursor-col-resize'} touch-none select-none`}
        role="img"
        aria-label={label}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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

        {/* Rectangle de sélection pendant le drag */}
        {selectionRect && (
          <rect
            x={selectionRect.x}
            y={selectionRect.y}
            width={selectionRect.width}
            height={selectionRect.height}
            fill="primary"
            fillOpacity={0.15}
            stroke="currentColor"
            strokeWidth={1}
            className="text-primary"
          />
        )}
      </svg>

      <p className="text-xs text-fg-faint mt-1">
        {isMobile ? (
          <>Glisser pour sélectionner • Pinch pour zoomer • Double-tap pour réinitialiser</>
        ) : (
          <>Glisser sur le graphique pour sélectionner une plage de temps</>
        )}
      </p>
    </div>
  );
};
