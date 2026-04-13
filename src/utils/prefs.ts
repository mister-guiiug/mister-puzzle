const READ_ONLY_KEY = 'mister_puzzle_read_only';

export const getReadOnlyMode = (): boolean => localStorage.getItem(READ_ONLY_KEY) === 'true';

export const setReadOnlyMode = (readOnly: boolean): void => {
  localStorage.setItem(READ_ONLY_KEY, readOnly ? 'true' : 'false');
};
