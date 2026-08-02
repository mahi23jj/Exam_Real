import React from 'react';
import { BookOpen, Rss, Users, User, Settings } from 'lucide-react';
import NavigationItem from './NavigationItem';

const navItems = [
  { icon: BookOpen, label: 'Courses', active: true },
  { icon: Rss, label: 'Feed', active: false },
  { icon: Users, label: 'Community', active: false },
  { icon: User, label: 'Profile', active: false },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-white/30 backdrop-blur-md border-r border-stone-200/50 h-screen sticky top-0 z-40">
      <div className="px-8 py-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-700 flex items-center justify-center shadow-lg shadow-teal-900/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-stone-800 tracking-tight">ExamReal</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2">
        <div className="px-4 mb-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Menu</div>
        {navItems.map((item) => (
          <NavigationItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={item.active}
          />
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100/50 transition-all">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;