import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n/I18nContext';
import ErrorModal from './ErrorModal';

/**
 * ErrorModal est passé sur le `ConfirmDialog` du socle en mode MONO-ACTION
 * (`cancelLabel={null}`, 3.23.0). Ces tests verrouillent les quatre points sur
 * lesquels la migration pouvait silencieusement régresser :
 *
 *   1. le libellé du bouton reste celui de l'app (« J'ai compris »), pas le
 *      « OK » par défaut du dictionnaire `confirm` du socle ;
 *   2. il n'y a QU'UN bouton — c'est la condition du `:only-child { flex: 1 }`
 *      qui lui rend sa pleine largeur dans index.css ;
 *   3. le rôle est `alertdialog`, nommé par le titre et décrit par le message,
 *      et le focus initial va sur l'action unique ;
 *   4. les TROIS sorties (bouton, Échap, voile) appellent `onClose`.
 *
 * Les points 3 et 4 n'existaient pas dans la modale maison : elle n'avait ni
 * rôle, ni piège de focus, ni Échap, ni voile cliquable.
 */

function renderModal(message: string | null, onClose = vi.fn()) {
  const view = render(
    <I18nProvider>
      <ErrorModal message={message} onClose={onClose} />
    </I18nProvider>
  );
  return { ...view, onClose };
}

describe('ErrorModal — alerte mono-action', () => {
  beforeEach(() => {
    localStorage.clear(); // le i18n retombe sur le français
  });

  it('ne rend rien tant qu’aucun message n’est posé', () => {
    renderModal(null);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('rend une alerte nommée par le titre et décrite par le message', () => {
    renderModal('Connexion perdue');

    const dialog = screen.getByRole('alertdialog', {
      name: 'Oups ! Une erreur est survenue',
    });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      'Connexion perdue'
    );
  });

  it('n’affiche qu’un bouton, portant le libellé de l’app et non le « OK » du socle', () => {
    const { container } = renderModal('Connexion perdue');

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent("J'ai compris");
    expect(screen.queryByRole('button', { name: 'Annuler' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'OK' })).toBeNull();

    // Enfant unique de la rangée : la condition exacte du `:only-child`.
    const actions = container.querySelector("[data-dwc='confirm-actions']");
    expect(actions?.children).toHaveLength(1);
  });

  it('donne le focus initial au bouton unique', () => {
    renderModal('Connexion perdue');
    expect(screen.getByRole('button')).toHaveFocus();
  });

  it('appelle onClose au clic sur le bouton', () => {
    const { onClose } = renderModal('Connexion perdue');
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('appelle onClose sur Échap', () => {
    const { onClose } = renderModal('Connexion perdue');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('appelle onClose au clic sur le voile (correctif 3.23.0)', () => {
    const { container, onClose } = renderModal('Connexion perdue');

    const backdrop = container.querySelector("[data-dwc='confirm-backdrop']");
    expect(backdrop).toBeInTheDocument();
    fireEvent.mouseDown(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ne ferme pas sur un clic né dans le panneau', () => {
    const { container, onClose } = renderModal('Connexion perdue');

    fireEvent.mouseDown(container.querySelector("[data-dwc='confirm-panel']")!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('bascule le libellé du bouton avec la langue de l’app', () => {
    localStorage.setItem('mister_puzzle_locale', 'en');
    renderModal('Connection lost');
    expect(screen.getByRole('button')).toHaveTextContent('Got it');
  });
});
