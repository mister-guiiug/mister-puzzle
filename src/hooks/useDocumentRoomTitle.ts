import { useEffect, useRef } from 'react';
import type { PuzzleState } from './useSocket';

const DEFAULT_TITLE = 'Mister Puzzle — progression collaborative';

/**
 * Met à jour le titre (et brièvement la meta description) quand une salle est ouverte,
 * pour les onglets et les moteurs exécutant le JS. Les cartes Open Graph restent celles du HTML initial.
 */
export function useDocumentRoomTitle(puzzle: PuzzleState | null | undefined, loading: boolean) {
  const initialDescription = useRef<string | null>(null);

  useEffect(() => {
    if (initialDescription.current === null) {
      initialDescription.current =
        document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null;
    }
  }, []);

  useEffect(() => {
    const descEl = document.querySelector('meta[name="description"]');
    const restoreDescription = () => {
      const d = initialDescription.current;
      if (d && descEl) descEl.setAttribute('content', d);
    };

    if (loading || !puzzle) {
      document.title = DEFAULT_TITLE;
      restoreDescription();
      return;
    }

    document.title = `${puzzle.name} · ${DEFAULT_TITLE}`;
    if (descEl && initialDescription.current) {
      const extra = `Salle ${puzzle.id}. ${initialDescription.current}`;
      const merged = `${puzzle.name} — ${extra}`;
      descEl.setAttribute('content', merged.length > 320 ? `${merged.slice(0, 317)}…` : merged);
    }

    return () => {
      document.title = DEFAULT_TITLE;
      restoreDescription();
    };
  }, [puzzle, loading]);
}
