import React, { useState } from 'react';
import { BookOpen, Pin, MessageCircle, Heart, Lock, Calendar, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileHeader from '../components/profile/ProfileHeader';
import type { UserProfileData } from '../components/profile/ProfileHeader';
import StatsCards from '../components/profile/StatsCards';
import type { ProfileStats } from '../components/profile/StatsCards';
import Tabs, { type TabItem } from '../components/ui/Tabs';
import AppLayout from '../components/layout/AppLayout';

// --- MOCK DATA ---
const MOCK_USER: UserProfileData = {
  id: '1',
  name: 'Mahlet Solomon',
  initials: 'MS',
  department: 'Software Engineering',
  university: 'AASTU',
  bio: 'Passionate about teaching and building study tools.',
  interests: ['Operating Systems', 'Database Systems', 'AI', 'Distributed Systems'],
  isFollowing: false,
};

const MOCK_STATS: ProfileStats = {
  courses: 8,
  pins: 42,
  questions: 15,
  saved: 24,
};

type ProfileTabId = 'courses' | 'pins' | 'questions' | 'saved' | 'about';

// Mock content components per tab
const CoursesContent = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {[
      { title: 'Operating Systems', notes: 12, exams: 8, age: '3 months ago' },
      { title: 'Database Systems', notes: 9, exams: 5, age: '1 month ago' },
    ].map((c, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="p-5 bg-white rounded-2xl border border-stone-200/40 premium-shadow hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <BookOpen size={16} />
          </div>
          <h3 className="text-[16px] font-bold text-stone-800 group-hover:text-teal-700 transition-colors">
            {c.title}
          </h3>
        </div>
        <div className="flex items-center gap-4 text-[13px] text-stone-500 mb-3">
          <span className="flex items-center gap-1.5"><Calendar size={13} /> {c.notes} Notes</span>
          <span className="flex items-center gap-1.5"><MessageCircle size={13} /> {c.exams} Past Exams</span>
        </div>
        <div className="text-[12px] text-stone-400 font-medium">Created {c.age}</div>
      </motion.div>
    ))}
  </div>
);

const PinsContent = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {[
      { label: 'Memory Trick', body: '"Virtual memory uses disk space as extension of RAM"', course: 'Operating Systems', time: '2h ago', likes: 18, replies: 5 },
      { label: 'Scheduling Rule', body: '"FCFS can cause convoy effect with long-running processes"', course: 'Operating Systems', time: '1d ago', likes: 12, replies: 2 },
    ].map((p, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="p-5 bg-white rounded-2xl border border-stone-200/40 premium-shadow hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
      >
        <div className="flex items-center gap-2 mb-2 text-teal-700">
          <Pin size={15} />
          <span className="text-[14px] font-bold">{p.label}</span>
        </div>
        <p className="text-[14px] text-stone-700 mb-4 leading-relaxed">{p.body}</p>
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <span className="text-[12px] text-stone-400 font-medium">{p.course} &middot; {p.time}</span>
          <div className="flex items-center gap-3 text-[12px] text-stone-400">
            <span className="flex items-center gap-1"><Heart size={13} /> {p.likes}</span>
            <span className="flex items-center gap-1"><MessageCircle size={13} /> {p.replies}</span>
          </div>
        </div>
      </motion.div>
    ))}
  </div>
);

const QuestionsContent = () => (
  <div className="flex flex-col gap-4">
    {[
      { q: 'Why is virtual memory important for modern OS?', course: 'Operating Systems', time: '2h ago', replies: 12 },
      { q: 'What is the difference between mutex and semaphore?', course: 'Operating Systems', time: '3d ago', replies: 7 },
    ].map((item, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="p-5 bg-white rounded-2xl border border-stone-200/40 premium-shadow hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
      >
        <h3 className="text-[15px] font-bold text-stone-800 mb-3 flex items-start gap-2 group-hover:text-teal-700 transition-colors">
          <MessageCircle size={17} className="mt-0.5 shrink-0 text-teal-700" />
          {item.q}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-stone-400 font-medium">{item.course} &middot; {item.time}</span>
          <span className="text-[13px] font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-xl">
            {item.replies} replies
          </span>
        </div>
      </motion.div>
    ))}
  </div>
);

