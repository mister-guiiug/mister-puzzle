import type { PseudoStatRow } from './pseudoStats';

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type PseudoStatsCsvLabels = {
  pseudo: string;
  pieces24h: string;
  maxSingle: string;
  maxStreak: string;
  updates: string;
};

export function downloadPseudoStatsCsv(
  rows: PseudoStatRow[],
  fileBaseName: string,
  labels: PseudoStatsCsvLabels,
  anonLabel: string,
): void {
  const header = [
    labels.pseudo,
    labels.pieces24h,
    labels.maxSingle,
    labels.maxStreak,
    labels.updates,
  ];
  const lines = [
    header.map(escapeCsvCell).join(','),
    ...rows.map((row) =>
      [
        row.pseudoKey ? row.pseudoKey : anonLabel,
        String(row.piecesInWindow),
        String(row.maxSingleDelta),
        String(row.maxConsecutiveDelta),
        String(row.positiveUpdatesInWindow),
      ]
        .map(escapeCsvCell)
        .join(','),
    ),
  ];
  const csv = `\ufeff${lines.join('\n')}`;
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `${fileBaseName}-stats-pseudo-24h.csv`,
  );
}
