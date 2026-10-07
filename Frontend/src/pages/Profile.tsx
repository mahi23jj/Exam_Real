import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import ProfileHeader from '../components/profile/ProfileHeader';
import type { UserProfileData } from '../components/profile/ProfileHeader';
import ProfileEditor from '../components/profile/ProfileEditor';
import StatsCards from '../components/profile/StatsCards';
import type { ProfileStats } from '../components/profile/StatsCards';
import Tabs, { type TabItem } from '../components/ui/Tabs';
import EmptyState from '../components/community/EmptyState';
import ContentCard from '../components/community/ContentCard';
import FeedContextPanel from '../components/feed/FeedContextPanel';
import AppLayout from '../components/layout/AppLayout';
import type { FeedAuthor, FeedItem, FeedQuestion } from '../components/feed/feedTypes';
import { mapPinToCard, mapQuestionToCard } from '../utils/socialMappers';
import { getCommunityProfile } from '../services/socialService';
import { useAuth } from '../context/AuthContext';

const PostsContent: React.FC<{
  items: FeedItem[];
  emptyTitle: string;
  emptySubtitle: string;
  onOpenDiscussion: (question: FeedQuestion) => void;
}> = ({ items, emptyTitle, emptySubtitle, onOpenDiscussion }) => {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} subtitle={emptySubtitle} />;
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.04 }}
        >
          <ContentCard item={item} onOpenDiscussion={onOpenDiscussion} />
        </motion.div>
      ))}
    </div>
  );
};

type ProfileTabId = 'courses' | 'pins' | 'questions';

const PAGE_SIZE = 10;

