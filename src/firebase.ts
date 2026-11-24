import { initializeApp, type FirebaseApp } from 'firebase/app';
import { forceWebSockets, getDatabase, type Database } from 'firebase/database';
import { getFirebaseWebConfig } from './config/firebaseEnv';

let app: FirebaseApp | null = null;
let database: Database | null = null;

/**
 * L'application Firebase, ouverte paresseusement et partagée.
 *
 * Elle est partagée parce que la base ET la connexion anonyme doivent parler de
 * la MÊME application : c'est par le conteneur de composants de cette
 * application que la base récupère le jeton d'authentification, et donc que les
 * règles voient un `auth.uid`. Deux `initializeApp()` distincts, et la base
 * écrirait toujours en anonyme non authentifié.
 */
export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  app = initializeApp(getFirebaseWebConfig());
  return app;
}

/**
 * Ouvre paresseusement la Realtime Database.
 *
 * L'init au chargement du module tuait l'app avant `createRoot()` dès qu'une
 * `VITE_FIREBASE_*` manquait : `getFirebaseWebConfig()` lève, l'exception
 * remonte pendant l'évaluation du chunk d'entrée, donc écran blanc sans le
 * moindre diagnostic (et Lighthouse mort en NO_FCP). En paresseux, React monte,
 * l'ErrorBoundary peut afficher l'erreur, et les écrans qui ne touchent pas à
 * Firebase restent utilisables.
 *
 * WEBSOCKET SEUL (`forceWebSockets`), AVANT `getDatabase` : sinon la base
 * pouvait ne plus JAMAIS se connecter dans un navigateur. Le SDK inscrit
 * `firebase:previous_websocket_failure` dans le stockage local à CHAQUE
 * ouverture du WebSocket (« assume failure until proven otherwise ») et ne
 * l'efface qu'une fois la connexion jugée saine. Une page fermée ou rechargée
 * avant ce délai le laisse donc en place, et le chargement suivant démarre en
 * long polling : des `<script src="…firebasedatabase.app/.lp?…">` (JSONP), que
 * la CSP refuse (`script-src`). Le SDK ne remonte au WebSocket, qui efface la
 * marque, qu'après une connexion en long polling : jamais. Sans stockage local,
 * il suppose l'échec à chaque chargement. Relevé le 24/11/2026 : liste publique
 * figée en squelette, console pleine de refus `.lp`. En WebSocket seul, la
 * marque est ignorée et un échec se réessaie ; la CSP reste stricte.
 */
export function getDb(): Database {
  if (database) return database;
  forceWebSockets();
  database = getDatabase(getFirebaseApp());
  return database;
}
