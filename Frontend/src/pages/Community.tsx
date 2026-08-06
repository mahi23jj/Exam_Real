import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from '../components/SearchBars';
import Tabs, { type TabItem } from '../components/ui/Tabs';
import UserCard from '../components/community/UserCard';
import type { UserProfile } from '../components/community/UserCard';
import EmptyState from '../components/community/EmptyState';
import ProfilePreview from '../components/profile/ProfilePreview';
import AppLayout from '../components/layout/AppLayout';
import { useNavigate } from 'react-router-dom';

// --- MOCK DATA ---
const MOCK_RECOMMENDED_USERS: UserProfile[] = [
  {
    id: '1',
    name: 'Mahlet Solomon',
    initials: 'MS',
    department: 'Software Engineering',
    university: 'AASTU',
    interests: ['Operating Systems', 'Database Systems', 'AI'],
    stats: { courses: 8, pins: 42, questions: 15 },
    recommendationReasons: ['Same department', 'Studies the same course'],
    isFollowing: false,
  },
  {
    id: '2',
    name: 'Abebe Kebede',
    initials: 'AK',
    department: 'Computer Science',
    university: 'AAU',
    interests: ['Data Structures', 'Algorithms', 'Machine Learning', 'Web Dev'],
    stats: { courses: 4, pins: 12, questions: 8 },
    recommendationReasons: ['You liked their Knowledge Pins'],
    isFollowing: false,
  },
  {
    id: '3',
    name: 'Sarah Ahmed',
    initials: 'SA',
    department: 'Software Engineering',
    university: 'AASTU',
    interests: ['UI/UX Design', 'Frontend Development'],
    stats: { courses: 2, pins: 89, questions: 3 },
    recommendationReasons: ['Same department'],
    isFollowing: false,
  }
];

const MOCK_FOLLOWING_USERS: UserProfile[] = [];

const Community = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'recommended' | 'following' | 'discover'>('recommended');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const tabsItems: TabItem<'recommended' | 'following' | 'discover'>[] = [
    { id: 'recommended', label: 'Recommended', count: 12 },
    { id: 'following', label: 'Following', count: 0 },
    { id: 'discover', label: 'Discover' },
  ];

  const handleUserClick = (user: UserProfile) => {
    setSelectedUser(user);
    setIsPreviewOpen(true);
  };

  const handleViewFullProfile = (userId: string) => {
    navigate('/profile');
  };

  return (
    <AppLayout activePage="Community">
      {/* Top Header — mirrors Courses.tsx header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center gap-6">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search students, departments, interests..."
            />
          </div>
          <div className="w-10 h-10 rounded-2xl bg-stone-200 border-2 border-white premium-shadow flex items-center justify-center text-xs font-bold text-stone-600">
            AL
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-10 py-10">
        {/* Page greeting — mirrors Courses.tsx */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 mb-2">
            Find Your Study Community
          </h1>
          <p className="text-stone-500 font-medium">Discover students who share your learning interests.</p>
        </motion.section>

        {/* Tabs + Filters row */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
            <Tabs activeTab={activeTab} onChange={setActiveTab} tabs={tabsItems} layoutId="communityTabs" />

            {/* Discover filters — only on discover tab */}
            <AnimatePresence>
              {activeTab === 'discover' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <Filter size={14} className="text-stone-400" />
                  <select className="h-10 px-3 rounded-xl border border-stone-200/50 bg-stone-100/50 text-[14px] text-stone-700 font-medium outline-none focus:ring-2 focus:ring-teal-500/20 transition-all">
                    <option value="">University</option>
                    <option value="aastu">AASTU</option>
                    <option value="aau">AAU</option>
                  </select>
                  <select className="h-10 px-3 rounded-xl border border-stone-200/50 bg-stone-100/50 text-[14px] text-stone-700 font-medium outline-none focus:ring-2 focus:ring-teal-500/20 transition-all">
                    <option value="">Department</option>
                    <option value="se">Software Engineering</option>
                    <option value="cs">Computer Science</option>
                  </select>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tab content with AnimatePresence — same as Courses.tsx */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8"
            >
              {activeTab === 'recommended' && (
                <>
                  {MOCK_RECOMMENDED_USERS.map((user, idx) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      onClick={() => handleUserClick(user)}
                    >
                      <UserCard user={user} showRecommendation={true} />
                    </motion.div>
                  ))}
                </>
              )}

              {activeTab === 'following' && (
                <>
                  {MOCK_FOLLOWING_USERS.length > 0 ? (
                    MOCK_FOLLOWING_USERS.map((user, idx) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        onClick={() => handleUserClick(user)}
                      >
                        <UserCard user={user} />
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full">
                      <EmptyState
                        title="You're not following anyone yet"
                        subtitle="Discover students who share your learning interests and follow them to see their latest knowledge pins and questions."
                        actionLabel="Explore Recommendations"
                        onAction={() => setActiveTab('recommended')}
                      />
                    </div>
                  )}
                </>
              )}

              {activeTab === 'discover' && (
                <>
                  {MOCK_RECOMMENDED_USERS.map((user, idx) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.08 }}
                      onClick={() => handleUserClick(user)}
                    >
                      <UserCard user={user} />
                    </motion.div>
                  ))}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>

      <ProfilePreview
        user={selectedUser}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onViewFullProfile={handleViewFullProfile}
      />
    </AppLayout>
  );
};

export default Community;
