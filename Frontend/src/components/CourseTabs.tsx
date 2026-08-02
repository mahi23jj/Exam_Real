import React from 'react';
import { motion } from 'framer-motion';

export type TabValue = 'explore' | 'following' | 'mine';

interface CourseTabsProps {
  active: TabValue;
  onChange: (value: TabValue) => void;
  counts: Record<TabValue, number>;
}

const tabs: { value: TabValue; label: string }[] = [
  { value: 'explore', label: 'Explore' },
  { value: 'following', label: 'Following' },
  { value: 'mine', label: 'My Courses' },
];

const CourseTabs: React.FC<CourseTabsProps> = ({ active, onChange, counts }) => {
  return (
    <div className="flex items-center gap-2 p-1 bg-stone-100/50 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap ${
            active === tab.value
              ? 'text-teal-800'
              : 'text-stone-500 hover:text-stone-700'
          }`}
        >
          {active === tab.value && (
            <motion.div
              layoutId="activeTab"
              className="absolute inset-0 bg-white premium-shadow rounded-xl"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
            />
          )}
          <span className="relative z-10">{tab.label}</span>
          <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full transition-colors duration-300 ${
            active === tab.value ? 'bg-teal-50 text-teal-700' : 'bg-stone-200/50 text-stone-400'
          }`}>
            {counts[tab.value]}
          </span>
        </button>
      ))}
    </div>
  );
};

export default CourseTabs;