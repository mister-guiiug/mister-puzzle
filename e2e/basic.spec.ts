/**
 * Hygiène E2E de mister-puzzle — la couche « tout le monde » (chargement,
 * a11y de base, PWA, sécurité, hors ligne), par opposition au parcours métier
 * de `puzzle-critical.spec.ts`.
 *
 * CE FICHIER ÉTAIT UN GABARIT. Son en-tête disait « adapté pour tous les
 * projets » et il l'était : il visait `/parametres`, cliquait un
 * `button[type="submit"]` et exigeait un en-tête HTTP `x-content-type-options`.
 * mister-puzzle n'a aucune des trois choses — il route dans le FRAGMENT
 * (`#CODE`), n'a pas un seul `<form>`, et se déploie sur GitHub Pages, qui ne
 * permet pas de poser d'en-tête. La CI famille ne joue que `@critical` et
 * `@a11y` (`run-e2e: true` dans ci.yml) : aucun test d'ici n'étant étiqueté,
 * ces échecs étaient invisibles en CI et ne tombaient que sur le développeur
 * qui lance le `npm run test:e2e` exposé par package.json — lequel n'applique
 * aucun filtre et joue donc tout le dossier.
 *
 * Les tests portent donc désormais sur ce que l'application fait vraiment. Ils
 * restent VOLONTAIREMENT sans étiquette : c'est de l'hygiène locale, pas la
 * porte de la CI.
 *
 * La locale par défaut est `fr` sans condition (`getLocalePref` ne lit que
 * localStorage, jamais `navigator.language`) : les libellés français ci-dessous
 * sont déterministes, y compris sous un navigateur en anglais.
 */

import { test, expect } from '@playwright/test';

test.describe('Navigation basique', () => {
  test("page d'accueil se charge", async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/./); // N'importe quel titre
  });

  test('navigation responsive', async ({ page }) => {
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();

    // Test desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('nav')).toBeVisible();
  });
});

test.describe('Accessibilité', () => {
  test("pas d'erreurs ARIA", async ({ page }) => {
    await page.goto('/');

    // Vérifier les attributs ARIA manquants
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const hasLabel = await button.evaluate(
        el =>
          el.hasAttribute('aria-label') ||
          el.hasAttribute('aria-labelledby') ||
          !!el.textContent?.trim()
      );
      expect(hasLabel).toBeTruthy();
    }
  });

  test('navigation clavier', async ({ page }) => {
    await page.goto('/');

    // Attendre que React ait monté la barre AVANT de tabuler. `goto` rend la
    // main au `load` du document, où le DOM ne contient encore que
    // `<div id="root">` : un Tab tiré à cet instant laisse le focus sur
    // `<body>`. Chromium et Firefox rendaient assez vite pour masquer la
    // course ; WebKit la perdait une fois sur deux, et l'échec ressemblait à
    // une particularité de Safari alors que c'est un simple défaut d'attente.
    await expect(
      page.getByRole('button', { name: 'Ouvrir le menu' })
    ).toBeVisible();

    // Tab sur le premier élément interactif
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(
      () => document.activeElement?.tagName
    );
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
  });
});

test.describe('Performance', () => {
  test('chargement initial < 3s', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000);
  });

  test("pas d'erreurs console", async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Le catalogue famille (`FamilyApps` du socle) affiche l'icône de chaque
    // app depuis `https://mister-guiiug.github.io/<app>/`. La CSP de l'app
    // autorise `img-src 'self'` : en PRODUCTION le site est servi depuis
    // `mister-guiiug.github.io`, donc ces icônes SONT « self » et se chargent.
    // Ici la même page est servie par `vite preview` sur localhost, où « self »
    // vaut `localhost:4173` — les ~17 icônes du catalogue sont refusées. C'est
    // un artefact de l'aperçu local, pas un défaut du site : on l'écarte
    // nommément plutôt que de renoncer à l'assertion.
    //
    // Le filtre porte sur les DEUX marques du message et non sur sa forme :
    // chaque moteur le rédige à sa façon (« Loading the image '…' violates the
    // following Content Security Policy directive » pour Chromium, « Refused to
    // load … because it does not appear in the img-src directive » pour
    // WebKit), et une expression calquée sur l'une d'elles ne verrait pas
    // l'autre.
    const catalogueIconBlocked = (message: string) =>
      message.includes('https://mister-guiiug.github.io/') &&
      /content security policy/i.test(message);
    const unexpected = errors.filter(e => !catalogueIconBlocked(e));

    expect(unexpected).toEqual([]);
  });
});

