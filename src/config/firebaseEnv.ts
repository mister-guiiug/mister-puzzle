const KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readEnv(key: (typeof KEYS)[number]): string {
  const v = import.meta.env[key];
  return typeof v === 'string' ? v.trim() : '';
}

/** Valide les variables Firebase obligatoires (évite un échec opaque dans initializeApp). */
export function getFirebaseWebConfig(): FirebaseWebConfig {
  const missing: string[] = [];
  const entries = KEYS.map((k) => [k, readEnv(k)] as const);
  for (const [k, v] of entries) {
    if (!v) missing.push(k);
  }
  if (missing.length > 0) {
    throw new Error(
      `Configuration Firebase incomplète : définissez ${missing.join(', ')} (voir .env.example).`,
    );
  }
  const [apiKey, authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId] =
    entries.map(([, v]) => v);
  return {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}
