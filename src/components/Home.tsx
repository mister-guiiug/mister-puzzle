import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Grid,
  Hash,
  ArrowRight,
  ArrowDown,
  X,
  Lock,
  Unlock,
  Globe,
  Eye,
  EyeOff,
  Menu,
  User,
  LayoutTemplate,
} from 'lucide-react';
import { createPuzzle, joinPuzzle, hashPassword, type PuzzleState } from '../hooks/useSocket';
import ErrorModal from './ErrorModal';
import { getHistory, saveToHistory, removeFromHistory, type HistoryPuzzle } from '../utils/history';
import { isGridLocked, setGridLocked, getSavedGrid, saveGrid } from '../utils/pseudo';
import { useI18n } from '../i18n/I18nContext';
import { prefetchDashboardChunk } from '../utils/prefetchDashboard';
import { reportError } from '../utils/reportError';

interface HomeProps {
  onJoin: (roomCode: string) => void;
  pseudo: string;
}

const HOME_TOUR_DISMISSED_KEY = 'mister_puzzle_home_tour_dismissed';

const logoSrc = `${import.meta.env.BASE_URL}logo.svg${import.meta.env.VITE_PWA_ICON_QS}`;

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
      const pwHash = !isPublic && password ? await hashPassword(password) : null;
      const code = await createPuzzle(name.trim(), rows, cols, isPublic, pwHash, pseudo.trim());
      saveToHistory(code, name.trim());
      onJoin(code);
    } catch (err) {
      setError(t('home.errorCreate'));
      reportError('home_createPuzzle', err);
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
      reportError('home_joinPuzzle', err, { code: codeToJoin });
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
      reportError('home_verifyPassword', err, { puzzleId: pendingPuzzle?.id });
    } finally {
      setLoading(false);
      setJoinPassword('');
    }
  };

  return (
    <div className="min-h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] bg-canvas text-fg flex flex-col items-center py-6 sm:py-8 px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
      <ErrorModal message={error} onClose={() => setError(null)} />

      {/* Deleted puzzle popup */}
      {deletedCode &&
        (() => {
          const inHistory = history.some((h) => h.code === deletedCode);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-surface rounded-2xl shadow-xl p-6 w-full max-w-sm border border-divide">
                <h3 className="text-lg font-bold text-fg-heading mb-2">{t('home.deletedTitle')}</h3>
                <p className="text-sm text-fg-muted mb-4">
                  <span className="font-mono font-bold text-fg">{deletedCode}</span>{' '}
                  {t('home.deletedBody')}
                  {inHistory && (
                    <>
                      <br />
                      <br />
                      {t('home.deletedHistory')}
                    </>
                  )}
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeletedCode(null)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-fg-muted hover:bg-surface-muted dark:text-fg-muted dark:hover:bg-surface-muted transition"
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
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-danger-fill text-white hover:bg-danger-fill-hover transition"
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
            <h1 className="bg-gradient-to-r from-brand-from via-brand-via to-brand-to bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              {t('common.appName')}
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-fg-muted sm:text-base">
              {t('home.tagline')}
            </p>
          </div>
        </div>
      </header>

      <section className="w-full max-w-3xl mb-8" aria-label={t('home.tourTitle')}>
        {!showTour ? (
          <div className="rounded-2xl border border-border-ui-strong bg-surface/80 px-4 py-3 text-center shadow-sm">
            <p className="text-sm text-fg-muted mb-2">{t('home.tourDismissedHint')}</p>
            <button
              type="button"
              onClick={restoreTour}
              className="text-sm font-semibold text-primary hover:text-primary-strong underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring rounded"
            >
              {t('home.tourShowAgain')}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-primary-border-muted bg-gradient-to-b from-surface to-primary-soft/50 dark:from-surface dark:to-primary-soft/35 shadow-md overflow-hidden">
            <div className="px-4 pt-4 pb-2 sm:px-6 sm:pt-5">
              <p className="text-sm text-fg-muted text-center">{t('home.tourIntro')}</p>
              <h2 className="text-center text-lg font-bold text-fg mt-2 mb-4">
                {t('home.tourTitle')}
              </h2>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-3 gap-0 sm:gap-0 divide-y sm:divide-y-0 sm:divide-x divide-primary-border-muted dark:divide-border-ui-strong list-none m-0 p-0">
              <li className="flex gap-3 p-4 sm:p-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fill text-white text-sm font-black"
                  aria-hidden
                >
                  1
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-fg flex items-center gap-2">
                    <Menu size={18} className="text-primary shrink-0" aria-hidden />
                    {t('home.tourStep1Title')}
                  </p>
                  <p className="text-sm text-fg-muted mt-1 leading-snug">
                    {t('home.tourStep1Body')}
                  </p>
                </div>
              </li>
              <li className="flex gap-3 p-4 sm:p-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fill text-white text-sm font-black"
                  aria-hidden
                >
                  2
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-fg flex items-center gap-2">
                    <User size={18} className="text-primary shrink-0" aria-hidden />
                    {t('home.tourStep2Title')}
                  </p>
                  <p className="text-sm text-fg-muted mt-1 leading-snug">
                    {t('home.tourStep2Body')}
                  </p>
                </div>
              </li>
              <li className="flex gap-3 p-4 sm:p-5">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-fill text-white text-sm font-black"
                  aria-hidden
                >
                  3
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-fg flex items-center gap-2">
                    <LayoutTemplate size={18} className="text-primary shrink-0" aria-hidden />
                    {t('home.tourStep3Title')}
                  </p>
                  <p className="text-sm text-fg-muted mt-1 leading-snug">
                    {t('home.tourStep3Body')}
                  </p>
                </div>
              </li>
            </ol>
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-center gap-2 px-4 pb-4 sm:px-6 sm:pb-5 pt-1 border-t border-primary-border-muted dark:border-border-ui-strong bg-surface/60">
              <button
                type="button"
                onClick={scrollToForms}
                className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-primary-fill text-white text-sm font-bold hover:bg-primary-fill-hover active:bg-primary-fill-active transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:ring-offset-2"
              >
                <ArrowDown size={18} className="shrink-0" aria-hidden />
                {t('home.tourScrollToForms')}
              </button>
              <button
                type="button"
                onClick={dismissTour}
                className="inline-flex items-center justify-center min-h-11 px-4 rounded-xl border border-border-ui bg-surface-muted text-sm font-semibold text-fg-muted hover:bg-surface-muted dark:hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-border-ui-strong"
              >
                {t('home.tourDismiss')}
              </button>
            </div>
          </div>
        )}
      </section>

      <div
        ref={formsAnchorRef}
        id="home-forms"
        className="w-full max-w-md flex flex-col gap-6 mb-6 scroll-mt-24"
      >
        {/* Create */}
        <div className="bg-surface p-6 rounded-xl shadow-md w-full border border-divide">
          <h2 className="text-xl font-semibold mb-4 text-fg">{t('home.createTitle')}</h2>

          <input
            type="text"
            placeholder={t('home.puzzleNamePh')}
            aria-label={t('home.puzzleNamePh')}
            className="w-full p-2 border border-border-ui rounded mb-4 bg-surface-muted text-fg placeholder:text-fg-faint"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Grid calculator */}
          <div
            className={`rounded-xl p-4 mb-4 border transition ${
              gridLocked
                ? 'bg-surface-muted border-border-ui dark:bg-surface-muted/70 dark:border-border-ui'
                : 'bg-primary-soft border-primary-border-muted dark:bg-primary-soft dark:border-primary-border/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <p
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                  gridLocked ? 'text-fg-faint' : 'text-primary-hover'
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
                    ? 'bg-primary-soft border-primary-border text-primary hover:bg-primary-soft-hover dark:bg-primary-soft dark:border-primary-border dark:text-primary-hover dark:hover:bg-primary-soft-hover'
                    : 'bg-surface border-border-ui text-fg-muted hover:text-primary hover:border-primary-border-strong dark:bg-surface/80 dark:border-border-ui dark:text-fg-muted dark:hover:text-primary-hover dark:hover:border-primary-muted'
                }`}
              >
                {gridLocked ? <Lock size={14} /> : <Unlock size={14} />}
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-fg-muted">{t('home.rows')}</label>
                <input
                  type="number"
                  min={1}
                  value={rows}
                  readOnly={gridLocked}
                  onChange={(e) => handleRowsChange(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`w-full rounded-lg border p-2 text-center text-lg font-bold outline-none transition [color-scheme:light] dark:[color-scheme:dark] ${
                    gridLocked
                      ? 'cursor-not-allowed border-border-ui bg-surface-muted text-fg-muted dark:border-border-ui dark:bg-surface-muted/80 dark:text-fg-faint'
                      : 'border-primary-border bg-surface text-fg focus:ring-2 focus:ring-primary-ring dark:border-primary-border-strong dark:bg-surface-input dark:text-fg dark:focus:ring-primary-ring'
                  }`}
                />
              </div>
              <span className="mt-4 text-2xl font-light text-primary-muted">×</span>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-fg-muted">{t('home.cols')}</label>
                <input
                  type="number"
                  min={1}
                  value={cols}
                  readOnly={gridLocked}
                  onChange={(e) => handleColsChange(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`w-full rounded-lg border p-2 text-center text-lg font-bold outline-none transition [color-scheme:light] dark:[color-scheme:dark] ${
                    gridLocked
                      ? 'cursor-not-allowed border-border-ui bg-surface-muted text-fg-muted dark:border-border-ui dark:bg-surface-muted/80 dark:text-fg-faint'
                      : 'border-primary-border bg-surface text-fg focus:ring-2 focus:ring-primary-ring dark:border-primary-border-strong dark:bg-surface-input dark:text-fg dark:focus:ring-primary-ring'
                  }`}
                />
              </div>
              <span className="mt-4 text-2xl font-light text-primary-muted">=</span>
              <div className="flex-1">
                <label className="mb-1 block text-xs text-fg-muted">{t('home.total')}</label>
                <div
                  className={`w-full rounded-lg p-2 text-center text-lg font-bold ${
                    gridLocked
                      ? 'bg-surface-muted text-fg-muted dark:bg-surface-muted dark:text-fg'
                      : 'bg-primary-fill text-white'
                  }`}
                >
                  {totalPieces.toLocaleString(numberLocale)}
                </div>
              </div>
            </div>
            <p
              className={`mt-2 text-center text-xs ${gridLocked ? 'text-fg-faint' : 'text-primary-hover'}`}
            >
              {gridLocked ? t('home.gridLockedHint') : t('home.gridUnlockedHint')}
            </p>
          </div>

          {/* Visibility */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-fg-faint">
              {t('home.visibility')}
            </label>
            <div className="flex overflow-hidden rounded-lg border border-border-ui">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition ${
                  isPublic
                    ? 'bg-success-fill text-white'
                    : 'bg-surface text-fg-muted hover:bg-surface-muted/90 dark:text-fg-muted dark:hover:bg-surface-muted/80'
                }`}
              >
                <Globe size={14} aria-hidden /> {t('common.public')}
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex flex-1 items-center justify-center gap-2 py-2 text-sm font-medium transition ${
                  !isPublic
                    ? 'bg-primary-fill text-white'
                    : 'bg-surface text-fg-muted hover:bg-surface-muted/90 dark:text-fg-muted dark:hover:bg-surface-muted/80'
                }`}
              >
                <Lock size={14} aria-hidden /> {t('common.private')}
              </button>
            </div>
            <p className="mt-1 text-xs text-fg-faint">
              {isPublic ? t('home.visibilityPublicHint') : t('home.visibilityPrivateHint')}
            </p>
          </div>

          {/* Password (if private) */}
          {!isPublic && (
            <div className="mb-4 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-fg-faint">
                {t('home.passwordOptional')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('home.passwordPh')}
                  className="w-full rounded-lg border border-border-ui bg-surface p-2 pr-10 text-fg placeholder:text-fg-faint dark:border-border-ui dark:bg-surface-muted dark:text-fg dark:placeholder:text-fg-muted"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-faint hover:text-fg-muted dark:text-fg-faint dark:hover:text-fg-muted"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password && (
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('home.confirmPasswordPh')}
                  className="w-full rounded-lg border border-border-ui bg-surface p-2 text-fg placeholder:text-fg-faint dark:border-border-ui dark:bg-surface-muted dark:text-fg dark:placeholder:text-fg-muted"
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
            className="w-full bg-primary-fill text-white p-2 rounded font-bold hover:bg-primary-fill-hover transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
          >
            {loading ? t('home.creating') : t('home.createBtn')}
          </button>
        </div>

        {/* Join */}
        <div
          id="home-join"
          className="bg-surface p-6 rounded-xl shadow-md w-full border border-divide scroll-mt-24"
          onMouseEnter={prefetchDashboardChunk}
        >
          <h2 className="text-xl font-semibold mb-4 text-fg">{t('home.joinTitle')}</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint"
                aria-hidden
              />
              <input
                type="text"
                placeholder={t('home.codePh')}
                aria-label={t('home.codePh')}
                className="w-full pl-8 p-2 border border-border-ui rounded uppercase tracking-widest font-mono bg-surface-muted text-fg"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onFocus={prefetchDashboardChunk}
                onKeyDown={(e) => e.key === 'Enter' && !pendingPuzzle && handleJoin()}
              />
            </div>
            <button
              type="button"
              onClick={() => handleJoin()}
              onMouseEnter={prefetchDashboardChunk}
              disabled={loading || !!pendingPuzzle}
              className="bg-success-fill text-white px-4 py-2 rounded font-bold hover:bg-success-hover transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-success-ring"
              aria-label={t('home.joinBtn')}
            >
              {loading ? (
                '...'
              ) : (
                <>
                  <span>{t('home.joinBtn')}</span>
                  <ArrowRight size={16} aria-hidden />
                </>
              )}
            </button>
          </div>

          {/* Password prompt for private puzzle */}
          {pendingPuzzle && (
            <div className="mt-4 rounded-xl border border-primary-border bg-primary-soft p-4 dark:border-primary-border dark:bg-primary-soft">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary-strong dark:text-primary-hover">
                <Lock size={14} aria-hidden /> &quot;{pendingPuzzle.name}&quot;{' '}
                {t('home.protectedPw')}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showJoinPassword ? 'text' : 'password'}
                    placeholder={t('home.passwordPh')}
                    className="w-full rounded-lg border border-primary-border bg-surface p-2 pr-8 text-fg placeholder:text-fg-faint dark:border-primary-border dark:bg-surface dark:text-fg dark:placeholder:text-fg-muted"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowJoinPassword(!showJoinPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg-heading dark:text-fg-muted dark:hover:text-fg"
                  >
                    {showJoinPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyPassword}
                  disabled={loading || !joinPassword}
                  className="rounded-lg bg-primary-fill px-4 py-2 font-bold text-white transition hover:bg-primary-fill-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring disabled:opacity-50"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingPuzzle(null);
                    setJoinPassword('');
                  }}
                  className="rounded-lg p-2 text-fg-muted hover:text-fg-heading focus:outline-none focus-visible:ring-2 dark:text-fg-faint dark:hover:text-fg"
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
      <footer className="mt-12 flex flex-col items-center gap-3 text-fg-faint text-xs">
        <div className="flex items-center gap-2">
          <span className="text-fg-muted">{t('home.langLabel')}</span>
          <button
            type="button"
            onClick={() => setLocale('fr')}
            className={`px-2 py-1 rounded text-xs font-semibold border ${locale === 'fr' ? 'bg-primary-fill text-white border-primary-fill' : 'bg-surface-muted border-border-ui text-fg-muted'}`}
          >
            {t('home.langFr')}
          </button>
          <button
            type="button"
            onClick={() => setLocale('en')}
            className={`px-2 py-1 rounded text-xs font-semibold border ${locale === 'en' ? 'bg-primary-fill text-white border-primary-fill' : 'bg-surface-muted border-border-ui text-fg-muted'}`}
          >
            {t('home.langEn')}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/mister-guiiug/mister-puzzle"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-fg-muted transition hover:text-fg-muted dark:text-fg-faint dark:hover:text-fg"
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
        <p>
          {t('common.appName')} © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

export default Home;
