import { useState, useEffect, useRef, useCallback } from 'react';
import { usePuzzle } from './hooks/useSocket';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import { UpdateBanner } from './components/UpdateBanner';
import { saveToHistory } from './utils/history';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import PullToRefreshIndicator from './components/PullToRefreshIndicator';
import { useI18n } from './i18n/I18nContext';

const getHashCode = () => {
  const hash = window.location.hash.slice(1).toUpperCase();
  return hash || null;
};

function AppHeader({ onHome }: { onHome: () => void }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-2 hover:opacity-80 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
          title={t('dashboard.back')}
          aria-label={t('dashboard.back')}
        >
          <img src="/mister-puzzle/logo.png" alt="" className="w-8 h-8" />
          <span className="font-bold text-indigo-600 text-lg tracking-tight">{t('common.appName')}</span>
        </button>
      </div>
    </header>
  );
}

function App() {
  const { t } = useI18n();
  const [roomCode, setRoomCode] = useState<string | null>(getHashCode);
  const { puzzle, loading } = usePuzzle(roomCode);
  const savedRef = useRef<string | null>(null);

  // Save/update history whenever puzzle loads or its name changes
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

  // Pull-to-refresh: reload the page (Firebase listeners will re-connect)
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);
  const { pullDistance, refreshing, threshold } = usePullToRefresh(handleRefresh);

  return (
    <>
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} threshold={threshold} />
      <AppHeader onHome={handleBack} />
      <div className="min-h-screen bg-gray-50">
        {roomCode ? (
          loading ? (
            <div className="flex items-center justify-center h-screen">
              <p className="text-gray-400 text-lg animate-pulse">{t('app.loading')}</p>
            </div>
          ) : puzzle ? (
            <Dashboard puzzle={puzzle} onBack={handleBack} />
          ) : (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
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
          <Home onJoin={handleJoin} />
        )}
      </div>
      <UpdateBanner />
    </>
  );
}

export default App;
