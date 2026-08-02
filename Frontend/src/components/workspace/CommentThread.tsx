import React from 'react';
import { Heart } from 'lucide-react';
import type { Comment } from '../../types/workspace';

interface CommentThreadProps {
  comments: Comment[];
  depth?: number;
}

const CommentThread: React.FC<CommentThreadProps> = ({ comments, depth = 0 }) => {
  if (comments.length === 0) return null;

  return (
    <div className={`space-y-3 ${depth > 0 ? 'ml-4 pl-4 border-l border-stone-100' : 'mt-3'}`}>
      {comments.map((comment) => (
        <div key={comment.id} className="group">
          <div className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[9px] font-bold text-stone-500">
              {comment.author.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-stone-700">{comment.author.name}</span>
                <span className="text-[10px] text-stone-400">{comment.createdAt}</span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">{comment.content}</p>
              <button className="mt-1 flex items-center gap-1 text-[10px] text-stone-400 hover:text-teal-600 transition-colors">
                <Heart className="w-3 h-3" />
                {comment.likes}
              </button>
            </div>
          </div>
          {comment.replies && comment.replies.length > 0 && (
            <CommentThread comments={comment.replies} depth={depth + 1} />
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentThread;
