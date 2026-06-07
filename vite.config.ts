import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { readFileSync } from 'node:fs';
import {
  pwaSeoPlugin,
  resolveSeoPublicUrls,
} from '@mister-guiiug/dev-wpa-config/vite-pwa-base';

const { version } = JSON.parse(readFileSync('./package.json', 'utf-8')) as {
  version: string;
};

// Suffixe de cache pour favicon / PWA / Open Graph (incrémenter `version` dans
// package.json après changement d'icônes).
const pwaIconQs = `?v=${encodeURIComponent(version)}`;
const analyze = process.env.ANALYZE === '1';

// Base path : honore VITE_BASE_PATH (Lighthouse CI build à `/`, deploy à
// `/mister-puzzle/`). Défaut = base GitHub Pages du projet.
const base = process.env.VITE_BASE_PATH ?? '/mister-puzzle/';

const { homeUrl } = resolveSeoPublicUrls({ basePath: base });

const LLMS_TXT = `# Mister Puzzle

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

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BMAC_URL__: JSON.stringify('https://buymeacoffee.com/mister.guiiug'),
    'import.meta.env.VITE_PWA_ICON_QS': JSON.stringify(pwaIconQs),
  },
  base,
  build: {
    sourcemap: true,
    /** Seuil relevé : le gros du JS est découpé (react, firebase, écran salle en lazy). */
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          const norm = id.replace(/\\/g, '/');
          // Cache navigateur : React change moins souvent que le code applicatif.
          if (
            norm.includes('/react-dom/') ||
            norm.includes('/node_modules/react/') ||
            norm.includes('/scheduler/')
          ) {
            return 'react-vendor';
          }
          /** Un seul chunk Firebase : le paquet `firebase` ne fait souvent que réexporter `@firebase/*` (~quelques octets) ; les fusionner évite une requête réseau inutile. */
          if (norm.includes('/@firebase/') || norm.includes('/firebase/'))
            return 'firebase';
          if (norm.includes('/lucide-react/')) return 'lucide';
          if (norm.includes('/date-fns/')) return 'date-fns';
          if (norm.includes('/framer-motion/')) return 'motion';
          if (norm.includes('/tailwindcss/') || norm.includes('/@tailwindcss/'))
            return 'tailwind';
          if (norm.includes('/zustand/')) return 'zustand';
          return 'vendor';
        },
      },
    },
  },
  plugins: [
    pwaSeoPlugin({
      siteName: 'Mister Puzzle',
      basePath: base,
      logoPath: '/logo.svg',
      iconQuery: pwaIconQs,
      llms: LLMS_TXT,
    }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      includeAssets: [
        'favicon.ico',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'favicon.svg',
        'logo.png',
        'logo.svg',
      ],
      manifest: {
        name: 'Mister Puzzle',
        short_name: 'Mister Puzzle',
        description:
          'Suivi collaboratif de puzzles en temps réel : pièces, historique, photos, checkpoints',
        start_url: base,
        scope: base,
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: `logo.svg${pwaIconQs}`,
            sizes: '64x64',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: `pwa-192x192.png${pwaIconQs}`,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: `pwa-512x512.png${pwaIconQs}`,
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
    ...(analyze
      ? [
          visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            open: !process.env.CI,
          }) as PluginOption,
        ]
      : []),
  ],
});
