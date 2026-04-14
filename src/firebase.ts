import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFirebaseWebConfig } from './config/firebaseEnv';

const app = initializeApp(getFirebaseWebConfig());
export const db = getDatabase(app);
