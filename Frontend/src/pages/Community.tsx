import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

import SearchBar from '../components/SearchBars';
import Tabs, { type TabItem } from '../components/ui/Tabs';
import UserCard, { type RecommendedStudent } from '../components/community/UserCard';
import EmptyState from '../components/community/EmptyState';
import AppLayout from '../components/layout/AppLayout';
import { listMyFollowing, listRecommendedUsers } from '../services/socialService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initialsFor } from '../utils/initials';
import { publicProfilePath } from '../utils/routes';

const PAGE_SIZE = 12;

type CommunityTabId = 'recommended' | 'following';

const Community = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<CommunityTabId>('recommended');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  const recommendations = useQuery({
    queryKey: ['community', 'recommendations', page],
    queryFn: () => listRecommendedUsers(page, PAGE_SIZE),
    enabled: activeTab === 'recommended',
  });

  // The follow list is a real endpoint with its own pagination and server-side
  // search, so it must not reuse the recommendation request.
  const following = useQuery({
    queryKey: ['community', 'following', page, searchQuery.trim()],
    queryFn: () => listMyFollowing(page, PAGE_SIZE, searchQuery.trim() || undefined),
    enabled: activeTab === 'following',
  });

  const normalizedQuery = searchQuery.trim().toLowerCase();

  // Recommended results are paginated by the server, so filter the page we got
  // rather than pretending the search covers every student.
  const recommendedStudents = useMemo<RecommendedStudent[]>(() => {
    const items = recommendations.data?.items ?? [];
    if (!normalizedQuery) return items;
    return items.filter((student) =>
      [student.full_name, student.department, ...(student.shared_courses ?? []).map((c) => c.title)]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [recommendations.data?.items, normalizedQuery]);

  const followedStudents = useMemo<RecommendedStudent[]>(
    () =>
      (following.data?.items ?? []).map((user) => ({
        id: user.id,
        full_name: user.full_name,
        picture: user.picture,
        department: user.department,
        is_following: user.is_following,
        follower_count: user.followers_count,
      })),
    [following.data?.items],
  );

  const isFollowingTab = activeTab === 'following';
  const students = isFollowingTab ? followedStudents : recommendedStudents;
  const activeQuery = isFollowingTab ? following : recommendations;
  const total = activeQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const tabsItems: TabItem<CommunityTabId>[] = [
    { id: 'recommended', label: 'Recommended', count: recommendations.data?.total },
    { id: 'following', label: 'Following', count: following.data?.total },
  ];

  // Other students always get the public profile page; the own-profile surface
  // is reached through the sidebar, never by clicking a card here.
  const openProfile = (userId: string) => {
    navigate(publicProfilePath(userId) ?? '/community');
  };

  return (
    <AppLayout activePage="Community">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center gap-6">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search students, departments, courses..."
            />
          </div>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Your profile"
            className="w-10 h-10 rounded-2xl bg-stone-200 border-2 border-white premium-shadow flex items-center justify-center text-xs font-bold text-stone-600 overflow-hidden"
          >
            {currentUser?.picture ? (
              <img src={currentUser.picture} alt="" className="h-full w-full object-cover" />
            ) : (
              initialsFor(currentUser?.full_name)
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-10 py-10">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 mb-2">
            Find Your Study Community
          </h1>
          <p className="text-stone-500 font-medium">
            Students from your department and the courses you follow.
          </p>
        </motion.section>

        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <Tabs activeTab={activeTab} onChange={setActiveTab} tabs={tabsItems} layoutId="communityTabs" />
          </div>

          {activeQuery.isLoading && (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-56 animate-pulse rounded-2xl bg-stone-100/60" />
              ))}
            </div>
          )}

          {activeQuery.isError && (
            <EmptyState
              title={`Could not load ${isFollowingTab ? 'your following list' : 'recommendations'}`}
              subtitle={activeQuery.error instanceof Error ? activeQuery.error.message : 'Please try again.'}
            />
          )}

          {!activeQuery.isLoading && !activeQuery.isError && students.length === 0 && (
            <EmptyState
              title={
                isFollowingTab
                  ? normalizedQuery
                    ? 'No one you follow matches that search'
                    : 'You are not following anyone yet'
                  : normalizedQuery
                    ? 'No students match your search'
                    : 'No recommendations yet'
              }
              subtitle={
                isFollowingTab
                  ? normalizedQuery
                    ? 'Try a different name or department.'
                    : 'Follow students from the Recommended tab and they will show up here.'
                  : normalizedQuery
                    ? 'Try a different name, department, or course.'
                    : 'Recommendations appear once your department is set or you follow a few courses.'
              }
              actionLabel={normalizedQuery ? undefined : isFollowingTab ? 'Explore students' : 'Browse courses'}
              onAction={
                normalizedQuery
                  ? undefined
                  : () => (isFollowingTab ? setActiveTab('recommended') : navigate('/courses'))
              }
            />
          )}

          {students.length > 0 && (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {students.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <UserCard user={student} onOpenProfile={openProfile} />
                </motion.div>
              ))}
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="mt-10 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="h-10 px-4 rounded-2xl border border-stone-200 text-[14px] font-semibold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-[14px] text-stone-500 font-medium">
                Page {activeQuery.data?.page ?? page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= totalPages}
                className="h-10 px-4 rounded-2xl border border-stone-200 text-[14px] font-semibold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
};

export default Community;