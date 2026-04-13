import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { seoInjectPlugin } from './vite-plugin-seo';

// https://vite.dev/config/
export default defineConfig({
  define: {
    __BMAC_URL__: JSON.stringify('https://buymeacoffee.com/mister.guiiug'),
  },
  base: '/mister-puzzle/',
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 720,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('lucide-react')) return 'lucide';
          if (id.includes('date-fns')) return 'date-fns';
          if (id.includes('framer-motion')) return 'motion';
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
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'favicon.svg', 'logo.png', 'logo.svg'],
      manifest: {
        name: 'Mister Puzzle — progression collaborative',
        short_name: 'Mister Puzzle',
        description:
          'Suivi collaboratif de puzzles en temps réel : pièces, historique, photos, checkpoints, export PNG, thème clair/sombre.',
        start_url: '/mister-puzzle/',
        scope: '/mister-puzzle/',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo.svg',
            sizes: '64x64',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    })
  ],
});
