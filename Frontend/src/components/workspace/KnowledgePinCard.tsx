import React, { useState } from 'react';
import { Heart, MessageCircle, MapPin, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import type { PinType, KnowledgePin } from '../../types/workspace';
import { togglePinLike, deletePin } from '../../services/socialService';
import type { BackendUser } from '../../services/authService';

interface KnowledgePinCardProps {
  pin: KnowledgePin;
  compact?: boolean;
  isActive?: boolean;
  showLocateAction?: boolean;
  currentUser?: BackendUser | null;
  onPinMutate?: (pin: KnowledgePin | { id: string; deleted: boolean }) => void;
  onClick?: () => void;
}

const pinTypeConfig: Record<PinType, { label: string; emoji: string; color: string }> = {
  memory_trick: { label: 'Memory Trick', emoji: '🧠', color: 'bg-purple-50 text-purple-700' },
  implementation_tip: { label: 'Implementation Tip', emoji: '💡', color: 'bg-blue-50 text-blue-700' },
  exam_hint: { label: 'Exam Tip', emoji: '📝', color: 'bg-amber-50 text-amber-700' },
  warning: { label: 'Warning', emoji: '⚠️', color: 'bg-rose-50 text-rose-700' },
  explanation: { label: 'Explanation', emoji: '📖', color: 'bg-teal-50 text-teal-700' },
  common_mistake: { label: 'Common Mistake', emoji: '❌', color: 'bg-orange-50 text-orange-700' },
  formula_tip: { label: 'Formula Tip', emoji: '📐', color: 'bg-indigo-50 text-indigo-700' },
  other: { label: 'Other', emoji: '📌', color: 'bg-stone-50 text-stone-700' },
};

const KnowledgePinCard: React.FC<KnowledgePinCardProps> = ({
  pin,
  compact = false,
  isActive = false,
  showLocateAction = false,
  currentUser,
  onPinMutate,
  onClick,
}) => {
  const typeConfig = pinTypeConfig[pin.type] ?? pinTypeConfig.other;
  const [liked, setLiked] = useState(pin.isLikedByMe ?? false);
  const [likeCount, setLikeCount] = useState(pin.likes);
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUser && pin.author.id && currentUser.id === pin.author.id;

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Optimistic update
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    try {
      const res = await togglePinLike(pin.id);
      setLiked(res.is_reacted);
      setLikeCount(res.new_count);
      onPinMutate?.({ ...pin, isLikedByMe: res.is_reacted, likes: res.new_count });
    } catch {
      // Rollback
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error('Failed to update like');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    // Optimistic: hide immediately
    setDeleting(true);
    const prevDeleting = false;
    try {
      await deletePin(pin.id);
      onPinMutate?.({ id: pin.id, deleted: true });
      toast.success('Pin deleted');
    } catch {
      setDeleting(prevDeleting);
      toast.error('Failed to delete pin');
    }
  };

  if (deleting) return null;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`w-full text-left rounded-xl border transition-all duration-200 ${
        isActive
          ? 'border-teal-200 bg-teal-50/50 ring-1 ring-teal-200/40'
          : 'border-stone-100 bg-white hover:border-stone-200 hover:premium-shadow'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div
        className="cursor-pointer"
        onClick={onClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">{typeConfig.emoji}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${typeConfig.color}`}>
            {typeConfig.label}
          </span>
        </div>

        {!compact && pin.anchorText && (
          <p className="text-xs text-stone-400 italic mb-2 line-clamp-1">"{pin.anchorText}"</p>
        )}

        <p className={`text-stone-700 leading-relaxed ${compact ? 'text-xs line-clamp-2' : 'text-sm'}`}>
          {pin.content}
        </p>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-[8px] font-bold text-stone-500">
            {pin.author.initials}
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {pin.author.name} · {pin.createdAt}
          </span>
        </div>
        <div className="flex items-center gap-2 text-stone-400">
          {showLocateAction && (
            <button
              onClick={(e) => { e.stopPropagation(); onClick?.(); }}
              className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
            >
              <MapPin className="w-3 h-3" />
              Locate
            </button>
          )}
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-xs transition-colors ${
              liked ? 'text-rose-500' : 'text-stone-400 hover:text-rose-400'
            }`}
            title={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-3 h-3 ${liked ? 'fill-rose-500' : ''}`} />
            {likeCount}
          </button>
          {pin.replies.length > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <MessageCircle className="w-3 h-3" />
              {pin.replies.length}
            </span>
          )}
          {isOwner && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 text-xs text-stone-300 hover:text-rose-500 transition-colors"
              title="Delete pin"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default KnowledgePinCard;
