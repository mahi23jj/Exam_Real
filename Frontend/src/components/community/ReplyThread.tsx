import React, { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, CornerDownRight, Heart, Loader2 } from 'lucide-react';

import type { QuestionReplyRead } from '../../services/socialService';
import { createQuestionReply, toggleReplyLike } from '../../services/socialService';
import { buildReplyTree, type ReplyNode } from './replyTree';

interface ReplyThreadProps {
  questionId: string;
  /** Flat reply list from the API; nesting is derived from `parent_reply_id`. */
  replies: QuestionReplyRead[];
  totalReplies: number;
  onPosted?: () => void;
}

const initialsOf = (reply: QuestionReplyRead): string => {
  const name = reply.author?.full_name?.trim();
  if (!name) return '?';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
};

const ReplyItem: React.FC<{
  node: ReplyNode;
  depth: number;
  onReply: (parentReplyId: string, authorName: string) => void;
}> = ({ node, depth, onReply }) => {
  const { reply } = node;
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(reply.likes_count);
  const [busy, setBusy] = useState(false);

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setCount((c) => (next ? c + 1 : c - 1));
    setBusy(true);
    try {
      const res = await toggleReplyLike(reply.question_id, reply.id);
      // Trust the server's authoritative reaction state.
      setLiked(res.is_reacted);
      setCount(res.new_count);
    } catch {
      setLiked(!next);
      setCount((c) => (next ? c - 1 : c + 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-stone-100 pl-3' : ''}>
      <div className="flex items-start gap-2.5 py-3">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-[9px] font-bold text-stone-500">
          {initialsOf(reply)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs font-semibold text-stone-700">
              {reply.author?.full_name?.trim() || 'ExamReal Student'}
            </span>
            {reply.is_accepted_answer && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Answer
              </span>
            )}
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{reply.content}</p>

          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={handleLike}
              disabled={busy}
              className={`flex items-center gap-1 text-[10px] transition-colors disabled:opacity-60 ${
                liked ? 'text-rose-500' : 'text-stone-400 hover:text-rose-400'
              }`}
            >
              <Heart className={`h-3 w-3 ${liked ? 'fill-current' : ''}`} />
              {count}
            </button>
            <button
              onClick={() => onReply(reply.id, reply.author?.full_name ?? 'this reply')}
              className="flex items-center gap-1 text-[10px] text-stone-400 transition-colors hover:text-teal-600"
            >
              <CornerDownRight className="h-3 w-3" />
              Reply
            </button>
          </div>
        </div>
      </div>

      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <ReplyItem key={child.reply.id} node={child} depth={depth + 1} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
};

const ReplyThread: React.FC<ReplyThreadProps> = ({ questionId, replies, totalReplies, onPosted }) => {
  const [draft, setDraft] = useState('');
  const [parent, setParent] = useState<{ id: string; label: string } | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tree = useMemo(() => buildReplyTree(replies), [replies]);

  const beginReply = useCallback((parentReplyId: string, authorName: string) => {
    setParent({ id: parentReplyId, label: authorName });
    setDraft('');
    setError(null);
  }, []);

  const handlePost = async () => {
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    setError(null);
    try {
      await createQuestionReply(questionId, { content, parent_reply_id: parent?.id ?? null });
      setDraft('');
      setParent(null);
      onPosted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post your reply.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          {totalReplies === 1 ? '1 reply' : `${totalReplies} replies`}
        </h4>
      </div>

      {tree.length === 0 ? (
        <p className="py-4 text-sm text-stone-400">No replies yet. Start the discussion.</p>
      ) : (
        <div className="mt-1 divide-y divide-stone-50">
          {tree.map((node) => (
            <ReplyItem key={node.reply.id} node={node} depth={0} onReply={beginReply} />
          ))}
        </div>
      )}

      <div className="mt-2 border-t border-stone-100 pt-3">
        {parent && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-teal-50 px-2.5 py-1.5 text-[11px] text-teal-700">
            <span className="truncate">Replying to {parent.label}</span>
            <button onClick={() => setParent(null)} className="font-semibold hover:underline">
              Cancel
            </button>
          </div>
        )}

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder={parent ? 'Write your reply...' : 'Share your answer...'}
          className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-sm text-stone-700 placeholder-stone-400 focus:border-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-300"
        />

        {error && <p className="mt-1.5 text-[11px] text-rose-600">{error}</p>}

        <div className="mt-2 flex justify-end">
          <button
            onClick={handlePost}
            disabled={!draft.trim() || posting}
            className="flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {posting && <Loader2 className="h-3 w-3 animate-spin" />}
            Post
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReplyThread;