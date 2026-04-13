import { useState, useEffect } from 'react';
import { usePuzzle } from './hooks/useSocket';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import { UpdateBanner } from './components/UpdateBanner';

const getHashCode = () => {
  const hash = window.location.hash.slice(1).toUpperCase();
  return hash || null;
};

function AppHeader({ onHome }: { onHome: () => void }) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
        <button onClick={onHome} className="flex items-center gap-2 hover:opacity-80 transition" title="Accueil">
          <img src="/mister-puzzle/logo.png" alt="Mister Puzzle" className="w-8 h-8" />
          <span className="font-bold text-indigo-600 text-lg tracking-tight">Mister Puzzle</span>
        </button>
      </div>
    </header>
  );
}

function App() {
  const [roomCode, setRoomCode] = useState<string | null>(getHashCode);
  const { puzzle, loading } = usePuzzle(roomCode);

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

  return (
    <>
      <AppHeader onHome={handleBack} />
      <div className="min-h-screen bg-gray-50">
        {roomCode ? (
          loading ? (
            <div className="flex items-center justify-center h-screen">
              <p className="text-gray-400 text-lg animate-pulse">Chargement...</p>
            </div>
          ) : puzzle ? (
            <Dashboard puzzle={puzzle} onBack={handleBack} />
          ) : (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
              <p className="text-gray-500">Puzzle introuvable.</p>
              <button onClick={handleBack} className="text-indigo-600 underline">
                Retour à l'accueil
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
