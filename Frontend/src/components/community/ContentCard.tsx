import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Quote } from 'lucide-react';

import type { FeedItem, FeedPin, FeedQuestion } from '../feed/feedTypes';
import { publicProfilePath } from '../../utils/routes';
import type { PinType } from '../../types/workspace';
import LikeButton from '../feed/LikeButton';
import SaveButton from '../feed/SaveButton';
import StudyInContextButton from '../feed/StudyInContextButton';

const pinTypeConfig: Record<PinType, { label: string; className: string }> = {
  memory_trick: { label: 'Memory Trick', className: 'bg-purple-50 text-purple-700' },
  implementation_tip: { label: 'Implementation Tip', className: 'bg-blue-50 text-blue-700' },
  exam_hint: { label: 'Exam Hint', className: 'bg-amber-50 text-amber-700' },
  warning: { label: 'Warning', className: 'bg-rose-50 text-rose-700' },
  explanation: { label: 'Explanation', className: 'bg-teal-50 text-teal-700' },
  common_mistake: { label: 'Common Mistake', className: 'bg-orange-50 text-orange-700' },
  formula_tip: { label: 'Formula Tip', className: 'bg-emerald-50 text-emerald-700' },
  other: { label: 'Note', className: 'bg-stone-100 text-stone-700' },
};

interface ContentCardProps {
  item: FeedItem;
  /** Opens the discussion modal (questions only). */
  onOpenDiscussion?: (question: FeedQuestion) => void;
  onLike?: (item: FeedItem, liked: boolean) => void;
  onSave?: (item: FeedItem, saved: boolean) => void;
}

/**
 * Dense, non-snapping card shared by the feed, profiles and the discussion
 * modal so a post looks identical wherever it appears.
 */
const ContentCard: React.FC<ContentCardProps> = ({ item, onOpenDiscussion, onLike, onSave }) => {
  const isQuestion = item.type === 'question';
  const pin = isQuestion ? null : (item as FeedPin);
  const question = isQuestion ? (item as FeedQuestion) : null;

  const typeLabel = pin ? pinTypeConfig[pin.pinType].label : 'Question';
  const typeClass = pin ? pinTypeConfig[pin.pinType].className : 'bg-teal-50 text-teal-700';
  const replyCount = question?.replyCount ?? 0;
  const authorHref = publicProfilePath(item.author.id);
  // Clicking anywhere on a question card opens the discussion modal; pins have
  // no modal so their cards stay inert. Footer controls stop propagation.
  const openDiscussion = question && onOpenDiscussion ? () => onOpenDiscussion(question) : undefined;

  return (
    <article
      onClick={openDiscussion}
      className={`group rounded-2xl border border-stone-200 bg-white p-4 transition-colors duration-200 hover:border-teal-200 hover:bg-teal-50/20 sm:p-5 ${
        openDiscussion ? 'cursor-pointer' : ''
      }`}
    >
      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[11px] font-bold text-white">
          {item.author.initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            {authorHref ? (
              <Link
                to={authorHref}
                onClick={(e) => e.stopPropagation()}
                className="text-sm font-semibold text-stone-800 transition-colors hover:text-teal-700 hover:underline"
              >
                {item.author.name}
              </Link>
            ) : (
              <span className="text-sm font-semibold text-stone-800">{item.author.name}</span>
            )}
            {item.author.department && (
              <span className="text-xs text-stone-400">{item.author.department}</span>
            )}
            <span className="text-xs text-stone-300">&middot;</span>
            <span className="text-xs text-stone-400">{item.postedAt}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500">
            <span className={`rounded-full px-2 py-0.5 font-semibold ${typeClass}`}>{typeLabel}</span>
            {item.course && <span>{item.course}</span>}
            {item.topic && (
              <>
                <span className="text-stone-300">&middot;</span>
                <span>{item.topic}</span>
              </>
            )}
          </div>
        </div>
      </header>

      {item.anchorText && (
        <blockquote className="mt-3 flex gap-2 rounded-xl border-l-2 border-teal-200 bg-stone-50 px-3 py-2 text-[13px] italic leading-6 text-stone-500">
          <Quote className="mt-1 h-3 w-3 shrink-0 text-stone-300" />
          <span className="line-clamp-2">{item.anchorText}</span>
        </blockquote>
      )}

      <p
        className={`mt-3 text-[15px] leading-7 text-stone-700 ${isQuestion ? 'font-semibold text-stone-800' : ''}`}
      >
        {item.content}
      </p>

      <footer className="mt-4 flex flex-wrap items-center gap-1 border-t border-stone-100 pt-3">
        <LikeButton
          count={item.likes}
          liked={item.liked}
          size="sm"
          onToggle={(next) => onLike?.(item, next)}
        />

        {isQuestion && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (question) onOpenDiscussion?.(question);
            }}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>{replyCount}</span>
            <span className="text-stone-400">
              {replyCount === 1 ? 'reply' : 'replies'}
            </span>
          </button>
        )}

        <div className="flex-1" />

        <StudyInContextButton source={item.source} variant="compact" />
        <SaveButton
          saved={item.saved}
          size="sm"
          showLabel={false}
          onToggle={(next) => onSave?.(item, next)}
        />
      </footer>
    </article>
  );
};

export default ContentCard;