export type Locale = 'fr' | 'en';

const KEY = 'mister_puzzle_locale';

export const getLocalePref = (): Locale => (localStorage.getItem(KEY) === 'en' ? 'en' : 'fr');

export const setLocalePref = (locale: Locale): void => {
  localStorage.setItem(KEY, locale);
};
