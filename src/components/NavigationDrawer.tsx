import React, { useEffect, useState, useCallback } from 'react';
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

  const refreshHistory = useCallback(() => setHistory(getHistory()), []);

  useEffect(() => {
    if (open) {
      refreshHistory();
      setLocalError(null);
      setPendingPrivate(null);
      setJoinPassword('');
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
      } catch {
        if (!cancelled) setLocalError(t('home.errorPublic'));
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
    } catch {
      setLocalError(t('home.errorJoin'));
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
    } catch {
      setLocalError(t('home.errorGeneric'));
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
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        id="app-navigation-drawer"
        className={`fixed left-0 top-0 z-[70] h-full w-full max-w-sm bg-white shadow-2xl border-r border-gray-100 flex flex-col transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!open}
        aria-label={t('nav.drawerTitle')}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">{t('nav.drawerTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label={t('nav.closeDrawer')}
          >
            <X size={22} aria-hidden />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
          <button
            type="button"
            onClick={goHome}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 text-indigo-800 font-semibold hover:bg-indigo-100 transition text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Home size={20} aria-hidden />
            {t('nav.home')}
          </button>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Clock size={14} aria-hidden /> {t('nav.recent')}
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">{t('nav.noRecent')}</p>
            ) : (
              <ul className="space-y-1">
                {history.map((item) => (
                  <li key={item.code} className="flex gap-1">
                    <button
                      type="button"
                      disabled={joining}
                      onClick={() => tryJoin(item.code)}
                      className="flex-1 text-left p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2"
                    >
                      <p className="font-semibold text-gray-800 text-sm truncate">{item.name}</p>
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
                      className="shrink-0 p-2 text-gray-300 hover:text-red-500 rounded-lg focus:outline-none focus-visible:ring-2"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Globe size={14} className="text-green-600" aria-hidden /> {t('nav.public')}
            </h3>
            {loadingPublic && !publicLoaded ? (
              <p className="text-sm text-gray-400 py-2 animate-pulse">{t('common.loading')}</p>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
                  <input
                    type="text"
                    value={publicSearch}
                    onChange={(e) => setPublicSearch(e.target.value)}
                    placeholder={t('home.searchPh')}
                    className="w-full pl-8 pr-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-400 outline-none"
                  />
                </div>
                {filteredPublic.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">
                    {publicSearch ? t('home.noResults') : t('home.noPublic')}
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-56 overflow-y-auto">
                    {filteredPublic.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          disabled={joining}
                          onClick={() => tryJoin(p.id)}
                          className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-green-50 text-left border border-transparent hover:border-green-200 transition disabled:opacity-50 focus:outline-none focus-visible:ring-2"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">
                              {p.placedPieces.toLocaleString(numberLocale)} /{' '}
                              {p.totalPieces.toLocaleString(numberLocale)} ·{' '}
                              {Math.round((p.placedPieces / p.totalPieces) * 100)}%
                            </p>
                          </div>
                          <ArrowRight size={14} className="text-gray-300 shrink-0" aria-hidden />
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
          <div className="border-t border-gray-100 p-4 bg-indigo-50 shrink-0">
            <p className="text-sm font-semibold text-indigo-800 mb-2 flex items-center gap-2">
              <Lock size={14} aria-hidden />
              &quot;{pendingPrivate.name}&quot; {t('home.protectedPw')}
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showJoinPassword ? 'text' : 'password'}
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && verifyPrivateJoin()}
                  placeholder={t('home.passwordPh')}
                  className="w-full p-2 pr-8 border rounded-lg text-sm"
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
                onClick={verifyPrivateJoin}
                disabled={joining || !joinPassword}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
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
                className="px-2 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
