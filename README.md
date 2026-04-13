# Mister Puzzle

Application web progressive (PWA) collaborative pour suivre l'avancement de vos puzzles en temps réel.

## Fonctionnalités

- **Collaboration en temps réel** : synchronisation via Firebase Realtime Database entre appareils.
- **Suivi de progression** : pièces placées ou restantes, barre de progression, courbe d’historique.
- **Préférences par pseudo** : mode d’affichage du compteur mémorisé localement pour chaque pseudo.
- **Mode lecture seule** : suivre un puzzle sans modifier les données (paramètres).
- **Photos** : galerie avec légende, date d’ajout, réordonnancement (glisser-déposer ou flèches), rotation et limite de taille à l’envoi.
- **Checkpoints** : modèles rapides, tout décocher, création manuelle ou drapeau sur l’étape courante.
- **Export** : image PNG récapitulative (nom, progression, lien).
- **Internationalisation** : français et anglais (sélecteur sur l’accueil et dans les paramètres du puzzle).
- **Présence** : membres « en ligne » avec rafraîchissement régulier et filtre d’activité récente.
- **Historique** : entrées limitées automatiquement (taille maîtrisée côté base).
- **PWA** : installable, mises à jour via bannière interne.

### Installer la PWA (téléphone / ordinateur)

1. Déployez ou lancez le site en **HTTPS** (requis pour le service worker).
2. **Chrome / Edge (desktop)** : icône « Installer l’application » dans la barre d’adresse, ou menu ⋮ → *Installer Mister Puzzle*.
3. **Android (Chrome)** : menu ⋮ → *Installer l’application* ou *Ajouter à l’écran d’accueil*.
4. **Safari (iOS)** : bouton Partager → *Sur l’écran d’accueil*.
5. Les **mises à jour** : la bannière interne propose de recharger quand une nouvelle version est disponible (stratégie `prompt` du plugin PWA).

## Technologies

- **Frontend** : [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Style** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Données** : [Firebase Realtime Database](https://firebase.google.com/docs/database)
- **Icônes** : [Lucide React](https://lucide.dev/)

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

Le chemin de base est configuré sur `/mister-puzzle/`.

## Sécurité (Firebase)

Les règles de la base sont dans `database.rules.json` et peuvent être déployées via votre workflow. Le « mot de passe puzzle » est un hash côté client (SHA-256) : c’est une protection d’usage courant, pas un équivalent d’authentification serveur forte. Pour des exigences plus élevées, prévoir Firebase Auth et des règles basées sur l’identité.

---
Développé pour les passionnés de puzzles.
