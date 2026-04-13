import { useState, useEffect, useRef, useCallback } from 'react';
import { usePuzzle } from './hooks/useSocket';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import { Navbar } from './components/Navbar';
import { UpdateBanner } from './components/UpdateBanner';
import { saveToHistory } from './utils/history';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import PullToRefreshIndicator from './components/PullToRefreshIndicator';
import { useI18n } from './i18n/I18nContext';
import { getPseudo, isPseudoLocked } from './utils/pseudo';

const getHashCode = () => {
  const hash = window.location.hash.slice(1).toUpperCase();
  return hash || null;
};

function App() {
  const { t } = useI18n();
  const [roomCode, setRoomCode] = useState<string | null>(getHashCode);
  const { puzzle, loading, loadError } = usePuzzle(roomCode);
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
  }, [puzzle?.id, puzzle?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleHashChange = () => setRoomCode(getHashCode());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
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

  return (
    <>
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
      <Navbar
        pseudo={pseudo}
        onPseudoChange={setPseudo}
        pseudoLocked={pseudoLocked}
        onPseudoLockedChange={setPseudoLocked}
        onGoHome={handleBack}
        onNavigateToPuzzle={handleJoin}
        onPseudoCommit={handlePseudoCommit}
      />
      <div className="min-h-screen bg-gray-50">
        {!online && (
          <div
            className="bg-amber-50 border-b border-amber-200 text-amber-950 text-sm px-4 py-3 text-center"
            role="alert"
          >
            <strong className="font-semibold">{t('app.offlineTitle')}</strong> — {t('app.offlineDetail')}
          </div>
        )}
        {roomCode ? (
          loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <p className="text-gray-400 text-lg animate-pulse">{t('app.loading')}</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 max-w-md mx-auto text-center">
              <p className="text-gray-700">{t('app.loadError')}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {t('app.retryLoad')}
              </button>
              <button
                type="button"
                onClick={handleBack}
                className="text-indigo-600 underline text-sm focus:outline-none focus-visible:ring-2 rounded"
              >
                {t('app.backHome')}
              </button>
            </div>
          ) : puzzle ? (
            <Dashboard
              puzzle={puzzle}
              onBack={handleBack}
              pseudo={pseudo}
              pseudoRefreshKey={pseudoRefreshKey}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 max-w-md mx-auto text-center">
              <p className="text-lg font-semibold text-gray-800">{t('app.notFound')}</p>
              {roomCode && (
                <p className="text-sm font-mono text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">{roomCode}</p>
              )}
              <p className="text-gray-600 text-sm leading-relaxed">{t('app.notFoundDetail')}</p>
              <button
                type="button"
                onClick={handleBack}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {t('app.backHome')}
              </button>
            </div>
          )
        ) : (
          <Home onJoin={handleJoin} pseudo={pseudo} />
        )}
      </div>
      <UpdateBanner />
    </>
  );
}

export default App;
