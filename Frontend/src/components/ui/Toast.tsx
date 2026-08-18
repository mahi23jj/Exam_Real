import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, x: 50 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 50, x: 50 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`fixed bottom-4 right-4 z-[60] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
        type === 'success' ? 'bg-white border-emerald-100 text-stone-800' : 'bg-red-50 border-red-100 text-red-900'
      }`}
    >
      {type === 'success' ? (
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
      ) : (
        <XCircle className="w-5 h-5 text-red-500" />
      )}
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors ml-2">
        <X className="w-4 h-4 opacity-50 hover:opacity-100" />
      </button>
    </motion.div>
  );
};

export default Toast;
