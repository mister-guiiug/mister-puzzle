import React, { useState, useRef } from 'react';
import { Camera, CheckCircle, Clock, Image as ImageIcon, Users, ArrowLeft, Plus, Grid } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { type PuzzleState, updatePieces, toggleCheckpoint, addCheckpoint, addPhoto, updateGridSize } from '../hooks/useSocket';
import ErrorModal from './ErrorModal';

interface DashboardProps {
  puzzle: PuzzleState;
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ puzzle, onBack }) => {
  const [newPieces, setNewPieces] = useState(puzzle.placedPieces);
  const [error, setError] = useState<string | null>(null);
  const [newCheckpointName, setNewCheckpointName] = useState('');
  const [showGridEditor, setShowGridEditor] = useState(false);
  const [gridRows, setGridRows] = useState(puzzle.rows ?? 0);
  const [gridCols, setGridCols] = useState(puzzle.cols ?? 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingPieces = puzzle.totalPieces - puzzle.placedPieces;
  const progress = Math.min((puzzle.placedPieces / puzzle.totalPieces) * 100, 100);

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
      await updatePieces(puzzle.id, newPieces);
    } catch (err) {
      setError('Impossible de mettre à jour le nombre de pièces.');
      console.error(err);
    }
  };

  const handleAddCheckpoint = async () => {
    if (!newCheckpointName.trim()) return;
    try {
      await addCheckpoint(puzzle.id, newCheckpointName.trim());
      setNewCheckpointName('');
    } catch (err) {
      setError('Impossible d\'ajouter le checkpoint.');
      console.error(err);
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
              <h1 className="text-3xl font-bold text-gray-800">{puzzle.name}</h1>
              <p className="text-indigo-600 font-mono font-bold text-sm">CODE: {puzzle.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm">
            <Users size={20} />
            <span className="text-sm font-medium">Collaboratif en temps réel</span>
          </div>
        </header>

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
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-bold text-indigo-700">{remainingPieces.toLocaleString('fr-FR')}</span> pièces restantes
              {puzzle.rows && puzzle.cols && (
                <span className="text-gray-400 ml-2">· {puzzle.rows} × {puzzle.cols}</span>
              )}
            </p>

            <div className="flex space-x-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pièces placées</label>
                <input
                  type="number"
                  min={0}
                  max={puzzle.totalPieces}
                  value={newPieces}
                  onChange={(e) => setNewPieces(parseInt(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <button
                onClick={handlePiecesUpdate}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm"
              >
                Mettre à jour
              </button>
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
                  <span className={`font-medium text-sm ${cp.completed ? 'text-green-800 line-through' : 'text-gray-700'}`}>{cp.name}</span>
                </div>
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
