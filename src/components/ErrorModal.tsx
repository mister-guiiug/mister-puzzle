import React from 'react';
import { AlertCircle } from 'lucide-react';
import { ConfirmDialog } from '@mister-guiiug/dev-wpa-config/react/confirm-dialog';
import { useI18n } from '../i18n/I18nContext';

interface ErrorModalProps {
  message: string | null;
  onClose: () => void;
}

/**
 * Alerte d'erreur — coquille mince autour du `ConfirmDialog` du socle en mode
 * MONO-ACTION (`cancelLabel={null}`, 3.23.0), qui remplace `window.alert`.
 *
 * POURQUOI UNE COQUILLE, et pas un appel direct. Elle garde la signature
 * historique (`message: string | null`, `onClose`) qu'appellent Dashboard et
 * Home, et surtout elle branche le i18n MAISON : le socle a son propre
 * dictionnaire de libellés (`confirm.ok` → « OK »), l'app affiche
 * « J'ai compris » / « Got it ». La prop `confirmLabel` l'emporte sur les deux
 * autres niveaux, donc aucun `LabelsProvider` à monter pour ce seul écran.
 *
 * CE QUE LA MIGRATION APPORTE, et que la modale maison n'avait pas :
 * `role="alertdialog"` + `aria-modal` + nom accessible (`aria-labelledby` sur
 * le titre, `aria-describedby` sur le message), piège de focus, restitution du
 * focus à la fermeture, verrou de scroll, Échap, clic sur le voile. Les trois
 * sorties (bouton, Échap, voile) passent toutes par `onConfirm` : c'est le
 * contrat du mode mono-action.
 *
 * CE QU'ELLE RETIRE : la croix du coin supérieur droit. Elle était la SEULE
 * sortie alternative au bouton tant qu'Échap et le voile ne faisaient rien ;
 * il y en a maintenant deux, et son `aria-label` était le libellé du bouton
 * lui-même (« J'ai compris »), soit un doublon sans nom propre.
 *
 * La pastille d'alerte est décorative : elle est passée en `children` (donc
 * dans le corps, après le titre) et remontée VISUELLEMENT au-dessus du titre
 * par `.puzzle-alert-icon` dans index.css. L'ordre DOM sert le lecteur
 * d'écran — nom, puis description —, l'ordre visuel sert l'œil.
 */
const ErrorModal: React.FC<ErrorModalProps> = ({ message, onClose }) => {
  const { t } = useI18n();

  return (
    <ConfirmDialog
      className="puzzle-alert"
      open={Boolean(message)}
      title={t('common.errorModalTitle')}
      confirmLabel={t('common.errorModalClose')}
      cancelLabel={null}
      onConfirm={onClose}
    >
      <span className="puzzle-alert-icon" aria-hidden="true">
        <AlertCircle size={24} />
      </span>
      {message}
    </ConfirmDialog>
  );
};

export default ErrorModal;
