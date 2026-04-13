import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyThemeClass,
  getThemePreference,
  resolveTheme,
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getThemePreference());
  const [effective, setEffective] = useState<'light' | 'dark'>(() => resolveTheme(getThemePreference()));

  useLayoutEffect(() => {
    /* Aligne l’état React sur le thème appliqué au <html> (anti-flash + hydratation). */
    /* eslint-disable react-hooks/set-state-in-effect */
    const eff = resolveTheme(preference);
    setEffective(eff);
    applyThemeClass(eff);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const eff = resolveTheme('system');
      setEffective(eff);
      applyThemeClass(eff);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

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
