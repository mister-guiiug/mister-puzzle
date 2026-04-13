export type ThemePreference = 'light' | 'dark' | 'system';

const THEME_KEY = 'mister_puzzle_theme';

export const getThemePreference = (): ThemePreference => {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* ignore */
  }
  return 'system';
};

export const setThemePreference = (value: ThemePreference): void => {
  try {
    localStorage.setItem(THEME_KEY, value);
  } catch {
    /* ignore */
  }
};

export const getSystemDark = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const resolveTheme = (pref: ThemePreference): 'light' | 'dark' => {
  if (pref === 'system') return getSystemDark() ? 'dark' : 'light';
  return pref;
};

export const applyThemeClass = (mode: 'light' | 'dark'): void => {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  document.documentElement.style.colorScheme = mode;
};
