import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';
import { loadDashboard } from '../utils/loadDashboard';
import Home from './Home';

/**
 * CE QUE CE TEST TIENT — le MOMENT du préchargement, pas son mécanisme.
 *
 * Le morceau du tableau de bord ne doit partir ni au montage (ce serait
 * annuler le découpage : autant livrer un seul paquet), ni jamais (le premier
 * clic ouvrirait un `Suspense` vide) — mais à l'approche : ici, quand le champ
 * « code » prend le focus, ce que la copie locale faisait déjà. Et une seule
 * fois : un second geste, au doigt cette fois, ne relance pas de
 * téléchargement.
 *
 * Le chargeur est doublé au niveau du MODULE : c'est la même fonction que
 * `lazy()` reçoit dans `App`, et la déduplication du socle repose sur son
 * identité.
 */
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

describe('Home — préchargement du tableau de bord', () => {
  it('part au focus du champ « code », pas au montage, et une seule fois', () => {
    render(
      <I18nProvider>
        <Home onJoin={() => {}} pseudo="Zoé" />
      </I18nProvider>
    );
    expect(loadDashboard).not.toHaveBeenCalled();

    // Le focus remonte du champ à la carte « rejoindre », qui porte l'écouteur.
    fireEvent.focus(screen.getByLabelText(/Code|code/i));
    expect(loadDashboard).toHaveBeenCalledTimes(1);

    fireEvent.touchStart(
      screen.getAllByRole('button', { name: /Rejoindre|Join/ })[0]!
    );
    expect(loadDashboard).toHaveBeenCalledTimes(1);
  });
});
