import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LabelsProvider } from '@mister-guiiug/dev-pwa-config/react/labels';
import type { Locale } from './localeStorage';
import { getLocalePref, setLocalePref } from './localeStorage';
import { translate } from './messages';

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  numberLocale: string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getLocalePref());

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setLocalePref(next);
  }, []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const numberLocale = locale === 'en' ? 'en-US' : 'fr-FR';

  const value = useMemo(
    () => ({ locale, setLocale, t, numberLocale }),
    [locale, setLocale, t, numberLocale]
  );

  // LES LIBELLÉS DU SOCLE SUIVENT LA LANGUE DE L'APP, et rien de plus.
  //
  // Sans ce provider, les composants partagés retombent sur le FRANÇAIS :
  // le « Mise à jour… » transitoire du bandeau, la croix d'une feuille, les
  // boutons d'une confirmation. Chaque écran le contournait en passant ses
  // propres libellés — six composants du socle sont montés ici, et seul
  // celui de la mise à jour était couvert.
  return (
    <I18nContext.Provider value={value}>
      <LabelsProvider locale={locale}>{children}</LabelsProvider>
    </I18nContext.Provider>
  );
}

/** Hook consommateur du provider i18n. */
// eslint-disable-next-line react-refresh/only-export-components -- hook pairé à I18nProvider
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
