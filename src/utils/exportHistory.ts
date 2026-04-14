import type { HistoryEntry } from '../hooks/useSocket';

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

/** Télécharge l’historique des pièces (plus récent en premier). */
export function downloadHistoryCsv(entries: HistoryEntry[], fileBaseName: string): void {
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  const header = ['timestamp_iso', 'placed_pieces', 'pseudo'];
  const lines = [
    header.join(','),
    ...sorted.map((e) =>
      [new Date(e.timestamp).toISOString(), String(e.placedPieces), e.pseudo ?? '']
        .map(escapeCsvCell)
        .join(','),
    ),
  ];
  const csv = `\ufeff${lines.join('\n')}`;
  triggerDownload(
    new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    `${fileBaseName}-history.csv`,
  );
}

export function downloadHistoryJson(entries: HistoryEntry[], fileBaseName: string): void {
  const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
  const json = JSON.stringify(sorted, null, 2);
  triggerDownload(
    new Blob([json], { type: 'application/json;charset=utf-8' }),
    `${fileBaseName}-history.json`,
  );
}
