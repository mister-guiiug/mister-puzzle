# Mister Puzzle

![Icône Mister Puzzle](public/logo.svg)

**Mister Puzzle** est une application web progressive (PWA) pour suivre ensemble l’avancement d’un puzzle : pièces placées ou restantes, historique graphique, photos, checkpoints et partage par code.

## Identité (titre & icône)

- **Nom affiché** : *Mister Puzzle* (barre de navigation, partage, pied de page).
- **Titre de l’onglet** : *Mister Puzzle — progression collaborative* (`index.html`).
- **Icône principale** : `public/logo.svg` — marque vectorielle (grille 3×3 sur dégradé indigo / violet), utilisée sur l’accueil, dans la barre du haut et comme favicon. Les balises `<img>` utilisent `import.meta.env.BASE_URL` pour rester correctes avec le `base` Vite (`/mister-puzzle/`).
- **PWA** : le manifeste référence `logo.svg` ainsi que les PNG `pwa-192x192.png` et `pwa-512x512.png` à la racine de `public/` (install / écran d’accueil). Ajoutez ou régénérez ces PNG si besoin pour un rendu optimal sur toutes les plateformes.

## SEO et GEO (référencement classique + moteurs génératifs)

- **Balises** (`index.html`, injectées au build) : `canonical`, `hreflang` (fr, en, x-default), Open Graph (`og:*`), Twitter Card, `meta description` / `keywords` / `robots`, `theme-color`.
- **Données structurées** : JSON-LD [Schema.org](https://schema.org) `WebApplication` + `FAQPage` pour aider Google et les assistants à résumer l’outil fidèlement.
- **Fichiers générés dans `dist/` au build** : `robots.txt`, `sitemap.xml` (URL d’accueil), `llms.txt` (résumé factuel, limites du produit, lien dépôt — format utile aux crawlers « IA » et outils type Perplexity). Le plugin est `vite-plugin-seo.ts`.
- **Variable d’environnement** : `VITE_PUBLIC_SITE_ORIGIN` (sans slash final), ex. `https://votre-compte.github.io`. Le workflow GitHub Actions la définit à partir du propriétaire du dépôt. En local, sans variable, une origine par défaut est utilisée (voir `vite-plugin-seo.ts`).
- **Titre dynamique** : en salle ouverte, le titre du document inclut le nom du puzzle (`useDocumentRoomTitle`). Les cartes Open Graph restent celles de la page d’accueil (pas de SSR par salle) : pour des aperçus sociaux par puzzle, il faudrait un prérendu ou un endpoint dédié.

## Fonctionnalités

- **Collaboration en temps réel** : synchronisation via Firebase Realtime Database entre appareils.
- **Suivi de progression** : pièces placées ou restantes, barre, courbe d’historique avec échantillonnage et export PNG.
- **Thème** : clair, sombre ou système (menu dans la barre, mémorisé localement).
- **Préférences par pseudo** : mode du compteur mémorisé localement pour chaque pseudo.
- **Mode lecture seule** : suivre un puzzle sans modifier les données.
- **Photos** : galerie avec légende, date d’ajout, réordonnancement (glisser-déposer ou flèches), rotation, limite de taille à l’envoi.
- **Checkpoints** : ajout rapide (progression, modèles, libellé libre), drapeau sur l’étape courante, tout décocher, suppression individuelle.
- **Internationalisation** : français et anglais (accueil et tableau de bord).
- **Présence** : membres « en ligne » avec rafraîchissement et filtre d’activité récente.
- **Historique** : entrées limitées automatiquement côté base ; export **CSV** / **JSON** et journal des dernières mises à jour dans le tableau de bord.
- **Raccourcis pièces** : pas rapide ±1 / ±10 (complément des pas 1–100) ; vibration légère sur mobile après enregistrement réussi ; annonce `aria-live` quand le compteur change côté serveur.
- **Invitation** : paramètre d’URL `?join=CODE` (ou `room` / `code`) pour pré-remplir « Rejoindre » ; partage enrichi depuis le tableau de bord. Menu latéral : tri des puzzles publics (avancement, nom).
- **Build** : découpage Vite (`firebase`, `lucide`, `date-fns`, `motion`, `vendor`) pour de meilleurs caches navigateur.
- **PWA** : installable, mises à jour via bannière interne (`prompt`).

### Installer la PWA (téléphone / ordinateur)

1. Déployez ou lancez le site en **HTTPS** (requis pour le service worker).
2. **Chrome / Edge (desktop)** : icône « Installer l’application » dans la barre d’adresse, ou menu ⋮ → *Installer Mister Puzzle*.
3. **Android (Chrome)** : menu ⋮ → *Installer l’application* ou *Ajouter à l’écran d’accueil*.
4. **Safari (iOS)** : bouton Partager → *Sur l’écran d’accueil*.
5. **Mises à jour** : la bannière interne propose de recharger quand une nouvelle version est disponible.

## Technologies

- **Frontend** : [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Style** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Données** : [Firebase Realtime Database](https://firebase.google.com/docs/database)
- **Icônes UI** : [Lucide React](https://lucide.dev/)

## Installation

1. Clonez le dépôt.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Configurez les variables d’environnement. Créez un fichier `.env.local` à partir de `.env.example` et renseignez les clés Firebase.
4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

### Build local (Windows)

Si `npm run build` échoue avec une erreur du type « Cannot find module @rollup/rollup-win32-x64-msvc », c’est un problème connu des dépendances optionnelles de npm. Essayez une réinstallation propre : supprimez `node_modules` et `package-lock.json`, puis `npm install` à nouveau (ou utilisez une version LTS de Node recommandée par le projet).

## Déploiement

L’application est prévue pour un déploiement automatique sur **GitHub Pages** via GitHub Actions lors d’un push sur la branche `main`.

Le chemin de base est configuré sur `/mister-puzzle/` (voir `vite.config.ts` : `base`, `manifest.start_url` et `manifest.scope`).

## Sécurité (Firebase)

Les règles de la base sont dans `database.rules.json` et peuvent être déployées via votre workflow. Le « mot de passe puzzle » est un hash côté client (SHA-256) : protection d’usage courant, pas un équivalent d’authentification serveur forte. Pour des exigences plus élevées, prévoir Firebase Auth et des règles basées sur l’identité.

---

Développé pour les passionnés de puzzles.
