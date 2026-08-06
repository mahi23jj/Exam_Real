import React from 'react';
import { MessageCircle } from 'lucide-react';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';

interface FeedActionsProps {
  type: 'pin' | 'question';
  likes: number;
  liked?: boolean;
  saved?: boolean;
  replyCount?: number;
  onOpenDiscussion?: () => void;
  onLike?: (liked: boolean) => void;
  onSave?: (saved: boolean) => void;
}

const FeedActions: React.FC<FeedActionsProps> = ({
  type,
  likes,
  liked,
  saved,
  replyCount,
  onOpenDiscussion,
  onLike,
  onSave,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 sm:gap-3">
      <LikeButton count={likes} liked={liked} onToggle={onLike} size="sm" layout="stacked" />

      {type === 'question' && replyCount !== undefined ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDiscussion?.();
          }}
          className="flex w-12 flex-col items-center gap-0.5 rounded-2xl border border-stone-200 bg-white/70 px-2 py-2 text-stone-400 transition-all duration-200 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-[10px] font-semibold leading-none">{replyCount}</span>
        </button>
      ) : (
        <div className="flex w-12 flex-col items-center gap-0.5 rounded-2xl border border-stone-200 bg-white/50 px-2 py-2 text-stone-300">
          <MessageCircle className="h-4 w-4" />
          <span className="text-[10px] font-semibold leading-none">-</span>
        </div>
      )}

      <SaveButton saved={saved} onToggle={onSave} size="sm" showLabel={true} layout="stacked" />
    </div>
  );
};

export default FeedActions;
