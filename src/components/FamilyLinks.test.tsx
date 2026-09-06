import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';
import { FamilyLinks } from './FamilyLinks';

/**
 * CE QUE CES TESTS TIENNENT — le canal de retour (VALEUR.md, V4).
 *
 * Le lien « Signaler un problème » n'a d'intérêt que PRÉREMPLI : sans version
 * ni écran ni navigateur, la première réponse à tout rapport est « quelle
 * version ? ». On vérifie donc l'URL, pas la présence d'un lien.
 *
 * ET ON VÉRIFIE QU'ELLE SUIT L'ÉCRAN. Cette application route dans le fragment
 * et `FamilyLinks` est monté hors de la bascule d'écran : il ne se rend pas à
 * nouveau quand on ouvre un puzzle. Une URL figée au rendu désignerait
 * toujours l'accueil ; c'est le clic qui la recalcule.
 */
const renderFooter = () =>
  render(
    <I18nProvider>
      <FamilyLinks />
    </I18nProvider>
  );

const issueLink = () =>
  document.querySelector<HTMLAnchorElement>('[data-dwc="footer-issues"]');

afterEach(() => {
  window.location.hash = '';
});

describe('FamilyLinks — « Signaler un problème »', () => {
  it('pointe sur le gabarit bug.yml du dépôt', () => {
    renderFooter();
    const href = issueLink()?.getAttribute('href') ?? '';
    expect(href).toContain(
      'https://github.com/mister-guiiug/mister-puzzle/issues/new'
    );
    expect(href).toContain('template=bug.yml');
  });

  it('préremplit l’environnement avec l’écran courant', () => {
    window.location.hash = '#ABC123';
    renderFooter();
    const params = new URL(issueLink()?.href ?? '').searchParams;
    expect(params.get('environnement')).toContain('écran ');
    expect(params.get('environnement')).toContain('#ABC123');
  });

  it('recalcule l’URL au clic, sans nouveau rendu du pied de page', () => {
    renderFooter();
    const link = issueLink();
    expect(link).not.toBeNull();
    // L'écran change SANS que React ne re-rende ce composant : c'est le cas
    // réel (`window.location.hash = code` dans `App`).
    window.location.hash = '#ZZZ999';
    expect(link?.href ?? '').not.toContain('ZZZ999');
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(
      new URL(link?.href ?? '').searchParams.get('environnement')
    ).toContain('#ZZZ999');
  });

  it('rend aussi le code source et le soutien', () => {
    renderFooter();
    expect(screen.getByText('Code source')).toBeInTheDocument();
    expect(screen.getByText(/Buy me a coffee/)).toBeInTheDocument();
  });
});
