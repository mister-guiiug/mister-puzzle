import { useState, useEffect } from 'react';
import { usePuzzle } from './hooks/useSocket';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import { UpdateBanner } from './components/UpdateBanner';

const getHashCode = () => {
  const hash = window.location.hash.slice(1).toUpperCase();
  return hash || null;
};

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
