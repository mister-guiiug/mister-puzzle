import { createContext, useContext, type ReactNode } from 'react';
import {
  useTheme as useDwcTheme,
  type ThemePreference,
  type UseTheme,
} from '@mister-guiiug/dev-pwa-config/react/use-theme';

export type { ThemePreference };

const ThemeContext = createContext<UseTheme | null>(null);

/**
 * Le thème de l'app, bâti sur `react/use-theme` du socle.
 *
 * CE QUI DISPARAÎT. `themeStorage.ts` et ce fichier tenaient à la main la
 * lecture et l'écriture de la préférence, l'abonnement à `matchMedia` par
 * `useSyncExternalStore`, la résolution `system → light|dark`, et la pose de
 * la classe `dark` et de `color-scheme` sur `<html>`. Le socle fait les
 * quatre : `useTheme({ storageKey, attribute: 'class' })` écrit exactement la
 * même classe et le même `style.colorScheme` qu'`applyThemeClass` posait.
 *
 * MÊME CLÉ, MÊME ATTRIBUT. `mister_puzzle_theme` reste la clé : rien à
 * migrer, et l'IIFE anti-FOUC d'`index.html` — qui la lit avant tout rendu
 * pour poser `.dark` — reste juste. Les jetons d'`index.css` sont définis
 * sous `html.dark`, et la variante `dark` de Tailwind aussi : l'attribut
 * reste la classe, pas `data-theme`.
 *
 * UN SEUL APPEL AU HOOK, ICI. Le hook du socle porte son état dans un
 * `useState` local : deux appels feraient deux états qui écrivent tous deux
 * `<html>`. Ce contexte le partage — un seul écrivain côté React, l'IIFE
 * étant l'autre, avant tout rendu.
 *
 * POURQUOI PAS `react/theme-provider`, QUI FAIT LA MÊME CHOSE. Il charge le
 * catalogue des dix-sept palettes (`themes.js`, 22 ko bruts) par un
 * `import()` paresseux — que le `manualChunks` de `vite.config.ts` range,
 * comme tout ce qui vient de `node_modules`, dans `vendor`, un morceau
 * STATIQUE référencé par `index.html`. Mesuré : +4,7 kB gzip préchargés pour
 * zéro variable peinte, l'app ayant ses propres jetons. Le hook seul n'y
 * touche pas.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useDwcTheme({
    storageKey: 'mister_puzzle_theme',
    attribute: 'class',
  });
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** L'état du thème, PARTAGÉ, tel que le tient `ThemeProvider`. */
// eslint-disable-next-line react-refresh/only-export-components -- hook pairé à ThemeProvider
export function useTheme(): UseTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
