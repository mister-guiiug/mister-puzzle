import { initializeApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getFirebaseWebConfig } from './config/firebaseEnv';

let database: Database | null = null;

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
  database = getDatabase(initializeApp(getFirebaseWebConfig()));
  return database;
}
