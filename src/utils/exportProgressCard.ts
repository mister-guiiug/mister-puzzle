export type ExportBarMode = 'placed' | 'remaining';

type ExportOpts = {
  name: string;
  code: string;
  placed: number;
  total: number;
  url: string;
  titleLine: string;
  /** Ligne sous le titre (résumé chiffré selon la préférence utilisateur). */
  summaryLine: string;
  barMode: ExportBarMode;
};

export function exportProgressPng({
  name,
  code,
  placed,
  total,
  url,
  titleLine,
  summaryLine,
  barMode,
}: ExportOpts): void {
  const canvas = document.createElement('canvas');
  const w = 640;
  const h = 360;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#4f46e5';
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  const title = name.length > 42 ? `${name.slice(0, 40)}…` : name;
  ctx.fillText(title, 36, 52);

  ctx.fillStyle = '#64748b';
  ctx.font = '15px system-ui, -apple-system, sans-serif';
  ctx.fillText(summaryLine, 36, 82);

  const barY = 102;
  const barH = 18;
  const barW = w - 72;
  const pct = total > 0 ? placed / total : 0;
  const remaining = Math.max(0, total - placed);
  const remPct = total > 0 ? remaining / total : 0;

  if (barMode === 'placed') {
    ctx.fillStyle = '#e0e7ff';
    ctx.beginPath();
    ctx.roundRect(36, barY, barW, barH, 9);
    ctx.fill();
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.roundRect(36, barY, Math.max(8, barW * pct), barH, 9);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ffedd5';
    ctx.beginPath();
    ctx.roundRect(36, barY, barW, barH, 9);
    ctx.fill();
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.roundRect(36, barY, Math.max(8, barW * remPct), barH, 9);
    ctx.fill();
  }

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.fillText(titleLine, 36, 150);

  const maxLine = 76;
  let y = 178;
  for (let i = 0; i < url.length; i += maxLine) {
    ctx.fillText(url.slice(i, i + maxLine), 36, y);
    y += 22;
    if (y > h - 24) break;
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mister-puzzle-${code}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}
