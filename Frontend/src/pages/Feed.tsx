import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Hash, HelpCircle, Users, Globe, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

import AppLayout from '../components/layout/AppLayout';

import type { FeedItem } from '../components/feed/feedTypes';
import ContentCard from '../components/community/ContentCard';
import FeedContextPanel from '../components/feed/FeedContextPanel';
import FeedSkeleton from '../components/feed/FeedSkeleton';
import EmptyFeedState from '../components/feed/EmptyFeedState';
import FollowingRail from '../components/feed/FollowingRail';

import {
  togglePinLike,
  togglePinSave,
  toggleQuestionLike,
  toggleQuestionSave,
  listFeed,
  type FeedContentType,
  type FeedScope,
} from '../services/socialService';
import { mapFeedItemToCard } from '../utils/socialMappers';

type TabOption = FeedContentType;

const tabOptions: { value: TabOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pins', label: 'Knowledge Pins' },
  { value: 'questions', label: 'Questions' },
];

const tabIcons: Record<TabOption, React.ReactNode> = {
  all: <Sparkles className="h-3.5 w-3.5" />,
  pins: <Hash className="h-3.5 w-3.5" />,
  questions: <HelpCircle className="h-3.5 w-3.5" />,
};

const scopeOptions: { value: FeedScope; label: string; icon: React.ReactNode }[] = [
  { value: 'everyone', label: 'Everyone', icon: <Globe className="h-3 w-3" /> },
  { value: 'following', label: 'Following', icon: <Users className="h-3 w-3" /> },
];

const PAGE_SIZE = 20;

