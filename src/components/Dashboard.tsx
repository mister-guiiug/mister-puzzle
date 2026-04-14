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
  History,
  FileSpreadsheet,
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
  deleteCheckpoint,
  reorderPhotos,
  updatePhoto,
  updateHistoryEntry,
  deleteHistoryEntry,
} from '../hooks/useSocket';
import ErrorModal from './ErrorModal';
import { getSessionId, getInputMode, setInputModePreference } from '../utils/pseudo';
import { getReadOnlyMode, setReadOnlyMode } from '../utils/prefs';
import { useI18n } from '../i18n/I18nContext';
import { ProgressChart } from './ProgressChart';
import { exportProgressPng } from '../utils/exportProgressCard';
import { reportError } from '../utils/reportError';
import { notifySaveSuccess } from '../utils/haptic';
import { downloadHistoryCsv, downloadHistoryJson } from '../utils/exportHistory';

const MEMBER_TTL_MS = 5 * 60 * 1000;
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
/** Limite d’images par salle (allège la base temps réel). */
const MAX_ROOM_PHOTOS = 32;
const MILESTONE_LEVELS = [25, 50, 75, 100] as const;
/** Délai après le dernier clic sur ± / pas rapides avant envoi Firebase (évite une entrée d’historique par clic). */
const PIECE_AUTOSAVE_DEBOUNCE_MS = 420;

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
  const [infoBanner, setInfoBanner] = useState<string | null>(null);
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

  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [historyInput, setHistoryInput] = useState<number>(0);
  const [deletingHistoryId, setDeletingHistoryId] = useState<string | null>(null);

  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [liveProgressAnnounce, setLiveProgressAnnounce] = useState('');
  const lastAnnouncedPlacedRef = useRef(puzzle.placedPieces);
  const prevRoomForLiveRef = useRef(puzzle.id);

  useEffect(() => {
    if (prevRoomForLiveRef.current !== puzzle.id) {
      prevRoomForLiveRef.current = puzzle.id;
      lastAnnouncedPlacedRef.current = puzzle.placedPieces;
      return;
    }
    if (lastAnnouncedPlacedRef.current === puzzle.placedPieces) return;
    lastAnnouncedPlacedRef.current = puzzle.placedPieces;
    const rem = puzzle.totalPieces - puzzle.placedPieces;
    const pct = puzzle.totalPieces > 0 ? Math.round((puzzle.placedPieces / puzzle.totalPieces) * 100) : 0;
    setLiveProgressAnnounce(
      t('dashboard.liveProgressAnnounced')
        .replace('{placed}', puzzle.placedPieces.toLocaleString(numberLocale))
        .replace('{remaining}', rem.toLocaleString(numberLocale))
        .replace('{pct}', String(pct)),
    );
    const tid = window.setTimeout(() => setLiveProgressAnnounce(''), 1600);
    return () => window.clearTimeout(tid);
  }, [puzzle.id, puzzle.placedPieces, puzzle.totalPieces, numberLocale, t]);

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

  const isOrganizer = useMemo(
    () => Boolean(puzzle.createdBy && pseudo.trim() && pseudo.trim() === puzzle.createdBy.trim()),
    [puzzle.createdBy, pseudo],
  );

  const maxPlacedEver = useMemo(() => {
    const fromHist = puzzle.history.reduce((m, h) => Math.max(m, h.placedPieces), 0);
    return Math.max(fromHist, puzzle.placedPieces);
  }, [puzzle.history, puzzle.placedPieces]);

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

  const activityLogDescending = useMemo(
    () => [...puzzle.history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 60),
    [puzzle.history],
  );

  const historyExportBase = useMemo(
    () => puzzle.name.replace(/[^a-zA-ZÀ-ÿ0-9\-_\s]/g, '').trim().slice(0, 48).replace(/\s+/g, '-') || puzzle.id,
    [puzzle.name, puzzle.id],
  );

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
      notifySaveSuccess();
    } catch (err) {
      setError(t('dashboard.errorUpdatePieces'));
      reportError('handlePiecesUpdate', err, { puzzleId: puzzle.id });
      console.error(err);
    }
  };

  const handlePiecesUpdateRef = useRef(handlePiecesUpdate);
  handlePiecesUpdateRef.current = handlePiecesUpdate;
  const dashKeyRef = useRef({ puzzle, readOnly, newPieces });
  dashKeyRef.current = { puzzle, readOnly, newPieces };

  const pieceSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleDebouncedPieceSave = () => {
    if (readOnly) return;
    if (pieceSaveDebounceRef.current) clearTimeout(pieceSaveDebounceRef.current);
    pieceSaveDebounceRef.current = window.setTimeout(() => {
      pieceSaveDebounceRef.current = null;
      const { readOnly: ro, newPieces: np, puzzle: pz } = dashKeyRef.current;
      if (ro || np === pz.placedPieces) return;
      void handlePiecesUpdateRef.current();
    }, PIECE_AUTOSAVE_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (pieceSaveDebounceRef.current) {
        clearTimeout(pieceSaveDebounceRef.current);
        pieceSaveDebounceRef.current = null;
      }
    };
  }, [puzzle.id]);

  useEffect(() => {
    if (readOnly && pieceSaveDebounceRef.current) {
      clearTimeout(pieceSaveDebounceRef.current);
      pieceSaveDebounceRef.current = null;
    }
  }, [readOnly]);

  /** deltaPlaced : +10 = dix pièces placées de plus (en mode « restantes », le compteur affiché diminue). */
  const bumpPlacedBy = (deltaPlaced: number) => {
    if (readOnly) return;
    if (inputMode === 'placed') {
      handleInputChange(displayedValue + deltaPlaced);
    } else {
      handleInputChange(displayedValue - deltaPlaced);
    }
    scheduleDebouncedPieceSave();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target;
      if (el instanceof HTMLElement) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) return;
      }
      const { puzzle: pz, readOnly: ro, newPieces: np } = dashKeyRef.current;
      if (e.key === 'Escape') {
        setFlagConfirm(false);
        setConfirmDelete(false);
        setHelpOpen(false);
        setActionsOpen(false);
        setEditingName(false);
        setNameInput(pz.name);
        setEditingHistoryId(null);
        setDeletingHistoryId(null);
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setHelpOpen((o) => !o);
      }
      if (e.key === 's' || e.key === 'S') {
        if (!ro && np !== pz.placedPieces) {
          e.preventDefault();
          void handlePiecesUpdateRef.current();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleUpdateHistoryEntry = async (entryId: string, pieces: number) => {
    if (readOnly) return;
    try {
      await updateHistoryEntry(puzzle.id, entryId, pieces);
      setEditingHistoryId(null);
    } catch (err) {
      setError(t('dashboard.errorUpdatePieces'));
      console.error(err);
    }
  };

  const handleDeleteHistoryEntry = async (entryId: string) => {
    if (readOnly) return;
    try {
      await deleteHistoryEntry(puzzle.id, entryId);
      setDeletingHistoryId(null);
    } catch (err) {
      setError(t('dashboard.errorUpdatePieces'));
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

  const handleDeleteCheckpoint = async (checkpointId: string) => {
    if (readOnly) return;
    try {
      await deleteCheckpoint(puzzle.id, checkpointId);
    } catch (err) {
      setError(t('dashboard.errorCheckpointDelete'));
      reportError('handleDeleteCheckpoint', err, { puzzleId: puzzle.id, checkpointId });
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
    const base = `${window.location.origin}${window.location.pathname}`;
    const inviteUrl = `${base}?join=${encodeURIComponent(puzzle.id)}`;
    const hashUrl = `${base}#${puzzle.id}`;
    const text = `${t('dashboard.shareText')} "${puzzle.name}" ${t('dashboard.shareOn')} ${puzzle.id}\n${t('dashboard.shareInvite')}: ${inviteUrl}\n${t('dashboard.shareDirect')}: ${hashUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: t('common.appName'), text, url: inviteUrl });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(text);
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
        const toDrop = Math.max(0, puzzle.photos.length - MAX_ROOM_PHOTOS + 1);
        const idsToRemove = toDrop > 0 ? puzzle.photos.slice(0, toDrop).map((p) => p.id) : [];
        for (const id of idsToRemove) {
          await deletePhoto(puzzle.id, id);
        }
        if (idsToRemove.length > 0) {
          setInfoBanner(
            t('dashboard.photoTrimmedHint')
              .replace('{n}', String(idsToRemove.length))
              .replace('{max}', String(MAX_ROOM_PHOTOS)),
          );
          window.setTimeout(() => setInfoBanner(null), 6000);
        }
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
    <div className="min-h-dvh bg-canvas text-fg p-4 md:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]">
      <ErrorModal message={error} onClose={() => setError(null)} />

      {infoBanner && (
        <div
          className="fixed bottom-4 left-1/2 z-[90] max-w-md -translate-x-1/2 rounded-xl border border-primary-border bg-primary-soft px-4 py-3 text-sm font-medium text-primary-strong shadow-lg"
          role="status"
        >
          {infoBanner}
        </div>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveProgressAnnounce}
      </p>

      <div className="max-w-4xl mx-auto">
        {readOnly && (
          <div
            className="mb-4 p-3 rounded-xl bg-warning-soft border border-warning-border text-warning-fg text-sm font-medium text-center"
            role="status"
          >
            {t('dashboard.readOnlyBanner')}
          </div>
        )}

        {isOrganizer && !readOnly && (
          <div
            className="mb-4 p-3 rounded-xl bg-primary-soft border border-primary-border text-primary-strong text-sm text-center leading-relaxed"
            role="status"
          >
            {t('dashboard.organizerBanner')}
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
                    className="text-2xl font-bold text-fg-heading border-b-2 border-primary-ring bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-primary-ring rounded"
                    autoFocus
                    maxLength={100}
                    readOnly={readOnly}
                    aria-label={t('dashboard.rename')}
                  />
                  <button
                    type="button"
                    onClick={handleRename}
                    className="p-1 text-success hover:text-success-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-success-ring rounded"
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
                    className="p-1 text-fg-faint hover:text-fg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-border-ui-strong rounded"
                    title={t('common.cancel')}
                    aria-label={t('common.cancel')}
                  >
                    <XIcon size={18} aria-hidden />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name">
                  <h1 className="text-3xl font-bold text-fg-heading">{puzzle.name}</h1>
                  <button
                    type="button"
                    onClick={() => !readOnly && setEditingName(true)}
                    disabled={readOnly}
                    className="p-1 text-fg-faint hover:text-primary-muted transition opacity-0 group-hover/name:opacity-100 disabled:opacity-0 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring rounded"
                    title={t('dashboard.rename')}
                    aria-label={t('dashboard.rename')}
                  >
                    <Pencil size={16} aria-hidden />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="text-primary font-mono font-bold text-sm">
                  {t('dashboard.codeLabel')} {puzzle.id}
                </p>
                {puzzle.createdBy && (
                  <span className="text-xs text-fg-faint">
                    · {t('dashboard.createdBy')} {puzzle.createdBy}
                  </span>
                )}
                {!puzzle.isPublic && (
                  <span className="flex items-center gap-1 text-xs text-primary-muted bg-primary-soft px-2 py-0.5 rounded-full border border-primary-border">
                    <Lock size={10} aria-hidden /> {t('common.private')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap lg:justify-end shrink-0 w-full lg:w-auto">
            {activeMembers.length > 0 ? (
              <div className="flex items-center gap-1 bg-surface px-3 py-2 min-h-11 rounded-full shadow-sm border border-divide">
                {activeMembers.slice(0, 5).map((member) => (
                  <div
                    key={`${member.pseudo}-${member.lastSeen}`}
                    title={member.pseudo}
                    className="w-7 h-7 rounded-full bg-primary-bar text-white text-xs flex items-center justify-center font-bold border-2 border-white -ml-1 first:ml-0"
                  >
                    {member.pseudo.charAt(0).toUpperCase()}
                  </div>
                ))}
                {activeMembers.length > 5 && (
                  <span className="text-xs text-fg-faint ml-1">+{activeMembers.length - 5}</span>
                )}
                <span className="text-xs text-fg-muted ml-1">{t('dashboard.online')}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-fg-muted bg-surface px-4 py-2 min-h-11 rounded-full shadow-sm border border-divide">
                <Users size={20} aria-hidden />
                <span className="text-sm font-medium">{t('dashboard.collaborative')}</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 min-h-11 bg-primary-fill text-white px-4 py-2.5 rounded-full shadow-sm hover:bg-primary-fill-hover active:bg-primary-fill-active transition font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-ring"
              title={t('dashboard.share')}
              aria-label={t('dashboard.share')}
            >
              <Share2 size={16} aria-hidden />
              {copied ? t('dashboard.copied') : t('dashboard.share')}
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              className="flex items-center justify-center gap-2 min-h-11 bg-surface text-primary border border-primary-border px-4 py-2.5 rounded-full shadow-sm hover:bg-primary-soft-hover active:bg-primary-track/80 dark:hover:bg-primary-soft dark:active:bg-primary-soft transition font-medium text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
              aria-label={t('dashboard.exportPng')}
            >
              <Download size={16} aria-hidden />
              {t('dashboard.exportPng')}
            </button>
            <div className="relative" ref={actionsRef}>
              <button
                type="button"
                onClick={() => setActionsOpen((o) => !o)}
                className={`inline-flex items-center justify-center min-h-11 min-w-11 rounded-full shadow-sm border transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring ${actionsOpen ? 'bg-primary-fill text-white border-primary-fill' : 'bg-surface text-fg-muted border-border-ui hover:bg-surface-muted active:bg-surface-muted dark:bg-surface dark:text-fg-faint dark:border-border-ui-strong dark:hover:bg-surface-muted dark:active:bg-surface-muted'}`}
                aria-expanded={actionsOpen}
                aria-haspopup="true"
                title={t('nav.moreActions')}
                aria-label={t('nav.moreActions')}
              >
                <MoreVertical size={20} aria-hidden />
              </button>
              {actionsOpen && (
                <div
                  className="absolute right-0 mt-2 w-[min(calc(100vw-2rem),14rem)] sm:w-56 rounded-xl border border-divide bg-surface shadow-xl py-1 z-50 max-h-[min(50dvh,20rem)] overflow-y-auto overscroll-y-contain"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowSettings((s) => !s);
                      setActionsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 min-h-12 px-4 py-3 text-base sm:text-sm text-fg-heading hover:bg-surface-muted active:bg-surface-muted dark:hover:bg-surface-muted dark:active:bg-surface-muted text-left"
                  >
                    <Settings size={18} aria-hidden className="text-fg-muted shrink-0" />
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
                    className="w-full flex items-center gap-3 min-h-12 px-4 py-3 text-base sm:text-sm text-danger-text hover:bg-danger-soft-hover active:bg-danger-soft-active text-left disabled:opacity-40 disabled:pointer-events-none"
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
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-danger-soft border border-danger-soft-border">
              <span className="text-sm text-danger-text font-medium">{t('dashboard.deleteConfirm')}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 bg-danger-fill text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-danger-fill-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-danger-ring"
                >
                  <Check size={16} aria-hidden />
                  {t('dashboard.yes')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex items-center gap-1.5 bg-surface text-fg px-4 py-2 rounded-full text-sm font-bold border border-border-ui-strong hover:bg-surface-muted dark:hover:bg-surface-muted transition focus:outline-none focus-visible:ring-2"
                >
                  <XIcon size={16} aria-hidden />
                  {t('dashboard.no')}
                </button>
              </div>
            </div>
          )}
        </header>

        {showSettings && (
          <div className="bg-surface rounded-2xl shadow-sm border border-divide p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings size={18} aria-hidden /> {t('dashboard.settingsTitle')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">{t('dashboard.localeLabel')}</label>
                <div className="flex rounded-lg overflow-hidden border border-border-ui w-fit">
                  <button
                    type="button"
                    onClick={() => setLocale('fr')}
                    className={`px-4 py-2 text-sm font-medium transition ${locale === 'fr' ? 'bg-primary-fill text-white' : 'bg-surface text-fg-muted hover:bg-surface-muted dark:text-fg-muted dark:hover:bg-surface-muted'}`}
                  >
                    FR
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocale('en')}
                    className={`px-4 py-2 text-sm font-medium transition ${locale === 'en' ? 'bg-primary-fill text-white' : 'bg-surface text-fg-muted hover:bg-surface-muted dark:text-fg-muted dark:hover:bg-surface-muted'}`}
                  >
                    EN
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 border-t border-divide pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={readOnly}
                    onChange={(e) => handleSetReadOnly(e.target.checked)}
                    className="rounded border-border-ui-strong text-primary focus:ring-primary-ring w-4 h-4"
                  />
                  <span className="text-sm font-medium text-fg-heading">{t('dashboard.readOnlyToggle')}</span>
                </label>
                <p className="text-xs text-fg-faint mt-1 ml-7">{t('dashboard.readOnlyHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">{t('dashboard.visibilityLabel')}</label>
                <div className="flex rounded-lg overflow-hidden border border-border-ui w-fit">
                  <button
                    type="button"
                    onClick={() => handleUpdateVisibility(true)}
                    disabled={readOnly}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${puzzle.isPublic ? 'bg-success-fill text-white' : 'bg-surface text-fg-muted hover:bg-surface-muted dark:text-fg-muted dark:hover:bg-surface-muted'}`}
                  >
                    <Globe size={14} aria-hidden /> {t('common.public')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateVisibility(false)}
                    disabled={readOnly}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition disabled:opacity-40 ${!puzzle.isPublic ? 'bg-primary-fill text-white' : 'bg-surface text-fg-muted hover:bg-surface-muted dark:text-fg-muted dark:hover:bg-surface-muted'}`}
                  >
                    <Lock size={14} aria-hidden /> {t('common.private')}
                  </button>
                </div>
                <p className="text-xs text-fg-faint mt-1">
                  {puzzle.isPublic ? t('dashboard.visibilityPublicSearch') : t('dashboard.visibilityPrivateSearch')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-muted mb-2">{t('dashboard.passwordLabel')}</label>
                <div className="space-y-2">
                  {puzzle.passwordHash && (
                    <input
                      type="password"
                      placeholder={t('dashboard.currentPwPh')}
                      className="w-full p-2 border border-border-ui rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-ring"
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      disabled={readOnly}
                    />
                  )}
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      placeholder={puzzle.passwordHash ? t('dashboard.newPwPh') : t('dashboard.setPwPh')}
                      className="w-full p-2 pr-8 border border-border-ui rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-ring"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      disabled={readOnly}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-faint focus:outline-none focus-visible:ring-2 rounded"
                    >
                      {showNewPwd ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={readOnly}
                    className="bg-primary-fill text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-primary-fill-hover transition disabled:opacity-40"
                  >
                    {puzzle.passwordHash ? t('dashboard.changePw') : t('dashboard.setPw')}
                  </button>
                  {pwMessage && (
                    <p className={`text-xs font-medium ${pwMessage.type === 'error' ? 'text-danger-text' : 'text-success-fill'}`}>
                      {pwMessage.text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 mb-8">
          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-divide">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
              <h2 className="text-xl font-semibold">{t('dashboard.progressTitle')}</h2>
              <button
                type="button"
                onClick={() => setHelpOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-strong px-2 py-1.5 rounded-lg border border-primary-border-muted hover:bg-primary-soft-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
                aria-expanded={helpOpen}
              >
                <CircleHelp size={16} aria-hidden />
                {t('dashboard.helpToggle')}
              </button>
            </div>
            <p className="text-xs text-fg-faint mb-2">{t('dashboard.progressViewHint')}</p>
            <p className="text-xs text-fg-faint mb-4">{t('dashboard.keyboardShortcutsHint')}</p>
            {puzzle.totalPieces > 0 && (
              <div className="mb-4 rounded-xl border border-divide bg-surface-muted/50 p-3 dark:bg-surface-muted/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
                  {t('dashboard.milestonesTitle')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {MILESTONE_LEVELS.map((lev) => {
                    const reached = (maxPlacedEver / puzzle.totalPieces) * 100 >= lev - 1e-6;
                    return (
                      <span
                        key={lev}
                        className={`rounded-full px-2.5 py-1 text-xs font-bold border ${
                          reached
                            ? 'border-success-soft-border bg-success-soft text-success-on-soft'
                            : 'border-border-ui bg-surface text-fg-faint'
                        }`}
                      >
                        {t('dashboard.milestonePct').replace('{pct}', String(lev))}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {helpOpen && (
              <p className="text-sm text-fg-muted mb-4 p-3 rounded-xl bg-surface-muted/60 border border-divide whitespace-pre-line">
                {t('dashboard.helpBody')}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => handleSetInputMode('placed')}
                disabled={readOnly}
                className={`rounded-xl p-4 text-left border-2 transition disabled:opacity-50 ${inputMode === 'placed' ? 'border-primary-muted bg-primary-soft dark:border-primary-hover' : 'border-divide bg-surface-muted hover:border-primary-border dark:border-border-ui-strong dark:bg-surface-muted/50 dark:hover:border-primary-muted'}`}
                aria-pressed={inputMode === 'placed'}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-primary-muted mb-1">{t('dashboard.placed')}</p>
                <p className="text-3xl font-bold text-primary-strong">{puzzle.placedPieces.toLocaleString(numberLocale)}</p>
                <p className="text-xs text-fg-faint mt-1">
                  {t('dashboard.onTotal')} {puzzle.totalPieces.toLocaleString(numberLocale)}
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleSetInputMode('remaining')}
                disabled={readOnly}
                className={`rounded-xl p-4 text-left border-2 transition disabled:opacity-50 ${inputMode === 'remaining' ? 'border-warm-muted bg-warm-soft dark:border-warm-fill' : 'border-divide bg-surface-muted hover:border-warm-border dark:border-border-ui-strong dark:bg-surface-muted/50 dark:hover:border-warm-strong'}`}
                aria-pressed={inputMode === 'remaining'}
              >
                <p className="text-xs font-bold uppercase tracking-wider text-warm-strong mb-1">{t('dashboard.remaining')}</p>
                <p className="text-3xl font-bold text-warm">{remainingPieces.toLocaleString(numberLocale)}</p>
                <p className="text-xs text-fg-faint mt-1">{t('dashboard.toPlace')}</p>
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
                  inputMode === 'placed' ? 'text-primary bg-primary-soft' : 'text-warm bg-warm-soft'
                }`}
              >
                {Math.round(progress)}% {t('dashboard.donePct')}
              </span>
              <span
                className={`text-xs font-semibold ${inputMode === 'placed' ? 'text-primary' : 'text-warm-strong'}`}
              >
                {inputMode === 'placed'
                  ? `${puzzle.placedPieces.toLocaleString(numberLocale)} / ${puzzle.totalPieces.toLocaleString(numberLocale)}`
                  : `${remainingPieces.toLocaleString(numberLocale)} / ${puzzle.totalPieces.toLocaleString(numberLocale)}`}{' '}
                <span className="text-fg-faint font-normal normal-case">
                  ({inputMode === 'placed' ? t('dashboard.progressFractionPlaced') : t('dashboard.progressFractionRemaining')})
                </span>
              </span>
            </div>
            <div
              className={`overflow-hidden h-4 mb-2 flex rounded ${inputMode === 'placed' ? 'bg-primary-track' : 'bg-warm-track'}`}
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
                  className="h-full min-w-0 flex flex-col justify-center bg-primary-bar transition-all duration-500"
                />
              ) : (
                <div
                  style={{ width: `${remainingRatioPct}%` }}
                  className="h-full min-w-0 bg-warm-bar transition-all duration-500"
                />
              )}
            </div>
            <p className="text-sm text-fg-muted mb-4">
              {puzzle.rows && puzzle.cols && (
                <span className="text-fg-faint">
                  {t('dashboard.gridSize')} {puzzle.rows} × {puzzle.cols}
                </span>
              )}
            </p>

            {remoteConflict && (
              <div className="mb-4 p-3 rounded-xl bg-warm-soft border border-warm-border text-sm text-warm-strong flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <span>{t('dashboard.remoteConflict')}</span>
                <button
                  type="button"
                  onClick={adoptServerValue}
                  className="text-sm font-bold text-warm-strong underline hover:no-underline focus:outline-none focus-visible:ring-2 rounded px-1"
                >
                  {t('dashboard.adoptServer')}
                </button>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-fg-faint font-semibold uppercase tracking-wider">{t('dashboard.step')}</span>
                {[1, 5, 10, 25, 50, 100].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStep(s)}
                    disabled={readOnly}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition disabled:opacity-40 ${step === s ? (inputMode === 'placed' ? 'bg-primary-fill text-white border-primary-fill' : 'bg-warm-fill text-white border-warm-fill') : 'bg-surface text-fg-muted border-border-ui hover:border-border-ui-strong dark:bg-surface dark:text-fg-muted dark:border-border-ui-strong dark:hover:border-fg-faint'}`}
                    aria-pressed={step === s}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-fg-muted">{t('dashboard.quickBump')}</span>
                {([-10, -1, 1, 10] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => bumpPlacedBy(d)}
                    disabled={readOnly}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 ${
                      inputMode === 'placed'
                        ? 'border-primary-border bg-surface text-primary-strong hover:bg-primary-soft-hover dark:border-primary-border dark:bg-surface dark:text-primary-hover dark:hover:bg-primary-soft-hover'
                        : 'border-warm-border bg-surface text-warm-strong hover:bg-warm-soft-hover dark:border-warm-border dark:bg-surface dark:text-warm-strong dark:hover:bg-warm-soft-hover'
                    }`}
                  >
                    {d > 0 ? `+${d}` : `${d}`}
                  </button>
                ))}
              </div>

              <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${inputMode === 'placed' ? 'border-primary-border bg-primary-soft' : 'border-warm-border bg-warm-soft'}`}>
                <button
                  type="button"
                  onClick={() => {
                    handleInputChange(displayedValue - step);
                    scheduleDebouncedPieceSave();
                  }}
                  disabled={readOnly || (inputMode === 'placed' ? newPieces <= 0 : newPieces >= puzzle.totalPieces)}
                  className={`w-14 h-14 rounded-xl text-2xl font-bold transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${inputMode === 'placed' ? 'bg-primary-pill-bg text-primary-pill-text hover:bg-primary-border-strong focus-visible:ring-primary-ring' : 'bg-warm-border text-warm hover:bg-warm-border-strong focus-visible:ring-warm-ring'}`}
                  aria-label={t('dashboard.step')}
                >
                  −
                </button>

                <div className="flex-1 text-center">
                  <p className="text-xs font-semibold text-fg-faint mb-1 uppercase tracking-wider">
                    {inputMode === 'placed' ? t('dashboard.piecesPlaced') : t('dashboard.piecesRemaining')}
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={puzzle.totalPieces}
                    value={displayedValue}
                    onChange={(e) => handleInputChange(parseInt(e.target.value, 10) || 0)}
                    disabled={readOnly}
                    className={`w-full text-center text-4xl font-black bg-transparent border-b-2 outline-none pb-1 transition disabled:opacity-50 focus-visible:ring-2 rounded ${inputMode === 'placed' ? 'text-primary-strong border-primary-border-strong focus:border-primary-fill focus-visible:ring-primary-ring' : 'text-warm border-warm-border-strong focus:border-warm-fill focus-visible:ring-warm-ring'}`}
                    aria-label={inputMode === 'placed' ? t('dashboard.piecesPlaced') : t('dashboard.piecesRemaining')}
                  />
                  {displayedValue !== (inputMode === 'placed' ? puzzle.placedPieces : remainingPieces) && (
                    <p className={`text-xs mt-1 font-semibold ${inputMode === 'placed' ? 'text-primary' : 'text-warm-strong'}`}>
                      {displayedValue > (inputMode === 'placed' ? puzzle.placedPieces : remainingPieces) ? '\u25B2' : '\u25BC'}{' '}
                      {Math.abs(displayedValue - (inputMode === 'placed' ? puzzle.placedPieces : remainingPieces)).toLocaleString(numberLocale)}{' '}
                      {t('dashboard.vsNow')}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleInputChange(displayedValue + step);
                    scheduleDebouncedPieceSave();
                  }}
                  disabled={readOnly || (inputMode === 'placed' ? newPieces >= puzzle.totalPieces : newPieces <= 0)}
                  className={`w-14 h-14 rounded-xl text-2xl font-bold transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${inputMode === 'placed' ? 'bg-primary-bar text-white hover:bg-primary-fill-hover focus-visible:ring-primary-ring' : 'bg-warm-fill text-white hover:bg-warm-fill-hover focus-visible:ring-warm-ring'}`}
                  aria-label={t('dashboard.step')}
                >
                  +
                </button>
              </div>

              <div className="mt-3 flex gap-2">
                <div className="flex-1 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={handlePiecesUpdate}
                    disabled={readOnly || newPieces === puzzle.placedPieces}
                    className="w-full bg-primary-fill text-white py-3 rounded-xl font-bold hover:bg-primary-fill-hover transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
                  >
                    {t('dashboard.save')}
                  </button>
                  <p className="text-[11px] leading-snug text-fg-faint text-center px-1">{t('dashboard.autoSaveHint')}</p>
                </div>
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
                      className="flex-1 flex items-center justify-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 py-2 rounded-lg text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-600"
                    >
                      <Check size={16} aria-hidden />
                      {t('common.confirm')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlagConfirm(false)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-fg-muted hover:bg-surface-muted transition focus:outline-none focus-visible:ring-2"
                    >
                      <XIcon size={16} aria-hidden />
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {lastHistory && (
                <p className="text-xs text-fg-faint mt-2">
                  {t('dashboard.lastActivity')}
                  {lastHistory.pseudo && (
                    <>
                      {' '}
                      ({t('dashboard.by')} <span className="font-medium text-primary">{lastHistory.pseudo}</span>)
                    </>
                  )}
                  :{' '}
                  {formatDistanceToNow(new Date(lastHistory.timestamp), { addSuffix: true, locale: dateLocale })}
                </p>
              )}

              <details className="mt-4 rounded-xl border border-border-ui bg-surface/60 p-3 dark:border-border-ui-strong dark:bg-surface/50">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-fg-heading marker:content-none [&::-webkit-details-marker]:hidden">
                  <History size={16} className="shrink-0 text-primary-muted" aria-hidden />
                  {t('dashboard.activityLogToggle')}
                </summary>
                {activityLogDescending.length === 0 ? (
                  <p className="mt-2 text-xs text-fg-muted">{t('dashboard.activityLogEmpty')}</p>
                ) : (
                  <ul className="mt-2 max-h-80 space-y-1.5 overflow-y-auto overscroll-y-contain text-xs [-webkit-overflow-scrolling:touch]">
                    {activityLogDescending.map((h) => (
                      <li
                        key={h.id}
                        className="border-b border-divide pb-1.5 last:border-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {editingHistoryId === h.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={historyInput}
                                  onChange={(e) => setHistoryInput(parseInt(e.target.value, 10) || 0)}
                                  className="w-20 p-1 text-xs border border-primary-ring rounded bg-surface outline-none focus:ring-1 focus:ring-primary-ring"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateHistoryEntry(h.id, historyInput);
                                    }
                                    if (e.key === 'Escape') setEditingHistoryId(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateHistoryEntry(h.id, historyInput)}
                                  className="p-1 text-success-fill hover:bg-success-soft rounded transition-colors"
                                  title={t('dashboard.validate')}
                                  aria-label={t('dashboard.validate')}
                                >
                                  <Check size={14} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingHistoryId(null)}
                                  className="p-1 text-fg-muted hover:bg-surface-muted rounded transition-colors"
                                  title={t('common.cancel')}
                                  aria-label={t('common.cancel')}
                                >
                                  <XIcon size={14} aria-hidden />
                                </button>
                              </div>
                            ) : (
                              <span className="text-fg">
                                <span className="font-medium">{h.placedPieces.toLocaleString(numberLocale)}</span> {t('common.pieces')}
                                {h.pseudo ? (
                                  <span className="text-fg-muted">
                                    {' '}
                                    · {h.pseudo}
                                  </span>
                                ) : null}
                              </span>
                            )}
                          </div>
                          <time
                            dateTime={new Date(h.timestamp).toISOString()}
                            className="shrink-0 text-fg-faint"
                          >
                            {formatDistanceToNow(new Date(h.timestamp), { addSuffix: true, locale: dateLocale })}
                          </time>
                        </div>

                        {!readOnly && !editingHistoryId && (
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingHistoryId(h.id);
                                setHistoryInput(h.placedPieces);
                              }}
                              className="p-1 text-primary hover:bg-primary-soft rounded transition-colors"
                              title={t('dashboard.editHistory')}
                              aria-label={t('dashboard.editHistory')}
                            >
                              <Pencil size={14} aria-hidden />
                            </button>
                            {deletingHistoryId === h.id ? (
                              <div className="flex items-center gap-1 bg-danger-soft/30 px-2 py-0.5 rounded-lg border border-danger-soft-border/50">
                                <span className="text-[10px] uppercase tracking-wider text-danger-text font-bold mr-1">{t('dashboard.historyDeleteConfirm')}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteHistoryEntry(h.id)}
                                  className="p-1 text-success-fill hover:bg-success-soft rounded transition-colors"
                                  title={t('dashboard.yes')}
                                  aria-label={t('dashboard.yes')}
                                >
                                  <Check size={14} aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingHistoryId(null)}
                                  className="p-1 text-fg-muted hover:bg-surface-muted rounded transition-colors"
                                  title={t('dashboard.no')}
                                  aria-label={t('dashboard.no')}
                                >
                                  <XIcon size={14} aria-hidden />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeletingHistoryId(h.id)}
                                className="p-1 text-danger-text hover:bg-danger-soft rounded transition-colors"
                                title={t('dashboard.deleteHistory')}
                                aria-label={t('dashboard.deleteHistory')}
                              >
                                <Trash2 size={14} aria-hidden />
                              </button>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadHistoryCsv(puzzle.history, historyExportBase)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-ui bg-surface px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:bg-surface-muted dark:border-border-ui dark:bg-surface-muted dark:text-fg dark:hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
                  >
                    <FileSpreadsheet size={14} aria-hidden />
                    {t('dashboard.exportHistoryCsv')}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadHistoryJson(puzzle.history, historyExportBase)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border-ui bg-surface px-2.5 py-1.5 text-xs font-semibold text-fg-muted hover:bg-surface-muted dark:border-border-ui dark:bg-surface-muted dark:text-fg dark:hover:bg-surface-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
                  >
                    <Download size={14} aria-hidden />
                    {t('dashboard.exportHistoryJson')}
                  </button>
                </div>
              </details>
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
                className="flex items-center gap-1 text-xs text-fg-faint hover:text-primary-muted transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 rounded"
              >
                <Grid size={12} aria-hidden />
                {showGridEditor ? t('dashboard.gridCancel') : t('dashboard.adjustGrid')}
              </button>
              {showGridEditor && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border-ui bg-surface-muted p-3 dark:border-border-ui dark:bg-surface-muted/60">
                  <div className="min-w-[100px] flex-1">
                    <label className="mb-1 block text-xs text-fg-muted">{t('home.rows')}</label>
                    <input
                      type="number"
                      min={1}
                      value={gridRows}
                      onChange={(e) => setGridRows(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full rounded-lg border border-border-ui bg-surface p-2 text-center text-sm font-bold text-fg outline-none focus:ring-2 focus:ring-primary-ring dark:border-border-ui dark:bg-surface-input dark:text-fg dark:focus:ring-primary-ring [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                  <span className="mt-4 text-xl text-fg-faint">×</span>
                  <div className="min-w-[100px] flex-1">
                    <label className="mb-1 block text-xs text-fg-muted">{t('home.cols')}</label>
                    <input
                      type="number"
                      min={1}
                      value={gridCols}
                      onChange={(e) => setGridCols(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full rounded-lg border border-border-ui bg-surface p-2 text-center text-sm font-bold text-fg outline-none focus:ring-2 focus:ring-primary-ring dark:border-border-ui dark:bg-surface-input dark:text-fg dark:focus:ring-primary-ring [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                  <div className="mt-4 min-w-[80px] flex-1">
                    <div className="rounded-lg bg-primary-soft p-2 text-center text-sm font-bold text-primary-strong">
                      = {(gridRows * gridCols).toLocaleString(numberLocale)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGridUpdate}
                    className="mt-4 bg-primary-fill text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-primary-fill-hover transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-divide">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <CheckCircle className="mr-2" size={20} aria-hidden /> {t('dashboard.checkpointsTitle')}
              </h2>
              <button
                type="button"
                onClick={handleUncheckAll}
                disabled={readOnly || puzzle.checkpoints.every((c) => !c.completed)}
                className="text-xs font-semibold text-fg-muted hover:text-primary-hover border border-border-ui rounded-lg px-2 py-1 disabled:opacity-40 focus:outline-none focus-visible:ring-2"
              >
                {t('dashboard.uncheckAll')}
              </button>
            </div>

            <div className="mb-6 rounded-2xl border border-divide bg-surface-muted/80 dark:bg-surface-muted/40 p-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-fg">{t('dashboard.checkpointQuickAdd')}</p>
                <p className="text-xs text-fg-muted mt-1 leading-relaxed">{t('dashboard.checkpointQuickAddHint')}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
                  {t('dashboard.checkpointFromProgress')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {checkpointSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handlePresetCheckpoint(s)}
                      disabled={readOnly}
                      className="text-xs px-3 py-2 rounded-xl border border-border-ui bg-surface text-fg-heading hover:border-primary-ring hover:bg-primary-soft-hover disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring max-w-full text-left break-words"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
                  {t('dashboard.checkpointPresets')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {checkpointPresets.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handlePresetCheckpoint(label)}
                      disabled={readOnly}
                      className="text-xs px-3 py-2 rounded-xl border border-border-ui bg-surface text-fg-heading hover:border-primary-ring hover:bg-primary-soft-hover disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring max-w-full text-left break-words"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-border-ui/80">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
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
                    className="flex-1 min-w-0 p-2.5 text-sm border border-border-ui rounded-xl bg-surface text-fg focus:ring-2 focus:ring-primary-ring outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleAddCheckpoint}
                    disabled={readOnly || !newCheckpointName.trim()}
                    className="shrink-0 px-3 py-2 bg-primary-fill text-white rounded-xl hover:bg-primary-fill-hover transition disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring text-sm font-semibold"
                    title={t('dashboard.addCheckpoint')}
                    aria-label={t('dashboard.addCheckpoint')}
                  >
                    <Plus size={18} aria-hidden className="sm:hidden" />
                    <span className="hidden sm:inline">{t('dashboard.addCheckpoint')}</span>
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
              {t('dashboard.checkpointsList')}
            </p>
            {puzzle.checkpoints.length === 0 ? (
              <p className="text-sm text-fg-faint py-2">{t('dashboard.checkpointsEmpty')}</p>
            ) : (
              <div className="space-y-3">
                {puzzle.checkpoints.map((cp) => (
                  <div
                    key={cp.id}
                    className={`flex items-stretch gap-1 rounded-xl border transition ${cp.completed ? 'bg-success-soft border-success-soft-border' : 'bg-surface-muted/50 border-divide'}`}
                  >
                    <div
                      role="button"
                      tabIndex={readOnly ? -1 : 0}
                      className={`flex min-w-0 flex-1 cursor-pointer items-center p-3 rounded-l-xl transition ${!readOnly && !cp.completed ? 'hover:border-primary-border dark:hover:border-primary-muted' : ''} ${readOnly ? 'cursor-default' : ''}`}
                      onClick={() => !readOnly && toggleCheckpoint(puzzle.id, cp.id, cp.completed)}
                      onKeyDown={(e) => {
                        if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          toggleCheckpoint(puzzle.id, cp.id, cp.completed);
                        }
                      }}
                    >
                      <div
                        className={`mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${cp.completed ? 'border-success-fill bg-success-fill text-white' : 'border-border-ui-strong bg-surface dark:border-border-ui dark:bg-surface'}`}
                      >
                        {cp.completed && <CheckCircle size={14} aria-hidden />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`break-words text-sm font-medium ${cp.completed ? 'text-success-on-soft line-through' : 'text-fg'}`}
                        >
                          {cp.name}
                        </span>
                        {cp.createdBy && <p className="text-xs text-fg-faint">{cp.createdBy}</p>}
                      </div>
                    </div>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteCheckpoint(cp.id);
                        }}
                        className="flex shrink-0 items-center justify-center rounded-r-xl border-l border-border-ui/80 px-3 text-fg-faint transition hover:bg-danger-soft-hover hover:text-danger-text dark:border-border-ui/80 dark:hover:bg-danger-soft-hover dark:hover:text-danger-text focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-danger-ring"
                        title={t('dashboard.deleteCheckpoint')}
                        aria-label={t('dashboard.deleteCheckpoint')}
                      >
                        <Trash2 size={18} aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-surface p-6 rounded-2xl shadow-sm border border-divide">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <ImageIcon className="mr-2" size={20} aria-hidden /> {t('dashboard.photosTitle')}
              </h2>
              <button
                type="button"
                onClick={() => !readOnly && fileInputRef.current?.click()}
                disabled={readOnly}
                className="bg-primary-track text-primary p-2 rounded-full hover:bg-primary-soft-active transition disabled:opacity-40 focus:outline-none focus-visible:ring-2"
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
            <p className="text-xs text-fg-faint mb-3">{t('dashboard.photoHelp')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {puzzle.photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="relative rounded-lg overflow-hidden border border-divide group"
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
                        className="bg-surface/90 text-fg-heading p-2 rounded-full hover:bg-surface dark:hover:bg-surface-muted transition disabled:opacity-30"
                        aria-label={t('dashboard.moveLeft')}
                      >
                        <ChevronLeft size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePhoto(puzzle.id, photo.id, (photo.rotation + 90) % 360)}
                        disabled={readOnly}
                        className="bg-surface/90 text-fg-heading p-2 rounded-full hover:bg-surface dark:hover:bg-surface-muted transition disabled:opacity-30"
                        aria-label={t('dashboard.rotate')}
                      >
                        <RotateCw size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePhoto(photo.id, 1)}
                        disabled={readOnly || idx >= puzzle.photos.length - 1}
                        className="bg-surface/90 text-fg-heading p-2 rounded-full hover:bg-surface dark:hover:bg-surface-muted transition disabled:opacity-30"
                        aria-label={t('dashboard.moveRight')}
                      >
                        <ChevronRight size={16} aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => !readOnly && deletePhoto(puzzle.id, photo.id)}
                        disabled={readOnly}
                        className="bg-danger-fill/90 text-white p-2 rounded-full hover:bg-danger-fill-hover transition disabled:opacity-30"
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
                    className="w-full text-xs p-2 border-t border-divide bg-surface-muted/80 outline-none focus:bg-surface dark:focus:bg-surface focus:ring-1 focus:ring-primary-ring/50 text-fg disabled:opacity-50"
                  />
                  {photo.addedAt && (
                    <p className="text-[10px] text-fg-faint px-2 pb-1">
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
                <div className="col-span-3 text-center text-fg-faint py-12 bg-surface-muted rounded-xl border border-dashed border-border-ui">
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
