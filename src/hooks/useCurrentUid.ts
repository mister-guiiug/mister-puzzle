import { useEffect, useState } from 'react';
import { ensureAnonymousAuth, getCurrentUid } from '../auth';

/**
 * L'uid de la connexion anonyme, ou `null` tant qu'elle n'a pas abouti — et
 * définitivement `null` si le propriétaire n'a pas activé la connexion anonyme
 * dans la console Firebase. Les appelants doivent traiter `null` comme
 * « on ne sait pas », pas comme « ce n'est pas vous ».
 */
export function useCurrentUid(): string | null {
  const [uid, setUid] = useState<string | null>(getCurrentUid);

  useEffect(() => {
    let alive = true;
    void ensureAnonymousAuth().then(value => {
      if (alive) setUid(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  return uid;
}