const Feed: React.FC = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabOption>('all');
  // The Feed is for content from people you follow, so it defaults to the
  // following scope; "Everyone" on the rail is the combined state.
  const [scope, setScope] = useState<FeedScope>('following');
  // Person filter: null means "Everyone" (all followed people combined).
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  // Bumped whenever the feed reloads so the rail's follower counts stay in step.
  const [railKey, setRailKey] = useState(0);

  // Normal page scrolling; the scroll position survives opening the panel.
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    listFeed({ scope, type: tab, authorId: selectedAuthorId, page: 1, size: PAGE_SIZE })
      .then((response) => {
        if (cancelled) return;
        setItems(response.items.map(mapFeedItemToCard).filter(Boolean) as FeedItem[]);
        setPage(1);
        setHasMore(response.has_more);
        setRailKey((k) => k + 1);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Could not load the feed.');
        setItems([]);
        setHasMore(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, tab, selectedAuthorId]);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const next = page + 1;
    setLoadingMore(true);
    listFeed({ scope, type: tab, authorId: selectedAuthorId, page: next, size: PAGE_SIZE })
      .then((response) => {
        const mapped = response.items.map(mapFeedItemToCard).filter(Boolean) as FeedItem[];
        setItems((prev) => {
          // Guard against duplicates if a page is requested twice.
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...mapped.filter((i) => !seen.has(i.id))];
        });
        setPage(next);
        setHasMore(response.has_more);
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : 'Could not load more posts.');
      })
      .finally(() => setLoadingMore(false));
  }, [hasMore, loading, loadingMore, page, scope, tab, selectedAuthorId]);

  // Infinite scroll: prefetch when the user nears the bottom.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node || loading || !hasMore) return;

    const onScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (distance < 600) loadMore();
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [hasMore, loadMore, loading]);

  const activeItem = items.find((item) => item.id === activeItemId) ?? null;
  const handleOpenItem = (item: FeedItem) => setActiveItemId(item.id);
  const handleClose = () => setActiveItemId(null);

  /** Patches one item in place, preserving list order. */
  const patchItem = useCallback((id: string, patch: Partial<FeedItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? ({ ...item, ...patch } as FeedItem) : item)));
  }, []);

  const handleLike = useCallback(
    async (item: FeedItem, liked: boolean) => {
      patchItem(item.id, { liked });
      try {
        const res =
          item.type === 'pin'
            ? await togglePinLike(item.id)
            : await toggleQuestionLike(item.id);
        // Trust the server's authoritative count rather than the optimistic one.
        patchItem(item.id, { liked: res.is_reacted, likes: res.new_count });
      } catch (e) {
        patchItem(item.id, { liked: !liked });
        toast.error(e instanceof Error ? e.message : 'Could not update like.');
      }
    },
    [patchItem],
  );

  const handleSave = useCallback(
    async (item: FeedItem, saved: boolean) => {
      patchItem(item.id, { saved });
      try {
        const res =
          item.type === 'pin'
            ? await togglePinSave(item.id)
            : await toggleQuestionSave(item.id);
        patchItem(item.id, { saved: res.is_saved });
      } catch (e) {
        patchItem(item.id, { saved: !saved });
        toast.error(e instanceof Error ? e.message : 'Could not update saved items.');
      }
    },
    [patchItem],
  );

  // QuestionDetail owns reply posting and reloads its own thread; the feed only
  // needs to keep the card's reply count honest.
  const handleReplied = useCallback((questionId: string, delta: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.type === 'question' && item.id === questionId
          ? { ...item, replyCount: Math.max(0, item.replyCount + delta) }
          : item,
      ),
    );
  }, []);

  // Changing tab, scope or selected person must not strand the user mid-page.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab, scope, selectedAuthorId]);

  return (
    <AppLayout activePage="Feed">
      <div className="flex h-full flex-1 min-w-0 flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-white/60 bg-white/70 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-4 md:px-6 lg:px-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-700">Feed</p>
              <h1 className="mt-1 text-base font-semibold text-stone-800 md:text-lg">
                Discover what others are learning
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-stone-200 bg-white p-1 shadow-sm">
              {scopeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScope(opt.value)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    scope === opt.value
                      ? 'bg-teal-700 text-white'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mx-auto max-w-[1180px] px-5 pb-4 md:px-6 lg:px-8">
            <div className="glass-panel flex gap-2 rounded-[28px] px-2 py-2 shadow-sm">
              {tabOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTab(opt.value)}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    tab === opt.value ? 'text-teal-800' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <span className={tab === opt.value ? 'text-teal-700' : 'text-stone-400'}>
                    {tabIcons[opt.value]}
                  </span>
                  <span>{opt.label}</span>
                  {tab === opt.value && (
                    <motion.span
                      layoutId="feed-filter-indicator"
                      className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-teal-700"
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="relative flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.06),transparent_24%),linear-gradient(180deg,#fafaf9_0%,#fefefe_40%,#fafaf9_100%)] px-4 py-6 md:px-6 lg:px-8"
        >
          <div className="mx-auto flex w-full max-w-[1120px] items-start gap-6">
            <main className="min-w-0 flex-1">
              {loading ? (
                <FeedSkeleton />
              ) : error ? (
                <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
                  <p className="text-sm text-stone-500">{error}</p>
                  <button
                    onClick={() => setTab((t) => t)}
                    className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    Retry
                  </button>
                </div>
              ) : items.length === 0 ? (
                <EmptyFeedState scope={scope} selectedAuthorId={selectedAuthorId} />
              ) : (
                <>
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={`${scope}-${tab}-${selectedAuthorId ?? 'everyone'}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-3 md:gap-4"
                    >
                      {items.map((item) => (
                        <motion.section key={item.id}>
                          <ContentCard
                            item={item}
                            onOpenDiscussion={(q) => handleOpenItem(q)}
                            onLike={handleLike}
                            onSave={handleSave}
                          />
                        </motion.section>
                      ))}
                    </motion.div>
                  </AnimatePresence>

                  <div className="flex items-center justify-center py-6">
                    {loadingMore ? (
                      <span className="flex items-center gap-2 text-xs text-stone-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
                      </span>
                    ) : hasMore ? (
                      <button
                        onClick={loadMore}
                        className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600 shadow-sm hover:border-teal-200 hover:text-teal-700"
                      >
                        Load more
                      </button>
                    ) : (
                      <span className="text-[11px] text-stone-400">You're all caught up</span>
                    )}
                  </div>
                </>
              )}
            </main>

            <FollowingRail
              refreshKey={railKey}
              selectedAuthorId={selectedAuthorId}
              onSelectAuthor={setSelectedAuthorId}
            />
          </div>
        </div>

<FeedContextPanel
            item={activeItem}
            onReplied={handleReplied}
            onClose={handleClose}
          />
      </div>
    </AppLayout>
  );
};

export default Feed;
