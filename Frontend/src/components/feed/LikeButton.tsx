import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LikeButtonProps {
  count: number;
  liked?: boolean;
  onToggle?: (liked: boolean) => void;
  size?: 'sm' | 'md';
  layout?: 'inline' | 'stacked';
}

const LikeButton: React.FC<LikeButtonProps> = ({
  count,
  liked = false,
  onToggle,
  size = 'md',
  layout = 'inline',
}) => {
  const [isLiked, setIsLiked] = useState(liked);
  const [displayCount, setDisplayCount] = useState(count);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isLiked;
    setIsLiked(next);
    setDisplayCount(c => next ? c + 1 : c - 1);
    onToggle?.(next);
  };

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const isStacked = layout === 'stacked';

  return (
    <button
      onClick={handleClick}
      className={`font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 ${
        isStacked
          ? 'flex w-16 flex-col items-center gap-1 rounded-3xl border border-white/70 bg-white/70 px-2 py-2 shadow-sm backdrop-blur-sm'
          : 'flex items-center gap-1.5'
      } ${isLiked ? 'text-rose-500' : 'text-stone-400 hover:text-rose-400'}`}
      aria-label={isLiked ? 'Unlike' : 'Like'}
    >
      <motion.div
        animate={{ scale: isLiked ? [1, 1.4, 1] : 1 }}
        transition={{ duration: 0.25 }}
      >
        <Heart
          className={`${isStacked ? 'h-7 w-7' : iconSize} transition-all duration-200 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`}
        />
      </motion.div>
      <AnimatePresence mode="wait">
        <motion.span
          key={displayCount}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.15 }}
          className={`${textSize} ${isStacked ? 'text-[11px] font-semibold' : ''}`}
        >
          {displayCount}
        </motion.span>
      </AnimatePresence>
    </button>
  );
};

export default LikeButton;
