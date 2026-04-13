import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ErrorModalProps {
  message: string | null;
  onClose: () => void;
}

const ErrorModal: React.FC<ErrorModalProps> = ({ message, onClose }) => {
  return (
    <AnimatePresence>
      {message && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full text-red-600">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
                Oups ! Une erreur est survenue
              </h3>
              <p className="text-sm text-center text-gray-600">
                {message}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={onClose}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                J'ai compris
              </button>
            </div>
          </motion.div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ErrorModal;
