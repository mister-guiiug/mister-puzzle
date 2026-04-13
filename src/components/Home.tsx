import React, { useState, useEffect } from 'react';
import { Clock, Grid, Hash, ArrowRight, X } from 'lucide-react';
import { createPuzzle, joinPuzzle } from '../hooks/useSocket';
import ErrorModal from './ErrorModal';
import { getHistory, saveToHistory, removeFromHistory, type HistoryPuzzle } from '../utils/history';

interface HomeProps {
  onJoin: (roomCode: string) => void;
}

const Home: React.FC<HomeProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [rows, setRows] = useState(20);
  const [cols, setCols] = useState(50);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPuzzle[]>([]);

  const totalPieces = rows * cols;

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleCreate = async () => {
    if (!name) {
      setError('Veuillez donner un nom à votre puzzle.');
      return;
    }
    if (rows <= 0 || cols <= 0) {
      setError('Le nombre de lignes et colonnes doit être supérieur à 0.');
      return;
    }
    setLoading(true);
    try {
      const code = await createPuzzle(name, rows, cols);
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

      {/* Create */}
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Créer un nouveau puzzle</h2>
        <input
          type="text"
          placeholder="Nom du puzzle"
          className="w-full p-2 border rounded mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Grid calculator */}
        <div className="bg-indigo-50 rounded-xl p-4 mb-4 border border-indigo-100">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3 flex items-center gap-1">
            <Grid size={12} /> Grille de pièces
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Lignes</label>
              <input
                type="number"
                min={1}
                value={rows}
                onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2 border border-indigo-200 rounded-lg text-center text-lg font-bold focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              />
            </div>
            <span className="text-2xl text-indigo-300 font-light mt-4">×</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Colonnes</label>
              <input
                type="number"
                min={1}
                value={cols}
                onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full p-2 border border-indigo-200 rounded-lg text-center text-lg font-bold focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              />
            </div>
            <span className="text-2xl text-indigo-300 font-light mt-4">=</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Total</label>
              <div className="w-full p-2 bg-indigo-600 text-white rounded-lg text-center text-lg font-bold mt-0">
                {totalPieces.toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
          <p className="text-xs text-indigo-400 mt-2 text-center">
            Ajustable plus tard depuis le tableau de bord
          </p>
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-2 rounded font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Création...' : 'Créer'}
        </button>
      </div>

      {/* Join */}
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Rejoindre un puzzle</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Code (ex: AB12CD)"
              className="w-full pl-8 p-2 border rounded uppercase tracking-widest font-mono"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
          </div>
          <button
            onClick={() => handleJoin()}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {loading ? '...' : <><span>Rejoindre</span><ArrowRight size={16} /></>}
          </button>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="w-full max-w-md">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
            <Clock size={16} className="mr-2" /> Puzzles récents
          </h2>
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.code} className="relative group/row">
                <button
                  onClick={() => handleJoin(item.code)}
                  disabled={loading}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:border-indigo-300 hover:shadow-md transition group text-left pr-10"
                >
                  <div>
                    <p className="font-bold text-gray-800 group-hover:text-indigo-600 transition">
                      {item.name}
                    </p>
                    <p className="text-xs font-mono text-gray-400">{item.code}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(item.timestamp).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <ArrowRight size={18} className="text-gray-200 group-hover:text-indigo-500 transition" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromHistory(item.code);
                    setHistory(getHistory());
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full text-gray-200 hover:text-red-400 hover:bg-red-50 transition opacity-0 group-hover/row:opacity-100"
                  title="Retirer de l'historique"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
