import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Camera,
  CheckCircle,
  Image as ImageIcon,
  Users,
  Plus,
  Grid,
  Share2,
  Trash2,
  Lock,
  Globe,
  Eye,
  EyeOff,
  Settings,
  Pencil,
  Check,
  X as XIcon,
  Flag,
  RotateCw,
  Download,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  MoreVertical,
  CircleHelp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
  type PuzzleState,
  type Member,
  updatePieces,
  toggleCheckpoint,
  addCheckpoint,
  addPhoto,
  deletePhoto,
  rotatePhoto,
  updateGridSize,
  deletePuzzle,
  joinMember,
  leaveMember,
  changePassword,
  updateVisibility,
  hashPassword,
  renamePuzzle,
  uncheckAllCheckpoints,
  reorderPhotos,
  updatePhoto,
} from '../hooks/useSocket';
import ErrorModal from './ErrorModal';
import { getSessionId, getInputMode, setInputModePreference } from '../utils/pseudo';
import { getReadOnlyMode, setReadOnlyMode } from '../utils/prefs';
import { useI18n } from '../i18n/I18nContext';
import { ProgressChart } from './ProgressChart';
import { exportProgressPng } from '../utils/exportProgressCard';
import { reportError } from '../utils/reportError';

const MEMBER_TTL_MS = 5 * 60 * 1000;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

interface DashboardProps {
  puzzle: PuzzleState;
  onBack: () => void;
  pseudo: string;
  pseudoRefreshKey: number;
}

