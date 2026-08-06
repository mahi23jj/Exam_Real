import React, { useState } from 'react';
import type { FeedQuestion } from './feedTypes';
import type { Comment } from '../../types/workspace';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';
import ReplyCard from './ReplyCard';
import ReplyComposer from './ReplyComposer';
import StudyInContextButton from './StudyInContextButton';

const PAGE_SIZE = 5;

interface QuestionDetailProps {
  question: FeedQuestion;
}

const QuestionDetail: React.FC<QuestionDetailProps> = ({ question }) => {
  const [replies, setReplies] = useState<Comment[]>(question.replies);
  const [page, setPage] = useState(1);

  const visibleReplies = replies.slice(0, page * PAGE_SIZE);
  const hasMore = visibleReplies.length < replies.length;

  const handlePost = (content: string) => {
    const newReply: Comment = {
      id: `reply-${Date.now()}`,
      author: { id: 'me', name: 'Alex L.', initials: 'AL' },
      content,
      likes: 0,
      createdAt: 'Just now',
      replies: [],
    };
    setReplies(prev => [...prev, newReply]);
  };

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Header breadcrumb */}
      <div className="text-[11px] font-semibold text-stone-400 flex items-center gap-1.5">
        <span>{question.course}</span>
        <span className="text-stone-300">/</span>
        <span>{question.topic}</span>
      </div>

      {/* Author */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center text-[10px] font-bold text-sky-600">
          {question.author.initials}
        </div>
        <div>
          <p className="text-xs font-semibold text-stone-700">{question.author.name}</p>
          {question.author.department && (
            <p className="text-[10px] text-stone-400">{question.author.department}</p>
          )}
        </div>
        <span className="ml-auto text-[10px] text-stone-400">{question.postedAt}</span>
      </div>

      {/* Anchor text */}
      {question.anchorText && (
        <blockquote className="rounded-lg border-l-4 border-sky-300 bg-sky-50/40 px-4 py-3">
          <p className="text-xs text-stone-500 italic leading-relaxed">"{question.anchorText}"</p>
        </blockquote>
      )}

      {/* Question */}
      <p className="text-sm font-semibold text-stone-800 leading-snug">{question.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-4 pb-2 border-b border-stone-100">
        <LikeButton count={question.likes} liked={question.liked} />
        <SaveButton saved={question.saved} showLabel />
      </div>

      {/* Replies */}
      {replies.length > 0 ? (
        <div className="space-y-1 divide-y divide-stone-50">
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest pb-1">
            {replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}
          </p>
          {visibleReplies.map((r) => (
            <ReplyCard
              key={r.id}
              author={r.author}
              content={r.content}
              createdAt={r.createdAt}
              likes={r.likes}
              replies={r.replies ?? []}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="w-full text-center py-2 text-xs font-semibold text-teal-700 hover:text-teal-800 transition-colors"
            >
              Load more replies
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-stone-400 text-center py-2">
          No replies yet. Be the first to contribute.
        </p>
      )}

      {/* Reply composer */}
      <ReplyComposer onPost={handlePost} />

      {/* Study in Context */}
      <StudyInContextButton
        courseId={question.courseId}
        documentId={question.documentId}
        sectionId={question.sectionId}
        highlightText={question.anchorText}
      />
    </div>
  );
};

export default QuestionDetail;
