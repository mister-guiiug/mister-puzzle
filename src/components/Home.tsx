import React, { useState } from 'react';
import { createPuzzle, joinPuzzle } from '../hooks/useSocket';

interface HomeProps {
  onJoin: (roomCode: string) => void;
}

const Home: React.FC<HomeProps> = ({ onJoin }) => {
  const [name, setName] = useState('');
  const [totalPieces, setTotalPieces] = useState(1000);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || totalPieces <= 0) return;
    setLoading(true);
    try {
      const code = await createPuzzle(name, totalPieces);
      onJoin(code);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!roomCode) return;
    setLoading(true);
    try {
      const exists = await joinPuzzle(roomCode.toUpperCase());
      if (exists) {
        onJoin(roomCode.toUpperCase());
      } else {
        alert('Puzzle introuvable');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
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

      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Rejoindre un puzzle</h2>
        <input
          type="text"
          placeholder="Code du puzzle (ex: AB12CD)"
          className="w-full p-2 border rounded mb-4"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
        <button
          onClick={handleJoin}
          disabled={loading}
          className="w-full bg-green-600 text-white p-2 rounded font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Recherche...' : 'Rejoindre'}
        </button>
      </div>
    </div>
  );
};

export default Home;
