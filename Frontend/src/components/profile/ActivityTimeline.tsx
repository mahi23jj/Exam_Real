import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar } from 'lucide-react';

export interface ActivityItem {
  id: string;
  action: string;
  date: string;
  categoryDate: string; // e.g. "Today", "Yesterday", "3 days ago"
}

interface ActivityTimelineProps {
  activities: ActivityItem[];
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ activities }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Group activities by categoryDate
  const groupedActivities = activities.reduce((acc, curr) => {
    if (!acc[curr.categoryDate]) {
      acc[curr.categoryDate] = [];
    }
    acc[curr.categoryDate].push(curr);
    return acc;
  }, {} as Record<string, ActivityItem[]>);

  return (
    <div className="mt-8 border-t border-border/60 pt-6 animate-in fade-in duration-500">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-[16px] font-semibold text-foreground hover:text-primary transition-colors group mb-4 outline-none"
      >
        <Calendar size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
        Activity Timeline
        {isExpanded ? (
          <ChevronUp size={18} className="text-muted-foreground ml-1" />
        ) : (
          <ChevronDown size={18} className="text-muted-foreground ml-1" />
        )}
      </button>

      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-6 pb-4">
          {Object.entries(groupedActivities).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <h4 className="text-[14px] font-semibold text-muted-foreground mb-3">
                {dateLabel}
              </h4>
              <div className="flex flex-col gap-3 pl-[10px] ml-[10px] border-l-2 border-border/50 relative">
                {items.map((item) => (
                  <div key={item.id} className="relative flex items-center">
                    {/* Timeline Dot */}
                    <div className="absolute -left-[15px] w-2 h-2 rounded-full bg-primary/70 ring-4 ring-background" />
                    <p className="text-[14px] text-muted-foreground pl-4">
                      {item.action}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityTimeline;
