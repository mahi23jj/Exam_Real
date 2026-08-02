import React, { useState } from 'react';
import { Heart, ChevronDown, ChevronUp } from 'lucide-react';
import CommentThread from './CommentThread';
import type { Comment } from '../../types/workspace';

interface QuestionDiscussionProps {
  anchorText: string;
  content: string;
  author: { name: string; initials: string };
  likes: number;
  replies: Comment[];
  defaultExpanded?: boolean;
}

const QuestionDiscussion: React.FC<QuestionDiscussionProps> = ({
  anchorText,
  content,
  author,
  likes,
  replies,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl border border-stone-100 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-stone-50/50 transition-colors"
      >
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-600">
          ?
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-stone-400 italic mb-1 line-clamp-1">"{anchorText}"</p>
          <p className="text-sm text-stone-700 font-medium line-clamp-2">{content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
            <span>{author.name}</span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {likes}
            </span>
            <span>{replies.length} replies</span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" />
        )}
      </button>

      {expanded && replies.length > 0 && (
        <div className="px-4 pb-4 border-t border-stone-50">
          <CommentThread comments={replies} />
        </div>
      )}
    </div>
  );
};

export default QuestionDiscussion;
