import React from 'react';
import type { FeedPin } from './feedTypes';
import type { PinType } from '../../types/workspace';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';
import StudyInContextButton from './StudyInContextButton';

const pinTypeConfig: Record<PinType, { label: string; color: string }> = {
  memory_trick: { label: 'Memory Trick', color: 'bg-purple-50 text-purple-700' },
  implementation_tip: { label: 'Implementation Tip', color: 'bg-blue-50 text-blue-700' },
  exam_hint: { label: 'Exam Hint', color: 'bg-amber-50 text-amber-700' },
  warning: { label: 'Warning', color: 'bg-rose-50 text-rose-700' },
  explanation: { label: 'Explanation', color: 'bg-teal-50 text-teal-700' },
};

interface KnowledgePinDetailProps {
  pin: FeedPin;
}

const KnowledgePinDetail: React.FC<KnowledgePinDetailProps> = ({ pin }) => {
  const cfg = pinTypeConfig[pin.pinType];

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1.5 text-[11px] font-semibold text-stone-400">
          <span>{pin.course}</span>
          <span className="text-stone-300">/</span>
          <span>{pin.topic}</span>
        </div>
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
          {cfg.label}
        </span>
      </div>

      {/* Author + time */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-500">
          {pin.author.initials}
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-700">{pin.author.name}</p>
          {pin.author.department && (
            <p className="text-[10px] text-stone-400">{pin.author.department}</p>
          )}
        </div>
        <span className="ml-auto text-[10px] text-stone-400">{pin.postedAt}</span>
      </div>

      {/* Selected (anchor) text */}
      {pin.anchorText && (
        <blockquote className="rounded-lg border-l-4 border-teal-300 bg-teal-50/40 px-4 py-3">
          <p className="text-xs text-stone-500 italic leading-relaxed">"{pin.anchorText}"</p>
        </blockquote>
      )}

      {/* Full explanation */}
      <div>
        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">
          Explanation
        </p>
        <p className="text-sm text-stone-700 leading-relaxed">{pin.content}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-stone-100">
        <LikeButton count={pin.likes} liked={pin.liked} />
        <SaveButton saved={pin.saved} showLabel />
      </div>

      {/* Study in Context */}
      <StudyInContextButton
        courseId={pin.courseId}
        documentId={pin.documentId}
        sectionId={pin.sectionId}
        highlightText={pin.anchorText}
      />
    </div>
  );
};

export default KnowledgePinDetail;
