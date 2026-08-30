import { registerSW } from 'virtual:pwa-register';
import { UpdatePromptBanner } from '@mister-guiiug/dev-wpa-config/react/update-prompt-banner';
import { useI18n } from '../i18n/I18nContext';

/**
 * Bandeau « nouvelle version disponible », rendu par le socle
 * (`react/update-prompt-banner`). Ce fichier ne garde que le câblage propre à
 * Mister Puzzle : `registerSW`, la durée de report, l'habillage et les
 * libellés.
 *
 * POURQUOI `registerSW` EST PASSÉ ICI. Le bandeau du socle n'importe pas
 * `virtual:pwa-register` — ce module virtuel n'existe que dans un build Vite
 * avec vite-plugin-pwa. Sans cette prop, `needRefresh` reste faux et le bandeau
 * ne s'affiche JAMAIS, sans erreur ni test rouge. C'est le seul point de
 * câblage qui compte, et `UpdateBanner.test.tsx` le verrouille.
 *
 * CE QUI CHANGE POUR L'UTILISATEUR. La barre écrite à la main offrait DEUX
 * sorties : « Plus tard (24 h) », persistée, et « Ignorer », le temps de la
 * session. Le socle n'en rend qu'une — avec `snoozeHours > 0`, c'est le report.
 * La sortie la plus forte est donc conservée, la plus faible disparaît (elle
 * n'apportait rien de plus : les deux masquaient le bandeau sur-le-champ).
 * Disparaît aussi la pastille « Mise à jour », décorative.
 *
 * UN SECOND BOUTON DE SORTIE et une CLÉ DE REPORT CONFIGURABLE sont les deux
 * capacités que le socle n'offre pas : candidates à une évolution, pas des
 * motifs pour rester à l'écart.
 */

/** Clé de report du socle, non configurable via `UpdatePromptBanner`. */
const SOCLE_SNOOZE_KEY = 'dwc_sw_update_snoozed_until';

/** Clé historique de l'app, portée par la version écrite à la main. */
const LEGACY_SNOOZE_KEY = 'mister_puzzle_update_snooze_until_ms';

/**
 * Reprend un report déjà posé sous l'ancienne clé.
 *
 * `UpdatePromptBanner` ne prend pas de `snoozeKey` : il lit toujours celle du
 * socle. Sans cette reprise, un report en cours serait oublié et le bandeau
 * reviendrait aussitôt — exactement ce que la version précédente avait pris
 * soin d'éviter. Même format des deux côtés : une époque en millisecondes.
 *
 * Appelée une fois au chargement du module, donc avant le premier rendu du
 * bandeau, qui lit la valeur à l'initialisation. Non exportée : c'est cet
 * appel-là que le test éprouve, pas la fonction isolée.
 */
function adoptLegacySnooze(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_SNOOZE_KEY);
    if (legacy === null) return;
    localStorage.removeItem(LEGACY_SNOOZE_KEY);

    const until = Number(legacy);
    // Un report expiré ou illisible n'a rien à reporter : on se contente
    // d'avoir retiré la clé morte.
    if (!Number.isFinite(until) || until <= Date.now()) return;

    const current = Number(localStorage.getItem(SOCLE_SNOOZE_KEY) ?? 0);
    if (!(current > until))
      localStorage.setItem(SOCLE_SNOOZE_KEY, String(until));
  } catch {
    /* stockage refusé (navigation privée) : le report repart de zéro */
  }
}

adoptLegacySnooze();

export function UpdateBanner() {
  const { t } = useI18n();

  return (
    <UpdatePromptBanner
      registerSW={registerSW}
      snoozeHours={24}
      className="puzzle-update-banner sticky top-0 z-[60] w-full justify-center gap-2 sm:gap-3 px-3 py-3 sm:py-3.5 bg-gradient-to-r from-primary-soft via-surface to-primary-soft shadow-md backdrop-blur-sm pt-[max(0.75rem,env(safe-area-inset-top,0px))]"
      title={t('nav.updateBannerTitle')}
      updateLabel={t('nav.updateBannerCta')}
      // Le i18n de l'app est écrit à la main (pas `createI18n`), donc AUCUN
      // `LabelsProvider` n'est monté : sans ce libellé, l'état transitoire du
      // socle resterait en français pour tout le monde.
      updatingLabel={t('nav.updateBannerUpdating')}
      snoozeLabel={t('nav.updateBannerSnooze')}
    />
  );
}
