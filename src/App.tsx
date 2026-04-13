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
  const { puzzle, loading } = usePuzzle(roomCode);
  const savedRef = useRef<string | null>(null);

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
        {roomCode ? (
          loading ? (
            <div className="flex items-center justify-center min-h-[50vh]">
              <p className="text-gray-400 text-lg animate-pulse">{t('app.loading')}</p>
            </div>
          ) : puzzle ? (
            <Dashboard
              puzzle={puzzle}
              onBack={handleBack}
              pseudo={pseudo}
              pseudoRefreshKey={pseudoRefreshKey}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
              <p className="text-gray-500">{t('app.notFound')}</p>
              <button
                type="button"
                onClick={handleBack}
                className="text-indigo-600 underline focus:outline-none focus-visible:ring-2 rounded"
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
