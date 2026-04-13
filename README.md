# Mister Puzzle

![Icône Mister Puzzle](public/logo.svg)

**Mister Puzzle** est une application web progressive (PWA) pour suivre ensemble l’avancement d’un puzzle : pièces placées ou restantes, historique graphique, photos, checkpoints et partage par code.

## Identité (titre & icône)

- **Nom affiché** : *Mister Puzzle* (barre de navigation, partage, pied de page).
- **Titre de l’onglet** : *Mister Puzzle — progression collaborative* (`index.html`).
- **Icône principale** : `public/logo.svg` — marque vectorielle (grille 3×3 sur dégradé indigo / violet), utilisée sur l’accueil, dans la barre du haut et comme favicon. Les balises `<img>` utilisent `import.meta.env.BASE_URL` pour rester correctes avec le `base` Vite (`/mister-puzzle/`).
- **PWA** : le manifeste référence `logo.svg` ainsi que les PNG `pwa-192x192.png` et `pwa-512x512.png` à la racine de `public/` (install / écran d’accueil). Ajoutez ou régénérez ces PNG si besoin pour un rendu optimal sur toutes les plateformes.

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
- **Historique** : entrées limitées automatiquement côté base.
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
