import type { Checkpoint, HistoryEntry, Member, Photo, PuzzleState } from '../hooks/useSocket';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function normalizePhotoEntry(key: string, val: unknown): Photo {
  if (typeof val === 'string') {
    return { id: key, data: val, rotation: 0 };
  }
  if (!isRecord(val)) {
    return { id: key, data: '', rotation: 0 };
  }
  return {
    id: key,
    data: typeof val.data === 'string' ? val.data : '',
    rotation: typeof val.rotation === 'number' ? val.rotation : 0,
    ...(typeof val.caption === 'string' ? { caption: val.caption } : {}),
    ...(typeof val.addedAt === 'number' ? { addedAt: val.addedAt } : {}),
    ...(typeof val.sortOrder === 'number' ? { sortOrder: val.sortOrder } : {}),
  };
}

function normalizeCheckpoints(raw: unknown): Checkpoint[] {
  if (!isRecord(raw)) return [];
  const out: Checkpoint[] = [];
  for (const v of Object.values(raw)) {
    if (!isRecord(v)) continue;
    if (typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.completed !== 'boolean') continue;
    const c: Checkpoint = { id: v.id, name: v.name, completed: v.completed };
    if (typeof v.createdBy === 'string') c.createdBy = v.createdBy;
    out.push(c);
  }
  return out;
}

function normalizeHistory(raw: unknown): HistoryEntry[] {
  if (!isRecord(raw)) return [];
  const out: HistoryEntry[] = [];
  for (const [key, v] of Object.entries(raw)) {
    if (!isRecord(v)) continue;
    if (typeof v.timestamp !== 'number' || typeof v.placedPieces !== 'number') continue;
    const e: HistoryEntry = { id: key, timestamp: v.timestamp, placedPieces: v.placedPieces };
    if (typeof v.pseudo === 'string') e.pseudo = v.pseudo;
    out.push(e);
  }
  return out;
}

/**
 * Convertit la valeur Firebase en `PuzzleState` sûr côté client.
 */
export function normalizePuzzleFromFirebase(data: unknown): PuzzleState {
  const raw = isRecord(data) ? data : {};

  const photosRaw = raw.photos;
  const photos: Photo[] = isRecord(photosRaw)
    ? Object.entries(photosRaw)
        .map(([key, val]) => normalizePhotoEntry(key, val))
        .sort((a, b) => {
          const ao = a.sortOrder ?? a.addedAt ?? 0;
          const bo = b.sortOrder ?? b.addedAt ?? 0;
          if (ao !== bo) return ao - bo;
          return a.id.localeCompare(b.id);
        })
    : [];

  const membersRaw = raw.members;
  let members: Record<string, Member> | undefined;
  if (isRecord(membersRaw)) {
    members = {};
    for (const [sid, m] of Object.entries(membersRaw)) {
      if (!isRecord(m)) continue;
      const pseudo = typeof m.pseudo === 'string' ? m.pseudo : '';
      const lastSeen = typeof m.lastSeen === 'number' ? m.lastSeen : 0;
      members[sid] = { pseudo, lastSeen };
    }
    if (Object.keys(members).length === 0) members = undefined;
  }

  return {
    ...raw,
    id: typeof raw.id === 'string' ? raw.id : '',
    name: typeof raw.name === 'string' ? raw.name : '',
    isPublic: typeof raw.isPublic === 'boolean' ? raw.isPublic : true,
    passwordHash: typeof raw.passwordHash === 'string' ? raw.passwordHash : undefined,
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : undefined,
    rows: typeof raw.rows === 'number' ? raw.rows : undefined,
    cols: typeof raw.cols === 'number' ? raw.cols : undefined,
    totalPieces: typeof raw.totalPieces === 'number' ? raw.totalPieces : 0,
    placedPieces: typeof raw.placedPieces === 'number' ? raw.placedPieces : 0,
    checkpoints: normalizeCheckpoints(raw.checkpoints),
    photos,
    history: normalizeHistory(raw.history),
    members,
  } as PuzzleState;
}
