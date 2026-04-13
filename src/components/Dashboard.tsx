import React, { useState, useRef } from 'react';
import { Camera, CheckCircle, Clock, Image as ImageIcon, Users } from 'lucide-react';
import { differenceInMinutes } from 'date-fns';
import { type PuzzleState, updatePieces, toggleCheckpoint, addPhoto } from '../hooks/useSocket';
import ErrorModal from './ErrorModal';

interface DashboardProps {
  puzzle: PuzzleState;
}

const Dashboard: React.FC<DashboardProps> = ({ puzzle }) => {
  const [newPieces, setNewPieces] = useState(puzzle.placedPieces);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const remainingPieces = puzzle.totalPieces - puzzle.placedPieces;
  const progress = (puzzle.placedPieces / puzzle.totalPieces) * 100;

  const calculateEstimates = () => {
    if (puzzle.history.length < 2) return null;

    const first = puzzle.history[0];
    const last = puzzle.history[puzzle.history.length - 1];

    const minutesElapsed = differenceInMinutes(last.timestamp, first.timestamp);
    const piecesPlaced = last.placedPieces - first.placedPieces;

    if (piecesPlaced <= 0 || minutesElapsed <= 0) return null;

    const piecesPerMinute = piecesPlaced / minutesElapsed;

    const realistic = remainingPieces / piecesPerMinute;
    const optimistic = remainingPieces / (piecesPerMinute * 1.2);
    const pessimistic = remainingPieces / (piecesPerMinute * 0.8);

    const formatTime = (mins: number) => {
      const h = Math.floor(mins / 60);
      const m = Math.round(mins % 60);
      return `${h}h ${m}m`;
    };

    return {
      optimistic: formatTime(optimistic),
      realistic: formatTime(realistic),
      pessimistic: formatTime(pessimistic)
    };
  };

  const estimates = calculateEstimates();

  const handlePiecesUpdate = async () => {
    try {
      await updatePieces(puzzle.id, newPieces);
    } catch (err) {
      setError('Impossible de mettre à jour le nombre de pièces.');
      console.error(err);
    }
  };

  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

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
          <div>
            <h1 className="text-3xl font-bold text-gray-800">{puzzle.name}</h1>
            <p className="text-indigo-600 font-mono font-bold">CODE: {puzzle.id}</p>
          </div>
          <div className="flex items-center space-x-2 text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm">
            <Users size={20} />
            <span className="text-sm font-medium">Collaboratif en temps réel</span>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-2">
            <h2 className="text-xl font-semibold mb-4">Progression</h2>
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-indigo-600 bg-indigo-50">
                    {Math.round(progress)}% terminé
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-indigo-600">
                    {puzzle.placedPieces} / {puzzle.totalPieces}
                  </span>
                </div>
              </div>
              <div className="overflow-hidden h-4 mb-4 text-xs flex rounded bg-indigo-50">
                <div style={{ width: `${progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"></div>
              </div>
            </div>

            <div className="flex space-x-4 items-end mt-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pièces placées</label>
                <input
                  type="number"
                  value={newPieces}
                  onChange={(e) => setNewPieces(parseInt(e.target.value))}
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
          </div>

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
                  <span className={`font-medium ${cp.completed ? 'text-green-800 line-through' : 'text-gray-700'}`}>{cp.name}</span>
                </div>
              ))}
            </div>
          </div>

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
