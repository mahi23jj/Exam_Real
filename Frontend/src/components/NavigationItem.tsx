import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavigationItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  variant?: 'sidebar' | 'bottom';
}

const NavigationItem: React.FC<NavigationItemProps> = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick,
  variant = 'sidebar'
}) => {
  if (variant === 'bottom') {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center justify-center flex-1 py-2 relative"
      >
        <Icon className={`w-5 h-5 mb-1 transition-colors duration-200 ${active ? 'text-teal-700' : 'text-stone-400'}`} />
        <span className={`text-[10px] font-medium transition-colors duration-200 ${active ? 'text-teal-700' : 'text-stone-400'}`}>
          {label}
        </span>
        {active && (
          <motion.div 
            layoutId="bottomNavActive"
            className="absolute -top-1 w-1 h-1 rounded-full bg-teal-600"
          />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative ${
        active
          ? 'text-teal-700'
          : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100/50'
      }`}
    >
      {active && (
        <motion.div 
          layoutId="sidebarActive"
          className="absolute inset-0 bg-teal-50/50 rounded-xl -z-10"
        />
      )}
      <Icon className={`w-5 h-5 flex-shrink-0 transition-colors duration-200 ${active ? 'text-teal-600' : 'text-stone-400 group-hover:text-stone-600'}`} />
      <span>{label}</span>
    </button>
  );
};

export default NavigationItem;