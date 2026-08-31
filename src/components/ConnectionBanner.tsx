import { ConnectionBanner as SocleConnectionBanner } from '@mister-guiiug/dev-wpa-config/react/connection-banner';
import { useI18n } from '../i18n/I18nContext';

/**
 * Bandeau « hors ligne », posé UNE SEULE FOIS par `App`.
 *
 * REMPLACE UN BLOC ÉCRIT À LA MAIN DANS `App.tsx`, qui lisait son propre état
 * `online` alimenté par deux écouteurs `online`/`offline`. Il n'avait AUCUNE
 * temporisation : un basculement réseau d'une demi-seconde faisait apparaître
 * puis disparaître un bandeau qui pousse tout le contenu vers le bas. Le
 * composant du socle attend 1,5 s hors ligne CONTINU.
 *
 * `role` : le bloc d'origine annonçait `alert`, le socle annonce `status`. C'est
 * un GAIN, pas une perte. `alert` est assertif — il interrompt le lecteur
 * d'écran au milieu d'une phrase. Perdre le réseau dans une app dont le
 * comptage de pièces continue en file locale n'est pas une urgence : `status`
 * (poli) attend une pause pour l'annoncer.
 *
 * Il reste EN TÊTE DE `<main>`, dans le flux, là où le bloc d'origine se
 * trouvait : le bandeau de mise à jour est au-dessus (`sticky top-0`, avant la
 * barre de navigation) et l'empilement vertical est déjà celui qu'on veut.
 */
export function ConnectionBanner() {
  const { t } = useI18n();
  return (
    <SocleConnectionBanner
      className="puzzle-connection-banner"
      label={
        <>
          <strong className="font-semibold">{t('app.offlineTitle')}</strong> —{' '}
          {t('app.offlineDetail')}
        </>
      }
    />
  );
}
