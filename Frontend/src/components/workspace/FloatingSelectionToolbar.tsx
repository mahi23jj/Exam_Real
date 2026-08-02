import React from 'react';
import { Pin, HelpCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TextSelection } from '../../types/workspace';

interface FloatingSelectionToolbarProps {
  selection: TextSelection | null;
  onPin: () => void;
  onAskQuestion: () => void;
  onAskAI: () => void;
}

const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  selection,
  onPin,
  onAskQuestion,
  onAskAI,
}) => {
  if (!selection) return null;

  const top = selection.rect.top + window.scrollY - 48;
  const left = selection.rect.left + selection.rect.width / 2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        style={{
          position: 'fixed',
          top: Math.max(8, top),
          left,
          transform: 'translateX(-50%)',
          zIndex: 50,
        }}
        className="flex items-center gap-0.5 px-1.5 py-1.5 bg-stone-900 rounded-xl shadow-xl"
      >
        <ToolbarButton icon={Pin} label="Knowledge Pin" onClick={onPin} />
        <div className="w-px h-5 bg-stone-700" />
        <ToolbarButton icon={HelpCircle} label="Ask Question" onClick={onAskQuestion} />
        <div className="w-px h-5 bg-stone-700" />
        <ToolbarButton icon={Sparkles} label="Ask AI" onClick={onAskAI} />
      </motion.div>
    </AnimatePresence>
  );
};

const ToolbarButton: React.FC<{
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}> = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white hover:bg-stone-800 transition-colors whitespace-nowrap"
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);

export default FloatingSelectionToolbar;
