import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { motion } from 'framer-motion';

interface SaveButtonProps {
  saved?: boolean;
  onToggle?: (saved: boolean) => void;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  layout?: 'inline' | 'stacked';
}

const SaveButton: React.FC<SaveButtonProps> = ({
  saved = false,
  onToggle,
  size = 'md',
  showLabel = true,
  layout = 'inline',
}) => {
  const [isSaved, setIsSaved] = useState(saved);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isSaved;
    setIsSaved(next);
    onToggle?.(next);
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const isStacked = layout === 'stacked';

  return (
    <button
      onClick={handleClick}
      className={`font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 ${
        isStacked
          ? 'flex w-16 flex-col items-center gap-1 rounded-3xl border border-white/70 bg-white/70 px-2 py-2 shadow-sm backdrop-blur-sm'
          : 'flex items-center gap-1.5'
      } ${isSaved ? 'text-teal-700' : 'text-stone-400 hover:text-teal-600'}`}
      aria-label={isSaved ? 'Unsave' : 'Save'}
    >
      <motion.div
        animate={{ scale: isSaved ? [1, 1.3, 1] : 1 }}
        transition={{ duration: 0.2 }}
      >
        <Bookmark
          className={`${isStacked ? 'h-7 w-7' : iconSize} transition-all duration-200 ${isSaved ? 'fill-teal-700 text-teal-700' : ''}`}
        />
      </motion.div>
      {showLabel && (
        <span className={`${textSize} ${isStacked ? 'text-[11px] font-semibold' : ''}`}>
          {isSaved ? 'Saved' : 'Save'}
        </span>
      )}
    </button>
  );
};

export default SaveButton;
