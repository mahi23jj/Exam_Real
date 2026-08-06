import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FeedItem } from './feedTypes';
import KnowledgePinDetail from './KnowledgePinDetail';
import QuestionDetail from './QuestionDetail';

interface FeedContextPanelProps {
  item: FeedItem | null;
  onAddReply: (questionId: string, content: string) => void;
  onClose: () => void;
}

const FeedContextPanel: React.FC<FeedContextPanelProps> = ({ item, onAddReply: _onAddReply, onClose }) => {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] md:max-lg:bg-black/30"
            onClick={onClose}
          />

          <motion.aside
            key="panel"
            initial={{ x: 80, opacity: 0, y: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 80, opacity: 0, y: 0 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] w-full max-w-none flex-col overflow-hidden border border-stone-200 bg-white shadow-[0_30px_70px_rgba(15,23,42,0.18)] max-md:rounded-t-[28px] md:inset-y-0 md:bottom-auto md:right-0 md:left-auto md:h-full md:w-full md:max-w-[100vw] md:rounded-none lg:w-[420px] lg:border-l lg:border-t-0 lg:border-b-0"
          >
            <PanelHeader onClose={onClose} item={item} />
            <div className="flex-1 overflow-y-auto no-scrollbar">
              {item.type === 'pin' ? <KnowledgePinDetail pin={item} /> : <QuestionDetail question={item} />}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

const PanelHeader: React.FC<{ onClose: () => void; item: FeedItem }> = ({ onClose, item }) => (
  <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-stone-400">
        {item.type === 'pin' ? 'Knowledge Pin' : 'Discussion'}
      </p>
      <p className="mt-1 text-sm font-semibold text-stone-800">{item.topic}</p>
    </div>
    <button
      onClick={onClose}
      className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-500 transition-all duration-200 hover:bg-stone-200 hover:text-stone-700"
      aria-label="Close panel"
    >
      <X className="h-4 w-4" />
    </button>
  </div>
);

export default FeedContextPanel;
