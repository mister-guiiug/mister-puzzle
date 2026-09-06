import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
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
 */
export function getDb(): Database {
  if (database) return database;
  database = getDatabase(getFirebaseApp());
  return database;
}
