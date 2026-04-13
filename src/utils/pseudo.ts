const PSEUDO_KEY = 'mister_puzzle_pseudo';
const PSEUDO_LOCKED_KEY = 'mister_puzzle_pseudo_locked';
const GRID_LOCKED_KEY = 'mister_puzzle_grid_locked';
const GRID_ROWS_KEY = 'mister_puzzle_grid_rows';
const GRID_COLS_KEY = 'mister_puzzle_grid_cols';
/** @deprecated lecture seule pour migration */
const INPUT_MODE_KEY = 'mister_puzzle_input_mode';
const INPUT_MODES_BY_PSEUDO_KEY = 'mister_puzzle_input_modes_by_pseudo';
const SESSION_KEY = 'mister_puzzle_session';

function pseudoStorageKey(pseudo: string): string {
  const t = pseudo.trim();
  return t || '__anon__';
}

function parseInputModesByPseudo(): Record<string, 'placed' | 'remaining'> {
  try {
    const raw = localStorage.getItem(INPUT_MODES_BY_PSEUDO_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, 'placed' | 'remaining'> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === 'placed' || v === 'remaining') out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export const getPseudo = (): string =>
  localStorage.getItem(PSEUDO_KEY) ?? '';

export const setPseudo = (pseudo: string): void => {
  localStorage.setItem(PSEUDO_KEY, pseudo.trim());
};

export const isPseudoLocked = (): boolean =>
  localStorage.getItem(PSEUDO_LOCKED_KEY) === 'true';

export const setPseudoLocked = (locked: boolean): void => {
  localStorage.setItem(PSEUDO_LOCKED_KEY, locked ? 'true' : 'false');
};

export const isGridLocked = (): boolean =>
  localStorage.getItem(GRID_LOCKED_KEY) === 'true';

export const setGridLocked = (locked: boolean): void => {
  localStorage.setItem(GRID_LOCKED_KEY, locked ? 'true' : 'false');
};

export const getSavedGrid = (): { rows: number; cols: number } | null => {
  const r = parseInt(localStorage.getItem(GRID_ROWS_KEY) ?? '', 10);
  const c = parseInt(localStorage.getItem(GRID_COLS_KEY) ?? '', 10);
  if (isNaN(r) || isNaN(c)) return null;
  return { rows: r, cols: c };
};

export const saveGrid = (rows: number, cols: number): void => {
  localStorage.setItem(GRID_ROWS_KEY, String(rows));
  localStorage.setItem(GRID_COLS_KEY, String(cols));
};

/** Préférence d'affichage du compteur (placées vs restantes), par pseudo (navigateur). */
export const getInputMode = (pseudo: string): 'placed' | 'remaining' => {
  const key = pseudoStorageKey(pseudo);
  const byPseudo = parseInputModesByPseudo();
  const stored = byPseudo[key];
  if (stored) return stored;
  const legacy = localStorage.getItem(INPUT_MODE_KEY);
  return legacy === 'remaining' ? 'remaining' : 'placed';
};

export const setInputModePreference = (pseudo: string, mode: 'placed' | 'remaining'): void => {
  const key = pseudoStorageKey(pseudo);
  const byPseudo = parseInputModesByPseudo();
  byPseudo[key] = mode;
  localStorage.setItem(INPUT_MODES_BY_PSEUDO_KEY, JSON.stringify(byPseudo));
};

/** Unique per-browser-tab ID used for member presence tracking. */
export const getSessionId = (): string => {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = Math.random().toString(36).substring(2, 12);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
};
