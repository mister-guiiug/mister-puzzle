import { defineConfig } from 'vitest/config';

/**
 * Tests des Security Rules RTDB — exigent l'émulateur Firebase :
 *   npm run test:rules   (firebase emulators:exec --only database …)
 *
 * Volontairement HORS du run vitest principal (`vitest.config.ts` n'inclut que
 * `src/**` et `server/**`) : celui-ci tourne sans émulateur, en CI comme au
 * pre-commit, et n'a rien à attendre d'un port 9000.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['rules-tests/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
  },
});
