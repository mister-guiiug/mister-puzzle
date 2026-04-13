import React, { useState, useEffect } from 'react';
import { Grid, Hash, ArrowRight, X, Lock, Unlock, Globe, Eye, EyeOff } from 'lucide-react';
import { createPuzzle, joinPuzzle, hashPassword, type PuzzleState } from '../hooks/useSocket';
import ErrorModal from './ErrorModal';
import { getHistory, saveToHistory, removeFromHistory, type HistoryPuzzle } from '../utils/history';
import { isGridLocked, setGridLocked, getSavedGrid, saveGrid } from '../utils/pseudo';
import { useI18n } from '../i18n/I18nContext';

interface HomeProps {
  onJoin: (roomCode: string) => void;
  pseudo: string;
}

const Home: React.FC<HomeProps> = ({ onJoin, pseudo }) => {
  const { t, numberLocale, locale, setLocale } = useI18n();
  const [name, setName] = useState('');
  const [rows, setRows] = useState(() => getSavedGrid()?.rows ?? 20);
  const [cols, setCols] = useState(() => getSavedGrid()?.cols ?? 50);
  const [gridLocked, setGridLockedState] = useState(isGridLocked);

  const handleToggleGridLock = () => {
    if (!gridLocked) saveGrid(rows, cols);
    const next = !gridLocked;
    setGridLocked(next);
    setGridLockedState(next);
  };
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

  const totalPieces = rows * cols;

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleRowsChange = (val: number) => {
    if (gridLocked) return;
    setRows(val);
    saveGrid(val, cols);
  };

  const handleColsChange = (val: number) => {
    if (gridLocked) return;
    setCols(val);
    saveGrid(rows, val);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('home.errorName'));
      return;
    }
    if (rows <= 0 || cols <= 0) {
      setError(t('home.errorGrid'));
      return;
    }
    if (!isPublic && password && password !== confirmPassword) {
      setError(t('home.errorPwMatch'));
      return;
    }
    setLoading(true);
    try {
      const pwHash = (!isPublic && password) ? await hashPassword(password) : null;
      const code = await createPuzzle(name.trim(), rows, cols, isPublic, pwHash, pseudo.trim());
      saveToHistory(code, name.trim());
      onJoin(code);
    } catch (err) {
      setError(t('home.errorCreate'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (manualCode?: string) => {
    const codeToJoin = (manualCode || roomCode).trim().toUpperCase();
    if (!codeToJoin) {
      setError(t('home.errorCode'));
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
      setError(t('home.errorJoin'));
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
        setError(t('home.errorPwWrong'));
      }
    } catch (err) {
      setError(t('home.errorGeneric'));
      console.error(err);
    } finally {
      setLoading(false);
      setJoinPassword('');
    }
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] bg-gray-50 flex flex-col items-center justify-center p-4 pt-6 sm:pt-8 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
      <ErrorModal message={error} onClose={() => setError(null)} />

      {/* Deleted puzzle popup */}
      {deletedCode && (() => {
        const inHistory = history.some((h) => h.code === deletedCode);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-2">{t('home.deletedTitle')}</h3>
              <p className="text-sm text-gray-500 mb-4">
                <span className="font-mono font-bold text-gray-700">{deletedCode}</span> {t('home.deletedBody')}
                {inHistory && <><br /><br />{t('home.deletedHistory')}</>}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeletedCode(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
                >
                  {t('home.close')}
                </button>
                {inHistory && (
                  <button
                    type="button"
                    onClick={() => {
                      removeFromHistory(deletedCode);
                      setHistory(getHistory());
                      setDeletedCode(null);
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition"
                  >
                    {t('home.removeFromHistoryBtn')}
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
        alt=""
        className="w-40 h-40 mb-4 drop-shadow-lg hover:scale-105 transition-transform duration-300"
      />
      <h1 className="text-4xl font-bold mb-2 text-indigo-600">{t('common.appName')}</h1>
      <p className="text-gray-400 text-sm mb-1">{t('home.tagline')}</p>
      <p className="text-gray-400 text-xs mb-8 text-center max-w-md">{t('home.navHint')}</p>

      {/* Create */}
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('home.createTitle')}</h2>

        <input
          type="text"
          placeholder={t('home.puzzleNamePh')}
          aria-label={t('home.puzzleNamePh')}
          className="w-full p-2 border rounded mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Grid calculator */}
        <div className={`rounded-xl p-4 mb-4 border transition ${gridLocked ? 'bg-gray-50 border-gray-200' : 'bg-indigo-50 border-indigo-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${gridLocked ? 'text-gray-400' : 'text-indigo-500'}`}>
              <Grid size={12} aria-hidden /> {t('home.gridTitle')}
            </p>
            <button
              type="button"
              onClick={handleToggleGridLock}
              title={gridLocked ? t('home.gridUnlockBtn') : t('home.gridLockBtn')}
              aria-label={gridLocked ? t('home.gridUnlockBtn') : t('home.gridLockBtn')}
              className={`p-1.5 rounded-lg border transition ${gridLocked ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100' : 'bg-white border-gray-200 text-gray-400 hover:text-indigo-500 hover:border-indigo-300'}`}
            >
              {gridLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">{t('home.rows')}</label>
              <input
                type="number"
                min={1}
                value={rows}
                readOnly={gridLocked}
                onChange={(e) => handleRowsChange(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full p-2 border rounded-lg text-center text-lg font-bold outline-none transition ${gridLocked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-indigo-200 focus:ring-2 focus:ring-indigo-400 bg-white'}`}
              />
            </div>
            <span className="text-2xl text-indigo-300 font-light mt-4">×</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">{t('home.cols')}</label>
              <input
                type="number"
                min={1}
                value={cols}
                readOnly={gridLocked}
                onChange={(e) => handleColsChange(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full p-2 border rounded-lg text-center text-lg font-bold outline-none transition ${gridLocked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-indigo-200 focus:ring-2 focus:ring-indigo-400 bg-white'}`}
              />
            </div>
            <span className="text-2xl text-indigo-300 font-light mt-4">=</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">{t('home.total')}</label>
              <div className={`w-full p-2 rounded-lg text-center text-lg font-bold ${gridLocked ? 'bg-gray-200 text-gray-500' : 'bg-indigo-600 text-white'}`}>
                {totalPieces.toLocaleString(numberLocale)}
              </div>
            </div>
          </div>
          <p className={`text-xs mt-2 text-center ${gridLocked ? 'text-gray-400' : 'text-indigo-400'}`}>
            {gridLocked ? t('home.gridLockedHint') : t('home.gridUnlockedHint')}
          </p>
        </div>

        {/* Visibility */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {t('home.visibility')}
          </label>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition ${isPublic ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <Globe size={14} aria-hidden /> {t('common.public')}
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium transition ${!isPublic ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
            >
              <Lock size={14} aria-hidden /> {t('common.private')}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {isPublic ? t('home.visibilityPublicHint') : t('home.visibilityPrivateHint')}
          </p>
        </div>

        {/* Password (if private) */}
        {!isPublic && (
          <div className="mb-4 space-y-2">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              {t('home.passwordOptional')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('home.passwordPh')}
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
                placeholder={t('home.confirmPasswordPh')}
                className="w-full p-2 border rounded"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          className="w-full bg-indigo-600 text-white p-2 rounded font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          {loading ? t('home.creating') : t('home.createBtn')}
        </button>
      </div>

      {/* Join */}
      <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('home.joinTitle')}</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="text"
              placeholder={t('home.codePh')}
              aria-label={t('home.codePh')}
              className="w-full pl-8 p-2 border rounded uppercase tracking-widest font-mono"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && !pendingPuzzle && handleJoin()}
            />
          </div>
          <button
            type="button"
            onClick={() => handleJoin()}
            disabled={loading || !!pendingPuzzle}
            className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            aria-label={t('home.joinBtn')}
          >
            {loading ? '...' : <><span>{t('home.joinBtn')}</span><ArrowRight size={16} aria-hidden /></>}
          </button>
        </div>

        {/* Password prompt for private puzzle */}
        {pendingPuzzle && (
          <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
            <p className="text-sm font-semibold text-indigo-700 mb-3 flex items-center gap-2">
              <Lock size={14} aria-hidden /> &quot;{pendingPuzzle.name}&quot; {t('home.protectedPw')}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showJoinPassword ? 'text' : 'password'}
                  placeholder={t('home.passwordPh')}
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
                type="button"
                onClick={handleVerifyPassword}
                disabled={loading || !joinPassword}
                className="bg-indigo-600 text-white px-4 py-2 rounded font-bold hover:bg-indigo-700 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => { setPendingPuzzle(null); setJoinPassword(''); }}
                className="p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 rounded"
                title={t('common.cancel')}
                aria-label={t('common.cancel')}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 flex flex-col items-center gap-3 text-gray-400 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{t('home.langLabel')}</span>
          <button
            type="button"
            onClick={() => setLocale('fr')}
            className={`px-2 py-1 rounded text-xs font-semibold border ${locale === 'fr' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600'}`}
          >
            {t('home.langFr')}
          </button>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`px-2 py-1 rounded text-xs font-semibold border ${locale === 'en' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600'}`}
          >
            {t('home.langEn')}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/mister-guiiug/mister-puzzle"
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
        <p>{t('common.appName')} © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Home;
