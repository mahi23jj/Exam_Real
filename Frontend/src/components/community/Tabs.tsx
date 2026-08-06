import React from 'react';

export type TabId = 'recommended' | 'following' | 'discover';

interface TabItem {
  id: TabId;
  label: string;
  count?: number;
}

interface TabsProps {
  activeTab: TabId;
  onChange: (tabId: TabId) => void;
  tabs: TabItem[];
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onChange, tabs }) => {
  return (
    <div className="relative flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 ease-in-out font-medium whitespace-nowrap
              ${isActive 
                ? 'bg-primary text-white shadow-sm' 
                : 'bg-transparent text-muted-foreground border border-border hover:bg-muted/30'
              }
            `}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`
                px-1.5 py-0.5 rounded-md text-xs
                ${isActive ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}
              `}>
                {tab.count}
              </span>
            )}
            
            {/* Optional animated underline indicator for the active state (if needed as per design) */}
            {isActive && (
              <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