const CoursesContent = ({
  courses,
}: {
  courses: { id: string; title: string; code?: string | null; category?: string | null }[];
}) => {
  if (courses.length === 0) {
    return <EmptyState title="No courses yet" subtitle="Courses this student follows or created show up here." />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {courses.map((course, index) => (
        <motion.div
          key={course.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className="p-5 bg-white rounded-2xl border border-stone-200/40 premium-shadow hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
              <BookOpen size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold text-stone-800 truncate">{course.title}</h3>
              <p className="text-[12px] text-stone-400 font-medium truncate">
                {course.code || course.category || 'Course'}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};


const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<ProfileTabId>('courses');
  const [discussion, setDiscussion] = useState<FeedQuestion | null>(null);

  const effectiveUserId = userId ?? currentUser?.id;
  const isOwnProfile = Boolean(currentUser && effectiveUserId === currentUser.id);

  // Arriving from another in-app screen means "back" should return there.
  // A hard refresh or a pasted link has no internal history to restore.
  const canGoBack = Boolean(location.key) && location.key !== 'default';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['community', 'profile', effectiveUserId, page],
    queryFn: () => getCommunityProfile(effectiveUserId as string, page, PAGE_SIZE),
    enabled: Boolean(effectiveUserId),
  });

  // The profile endpoint returns the same pin/question payloads the feed uses,
  // so both render through the shared card. These must stay above the early
  // return below to keep hook order stable across renders.
  const profileAuthor: FeedAuthor = useMemo(() => {
    const name = data?.user.full_name?.trim() || 'Unnamed student';
    return {
      id: data?.user.id ?? effectiveUserId ?? '',
      name,
      initials: name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join(''),
      department: data?.user.department ?? undefined,
    };
  }, [data?.user, effectiveUserId]);

  const pinCards = useMemo(
    () => (data?.public_pins ?? []).map((pin) => mapPinToCard(pin, profileAuthor)),
    [data?.public_pins, profileAuthor],
  );

  const questionCards = useMemo(
    () =>
      (data?.public_questions ?? []).map((question) =>
        mapQuestionToCard(question, profileAuthor, question.answers_count),
      ),
    [data?.public_questions, profileAuthor],
  );

  if (!effectiveUserId) {
    return (
      <AppLayout activePage="Profile">
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-10">
          <EmptyState
            title="Sign in to view profiles"
            subtitle="You need an account to see student profiles."
            actionLabel="Go to courses"
            onAction={() => navigate('/courses')}
          />
        </main>
      </AppLayout>
    );
  }

  const displayName = data?.user.full_name?.trim() || 'Unnamed student';
  const profileUser: UserProfileData = {
    id: data?.user.id ?? effectiveUserId,
    name: isOwnProfile && currentUser?.full_name ? currentUser.full_name : displayName,
    picture: data?.user.picture ?? null,
    department: isOwnProfile && currentUser?.department ? currentUser.department : data?.user.department ?? null,
    email: currentUser?.email ?? null,
    isFollowing: data?.is_following_user ?? false,
    isSelf: isOwnProfile || (data?.relationship.is_self ?? false),
    followersCount: data?.stats.followers_count ?? 0,
    followingCount: data?.stats.following_users_count ?? 0,
  };

  const profileStats: ProfileStats = {
    courses: data?.courses.length ?? 0,
    pins: data?.stats.total_pins ?? 0,
    questions: data?.stats.total_questions ?? 0,
    answers: data?.stats.total_answers ?? 0,
    helpful: data?.stats.total_helpful_contributions ?? 0,
  };

  const totalPages = Math.max(
    Math.ceil((data?.pins_total ?? 0) / PAGE_SIZE),
    Math.ceil((data?.questions_total ?? 0) / PAGE_SIZE),
    1,
  );

  const tabsItems: TabItem<ProfileTabId>[] = [
    { id: 'courses', label: 'Courses', count: data?.courses.length },
    { id: 'pins', label: 'Pins', count: data?.stats.total_pins },
    { id: 'questions', label: 'Questions', count: data?.stats.total_questions },
  ];


  return (
    <AppLayout activePage="Profile">
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 lg:px-8 py-10 space-y-8">
        {isError ? (
          <EmptyState
            title="Could not load this profile"
            subtitle={error instanceof Error ? error.message : 'Please try again.'}
          />
        ) : isLoading ? (
          <div className="space-y-6">
            <div className="h-40 rounded-2xl bg-stone-100/60 animate-pulse" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-28 rounded-2xl bg-stone-100/60 animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <ProfileHeader user={profileUser} />
            {canGoBack && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-500 transition-colors hover:text-teal-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {isOwnProfile && <ProfileEditor />}
            <StatsCards stats={profileStats} />

            <div>
              <Tabs
                activeTab={activeTab}
                onChange={(tab) => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                tabs={tabsItems}
                layoutId="profileTabs"
              />

              <div className="mt-6">
                {activeTab === 'courses' && <CoursesContent courses={data?.courses ?? []} />}
                {activeTab === 'pins' && (
                  <PostsContent
                    items={pinCards}
                    emptyTitle={isOwnProfile ? 'No pins yet' : 'No public pins'}
                    emptySubtitle={
                      isOwnProfile
                        ? 'Pins you share publicly will appear here.'
                        : 'Public Knowledge Pins shared by this student appear here.'
                    }
                    onOpenDiscussion={setDiscussion}
                  />
                )}
                {activeTab === 'questions' && (
                  <PostsContent
                    items={questionCards}
                    emptyTitle={isOwnProfile ? 'No questions yet' : 'No public questions'}
                    emptySubtitle={
                      isOwnProfile
                        ? 'Questions you ask will appear here.'
                        : 'Public questions asked by this student appear here.'
                    }
                    onOpenDiscussion={setDiscussion}
                  />
                )}
              </div>

              {activeTab !== 'courses' && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-10">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="h-10 px-4 rounded-2xl border border-stone-200 text-[14px] font-semibold text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                  >
                    Previous
                  </button>
                  <span className="text-[14px] text-stone-500 font-medium">
                    Page {data?.page ?? page} of {totalPages}
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
            </div>
          </>
        )}
      </main>
      <FeedContextPanel item={discussion} onClose={() => setDiscussion(null)} />
    </AppLayout>
  );
};

export default Profile;
