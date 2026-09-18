/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __BMAC_URL__: string;

interface ImportMetaEnv {
  /** Origine publique du site (sans slash final), ex. https://votre-compte.github.io — pour SEO / sitemap / llms.txt au build */
  readonly VITE_PUBLIC_SITE_ORIGIN?: string;
  /** Suffixe `?v=…` (version package) pour bust du cache favicon / logo PWA — défini au build dans vite.config */
  readonly VITE_PWA_ICON_QS: string;
  /** Clé de projet PostHog (`phc_…`, nuage EUROPÉEN) — lue par `ConsentBanner`, qui ne charge le client qu'APRÈS accord */
  readonly VITE_POSTHOG_KEY?: string;
  /** URL HTTPS (POST JSON) pour recevoir les rapports d’erreur produits par `reportError` */
  readonly VITE_ERROR_INGEST_URL?: string;
  readonly VITE_SENTRY_DSN?: string;

  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_DATABASE_URL: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}
