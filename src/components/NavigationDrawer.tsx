import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  X,
  Home,
  Clock,
  Globe,
  Search,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { joinPuzzle, getPublicPuzzles, hashPassword, type PuzzleState } from '../hooks/useSocket';
import { getHistory, saveToHistory, removeFromHistory, type HistoryPuzzle } from '../utils/history';
import { useI18n } from '../i18n/I18nContext';
import { reportError } from '../utils/reportError';

export type NavigationDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** Clear hash and show home */
  onGoHome: () => void;
  /** Navigate to puzzle room (sets hash) */
  onNavigateToPuzzle: (roomCode: string) => void;
};

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
  onGoHome,
  onNavigateToPuzzle,
}) => {
  const { t, numberLocale } = useI18n();
  const [history, setHistory] = useState<HistoryPuzzle[]>([]);
  const [publicPuzzles, setPublicPuzzles] = useState<PuzzleState[]>([]);
  const [publicSearch, setPublicSearch] = useState('');
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publicLoaded, setPublicLoaded] = useState(false);
  const [joining, setJoining] = useState(false);
  const [pendingPrivate, setPendingPrivate] = useState<PuzzleState | null>(null);
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshHistory = useCallback(() => setHistory(getHistory()), []);

  useEffect(() => {
    if (open) {
      refreshHistory();
      setLocalError(null);
      setPendingPrivate(null);
      setJoinPassword('');
      setPublicLoaded(false);
    }
  }, [open, refreshHistory]);

  useEffect(() => {
    if (!open || publicLoaded) return;
    let cancelled = false;
    setLoadingPublic(true);
    setLocalError(null);
    void (async () => {
      try {
        const list = await getPublicPuzzles();
        if (!cancelled) {
          setPublicPuzzles(list);
          setPublicLoaded(true);
        }
      } catch (err) {
        if (!cancelled) setLocalError(t('home.errorPublic'));
        reportError('navigationDrawer_loadPublic', err, {});
      } finally {
        if (!cancelled) setLoadingPublic(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, publicLoaded, t]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const tabbable = () =>
      [...panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((el) => !el.hasAttribute('disabled'));

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const nodes = tabbable();
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener('keydown', onKey);
    const tid = window.setTimeout(() => {
      tabbable()[0]?.focus();
    }, 0);
    return () => {
      window.clearTimeout(tid);
      panel.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const goHome = () => {
    onGoHome();
    onClose();
  };

  const tryJoin = async (code: string) => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setJoining(true);
    setLocalError(null);
    try {
      const puzzle = await joinPuzzle(c);
      if (!puzzle) {
        setLocalError(t('home.deletedTitle'));
        setJoining(false);
        return;
      }
      if (puzzle.passwordHash) {
        setPendingPrivate(puzzle);
        setJoining(false);
        return;
      }
      saveToHistory(puzzle.id, puzzle.name);
      onNavigateToPuzzle(puzzle.id);
      onClose();
    } catch (err) {
      setLocalError(t('home.errorJoin'));
      reportError('navigationDrawer_tryJoin', err, { code: c });
    } finally {
      setJoining(false);
    }
  };

  const verifyPrivateJoin = async () => {
    if (!pendingPrivate || !joinPassword) return;
    setJoining(true);
    setLocalError(null);
    try {
      const hash = await hashPassword(joinPassword);
      if (hash === pendingPrivate.passwordHash) {
        saveToHistory(pendingPrivate.id, pendingPrivate.name);
        onNavigateToPuzzle(pendingPrivate.id);
        setPendingPrivate(null);
        setJoinPassword('');
        onClose();
      } else {
        setLocalError(t('home.errorPwWrong'));
      }
    } catch (err) {
      setLocalError(t('home.errorGeneric'));
      reportError('navigationDrawer_verifyPrivateJoin', err, {});
    } finally {
      setJoining(false);
    }
  };

  const filteredPublic = publicPuzzles.filter(
    (p) =>
      p.name.toLowerCase().includes(publicSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(publicSearch.toLowerCase()),
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-black/40 dark:bg-black/60 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        id="app-navigation-drawer"
        className={`fixed left-0 top-0 z-[70] h-full max-h-dvh w-full min-w-0 max-w-[min(100vw,24rem)] bg-white dark:bg-gray-900 shadow-2xl border-r border-gray-100 dark:border-gray-800 flex flex-col transition-transform duration-200 ease-out pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] touch-pan-y ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!open}
        aria-label={t('nav.drawerTitle')}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:p-4 border-b border-gray-100 dark:border-gray-800 shrink-0 min-h-[3.25rem]">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 truncate pr-2">{t('nav.drawerTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full text-gray-500 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800 dark:active:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0"
            aria-label={t('nav.closeDrawer')}
          >
            <X size={22} aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-y-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-6 [-webkit-overflow-scrolling:touch]">
          <button
            type="button"
            onClick={goHome}
            className="w-full flex items-center gap-3 min-h-12 px-4 py-3 rounded-xl bg-indigo-50 text-indigo-800 font-semibold hover:bg-indigo-100 active:bg-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-200 dark:hover:bg-indigo-900/60 transition text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Home size={20} aria-hidden />
            {t('nav.home')}
          </button>

          <section>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock size={14} aria-hidden /> {t('nav.recent')}
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{t('nav.noRecent')}</p>
            ) : (
              <ul className="space-y-1">
                {history.map((item) => (
                  <li key={item.code} className="flex gap-1 items-stretch">
                    <button
                      type="button"
                      disabled={joining}
                      onClick={() => tryJoin(item.code)}
                      className="flex-1 min-h-12 text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 active:bg-gray-100 dark:active:bg-gray-700 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{item.name}</p>
                      <p className="text-xs font-mono text-gray-400">{item.code}</p>
                    </button>
                    <button
                      type="button"
                      title={t('home.removeHistory')}
                      aria-label={t('home.removeHistory')}
                      onClick={() => {
                        removeFromHistory(item.code);
                        refreshHistory();
                      }}
                      className="inline-flex items-center justify-center shrink-0 min-h-12 min-w-12 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl active:bg-red-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                    >
                      <X size={18} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe size={14} className="text-green-600 dark:text-green-400" aria-hidden /> {t('nav.public')}
            </h3>
            {loadingPublic && !publicLoaded ? (
              <div
                className="space-y-2 py-1"
                role="status"
                aria-busy="true"
                aria-label={t('nav.publicLoadingSkeleton')}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden />
                  <input
                    type="search"
                    value={publicSearch}
                    onChange={(e) => setPublicSearch(e.target.value)}
                    placeholder={t('home.searchPh')}
                    className="w-full min-h-11 pl-10 pr-3 py-2 text-base sm:text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-400 outline-none"
                    enterKeyHint="search"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
                {filteredPublic.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">
                    {publicSearch ? t('home.noResults') : t('home.noPublic')}
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-[min(40vh,14rem)] sm:max-h-56 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                    {filteredPublic.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={joining}
                          onClick={() => tryJoin(p.id)}
                          className="w-full flex items-center justify-between gap-3 min-h-12 px-3 py-2.5 rounded-xl hover:bg-green-50 active:bg-green-100/80 text-left border border-transparent hover:border-green-200 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">
                              {p.placedPieces.toLocaleString(numberLocale)} /{' '}
                              {p.totalPieces.toLocaleString(numberLocale)} ·{' '}
                              {Math.round((p.placedPieces / p.totalPieces) * 100)}%
                            </p>
                          </div>
                          <ArrowRight size={18} className="text-gray-400 shrink-0" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          {localError && <p className="text-sm text-red-600">{localError}</p>}
        </nav>

        {pendingPrivate && (
          <div className="border-t border-gray-100 dark:border-gray-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-indigo-50 dark:bg-indigo-950/40 shrink-0">
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-3 flex items-center gap-2">
              <Lock size={14} aria-hidden />
              &quot;{pendingPrivate.name}&quot; {t('home.protectedPw')}
            </p>
            <div className="flex flex-wrap gap-2 items-stretch">
              <div className="relative flex-1 min-w-[min(100%,12rem)]">
                <input
                  type={showJoinPassword ? 'text' : 'password'}
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPrivateJoin()}
                  placeholder={t('home.passwordPh')}
                  className="w-full min-h-11 pl-3 pr-11 py-2 border border-indigo-200 rounded-xl text-base sm:text-sm"
                  autoFocus
                  enterKeyHint="go"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowJoinPassword(!showJoinPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-h-10 min-w-10 rounded-lg text-gray-500 hover:bg-white/80 active:bg-white"
                  aria-label={showJoinPassword ? t('home.hidePassword') : t('home.showPassword')}
                >
                  {showJoinPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="button"
                onClick={verifyPrivateJoin}
                disabled={joining || !joinPassword}
                className="min-h-11 px-5 rounded-xl bg-indigo-600 text-white text-base font-bold disabled:opacity-50 active:bg-indigo-700"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingPrivate(null);
                  setJoinPassword('');
                  setLocalError(null);
                }}
                className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-gray-600 hover:bg-white/80 active:bg-white border border-indigo-100"
                aria-label={t('common.cancel')}
              >
                <X size={20} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
