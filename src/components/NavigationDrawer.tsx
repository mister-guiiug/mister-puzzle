import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
  ArrowDownUp,
} from 'lucide-react';
import { joinPuzzle, getPublicPuzzles, hashPassword, type PuzzleState } from '../hooks/useSocket';
import { getHistory, saveToHistory, removeFromHistory, type HistoryPuzzle } from '../utils/history';
import { useI18n } from '../i18n/I18nContext';
import { reportError } from '../utils/reportError';
import { prefetchDashboardChunk } from '../utils/prefetchDashboard';

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
  const [publicSort, setPublicSort] = useState<'nameAsc' | 'nameDesc' | 'progressDesc' | 'progressAsc'>('progressDesc');
  const [publicProgressMin, setPublicProgressMin] = useState('');
  const [publicProgressMax, setPublicProgressMax] = useState('');
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

  const filteredPublic = useMemo(() => {
    const q = publicSearch.toLowerCase().trim();
    return publicPuzzles.filter((p) => {
      const nameMatch =
        p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
      if (!nameMatch) return false;
      const pct = p.totalPieces > 0 ? (p.placedPieces / p.totalPieces) * 100 : 0;
      const minRaw = publicProgressMin.trim();
      const maxRaw = publicProgressMax.trim();
      const minN = minRaw === '' ? null : Number(minRaw);
      const maxN = maxRaw === '' ? null : Number(maxRaw);
      if (minN !== null && !Number.isNaN(minN) && pct < Math.min(100, Math.max(0, minN))) return false;
      if (maxN !== null && !Number.isNaN(maxN) && pct > Math.min(100, Math.max(0, maxN))) return false;
      return true;
    });
  }, [publicPuzzles, publicSearch, publicProgressMin, publicProgressMax]);

  const sortedFilteredPublic = useMemo(() => {
    const arr = [...filteredPublic];
    const pct = (p: (typeof arr)[0]) =>
      p.totalPieces > 0 ? p.placedPieces / p.totalPieces : 0;
    arr.sort((a, b) => {
      switch (publicSort) {
        case 'nameAsc':
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'nameDesc':
          return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
        case 'progressAsc':
          return pct(a) - pct(b);
        case 'progressDesc':
        default:
          return pct(b) - pct(a);
      }
    });
    return arr;
  }, [filteredPublic, publicSort]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[60] bg-overlay transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        id="app-navigation-drawer"
        className={`fixed left-0 top-0 z-[70] h-full max-h-dvh w-full min-w-0 max-w-[min(100vw,24rem)] bg-surface shadow-2xl border-r border-divide flex flex-col transition-transform duration-200 ease-out pt-[env(safe-area-inset-top,0px)] pl-[env(safe-area-inset-left,0px)] touch-pan-y ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!open}
        aria-label={t('nav.drawerTitle')}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:p-4 border-b border-divide shrink-0 min-h-[3.25rem]">
          <h2 className="text-lg font-bold text-fg-heading truncate pr-2">{t('nav.drawerTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full text-fg-muted hover:bg-surface-muted active:bg-surface-muted dark:hover:bg-surface-muted dark:active:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring shrink-0"
            aria-label={t('nav.closeDrawer')}
          >
            <X size={22} aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-y-contain p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-6 [-webkit-overflow-scrolling:touch]">
          <button
            type="button"
            onClick={goHome}
            className="w-full flex items-center gap-3 min-h-12 px-4 py-3 rounded-xl bg-primary-soft text-primary-strong font-semibold hover:bg-primary-soft-hover active:bg-primary-soft-active transition text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
          >
            <Home size={20} aria-hidden />
            {t('nav.home')}
          </button>

          <section>
            <h3 className="text-xs font-bold text-fg-faint uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock size={14} aria-hidden /> {t('nav.recent')}
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-fg-faint py-2">{t('nav.noRecent')}</p>
            ) : (
              <ul className="space-y-1">
                {history.map((item) => (
                  <li key={item.code} className="flex gap-1 items-stretch">
                    <button
                      type="button"
                      disabled={joining}
                      onMouseEnter={prefetchDashboardChunk}
                      onClick={() => tryJoin(item.code)}
                      className="flex-1 min-h-12 text-left px-3 py-2.5 rounded-xl hover:bg-surface-muted dark:hover:bg-surface-muted border border-transparent hover:border-border-ui dark:hover:border-border-ui active:bg-surface-muted dark:active:bg-surface-muted transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
                    >
                      <p className="font-semibold text-fg-heading text-sm truncate">{item.name}</p>
                      <p className="text-xs font-mono text-fg-faint">{item.code}</p>
                    </button>
                    <button
                      type="button"
                      title={t('home.removeHistory')}
                      aria-label={t('home.removeHistory')}
                      onClick={() => {
                        removeFromHistory(item.code);
                        refreshHistory();
                      }}
                      className="inline-flex items-center justify-center shrink-0 min-h-12 min-w-12 text-fg-faint hover:text-danger-hover-text hover:bg-danger-soft-hover rounded-xl active:bg-danger-soft-active focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-ring"
                    >
                      <X size={18} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-bold text-fg-faint uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe size={14} className="text-success-fill" aria-hidden /> {t('nav.public')}
            </h3>
            {loadingPublic && !publicLoaded ? (
              <div
                className="space-y-2 py-1"
                role="status"
                aria-busy="true"
                aria-label={t('nav.publicLoadingSkeleton')}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-surface-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint pointer-events-none" aria-hidden />
                  <input
                    type="search"
                    value={publicSearch}
                    onChange={(e) => setPublicSearch(e.target.value)}
                    placeholder={t('home.searchPh')}
                    className="w-full min-h-11 pl-10 pr-3 py-2 text-base sm:text-sm border border-border-ui rounded-xl bg-surface-muted text-fg focus:ring-2 focus:ring-success-ring outline-none"
                    enterKeyHint="search"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <ArrowDownUp size={14} className="shrink-0 text-fg-faint" aria-hidden />
                  <label htmlFor="nav-public-sort" className="sr-only">
                    {t('nav.publicSort')}
                  </label>
                  <select
                    id="nav-public-sort"
                    value={publicSort}
                    onChange={(e) => setPublicSort(e.target.value as typeof publicSort)}
                    className="min-h-9 flex-1 rounded-lg border border-border-ui bg-surface px-2 py-1.5 text-xs font-medium text-fg-heading dark:border-border-ui dark:bg-surface-muted dark:text-fg"
                  >
                    <option value="progressDesc">{t('nav.publicSortProgressDesc')}</option>
                    <option value="progressAsc">{t('nav.publicSortProgressAsc')}</option>
                    <option value="nameAsc">{t('nav.publicSortNameAsc')}</option>
                    <option value="nameDesc">{t('nav.publicSortNameDesc')}</option>
                  </select>
                </div>
                <p className="text-[11px] text-fg-faint mb-1.5 leading-snug">{t('nav.publicFilterHint')}</p>
                <div className="mb-2 flex flex-wrap items-end gap-2">
                  <div className="min-w-[6.5rem] flex-1">
                    <label htmlFor="nav-public-pct-min" className="block text-[10px] font-semibold uppercase tracking-wide text-fg-faint mb-0.5">
                      {t('nav.publicFilterProgressMin')}
                    </label>
                    <input
                      id="nav-public-pct-min"
                      type="number"
                      min={0}
                      max={100}
                      inputMode="numeric"
                      placeholder="0"
                      value={publicProgressMin}
                      onChange={(e) => setPublicProgressMin(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                      className="w-full min-h-9 rounded-lg border border-border-ui bg-surface px-2 py-1.5 text-xs text-fg-heading dark:border-border-ui dark:bg-surface-muted"
                    />
                  </div>
                  <div className="min-w-[6.5rem] flex-1">
                    <label htmlFor="nav-public-pct-max" className="block text-[10px] font-semibold uppercase tracking-wide text-fg-faint mb-0.5">
                      {t('nav.publicFilterProgressMax')}
                    </label>
                    <input
                      id="nav-public-pct-max"
                      type="number"
                      min={0}
                      max={100}
                      inputMode="numeric"
                      placeholder="100"
                      value={publicProgressMax}
                      onChange={(e) => setPublicProgressMax(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                      className="w-full min-h-9 rounded-lg border border-border-ui bg-surface px-2 py-1.5 text-xs text-fg-heading dark:border-border-ui dark:bg-surface-muted"
                    />
                  </div>
                </div>
                {filteredPublic.length === 0 ? (
                  <p className="text-sm text-fg-faint py-2">
                    {publicPuzzles.length === 0 ? t('home.noPublic') : t('home.noResults')}
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-[min(40vh,14rem)] sm:max-h-56 overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
                    {sortedFilteredPublic.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={joining}
                          onMouseEnter={prefetchDashboardChunk}
                          onClick={() => tryJoin(p.id)}
                          className="w-full flex items-center justify-between gap-3 min-h-12 px-3 py-2.5 rounded-xl hover:bg-success-row-hover active:bg-success-row-active text-left border border-transparent hover:border-success-row-border transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-success-ring"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-fg-heading text-sm truncate">{p.name}</p>
                            <p className="text-xs text-fg-faint">
                              {p.placedPieces.toLocaleString(numberLocale)} /{' '}
                              {p.totalPieces.toLocaleString(numberLocale)} ·{' '}
                              {p.totalPieces > 0 ? Math.round((p.placedPieces / p.totalPieces) * 100) : 0}%
                            </p>
                          </div>
                          <ArrowRight size={18} className="text-fg-faint shrink-0" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>

          {localError && <p className="text-sm text-danger-text">{localError}</p>}
        </nav>

        {pendingPrivate && (
          <div className="border-t border-divide p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-primary-soft shrink-0">
            <p className="text-sm font-semibold text-primary-strong mb-3 flex items-center gap-2">
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
                  className="w-full min-h-11 pl-3 pr-11 py-2 border border-primary-border rounded-xl text-base sm:text-sm"
                  autoFocus
                  enterKeyHint="go"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowJoinPassword(!showJoinPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-h-10 min-w-10 rounded-lg text-fg-muted hover:bg-surface/80 active:bg-surface"
                  aria-label={showJoinPassword ? t('home.hidePassword') : t('home.showPassword')}
                >
                  {showJoinPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="button"
                onClick={verifyPrivateJoin}
                disabled={joining || !joinPassword}
                className="min-h-11 px-5 rounded-xl bg-primary-fill text-white text-base font-bold disabled:opacity-50 active:bg-primary-fill-hover"
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
                className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-fg-muted hover:bg-surface/80 active:bg-surface border border-primary-border-muted"
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
