import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import AppLayout from '../components/layout/AppLayout';
import SearchBar from '../components/SearchBars';
import ContinueCard, { type ContinueItemType } from '../components/ContinueCard';
import Tabs, { type TabItem } from '../components/ui/Tabs';
import Pagination from '../components/ui/Pagination';
import CourseCard from '../components/CourseCard';
import EmptyState from '../components/EmptyState';
import CreateCourseModal from '../components/CreateCourseModal';
import { Shimmer, ShimmerText } from '../components/ui/Shimmer';
import { formatRelativeTime } from '../utils/format';
import {
  fetchContinueItems,
  fetchExploreCourses,
  fetchFollowingCourses,
  fetchMyCourses,
  toggleCourseFollow,
  trackContinueItem,
  type ContinueItem,
  type ExploreCourse,
  type FollowingCourse,
  type MyCourse,
} from '../services/courseService';

type TabId = 'explore' | 'following' | 'mine';

const PAGE_SIZE = 12;

const CourseCardShimmer = () => (
  <div className="w-full flex flex-col h-full overflow-hidden bg-white rounded-3xl border border-stone-200 p-5">
    <div className="flex-1 space-y-4">
      <div className="flex justify-between items-start gap-4">
        <ShimmerText className="w-16 h-5 rounded-full" />
      </div>
      <div className="space-y-2">
        <ShimmerText className="w-3/4 h-6" />
        <ShimmerText className="w-full h-4" />
        <ShimmerText className="w-5/6 h-4" />
      </div>
    </div>
    <div className="mt-auto pt-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shimmer className="w-8 h-8 rounded-full" />
        <ShimmerText className="w-20 h-4" />
      </div>
    </div>
  </div>
);

