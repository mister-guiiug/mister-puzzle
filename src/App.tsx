import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { usePuzzle } from './hooks/useSocket';
import Home from './components/Home';

const Dashboard = lazy(() => import('./components/Dashboard'));
import { Navbar } from './components/Navbar';
import { UpdateBanner } from './components/UpdateBanner';
import { saveToHistory } from './utils/history';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import PullToRefreshIndicator from './components/PullToRefreshIndicator';
import { useI18n } from './i18n/I18nContext';
import { getPseudo, isPseudoLocked } from './utils/pseudo';
import { useDocumentRoomTitle } from './hooks/useDocumentRoomTitle';
import { classifyFirebaseError } from './utils/classifyFirebaseError';
import { prefetchDashboardChunk } from './utils/prefetchDashboard';
import { flushOfflinePieceQueue } from './utils/offlinePieceQueue';
import { updatePieces } from './hooks/useSocket';

const getHashCode = () => {
  const hash = window.location.hash.slice(1).toUpperCase();
  return hash || null;
};

function App() {
  const { t } = useI18n();
  const [roomCode, setRoomCode] = useState<string | null>(getHashCode);
  const { puzzle, loading, loadError } = usePuzzle(roomCode);
  useDocumentRoomTitle(puzzle ?? undefined, loading);
  const savedRef = useRef<string | null>(null);
  const [online, setOnline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine);

  const [pseudo, setPseudo] = useState(() => getPseudo());
  const [pseudoLocked, setPseudoLocked] = useState(() => isPseudoLocked());
  const [pseudoRefreshKey, setPseudoRefreshKey] = useState(0);

  useEffect(() => {
    if (!puzzle) return;
    const key = `${puzzle.id}::${puzzle.name}`;
    if (key !== savedRef.current) {
      savedRef.current = key;
      saveToHistory(puzzle.id, puzzle.name);
    }
  }, [puzzle]);

  useEffect(() => {
    const handleHashChange = () => setRoomCode(getHashCode());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  /** Précharge le chunk du tableau de bord dès qu’une salle est ciblée (pendant le chargement Firebase). */
  useEffect(() => {
    if (roomCode) prefetchDashboardChunk();
  }, [roomCode]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      void flushOfflinePieceQueue(updatePieces);
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      void flushOfflinePieceQueue(updatePieces);
    }
  }, []);

  const handleJoin = (code: string) => {
    window.location.hash = code;
    setRoomCode(code);
  };

  const handleBack = () => {
    window.location.hash = '';
    setRoomCode(null);
  };

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);
  const { pullDistance, refreshing, threshold } = usePullToRefresh(handleRefresh);

  const handlePseudoCommit = useCallback(() => {
    setPseudoRefreshKey((k) => k + 1);
  }, []);

  const loadErrorMessage = useMemo(() => {
    if (!loadError) return null;
    const kind = classifyFirebaseError(loadError);
    if (kind === 'permission') return t('app.loadErrorPermission');
    if (kind === 'network') return t('app.loadErrorNetwork');
    return t('app.loadError');
  }, [loadError, t]);

  return (
    <>
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        refreshing={refreshing}
        threshold={threshold}
      />
      <UpdateBanner />
      <Navbar
        pseudo={pseudo}
        onPseudoChange={setPseudo}
        pseudoLocked={pseudoLocked}
        onPseudoLockedChange={setPseudoLocked}
        onGoHome={handleBack}
        onNavigateToPuzzle={handleJoin}
        onPseudoCommit={handlePseudoCommit}
      />
      <main id="contenu-principal" className="min-h-screen bg-canvas text-fg">
        {!online && (
          <div
            className="bg-warning-soft border-b border-warning-border text-warning-fg text-sm px-4 py-3 text-center"
            role="alert"
          >
            <strong className="font-semibold">{t('app.offlineTitle')}</strong> —{' '}
            {t('app.offlineDetail')}
          </div>
        )}
        {roomCode ? (
          loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <p className="text-fg-faint text-lg animate-pulse">{t('app.loading')}</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 max-w-md mx-auto text-center">
              <p className="text-fg-muted">{loadErrorMessage}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-primary-fill text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-fill-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
              >
                {t('app.retryLoad')}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="text-primary underline text-sm focus:outline-none focus-visible:ring-2 rounded"
              >
                {t('app.backHome')}
              </button>
            </div>
          ) : puzzle ? (
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[50vh]">
                  <p className="text-fg-faint text-lg animate-pulse">{t('app.loading')}</p>
                </div>
              }
            >
              <Dashboard
                puzzle={puzzle}
                onBack={handleBack}
                pseudo={pseudo}
                pseudoRefreshKey={pseudoRefreshKey}
              />
            </Suspense>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 max-w-md mx-auto text-center">
              <p className="text-lg font-semibold text-fg-heading">{t('app.notFound')}</p>
              {roomCode && (
                <p className="text-sm font-mono text-fg-muted bg-surface-muted px-3 py-1 rounded-lg">
                  {roomCode}
                </p>
              )}
              <p className="text-fg-muted text-sm leading-relaxed">{t('app.notFoundDetail')}</p>
              <button
                type="button"
                onClick={handleBack}
                className="bg-primary-fill text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-fill-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
              >
                {t('app.backHome')}
              </button>
            </div>
          )
        ) : (
          <Home onJoin={handleJoin} pseudo={pseudo} />
        )}
      </main>
    </>
  );
}

export default App;
