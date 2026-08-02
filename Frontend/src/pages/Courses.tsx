import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import SearchBar from '../components/SearchBars';
import ContinueCard, { type ContinueItemType } from '../components/ContinueCard';
import CourseTabs, { type TabValue } from '../components/CourseTabs';
import CourseCard from '../components/CourseCard';
import EmptyState from '../components/EmptyState';
import CreateCourseModal from '../components/CreateCourseModal';

const courseRouteMap: Record<string, string> = {
  'Operating Systems': 'operating-systems',
};

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabValue>('explore');
  const [modalOpen, setModalOpen] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const continueItems: Array<{
    type: ContinueItemType;
    title: string;
    subtitle: string;
    meta: string;
    progress: number;
  }> = [
    { type: 'course', title: 'Operating Systems', subtitle: 'Memory Management', meta: '2h ago', progress: 65 },
    { type: 'document', title: 'CPU Scheduling', subtitle: 'Page 24 / 80', meta: 'Yesterday', progress: 30 },
    { type: 'exam', title: 'Exit Exam 2025', subtitle: 'Question 35 / 100', meta: '3d ago', progress: 35 },
  ];

  const courses = {
    explore: [
      { title: 'Operating Systems', description: 'Complete OS preparation space', creator: 'Mahlet', students: 230, materials: 24, exams: 8, tag: 'Popular' },
      { title: 'Database Systems', description: 'SQL, normalization, and design', creator: 'Dawit', students: 187, materials: 32, exams: 12, tag: 'Updated' },
      { title: 'Computer Networks', description: 'OSI model to protocols', creator: 'Sara', students: 312, materials: 28, exams: 10 },
      { title: 'Data Structures', description: 'Master DSA for exams', creator: 'Yonas', students: 445, materials: 40, exams: 15, tag: 'New' },
    ],
    following: [
      { title: 'Operating Systems', creator: 'Mahlet', lastUpdated: '2 days ago', students: 230, materials: 24 },
    ],
    mine: [
      { title: 'My OS Collection', creator: 'You', students: 45, materials: 20 },
    ]
  };

  const counts = {
    explore: courses.explore.length,
    following: courses.following.length,
    mine: courses.mine.length,
  };

  const openCourse = (title: string) => {
    const courseId = courseRouteMap[title];
    if (courseId) {
      navigate(`/course/${courseId}`);
    } else {
      toast.info(`Opening ${title}`);
    }
  };

  const handleFollow = (title: string) => {
    toast.success(`You're now following ${title}`, {
      icon: <Sparkles className="w-4 h-4 text-teal-600" />,
      className: 'premium-shadow rounded-2xl border-none'
    });
  };

  const filteredCourses = courses[activeTab].filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.creator.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex-1 min-w-0 flex flex-col pb-24 lg:pb-0">
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
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 mb-2">
              {greeting}, Alex.
            </h1>
            <p className="text-stone-500 font-medium">What would you like to open today?</p>
          </motion.section>

          {/* Continue Section */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse-soft" />
              <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest">Continue</h2>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar snap-x -mx-6 px-6">
              {continueItems.map((item, idx) => (
                <ContinueCard
                  key={idx}
                  {...item}
                  onClick={() => openCourse(item.title)}
                />
              ))}
            </div>
          </section>

          {/* Tabs & Content */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
              <CourseTabs active={activeTab} onChange={setActiveTab} counts={counts} />
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

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + search}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8"
              >
                {filteredCourses.length > 0 ? (
                  filteredCourses.map((course, idx) => (
                    <CourseCard
                      key={idx}
                      variant={activeTab}
                      {...course}
                      onFollow={() => handleFollow(course.title)}
                      onOpen={() => openCourse(course.title)}
                        onManage={() => toast.info(`Managing ${course.title}`)}
                    />
                  ))
                ) : (
                  <div className="col-span-full">
                    <EmptyState
                      illustration={activeTab}
                      title={search ? "No matches found" : "Nothing here yet"}
                      description={search ? "Try a different search term." : "Start by exploring or creating your first course."}
                      action={activeTab === 'mine' && (
                        <button onClick={() => setModalOpen(true)} className="px-6 py-3 bg-teal-700 text-white rounded-2xl font-bold text-sm">
                          Create Course
                        </button>
                      )}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </section>
        </main>
      </div>

      <MobileNav />
      <CreateCourseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={(data) => {
          setModalOpen(false);
          toast.success(`Created ${data.name}`);
        }}
      />
    </div>
  );
};

export default Courses;