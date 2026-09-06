import {
  SPONSOR_URL,
  repoUrl,
} from '@mister-guiiug/dev-pwa-config/apps-catalog';
import { currentIssueReportUrl } from '@mister-guiiug/dev-pwa-config/issue-report';
import { useI18n } from '../i18n/I18nContext';

const REPO_URL = repoUrl('mister-puzzle');
const ISSUE_OPTIONS = { repoUrl: REPO_URL };

/**
 * Les trois liens de la règle famille — code source, signalement et soutien —
 * rendus par la COQUILLE (`App.tsx`), donc sur l'accueil comme sur le puzzle
 * ouvert.
 *
 * Ils vivaient dans le pied de page de `Home`, et cette application n'a pas de
 * routeur : elle bascule sur le code de partie. Une fois un puzzle ouvert,
 * l'accueil n'est plus rendu — le code source disparaissait avec lui, et c'est
 * l'écran où l'on passe tout son temps.
 *
 * Les SVG sont dessinés en ligne : cette application ne déclare pas de
 * bibliothèque d'icônes ici.
 *
 * LES URL VIENNENT DU CATALOGUE, plus d'un `define` Vite ni d'une chaîne
 * recopiée. L'adresse de soutien est la même pour toute la famille : recopiée
 * dans chaque app, elle finit par diverger, et une adresse de don périmée ne
 * se voit pas.
 *
 * « SIGNALER UN PROBLÈME » (VALEUR.md, V4). Le codemod de l'étape 5 du socle
 * posait `AppFooter issues` — il a sauté cette application, qui n'a pas
 * d'`AppFooter` : ce pied de page est maison, et adopter celui du socle
 * dupliquerait le lien source et le bouton café qu'il rend déjà. On appelle
 * donc directement `currentIssueReportUrl` (socle 4.4.1), qui compose l'URL du
 * gabarit `bug.yml` avec la version, le commit, l'écran et le navigateur —
 * tout ce que l'utilisateur ne sait jamais dire, et que la première réponse
 * réclame toujours.
 *
 * L'URL est RECALCULÉE AU CLIC, comme le fait `AppFooter` du socle : cette
 * application route dans le fragment (`#CODE`) et ce composant est monté HORS
 * de la bascule d'écran — il ne se rend pas à nouveau quand on ouvre un
 * puzzle. Figée au rendu, l'URL désignerait toujours l'accueil.
 */
export function FamilyLinks() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 pb-6 text-xs">
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-fg-muted transition hover:text-fg-muted dark:text-fg-faint dark:hover:text-fg"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        {t('common.footerSource')}
      </a>
      <a
        href={currentIssueReportUrl(ISSUE_OPTIONS)}
        target="_blank"
        rel="noopener noreferrer"
        data-dwc="footer-issues"
        onClick={event => {
          event.currentTarget.href = currentIssueReportUrl(ISSUE_OPTIONS);
        }}
        className="flex items-center gap-1 text-fg-muted transition hover:text-fg-muted dark:text-fg-faint dark:hover:text-fg"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-4 h-4"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v5" />
          <path d="M12 16.5h.01" />
        </svg>
        {t('common.footerIssues')}
      </a>
      <a
        href={SPONSOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full hover:bg-yellow-300 transition text-xs"
      >
        ☕ Buy me a coffee
      </a>
    </div>
  );
}