test.describe('PWA', () => {
  test('service worker enregistré', async ({ page }) => {
    await page.goto('/');

    // `navigator.serviceWorker.controller` est nul au PREMIER chargement : le
    // plugin PWA est en `registerType: 'prompt'` (vite.config.ts), donc le
    // service worker n'appelle jamais `clients.claim()` et ne prend la main
    // qu'à la navigation suivante. Ce qu'on veut vérifier, c'est qu'il est
    // enregistré et ACTIVÉ — c'est ce que `serviceWorker.ready` établit.
    const swActive = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registration = await navigator.serviceWorker.ready;
      const worker = registration.active;
      if (!worker) return false;
      // `ready` résout dès que le worker occupe le créneau actif : mesuré ici,
      // il est encore en `activating`. Attendre la transition, sinon
      // l'assertion est une course perdue une fois sur deux.
      if (worker.state !== 'activated') {
        await new Promise<void>(resolve => {
          const onChange = () => {
            if (worker.state === 'activated') {
              worker.removeEventListener('statechange', onChange);
              resolve();
            }
          };
          worker.addEventListener('statechange', onChange);
        });
      }
      return true;
    });

    expect(swActive).toBeTruthy();
  });

  test('manifest PWA présent', async ({ page }) => {
    const manifest = await page.request.get('/manifest.webmanifest');
    expect(manifest.ok()).toBeTruthy();
  });
});

test.describe('Internationalisation', () => {
  test('langue correcte', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(['fr', 'en']).toContain(lang || '');
  });
});

test.describe('Sécurité', () => {
  test('politique de sécurité du contenu posée', async ({ page }) => {
    await page.goto('/');

    // Le gabarit attendait l'en-tête `x-content-type-options: nosniff`. Ni
    // `vite preview` ni GitHub Pages ne posent d'en-tête — l'hébergeur du parc
    // ne le permet pas, et le plugin CSP du socle le dit lui-même au build en
    // retirant `frame-ancestors`. La protection de cette app passe donc par une
    // CSP en `<meta>`, injectée au build par `cspPlugin` : c'est ELLE qu'il faut
    // vérifier, et elle est vérifiable partout.
    const csp = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute('content');

    expect(csp).toBeTruthy();
    // Les directives sur lesquelles repose le confinement : pas d'exécution
    // tierce, pas d'objet, pas d'iframe, et une base d'URL non détournable.
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    // `script-src` n'autorise que soi-même et des empreintes sha256 (les deux
    // scripts inlines d'index.html) : aucun `unsafe-eval`, aucun joker.
    expect(csp).toMatch(/script-src [^;]*'self'/);
    expect(csp).not.toContain('unsafe-eval');
  });

  test('pas de données sensibles en clair', async ({ page }) => {
    await page.goto('/');

    // Chercher des patterns suspects dans le HTML
    const content = await page.content();
    const sensitivePatterns = [
      /password\s*[:=]\s*["'].*["']/i,
      /api[_-]key\s*[:=]\s*["'].*["']/i,
      /secret\s*[:=]\s*["'].*["']/i,
    ];

    for (const pattern of sensitivePatterns) {
      expect(content).not.toMatch(pattern);
    }
  });
});

test.describe('Saisie et validation', () => {
  // Le gabarit allait sur `/parametres` et cliquait un `button[type="submit"]`.
  // mister-puzzle n'a ni l'un ni l'autre : tout tient sur l'accueil, les
  // boutons sont des `type="button"` et la validation est faite à la main dans
  // `Home.handleCreate`, qui remonte l'erreur dans la modale du socle.
  test('créer un puzzle sans nom est refusé', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('alertdialog')).toBeHidden();

    await page.getByRole('button', { name: 'Créer', exact: true }).click();

    // `ErrorModal` → `ConfirmDialog` du socle en mode mono-action.
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      'Veuillez donner un nom à votre puzzle.'
    );

    // Et elle se referme par son unique action.
    await page.getByRole('button', { name: "J'ai compris" }).click();
    await expect(dialog).toBeHidden();
  });

  test('la grille calcule le nombre de pièces', async ({ page }) => {
    await page.goto('/');

    // Le calculateur de grille est purement local : il n'attend aucun réseau,
    // et c'est le seul endroit de l'accueil qui produit une valeur dérivée.
    await page.locator('#home-grid-rows').fill('10');
    await page.locator('#home-grid-cols').fill('30');

    await expect(page.locator('#home-grid-cols')).toHaveValue('30');
    await expect(page.getByText('300', { exact: true })).toBeVisible();
  });
});

