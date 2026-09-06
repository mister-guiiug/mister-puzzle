import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * CE QUE CES TESTS TIENNENT — la dégradation (VALEUR.md, V3).
 *
 * Activer la connexion anonyme est un geste du PROPRIÉTAIRE dans la console
 * Firebase (Authentication → Sign-in method → Anonymous). Tant qu'il n'est pas
 * fait — et il ne l'est pas au moment où cette branche est écrite —
 * `signInAnonymously` rejette en `auth/operation-not-allowed`.
 *
 * Ses deux appelants supposent que cette promesse NE REJETTE JAMAIS :
 *   - `createPuzzle` fait `await ensureAnonymousAuth()` avant d'écrire ; un
 *     rejet ferait échouer la création d'un puzzle — la fonction principale de
 *     l'application — sur une case non cochée ;
 *   - `useCurrentUid` fait `void ensureAnonymousAuth().then(…)`, sans `catch` :
 *     un rejet partirait en « unhandled rejection », et l'e2e « pas d'erreurs
 *     console » avec lui.
 *
 * C'est donc ce contrat qu'on épingle ici, pas l'implémentation : rendre
 * `null`, ne pas lever, et ne le journaliser qu'une fois.
 */
const mocks = vi.hoisted(() => ({
  getAuth: vi.fn(() => ({ currentUser: null }) as { currentUser: unknown }),
  signInAnonymously: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  getAuth: mocks.getAuth,
  signInAnonymously: mocks.signInAnonymously,
}));
vi.mock('./firebase', () => ({ getFirebaseApp: () => ({ name: 'test' }) }));
vi.mock('./utils/reportError', () => ({ reportError: mocks.reportError }));

/** Un module neuf à chaque test : `ensureAnonymousAuth` mémorise sa promesse. */
const freshAuth = async () => {
  vi.resetModules();
  return import('./auth');
};

beforeEach(() => {
  mocks.getAuth.mockReset().mockReturnValue({ currentUser: null });
  mocks.signInAnonymously.mockReset();
  mocks.reportError.mockReset();
});

describe('ensureAnonymousAuth — la connexion anonyme est activée', () => {
  it('rend l’uid et le retient', async () => {
    mocks.signInAnonymously.mockResolvedValue({ user: { uid: 'uid-abc' } });
    const { ensureAnonymousAuth, getCurrentUid } = await freshAuth();

    await expect(ensureAnonymousAuth()).resolves.toBe('uid-abc');
    expect(getCurrentUid()).toBe('uid-abc');
    expect(mocks.reportError).not.toHaveBeenCalled();
  });

  it('ne signe qu’une fois par onglet, même appelée en parallèle', async () => {
    mocks.signInAnonymously.mockResolvedValue({ user: { uid: 'uid-abc' } });
    const { ensureAnonymousAuth } = await freshAuth();

    const [a, b] = await Promise.all([
      ensureAnonymousAuth(),
      ensureAnonymousAuth(),
    ]);
    expect([a, b]).toEqual(['uid-abc', 'uid-abc']);
    expect(mocks.signInAnonymously).toHaveBeenCalledTimes(1);
  });
});

describe('ensureAnonymousAuth — la case n’est PAS cochée dans la console', () => {
  it('rend `null` au lieu de rejeter, et l’application continue', async () => {
    const refus = Object.assign(new Error('auth/operation-not-allowed'), {
      code: 'auth/operation-not-allowed',
    });
    mocks.signInAnonymously.mockRejectedValue(refus);
    const { ensureAnonymousAuth, getCurrentUid } = await freshAuth();

    // `resolves`, pas `rejects` : c'est TOUT l'objet du test.
    await expect(ensureAnonymousAuth()).resolves.toBeNull();
    expect(getCurrentUid()).toBeNull();
    expect(mocks.reportError).toHaveBeenCalledTimes(1);
  });

  it('rend `null` aussi quand le service n’est pas provisionné du tout', async () => {
    // `getAuth` lui-même lève dans ce cas — avant tout appel réseau.
    mocks.getAuth.mockImplementation(() => {
      throw new Error('auth/configuration-not-found');
    });
    const { ensureAnonymousAuth } = await freshAuth();

    await expect(ensureAnonymousAuth()).resolves.toBeNull();
    expect(mocks.signInAnonymously).not.toHaveBeenCalled();
  });

  it('ne réessaie pas et ne journalise qu’une fois', async () => {
    mocks.signInAnonymously.mockRejectedValue(new Error('refus'));
    const { ensureAnonymousAuth } = await freshAuth();

    await ensureAnonymousAuth();
    await ensureAnonymousAuth();
    expect(mocks.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(mocks.reportError).toHaveBeenCalledTimes(1);
  });
});
