import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import type { FeedQuestion } from './feedTypes';
import type { QuestionReplyRead } from '../../services/socialService';
import { getQuestionReplies } from '../../services/socialService';
import { publicProfilePath } from '../../utils/routes';
import LikeButton from './LikeButton';
import SaveButton from './SaveButton';
import StudyInContextButton from './StudyInContextButton';
import ReplyThread from '../community/ReplyThread';

interface QuestionDetailProps {
  question: FeedQuestion;
  onReplied?: (questionId: string, delta: number) => void;
}

const QuestionDetail: React.FC<QuestionDetailProps> = ({ question, onReplied }) => {
  const [replies, setReplies] = useState<QuestionReplyRead[]>([]);
  const [total, setTotal] = useState(question.replyCount);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReplies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getQuestionReplies(question.id);
      setReplies(res.tree);
      setTotal(res.total_replies);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load replies.');
    } finally {
      setLoading(false);
    }
  }, [question.id]);

  useEffect(() => {
    loadReplies();
  }, [loadReplies]);

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-400">
        <span>{question.course}</span>
        <span className="text-stone-300">/</span>
        <span>{question.topic}</span>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold text-white">
          {question.author.initials}
        </div>
        <div>
          {publicProfilePath(question.author.id) ? (
            <Link
              to={publicProfilePath(question.author.id)!}
              className="text-xs font-semibold text-stone-700 transition-colors hover:text-teal-700 hover:underline"
            >
              {question.author.name}
            </Link>
          ) : (
            <p className="text-xs font-semibold text-stone-700">{question.author.name}</p>
          )}
          {question.author.department && (
            <p className="text-[10px] text-stone-400">{question.author.department}</p>
          )}
        </div>
        <span className="ml-auto text-[10px] text-stone-400">{question.postedAt}</span>
      </div>

      {question.anchorText && (
        <blockquote className="rounded-lg border-l-4 border-teal-300 bg-teal-50/40 px-4 py-3">
          <p className="text-xs italic leading-relaxed text-stone-500">{question.anchorText}</p>
        </blockquote>
      )}

      <p className="text-sm font-semibold leading-snug text-stone-800">{question.content}</p>

      <div className="flex items-center gap-4 border-b border-stone-100 pb-2">
        <LikeButton count={question.likes} liked={question.liked} />
        <SaveButton saved={question.saved} showLabel />
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-xs text-stone-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading replies
        </div>
      ) : error ? (
        <div className="py-4 text-center">
          <p className="text-xs text-rose-600">{error}</p>
          <button
            onClick={loadReplies}
            className="mt-2 text-xs font-semibold text-teal-700 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <ReplyThread
          questionId={question.id}
          replies={replies}
          totalReplies={total}
          onPosted={() => {
            onReplied?.(question.id, 1);
            loadReplies();
          }}
        />
      )}

      <StudyInContextButton source={question.source} />
    </div>
  );
};

export default QuestionDetail;