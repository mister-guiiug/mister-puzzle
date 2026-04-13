import React, { useState, useEffect } from 'react';
import { Clock, Grid, Hash, ArrowRight, X, Lock, Unlock, Globe, Eye, EyeOff, Search, Users } from 'lucide-react';
import { createPuzzle, joinPuzzle, getPublicPuzzles, hashPassword, type PuzzleState } from '../hooks/useSocket';
import ErrorModal from './ErrorModal';
import { getHistory, saveToHistory, removeFromHistory, type HistoryPuzzle } from '../utils/history';
import { getPseudo, setPseudo, isPseudoLocked, setPseudoLocked } from '../utils/pseudo';

interface HomeProps {
  onJoin: (roomCode: string) => void;
}

const Home: React.FC<HomeProps> = ({ onJoin }) => {
  const [pseudo, setPseudoState] = useState(getPseudo);
  const [pseudoLocked, setPseudoLockedState] = useState(isPseudoLocked);
  const [name, setName] = useState('');
  const [rows, setRows] = useState(20);
  const [cols, setCols] = useState(50);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryPuzzle[]>([]);

  // Private puzzle password verification
  const [pendingPuzzle, setPendingPuzzle] = useState<PuzzleState | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);

  // Prompt to remove a deleted puzzle from history
  const [deletedCode, setDeletedCode] = useState<string | null>(null);

  // Public puzzles browser
  const [showPublicPuzzles, setShowPublicPuzzles] = useState(false);
  const [publicPuzzles, setPublicPuzzles] = useState<PuzzleState[]>([]);
  const [publicSearch, setPublicSearch] = useState('');
  const [loadingPublic, setLoadingPublic] = useState(false);

  const totalPieces = rows * cols;

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handlePseudoBlur = () => {
    setPseudo(pseudo.trim());
  };

  const handleTogglePseudoLock = () => {
    if (!pseudoLocked) {
      // Saving before locking
      setPseudo(pseudo.trim());
    }
    const next = !pseudoLocked;
    setPseudoLocked(next);
    setPseudoLockedState(next);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Veuillez donner un nom à votre puzzle.');
      return;
    }
    if (rows <= 0 || cols <= 0) {
      setError('Le nombre de lignes et colonnes doit être supérieur à 0.');
      return;
    }
    if (!isPublic && password && password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      const pwHash = (!isPublic && password) ? await hashPassword(password) : null;
      const code = await createPuzzle(name.trim(), rows, cols, isPublic, pwHash, pseudo.trim());
      saveToHistory(code, name.trim());
      onJoin(code);
    } catch (err) {
      setError('Impossible de créer le puzzle. Vérifiez votre connexion.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (manualCode?: string) => {
    const codeToJoin = (manualCode || roomCode).trim().toUpperCase();
    if (!codeToJoin) {
      setError('Veuillez entrer un code de puzzle.');
      return;
    }
    setLoading(true);
    try {
      const puzzle = await joinPuzzle(codeToJoin);
      if (!puzzle) {
        setDeletedCode(codeToJoin);
        return;
      }
      if (puzzle.passwordHash) {
        setPendingPuzzle(puzzle);
      } else {
        saveToHistory(puzzle.id, puzzle.name);
        onJoin(puzzle.id);
      }
    } catch (err) {
      setError('Une erreur est survenue lors de la recherche du puzzle.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!pendingPuzzle || !joinPassword) return;
    setLoading(true);
    try {
      const hash = await hashPassword(joinPassword);
      if (hash === pendingPuzzle.passwordHash) {
        saveToHistory(pendingPuzzle.id, pendingPuzzle.name);
        onJoin(pendingPuzzle.id);
      } else {
        setError('Mot de passe incorrect.');
      }
    } catch (err) {
      setError('Une erreur est survenue.');
      console.error(err);
    } finally {
      setLoading(false);
      setJoinPassword('');
    }
  };

  const handleLoadPublicPuzzles = async () => {
    if (showPublicPuzzles) {
      setShowPublicPuzzles(false);
      return;
    }
    setShowPublicPuzzles(true);
    setLoadingPublic(true);
    try {
      const puzzles = await getPublicPuzzles();
      setPublicPuzzles(puzzles);
    } catch (err) {
      setError('Impossible de charger les puzzles publics.');
      console.error(err);
    } finally {
      setLoadingPublic(false);
    }
  };

  const filteredPublicPuzzles = publicPuzzles.filter(p =>
    p.name.toLowerCase().includes(publicSearch.toLowerCase()) ||
    p.id.toLowerCase().includes(publicSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <ErrorModal message={error} onClose={() => setError(null)} />

      {/* Deleted puzzle popup */}
      {deletedCode && (() => {
        const inHistory = history.some((h) => h.code === deletedCode);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-2">Puzzle introuvable</h3>
              <p className="text-sm text-gray-500 mb-4">
                Le puzzle <span className="font-mono font-bold text-gray-700">{deletedCode}</span> n&apos;existe pas ou a été supprimé.
                {inHistory && <><br /><br />Il est présent dans vos puzzles récents. Voulez-vous le retirer ?</>}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletedCode(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
                >
                  Fermer
                </button>
                {inHistory && (
                  <button
                    onClick={() => {
                      removeFromHistory(deletedCode);
                      setHistory(getHistory());
                      setDeletedCode(null);
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition"
                  >
                    Retirer de l&apos;historique
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Logo + title */}
      <img
        src="/mister-puzzle/logo.png"
        alt="Mister Puzzle"
        className="w-40 h-40 mb-4 drop-shadow-lg hover:scale-105 transition-transform duration-300"
      />
      <h1 className="text-4xl font-bold mb-2 text-indigo-600">Mister Puzzle</h1>
      <p className="text-gray-400 text-sm mb-8">Suivez votre progression en équipe</p>

      {/* Pseudo */}
      <div className="bg-white p-4 rounded-xl shadow-md w-full max-w-md mb-6">
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
          <Users size={12} /> Votre pseudo
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Anonyme"
            className={`flex-1 p-2 border rounded-lg outline-none transition ${pseudoLocked ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-200 focus:ring-2 focus:ring-indigo-400'}`}
            value={pseudo}
            onChange={(e) => !pseudoLocked && setPseudoState(e.target.value)}
            onBlur={!pseudoLocked ? handlePseudoBlur : undefined}
            readOnly={pseudoLocked}
            maxLength={30}
          />
          <button
            onClick={handleTogglePseudoLock}
            title={pseudoLocked ? 'Déverrouiller le pseudo' : 'Verrouiller le pseudo'}
            className={`p-2 rounded-lg border transition ${pseudoLocked ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-indigo-500 hover:border-indigo-300'}`}
          >
            {pseudoLocked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {pseudoLocked
            ? '🔒 Pseudo verrouillé — cliquez sur le cadenas pour modifier.'
            : 'Affiché sur vos checkpoints et dans les sessions collaboratives.'}
        </p>
      </div>

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
              <div className="w-full p-2 bg-indigo-600 text-white rounded-lg text-center text-lg font-bold">
                {totalPieces.toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
          <p className="text-xs text-indigo-400 mt-2 text-center">
            Ajustable plus tard depuis le tableau de bord
          </p>
        </div>

        {/* Visibility */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Visibilité
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setIsPublic(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition ${isPublic ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <Globe size={14} /> Public
            </button>
            <button
              onClick={() => setIsPublic(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition ${!isPublic ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <Lock size={14} /> Privé
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {isPublic
              ? 'Votre puzzle sera visible dans la liste des puzzles publics.'
              : 'Votre puzzle ne sera pas visible dans la recherche.'}
          </p>
        </div>

        {/* Password (if private) */}
        {!isPublic && (
          <div className="mb-4 space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              Mot de passe (optionnel)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Mot de passe"
                className="w-full p-2 pr-10 border rounded"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirmer le mot de passe"
                className="w-full p-2 border rounded"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}
          </div>
        )}

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
              onKeyDown={(e) => e.key === 'Enter' && !pendingPuzzle && handleJoin()}
            />
          </div>
          <button
            onClick={() => handleJoin()}
            disabled={loading || !!pendingPuzzle}
            className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {loading ? '...' : <><span>Rejoindre</span><ArrowRight size={16} /></>}
          </button>
        </div>

        {/* Password prompt for private puzzle */}
        {pendingPuzzle && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <p className="text-sm font-semibold text-indigo-700 mb-3 flex items-center gap-2">
              <Lock size={14} /> &quot;{pendingPuzzle.name}&quot; est protégé par un mot de passe.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showJoinPassword ? 'text' : 'password'}
                  placeholder="Mot de passe"
                  className="w-full p-2 pr-8 border rounded"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowJoinPassword(!showJoinPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showJoinPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={handleVerifyPassword}
                disabled={loading || !joinPassword}
                className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 transition disabled:opacity-50"
              >
                OK
              </button>
              <button
                onClick={() => { setPendingPuzzle(null); setJoinPassword(''); }}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Annuler"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Public puzzles browser */}
      <div className="w-full max-w-md mb-6">
        <button
          onClick={handleLoadPublicPuzzles}
          className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-md border border-gray-100 hover:border-green-300 transition text-left"
        >
          <span className="font-semibold text-gray-700 flex items-center gap-2">
            <Globe size={18} className="text-green-600" /> Puzzles publics
          </span>
          <ArrowRight
            size={18}
            className={`text-gray-400 transition-transform duration-200 ${showPublicPuzzles ? 'rotate-90' : ''}`}
          />
        </button>
        {showPublicPuzzles && (
          <div className="mt-2 bg-white rounded-xl shadow-md p-4 border border-gray-100">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un puzzle..."
                className="w-full pl-8 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-400"
                value={publicSearch}
                onChange={(e) => setPublicSearch(e.target.value)}
              />
            </div>
            {loadingPublic ? (
              <p className="text-center text-gray-400 text-sm py-4 animate-pulse">Chargement...</p>
            ) : filteredPublicPuzzles.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-4">
                {publicSearch ? 'Aucun résultat.' : 'Aucun puzzle public pour le moment.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredPublicPuzzles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleJoin(p.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-green-50 border border-transparent hover:border-green-200 transition text-left"
                  >
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {p.id}
                        {p.createdBy && <span className="ml-2 not-font-mono">· {p.createdBy}</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.placedPieces.toLocaleString('fr-FR')} / {p.totalPieces.toLocaleString('fr-FR')} pièces
                        {' · '}
                        {Math.round((p.placedPieces / p.totalPieces) * 100)}%
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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

      {/* Footer */}
      <footer className="mt-12 flex flex-col items-center gap-3 text-gray-400 text-xs">
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/MisterGuiiuG/mister-puzzle"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-gray-600 transition"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Code source
          </a>
          <a
            href={__BMAC_URL__}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full hover:bg-yellow-300 transition text-xs"
          >
            ☕ Buy me a coffee
          </a>
        </div>
        <p>Mister Puzzle © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Home;
