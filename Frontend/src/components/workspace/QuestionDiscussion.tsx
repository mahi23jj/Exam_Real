import React, { useState, useEffect } from 'react';
import { Heart, ChevronDown, ChevronUp, Trash2, MapPin, Send, MessageCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import type { PublicQuestion, Comment } from '../../types/workspace';
import {
  toggleQuestionLike,
  deleteLearningQuestion,
  getQuestionReplies,
  createQuestionReply,
  deleteQuestionReply,
  toggleReplyLike,
  type QuestionReplyRead,
} from '../../services/socialService';
import type { BackendUser } from '../../services/authService';
import { formatRelativeTime } from '../../utils/format';

interface QuestionDiscussionProps {
  question: PublicQuestion;
  currentUser?: BackendUser | null;
  onQuestionMutate?: (q: PublicQuestion | { id: string; deleted: boolean }) => void;
  onLocate?: () => void;
  defaultExpanded?: boolean;
}

function mapReplyToComment(r: QuestionReplyRead): Comment {
  const name = r.author?.full_name?.trim() || 'Unknown';
  const initials =
    name.split(' ').filter(Boolean).map((p) => p[0]).join('').toUpperCase().slice(0, 2) || '?';
  return {
    id: r.id,
    author: { id: r.author_id, name, initials },
    content: r.content,
    likes: r.likes_count,
    isLikedByMe: r.is_liked_by_me,
    createdAt: formatRelativeTime(r.created_at) || 'Recently',
    replies: r.children?.map(mapReplyToComment) ?? [],
  };
}

const QuestionDiscussion: React.FC<QuestionDiscussionProps> = ({
  question,
  currentUser,
  onQuestionMutate,
  onLocate,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [liked, setLiked] = useState(question.isLikedByMe ?? false);
  const [likeCount, setLikeCount] = useState(question.likes);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const isOwner = currentUser && question.author.id && currentUser.id === question.author.id;

  useEffect(() => {
    if (expanded && !repliesLoaded) {
      setLoadingReplies(true);
      getQuestionReplies(question.id)
        .then((res) => {
          setReplies(res.tree.map(mapReplyToComment));
          setRepliesLoaded(true);
        })
        .catch(() => { /* silently skip */ })
        .finally(() => setLoadingReplies(false));
    }
  }, [expanded, repliesLoaded, question.id]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    try {
      const res = await toggleQuestionLike(question.id);
      setLiked(res.is_reacted);
      setLikeCount(res.new_count);
      onQuestionMutate?.({ ...question, isLikedByMe: res.is_reacted, likes: res.new_count });
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error('Failed to update like');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    setDeleted(true);
    try {
      await deleteLearningQuestion(question.id);
      onQuestionMutate?.({ id: question.id, deleted: true });
      toast.success('Question deleted');
    } catch {
      setDeleted(false);
      toast.error('Failed to delete question');
    }
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || submittingReply) return;
    setSubmittingReply(true);
    const optimisticId = `temp-${Date.now()}`;
    const optimisticReply: Comment = {
      id: optimisticId,
      author: {
        id: currentUser?.id ?? '',
        name: currentUser?.full_name || 'You',
        initials: (currentUser?.full_name ?? 'Y').slice(0, 2).toUpperCase(),
      },
      content: replyText.trim(),
      likes: 0,
      isLikedByMe: false,
      createdAt: 'Just now',
      replies: [],
    };
    setReplies((prev) => [...prev, optimisticReply]);
    setReplyText('');
    try {
      const created = await createQuestionReply(question.id, { content: optimisticReply.content });
      setReplies((prev) =>
        prev.map((r) => (r.id === optimisticId ? mapReplyToComment(created) : r))
      );
    } catch {
      setReplies((prev) => prev.filter((r) => r.id !== optimisticId));
      setReplyText(optimisticReply.content);
      toast.error('Failed to post reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  if (deleted) return null;

  return (
    <div className="rounded-xl border border-stone-100 bg-white overflow-hidden">
      {/* Header — click to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-stone-50/50 transition-colors"
      >
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-600">
          ?
        </div>
        <div className="flex-1 min-w-0">
          {question.anchorText && (
            <p className="text-xs text-stone-400 italic mb-1 line-clamp-1">"{question.anchorText}"</p>
          )}
          <p className="text-sm text-stone-700 font-medium line-clamp-2">{question.content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
            <span>{question.author.name}</span>
            <span className="flex items-center gap-1">
              <Heart className={`w-3 h-3 ${liked ? 'fill-rose-500 text-rose-500' : ''}`} />
              {likeCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {replies.length || question.replies.length} replies
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" />
        ) : (
          <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0 mt-1" />
        )}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-stone-50">
          {/* Action bar */}
          <div className="px-4 py-2 flex items-center gap-3 border-b border-stone-50">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
                liked ? 'text-rose-500' : 'text-stone-400 hover:text-rose-400'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-rose-500' : ''}`} />
              {liked ? 'Unlike' : 'Like'}
            </button>
            {onLocate && (
              <button
                onClick={(e) => { e.stopPropagation(); onLocate(); }}
                className="flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5" />
                Locate
              </button>
            )}
            {isOwner && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-1 text-xs text-stone-300 hover:text-rose-500 transition-colors ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>

          {/* Reply list */}
          <div className="px-4 pb-3">
            {loadingReplies ? (
              <p className="text-xs text-stone-400 py-3">Loading replies…</p>
            ) : (
              <ReplyThread
                replies={replies}
                questionId={question.id}
                currentUser={currentUser}
                onRepliesChange={setReplies}
              />
            )}

            {/* Reply composer */}
            {currentUser && (
              <form onSubmit={handleSubmitReply} className="flex gap-2 mt-3">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Add a reply…"
                  className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-300 placeholder:text-stone-400"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || submittingReply}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3 h-3" />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Nested reply thread ── */
interface ReplyThreadProps {
  replies: Comment[];
  questionId: string;
  currentUser?: BackendUser | null;
  depth?: number;
  onRepliesChange?: (updater: (prev: Comment[]) => Comment[]) => void;
}

const ReplyThread: React.FC<ReplyThreadProps> = ({
  replies,
  questionId,
  currentUser,
  depth = 0,
  onRepliesChange,
}) => {
  if (replies.length === 0 && depth === 0) {
    return <p className="text-xs text-stone-400 py-3">No replies yet. Be the first!</p>;
  }
  if (replies.length === 0) return null;

  const handleLikeReply = async (replyId: string, currentlyLiked: boolean) => {
    // Optimistic update helper applied recursively
    const toggleInTree = (items: Comment[]): Comment[] =>
      items.map((r) =>
        r.id === replyId
          ? { ...r, isLikedByMe: !currentlyLiked, likes: currentlyLiked ? r.likes - 1 : r.likes + 1 }
          : { ...r, replies: toggleInTree(r.replies ?? []) }
      );

    onRepliesChange?.((prev) => toggleInTree(prev));
    try {
      const res = await toggleReplyLike(questionId, replyId);
      const applyResult = (items: Comment[]): Comment[] =>
        items.map((r) =>
          r.id === replyId
            ? { ...r, isLikedByMe: res.is_reacted, likes: res.new_count }
            : { ...r, replies: applyResult(r.replies ?? []) }
        );
      onRepliesChange?.((prev) => applyResult(prev));
    } catch {
      onRepliesChange?.((prev) => toggleInTree(prev)); // rollback
      toast.error('Failed to update like');
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    const removeFromTree = (items: Comment[]): Comment[] =>
      items.filter((r) => r.id !== replyId).map((r) => ({ ...r, replies: removeFromTree(r.replies ?? []) }));

    onRepliesChange?.((prev) => removeFromTree(prev));
    try {
      await deleteQuestionReply(questionId, replyId);
    } catch {
      toast.error('Failed to delete reply');
      // Reload won't happen automatically — user can refresh
    }
  };

  return (
    <div className={`space-y-3 ${depth > 0 ? 'ml-4 pl-4 border-l border-stone-100 mt-3' : 'mt-3'}`}>
      {replies.map((reply) => (
        <div key={reply.id} className="group">
          <div className="flex items-start gap-2.5">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[9px] font-bold text-stone-500">
              {reply.author.initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-stone-700">{reply.author.name}</span>
                <span className="text-[10px] text-stone-400">{reply.createdAt}</span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">{reply.content}</p>
              <div className="flex items-center gap-3 mt-1">
                <button
                  onClick={() => handleLikeReply(reply.id, reply.isLikedByMe ?? false)}
                  className={`flex items-center gap-1 text-[10px] transition-colors ${
                    reply.isLikedByMe ? 'text-rose-500' : 'text-stone-400 hover:text-rose-400'
                  }`}
                >
                  <Heart className={`w-3 h-3 ${reply.isLikedByMe ? 'fill-rose-500' : ''}`} />
                  {reply.likes}
                </button>
                {currentUser && currentUser.id === reply.author.id && (
                  <button
                    onClick={() => handleDeleteReply(reply.id)}
                    className="text-[10px] text-stone-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {reply.replies && reply.replies.length > 0 && (
            <ReplyThread
              replies={reply.replies}
              questionId={questionId}
              currentUser={currentUser}
              depth={depth + 1}
              onRepliesChange={onRepliesChange}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default QuestionDiscussion;
