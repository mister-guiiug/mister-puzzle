import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';
import { ConnectionBanner } from './ConnectionBanner';
import Home from './Home';

/**
 * CE QUE CES TESTS TIENNENT — l'USAGE, pas le composant du socle.
 *
 * 1. LA TEMPORISATION EXISTE. Le bloc qu'on remplace n'en avait aucune : un
 *    basculement réseau d'une demi-seconde faisait apparaître puis disparaître
 *    une bande qui pousse TOUT le contenu vers le bas. Un test qui vérifierait
 *    seulement « il finit par apparaître » laisserait passer un `delayMs`
 *    ramené à 0.
 *
 * 2. LE GARDE PARLE. Créer et rejoindre écrivent/lisent dans Firebase ; hors
 *    ligne le SDK met en attente sans jamais rejeter, donc `setLoading(true)`
 *    ne redescend pas et le bouton tourne à l'infini. Ici on vérifie que
 *    l'app le dit AVANT, et que rien ne part.
 *
 * `jsdom` ne laisse pas écrire `navigator.onLine` par affectation : on
 * redéfinit la propriété, puis on émet l'évènement que `useOnline` écoute.
 */
function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'));
  });
}

const banner = () => document.querySelector('[data-dwc="connection-banner"]');

// `__BMAC_URL__` est un `define` de `vite.config.ts` ; `vitest.config.ts` ne le
// reprend pas, et `Home` le lit au rendu. Sans ce double, le composant plante
// avant d'atteindre ce qu'on veut éprouver.
vi.stubGlobal('__BMAC_URL__', 'https://example.invalid');

const createPuzzle = vi.fn();
const joinPuzzle = vi.fn();
vi.mock('../hooks/useSocket', () => ({
  createPuzzle: (...a: unknown[]) => createPuzzle(...a),
  joinPuzzle: (...a: unknown[]) => joinPuzzle(...a),
  hashPassword: async () => 'hash',
}));

afterEach(() => {
  vi.useRealTimers();
  setOnline(true);
  createPuzzle.mockReset();
  joinPuzzle.mockReset();
});

describe('bandeau hors connexion', () => {
  it('reste muet en ligne', () => {
    render(
      <I18nProvider>
        <ConnectionBanner />
      </I18nProvider>
    );
    expect(banner()).toBeNull();
  });

  it("attend 1,5 s hors ligne continu, puis dit ce qui n'est plus possible", () => {
    vi.useFakeTimers();
    render(
      <I18nProvider>
        <ConnectionBanner />
      </I18nProvider>
    );

    setOnline(false);
    act(() => void vi.advanceTimersByTime(1499));
    expect(banner()).toBeNull(); // la micro-coupure ne pousse pas la page

    act(() => void vi.advanceTimersByTime(1));
    expect(banner()).toHaveTextContent(/mises à jour en direct|live updates/);
  });

  it('disparaît immédiatement au retour du réseau', () => {
    vi.useFakeTimers();
    render(
      <I18nProvider>
        <ConnectionBanner />
      </I18nProvider>
    );
    setOnline(false);
    act(() => void vi.advanceTimersByTime(1500));
    expect(banner()).toBeInTheDocument();

    setOnline(true);
    expect(banner()).toBeNull();
  });
});

describe('créer et rejoindre, hors connexion', () => {
  function renderHome() {
    return render(
      <I18nProvider>
        <Home onJoin={() => {}} pseudo="Zoé" />
      </I18nProvider>
    );
  }

  it('laisse les deux boutons actifs tant que le réseau est là', () => {
    renderHome();
    for (const name of [/Créer|Create/, /Rejoindre|Join/]) {
      expect(screen.getAllByRole('button', { name })[0]).not.toHaveAttribute(
        'aria-disabled'
      );
    }
  });

  it('bloque la création ET la dit bloquée', () => {
    renderHome();
    setOnline(false);

    const create = screen.getAllByRole('button', { name: /Créer|Create/ })[0]!;
    // `aria-disabled`, pas `disabled` : le bouton reste focusable, donc le
    // motif reste découvrable au clavier.
    expect(create).toHaveAttribute('aria-disabled', 'true');
    expect(create).not.toBeDisabled();
    expect(
      screen.getAllByText(/Indisponible hors ligne|Unavailable offline/)[0]
    ).toBeInTheDocument();

    fireEvent.click(create);
    expect(createPuzzle).not.toHaveBeenCalled();
  });

  it('bloque « rejoindre », y compris par la touche Entrée', () => {
    renderHome();
    setOnline(false);

    const code = screen.getByLabelText(/Code|code/i);
    fireEvent.change(code, { target: { value: 'ABC123' } });
    // La touche Entrée court-circuite le bouton : le garde doit tenir dans le
    // handler, pas seulement sur les props étalées.
    fireEvent.keyDown(code, { key: 'Enter' });
    expect(joinPuzzle).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getAllByRole('button', { name: /Rejoindre|Join/ })[0]!
    );
    expect(joinPuzzle).not.toHaveBeenCalled();
  });

  it('rend la main dès le retour du réseau', () => {
    // Témoin positif : sans lui, les deux tests ci-dessus passeraient aussi si
    // le bouton était cassé pour une tout autre raison.
    joinPuzzle.mockResolvedValue(null);
    renderHome();
    setOnline(false);
    setOnline(true);

    const code = screen.getByLabelText(/Code|code/i);
    fireEvent.change(code, { target: { value: 'ABC123' } });
    fireEvent.click(
      screen.getAllByRole('button', { name: /Rejoindre|Join/ })[0]!
    );
    expect(joinPuzzle).toHaveBeenCalledWith('ABC123');
  });
});
