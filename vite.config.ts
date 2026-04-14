import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { getPwaIconQuery, seoInjectPlugin } from './vite-plugin-seo';

const pwaIconQs = getPwaIconQuery();
const analyze = process.env.ANALYZE === '1';

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BMAC_URL__: JSON.stringify('https://buymeacoffee.com/mister.guiiug'),
    'import.meta.env.VITE_PWA_ICON_QS': JSON.stringify(pwaIconQs),
  },
  base: '/mister-puzzle/',
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
          if (norm.includes('/@firebase/') || norm.includes('/firebase/')) return 'firebase';
          if (norm.includes('/lucide-react/')) return 'lucide';
          if (norm.includes('/date-fns/')) return 'date-fns';
          if (norm.includes('/framer-motion/')) return 'motion';
          return 'vendor';
        },
      },
    },
  },
  plugins: [
    seoInjectPlugin(),
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
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'favicon.svg', 'logo.png', 'logo.svg'],
      manifest: {
        name: 'Mister Puzzle',
        short_name: 'Mister Puzzle',
        description:
          'Suivi collaboratif de puzzles en temps réel : pièces, historique, photos, checkpoints',
        start_url: '/mister-puzzle/',
        scope: '/mister-puzzle/',
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
