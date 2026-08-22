import React from 'react';
import { Pin, HelpCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DocumentSelection } from '../../types/workspace';

interface FloatingSelectionToolbarProps {
  selection: DocumentSelection | null;
  onPin: () => void;
  onAskQuestion: () => void;
  onAskAI: () => void;
  onDismiss?: () => void;
}

const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  selection,
  onPin,
  onAskQuestion,
  onAskAI,
}) => {
  if (!selection) return null;

  const top = selection.rect.top - 44;
  const left = selection.rect.left + selection.rect.width / 2;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: Math.max(8, top),
          left,
          transform: 'translateX(-50%)',
          zIndex: 50,
        }}
        className="flex items-center gap-1 px-2 py-1.5 bg-white rounded-xl premium-shadow border border-stone-100"
      >
        <ToolbarButton icon={Pin} label="Knowledge Pin" onClick={onPin} />
        <div className="w-px h-6 bg-stone-100" />
        <ToolbarButton icon={HelpCircle} label="Ask Question" onClick={onAskQuestion} />
        <div className="w-px h-6 bg-stone-100" />
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
    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 whitespace-nowrap"
  >
    <Icon className="w-3.5 h-3.5 text-teal-600" />
    {label}
  </button>
);

export default FloatingSelectionToolbar;
