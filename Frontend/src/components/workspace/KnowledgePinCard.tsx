import React from 'react';
import { Heart, MessageCircle, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PinType, KnowledgePin } from '../../types/workspace';

interface KnowledgePinCardProps {
  pin: KnowledgePin;
  compact?: boolean;
  isActive?: boolean;
  showLocateAction?: boolean;
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
  onClick,
}) => {
  const typeConfig = pinTypeConfig[pin.type] ?? pinTypeConfig.other;

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={`w-full text-left rounded-xl border transition-all duration-200 ${
        isActive
          ? 'border-teal-200 bg-teal-50/50 ring-1 ring-teal-200/40'
          : 'border-stone-100 bg-white hover:border-stone-200 hover:premium-shadow'
      } ${compact ? 'p-3' : 'p-4'}`}
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

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-[8px] font-bold text-stone-500">
            {pin.author.initials}
          </div>
          <span className="text-xs text-stone-500 font-medium">
            {pin.author.name} · {pin.createdAt}
          </span>
        </div>
        <div className="flex items-center gap-3 text-stone-400">
          {showLocateAction && (
            <span className="flex items-center gap-1 text-xs font-semibold text-teal-700">
              <MapPin className="w-3 h-3" />
              Locate
            </span>
          )}
          <span className="flex items-center gap-1 text-xs">
            <Heart className="w-3 h-3" />
            {pin.likes}
          </span>
          {pin.replies.length > 0 && (
            <span className="flex items-center gap-1 text-xs">
              <MessageCircle className="w-3 h-3" />
              {pin.replies.length}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
};

export default KnowledgePinCard;