const continueTypeMap: Record<string, ContinueItemType> = {
  COURSE: 'course',
  DOCUMENT: 'document',
  PAST_EXAM: 'exam',
};

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('explore');
  const [modalOpen, setModalOpen] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const { data: continueItems = [] } = useQuery({
    queryKey: ['continue-items'],
    queryFn: () => fetchContinueItems(10).catch(() => []),
  });

  const { data: exploreData, isLoading: isLoadingExplore, error: exploreError } = useQuery({
    queryKey: ['courses', 'explore', page],
    queryFn: () => fetchExploreCourses({ page, size: PAGE_SIZE }),
    enabled: activeTab === 'explore',
  });

  const { data: followingData, isLoading: isLoadingFollowing, error: followingError } = useQuery({
    queryKey: ['courses', 'following', page],
    queryFn: () => fetchFollowingCourses({ page, size: PAGE_SIZE }),
    enabled: activeTab === 'following',
  });

  const { data: mineData, isLoading: isLoadingMine, error: mineError } = useQuery({
    queryKey: ['courses', 'mine', page],
    queryFn: () => fetchMyCourses({ page, size: PAGE_SIZE }),
    enabled: activeTab === 'mine',
  });

  const toggleFollowMutation = useMutation({
    mutationFn: (courseId: string) => toggleCourseFollow(courseId),
    onSuccess: (result, courseId) => {
      // Optimistically update explore cache if it exists
      queryClient.setQueriesData({ queryKey: ['courses', 'explore'] }, (oldData: any) => {
        if (!oldData?.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((c: any) =>
            c.id === courseId
              ? {
                  ...c,
                  is_following: result.is_following,
                  stats: { ...(c.stats ?? {}), followers_count: result.followers_count },
                }
              : c
          ),
        };
      });
      // Invalidate following cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['courses', 'following'] });
      
      toast.success(result.is_following ? `You're now following the course` : `Unfollowed the course`, {
        icon: <Sparkles className="w-4 h-4 text-teal-600" />,
        className: 'premium-shadow rounded-2xl border-none',
      });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not update follow');
    },
  });

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setPage(1);
  };

  const openCourse = useCallback(
    async (course: { id: string; title: string; category?: string | null }) => {
      try {
        await trackContinueItem({
          itemId: course.id,
          title: course.title,
          subtitle: course.category ?? null,
        });
        queryClient.invalidateQueries({ queryKey: ['continue-items'] });
      } catch {
        // Tracking is best-effort; never block navigation on it.
      }
      navigate(`/workspace/${course.id}`);
    },
    [navigate, queryClient],
  );

  const handleFollow = (course: ExploreCourse) => {
    toggleFollowMutation.mutate(course.id);
  };

  const matchesSearch = useCallback(
    (title: string, creator?: string | null, category?: string | null) => {
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [title, creator ?? '', category ?? ''].some((value) =>
        value.toLowerCase().includes(query),
      );
    },
    [search],
  );

  const visibleCards = useMemo(() => {
    if (activeTab === 'explore') {
      return (exploreData?.items ?? [])
        .filter((c) => matchesSearch(c.title, c.creator?.full_name, c.category))
        .map((course) => (
          <CourseCard
            key={course.id}
            variant="explore"
            title={course.title}
            description={course.description}
            creator={course.creator?.full_name}
            students={course.stats?.followers_count ?? 0}
            materials={course.stats?.materials_count ?? 0}
            exams={course.stats?.past_exams_count ?? 0}
            tag={course.category}
            isFollowing={course.is_following}
            isActive={course.is_active !== false}
            onFollow={() => handleFollow(course)}
            onOpen={() => void openCourse(course)}
          />
        ));
    }

    if (activeTab === 'following') {
      return (followingData?.items ?? [])
        .filter((c) => matchesSearch(c.title, c.creator?.full_name, c.category))
        .map((course) => (
          <CourseCard
            key={course.id}
            variant="following"
            title={course.title}
            description={course.description}
            creator={course.creator?.full_name}
            lastUpdated={
              course.latest_update?.updated_at
                ? formatRelativeTime(course.latest_update.updated_at)
                : null
            }
            tag={course.category}
            isFollowing
            isActive={course.is_active !== false}
            onOpen={() => void openCourse(course)}
          />
        ));
    }

    return (mineData?.items ?? [])
      .filter((c) => matchesSearch(c.title, 'You', c.category))
      .map((course) => (
        <CourseCard
          key={course.id}
          variant="mine"
          title={course.title}
          description={course.description}
          creator="You"
          students={course.stats?.followers_count ?? 0}
          materials={course.stats?.materials_count ?? 0}
          exams={course.stats?.past_exams_count ?? 0}
          tag={course.category}
          isActive={course.is_active !== false}
          onOpen={course.is_active === false ? undefined : () => void openCourse(course)}
          onManage={() => navigate(`/course/${course.id}`)}
        />
      ));
  }, [activeTab, exploreData, followingData, mineData, matchesSearch, openCourse, navigate]);

  const activeTotal = activeTab === 'explore' 
    ? exploreData?.total 
    : activeTab === 'following' 
      ? followingData?.total 
      : mineData?.total;

  const isLoading = activeTab === 'explore' 
    ? isLoadingExplore 
    : activeTab === 'following' 
      ? isLoadingFollowing 
      : isLoadingMine;

  const activeError = activeTab === 'explore' 
    ? exploreError 
    : activeTab === 'following' 
      ? followingError 
      : mineError;

  const tabsItems: TabItem<TabId>[] = [
    { id: 'explore', label: 'Explore', count: activeTab === 'explore' ? activeTotal : undefined },
    { id: 'following', label: 'Following', count: activeTab === 'following' ? activeTotal : undefined },
    { id: 'mine', label: 'My Courses', count: activeTab === 'mine' ? activeTotal : undefined },
  ];

  return (
    <AppLayout>
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center gap-6">
          <div className="flex-1">
            <SearchBar value={search} onChange={setSearch} />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setModalOpen(true)}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-teal-700 text-white rounded-2xl text-sm font-bold hover:bg-teal-800 transition-all premium-shadow"
            >
              <Plus className="w-4 h-4" />
              Create Course
            </button>
            <div className="w-10 h-10 rounded-2xl bg-stone-200 border-2 border-white premium-shadow flex items-center justify-center text-xs font-bold text-stone-600">
              AL
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-10 py-10">
        {/* Hero Greeting */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 mb-2">{greeting}.</h1>
          <p className="text-stone-500 font-medium">What would you like to open today?</p>
        </motion.section>

        {/* Continue Section */}
        {continueItems.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse-soft" />
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Continue</h2>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar snap-x -mx-6 px-6">
              {continueItems.map((item) => (
                <ContinueCard
                  key={`${item.id}-${item.last_opened_at ?? ''}`}
                  type={continueTypeMap[item.type ?? 'COURSE'] ?? 'course'}
                  title={item.title ?? 'Untitled'}
                  subtitle={item.subtitle}
                  meta={formatRelativeTime(item.last_opened_at)}
                  onClick={() => void openCourse({ id: item.id, title: item.title ?? 'Untitled', category: item.subtitle })}
                />
              ))}
            </div>
          </section>
        )}

        {/* Tabs & Content */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <Tabs activeTab={activeTab} onChange={handleTabChange} tabs={tabsItems} layoutId="courseTabs" />
            <div className="sm:hidden">
              <button
                onClick={() => setModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-teal-700 text-white rounded-2xl text-sm font-bold"
              >
                <Plus className="w-4 h-4" />
                Create Course
              </button>
            </div>
          </div>

          {activeError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm font-semibold text-rose-600 mb-4">{String(activeError)}</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['courses', activeTab] })}
                className="px-6 py-3 bg-teal-700 text-white rounded-2xl font-bold text-sm"
              >
                Try again
              </button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <CourseCardShimmer key={i} />
              ))}
            </div>
          ) : (
            <>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab + search + page}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8"
                >
                  {visibleCards.length > 0 ? (
                    visibleCards
                  ) : (
                    <div className="col-span-full">
                      <EmptyState
                        illustration={activeTab}
                        title={search ? 'No matches found' : 'Nothing here yet'}
                        description={
                          search
                            ? 'Try a different search term.'
                            : 'Start by exploring or creating your first course.'
                        }
                        action={
                          activeTab === 'mine' && (
                            <button
                              onClick={() => setModalOpen(true)}
                              className="px-6 py-3 bg-teal-700 text-white rounded-2xl font-bold text-sm"
                            >
                              Create Course
                            </button>
                          )
                        }
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              <Pagination page={page} size={PAGE_SIZE} total={activeTotal ?? 0} onChange={setPage} />
            </>
          )}
        </section>
      </main>

      <CreateCourseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(course) => {
          setModalOpen(false);
          toast.success(`Created ${course.title}`);
          if (activeTab === 'mine' && page === 1) {
            queryClient.invalidateQueries({ queryKey: ['courses', 'mine'] });
          } else {
            setActiveTab('mine');
            setPage(1);
          }
        }}
      />
    </AppLayout>
  );
};

export default Courses;
