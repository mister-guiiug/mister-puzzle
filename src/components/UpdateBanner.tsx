import { useUpdatePrompt } from '../hooks/useUpdatePrompt';

export function UpdateBanner() {
  const { needRefresh, update } = useUpdatePrompt();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-wrap items-center justify-center gap-3 px-4 py-3 bg-surface border-t border-border-ui shadow-up"
    >
      <p className="m-0 text-sm text-fg text-center max-w-lg">
        Une nouvelle version de l'application est disponible.
      </p>
      <button
        type="button"
        onClick={update}
        className="shrink-0 px-4 py-2 text-sm font-semibold text-white bg-primary-fill rounded-lg hover:bg-primary-fill-hover transition-colors cursor-pointer"
      >
        Mettre à jour
      </button>
    </div>
  );
}
