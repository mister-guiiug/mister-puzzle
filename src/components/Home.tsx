import React, { useState } from 'react';
import { Socket } from 'socket.io-client';

interface HomeProps {
  socket: Socket;
}

const Home: React.FC<HomeProps> = ({ socket }) => {
  const [name, setName] = useState('');
  const [totalPieces, setTotalPieces] = useState(1000);
  const [roomCode, setRoomCode] = useState('');

  const handleCreate = () => {
    if (name && totalPieces > 0) {
      socket.emit('createPuzzle', { name, totalPieces });
    }
  };

  const handleJoin = () => {
    if (roomCode) {
      socket.emit('joinRoom', roomCode.toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
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
          className="w-full bg-indigo-600 text-white p-2 rounded font-bold hover:bg-indigo-700 transition"
        >
          Créer
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
          className="w-full bg-green-600 text-white p-2 rounded font-bold hover:bg-green-700 transition"
        >
          Rejoindre
        </button>
      </div>
    </div>
  );
};

export default Home;