test.describe('Offline', () => {
  // Le gabarit cliquait « Paramètres » et attendait `/parametres`. Il n'y a pas
  // de route de chemin ici : l'accueil EST l'application tant qu'aucun code de
  // salle n'est dans le fragment. Ce qui se vérifie hors ligne, c'est donc que
  // le shell est précaché, qu'il revient depuis ce cache, et que ce qui n'a
  // jamais eu besoin du réseau marche toujours.

  test('le shell est précaché par le service worker', async ({ page }) => {
    await page.goto('/');

    const precached = await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      const names = await caches.keys();
      const paths: string[] = [];
      for (const name of names) {
        const cache = await caches.open(name);
        for (const request of await cache.keys()) {
          paths.push(new URL(request.url).pathname);
        }
      }
      return paths;
    });

    expect(precached).toContain('/index.html');
    expect(precached.some(p => /^\/assets\/.*\.js$/.test(p))).toBeTruthy();
  });

  test("hors ligne, l'accueil revient du cache et reste utilisable", async ({
    page,
    browserName,
  }) => {
    // `page.reload()` hors ligne fait sortir le pilote WebKit en « WebKit
    // encountered an internal error » — la navigation n'a même pas lieu. C'est
    // une limite du pilote, pas de l'app : le test précédent vérifie sur les
    // cinq navigateurs que le shell EST bien dans le cache, celui-ci vérifie
    // qu'il en ressort, là où le pilote sait recharger.
    test.skip(
      browserName === 'webkit',
      'Le pilote WebKit ne sait pas recharger une page hors ligne.'
    );

    await page.goto('/');
    // Attendre que le service worker ait fini de précacher, sinon le
    // rechargement hors ligne tombe dans le vide.
    await page.evaluate(() => navigator.serviceWorker.ready);

    await page.context().setOffline(true);
    await page.reload();

    await expect(page.locator('main#contenu-principal')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Créer un nouveau puzzle' })
    ).toBeVisible();

    // Grille, langue, historique local : aucun de ces trois n'a jamais touché
    // le réseau (cf. le commentaire de `Home`), et ils doivent le prouver.
    await page.locator('#home-grid-rows').fill('4');
    await page.locator('#home-grid-cols').fill('5');
    await expect(page.getByText('20', { exact: true })).toBeVisible();

    await page.context().setOffline(false);
  });

  // Le bandeau « hors ligne » lui-même est vérifié par `puzzle-critical.spec.ts`
  // (describe « Collaboratif »), où le gabarit l'avait déjà placé — inutile de
  // le rejouer ici sur les cinq navigateurs de la matrice.
});
