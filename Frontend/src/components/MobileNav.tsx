import React from 'react';
import { BookOpen, Rss, Users, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import NavigationItem from './NavigationItem';

interface MobileNavProps {
  activePage?: string;
}

const navItems = [
  { icon: BookOpen, label: 'Courses', path: '/' },
  { icon: Rss, label: 'Feed', path: '/feed' },
  { icon: Users, label: 'Community', path: '/community' },
  { icon: User, label: 'Profile', path: '/profile' },
];

const MobileNav: React.FC<MobileNavProps> = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/courses';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-6">
      <nav className="bg-white/80 backdrop-blur-2xl border border-white/20 premium-shadow rounded-3xl flex items-center justify-around px-2 py-1">
        {navItems.map((item) => (
          <NavigationItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={isActive(item.path)}
            onClick={() => navigate(item.path)}
            variant="bottom"
          />
        ))}
      </nav>
    </div>
  );
};

export default MobileNav;