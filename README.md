# Mister Puzzle

![Icône Mister Puzzle](public/logo.svg){ width=64 }

## Aperçu de l'application

| Dashboard | Suivi de progression |
|:---:|:---:|
| ![Dashboard](src/assets/hero.png) | ![Progression](docs/assets/Designer.png) |

**Votre progression de puzzle, ensemble, en temps réel**

Un site web pour suivre ensemble l'avancement d'un puzzle : pièces placées, historique graphique, photos, checkpoints et partage par code.

Disponible sur **PC, tablette et mobile** — pas d'inscription, pas de compte, juste un code à partager.

---

## Pourquoi utiliser Mister Puzzle ?

Suivre un puzzle à plusieurs, c'est le chaos. Qui a mis quoi ? Où en est-on ? Qui a travaillé dessus hier ?

Mister Puzzle résoud ce problème avec une synchronisation **temps réel ou asynchrone** et un historique visuel clair.

## L'histoire d'origine

**Le problème** : Un puzzle géant pendant les vacances de famille. Tout le monde participe à son rythme :
- Les lève-tôt posent quelques pièces avant le petit-déjeuner
- Les nocturnes continuent après le dîner
- Les enfants entre deux temps calmes

Mais les membres de la famille qui ne sont PAS là sont frustrés :
- "Alors, on en est où là ?"
- "Envoyez-nous une photo du puzzle !"
- "Vous avez beaucoup avancé cette semaine ?"

**La solution Mister Puzzle** :
- Chacun met à jour le compteur après sa session
- **Progression partagée** automatiquement avec toute la famille
- **Historique visuel** : voir l'évolution sans redemander
- **Partage externe** : les absents suivent en temps réel comme un spectacle

**Le petit plus fun ? Les stats !** Qui a posé le plus de pièces cette semaine ? Vitesse de progression ? Top contributeurs ? Pour le défi et les conversations de famille.

## Exemples concrets d'utilisation

### Puzzle en médiathèque ou lieu public
Un puzzle est installé dans une médiathèque. Chaque visiteur peut contribuer à son rythme :
- Le matin, Madame X pose 50 pièces
- L'après-midi, un groupe d'ados continue
- Le soir, le bibliothécaire fait un point
- **Tout le monde suit la progression** sans jamais se rencontrer !

### Bureau / Coworking
Un puzzle dans une salle de repos :
- Matin : l'équipe marketing pose quelques pièces
- Midi : les développeurs continuent
- Soir : l'équipe RH termine une zone
- **Esprit d'équipe** sans contrainte d'horaire

### École / Bibliothèque scolaire
Un projet pédagogique sur plusieurs semaines :
- Les élèves de la classe A travaillent le lundi
- La classe B reprend le mercredi
- Suivi par l'enseignant entre les sessions
- **Projet collaboratif inter-classes**

### Événement public (salon, fête)
Un puzzle géant pendant un événement :
- Les participants viennent et repartent
- Chacun contribue ce qu'il veut
- Le public voit l'avancement en temps réel
- **Animation collective** sans coordination

### Cas solo mais multi-appareils
Un seul puzzleur qui utilise plusieurs appareils :
- Met à jour depuis son téléphone sur le canapé
- Continue sur son ordinateur
- Vérifie sur sa tablette
- **Synchronisation automatique** de tous ses appareils

---

## Fonctionnalités clés

| Fonctionnalité | Bénéfice |
|----------------|----------|
| **Collaboration live** | Voyez qui ajoute des pièces en temps réel |
| **Historique visuel** | Courbe de progression + export PNG pour voir l'évolution |
| **Galerie photos** | Capturez les étapes, réordonnez, faites pivoter |
| **Checkpoints** | Marquez les étapes (bordures finies, zones difficiles) |
| **Partage simplifié** | Un code à communiquer, rien de plus |
| **Mode hors ligne** | PWA installable, fonctionne sans internet |
| **Multi-appareils** | Synchronisation automatique entre tous vos appareils |
| **Thème clair/sombre** | S'adapte à vos préférences |
| **Internationalisation** | Français et anglais |

---

## Installer la PWA

Installez Mister Puzzle sur votre téléphone ou ordinateur pour un accès rapide :

1. **Chrome / Edge (desktop)** : icône "Installer l'application" dans la barre d'adresse, ou menu ⋮ → *Installer Mister Puzzle*
2. **Android (Chrome)** : menu ⋮ → *Installer l'application* ou *Ajouter à l'écran d'accueil*
3. **Safari (iOS)** : bouton Partager → *Sur l'écran d'accueil*
4. **Mises à jour** : la bannière interne propose de recharger quand une nouvelle version est disponible

---

## Documentation technique

### Identité (titre & icône)

- **Nom affiché** : *Mister Puzzle* (barre de navigation, partage, pied de page)
- **Titre de l'onglet** : *Mister Puzzle — progression collaborative* (`index.html`)
- **Icône principale** : `public/logo.svg` — marque vectorielle (grille 3×3 sur dégradé indigo / violet)
- **PWA** : le manifeste référence `logo.svg` ainsi que les PNG `pwa-192x192.png` et `pwa-512x512.png` à la racine de `public/`

### SEO et GEO (référencement classique + moteurs génératifs)

- **Balises** (`index.html`, injectées au build) : `canonical`, `hreflang` (fr, en, x-default), Open Graph (`og:*`), Twitter Card, `meta description` / `keywords` / `robots`, `theme-color`
- **Données structurées** : JSON-LD [Schema.org](https://schema.org) `WebApplication` + `FAQPage`
- **Fichiers générés dans `dist/` au build** : `robots.txt`, `sitemap.xml`, `llms.txt` (format utile aux crawlers " IA ")
- **Variable d'environnement** : `VITE_PUBLIC_SITE_ORIGIN` (sans slash final), ex. `https://votre-compte.github.io`

### Technologies

- **Frontend** : [React 19](https://react.dev/), [Vite](https://vitejs.dev/)
- **Style** : [Tailwind CSS v4](https://tailwindcss.com/)
- **Données** : [Firebase Realtime Database](https://firebase.google.com/docs/database)
- **Icônes UI** : [Lucide React](https://lucide.dev/)

### Installation pour les développeurs

1. Clonez le dépôt
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Configurez les variables d'environnement. Créez un fichier `.env.local` à partir de `.env.example` et renseignez les clés Firebase
4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

### Build local (Windows)

Si `npm run build` échoue avec une erreur du type "Cannot find module @rollup/rollup-win32-x64-msvc", essayez une réinstallation propre : supprimez `node_modules` et `package-lock.json`, puis `npm install` à nouveau.

### Déploiement

L'application est prévue pour un déploiement automatique sur **GitHub Pages** via GitHub Actions lors d'un push sur la branche `main`.

Le chemin de base est configuré sur `/mister-puzzle/` (voir `vite.config.ts` : `base`, `manifest.start_url` et `manifest.scope`).

### Sécurité (Firebase)

Les règles de la base sont dans `database.rules.json`. Le "mot de passe puzzle" est un hash côté client (SHA-256) : protection d'usage courant, pas un équivalent d'authentification serveur forte. Pour des exigences plus élevées, prévoir Firebase Auth et des règles basées sur l'identité.

---

Développé pour les passionnés de puzzles.
