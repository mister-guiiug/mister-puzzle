import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, Clock, Image as ImageIcon, Users, ArrowLeft, Plus, Grid, Share2, Trash2, Lock, Unlock, Globe, Eye, EyeOff, Settings, Pencil, Check, X as XIcon, Flag } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { type PuzzleState, type Member, updatePieces, toggleCheckpoint, addCheckpoint, addPhoto, updateGridSize, deletePuzzle, joinMember, leaveMember, changePassword, updateVisibility, hashPassword, renamePuzzle } from '../hooks/useSocket';
import ErrorModal from './ErrorModal';
import { getPseudo, setPseudo as savePseudo, getSessionId, isPseudoLocked, setPseudoLocked } from '../utils/pseudo';

interface DashboardProps {
  puzzle: PuzzleState;
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ puzzle, onBack }) => {
  const [newPieces, setNewPieces] = useState(puzzle.placedPieces);
  const [inputMode, setInputMode] = useState<'placed' | 'remaining'>('placed');
  const [error, setError] = useState<string | null>(null);
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [showGridEditor, setShowGridEditor] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copied, setCopied] = useState(false);
  const [gridRows, setGridRows] = useState(puzzle.rows ?? 0);
  const [gridCols, setGridCols] = useState(puzzle.cols ?? 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pseudo (editable inline)
  const [pseudo, setPseudoState] = useState(getPseudo);
  const [pseudoLocked, setPseudoLockedState] = useState(isPseudoLocked);

  const handleTogglePseudoLock = () => {
    if (!pseudoLocked) savePseudo(pseudo);
    const next = !pseudoLocked;
    setPseudoLocked(next);
    setPseudoLockedState(next);
  };

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [step, setStep] = useState(1);
  const [flagConfirm, setFlagConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(puzzle.name);

  // Member presence
  useEffect(() => {
    const sessionId = getSessionId();
    joinMember(puzzle.id, sessionId, pseudo || 'Anonyme').catch(console.error);
    return () => {
      leaveMember(puzzle.id, sessionId).catch(console.error);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle.id]);

  const remainingPieces = puzzle.totalPieces - puzzle.placedPieces;
  const progress = Math.min((puzzle.placedPieces / puzzle.totalPieces) * 100, 100);

  // Dual input: value displayed depends on mode
  const displayedValue = inputMode === 'placed' ? newPieces : puzzle.totalPieces - newPieces;
  const handleInputChange = (raw: number) => {
    if (inputMode === 'placed') {
      setNewPieces(Math.max(0, Math.min(puzzle.totalPieces, raw)));
    } else {
      setNewPieces(Math.max(0, Math.min(puzzle.totalPieces, puzzle.totalPieces - raw)));
    }
  };

  // Checkpoint name suggestions
  const checkpointSuggestions = [
    `${Math.round(progress)}% terminé`,
    `${puzzle.placedPieces.toLocaleString('fr-FR')} pièces placées`,
    `${remainingPieces.toLocaleString('fr-FR')} pièces restantes`,
  ];

  const calculateEstimates = () => {
    if (puzzle.history.length < 2) return null;
    const first = puzzle.history[0];
    const last = puzzle.history[puzzle.history.length - 1];
    const minutesElapsed = differenceInMinutes(last.timestamp, first.timestamp);
    const piecesPlaced = last.placedPieces - first.placedPieces;
    if (piecesPlaced <= 0 || minutesElapsed <= 0) return null;
    const piecesPerMinute = piecesPlaced / minutesElapsed;
    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      return `${h}h ${m}m`;
    };
    return {
      optimistic: formatTime(remainingPieces / (piecesPerMinute * 1.2)),
      realistic: formatTime(remainingPieces / piecesPerMinute),
      pessimistic: formatTime(remainingPieces / (piecesPerMinute * 0.8)),
    };
  };

  const estimates = calculateEstimates();

  const handlePiecesUpdate = async () => {
    if (newPieces < 0 || newPieces > puzzle.totalPieces) {
      setError(`Le nombre de pièces doit être entre 0 et ${puzzle.totalPieces}.`);
      return;
    }
    try {
      await updatePieces(puzzle.id, newPieces, pseudo || undefined);
    } catch (err) {
      setError('Impossible de mettre à jour le nombre de pièces.');
      console.error(err);
    }
  };

  const handleAddCheckpoint = async () => {
    if (!newCheckpointName.trim()) return;
    try {
      await addCheckpoint(puzzle.id, newCheckpointName.trim(), pseudo || undefined);
      setNewCheckpointName('');
    } catch (err) {
      setError('Impossible d\'ajouter le checkpoint.');
      console.error(err);
    }
  };

  const handleChangePassword = async () => {
    setPwMessage(null);
    if (puzzle.passwordHash) {
      if (!currentPwd) {
        setPwMessage({ type: 'error', text: 'Veuillez saisir le mot de passe actuel.' });
        return;
      }
      const currentHash = await hashPassword(currentPwd);
      if (currentHash !== puzzle.passwordHash) {
        setPwMessage({ type: 'error', text: 'Mot de passe actuel incorrect.' });
        return;
      }
    }
    try {
      const newHash = newPwd ? await hashPassword(newPwd) : null;
      await changePassword(puzzle.id, newHash);
      setCurrentPwd('');
      setNewPwd('');
      setPwMessage({ type: 'success', text: newPwd ? 'Mot de passe modifié !' : 'Mot de passe supprimé.' });
      setTimeout(() => setPwMessage(null), 3000);
    } catch (err) {
      setPwMessage({ type: 'error', text: 'Impossible de modifier le mot de passe.' });
      console.error(err);
    }
  };

  const handleUpdateVisibility = async (newIsPublic: boolean) => {
    try {
      await updateVisibility(puzzle.id, newIsPublic);
    } catch (err) {
      setError('Impossible de modifier la visibilité.');
      console.error(err);
    }
  };

  const handleRename = async () => {
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
      setError('Impossible de renommer le puzzle.');
      console.error(err);
      setNameInput(puzzle.name);
      setEditingName(false);
    }
  };

  const handleGridUpdate = async () => {
    if (gridRows <= 0 || gridCols <= 0) {
      setError('Les dimensions de la grille doivent être supérieures à 0.');
      return;
    }
    try {
      await updateGridSize(puzzle.id, gridRows, gridCols);
      setShowGridEditor(false);
    } catch (err) {
      setError('Impossible de mettre à jour la grille.');
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deletePuzzle(puzzle.id);
      onBack();
    } catch (err) {
      setError('Impossible de supprimer le puzzle.');
      console.error(err);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${window.location.pathname}#${puzzle.id}`;
    const text = `Rejoins mon puzzle "${puzzle.name}" sur Mister Puzzle ! Code : ${puzzle.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Mister Puzzle', text, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resizeImage = (file: File): Promise<string> =>
    new Promise((resolve) => {
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
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await resizeImage(file);
        await addPhoto(puzzle.id, compressed);
      } catch (err) {
        setError("Impossible d'ajouter la photo. Vérifiez la taille ou votre connexion.");
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <ErrorModal message={error} onClose={() => setError(null)} />

      <div className="max-w-4xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-full hover:bg-gray-200 transition text-gray-500"
              title="Retour à l'accueil"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              {/* Inline rename */}
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') { setEditingName(false); setNameInput(puzzle.name); }
                    }}
                    className="text-2xl font-bold text-gray-800 border-b-2 border-indigo-400 bg-transparent outline-none"
                    autoFocus
                    maxLength={100}
                  />
                  <button onClick={handleRename} className="p-1 text-green-600 hover:text-green-700" title="Valider">
                    <Check size={18} />
                  </button>
                  <button onClick={() => { setEditingName(false); setNameInput(puzzle.name); }} className="p-1 text-gray-400 hover:text-gray-600" title="Annuler">
                    <XIcon size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/name">
                  <h1 className="text-3xl font-bold text-gray-800">{puzzle.name}</h1>
                  <button
                    onClick={() => { setEditingName(true); setNameInput(puzzle.name); }}
                    className="p-1 text-gray-300 hover:text-indigo-500 transition opacity-0 group-hover/name:opacity-100"
                    title="Renommer"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <p className="text-indigo-600 font-mono font-bold text-sm">CODE: {puzzle.id}</p>
                {puzzle.createdBy && (
                  <span className="text-xs text-gray-400">· Créé par {puzzle.createdBy}</span>
                )}
                {!puzzle.isPublic && (
                  <span className="flex items-center gap-1 text-xs text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    <Lock size={10} /> Privé
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">Vous :</span>
                <input
                  type="text"
                  value={pseudo}
                  onChange={(e) => !pseudoLocked && setPseudoState(e.target.value)}
                  onBlur={() => !pseudoLocked && savePseudo(pseudo)}
                  readOnly={pseudoLocked}
                  className={`text-xs font-medium bg-transparent border-b outline-none transition w-28 ${pseudoLocked ? 'text-gray-400 border-transparent cursor-not-allowed' : 'text-gray-600 border-dashed border-gray-300 focus:border-indigo-400'}`}
                  placeholder="Votre pseudo"
                  maxLength={30}
                />
                <button
                  onClick={handleTogglePseudoLock}
                  title={pseudoLocked ? 'Déverrouiller le pseudo' : 'Verrouiller le pseudo'}
                  className={`transition ${pseudoLocked ? 'text-indigo-400 hover:text-indigo-600' : 'text-gray-300 hover:text-indigo-400'}`}
                >
                  {pseudoLocked ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Active members */}
            {puzzle.members && Object.keys(puzzle.members).length > 0 ? (
              <div className="flex items-center gap-1 bg-white px-3 py-2 rounded-full shadow-sm">
                {(Object.values(puzzle.members) as Member[]).slice(0, 5).map((member, i) => (
                  <div
                    key={i}
                    title={member.pseudo}
                    className="w-7 h-7 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center font-bold border-2 border-white -ml-1 first:ml-0"
                  >
                    {member.pseudo.charAt(0).toUpperCase()}
                  </div>
                ))}
                {Object.keys(puzzle.members).length > 5 && (
                  <span className="text-xs text-gray-400 ml-1">+{Object.keys(puzzle.members).length - 5}</span>
                )}
                <span className="text-xs text-gray-500 ml-1">en ligne</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm">
                <Users size={20} />
                <span className="text-sm font-medium">Collaboratif</span>
              </div>
            )}
            <button
              onClick={handleShare}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-sm hover:bg-indigo-700 transition font-medium text-sm"
              title="Partager le code du puzzle"
            >
              <Share2 size={16} />
              {copied ? 'Copié !' : 'Partager'}
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-full shadow-sm transition ${showSettings ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
              title="Paramètres du puzzle"
            >
              <Settings size={18} />
            </button>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 bg-white text-red-500 border border-red-200 px-4 py-2 rounded-full shadow-sm hover:bg-red-50 transition font-medium text-sm"
                title="Supprimer le puzzle"
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">Supprimer définitivement ?</span>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-bold hover:bg-red-700 transition"
                >
                  Oui
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-sm font-bold hover:bg-gray-200 transition"
                >
                  Non
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings size={18} /> Paramètres du puzzle
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Visibilité</label>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
                  <button
                    onClick={() => handleUpdateVisibility(true)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${puzzle.isPublic ? 'bg-green-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Globe size={14} /> Public
                  </button>
                  <button
                    onClick={() => handleUpdateVisibility(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition ${!puzzle.isPublic ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <Lock size={14} /> Privé
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {puzzle.isPublic ? 'Visible dans la recherche publique.' : 'Non visible dans la recherche.'}
                </p>
              </div>

              {/* Change password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
                <div className="space-y-2">
                  {puzzle.passwordHash && (
                    <input
                      type="password"
                      placeholder="Mot de passe actuel"
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                    />
                  )}
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      placeholder={puzzle.passwordHash ? 'Nouveau mot de passe (vide = supprimer)' : 'Définir un mot de passe'}
                      className="w-full p-2 pr-8 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showNewPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button
                    onClick={handleChangePassword}
                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition"
                  >
                    {puzzle.passwordHash ? 'Modifier' : 'Définir'}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Progression */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-2">
            <h2 className="text-xl font-semibold mb-4">Progression</h2>
            <div className="flex mb-2 items-center justify-between">
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-50">
                {Math.round(progress)}% terminé
              </span>
              <span className="text-xs font-semibold text-indigo-600">
                {puzzle.placedPieces.toLocaleString('fr-FR')} / {puzzle.totalPieces.toLocaleString('fr-FR')}
              </span>
            </div>
            <div className="overflow-hidden h-4 mb-2 flex rounded bg-indigo-50">
              <div
                style={{ width: `${progress}%` }}
                className="flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {puzzle.rows && puzzle.cols && (
                <span className="text-gray-400">Grille {puzzle.rows} × {puzzle.cols}</span>
              )}
            </p>

            {/* Placed / Remaining stats + counter */}
            <div className="mb-6">
              {/* Two-stat cards — click to switch mode */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  onClick={() => setInputMode('placed')}
                  className={`rounded-xl p-4 text-left border-2 transition ${inputMode === 'placed' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 bg-gray-50 hover:border-indigo-200'}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1">Placées</p>
                  <p className="text-3xl font-bold text-indigo-700">{puzzle.placedPieces.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-gray-400 mt-1">sur {puzzle.totalPieces.toLocaleString('fr-FR')}</p>
                </button>
                <button
                  onClick={() => setInputMode('remaining')}
                  className={`rounded-xl p-4 text-left border-2 transition ${inputMode === 'remaining' ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-gray-50 hover:border-orange-200'}`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-1">Restantes</p>
                  <p className="text-3xl font-bold text-orange-600">{remainingPieces.toLocaleString('fr-FR')}</p>
                  <p className="text-xs text-gray-400 mt-1">à placer</p>
                </button>
              </div>

              {/* Step selector */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Pas :</span>
                {[1, 5, 10, 25, 50, 100].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStep(s)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${step === s ? (inputMode === 'placed' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-orange-500 text-white border-orange-500') : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* +/− counter */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${inputMode === 'placed' ? 'border-indigo-200 bg-indigo-50' : 'border-orange-200 bg-orange-50'}`}>
                {/* − button */}
                <button
                  onClick={() => handleInputChange(displayedValue - step)}
                  disabled={inputMode === 'placed' ? newPieces <= 0 : newPieces >= puzzle.totalPieces}
                  className={`w-14 h-14 rounded-xl text-2xl font-bold transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${inputMode === 'placed' ? 'bg-indigo-200 text-indigo-700 hover:bg-indigo-300' : 'bg-orange-200 text-orange-700 hover:bg-orange-300'}`}
                >
                  −
                </button>

                {/* Value display + manual input */}
                <div className="flex-1 text-center">
                  <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                    {inputMode === 'placed' ? 'Pièces placées' : 'Pièces restantes'}
                  </p>
                  <input
                    type="number"
                    min={0}
                    max={puzzle.totalPieces}
                    value={displayedValue}
                    onChange={(e) => handleInputChange(parseInt(e.target.value) || 0)}
                    className={`w-full text-center text-4xl font-black bg-transparent border-b-2 outline-none pb-1 transition ${inputMode === 'placed' ? 'text-indigo-700 border-indigo-300 focus:border-indigo-600' : 'text-orange-600 border-orange-300 focus:border-orange-500'}`}
                  />
                  {displayedValue !== (inputMode === 'placed' ? puzzle.placedPieces : remainingPieces) && (
                    <p className={`text-xs mt-1 font-semibold ${inputMode === 'placed' ? 'text-indigo-500' : 'text-orange-500'}`}>
                      {displayedValue > (inputMode === 'placed' ? puzzle.placedPieces : remainingPieces) ? '▲' : '▼'}
                      {' '}
                      {Math.abs(displayedValue - (inputMode === 'placed' ? puzzle.placedPieces : remainingPieces)).toLocaleString('fr-FR')} par rapport à maintenant
                    </p>
                  )}
                </div>

                {/* + button */}
                <button
                  onClick={() => handleInputChange(displayedValue + step)}
                  disabled={inputMode === 'placed' ? newPieces >= puzzle.totalPieces : newPieces <= 0}
                  className={`w-14 h-14 rounded-xl text-2xl font-bold transition active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${inputMode === 'placed' ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-orange-400 text-white hover:bg-orange-500'}`}
                >
                  +
                </button>
              </div>

              {/* Save + Flag buttons */}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handlePiecesUpdate}
                  disabled={newPieces === puzzle.placedPieces}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => setFlagConfirm(true)}
                  title="Marquer un checkpoint à l'étape actuelle"
                  className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 rounded-xl transition shadow-sm font-bold"
                >
                  <Flag size={20} />
                </button>
              </div>

              {/* Flag confirmation */}
              {flagConfirm && (
                <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm font-semibold text-yellow-800 mb-1 flex items-center gap-2">
                    <Flag size={14} /> Poser un checkpoint ici ?
                  </p>
                  <p className="text-xs text-yellow-700 mb-3">
                    Un checkpoint sera créé avec l'étape actuelle ({puzzle.placedPieces.toLocaleString('fr-FR')} pièces placées, {Math.round(progress)}% terminé).
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const name = `🚩 ${Math.round(progress)}% — ${puzzle.placedPieces.toLocaleString('fr-FR')} pièces`;
                        await addCheckpoint(puzzle.id, name, pseudo || undefined);
                        setFlagConfirm(false);
                      }}
                      className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 py-2 rounded-lg text-sm font-bold transition"
                    >
                      Confirmer
                    </button>
                    <button
                      onClick={() => setFlagConfirm(false)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-500 hover:bg-gray-100 transition"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              {puzzle.history.length > 0 && (() => {
                const last = puzzle.history[puzzle.history.length - 1];
                const date = new Date(last.timestamp);
                const formatted = date.toLocaleString('fr-FR', {
                  day: '2-digit', month: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                }).replace(',', ' à').replace(':', 'h');
                return (
                  <p className="text-xs text-gray-400 mt-2">
                    Mis à jour
                    {last.pseudo && <> par <span className="font-medium text-indigo-600">{last.pseudo}</span></>}
                    {' '}le {formatted}
                  </p>
                );
              })()}
            </div>

            {/* Grid size editor */}
            <div className="mt-4">
              <button
                onClick={() => {
                  setGridRows(puzzle.rows ?? 0);
                  setGridCols(puzzle.cols ?? 0);
                  setShowGridEditor(!showGridEditor);
                }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition"
              >
                <Grid size={12} />
                {showGridEditor ? 'Annuler' : 'Ajuster la grille'}
              </button>
              {showGridEditor && (
                <div className="mt-3 flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Lignes</label>
                    <input
                      type="number"
                      min={1}
                      value={gridRows}
                      onChange={(e) => setGridRows(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-2 border rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                  <span className="text-gray-400 text-xl mt-4">×</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Colonnes</label>
                    <input
                      type="number"
                      min={1}
                      value={gridCols}
                      onChange={(e) => setGridCols(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-2 border rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                    />
                  </div>
                  <div className="flex-1 mt-4">
                    <div className="text-center text-sm font-bold text-indigo-700 bg-indigo-50 p-2 rounded-lg">
                      = {(gridRows * gridCols).toLocaleString('fr-FR')}
                    </div>
                  </div>
                  <button
                    onClick={handleGridUpdate}
                    className="mt-4 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Estimates */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Clock className="mr-2" size={20} /> Estimation
            </h2>
            {estimates ? (
              <div className="space-y-4">
                <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                  <p className="text-[10px] uppercase font-bold text-green-600">Optimiste</p>
                  <p className="text-xl font-bold text-green-700">{estimates.optimistic}</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                  <p className="text-[10px] uppercase font-bold text-indigo-600">Réaliste</p>
                  <p className="text-xl font-bold text-indigo-700">{estimates.realistic}</p>
                </div>
                <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                  <p className="text-[10px] uppercase font-bold text-red-600">Pessimiste</p>
                  <p className="text-xl font-bold text-red-700">{estimates.pessimistic}</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center py-4">
                <Clock className="text-gray-200 mb-2" size={40} />
                <p className="text-gray-400 text-sm">Continuez à avancer pour obtenir une estimation...</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Checkpoints */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <CheckCircle className="mr-2" size={20} /> Checkpoints
            </h2>
            <div className="space-y-3">
              {puzzle.checkpoints.map((cp) => (
                <div
                  key={cp.id}
                  className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${cp.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100 hover:border-indigo-200'}`}
                  onClick={() => toggleCheckpoint(puzzle.id, cp.id, cp.completed)}
                >
                  <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center transition-colors ${cp.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
                    {cp.completed && <CheckCircle size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`font-medium text-sm ${cp.completed ? 'text-green-800 line-through' : 'text-gray-700'}`}>{cp.name}</span>
                    {cp.createdBy && (
                      <p className="text-xs text-gray-400">{cp.createdBy}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Checkpoint name suggestions */}
            <div className="flex flex-wrap gap-2 mt-4 mb-2">
              {checkpointSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setNewCheckpointName(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition ${newCheckpointName === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Add checkpoint */}
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                placeholder="Nouveau checkpoint..."
                value={newCheckpointName}
                onChange={(e) => setNewCheckpointName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCheckpoint()}
                className="flex-1 p-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
              />
              <button
                onClick={handleAddCheckpoint}
                disabled={!newCheckpointName.trim()}
                className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition disabled:opacity-40"
                title="Ajouter"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Photos */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <ImageIcon className="mr-2" size={20} /> Photos
              </h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-100 text-indigo-600 p-2 rounded-full hover:bg-indigo-200 transition"
              >
                <Camera size={20} />
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
            <div className="grid grid-cols-3 gap-2">
              {puzzle.photos.map((photo, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-100">
                  <img src={photo} alt={`Progress ${i}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {puzzle.photos.length === 0 && (
                <div className="col-span-3 text-center text-gray-300 py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <ImageIcon className="mx-auto mb-2 opacity-50" size={32} />
                  <p className="text-sm">Aucune photo pour le moment</p>
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
