import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import Home from './components/Home';
import Dashboard from './components/Dashboard';

interface Checkpoint {
  id: string;
  name: string;
  completed: boolean;
}

interface HistoryEntry {
  timestamp: number;
  placedPieces: number;
}

interface PuzzleState {
  id: string;
  name: string;
  totalPieces: number;
  placedPieces: number;
  checkpoints: Checkpoint[];
  photos: string[];
  history: HistoryEntry[];
}

function App() {
  const socket = useSocket();
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('puzzleUpdate', (updatedPuzzle: PuzzleState) => {
      setPuzzle(updatedPuzzle);
    });

    socket.on('puzzleCreated', (roomCode: string) => {
      console.log('Joined room:', roomCode);
    });

    socket.on('error', (msg: string) => {
      alert(msg);
    });

    return () => {
      socket.off('puzzleUpdate');
      socket.off('puzzleCreated');
      socket.off('error');
    };
  }, [socket]);

  if (!socket) return <div className="flex items-center justify-center h-screen">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {puzzle ? (
        <Dashboard socket={socket} puzzle={puzzle} />
      ) : (
        <Home socket={socket} />
      )}
    </div>
  );
}

export default App;
