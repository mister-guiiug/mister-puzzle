import { useState } from 'react';
import { usePuzzle } from './hooks/useSocket';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import { UpdateBanner } from './components/UpdateBanner';

function App() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const puzzle = usePuzzle(roomCode);

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {roomCode && puzzle ? (
          <Dashboard puzzle={puzzle} />
        ) : (
          <Home onJoin={setRoomCode} />
        )}
      </div>
      <UpdateBanner />
    </>
  );
}

export default App;
