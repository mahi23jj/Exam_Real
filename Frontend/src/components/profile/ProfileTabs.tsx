import React from 'react';

export type ProfileTabId = 'courses' | 'pins' | 'questions' | 'saved' | 'about';

interface TabItem {
  id: ProfileTabId;
  label: string;
  count?: number;
}

interface ProfileTabsProps {
  activeTab: ProfileTabId;
  onChange: (tabId: ProfileTabId) => void;
  tabs: TabItem[];
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({ activeTab, onChange, tabs }) => {
  return (
    <div className="relative flex items-center gap-1 overflow-x-auto no-scrollbar pb-0 border-b border-border/60">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative flex items-center justify-center px-4 py-3 text-[14px] transition-all duration-200 ease-in-out whitespace-nowrap outline-none hover:bg-muted/30 rounded-t-lg
              ${isActive ? 'font-semibold text-foreground' : 'font-normal text-muted-foreground'}
            `}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1.5 text-[13px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                ({tab.count})
              </span>
            )}
            
            {/* Underline Indicator */}
            <span 
              className={`absolute bottom-0 left-0 w-full h-[2px] bg-primary transition-transform duration-300 origin-center ${
                isActive ? 'scale-x-100' : 'scale-x-0'
              }`} 
            />
          </button>
        );
      })}
    </div>
  );
};

export default ProfileTabs;
