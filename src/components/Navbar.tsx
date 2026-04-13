import React, { useState, useRef, useEffect } from 'react';
import { Menu, Lock, Unlock, ChevronDown, User, Sun, Moon, SunMoon, Check } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '../theme/ThemeContext';
import { NavigationDrawer } from './NavigationDrawer';
import {
  setPseudo as savePseudoToStorage,
  setPseudoLocked as savePseudoLockedToStorage,
} from '../utils/pseudo';
import type { ThemePreference } from '../theme/themeStorage';

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
  const { preference, effective, setPreference } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const prevDrawerOpen = useRef(drawerOpen);

  useEffect(() => {
    if (prevDrawerOpen.current && !drawerOpen) {
      menuButtonRef.current?.focus();
    }
    prevDrawerOpen.current = drawerOpen;
  }, [drawerOpen]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!profileRef.current?.contains(n)) setProfileOpen(false);
      if (!themeRef.current?.contains(n)) setThemeOpen(false);
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
  }, []);

  const pickTheme = (value: ThemePreference) => {
    setPreference(value);
    setThemeOpen(false);
    setProfileOpen(false);
  };

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

      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm dark:border-gray-800 dark:bg-gray-950/95 pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 min-h-14 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setThemeOpen(false);
                setDrawerOpen(true);
              }}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0"
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
              className="flex items-center gap-2 min-w-0 min-h-11 px-1 sm:pr-1 rounded-xl hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800/80 dark:active:bg-gray-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              title={t('nav.home')}
            >
              <img src="/mister-puzzle/logo.png" alt="" className="w-8 h-8 shrink-0 rounded-lg" />
              <span className="font-bold text-indigo-600 text-base sm:text-lg tracking-tight truncate">
                {t('common.appName')}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative shrink-0" ref={themeRef}>
            <button
              type="button"
              onClick={() => {
                setProfileOpen(false);
                setThemeOpen((o) => !o);
              }}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-expanded={themeOpen}
              aria-haspopup="true"
              aria-label={t('nav.themeMenu')}
              title={t('nav.themeMenu')}
            >
              {preference === 'system' ? (
                <SunMoon size={20} aria-hidden />
              ) : effective === 'dark' ? (
                <Moon size={20} aria-hidden />
              ) : (
                <Sun size={20} aria-hidden />
              )}
            </button>
            {themeOpen && (
              <div
                className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-xl z-[85] dark:border-gray-700 dark:bg-gray-900"
                role="menu"
              >
                {(['light', 'dark', 'system'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitem"
                    onClick={() => pickTheme(value)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    {value === 'light' && <Sun size={16} className="shrink-0 text-amber-500" aria-hidden />}
                    {value === 'dark' && <Moon size={16} className="shrink-0 text-indigo-400" aria-hidden />}
                    {value === 'system' && <SunMoon size={16} className="shrink-0 text-gray-500" aria-hidden />}
                    <span className="flex-1">
                      {value === 'light' && t('nav.themeLight')}
                      {value === 'dark' && t('nav.themeDark')}
                      {value === 'system' && t('nav.themeSystem')}
                    </span>
                    {preference === value && <Check size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative shrink-0" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setThemeOpen(false);
                setProfileOpen((o) => !o);
              }}
              className="flex items-center gap-2 pl-1.5 pr-2 sm:pr-2.5 min-h-11 rounded-full border border-gray-200 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:active:bg-gray-600 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-expanded={profileOpen}
              aria-haspopup="true"
              aria-label={t('nav.profileMenu')}
            >
              <span className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">
                {initial}
              </span>
              <span className="hidden min-[400px]:inline max-w-[100px] sm:max-w-[120px] truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                {displayName}
              </span>
              <ChevronDown
                size={16}
                className={`text-gray-400 shrink-0 transition-transform ${profileOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>

            {profileOpen && (
              <div
                className="fixed left-3 right-3 top-[calc(3.5rem+env(safe-area-inset-top,0px)+0.5rem)] z-[80] rounded-2xl border border-gray-100 bg-white shadow-xl p-4 max-h-[min(70dvh,28rem)] overflow-y-auto overscroll-y-contain dark:border-gray-700 dark:bg-gray-900 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:max-h-none sm:overflow-visible"
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
                    className={`flex-1 min-w-0 min-h-11 px-3 text-base sm:text-sm border rounded-xl outline-none transition ${pseudoLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400' : 'border-gray-200 focus:ring-2 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100'}`}
                    aria-label={t('home.yourPseudo')}
                    enterKeyHint="done"
                    autoComplete="nickname"
                  />
                  <button
                    type="button"
                    onClick={togglePseudoLock}
                    title={pseudoLocked ? t('dashboard.unlockPseudo') : t('dashboard.lockPseudo')}
                    aria-label={pseudoLocked ? t('dashboard.unlockPseudo') : t('dashboard.lockPseudo')}
                    className={`inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl border shrink-0 active:opacity-80 ${pseudoLocked ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300' : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-600'}`}
                  >
                    {pseudoLocked ? <Lock size={18} aria-hidden /> : <Unlock size={18} aria-hidden />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {pseudoLocked ? t('home.pseudoLockedHint') : t('home.pseudoUnlockedHint')}
                </p>
              </div>
            )}
          </div>
          </div>
        </div>
      </header>
    </>
  );
};
