import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * CE QUE CE TEST TIENT : la base s'ouvre en WebSocket seul.
 *
 * Sans `forceWebSockets()` AVANT `getDatabase()`, une marque
 * `firebase:previous_websocket_failure` restée dans le stockage local (page
 * fermée avant que la connexion soit jugée saine) faisait démarrer le SDK en
 * long polling, des scripts JSONP que la CSP refuse : la base ne se connectait
 * plus jamais dans ce navigateur (relevé du 24/11/2026, voir `getDb`).
 * L'ordre compte : appelé après l'ouverture des transports, le réglage n'est
 * plus lu.
 */
const mocks = vi.hoisted(() => ({
  appels: [] as string[],
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test' })),
}));
vi.mock('firebase/database', () => ({
  forceWebSockets: vi.fn(() => mocks.appels.push('forceWebSockets')),
  getDatabase: vi.fn(() => {
    mocks.appels.push('getDatabase');
    return { type: 'database' };
  }),
}));
vi.mock('./config/firebaseEnv', () => ({ getFirebaseWebConfig: () => ({}) }));

/** Un module neuf à chaque test : `getDb` mémorise la base ouverte. */
const freshFirebase = async () => {
  vi.resetModules();
  return import('./firebase');
};

beforeEach(() => {
  mocks.appels.length = 0;
});

describe('getDb — WebSocket seul', () => {
  it('force le WebSocket AVANT d’ouvrir la base', async () => {
    const { getDb } = await freshFirebase();
    getDb();
    expect(mocks.appels).toEqual(['forceWebSockets', 'getDatabase']);
  });

  it('n’ouvre la base qu’une fois', async () => {
    const { getDb } = await freshFirebase();
    expect(getDb()).toBe(getDb());
    expect(mocks.appels).toEqual(['forceWebSockets', 'getDatabase']);
  });
});
