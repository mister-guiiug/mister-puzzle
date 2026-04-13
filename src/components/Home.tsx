import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { createPuzzle, joinPuzzle } from '../hooks/useSocket';
import ErrorModal from './ErrorModal';
import { getHistory, saveToHistory, type HistoryPuzzle } from '../utils/history';

interface HomeProps {
  onJoin: (roomCode: string) => void;
}

const Home: React.FC<HomeProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [totalPieces, setTotalPieces] = useState(1000);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPuzzle[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleCreate = async () => {
    if (!name) {
      setError('Veuillez donner un nom à votre puzzle.');
      return;
    }
    if (totalPieces <= 0) {
      setError('Le nombre de pièces doit être supérieur à 0.');
      return;
    }

    setLoading(true);
    try {
      const code = await createPuzzle(name, totalPieces);
      saveToHistory(code, name);
      onJoin(code);
    } catch (err) {
      setError('Impossible de créer le puzzle. Vérifiez votre connexion.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (manualCode?: string) => {
    const codeToJoin = manualCode || roomCode;
    if (!codeToJoin) {
      setError('Veuillez entrer un code de puzzle.');
      return;
    }
    setLoading(true);
    try {
      const puzzle = await joinPuzzle(codeToJoin.toUpperCase());
      if (puzzle) {
        saveToHistory(puzzle.id, puzzle.name);
        onJoin(puzzle.id);
      } else {
        setError('Puzzle introuvable. Vérifiez le code.');
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la recherche du puzzle.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <ErrorModal message={error} onClose={() => setError(null)} />

      <img src="/mister-puzzle/logo.png" alt="Puzzle Tracker" className="w-32 h-32 mb-4 drop-shadow-lg" />
      <h1 className="text-4xl font-bold mb-8 text-indigo-600">Puzzle Tracker</h1>

      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Créer un nouveau puzzle</h2>
        <input
          type="text"
          placeholder="Nom du puzzle"
          className="w-full p-2 border rounded mb-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Nombre total de pièces"
          className="w-full p-2 border rounded mb-4"
          value={totalPieces}
          onChange={(e) => setTotalPieces(parseInt(e.target.value))}
        />
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-2 rounded font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Création...' : 'Créer'}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Rejoindre un puzzle</h2>
        <input
          type="text"
          placeholder="Code du puzzle (ex: AB12CD)"
          className="w-full p-2 border rounded mb-4"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
        <button
          onClick={() => handleJoin()}
          disabled={loading}
          className="w-full bg-green-600 text-white p-2 rounded font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Recherche...' : 'Rejoindre'}
        </button>
      </div>

      {history.length > 0 && (
        <div className="w-full max-w-md">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
            <Clock size={16} className="mr-2" /> Puzzles récents
          </h2>
          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.code}
                onClick={() => handleJoin(item.code)}
                disabled={loading}
                className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-indigo-300 hover:shadow-md transition group text-left"
              >
                <div>
                  <p className="font-bold text-gray-800 group-hover:text-indigo-600 transition">
                    {item.name}
                  </p>
                  <p className="text-xs font-mono text-gray-400">{item.code}</p>
                </div>
                <div className="text-indigo-100 group-hover:text-indigo-500 transition">
                  <Clock size={20} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
