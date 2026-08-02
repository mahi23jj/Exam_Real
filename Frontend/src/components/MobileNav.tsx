import React from 'react';
import { BookOpen, Rss, Users, User } from 'lucide-react';
import NavigationItem from './NavigationItem';

const navItems = [
  { icon: BookOpen, label: 'Courses', active: true },
  { icon: Rss, label: 'Feed', active: false },
  { icon: Users, label: 'Community', active: false },
  { icon: User, label: 'Profile', active: false },
];

const MobileNav: React.FC = () => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6">
      <nav className="bg-white/80 backdrop-blur-2xl border border-white/20 premium-shadow rounded-3xl flex items-center justify-around px-2 py-1">
        {navItems.map((item) => (
          <NavigationItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={item.active}
            variant="bottom"
          />
        ))}
      </nav>
    </div>
  );
};

export default MobileNav;