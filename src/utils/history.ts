import { reportError } from './reportError';

export interface HistoryPuzzle {
  code: string;
  name: string;
  timestamp: number;
}

const HISTORY_KEY = 'mister_puzzle_history';
const MAX_HISTORY = 3;

export const getHistory = (): HistoryPuzzle[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    reportError('getHistory', err, {});
    return [];
  }
};

export const saveToHistory = (code: string, name: string) => {
  try {
    const history = getHistory();
    const newEntry: HistoryPuzzle = { code: code.toUpperCase(), name, timestamp: Date.now() };

    const filtered = history.filter(p => p.code !== newEntry.code);
    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    reportError('saveToHistory', err, {});
  }
};

export const removeFromHistory = (code: string) => {
  try {
    const history = getHistory();
    const updated = history.filter(p => p.code !== code.toUpperCase());
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch (err) {
    reportError('removeFromHistory', err, {});
  }
};

