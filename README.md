# 🧩 Mister Puzzle

Application web progressive (PWA) collaborative pour suivre l'avancement de vos puzzles en temps réel.

## ✨ Fonctionnalités

- **👥 Collaboration en temps réel** : Synchronisation instantanée entre plusieurs appareils grâce à Firebase.
- **📊 Suivi de progression** : Visualisation claire du nombre de pièces posées et du pourcentage de complétion.
- **⏱️ Estimations intelligentes** : Calcul automatique du temps restant (scénarios optimiste, réaliste et pessimiste) basé sur votre rythme actuel.
- **📸 Galerie photo** : Capturez et conservez des photos de l'évolution de votre puzzle.
- **✅ Checkpoints** : Marquez les étapes clés (contour, 50%, 75%).
- **📱 PWA** : Installable sur votre écran d'accueil pour une expérience fluide comme une application native.
- **🔔 Mises à jour** : Système de notification interne pour vous proposer les dernières versions de l'application.

## 🚀 Technologies

- **Frontend** : [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Style** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Base de données** : [Firebase Realtime Database](https://firebase.google.com/docs/database)
- **Icônes** : [Lucide React](https://lucide.dev/)
- **Animations** : [Framer Motion](https://www.framer.com/motion/)

## 🛠️ Installation

1. Clonez le dépôt.
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Configurez vos variables d'environnement. Créez un fichier `.env.local` en vous basant sur `.env.example` et ajoutez vos clés Firebase.
4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

## 📦 Déploiement

L'application est configurée pour un déploiement automatique sur **GitHub Pages** via GitHub Actions lors d'un push sur la branche `main`.

Le chemin de base est configuré sur `/mister-puzzle/`.

## 🔒 Sécurité (Firebase)

Les règles de sécurité de la base de données sont définies dans `database.rules.json` et sont automatiquement déployées via l'Action GitHub.

---
Développé avec ❤️ pour les passionnés de puzzles.
