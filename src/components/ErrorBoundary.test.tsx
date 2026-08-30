import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@mister-guiiug/dev-wpa-config/react';

/**
 * L'écran de secours de l'app est celui du socle (monté dans main.tsx), et son
 * CSS aussi depuis la 3.22.0 : la copie locale de src/index.css a été
 * supprimée au profit de la règle `:where(#root) > [data-dwc='error-boundary']`
 * de components.css. Ces tests verrouillent le contrat dont cette suppression
 * dépend : le repli est rendu comme ENFANT DIRECT du point de montage
 * (StrictMode n'ajoute aucun nœud DOM) et porte les attributs `data-dwc` que
 * la feuille du socle cible.
 */

function Bomb({ armed }: { armed: boolean }) {
  if (armed) throw new Error('boum');
  return <p>contenu rétabli</p>;
}

describe('ErrorBoundary (socle) — écran de secours', () => {
  beforeEach(() => {
    // React relaie l'erreur capturée vers console.error : sans intérêt ici.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rend les enfants tels quels sans erreur', () => {
    const { container } = render(
      <ErrorBoundary>
        <Bomb armed={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('contenu rétabli')).toBeInTheDocument();
    expect(
      container.querySelector("[data-dwc='error-boundary']")
    ).not.toBeInTheDocument();
  });

  it('au crash : repli en enfant direct, attributs data-dwc stylés par components.css, onError relayé', () => {
    const onError = vi.fn();
    const { container } = render(
      <ErrorBoundary onError={onError}>
        <Bomb armed />
      </ErrorBoundary>
    );

    // Enfant direct du point de montage : la condition exacte de la règle
    // plein écran `:where(#root) > [data-dwc='error-boundary']` du socle.
    const fallback = container.firstElementChild;
    expect(fallback).toHaveAttribute('data-dwc', 'error-boundary');
    expect(fallback).toHaveAttribute('role', 'alert');

    // Les deux descendants que la feuille du socle habille.
    expect(
      container.querySelector("[data-dwc='error-boundary-title']")
    ).toBeInTheDocument();
    expect(
      container.querySelector("[data-dwc='error-boundary-reset']")
    ).toBeInTheDocument();

    // Le branchement observabilité de main.tsx repose sur ce relais.
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'boum' }),
      expect.anything()
    );
  });

  it('« Réessayer » remonte les enfants une fois la cause corrigée', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb armed />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    // La cause est corrigée, mais la frontière garde son état d'erreur…
    rerender(
      <ErrorBoundary>
        <Bomb armed={false} />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // …jusqu'au « Réessayer » (libellé par défaut du socle, celui que l'app
    // affiche : main.tsx ne passe aucun libellé).
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('contenu rétabli')).toBeInTheDocument();
  });
});
