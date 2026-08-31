import { useActionGuard } from '@mister-guiiug/dev-wpa-config/react/use-action-guard';
import { useI18n } from '../i18n/I18nContext';

/**
 * « Cette action peut-elle aboutir, et sinon QUE DIRE ? »
 *
 * POURQUOI CE GARDE EXISTE ICI. Le SDK Realtime Database ne REJETTE PAS quand le
 * socket est coupé : il met l'écriture en attente locale et la promesse ne se
 * règle jamais. Un `setLoading(true)` dans un `try/finally` reste donc à `true`
 * indéfiniment — un bouton « ... » qui tourne pour toujours. C'est l'échec le
 * plus muet qui soit, et c'est celui que l'app produisait.
 *
 * CE QU'IL NE FAUT PAS GARDER. Le comptage de pièces passe par
 * `updatePiecesResilient`, qui met sa mise à jour dans `offlinePieceQueue` et la
 * rejoue au retour du réseau. Cette file EXISTE DÉJÀ et fonctionne : la griser
 * casserait la seule chose que l'app sait faire hors ligne. Rien n'est ajouté
 * ni étendu de ce côté.
 *
 * POURQUOI LE MESSAGE EST REDONNÉ. Le socle résout `reason` depuis ses propres
 * libellés, qui exigent un `LabelsProvider` — l'app n'en monte aucun (i18n
 * écrit à la main), un anglophone lirait donc du français. On laisse au socle la
 * DÉCISION (`allowed`, `disabledProps`, `wrap`) et on garde le TEXTE.
 */
export function useNetworkGuard() {
  const { t } = useI18n();
  const guard = useActionGuard({ online: true });
  return {
    ...guard,
    reason: guard.allowed ? null : t('app.offlineAction'),
  };
}
