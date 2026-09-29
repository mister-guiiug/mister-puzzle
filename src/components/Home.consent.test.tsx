import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  isAnalyticsLoaded,
  resetAnalytics,
} from '@mister-guiiug/dev-pwa-config/analytics';
import {
  readConsentChoice,
  writeConsentChoice,
} from '@mister-guiiug/dev-pwa-config/react/consent-banner';
import { CLE_DE_TEST } from '@mister-guiiug/dev-pwa-config/testing/posthog';
import { I18nProvider } from '../i18n/I18nContext';
import Home from './Home';

/**
 * RETIRER SON CONSENTEMENT DOIT ÊTRE AUSSI SIMPLE QUE LE DONNER (RGPD, art.
 * 7.3). Au relevé du 29/09/2026, une fois le bandeau répondu, plus rien dans
 * l'app ne permettait de revenir sur son choix. Faute d'écran Réglages, le
 * chemin du retour passe par le pied de l'accueil : ces tests le tiennent
 * jusqu'à la bibliothèque de mesure.
 */

// L'accord rejoué au montage charge la bibliothèque : la vraie partirait
// interroger PostHog depuis jsdom. Le double du socle se souvient du retrait.
vi.mock('posthog-js/dist/module.slim.js', async () => {
  const { fauxPosthog } =
    await import('@mister-guiiug/dev-pwa-config/testing/posthog');
  return { default: fauxPosthog() };
});

vi.mock('../utils/loadDashboard', () => ({
  loadDashboard: vi.fn(() => Promise.resolve({})),
}));

// `__BMAC_URL__` est un `define` de `vite.config.ts` ; `vitest.config.ts` ne le
// reprend pas, et `Home` le lit au rendu.
vi.stubGlobal('__BMAC_URL__', 'https://example.invalid');

vi.mock('../hooks/useSocket', () => ({
  createPuzzle: vi.fn(),
  joinPuzzle: vi.fn(),
  hashPassword: async () => 'hash',
}));

beforeEach(() => {
  // Le setup partagé ne vide pas le stockage : un choix laissé par un test
  // serait relu par le suivant. Sans langue mémorisée, l'app parle français.
  localStorage.clear();
  vi.stubEnv('VITE_POSTHOG_KEY', CLE_DE_TEST);
  // L'état de la mesure est celui d'un module : sans remise à zéro, la
  // bibliothèque resterait « chargée » d'un test à l'autre.
  resetAnalytics();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function monter() {
  render(
    <I18nProvider>
      <Home onJoin={() => {}} pseudo="Zoé" />
    </I18nProvider>
  );
}

describe('Home — mesure d’audience', () => {
  it('l’accueil permet de retirer son consentement, en un clic', async () => {
    writeConsentChoice('granted');
    monter();

    const titre = await screen.findByRole('heading', {
      name: 'Mesure d’audience',
    });
    const section = titre.closest('section') as HTMLElement;
    expect(within(section).getByRole('status')).toHaveTextContent(
      'Vous avez accepté cette mesure.'
    );
    // L'accord rejoué au montage a chargé la bibliothèque — le double.
    await waitFor(() => expect(isAnalyticsLoaded()).toBe(true));
    const posthog = (await import('posthog-js/dist/module.slim.js')).default;
    expect(posthog.has_opted_out_capturing()).toBe(false);

    fireEvent.click(
      within(section).getByRole('button', {
        name: 'Retirer mon consentement',
      })
    );

    expect(readConsentChoice()).toBe('denied');
    // Le clic est PARVENU à la bibliothèque, pas seulement au libellé.
    expect(posthog.has_opted_out_capturing()).toBe(true);
    expect(within(section).getByRole('status')).toHaveTextContent(
      'Vous avez refusé cette mesure.'
    );
  });

  it('parle la langue choisie au pied de l’accueil', async () => {
    localStorage.setItem('mister_puzzle_locale', 'en');
    writeConsentChoice('granted');
    monter();

    const titre = await screen.findByRole('heading', {
      name: 'Audience measurement',
    });
    const section = titre.closest('section') as HTMLElement;
    expect(within(section).getByRole('status')).toHaveTextContent(
      'You have accepted this measurement.'
    );
    expect(
      within(section).getByRole('button', { name: 'Withdraw my consent' })
    ).toBeInTheDocument();
  });
});
