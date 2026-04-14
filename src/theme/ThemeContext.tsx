import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  applyThemeClass,
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from './themeStorage';

type ThemeContextValue = {
  preference: ThemePreference;
  /** Thème réellement affiché après résolution « système ». */
  effective: 'light' | 'dark';
  setPreference: (value: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function subscribeSystemDark(onStoreChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getSystemDarkSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getThemePreference());
  const systemIsDark = useSyncExternalStore(
    subscribeSystemDark,
    getSystemDarkSnapshot,
    () => false,
  );

  const effective = useMemo<'light' | 'dark'>(() => {
    if (preference === 'system') return systemIsDark ? 'dark' : 'light';
    return preference;
  }, [preference, systemIsDark]);

  useLayoutEffect(() => {
    applyThemeClass(effective);
  }, [effective]);

  const setPreference = useCallback((value: ThemePreference) => {
    setThemePreference(value);
    setPreferenceState(value);
  }, []);

  const value = useMemo(
    () => ({ preference, effective, setPreference }),
    [preference, effective, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Préférence clair / sombre / système (à utiliser sous ThemeProvider). */
// eslint-disable-next-line react-refresh/only-export-components -- hook pairé à ThemeProvider
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
