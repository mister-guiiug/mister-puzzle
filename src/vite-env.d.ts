/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __BMAC_URL__: string;

interface ImportMetaEnv {
  /** Origine publique du site (sans slash final), ex. https://votre-compte.github.io — pour SEO / sitemap / llms.txt au build */
  readonly VITE_PUBLIC_SITE_ORIGIN?: string;
}
