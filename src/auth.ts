import { getFirebaseApp } from './firebase';
import { reportError } from './utils/reportError';

/**
 * Connexion ANONYME Firebase — invisible pour l'utilisateur.
 *
 * Pourquoi elle existe : sans identité, les règles de la base ne peuvent
 * réserver la suppression d'un puzzle à personne, et n'importe qui pouvait
 * effacer des mois de progression en lisant un code dans la liste publique
 * (VALEUR.md, V3). `signInAnonymously` donne un `auth.uid` stable par
 * navigateur — SANS inscription, sans e-mail, sans écran de connexion. Le
 * README construit tout son argumentaire sur l'absence de compte, et cette
 * propriété survit : l'utilisateur ne voit rien.
 *
 * Pourquoi c'est un `import()` : `firebase/auth` pèse 24,6 kB gzip, et rien
 * n'en a besoin avant la première écriture. Le chunk part de son côté
 * (`manualChunks`, `firebase-auth`) et n'est chargé qu'au premier appel.
 *
 * QUAND ELLE EST APPELÉE, et pas plus tôt : à la CRÉATION d'un puzzle (le seul
 * endroit où la propriété se pose) et à l'ouverture d'un tableau de bord
 * (`useCurrentUid`, pour savoir si l'on peut le gérer). Surtout PAS au montage
 * de la coquille : l'accueil ne touche à aucun service distant aujourd'hui —
 * l'e2e « pas d'erreurs console » en dépend — et faire signer un visiteur qui
 * ne créera peut-être rien coûte une requête réseau pour rien.
 *
 * CE QUI ARRIVE SI LE PROPRIÉTAIRE N'A PAS ACTIVÉ LA CONNEXION ANONYME dans la
 * console Firebase (Authentication → Sign-in method → Anonymous) :
 * `signInAnonymously` échoue en `auth/operation-not-allowed` — ou en
 * `auth/configuration-not-found` si le service n'est pas provisionné du tout.
 * On le journalise UNE fois et on rend `null`. L'application continue
 * exactement comme avant : on crée, on lit et on pose des pièces sans
 * propriétaire, et les règles laissent passer (elles n'exigent `auth != null`
 * nulle part). Pas d'écran blanc, pas de bouton mort.
 */
let pending: Promise<string | null> | null = null;
let uid: string | null = null;

/** L'uid courant, ou `null` tant que la connexion n'a pas abouti (ou a échoué). */
export function getCurrentUid(): string | null {
  return uid;
}

/**
 * Ouvre la session anonyme, une seule fois par onglet. Ne rejette JAMAIS :
 * rend l'uid, ou `null` si la connexion anonyme n'est pas disponible.
 */
export function ensureAnonymousAuth(): Promise<string | null> {
  if (pending) return pending;
  pending = (async () => {
    try {
      const { getAuth, signInAnonymously } = await import('firebase/auth');
      const auth = getAuth(getFirebaseApp());
      if (auth.currentUser) {
        uid = auth.currentUser.uid;
        return uid;
      }
      const credential = await signInAnonymously(auth);
      uid = credential.user.uid;
      return uid;
    } catch (err) {
      // Le seul cas attendu en exploitation : la case n'est pas cochée dans la
      // console. Tout le reste (réseau, quota) retombe au même endroit, avec
      // la même conséquence — un puzzle sans propriétaire, pas une panne.
      reportError('ensureAnonymousAuth', err, {});
      uid = null;
      return null;
    }
  })();
  return pending;
}
