export type ExportBarMode = 'placed' | 'remaining';

type ExportOpts = {
  name: string;
  code: string;
  placed: number;
  total: number;
  url: string;
  titleLine: string;
  barMode: ExportBarMode;
  /** Dimensions de la grille (optionnel) */
  rows?: number;
  cols?: number;
};

export function exportProgressPng({
  name,
  code,
  placed,
  total,
  url,
  titleLine,
  barMode,
  rows,
  cols,
}: ExportOpts): void {
  const canvas = document.createElement('canvas');
  // Taille augmentée pour meilleure qualité (format Twitter/Facebook)
  const w = 1200;
  const h = 630;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Configuration des couleurs
  const colors = {
    bg: '#f8fafc',
    primary: '#4f46e5',
    primaryLight: '#e0e7ff',
    primaryDark: '#3730a3',
    secondary: '#ea580c',
    secondaryLight: '#ffedd5',
    text: '#1e293b',
    textMuted: '#64748b',
    border: '#e2e8f0',
  };

  // Fond avec dégradé subtil
  const bgGradient = ctx.createLinearGradient(0, 0, 0, h);
  bgGradient.addColorStop(0, '#ffffff');
  bgGradient.addColorStop(1, '#f1f5f9');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  // Bordure décorative
  ctx.strokeStyle = colors.primaryLight;
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, w, h);

  const padding = 60;
  let currentY = padding;

  // ===== HEADER avec logo =====
  const logoSize = 64;
  const logoY = currentY;

  // Cercle du logo
  ctx.fillStyle = colors.primaryLight;
  ctx.beginPath();
  ctx.arc(padding + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
  ctx.fill();

  // Emoji puzzle
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🧩', padding + logoSize / 2, logoY + logoSize / 2);

  // Titre du puzzle
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = colors.text;
  ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
  const title = name.length > 40 ? `${name.slice(0, 37)}…` : name;
  ctx.fillText(title, padding + logoSize + 30, logoY + 28);

  // Code du puzzle
  ctx.fillStyle = colors.textMuted;
  ctx.font = '16px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Code: ${code}`, padding + logoSize + 30, logoY + 54);

  currentY = logoY + logoSize + 40;

  // ===== BARRE DE PROGRESSION =====
  const barHeight = 24;
  const barWidth = w - padding * 2;
  const pct = total > 0 ? placed / total : 0;
  const remaining = Math.max(0, total - placed);
  const remPct = total > 0 ? remaining / total : 0;

  // Label de progression
  ctx.textAlign = 'left';
  ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = colors.textMuted;
  ctx.fillText('Progression', padding, currentY - 10);

  // Fond de la barre
  if (barMode === 'placed') {
    ctx.fillStyle = colors.primaryLight;
  } else {
    ctx.fillStyle = colors.secondaryLight;
  }
  ctx.beginPath();
  ctx.roundRect(padding, currentY, barWidth, barHeight, 12);
  ctx.fill();

  // Progression
  if (barMode === 'placed') {
    ctx.fillStyle = colors.primary;
    ctx.beginPath();
    ctx.roundRect(padding, currentY, Math.max(12, barWidth * pct), barHeight, 12);
    ctx.fill();
  } else {
    ctx.fillStyle = colors.secondary;
    ctx.beginPath();
    ctx.roundRect(padding, currentY, Math.max(12, barWidth * remPct), barHeight, 12);
    ctx.fill();
  }

  // Pourcentage au centre de la barre
  const pctText = `${Math.round(pct)}%`;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(pctText, padding + barWidth / 2, currentY + 17);

  currentY += barHeight + 30;

  // ===== STATS EN CARTES =====
  const stats = [
    {
      label: 'Pièces placées',
      value: placed.toLocaleString('fr-FR'),
      color: colors.primary,
    },
    {
      label: 'Restantes',
      value: remaining.toLocaleString('fr-FR'),
      color: colors.secondary,
    },
    {
      label: 'Total',
      value: total.toLocaleString('fr-FR'),
      color: colors.textMuted,
    },
  ];

  if (rows && cols) {
    stats.push({
      label: 'Grille',
      value: `${rows} × ${cols}`,
      color: colors.textMuted,
    });
  }

  const cardWidth = (w - padding * 2 - 20 * (stats.length - 1)) / stats.length;
  const cardHeight = 90;

  stats.forEach((stat, idx) => {
    const cardX = padding + idx * (cardWidth + 20);

    // Fond de la carte
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cardX, currentY, cardWidth, cardHeight, 12);
    ctx.fill();

    // Bordure supérieure colorée
    ctx.fillStyle = stat.color;
    ctx.beginPath();
    ctx.roundRect(cardX, currentY, cardWidth, 4, [12, 12, 0, 0]);
    ctx.fill();

    // Label
    ctx.fillStyle = colors.textMuted;
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stat.label, cardX + cardWidth / 2, currentY + 30);

    // Valeur
    ctx.fillStyle = colors.text;
    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
    ctx.fillText(stat.value, cardX + cardWidth / 2, currentY + 60);
  });

  currentY += cardHeight + 40;

  // ===== DESCRIPTION ET LIEN =====
  ctx.fillStyle = colors.textMuted;
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(titleLine, w / 2, currentY);

  currentY += 25;

  // URL tronquée si nécessaire
  ctx.fillStyle = colors.primary;
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  const displayUrl = url.length > 60 ? `${url.slice(0, 57)}…` : url;
  ctx.fillText(displayUrl, w / 2, currentY);

  // ===== FOOTER =====
  const footerY = h - 40;
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  ctx.fillRect(0, footerY, w, 40);

  ctx.fillStyle = colors.textMuted;
  ctx.font = '13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Généré avec Mister Puzzle — misterpuzzle.app', w / 2, footerY + 25);

  // Export
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mister-puzzle-${code}.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}
