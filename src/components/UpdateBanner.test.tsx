import { render, screen, fireEvent, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * CE QUE CES TESTS VERROUILLENT : que le bandeau PEUT s'afficher.
 *
 * `UpdatePromptBanner` ne s'affiche que si on lui injecte le `registerSW` de
 * `virtual:pwa-register`. Oublier cette prop ne casse ni la compilation, ni le
 * typage, ni le rendu : le bandeau reste simplement muet, pour toujours — un
 * piège dans lequel une app de la famille est déjà tombée. Le mock par défaut
 * du socle (`vitest-setup`) rend un `registerSW` qui n'appelle jamais
 * `onNeedRefresh` : il ne prouverait rien. On le remplace par un mock qui
 * CAPTURE les rappels, afin de déclencher une mise à jour disponible et de
 * vérifier que le bandeau apparaît réellement.
 *
 * UNE FONCTION `registerSW` NEUVE PAR TEST. Le hook du socle mémorise sa
 * connexion PAR RÉFÉRENCE de fonction (WeakMap) : réutiliser le même mock
 * ferait fuir `needRefresh` d'un test au suivant. D'où `vi.resetModules()` +
 * `vi.doMock`, qui refabriquent le module virtuel — et donc la fonction — à
 * chaque montage.
 */
const SOCLE_SNOOZE_KEY = 'dwc_sw_update_snoozed_until';
const LEGACY_SNOOZE_KEY = 'mister_puzzle_update_snooze_until_ms';

async function mountBanner() {
  vi.resetModules();

  let onNeedRefresh: (() => void) | undefined;
  let registered = false;

  vi.doMock('virtual:pwa-register', () => ({
    registerSW: (options?: { onNeedRefresh?: () => void }) => {
      registered = true;
      onNeedRefresh = options?.onNeedRefresh;
      return () => Promise.resolve();
    },
  }));

  const { UpdateBanner } = await import('./UpdateBanner');
  const { I18nProvider } = await import('../i18n/I18nContext');

  render(
    <I18nProvider>
      <UpdateBanner />
    </I18nProvider>
  );

  return {
    /** Le socle s'est-il abonné, c'est-à-dire `registerSW` a-t-il été passé ? */
    get registered() {
      return registered;
    },
    /** Le service worker annonce une nouvelle version. */
    announceUpdate() {
      expect(onNeedRefresh).toBeTypeOf('function');
      act(() => onNeedRefresh?.());
    },
  };
}

beforeEach(() => {
  localStorage.removeItem(SOCLE_SNOOZE_KEY);
  localStorage.removeItem(LEGACY_SNOOZE_KEY);
});

afterEach(() => {
  vi.doUnmock('virtual:pwa-register');
});

describe('UpdateBanner', () => {
  it('reste invisible tant qu’aucune mise à jour n’est annoncée', async () => {
    const banner = await mountBanner();

    expect(banner.registered).toBe(true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('s’affiche quand le service worker annonce une nouvelle version', async () => {
    const banner = await mountBanner();

    banner.announceUpdate();

    const node = screen.getByRole('status');
    expect(node).toHaveAttribute('data-dwc', 'update-banner');
    expect(node).toHaveTextContent(
      'Une nouvelle version de l’application est disponible.'
    );
    expect(
      screen.getByRole('button', { name: 'Mettre à jour' })
    ).toBeInTheDocument();
  });

  it('« Plus tard (24 h) » masque le bandeau et pose le report du socle', async () => {
    const banner = await mountBanner();
    banner.announceUpdate();

    fireEvent.click(screen.getByRole('button', { name: 'Plus tard (24 h)' }));

    expect(screen.queryByRole('status')).toBeNull();
    // Report persisté : c'est ce qui distingue cette sortie d'un simple
    // écartement de session, et la raison pour laquelle c'est ELLE qui a
    // survécu à la migration (le socle n'offre qu'un bouton secondaire).
    const until = Number(localStorage.getItem(SOCLE_SNOOZE_KEY));
    expect(until).toBeGreaterThan(Date.now() + 23 * 3_600_000);
  });

  it('ne s’affiche pas pendant un report en cours', async () => {
    localStorage.setItem(SOCLE_SNOOZE_KEY, String(Date.now() + 3_600_000));

    const banner = await mountBanner();
    banner.announceUpdate();

    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('reprise du report historique', () => {
  /**
   * `UpdatePromptBanner` ne prend pas de `snoozeKey` : il lit toujours celle du
   * socle. Sans cette reprise, un report posé par la version écrite à la main
   * serait oublié et le bandeau reviendrait aussitôt.
   *
   * L'import SUFFIT : la reprise a lieu au chargement du module, avant tout
   * rendu — c'est exactement ce qui se passe en production.
   */
  async function adopt() {
    vi.resetModules();
    vi.doMock('virtual:pwa-register', () => ({ registerSW: () => () => {} }));
    await import('./UpdateBanner');
  }

  it('reprend un report encore valide posé sous l’ancienne clé', async () => {
    const until = Date.now() + 5 * 3_600_000;
    localStorage.setItem(LEGACY_SNOOZE_KEY, String(until));

    await adopt();

    expect(localStorage.getItem(SOCLE_SNOOZE_KEY)).toBe(String(until));
    expect(localStorage.getItem(LEGACY_SNOOZE_KEY)).toBeNull();
  });

  it('jette une ancienne clé expirée sans poser de report', async () => {
    localStorage.setItem(LEGACY_SNOOZE_KEY, String(Date.now() - 1000));

    await adopt();

    expect(localStorage.getItem(SOCLE_SNOOZE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_SNOOZE_KEY)).toBeNull();
  });

  it('ne raccourcit pas un report du socle déjà plus long', async () => {
    const longer = Date.now() + 20 * 3_600_000;
    localStorage.setItem(SOCLE_SNOOZE_KEY, String(longer));
    localStorage.setItem(LEGACY_SNOOZE_KEY, String(Date.now() + 3_600_000));

    await adopt();

    expect(localStorage.getItem(SOCLE_SNOOZE_KEY)).toBe(String(longer));
  });
});
