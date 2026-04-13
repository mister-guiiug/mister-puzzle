import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(__dirname, 'puzzles.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // 100MB to handle multiple photos
});

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

let puzzles: Record<string, PuzzleState> = {};

// Load puzzles from file
if (fs.existsSync(DB_FILE)) {
  try {
    puzzles = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    console.log('Loaded puzzles from persistence');
  } catch (e) {
    console.error('Failed to load puzzles', e);
  }
}

const savePuzzles = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(puzzles, null, 2));
  } catch (e) {
    console.error('Failed to save puzzles', e);
  }
};

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on('joinRoom', (roomCode: string) => {
    if (puzzles[roomCode]) {
      socket.join(roomCode);
      socket.emit('puzzleUpdate', puzzles[roomCode]);
      console.log(`User ${socket.id} joined room ${roomCode}`);
    } else {
      socket.emit('error', 'Puzzle not found');
    }
  });

  socket.on('createPuzzle', (data: { name: string; totalPieces: number }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    puzzles[roomCode] = {
      id: roomCode,
      name: data.name,
      totalPieces: data.totalPieces,
      placedPieces: 0,
      checkpoints: [
        { id: '1', name: 'Contour fini', completed: false },
        { id: '2', name: '50% terminé', completed: false },
        { id: '3', name: '75% terminé', completed: false },
      ],
      photos: [],
      history: [{ timestamp: Date.now(), placedPieces: 0 }]
    };
    savePuzzles();
    socket.join(roomCode);
    socket.emit('puzzleCreated', roomCode);
    socket.emit('puzzleUpdate', puzzles[roomCode]);
    console.log(`Puzzle created: ${roomCode}`);
  });

  socket.on('updatePieces', ({ roomCode, placedPieces }: { roomCode: string; placedPieces: number }) => {
    if (puzzles[roomCode]) {
      puzzles[roomCode].placedPieces = placedPieces;
      puzzles[roomCode].history.push({ timestamp: Date.now(), placedPieces });
      savePuzzles();
      io.to(roomCode).emit('puzzleUpdate', puzzles[roomCode]);
    }
  });

  socket.on('toggleCheckpoint', ({ roomCode, checkpointId }: { roomCode: string; checkpointId: string }) => {
    if (puzzles[roomCode]) {
      const checkpoint = puzzles[roomCode].checkpoints.find(c => c.id === checkpointId);
      if (checkpoint) {
        checkpoint.completed = !checkpoint.completed;
        savePuzzles();
        io.to(roomCode).emit('puzzleUpdate', puzzles[roomCode]);
      }
    }
  });

  socket.on('addPhoto', ({ roomCode, photo }: { roomCode: string; photo: string }) => {
    if (puzzles[roomCode]) {
      puzzles[roomCode].photos.push(photo);
      savePuzzles();
      io.to(roomCode).emit('puzzleUpdate', puzzles[roomCode]);
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
