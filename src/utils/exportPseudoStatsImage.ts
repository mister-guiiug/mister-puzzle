import type { PseudoStatRow } from './pseudoStats';

export type StatsImageFormat = 'square' | 'horizontal';
export type StatsImageLabels = {
  title: string;
  subtitle: string;
  pseudo: string;
  pieces: string;
  maxSingle: string;
  maxStreak: string;
  updates: string;
  period: string;
};

const DIMENSIONS = {
  square: { width: 1080, height: 1080 },
  horizontal: { width: 1200, height: 630 },
};

const COLORS = {
  bg: '#f8fafc',
  primary: '#4f46e5',
  primaryLight: '#e0e7ff',
  primaryDark: '#3730a3',
  text: '#1e293b',
  textMuted: '#64748b',
  border: '#e2e8f0',
  gold: '#fbbf24',
  silver: '#9ca3af',
  bronze: '#cd7f32',
  rowBg: ['#ffffff', '#f8fafc'],
};


function getRankColor(rank: number): string {
  if (rank === 1) return COLORS.gold;
  if (rank === 2) return COLORS.silver;
  if (rank === 3) return COLORS.bronze;
  return COLORS.primary;
}

function getRankEmoji(rank: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return '';
}

export function exportStatsImage(
  rows: PseudoStatRow[],
  puzzleName: string,
  periodLabel: string,
  labels: StatsImageLabels,
  format: StatsImageFormat = 'square',
  anonLabel: string = 'Anonyme',
  locale: string = 'fr-FR',
): void {
  const { width, height } = DIMENSIONS[format];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const formatter = new Intl.NumberFormat(locale);
  const maxRows = format === 'square' ? 5 : 4;
  const displayRows = rows.slice(0, maxRows);

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);

  // Header section
  const headerHeight = format === 'square' ? 220 : 140;
  const padding = format === 'square' ? 60 : 40;

  // Gradient header bar
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, COLORS.primaryDark);
  gradient.addColorStop(0.5, COLORS.primary);
  gradient.addColorStop(1, COLORS.primaryDark);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, headerHeight);

  // Logo/Circle
  const logoSize = format === 'square' ? 80 : 50;
  const logoY = format === 'square' ? 50 : 30;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.arc(width / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${format === 'square' ? 36 : 24}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('🧩', width / 2, logoY + logoSize / 2 + 12);

  // Title
  ctx.textAlign = 'center';
  ctx.font = `bold ${format === 'square' ? 28 : 20}px system-ui, -apple-system, sans-serif`;
  const truncatedName = puzzleName.length > (format === 'square' ? 35 : 50)
    ? puzzleName.slice(0, format === 'square' ? 32 : 47) + '…'
    : puzzleName;
  ctx.fillText(truncatedName, width / 2, logoY + logoSize + 50);

  // Subtitle
  ctx.font = `${format === 'square' ? 18 : 14}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(labels.subtitle.replace('{period}', periodLabel), width / 2, logoY + logoSize + 80);

  // Table section
  const tableY = headerHeight + 30;
  const rowHeight = format === 'square' ? 90 : 55;
  const colPadding = format === 'square' ? 20 : 12;

  // Table header
  const headerRowY = tableY;
  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  ctx.fillRect(padding, headerRowY - 10, width - padding * 2, rowHeight - 10);

  ctx.font = `bold ${format === 'square' ? 14 : 11}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textMuted;

  const colX = {
    rank: padding + colPadding,
    pseudo: padding + colPadding + (format === 'square' ? 60 : 40),
    pieces: width - padding - colPadding - (format === 'square' ? 180 : 120),
    details: width - padding - colPadding,
  };

  ctx.fillText(labels.pseudo.toUpperCase(), colX.pseudo, headerRowY + 15);
  ctx.fillText(labels.pieces.toUpperCase(), colX.pieces, headerRowY + 15);

  // Rows
  displayRows.forEach((row, idx) => {
    const rowY = tableY + 20 + idx * rowHeight;
    const rank = idx + 1;

    // Row background
    ctx.fillStyle = COLORS.rowBg[idx % 2];
    ctx.fillRect(padding - 10, rowY - 10, width - padding * 2 + 20, rowHeight - 15);

    // Rank
    ctx.textAlign = 'center';
    ctx.font = `bold ${format === 'square' ? 24 : 18}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = getRankColor(rank);
    const emoji = getRankEmoji(rank);
    if (emoji) {
      ctx.fillText(emoji, colX.rank + 20, rowY + 30);
    } else {
      ctx.fillText(String(rank), colX.rank + 20, rowY + 30);
    }

    // Pseudo
    ctx.textAlign = 'left';
    ctx.font = `${format === 'square' ? 18 : 14}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = COLORS.text;
    const displayName = row.pseudoKey ? row.pseudoKey : anonLabel;
    const truncatedPseudo = displayName.length > 15 ? displayName.slice(0, 12) + '…' : displayName;
    ctx.fillText(truncatedPseudo, colX.pseudo, rowY + 25);

    // Pieces (main stat)
    ctx.font = `bold ${format === 'square' ? 26 : 20}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = COLORS.primary;
    ctx.fillText(formatter.format(row.piecesInWindow), colX.pieces, rowY + 55);

    // Details (small stats)
    if (format === 'square') {
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(
        `Max: ${formatter.format(row.maxSingleDelta)} · Streak: ${formatter.format(row.maxConsecutiveDelta)}`,
        colX.pseudo,
        rowY + 80,
      );
    } else {
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(
        `↑${formatter.format(row.maxSingleDelta)}  🔥${formatter.format(row.maxConsecutiveDelta)}`,
        colX.pseudo,
        rowY + 45,
      );
    }
  });

  // Footer
  const footerY = height - (format === 'square' ? 50 : 35);
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, footerY, width, height - footerY);

  ctx.textAlign = 'center';
  ctx.font = `${format === 'square' ? 14 : 11}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('Mister Puzzle — misterpuzzle.app', width / 2, footerY + (format === 'square' ? 30 : 22));

  // Download
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const suffix = format === 'square' ? 'instagram' : 'twitter';
    a.download = `mister-puzzle-stats-${suffix}-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}
