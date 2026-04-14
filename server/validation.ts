/** Code salle : 4–12 caractères alphanumériques (insensible à la casse). */
export function normRoom(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const u = v.trim().toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(u) ? u : null;
}

export function validateCreate(data: unknown): { name: string; totalPieces: number } | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  const totalPieces = typeof o.totalPieces === 'number' ? o.totalPieces : NaN;
  if (name.length < 1 || name.length > 200) return null;
  if (!Number.isFinite(totalPieces) || totalPieces < 1 || totalPieces > 25_000_000) return null;
  return { name, totalPieces };
}
