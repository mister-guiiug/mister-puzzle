const PSEUDO_KEY = 'mister_puzzle_pseudo';
const PSEUDO_LOCKED_KEY = 'mister_puzzle_pseudo_locked';
const SESSION_KEY = 'mister_puzzle_session';

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

/** Unique per-browser-tab ID used for member presence tracking. */
export const getSessionId = (): string => {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = Math.random().toString(36).substring(2, 12);
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
};
