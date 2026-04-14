import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(__dirname, 'puzzles.json');

const parseOrigins = (): string[] | null => {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return null;
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? list : null;
};

const allowedOrigins = parseOrigins();
const corsOriginOption: boolean | string[] = allowedOrigins ? allowedOrigins : true;

const app = express();
app.use(cors(typeof corsOriginOption === 'boolean' ? {} : { origin: allowedOrigins! }));
app.use(express.json({ limit: '50mb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: corsOriginOption,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e8, // 100MB to handle multiple photos
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

if (fs.existsSync(DB_FILE)) {
  try {
    puzzles = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    console.log('Loaded puzzles from persistence');
  } catch (e) {
    console.error('Failed to load puzzles', e);
  }
}

const savePuzzlesImmediate = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(puzzles, null, 2));
  } catch (e) {
    console.error('Failed to save puzzles', e);
  }
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 400;

const savePuzzlesDebounced = () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    savePuzzlesImmediate();
  }, SAVE_DEBOUNCE_MS);
};

const flushSave = () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  savePuzzlesImmediate();
};

process.on('SIGINT', () => {
  flushSave();
  process.exit(0);
});
process.on('SIGTERM', () => {
  flushSave();
  process.exit(0);
});

const normRoom = (v: unknown): string | null => {
  if (typeof v !== 'string') return null;
  const u = v.trim().toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(u) ? u : null;
};

const validateCreate = (data: unknown): { name: string; totalPieces: number } | null => {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name.trim() : '';
  const totalPieces = typeof o.totalPieces === 'number' ? o.totalPieces : NaN;
  if (name.length < 1 || name.length > 200) return null;
  if (!Number.isFinite(totalPieces) || totalPieces < 1 || totalPieces > 25_000_000) return null;
  return { name, totalPieces };
};

const MAX_PHOTO_PAYLOAD = 2_000_000;

io.on('connection', (socket) => {
  console.log('a user connected', socket.id);

  socket.on('joinRoom', (roomCode: unknown) => {
    const code = normRoom(roomCode);
    if (!code) {
      socket.emit('error', 'Invalid room code');
      return;
    }
    if (puzzles[code]) {
      socket.join(code);
      socket.emit('puzzleUpdate', puzzles[code]);
      console.log(`User ${socket.id} joined room ${code}`);
    } else {
      socket.emit('error', 'Puzzle not found');
    }
  });

  socket.on('createPuzzle', (data: unknown) => {
    const v = validateCreate(data);
    if (!v) {
      socket.emit('error', 'Invalid puzzle data');
      return;
    }
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    puzzles[roomCode] = {
      id: roomCode,
      name: v.name,
      totalPieces: v.totalPieces,
      placedPieces: 0,
      checkpoints: [
        { id: '1', name: 'Contour fini', completed: false },
        { id: '2', name: '50% terminé', completed: false },
        { id: '3', name: '75% terminé', completed: false },
      ],
      photos: [],
      history: [{ timestamp: Date.now(), placedPieces: 0 }],
    };
    savePuzzlesDebounced();
    socket.join(roomCode);
    socket.emit('puzzleCreated', roomCode);
    socket.emit('puzzleUpdate', puzzles[roomCode]);
    console.log(`Puzzle created: ${roomCode}`);
  });

  socket.on('updatePieces', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const o = payload as Record<string, unknown>;
    const roomCode = normRoom(o.roomCode);
    const placedPieces = typeof o.placedPieces === 'number' ? o.placedPieces : NaN;
    if (!roomCode || !Number.isFinite(placedPieces)) return;
    if (puzzles[roomCode]) {
      const max = puzzles[roomCode].totalPieces;
      const clamped = Math.max(0, Math.min(max, Math.floor(placedPieces)));
      puzzles[roomCode].placedPieces = clamped;
      puzzles[roomCode].history.push({ timestamp: Date.now(), placedPieces: clamped });
      savePuzzlesDebounced();
      io.to(roomCode).emit('puzzleUpdate', puzzles[roomCode]);
    }
  });

  socket.on('toggleCheckpoint', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const o = payload as Record<string, unknown>;
    const roomCode = normRoom(o.roomCode);
    const checkpointId = typeof o.checkpointId === 'string' ? o.checkpointId : '';
    if (!roomCode || !checkpointId) return;
    if (puzzles[roomCode]) {
      const checkpoint = puzzles[roomCode].checkpoints.find((c) => c.id === checkpointId);
      if (checkpoint) {
        checkpoint.completed = !checkpoint.completed;
        savePuzzlesDebounced();
        io.to(roomCode).emit('puzzleUpdate', puzzles[roomCode]);
      }
    }
  });

  socket.on('addPhoto', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const o = payload as Record<string, unknown>;
    const roomCode = normRoom(o.roomCode);
    const photo = typeof o.photo === 'string' ? o.photo : '';
    if (!roomCode || photo.length === 0 || photo.length > MAX_PHOTO_PAYLOAD) {
      socket.emit('error', 'Invalid photo');
      return;
    }
    if (puzzles[roomCode]) {
      puzzles[roomCode].photos.push(photo);
      savePuzzlesDebounced();
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
  if (allowedOrigins) {
    console.log(`CORS restricted to: ${allowedOrigins.join(', ')}`);
  } else {
    console.log('CORS: all origins (set CORS_ORIGINS=comma,separated,urls for production)');
  }
});
