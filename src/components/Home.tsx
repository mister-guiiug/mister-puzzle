import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Grid, Hash, ArrowRight, ArrowDown, X, Lock, Unlock, Globe, Eye, EyeOff, Menu, User, LayoutTemplate } from 'lucide-react';
import { createPuzzle, joinPuzzle, hashPassword, type PuzzleState } from '../hooks/useSocket';
import ErrorModal from './ErrorModal';
import { getHistory, saveToHistory, removeFromHistory, type HistoryPuzzle } from '../utils/history';
import { isGridLocked, setGridLocked, getSavedGrid, saveGrid } from '../utils/pseudo';
import { useI18n } from '../i18n/I18nContext';

interface HomeProps {
  onJoin: (roomCode: string) => void;
  pseudo: string;
}

const HOME_TOUR_DISMISSED_KEY = 'mister_puzzle_home_tour_dismissed';

const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;

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

  const formsAnchorRef = useRef<HTMLDivElement>(null);
  const [showTour, setShowTour] = useState(() => {
    try {
      return localStorage.getItem(HOME_TOUR_DISMISSED_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const dismissTour = useCallback(() => {
    try {
      localStorage.setItem(HOME_TOUR_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowTour(false);
  }, []);

  const restoreTour = useCallback(() => {
    try {
      localStorage.removeItem(HOME_TOUR_DISMISSED_KEY);
    } catch {
      /* ignore */
    }
    setShowTour(true);
  }, []);

  const scrollToForms = useCallback(() => {
    formsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const totalPieces = rows * cols;

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  /** Lien d'invitation ?join=CODE (ou room / code) : pré-remplit le champ rejoindre. */
  useEffect(() => {
    let params: URLSearchParams;
    try {
      params = new URLSearchParams(window.location.search);
    } catch {
      return;
    }
    const raw = (params.get('join') ?? params.get('room') ?? params.get('code'))?.trim();
    if (!raw) return;
    const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 3 || code.length > 20) return;
    setRoomCode(code);
    requestAnimationFrame(() => {
      document.getElementById('home-join')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    try {
      const path = window.location.pathname;
      window.history.replaceState({}, '', path + (window.location.hash || ''));
    } catch {
      /* ignore */
    }
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
    <div className="min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col items-center py-6 sm:py-8 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
      <ErrorModal message={error} onClose={() => setError(null)} />

      {/* Deleted puzzle popup */}
      {deletedCode && (() => {
        const inHistory = history.some((h) => h.code === deletedCode);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm border border-gray-100 dark:border-gray-800">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">{t('home.deletedTitle')}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{deletedCode}</span> {t('home.deletedBody')}
                {inHistory && <><br /><br />{t('home.deletedHistory')}</>}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeletedCode(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition"
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

      {/* Marque : icône + titre */}
      <header className="mb-8 flex w-full max-w-lg flex-col items-center sm:items-stretch">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
          <img
            src={logoSrc}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 drop-shadow-lg transition-transform duration-300 hover:scale-[1.03] sm:h-28 sm:w-28"
          />
          <div className="flex max-w-md flex-col items-center text-center sm:items-start sm:text-left">
            <h1 className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400 sm:text-4xl">
              {t('common.appName')}
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400 sm:text-base">
              {t('home.tagline')}
            </p>
          </div>
        </div>
      </header>

      <section
        className="w-full max-w-3xl mb-8"
        aria-label={t('home.tourTitle')}
      >
        {!showTour ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/90 px-4 py-3 text-center shadow-sm">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{t('home.tourDismissedHint')}</p>
            <button
              type="button"
              onClick={restoreTour}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
            >
              {t('home.tourShowAgain')}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/60 bg-gradient-to-b from-white to-indigo-50/40 dark:from-gray-900 dark:to-indigo-950/30 shadow-md overflow-hidden">
            <div className="px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">{t('home.tourIntro')}</p>
              <h2 className="text-center text-lg font-bold text-gray-900 dark:text-gray-100 mt-2 mb-4">{t('home.tourTitle')}</h2>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-indigo-100 dark:divide-gray-700 list-none m-0 p-0">
              <li className="flex gap-3 p-4 sm:p-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-black"
                  aria-hidden
                >
                  1
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Menu size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden />
                    {t('home.tourStep1Title')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-snug">{t('home.tourStep1Body')}</p>
                </div>
              </li>
              <li className="flex gap-3 p-4 sm:p-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-black"
                  aria-hidden
                >
                  2
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <User size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden />
                    {t('home.tourStep2Title')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-snug">{t('home.tourStep2Body')}</p>
                </div>
              </li>
              <li className="flex gap-3 p-4 sm:p-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-black"
                  aria-hidden
                >
                  3
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <LayoutTemplate size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden />
                    {t('home.tourStep3Title')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-snug">{t('home.tourStep3Body')}</p>
                </div>
              </li>
            </ol>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2 px-4 pb-4 sm:px-6 sm:pb-5 pt-1 border-t border-indigo-100 dark:border-gray-700 bg-white/60 dark:bg-gray-900/50">
              <button
                type="button"
                onClick={scrollToForms}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 active:bg-indigo-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              >
                <ArrowDown size={18} className="shrink-0" aria-hidden />
                {t('home.tourScrollToForms')}
              </button>
              <button
                type="button"
                onClick={dismissTour}
                className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                {t('home.tourDismiss')}
              </button>
            </div>
          </div>
        )}
      </section>

      <div ref={formsAnchorRef} id="home-forms" className="w-full max-w-md flex flex-col gap-6 mb-6 scroll-mt-24">
      {/* Create */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md w-full border border-gray-100 dark:border-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('home.createTitle')}</h2>

        <input
          type="text"
          placeholder={t('home.puzzleNamePh')}
          aria-label={t('home.puzzleNamePh')}
          className="w-full p-2 border border-gray-200 dark:border-gray-600 rounded mb-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Grid calculator */}
        <div
          className={`rounded-xl p-4 mb-4 border transition ${
            gridLocked
              ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/70 dark:border-gray-600'
              : 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/45 dark:border-indigo-800/50'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <p
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                gridLocked ? 'text-gray-400 dark:text-gray-500' : 'text-indigo-600 dark:text-indigo-300'
              }`}
            >
              <Grid size={12} aria-hidden /> {t('home.gridTitle')}
            </p>
            <button
              type="button"
              onClick={handleToggleGridLock}
              title={gridLocked ? t('home.gridUnlockBtn') : t('home.gridLockBtn')}
              aria-label={gridLocked ? t('home.gridUnlockBtn') : t('home.gridLockBtn')}
              className={`p-1.5 rounded-lg border transition ${
                gridLocked
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/50'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-300 dark:bg-gray-900/80 dark:border-gray-600 dark:text-gray-400 dark:hover:text-indigo-300 dark:hover:border-indigo-500'
              }`}
            >
              {gridLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{t('home.rows')}</label>
              <input
                type="number"
                min={1}
                value={rows}
                readOnly={gridLocked}
                onChange={(e) => handleRowsChange(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full rounded-lg border p-2 text-center text-lg font-bold outline-none transition [color-scheme:light] dark:[color-scheme:dark] ${
                  gridLocked
                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-900/80 dark:text-gray-500'
                    : 'border-indigo-200 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-400 dark:border-indigo-600/70 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500'
                }`}
              />
            </div>
            <span className="mt-4 text-2xl font-light text-indigo-400 dark:text-indigo-400/90">×</span>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{t('home.cols')}</label>
              <input
                type="number"
                min={1}
                value={cols}
                readOnly={gridLocked}
                onChange={(e) => handleColsChange(Math.max(1, parseInt(e.target.value) || 1))}
                className={`w-full rounded-lg border p-2 text-center text-lg font-bold outline-none transition [color-scheme:light] dark:[color-scheme:dark] ${
                  gridLocked
                    ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-900/80 dark:text-gray-500'
                    : 'border-indigo-200 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-400 dark:border-indigo-600/70 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-indigo-500'
                }`}
              />
            </div>
            <span className="mt-4 text-2xl font-light text-indigo-400 dark:text-indigo-400/90">=</span>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">{t('home.total')}</label>
              <div
                className={`w-full rounded-lg p-2 text-center text-lg font-bold ${
                  gridLocked
                    ? 'bg-gray-200 text-gray-600 dark:bg-gray-900 dark:text-gray-300'
                    : 'bg-indigo-600 text-white dark:bg-indigo-500'
                }`}
              >
                {totalPieces.toLocaleString(numberLocale)}
              </div>
            </div>
          </div>
          <p
            className={`mt-2 text-center text-xs ${gridLocked ? 'text-gray-400 dark:text-gray-500' : 'text-indigo-600 dark:text-indigo-300/95'}`}
          >
            {gridLocked ? t('home.gridLockedHint') : t('home.gridUnlockedHint')}
          </p>
        </div>

        {/* Visibility */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {t('home.visibility')}
          </label>
          <div className="flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition ${
                isPublic
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:bg-gray-700/80'
              }`}
            >
              <Globe size={14} aria-hidden /> {t('common.public')}
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition ${
                !isPublic
                  ? 'bg-indigo-600 text-white dark:bg-indigo-500'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800/90 dark:text-gray-400 dark:hover:bg-gray-700/80'
              }`}
            >
              <Lock size={14} aria-hidden /> {t('common.private')}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            {isPublic ? t('home.visibilityPublicHint') : t('home.visibilityPrivateHint')}
          </p>
        </div>

        {/* Password (if private) */}
        {!isPublic && (
          <div className="mb-4 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t('home.passwordOptional')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('home.passwordPh')}
                className="w-full rounded-lg border border-gray-200 bg-white p-2 pr-10 text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('home.confirmPasswordPh')}
                className="w-full rounded-lg border border-gray-200 bg-white p-2 text-gray-900 placeholder:text-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
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
      <div
        id="home-join"
        className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-md w-full border border-gray-100 dark:border-gray-800 scroll-mt-24"
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">{t('home.joinTitle')}</h2>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              type="text"
              placeholder={t('home.codePh')}
              aria-label={t('home.codePh')}
              className="w-full pl-8 p-2 border border-gray-200 dark:border-gray-600 rounded uppercase tracking-widest font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800/70 dark:bg-indigo-950/40">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-800 dark:text-indigo-200">
              <Lock size={14} aria-hidden /> &quot;{pendingPuzzle.name}&quot; {t('home.protectedPw')}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showJoinPassword ? 'text' : 'password'}
                  placeholder={t('home.passwordPh')}
                  className="w-full rounded-lg border border-indigo-200/80 bg-white p-2 pr-8 text-gray-900 placeholder:text-gray-400 dark:border-indigo-800/60 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowJoinPassword(!showJoinPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showJoinPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleVerifyPassword}
                disabled={loading || !joinPassword}
                className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => { setPendingPuzzle(null); setJoinPassword(''); }}
                className="rounded-lg p-2 text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 dark:text-gray-400 dark:hover:text-gray-200"
                title={t('common.cancel')}
                aria-label={t('common.cancel')}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 flex flex-col items-center gap-3 text-gray-400 dark:text-gray-500 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">{t('home.langLabel')}</span>
          <button
            type="button"
            onClick={() => setLocale('fr')}
            className={`px-2 py-1 rounded text-xs font-semibold border ${locale === 'fr' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
          >
            {t('home.langFr')}
          </button>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`px-2 py-1 rounded text-xs font-semibold border ${locale === 'en' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}
          >
            {t('home.langEn')}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/mister-guiiug/mister-puzzle"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
