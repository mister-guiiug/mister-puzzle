# Puzzle Tracker PWA

Application collaborative pour gérer l'avancement d'un puzzle de A à Z.

## Fonctionnalités

- **Suivi des pièces** : Décompte en temps réel du nombre de pièces restantes.
- **Checkpoints** : Marquez les étapes clés (contour fini, 50%, etc.).
- **Collaboration** : Partagez un code unique pour synchroniser l'état entre plusieurs téléphones.
- **Photos** : Prenez des photos de l'avancement pour visualiser vos progrès.
- **Estimations** : Calcul automatique du temps restant selon trois scénarios (optimiste, réaliste, pessimiste).
- **PWA** : Installable sur mobile pour une expérience fluide.

## Installation & Déploiement

### Backend (Serveur)

Le serveur gère la synchronisation en temps réel et la persistance des données.

1. Allez dans le dossier `server`.
2. Installez les dépendances : `npm install`.
3. Lancez le serveur : `npm run start` (ou `node dist/index.js`).

Note : Pour un usage public, déployez ce serveur sur une plateforme comme Heroku, Render ou Railway.

### Frontend (Client)

L'application client est configurée pour être déployée sur GitHub Pages.

1. Allez dans le dossier `client`.
2. Installez les dépendances : `npm install`.
3. Créez un fichier `.env` et ajoutez l'URL de votre serveur : `VITE_SOCKET_URL=https://votre-serveur.com`.
4. Construisez l'application : `npm run build`.
5. Déployez le contenu du dossier `dist` sur GitHub Pages.

## Tech Stack

- **Frontend** : React, Tailwind CSS, Lucide React, Socket.io-client.
- **Backend** : Node.js, Express, Socket.io.
- **PWA** : Vite PWA Plugin.
