import React, { useState, useRef, useEffect } from 'react';
import { Menu, Lock, Unlock, ChevronDown, User } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { NavigationDrawer } from './NavigationDrawer';
import {
  setPseudo as savePseudoToStorage,
  setPseudoLocked as savePseudoLockedToStorage,
} from '../utils/pseudo';

export type NavbarProps = {
  pseudo: string;
  onPseudoChange: (value: string) => void;
  pseudoLocked: boolean;
  onPseudoLockedChange: (locked: boolean) => void;
  onGoHome: () => void;
  onNavigateToPuzzle: (roomCode: string) => void;
  /** After pseudo is committed (blur), sync dependent UI (e.g. input mode per pseudo). */
  onPseudoCommit?: () => void;
};

export const Navbar: React.FC<NavbarProps> = ({
  pseudo,
  onPseudoChange,
  pseudoLocked,
  onPseudoLockedChange,
  onGoHome,
  onNavigateToPuzzle,
  onPseudoCommit,
}) => {
  const { t } = useI18n();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!profileRef.current?.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const togglePseudoLock = () => {
    if (!pseudoLocked) savePseudoToStorage(pseudo.trim());
    const next = !pseudoLocked;
    savePseudoLockedToStorage(next);
    onPseudoLockedChange(next);
    onPseudoCommit?.();
  };

  const displayName = pseudo.trim() || t('home.pseudoPlaceholder');
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <NavigationDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onGoHome={onGoHome}
        onNavigateToPuzzle={onNavigateToPuzzle}
      />

      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setDrawerOpen(true);
              }}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0"
              aria-expanded={drawerOpen}
              aria-controls="app-navigation-drawer"
              title={t('nav.openMenu')}
              aria-label={t('nav.openMenu')}
            >
              <Menu size={22} aria-hidden />
            </button>
            <button
              type="button"
              onClick={onGoHome}
              className="flex items-center gap-2 min-w-0 hover:opacity-90 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg pr-1"
              title={t('nav.home')}
            >
              <img src="/mister-puzzle/logo.png" alt="" className="w-8 h-8 shrink-0 rounded-lg" />
              <span className="font-bold text-indigo-600 text-base sm:text-lg tracking-tight truncate">
                {t('common.appName')}
              </span>
            </button>
          </div>

          <div className="relative shrink-0" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 pl-1 pr-2 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label={t('nav.profileMenu')}
            >
              <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">
                {initial}
              </span>
              <span className="hidden sm:inline max-w-[120px] truncate text-sm font-medium text-gray-700">
                {displayName}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>

            {profileOpen && (
              <div
                className="absolute right-0 mt-2 w-72 rounded-2xl border border-gray-100 bg-white shadow-xl p-4 z-[80]"
                role="dialog"
                aria-label={t('nav.profileSection')}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  <User size={12} aria-hidden />
                  {t('home.yourPseudo')}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pseudo}
                    onChange={(e) => !pseudoLocked && onPseudoChange(e.target.value)}
                    onBlur={() => {
                      if (!pseudoLocked) {
                        const trimmed = pseudo.trim();
                        savePseudoToStorage(trimmed);
                        onPseudoChange(trimmed);
                        onPseudoCommit?.();
                      }
                    }}
                    readOnly={pseudoLocked}
                    maxLength={30}
                    placeholder={t('home.pseudoPlaceholder')}
                    className={`flex-1 min-w-0 p-2 text-sm border rounded-lg outline-none transition ${pseudoLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-200 focus:ring-2 focus:ring-indigo-400'}`}
                    aria-label={t('home.yourPseudo')}
                  />
                  <button
                    type="button"
                    onClick={togglePseudoLock}
                    title={pseudoLocked ? t('dashboard.unlockPseudo') : t('dashboard.lockPseudo')}
                    aria-label={pseudoLocked ? t('dashboard.unlockPseudo') : t('dashboard.lockPseudo')}
                    className={`p-2 rounded-lg border shrink-0 ${pseudoLocked ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
                  >
                    {pseudoLocked ? <Lock size={16} aria-hidden /> : <Unlock size={16} aria-hidden />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {pseudoLocked ? t('home.pseudoLockedHint') : t('home.pseudoUnlockedHint')}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};
