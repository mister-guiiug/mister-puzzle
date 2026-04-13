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

export function seoInjectPlugin(): Plugin {
  return {
    name: 'seo-inject',
    transformIndexHtml(html) {
      const { homeUrl, logoUrl } = resolveSeoPublicUrls();
      const iconQs = getPwaIconQuery();
      return html
        .replaceAll('__SEO_HOME_URL__', homeUrl)
        .replaceAll('__SEO_LOGO_URL__', logoUrl)
        .replaceAll('__PWA_ICON_QS__', iconQs);
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
