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

const logoSrc = `${import.meta.env.BASE_URL}logo.svg`;

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

      <header className="sticky top-0 z-50 pt-[env(safe-area-inset-top,0px)]">
        <div className="border-b border-gray-200/70 bg-gradient-to-b from-white/92 via-white/85 to-white/75 backdrop-blur-xl backdrop-saturate-150 dark:border-gray-800/80 dark:from-gray-950/92 dark:via-gray-950/88 dark:to-gray-950/78 dark:backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-200/60 to-transparent dark:via-indigo-500/25" aria-hidden />
          <div className="relative mx-auto flex min-h-[3.25rem] max-w-5xl items-center justify-between gap-2 px-3 py-2 sm:min-h-14 sm:px-5 sm:py-2.5">
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
              <button
                ref={menuButtonRef}
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  setThemeOpen(false);
                  setDrawerOpen(true);
                }}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-gray-600 transition hover:bg-gray-100/90 active:scale-[0.98] dark:text-gray-300 dark:hover:bg-white/5 dark:active:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950"
                aria-expanded={drawerOpen}
                aria-controls="app-navigation-drawer"
                title={t('nav.openMenu')}
                aria-label={t('nav.openMenu')}
              >
                <Menu size={22} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                onClick={onGoHome}
                className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-2xl py-1 pl-1 pr-2 transition hover:bg-gray-100/80 active:scale-[0.99] dark:hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 sm:pr-2.5"
                title={t('nav.home')}
              >
                <span className="relative shrink-0">
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-400/30 to-violet-500/20 blur-md dark:from-indigo-500/20 dark:to-violet-500/15" aria-hidden />
                  <img
                    src={logoSrc}
                    alt=""
                    width={32}
                    height={32}
                    className="relative size-8 shrink-0 rounded-xl shadow-sm ring-1 ring-gray-900/[0.06] dark:ring-white/10"
                  />
                </span>
                <span className="truncate bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-clip-text text-base font-semibold tracking-tight text-transparent dark:from-indigo-400 dark:via-violet-400 dark:to-indigo-400 sm:text-[1.05rem]">
                  {t('common.appName')}
                </span>
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-gray-200/80 bg-gray-50/90 p-1 shadow-inner shadow-white/40 ring-1 ring-gray-900/[0.03] dark:border-gray-700/90 dark:bg-gray-900/50 dark:shadow-inner dark:shadow-black/20 dark:ring-white/[0.04]">
              <div className="relative shrink-0" ref={themeRef}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    setThemeOpen((o) => !o);
                  }}
                  className={`inline-flex size-10 items-center justify-center rounded-xl text-gray-600 transition hover:bg-white/90 hover:shadow-sm dark:text-gray-300 dark:hover:bg-gray-800/90 dark:hover:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 ${themeOpen ? 'bg-white shadow-sm dark:bg-gray-800' : ''}`}
                  aria-expanded={themeOpen}
                  aria-haspopup="true"
                  aria-label={t('nav.themeMenu')}
                  title={t('nav.themeMenu')}
                >
                  {preference === 'system' ? (
                    <SunMoon size={20} strokeWidth={2} aria-hidden />
                  ) : effective === 'dark' ? (
                    <Moon size={20} strokeWidth={2} aria-hidden />
                  ) : (
                    <Sun size={20} strokeWidth={2} aria-hidden />
                  )}
                </button>
                {themeOpen && (
                  <div
                    className="absolute right-0 z-[85] mt-2 w-52 overflow-hidden rounded-2xl border border-gray-200/90 bg-white/95 p-1 shadow-lg shadow-gray-900/10 ring-1 ring-gray-900/[0.04] backdrop-blur-md dark:border-gray-600/90 dark:bg-gray-900/95 dark:shadow-black/40 dark:ring-white/[0.06]"
                    role="menu"
                  >
                    {(['light', 'dark', 'system'] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="menuitem"
                        onClick={() => pickTheme(value)}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-gray-800 transition hover:bg-gray-100/90 dark:text-gray-100 dark:hover:bg-gray-800/80"
                      >
                        {value === 'light' && <Sun size={16} className="shrink-0 text-amber-500" aria-hidden />}
                        {value === 'dark' && <Moon size={16} className="shrink-0 text-indigo-400" aria-hidden />}
                        {value === 'system' && <SunMoon size={16} className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />}
                        <span className="flex-1 font-medium">
                          {value === 'light' && t('nav.themeLight')}
                          {value === 'dark' && t('nav.themeDark')}
                          {value === 'system' && t('nav.themeSystem')}
                        </span>
                        {preference === value && (
                          <Check size={16} className="shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative h-6 w-px shrink-0 bg-gray-200/90 dark:bg-gray-600/80" aria-hidden />

              <div className="relative shrink-0" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => {
                    setThemeOpen(false);
                    setProfileOpen((o) => !o);
                  }}
                  className={`flex min-h-10 items-center gap-2 rounded-xl py-1 pl-1 pr-1.5 transition hover:bg-white/90 hover:shadow-sm dark:hover:bg-gray-800/90 sm:pr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 ${profileOpen ? 'bg-white/95 shadow-sm dark:bg-gray-800/95' : ''}`}
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                  aria-label={t('nav.profileMenu')}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-950 sm:size-8">
                    {initial}
                  </span>
                  <span className="hidden max-w-[100px] truncate text-sm font-medium text-gray-700 min-[400px]:inline dark:text-gray-200 sm:max-w-[120px]">
                    {displayName}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-gray-400 transition-transform dark:text-gray-500 ${profileOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>

                {profileOpen && (
                  <div
                    className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top,0px)+4.5rem)] z-[80] max-h-[min(70dvh,28rem)] overflow-y-auto overscroll-y-contain rounded-2xl border border-gray-200/90 bg-white/95 p-4 shadow-xl shadow-gray-900/10 ring-1 ring-gray-900/[0.04] backdrop-blur-md dark:border-gray-600/90 dark:bg-gray-900/95 dark:shadow-black/40 dark:ring-white/[0.06] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 sm:max-h-none sm:overflow-visible"
                    role="dialog"
                    aria-label={t('nav.profileSection')}
                  >
                    <div className="mb-3 flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
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
                        className={`min-h-11 flex-1 min-w-0 rounded-xl border px-3 text-base outline-none transition sm:text-sm ${pseudoLocked ? 'cursor-not-allowed bg-gray-50 text-gray-500 dark:bg-gray-800/80 dark:text-gray-400' : 'border-gray-200 bg-white focus:ring-2 focus:ring-indigo-400/80 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100'}`}
                        aria-label={t('home.yourPseudo')}
                        enterKeyHint="done"
                        autoComplete="nickname"
                      />
                      <button
                        type="button"
                        onClick={togglePseudoLock}
                        title={pseudoLocked ? t('dashboard.unlockPseudo') : t('dashboard.lockPseudo')}
                        aria-label={pseudoLocked ? t('dashboard.unlockPseudo') : t('dashboard.lockPseudo')}
                        className={`inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border transition active:scale-[0.98] ${pseudoLocked ? 'border-indigo-200/80 bg-indigo-50 text-indigo-600 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-800/80'}`}
                      >
                        {pseudoLocked ? <Lock size={18} aria-hidden /> : <Unlock size={18} aria-hidden />}
                      </button>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {pseudoLocked ? t('home.pseudoLockedHint') : t('home.pseudoUnlockedHint')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
