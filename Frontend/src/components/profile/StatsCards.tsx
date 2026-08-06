import React from 'react';
import { BookOpen, Pin, MessageCircle, Bookmark } from 'lucide-react';

export interface ProfileStats {
  courses: number;
  pins: number;
  questions: number;
  saved: number;
}

interface StatsCardsProps {
  stats: ProfileStats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const statItems = [
    { label: 'Courses', value: stats.courses, icon: BookOpen },
    { label: 'Pins', value: stats.pins, icon: Pin },
    { label: 'Questions', value: stats.questions, icon: MessageCircle },
    { label: 'Saved', value: stats.saved, icon: Bookmark },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <div 
            key={index}
            className="bg-white rounded-2xl p-5 border border-stone-200/40 premium-shadow transition-all duration-300 hover:-translate-y-1 hover:premium-shadow-hover animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
            style={{ animationDelay: `${(index + 1) * 100}ms` }}
          >
            <div className="flex flex-col">
              <Icon size={20} className="text-teal-700 mb-3" />
              <div className="text-2xl font-bold text-stone-800 leading-none mb-1">
                {item.value}
              </div>
              <div className="text-[13px] font-medium text-stone-500">
                {item.label}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
