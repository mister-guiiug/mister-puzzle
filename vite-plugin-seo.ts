import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

const DEFAULT_ORIGIN = 'https://mister-guiiug.github.io';
const BASE_PATH = '/mister-puzzle';

const pkgDir = path.dirname(fileURLToPath(import.meta.url));

/** Suffixe de cache pour favicon / PWA / Open Graph (incrémenter `version` dans package.json après changement d’icônes). */
export function getPwaIconQuery(): string {
  const raw = fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8');
  const { version } = JSON.parse(raw) as { version: string };
  return `?v=${encodeURIComponent(version)}`;
}

export function resolveSeoPublicUrls() {
  const origin = (process.env.VITE_PUBLIC_SITE_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '');
  const homeUrl = `${origin}${BASE_PATH}/`;
  const qs = getPwaIconQuery();
  const logoUrl = `${origin}${BASE_PATH}/logo.svg${qs}`;
  return { origin, homeUrl, logoUrl };
}

/** Conteneur GTM, ex. GTM-XXXXXXX */
function parseGtmContainerId(raw: string | undefined): string | null {
  if (!raw) return null;
  const id = raw.trim().toUpperCase();
  return /^GTM-[A-Z0-9]+$/.test(id) ? id : null;
}

/** ID de mesure GA4, ex. G-XXXXXXXXXX */
function parseGaMeasurementId(raw: string | undefined): string | null {
  if (!raw) return null;
  const id = raw.trim().toUpperCase();
  return /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

/**
 * Snippets GTM / GA4 injectés au build (variables VITE_GTM_CONTAINER_ID, VITE_GA_MEASUREMENT_ID).
 * Si GTM est défini, seul le conteneur GTM est chargé : configurez GA4 comme balise dans GTM (évite le double comptage).
 */
export function buildAnalyticsHtmlFragments(): { head: string; body: string } {
  const gtm = parseGtmContainerId(process.env.VITE_GTM_CONTAINER_ID);
  const ga = parseGaMeasurementId(process.env.VITE_GA_MEASUREMENT_ID);

  if (gtm && ga) {
    const head = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtm}');</script>
<!-- End Google Tag Manager -->
<!-- GA4 : ajoutez une balise « Google Analytics : configuration GA4 » (ID ${ga}) dans ce conteneur GTM. VITE_GA_MEASUREMENT_ID n’est pas injecté ici pour éviter le double comptage. -->`;
    const body = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>
<!-- End Google Tag Manager -->`;
    return { head, body };
  }

  if (gtm) {
    const head = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtm}');</script>
<!-- End Google Tag Manager -->`;
    const body = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>
<!-- End Google Tag Manager -->`;
    return { head, body };
  }

  if (ga) {
    const head = `<!-- Google tag (gtag.js) / GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${ga}');
</script>`;
    return { head, body: '' };
  }

  return { head: '', body: '' };
}

export function seoInjectPlugin(): Plugin {
  return {
    name: 'seo-inject',
    transformIndexHtml(html) {
      const { homeUrl, logoUrl } = resolveSeoPublicUrls();
      const iconQs = getPwaIconQuery();
      const { head: analyticsHead, body: analyticsBody } = buildAnalyticsHtmlFragments();
      return html
        .replaceAll('__SEO_HOME_URL__', homeUrl)
        .replaceAll('__SEO_LOGO_URL__', logoUrl)
        .replaceAll('__PWA_ICON_QS__', iconQs)
        .replaceAll('__ANALYTICS_HEAD__', analyticsHead)
        .replaceAll('__ANALYTICS_BODY__', analyticsBody);
    },
    closeBundle() {
      const { homeUrl } = resolveSeoPublicUrls();
      const dist = path.resolve(process.cwd(), 'dist');
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${homeUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
      const robots = `User-agent: *
Allow: /

Sitemap: ${homeUrl}sitemap.xml
`;
      fs.writeFileSync(path.join(dist, 'sitemap.xml'), sitemap, 'utf8');
      fs.writeFileSync(path.join(dist, 'robots.txt'), robots, 'utf8');

      const llms = `# Mister Puzzle

> PWA web pour suivre la progression d'un puzzle à plusieurs, en temps réel (FR/EN).

## Résumé
Mister Puzzle synchronise le nombre de pièces placées ou restantes, un historique graphique, des photos d'avancement, des checkpoints et une présence « en ligne » via un code de salle. Thème clair, sombre ou système. Mode lecture seule possible.

## URL et code
- **Application :** ${homeUrl}
- **Dépôt source :** https://github.com/mister-guiiug/mister-puzzle
- **Données :** Firebase Realtime Database ; pas de compte obligatoire (pseudo stocké localement).

## Utilisation (aperçu)
- Créer une salle : nom du puzzle, grille lignes × colonnes, visibilité publique ou privée (mot de passe optionnel hashé côté client).
- Rejoindre : saisir le code affiché par l'hôte.
- PWA : installation depuis le navigateur en HTTPS ; mises à jour proposées dans l'app.

## Limites (à ne pas inférer)
L'application ne fournit pas l'image du puzzle à assembler : uniquement compteurs, grille, médias ajoutés par les participants dans la salle.
`;
      fs.writeFileSync(path.join(dist, 'llms.txt'), llms, 'utf8');
    },
  };
}
