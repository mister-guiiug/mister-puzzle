/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __BMAC_URL__: string;

interface ImportMetaEnv {
  /** Origine publique du site (sans slash final), ex. https://votre-compte.github.io — pour SEO / sitemap / llms.txt au build */
  readonly VITE_PUBLIC_SITE_ORIGIN?: string;
  /** Suffixe `?v=…` (version package) pour bust du cache favicon / logo PWA — défini au build dans vite.config */
  readonly VITE_PWA_ICON_QS: string;
  /** Conteneur Google Tag Manager (injecté dans index.html au build si présent) */
  readonly VITE_GTM_CONTAINER_ID?: string;
  /** ID de mesure GA4 sans GTM (injecté au build si présent et sans GTM) */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** URL HTTPS (POST JSON) pour recevoir les rapports d’erreur produits par `reportError` */
  readonly VITE_ERROR_INGEST_URL?: string;

  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_DATABASE_URL: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}