const SavedContent = ({ subTab, onSubTab }: { subTab: 'pins' | 'questions'; onSubTab: (v: 'pins' | 'questions') => void }) => (
  <div>
    <div className="flex items-center gap-2 text-[13px] font-bold text-amber-700 bg-amber-50 px-4 py-2.5 rounded-xl mb-6 border border-amber-200/50">
      <Lock size={14} />
      Private — Only visible to you
    </div>
    <div className="flex items-center gap-1 mb-6 p-1 bg-stone-100/50 rounded-xl w-fit">
      {(['pins', 'questions'] as const).map(tab => (
        <button
          key={tab}
          onClick={() => onSubTab(tab)}
          className={`px-4 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 capitalize ${
            subTab === tab ? 'bg-white text-stone-800 premium-shadow' : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          {tab === 'pins' ? 'Knowledge Pins' : 'Questions'}
        </button>
      ))}
    </div>
    <div className="text-center py-16 text-stone-400">
      {subTab === 'pins' ? <Pin size={36} className="mx-auto mb-4 opacity-30" /> : <MessageCircle size={36} className="mx-auto mb-4 opacity-30" />}
      <p className="text-[14px] font-medium">Nothing saved here yet.</p>
    </div>
  </div>
);

const AboutContent = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12 py-4">
    {[
      { label: 'University', value: 'Addis Ababa Science & Technology University' },
      { label: 'Department', value: 'Software Engineering' },
      { label: 'Year', value: '3rd Year' },
      { label: 'Interests', value: 'Operating Systems, AI, Distributed Systems' },
    ].map((item) => (
      <div key={item.label} className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">{item.label}</span>
        <span className="text-[15px] font-semibold text-stone-800">{item.value}</span>
      </div>
    ))}
    <div className="flex flex-col gap-1.5 md:col-span-2 mt-4 pt-6 border-t border-stone-100">
      <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Bio</span>
      <p className="text-[15px] text-stone-700 leading-relaxed max-w-2xl">
        {MOCK_USER.bio}
      </p>
    </div>
  </div>
);

const Profile = () => {
  const [activeTab, setActiveTab] = useState<ProfileTabId>('courses');
  const [savedSubTab, setSavedSubTab] = useState<'pins' | 'questions'>('pins');

  const tabsItems: TabItem<ProfileTabId>[] = [
    { id: 'courses', label: 'Courses', count: 8 },
    { id: 'pins', label: 'Knowledge Pins', count: 42 },
    { id: 'questions', label: 'Questions', count: 15 },
    { id: 'saved', label: 'Saved', count: 24 },
    { id: 'about', label: 'About' },
  ];

  return (
    <AppLayout activePage="Profile">
      {/* Fixed top header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-stone-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex items-center justify-between gap-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-teal-700">Profile</p>
            <h1 className="text-base font-semibold text-stone-800">{MOCK_USER.name}</h1>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-stone-200 border-2 border-white premium-shadow flex items-center justify-center text-xs font-bold text-stone-600">
            AL
          </div>
        </div>
      </header>

      {/* Scrollable page body */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-10 py-10 flex flex-col gap-8">

        {/* Profile Header Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ProfileHeader user={MOCK_USER} />
        </motion.div>

        {/* Stats Row */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <StatsCards stats={MOCK_STATS} />
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="flex items-center overflow-x-auto no-scrollbar"
        >
          <Tabs activeTab={activeTab} onChange={setActiveTab} tabs={tabsItems} layoutId="profileTabs" />
        </motion.div>

        {/* Tab Content — AnimatePresence like Courses.tsx */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl border border-stone-200/40 premium-shadow p-6 min-h-[400px]"
          >
            {activeTab === 'courses' && <CoursesContent />}
            {activeTab === 'pins' && <PinsContent />}
            {activeTab === 'questions' && <QuestionsContent />}
            {activeTab === 'saved' && <SavedContent subTab={savedSubTab} onSubTab={setSavedSubTab} />}
            {activeTab === 'about' && <AboutContent />}
          </motion.div>
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default Profile;