const Dashboard: React.FC<DashboardProps> = ({ puzzle, onBack, pseudo, pseudoRefreshKey }) => {
  const { t, numberLocale, locale, setLocale } = useI18n();
  const dateLocale = locale === 'en' ? enUS : fr;

  const [newPieces, setNewPieces] = useState(puzzle.placedPieces);
  const [inputMode, setInputMode] = useState<'placed' | 'remaining'>(() => getInputMode(pseudo));
  const isDirtyRef = useRef(false);
  const lastServerPlacedRef = useRef(puzzle.placedPieces);
  const [remoteConflict, setRemoteConflict] = useState(false);
  const [readOnly, setReadOnlyState] = useState(getReadOnlyMode);

  const [dragPhotoId, setDragPhotoId] = useState<string | null>(null);

  const handleSetReadOnly = (next: boolean) => {
    setReadOnlyState(next);
    setReadOnlyMode(next);
    if (next) {
      isDirtyRef.current = false;
      setRemoteConflict(false);
      setNewPieces(puzzle.placedPieces);
    }
  };

  const handleSetInputMode = (mode: 'placed' | 'remaining') => {
    if (readOnly) return;
    setInputMode(mode);
    setInputModePreference(pseudo, mode);
  };

  const [error, setError] = useState<string | null>(null);
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [showGridEditor, setShowGridEditor] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gridRows, setGridRows] = useState(puzzle.rows ?? 0);
  const [gridCols, setGridCols] = useState(puzzle.cols ?? 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [step, setStep] = useState(1);
  const [flagConfirm, setFlagConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(puzzle.name);

  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    setInputMode(getInputMode(pseudo));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refresh input mode when Navbar commits pseudo (blur/lock), not on every keystroke
  }, [pseudoRefreshKey]);

  useEffect(() => {
    if (!actionsOpen) return;
    const close = (e: PointerEvent) => {
      if (!actionsRef.current?.contains(e.target as Node)) setActionsOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [actionsOpen]);

  useEffect(() => {
    const sessionId = getSessionId();
    joinMember(puzzle.id, sessionId, pseudo || 'Anonyme').catch(console.error);
    const beat = window.setInterval(() => {
      joinMember(puzzle.id, sessionId, pseudo || 'Anonyme').catch(() => {});
    }, 40000);
    return () => {
      window.clearInterval(beat);
      leaveMember(puzzle.id, sessionId).catch(console.error);
    };
  }, [puzzle.id, pseudo]);

  useEffect(() => {
    const server = puzzle.placedPieces;
    if (server !== lastServerPlacedRef.current) {
      lastServerPlacedRef.current = server;
      if (isDirtyRef.current) {
        setRemoteConflict(true);
      } else {
        setNewPieces(server);
      }
    }
  }, [puzzle.placedPieces]);

  const activeMembers = useMemo(() => {
    if (!puzzle.members) return [];
    const now = Date.now();
    return (Object.values(puzzle.members) as Member[]).filter((m) => now - m.lastSeen < MEMBER_TTL_MS);
  }, [puzzle.members]);

  const remainingPieces = puzzle.totalPieces - puzzle.placedPieces;
  const progress = Math.min((puzzle.placedPieces / puzzle.totalPieces) * 100, 100);
  const remainingRatioPct = puzzle.totalPieces > 0 ? Math.min((remainingPieces / puzzle.totalPieces) * 100, 100) : 0;

  const displayedValue = inputMode === 'placed' ? newPieces : puzzle.totalPieces - newPieces;
  const handleInputChange = (raw: number) => {
    if (readOnly) return;
    isDirtyRef.current = true;
    if (inputMode === 'placed') {
      setNewPieces(Math.max(0, Math.min(puzzle.totalPieces, raw)));
    } else {
      setNewPieces(Math.max(0, Math.min(puzzle.totalPieces, puzzle.totalPieces - raw)));
    }
  };

  const checkpointSuggestions = useMemo(() => {
    const pct = Math.round(progress);
    const pStr = puzzle.placedPieces.toLocaleString(numberLocale);
    const rStr = remainingPieces.toLocaleString(numberLocale);
    const totStr = puzzle.totalPieces.toLocaleString(numberLocale);
    if (inputMode === 'remaining') {
      return [
        `${pct}% ${t('dashboard.donePct')}`,
        `${rStr} ${t('dashboard.remaining')} (${t('dashboard.onTotal')} ${totStr})`,
        `${pStr} ${t('common.pieces')}`,
      ];
    }
    return [
      `${pct}% ${t('dashboard.donePct')}`,
      `${pStr} ${t('common.pieces')}`,
      `${rStr} ${t('dashboard.remaining').toLowerCase()}`,
    ];
  }, [inputMode, progress, puzzle.placedPieces, puzzle.totalPieces, remainingPieces, t, numberLocale]);

  const checkpointPresets = [
    t('dashboard.presetContour'),
    t('dashboard.presetSky'),
    t('dashboard.presetFigures'),
    t('dashboard.preset25'),
    t('dashboard.preset50'),
    t('dashboard.preset75'),
  ];

  const handlePiecesUpdate = async () => {
    if (readOnly) return;
    if (newPieces < 0 || newPieces > puzzle.totalPieces) {
      setError(`${t('dashboard.errorPiecesRange')} 0 ${t('dashboard.onTotal')} ${puzzle.totalPieces}.`);
      return;
    }
    try {
      await updatePieces(puzzle.id, newPieces, pseudo || undefined);
      isDirtyRef.current = false;
      setRemoteConflict(false);
    } catch (err) {
      setError(t('dashboard.errorUpdatePieces'));
      reportError('handlePiecesUpdate', err, { puzzleId: puzzle.id });
      console.error(err);
    }
  };

  const adoptServerValue = () => {
    setNewPieces(puzzle.placedPieces);
    isDirtyRef.current = false;
    setRemoteConflict(false);
  };

  const handleAddCheckpoint = async () => {
    if (readOnly || !newCheckpointName.trim()) return;
    try {
      await addCheckpoint(puzzle.id, newCheckpointName.trim(), pseudo || undefined);
      setNewCheckpointName('');
    } catch (err) {
      setError(t('dashboard.errorCheckpoint'));
      console.error(err);
    }
  };

  const handlePresetCheckpoint = async (name: string) => {
    if (readOnly) return;
    try {
      await addCheckpoint(puzzle.id, name, pseudo || undefined);
    } catch (err) {
      setError(t('dashboard.errorCheckpoint'));
      console.error(err);
    }
  };

  const handleUncheckAll = async () => {
    if (readOnly || puzzle.checkpoints.length === 0) return;
    try {
      await uncheckAllCheckpoints(
        puzzle.id,
        puzzle.checkpoints.map((c) => c.id),
      );
    } catch (err) {
      setError(t('dashboard.errorCheckpoint'));
      console.error(err);
    }
  };

  const handleChangePassword = async () => {
    if (readOnly) return;
    setPwMessage(null);
    if (puzzle.passwordHash) {
      if (!currentPwd) {
        setPwMessage({ type: 'error', text: t('dashboard.errorPwCurrent') });
        return;
      }
      const currentHash = await hashPassword(currentPwd);
      if (currentHash !== puzzle.passwordHash) {
        setPwMessage({ type: 'error', text: t('dashboard.errorPwBad') });
        return;
      }
    }
    try {
      const newHash = newPwd ? await hashPassword(newPwd) : null;
      await changePassword(puzzle.id, newHash);
      setCurrentPwd('');
      setNewPwd('');
      setPwMessage({ type: 'success', text: newPwd ? t('dashboard.pwOkSet') : t('dashboard.pwOkClear') });
      setTimeout(() => setPwMessage(null), 3000);
    } catch (err) {
      setPwMessage({ type: 'error', text: t('dashboard.errorPwChange') });
      console.error(err);
    }
  };

  const handleUpdateVisibility = async (newIsPublic: boolean) => {
    if (readOnly) return;
    try {
      await updateVisibility(puzzle.id, newIsPublic);
    } catch (err) {
      setError(t('dashboard.errorVisibility'));
      console.error(err);
    }
  };

  const handleRename = async () => {
    if (readOnly) return;
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === puzzle.name) {
      setEditingName(false);
      setNameInput(puzzle.name);
      return;
    }
    try {
      await renamePuzzle(puzzle.id, trimmed);
      setEditingName(false);
    } catch (err) {
      setError(t('dashboard.errorRename'));
      console.error(err);
      setNameInput(puzzle.name);
      setEditingName(false);
    }
  };

  const handleGridUpdate = async () => {
    if (readOnly) return;
    if (gridRows <= 0 || gridCols <= 0) {
      setError(t('dashboard.errorGridDims'));
      return;
    }
    try {
      await updateGridSize(puzzle.id, gridRows, gridCols);
      setShowGridEditor(false);
    } catch (err) {
      setError(t('dashboard.errorGridUpdate'));
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (readOnly) return;
    try {
      await deletePuzzle(puzzle.id);
      onBack();
    } catch (err) {
      setError(t('dashboard.errorDelete'));
      console.error(err);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${puzzle.id}`;
    const text = `${t('dashboard.shareText')} "${puzzle.name}" ${t('dashboard.shareOn')} ${puzzle.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: t('common.appName'), text, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportPng = () => {
    const url = `${window.location.origin}${window.location.pathname}#${puzzle.id}`;
    const pct = puzzle.totalPieces > 0 ? Math.round((puzzle.placedPieces / puzzle.totalPieces) * 100) : 0;
    const summaryLine =
      inputMode === 'remaining'
        ? `${puzzle.id} · ${remainingPieces.toLocaleString(numberLocale)} / ${puzzle.totalPieces.toLocaleString(numberLocale)} ${t('dashboard.remaining').toLowerCase()} · ${pct}% ${t('dashboard.donePct')}`
        : `${puzzle.id} · ${puzzle.placedPieces.toLocaleString(numberLocale)} / ${puzzle.totalPieces.toLocaleString(numberLocale)} · ${pct}% ${t('dashboard.donePct')}`;
    exportProgressPng({
      name: puzzle.name,
      code: puzzle.id,
      placed: puzzle.placedPieces,
      total: puzzle.totalPieces,
      url,
      titleLine: t('dashboard.exportHint'),
      summaryLine,
      barMode: inputMode === 'remaining' ? 'remaining' : 'placed',
    });
  };

  const resizeImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      if (file.size > MAX_UPLOAD_BYTES) {
        reject(new Error('size'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = () => reject(new Error('img'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('read'));
      reader.readAsDataURL(file);
    });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await resizeImage(file);
        await addPhoto(puzzle.id, compressed);
      } catch (err) {
        if ((err as Error).message === 'size') {
          setError(t('dashboard.errorPhotoSize'));
        } else {
          setError(t('dashboard.errorPhoto'));
        }
        console.error(err);
      }
    }
    e.target.value = '';
  };

  const handlePhotoDropReorder = async (targetId: string) => {
    if (readOnly || !dragPhotoId || dragPhotoId === targetId) {
      setDragPhotoId(null);
      return;
    }
    const ids = puzzle.photos.map((p) => p.id);
    const from = ids.indexOf(dragPhotoId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, dragPhotoId);
    setDragPhotoId(null);
    try {
      await reorderPhotos(puzzle.id, next);
    } catch (err) {
      setError(t('dashboard.errorPhoto'));
      console.error(err);
    }
  };

  const movePhoto = async (photoId: string, delta: number) => {
    if (readOnly) return;
    const ids = puzzle.photos.map((p) => p.id);
    const i = ids.indexOf(photoId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    const [removed] = next.splice(i, 1);
    next.splice(j, 0, removed);
    try {
      await reorderPhotos(puzzle.id, next);
    } catch (err) {
      setError(t('dashboard.errorPhoto'));
      console.error(err);
    }
  };

  const lastHistory = puzzle.history.length > 0 ? puzzle.history[puzzle.history.length - 1] : null;

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <ErrorModal message={error} onClose={() => setError(null)} />

      <div className="max-w-4xl mx-auto">
        {readOnly && (
          <div
            className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium text-center"
            role="status"
          >
            {t('dashboard.readOnlyBanner')}
          </div>
        )}

        <header className="mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="min-w-0 flex-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => !readOnly && setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') {
                        setEditingName(false);
                        setNameInput(puzzle.name);
                      }
                    }}
                    className="text-2xl font-bold text-gray-800 border-b-2 border-indigo-400 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
                    autoFocus
                    maxLength={100}
                    readOnly={readOnly}
                    aria-label={t('dashboard.rename')}
                  />
                  <button
                    type="button"
                    onClick={handleRename}
                    className="p-1 text-green-600 hover:text-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded"
                    title={t('dashboard.validate')}
                    aria-label={t('dashboard.validate')}
                  >
                    <Check size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(false);
                      setNameInput(puzzle.name);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded"
                    title={t('common.cancel')}
                    aria-label={t('common.cancel')}
                  >
                    <XIcon size={18} aria-hidden />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name">
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{puzzle.name}</h1>
                  <button
                    type="button"
                    onClick={() => !readOnly && setEditingName(true)}
                    disabled={readOnly}
                    className="p-1 text-gray-300 hover:text-indigo-500 transition opacity-0 group-hover/name:opacity-100 disabled:opacity-0 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
                    title={t('dashboard.rename')}
                    aria-label={t('dashboard.rename')}
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="text-indigo-600 font-mono font-bold text-sm">
                  {t('dashboard.codeLabel')} {puzzle.id}
                </p>
                {puzzle.createdBy && (
                  <span className="text-xs text-gray-400">
                    · {t('dashboard.createdBy')} {puzzle.createdBy}
                  </span>
                )}
                {!puzzle.isPublic && (
                  <span className="flex items-center gap-1 text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    <Lock size={10} aria-hidden /> {t('common.private')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap lg:justify-end shrink-0 w-full lg:w-auto">
            {activeMembers.length > 0 ? (
              <div className="flex items-center gap-1 bg-white dark:bg-gray-900 px-3 py-2 min-h-11 rounded-full shadow-sm border border-gray-100 dark:border-gray-800">
                {activeMembers.slice(0, 5).map((member) => (
                  <div
                    key={`${member.pseudo}-${member.lastSeen}`}
                    title={member.pseudo}
                    className="w-7 h-7 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold border-2 border-white -ml-1 first:ml-0"
                  >
                    {member.pseudo.charAt(0).toUpperCase()}
                  </div>
                ))}
                {activeMembers.length > 5 && (
                  <span className="text-xs text-gray-400 ml-1">+{activeMembers.length - 5}</span>
                )}
                <span className="text-xs text-gray-500 ml-1">{t('dashboard.online')}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 px-4 py-2 min-h-11 rounded-full shadow-sm border border-gray-100 dark:border-gray-800">
                <Users size={20} aria-hidden />
                <span className="text-sm font-medium">{t('dashboard.collaborative')}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 min-h-11 bg-indigo-600 text-white px-4 py-2.5 rounded-full shadow-sm hover:bg-indigo-700 active:bg-indigo-800 transition font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
              title={t('dashboard.share')}
              aria-label={t('dashboard.share')}
            >
              <Share2 size={16} aria-hidden />
              {copied ? t('dashboard.copied') : t('dashboard.share')}
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              className="flex items-center justify-center gap-2 min-h-11 bg-white dark:bg-gray-900 text-indigo-600 border border-indigo-200 dark:border-indigo-800 px-4 py-2.5 rounded-full shadow-sm hover:bg-indigo-50 active:bg-indigo-100/80 dark:hover:bg-indigo-950/50 dark:active:bg-indigo-950 transition font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label={t('dashboard.exportPng')}
            >
              <Download size={16} aria-hidden />
              {t('dashboard.exportPng')}
            </button>
            <div className="relative" ref={actionsRef}>
              <button
                type="button"
                onClick={() => setActionsOpen((o) => !o)}
                className={`inline-flex items-center justify-center min-h-11 min-w-11 rounded-full shadow-sm border transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${actionsOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 active:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800 dark:active:bg-gray-700'}`}
                aria-expanded={actionsOpen}
                aria-haspopup="true"
                title={t('nav.moreActions')}
                aria-label={t('nav.moreActions')}
              >
                <MoreVertical size={20} aria-hidden />
              </button>
              {actionsOpen && (
                <div
                  className="absolute right-0 mt-2 w-[min(calc(100vw-2rem),14rem)] sm:w-56 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl py-1 z-50 max-h-[min(50dvh,20rem)] overflow-y-auto overscroll-y-contain"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowSettings((s) => !s);
                      setActionsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 min-h-12 px-4 py-3 text-base sm:text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 text-left"
                  >
                    <Settings size={18} aria-hidden className="text-gray-500 dark:text-gray-400 shrink-0" />
                    {t('nav.puzzleSettings')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={readOnly}
                    onClick={() => {
                      if (!readOnly) {
                        setConfirmDelete(true);
                        setActionsOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 min-h-12 px-4 py-3 text-base sm:text-sm text-red-600 hover:bg-red-50 active:bg-red-100/80 dark:hover:bg-red-950/40 dark:active:bg-red-950/60 text-left disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Trash2 size={18} aria-hidden className="shrink-0" />
                    {t('nav.deletePuzzle')}
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>

          {confirmDelete && (
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
              <span className="text-sm text-red-700 font-medium">{t('dashboard.deleteConfirm')}</span>
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-red-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {t('dashboard.yes')}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-full text-sm font-bold border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition focus:outline-none focus-visible:ring-2"
              >
                {t('dashboard.no')}
              </button>
            </div>
          )}
        </header>

        {showSettings && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings size={18} aria-hidden /> {t('dashboard.settingsTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('dashboard.localeLabel')}</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
                  <button
                    type="button"
                    onClick={() => setLocale('fr')}
                    className={`px-4 py-2 text-sm font-medium transition ${locale === 'fr' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                  >
                    FR
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale('en')}
                    className={`px-4 py-2 text-sm font-medium transition ${locale === 'en' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                  >
                    EN
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 border-t border-gray-100 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readOnly}
                    onChange={(e) => handleSetReadOnly(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-800">{t('dashboard.readOnlyToggle')}</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-7">{t('dashboard.readOnlyHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('dashboard.visibilityLabel')}</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
                  <button
                    type="button"
                    onClick={() => handleUpdateVisibility(true)}
                    disabled={readOnly}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${puzzle.isPublic ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                  >
                    <Globe size={14} aria-hidden /> {t('common.public')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateVisibility(false)}
                    disabled={readOnly}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${!puzzle.isPublic ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800'}`}
                  >
                    <Lock size={14} aria-hidden /> {t('common.private')}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {puzzle.isPublic ? t('dashboard.visibilityPublicSearch') : t('dashboard.visibilityPrivateSearch')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('dashboard.passwordLabel')}</label>
                <div className="space-y-2">
                  {puzzle.passwordHash && (
                    <input
                      type="password"
                      placeholder={t('dashboard.currentPwPh')}
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      disabled={readOnly}
                    />
                  )}
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      placeholder={puzzle.passwordHash ? t('dashboard.newPwPh') : t('dashboard.setPwPh')}
                      className="w-full p-2 pr-8 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      disabled={readOnly}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 focus:outline-none focus-visible:ring-2 rounded"
                    >
                      {showNewPwd ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={readOnly}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-40"
                  >
                    {puzzle.passwordHash ? t('dashboard.changePw') : t('dashboard.setPw')}
                  </button>
                  {pwMessage && (
                    <p className={`text-xs font-medium ${pwMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                      {pwMessage.text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <h2 className="text-xl font-semibold">{t('dashboard.progressTitle')}</h2>
              <button
                type="button"
                onClick={() => setHelpOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 px-2 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                aria-expanded={helpOpen}
              >
                <CircleHelp size={16} aria-hidden />
                {t('dashboard.helpToggle')}
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{t('dashboard.progressViewHint')}</p>
            {helpOpen && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 whitespace-pre-line">
                {t('dashboard.helpBody')}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => handleSetInputMode('placed')}
                disabled={readOnly}
                className={`rounded-xl p-4 text-left border-2 transition disabled:opacity-50 ${inputMode === 'placed' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 dark:border-indigo-400' : 'border-gray-100 bg-gray-50 hover:border-indigo-200 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-indigo-700'}`}
                aria-pressed={inputMode === 'placed'}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">{t('dashboard.placed')}</p>
                <p className="text-3xl font-bold text-indigo-700">{puzzle.placedPieces.toLocaleString(numberLocale)}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('dashboard.onTotal')} {puzzle.totalPieces.toLocaleString(numberLocale)}
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleSetInputMode('remaining')}
                disabled={readOnly}
                className={`rounded-xl p-4 text-left border-2 transition disabled:opacity-50 ${inputMode === 'remaining' ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-500' : 'border-gray-100 bg-gray-50 hover:border-orange-200 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-orange-800'}`}
                aria-pressed={inputMode === 'remaining'}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-orange-800 mb-1">{t('dashboard.remaining')}</p>
                <p className="text-3xl font-bold text-orange-700">{remainingPieces.toLocaleString(numberLocale)}</p>
                <p className="text-xs text-gray-400 mt-1">{t('dashboard.toPlace')}</p>
              </button>
            </div>

            <ProgressChart
              history={puzzle.history}
              totalPieces={puzzle.totalPieces}
              metric={inputMode}
              label={inputMode === 'placed' ? t('dashboard.chartTitle') : t('dashboard.chartTitleRemaining')}
              emptyHint={t('dashboard.chartEmpty')}
              chartLocale={numberLocale}
              tableCaption={t('dashboard.chartTableCaption')}
              tableColTime={t('dashboard.chartColTime')}
              tableColValue={t('dashboard.chartColValue')}
              tableColAuthor={t('dashboard.chartColAuthor')}
            />

            <div className="flex mb-2 items-center justify-between flex-wrap gap-2">
              <span
                className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full ${
                  inputMode === 'placed' ? 'text-indigo-600 bg-indigo-50' : 'text-orange-700 bg-orange-50'
                }`}
              >
                {Math.round(progress)}% {t('dashboard.donePct')}
              </span>
              <span
                className={`text-xs font-semibold ${inputMode === 'placed' ? 'text-indigo-600' : 'text-orange-800'}`}
              >
                {inputMode === 'placed'
                  ? `${puzzle.placedPieces.toLocaleString(numberLocale)} / ${puzzle.totalPieces.toLocaleString(numberLocale)}`
                  : `${remainingPieces.toLocaleString(numberLocale)} / ${puzzle.totalPieces.toLocaleString(numberLocale)}`}{' '}
                <span className="text-gray-400 font-normal normal-case">
                  ({inputMode === 'placed' ? t('dashboard.progressFractionPlaced') : t('dashboard.progressFractionRemaining')})
                </span>
              </span>
            </div>
            <div
              className={`overflow-hidden h-4 mb-2 flex rounded ${inputMode === 'placed' ? 'bg-indigo-100' : 'bg-orange-100'}`}
              role="progressbar"
              aria-valuenow={inputMode === 'placed' ? puzzle.placedPieces : remainingPieces}
              aria-valuemin={0}
              aria-valuemax={puzzle.totalPieces}
              aria-valuetext={
                inputMode === 'placed'
                  ? `${puzzle.placedPieces} / ${puzzle.totalPieces} ${t('dashboard.progressFractionPlaced')}`
                  : `${remainingPieces} / ${puzzle.totalPieces} ${t('dashboard.progressFractionRemaining')}`
              }
            >
              {inputMode === 'placed' ? (
                <div
                  style={{ width: `${progress}%` }}
                  className="h-full min-w-0 flex flex-col justify-center bg-indigo-500 transition-all duration-500"
                />
              ) : (
                <div
                  style={{ width: `${remainingRatioPct}%` }}
                  className="h-full min-w-0 bg-orange-600 transition-all duration-500"
                />
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {puzzle.rows && puzzle.cols && (
                <span className="text-gray-400">
                  {t('dashboard.gridSize')} {puzzle.rows} × {puzzle.cols}
                </span>
              )}
            </p>

            {remoteConflict && (
              <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-sm text-orange-900 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <span>{t('dashboard.remoteConflict')}</span>
                <button
                  type="button"
                  onClick={adoptServerValue}
                  className="text-sm font-bold text-orange-800 underline hover:no-underline focus:outline-none focus-visible:ring-2 rounded px-1"
                >
                  {t('dashboard.adoptServer')}
                </button>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('dashboard.step')}</span>
                {[1, 5, 10, 25, 50, 100].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStep(s)}
                    disabled={readOnly}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition disabled:opacity-40 ${step === s ? (inputMode === 'placed' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-orange-500 text-white border-orange-500') : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700 dark:hover:border-gray-500'}`}
                    aria-pressed={step === s}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${inputMode === 'placed' ? 'border-indigo-200 bg-indigo-50' : 'border-orange-200 bg-orange-50'}`}>
                <button
                  type="button"
                  onClick={() => handleInputChange(displayedValue - step)}
                  disabled={readOnly || (inputMode === 'placed' ? newPieces <= 0 : newPieces >= puzzle.totalPieces)}
                  className={`w-14 h-14 rounded-xl text-2xl font-bold transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${inputMode === 'placed' ? 'bg-indigo-200 text-indigo-700 hover:bg-indigo-300 focus-visible:ring-indigo-500' : 'bg-orange-200 text-orange-700 hover:bg-orange-300 focus-visible:ring-orange-500'}`}
                  aria-label={t('dashboard.step')}
                >
                  −
                </button>

                <div className="flex-1 text-center">
                  <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                    {inputMode === 'placed' ? t('dashboard.piecesPlaced') : t('dashboard.piecesRemaining')}
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={puzzle.totalPieces}
                    value={displayedValue}
                    onChange={(e) => handleInputChange(parseInt(e.target.value, 10) || 0)}
                    disabled={readOnly}
                    className={`w-full text-center text-4xl font-black bg-transparent border-b-2 outline-none pb-1 transition disabled:opacity-50 focus-visible:ring-2 rounded ${inputMode === 'placed' ? 'text-indigo-700 border-indigo-300 focus:border-indigo-600 focus-visible:ring-indigo-400' : 'text-orange-600 border-orange-300 focus:border-orange-500 focus-visible:ring-orange-400'}`}
                    aria-label={inputMode === 'placed' ? t('dashboard.piecesPlaced') : t('dashboard.piecesRemaining')}
                  />
                  {displayedValue !== (inputMode === 'placed' ? puzzle.placedPieces : remainingPieces) && (
                    <p className={`text-xs mt-1 font-semibold ${inputMode === 'placed' ? 'text-indigo-600' : 'text-orange-800'}`}>
                      {displayedValue > (inputMode === 'placed' ? puzzle.placedPieces : remainingPieces) ? '\u25B2' : '\u25BC'}{' '}
                      {Math.abs(displayedValue - (inputMode === 'placed' ? puzzle.placedPieces : remainingPieces)).toLocaleString(numberLocale)}{' '}
                      {t('dashboard.vsNow')}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleInputChange(displayedValue + step)}
                  disabled={readOnly || (inputMode === 'placed' ? newPieces >= puzzle.totalPieces : newPieces <= 0)}
                  className={`w-14 h-14 rounded-xl text-2xl font-bold transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${inputMode === 'placed' ? 'bg-indigo-500 text-white hover:bg-indigo-600 focus-visible:ring-indigo-500' : 'bg-orange-400 text-white hover:bg-orange-500 focus-visible:ring-orange-500'}`}
                  aria-label={t('dashboard.step')}
                >
                  +
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handlePiecesUpdate}
                  disabled={readOnly || newPieces === puzzle.placedPieces}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {t('dashboard.save')}
                </button>
                <button
                  type="button"
                  onClick={() => !readOnly && setFlagConfirm(true)}
                  disabled={readOnly}
                  title={t('dashboard.flagTitle')}
                  aria-label={t('dashboard.flagTitle')}
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 rounded-xl transition shadow-sm font-bold disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
                >
                  <Flag size={20} aria-hidden />
                </button>
              </div>

              {flagConfirm && (
                <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm font-semibold text-yellow-800 mb-1 flex items-center gap-2">
                    <Flag size={14} aria-hidden /> {t('dashboard.flagAsk')}
                  </p>
                  <p className="text-xs text-yellow-800 mb-3">
                    {t('dashboard.flagDetail')}{' '}
                    {t('dashboard.flagStats')
                      .replace('{placed}', puzzle.placedPieces.toLocaleString(numberLocale))
                      .replace('{remaining}', remainingPieces.toLocaleString(numberLocale))
                      .replace('{pct}', String(Math.round(progress)))}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const name = `\u{1F6A9} ${Math.round(progress)}% — ${puzzle.placedPieces.toLocaleString(numberLocale)}`;
                        await addCheckpoint(puzzle.id, name, pseudo || undefined);
                        setFlagConfirm(false);
                      }}
                      className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 py-2 rounded-lg text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600"
                    >
                      {t('common.confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlagConfirm(false)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2"
                    >
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {lastHistory && (
                <p className="text-xs text-gray-400 mt-2">
                  {t('dashboard.lastActivity')}
                  {lastHistory.pseudo && (
                    <>
                      {' '}
                      ({t('dashboard.by')} <span className="font-medium text-indigo-600">{lastHistory.pseudo}</span>)
                    </>
                  )}
                  :{' '}
                  {formatDistanceToNow(new Date(lastHistory.timestamp), { addSuffix: true, locale: dateLocale })}
                </p>
              )}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => {
                  setGridRows(puzzle.rows ?? 0);
                  setGridCols(puzzle.cols ?? 0);
                  setShowGridEditor(!showGridEditor);
                }}
                disabled={readOnly}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 rounded"
              >
                <Grid size={12} aria-hidden />
                {showGridEditor ? t('dashboard.gridCancel') : t('dashboard.adjustGrid')}
              </button>
              {showGridEditor && (
                <div className="mt-3 flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200 flex-wrap">
                  <div className="flex-1 min-w-[100px]">
                    <label className="block text-xs text-gray-500 mb-1">{t('home.rows')}</label>
                    <input
                      type="number"
                      min={1}
                      value={gridRows}
                      onChange={(e) => setGridRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full p-2 border rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                  <span className="text-gray-400 text-xl mt-4">×</span>
                  <div className="flex-1 min-w-[100px]">
                    <label className="block text-xs text-gray-500 mb-1">{t('home.cols')}</label>
                    <input
                      type="number"
                      min={1}
                      value={gridCols}
                      onChange={(e) => setGridCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full p-2 border rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                  <div className="flex-1 mt-4 min-w-[80px]">
                    <div className="text-center text-sm font-bold text-indigo-700 bg-indigo-50 p-2 rounded-lg">
                      = {(gridRows * gridCols).toLocaleString(numberLocale)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGridUpdate}
                    className="mt-4 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <CheckCircle className="mr-2" size={20} aria-hidden /> {t('dashboard.checkpointsTitle')}
              </h2>
              <button
                type="button"
                onClick={handleUncheckAll}
                disabled={readOnly || puzzle.checkpoints.every((c) => !c.completed)}
                className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 disabled:opacity-40 focus:outline-none focus-visible:ring-2"
              >
                {t('dashboard.uncheckAll')}
              </button>
            </div>

            <div className="mb-6 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('dashboard.checkpointQuickAdd')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{t('dashboard.checkpointQuickAddHint')}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  {t('dashboard.checkpointFromProgress')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {checkpointSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handlePresetCheckpoint(s)}
                      disabled={readOnly}
                      className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 max-w-full text-left break-words"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  {t('dashboard.checkpointPresets')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {checkpointPresets.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handlePresetCheckpoint(label)}
                      disabled={readOnly}
                      className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 max-w-full text-left break-words"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200/80 dark:border-gray-600/80">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  {t('dashboard.checkpointCustom')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t('dashboard.newCheckpointPh')}
                    value={newCheckpointName}
                    onChange={(e) => setNewCheckpointName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCheckpoint()}
                    disabled={readOnly}
                    className="flex-1 min-w-0 p-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-400 outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleAddCheckpoint}
                    disabled={readOnly || !newCheckpointName.trim()}
                    className="shrink-0 px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-sm font-semibold"
                    title={t('dashboard.addCheckpoint')}
                    aria-label={t('dashboard.addCheckpoint')}
                  >
                    <Plus size={18} aria-hidden className="sm:hidden" />
                    <span className="hidden sm:inline">{t('dashboard.addCheckpoint')}</span>
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
              {t('dashboard.checkpointsList')}
            </p>
            {puzzle.checkpoints.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">{t('dashboard.checkpointsEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {puzzle.checkpoints.map((cp) => (
                  <div
                    key={cp.id}
                    role="button"
                    tabIndex={readOnly ? -1 : 0}
                    className={`flex items-center p-3 rounded-xl border transition ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${cp.completed ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-600'}`}
                    onClick={() => !readOnly && toggleCheckpoint(puzzle.id, cp.id, cp.completed)}
                    onKeyDown={(e) => {
                      if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        toggleCheckpoint(puzzle.id, cp.id, cp.completed);
                      }
                    }}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center transition-colors shrink-0 ${cp.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900'}`}
                    >
                      {cp.completed && <CheckCircle size={14} aria-hidden />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`font-medium text-sm break-words ${cp.completed ? 'text-green-800 dark:text-green-200 line-through' : 'text-gray-700 dark:text-gray-200'}`}
                      >
                        {cp.name}
                      </span>
                      {cp.createdBy && <p className="text-xs text-gray-400 dark:text-gray-500">{cp.createdBy}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <ImageIcon className="mr-2" size={20} aria-hidden /> {t('dashboard.photosTitle')}
              </h2>
              <button
                type="button"
                onClick={() => !readOnly && fileInputRef.current?.click()}
                disabled={readOnly}
                className="bg-indigo-100 text-indigo-600 p-2 rounded-full hover:bg-indigo-200 transition disabled:opacity-40 focus:outline-none focus-visible:ring-2"
                aria-label={t('dashboard.addPhoto')}
              >
                <Camera size={20} aria-hidden />
              </button>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <p className="text-xs text-gray-400 mb-3">{t('dashboard.photoHelp')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {puzzle.photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative rounded-lg overflow-hidden border border-gray-100 group"
                  draggable={!readOnly}
                  onDragStart={() => !readOnly && setDragPhotoId(photo.id)}
                  onDragEnd={() => setDragPhotoId(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handlePhotoDropReorder(photo.id);
                  }}
                >
                  <div className="aspect-square relative">
                    <img
                      src={photo.data}
                      alt={photo.caption || t('dashboard.photoAlt')}
                      className="w-full h-full object-cover transition-transform duration-300"
                      style={{ transform: `rotate(${photo.rotation}deg)` }}
                    />
                    <div className="absolute top-1 left-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="bg-black/50 text-white p-1 rounded cursor-grab" title={t('dashboard.photoHelp')}>
                        <GripVertical size={14} aria-hidden />
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => movePhoto(photo.id, -1)}
                        disabled={readOnly || idx === 0}
                        className="bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 p-2 rounded-full hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-30"
                        aria-label={t('dashboard.moveLeft')}
                      >
                        <ChevronLeft size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePhoto(puzzle.id, photo.id, (photo.rotation + 90) % 360)}
                        disabled={readOnly}
                        className="bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 p-2 rounded-full hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-30"
                        aria-label={t('dashboard.rotate')}
                      >
                        <RotateCw size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(photo.id, 1)}
                        disabled={readOnly || idx >= puzzle.photos.length - 1}
                        className="bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 p-2 rounded-full hover:bg-white dark:hover:bg-gray-800 transition disabled:opacity-30"
                        aria-label={t('dashboard.moveRight')}
                      >
                        <ChevronRight size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => !readOnly && deletePhoto(puzzle.id, photo.id)}
                        disabled={readOnly}
                        className="bg-red-500/90 text-white p-2 rounded-full hover:bg-red-600 transition disabled:opacity-30"
                        aria-label={t('dashboard.deletePhoto')}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  </div>
                  <input
                    key={`${photo.id}-${photo.caption ?? ''}`}
                    type="text"
                    placeholder={t('dashboard.photoCaptionPh')}
                    defaultValue={photo.caption ?? ''}
                    disabled={readOnly}
                    onBlur={(e) => {
                      const v = e.target.value.trim().slice(0, 500);
                      const prev = (photo.caption ?? '').trim();
                      if (v !== prev && !readOnly) {
                        updatePhoto(puzzle.id, photo.id, { caption: v.length ? v : null }).catch(console.error);
                      }
                    }}
                    className="w-full text-xs p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/80 outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-1 focus:ring-indigo-300 text-gray-800 dark:text-gray-200 disabled:opacity-50"
                  />
                  {photo.addedAt && (
                    <p className="text-[10px] text-gray-400 px-2 pb-1">
                      {new Date(photo.addedAt).toLocaleString(numberLocale, {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              ))}
              {puzzle.photos.length === 0 && (
                <div className="col-span-3 text-center text-gray-300 py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <ImageIcon className="mx-auto mb-2 opacity-50" size={32} aria-hidden />
                  <p className="text-sm">{t('dashboard.noPhotos')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
