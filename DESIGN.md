# DESIGN.md — Mister Puzzle · Workspace Atlas

Direction validée : **A · Workspace Atlas** (2026-03-28).

Objectif : passer d’une PWA « jouet indigo » à un outil collaboratif
**moderne, professionnel, enterprise-ready** (médiathèque, école, coworking,
événement), sans perdre la simplicité « un code, pas de compte ».

Maquettes interactives (référence visuelle) :
[`docs/maquettes/workspace-atlas.html`](./docs/maquettes/workspace-atlas.html)

---

## Memorable thing

> « C’est un vrai poste de travail collaboratif — pas une appli puzzle gadget. »

Chaque décision ci-dessous sert cette phrase.

---

## Thèse visuelle

- **Matériau** : surfaces plates, bordures nettes, ombre minimale (1 px + voile léger).
- **Énergie** : calme, précise, scannable à 60 km/h.
- **Écart volontaire** : pas de dégradé violet/indigo marque, pas de cartes
  jumelles « Créer / Rejoindre » à poids égal, pas de desktop = mobile élargi.

---

## Typographie

| Rôle | Famille | Usage |
|------|---------|--------|
| UI / corps | **IBM Plex Sans** | Labels, boutons, navigation, formulaires |
| Chiffres / codes | **IBM Plex Mono** | Compteur, code salle, KPI, % |
| Display (optionnel) | IBM Plex Sans Bold | Titres de page — pas de serif marketing |

Éviter Inter, Roboto, Arial, system-ui comme police de marque.

Échelle indicative : 11 / 13 / 15 / 20 / 26 — titres avec `letter-spacing` légèrement négatif.

---

## Couleur (clair)

Tokens cibles (à mapper sur les variables de `src/index.css`) :

| Token | Hex | Rôle |
|-------|-----|------|
| `--canvas` | `#f4f6f8` | Fond page |
| `--surface` | `#ffffff` | Panneaux |
| `--surface-muted` | `#eef1f5` | Inputs, rails |
| `--fg` / `--fg-heading` | `#15202b` | Texte |
| `--fg-muted` | `#4a5b6d` | Secondaire |
| `--fg-faint` | `#7a8b9c` | Hints (garder ≥ 4.5:1 sur surface) |
| `--divide` / `--border-ui` | `#d7dee7` | Séparateurs |
| `--primary` / fill | `#0f766e` | Accent teal |
| `--primary-strong` | `#115e59` | Hover / emphase |
| `--primary-soft` | `#ccfbf1` | Chips, focus soft |
| Succès / danger / warn | rester dans les verts / rouges / ambre actuels, calibrés AA |

Sombre : inverser canvas/surface en ardoise (`#0f1419` / `#1a222d`), accent teal
légèrement remonté (`#2dd4bf` pour texte/liens, fill plus sombre pour boutons).

**Interdit comme signature marque** : dégradés indigo → violet
(`--brand-from/via/to` actuels), glow logo violet.

---

## Layout & chrome

### Shell

- **Mobile** : barre haute persistante (menu · marque · profil) + contenu.
- **Desktop (≥ 1024px)** : sidebar gauche (accueil, récents, publics) + zone
  principale — plus un simple `max-w-4xl` centré.
- Wayfinding toujours lisible (trunk test) : site, page, sections, options.

### Accueil

1. **Rejoindre** = action primaire (job le plus fréquent).
2. **Créer** = secondaire, même panneau ou dessous, pas une carte jumelle.
3. **Récents** en liste dense avec % — pas une galerie de cartes.
4. Tour « 3 étapes » : compact ou dismissable ; ne doit plus dominer le viewport.

### Salle (dashboard)

Onglets (un job par panneau) :

| Onglet | Contenu |
|--------|---------|
| Progression | Compteur, +/- , enregistrement, contributeurs |
| Historique | Courbe, sessions, classement, exports |
| Médias | Checkpoints + photos |
| Réglages | Visibilité, grille, prefs locales, zone destructive |

Héros : nom + code mono + chip public/privé + % + partager.

### Statuts

Réseau, lecture seule, file offline, organisateur → **chips** dans le chrome
ou une seule rangée — pas quatre bannières empilées plein largeur.

### États

Mêmes patterns pour : chargement, salle introuvable, vide publics, erreur
permission/réseau, hors ligne. Une action de sortie évidente.

---

## Composants

- **Bouton primaire** : fill teal, coin ~9–10px, hauteur min 44px tactile.
- **Secondaire** : surface + bordure.
- **Chip** : soft teal ou neutre ; mono pour les codes.
- **Card** : bordure, quasi pas d’ombre ; pas de card dans un hero inutile.
- **Stepper pièces** : − / valeur mono / + ; raccourcis +10 / +50 secondaires.
- **Modales** : une question, un CTA primaire, Annuler secondaire.

---

## Motion

Sobre, 2–3 intentions max :

1. Transition d’onglet (fade/slide court ~150 ms).
2. Barre de progression qui s’anime à l’enregistrement.
3. Feedback succès enregistrement (chip ou toast bas, pas modal).

Pas de bounce, pas de glow pulsé, pas de confettis.

---

## Contenu & UX copy

- Moins de mots : supprimer le happy talk.
- Labels d’action = verbes (« Ouvrir la salle », « Enregistrer »).
- Erreurs : cause + prochaine action (« Réessayer », « Retour accueil »).

---

## Anti-patterns (à ne pas réintroduire)

- Dégradé marque violet / indigo
- Deux CTA créér/rejoindre de même poids
- Menu kebab qui cache Partager / Exporter / Stats
- Desktop = colonne unique centrée type mobile
- Pastilles décoratives / badges flottants sur le hero
- Empilement de bannières statut

---

## Plan d’implémentation (hors de ce commit)

Ordre suggéré pour les PR suivantes :

1. Tokens couleur + typos (CSS / chargement fonts) — sans restructurer les écrans
2. Shell navbar + sidebar desktop
3. Accueil (hiérarchie Rejoindre / Créer / Récents)
4. Dashboard → onglets + chips statut
5. États vides / erreur / offline alignés
6. Passage `npx pwa-doctor --strict` + a11y Playwright

Ce fichier est la source de vérité design jusqu’à révision explicite.
