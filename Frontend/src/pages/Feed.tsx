import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Hash, HelpCircle } from 'lucide-react';

import AppLayout from '../components/layout/AppLayout';

import { mockFeedItems } from '../components/feed/feedData';
import type { FeedItem } from '../components/feed/feedTypes';
import KnowledgePinFeedCard from '../components/feed/KnowledgePinFeedCard';
import QuestionFeedCard from '../components/feed/QuestionFeedCard';
import FeedContextPanel from '../components/feed/FeedContextPanel';
import FeedSkeleton from '../components/feed/FeedSkeleton';
import EmptyFeedState from '../components/feed/EmptyFeedState';

type FilterOption = 'all' | 'pins' | 'questions';

const filterOptions: { value: FilterOption; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pins', label: 'Knowledge Pins' },
  { value: 'questions', label: 'Questions' },
];

const filterIcons: Record<FilterOption, React.ReactNode> = {
  all: <Sparkles className="h-3.5 w-3.5" />,
  pins: <Hash className="h-3.5 w-3.5" />,
  questions: <HelpCircle className="h-3.5 w-3.5" />,
};

const Feed: React.FC = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');

  // Preserve scroll position when context panel opens
  const scrollRef = useRef<HTMLDivElement>(null);

  // Simulate API fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setItems(mockFeedItems);
      setLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  const activeItem = items.find((item) => item.id === activeItemId) ?? null;

  const handleOpenItem = (item: FeedItem) => {
    setActiveItemId(item.id);
  };

  const handleClose = () => setActiveItemId(null);

  const handleAddReply = (questionId: string, content: string) => {
    const newReply = {
      id: `reply-${Date.now()}`,
      author: { id: 'me', name: 'Alex L.', initials: 'AL' },
      content,
      likes: 0,
      createdAt: 'Just now',
      replies: [],
    };

    setItems(prev => prev.map((item) => {
      if (item.type !== 'question' || item.id !== questionId) return item;
      return {
        ...item,
        replies: [...item.replies, newReply],
        replyCount: item.replyCount + 1,
      };
    }));
  };

  const filtered = items.filter(item => {
    if (filter === 'pins') return item.type === 'pin';
    if (filter === 'questions') return item.type === 'question';
    return true;
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [filter]);

  return (
    <AppLayout activePage="Feed">
      <div className="flex h-full flex-1 min-w-0 flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-white/60 bg-white/70 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-5 py-4 md:px-6 lg:px-8">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-700">Feed</p>
              <h1 className="mt-1 text-base font-semibold text-stone-800 md:text-lg">Discover what others are learning</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 shadow-sm">
                Discovery mode
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-teal-700 text-[11px] font-bold text-white shadow-sm">
                AL
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-[1180px] px-5 pb-4 md:px-6 lg:px-8">
            <div className="glass-panel flex gap-2 rounded-[28px] px-2 py-2 shadow-sm">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-[22px] px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    filter === opt.value ? 'text-teal-800' : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  <span className={filter === opt.value ? 'text-teal-700' : 'text-stone-400'}>{filterIcons[opt.value]}</span>
                  <span>{opt.label}</span>
                  {filter === opt.value && (
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
          className="relative flex-1 overflow-y-auto no-scrollbar scroll-smooth snap-y snap-mandatory overscroll-contain bg-[radial-gradient(circle_at_top,rgba(20,184,166,0.06),transparent_24%),linear-gradient(180deg,#fafaf9_0%,#fefefe_40%,#fafaf9_100%)] px-4 py-6 md:px-6 lg:px-8"
        >
          <main className="mx-auto flex min-h-full w-full max-w-[1120px] flex-col justify-center">
            {loading ? (
              <FeedSkeleton />
            ) : filtered.length === 0 ? (
              <EmptyFeedState />
            ) : (
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={filter}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-0"
                >
                  {filtered.map((item) => (
                    <motion.section
                      key={item.id}
                      className="flex min-h-full snap-center items-center justify-center py-2 md:py-3"
                    >
                      {item.type === 'pin' ? (
                        <KnowledgePinFeedCard pin={item} onOpenContext={() => handleOpenItem(item)} />
                      ) : (
                        <QuestionFeedCard
                          question={item}
                          onOpenContext={() => handleOpenItem(item)}
                        />
                      )}
                    </motion.section>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
        </div>

        <FeedContextPanel
          item={activeItem}
          onAddReply={handleAddReply}
          onClose={handleClose}
        />
      </div>
    </AppLayout>
  );
};

export default Feed;
