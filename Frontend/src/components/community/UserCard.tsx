import React, { useState } from 'react';
import { BookOpen, Pin, MessageCircle, Check } from 'lucide-react';

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  department: string;
  university: string;
  interests: string[];
  stats: {
    courses: number;
    pins: number;
    questions: number;
  };
  recommendationReasons?: string[];
  isFollowing: boolean;
}

interface UserCardProps {
  user: UserProfile;
  showRecommendation?: boolean;
}

const UserCard: React.FC<UserCardProps> = ({ user, showRecommendation = false }) => {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  
  const displayInterests = user.interests.slice(0, 3);
  const remainingInterests = user.interests.length - 3;

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200/40 premium-shadow transition-all duration-300 ease-in-out hover:-translate-y-1 hover:premium-shadow-hover cursor-pointer group flex flex-col h-full">
      <div className="flex items-start gap-4 flex-1">
        
        {/* Avatar Section */}
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white font-semibold text-lg premium-shadow">
          {user.initials}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          
          {/* Row 1 & 2: Name and Info */}
          <div className="mb-3">
            <h3 className="text-[18px] font-semibold text-stone-800 truncate leading-tight group-hover:text-teal-700 transition-colors">
              {user.name}
            </h3>
            <p className="text-[14px] text-stone-500 truncate mt-0.5">
              {user.department} &middot; {user.university}
            </p>
          </div>

          {/* Row 3: Learning Interests */}
          <div className="flex flex-wrap gap-2 mb-4">
            {displayInterests.map((interest, i) => (
              <span 
                key={i} 
                className="px-3 py-1 bg-stone-100/50 rounded-lg text-[13px] text-stone-500 whitespace-nowrap"
              >
                {interest}
              </span>
            ))}
            {remainingInterests > 0 && (
              <span className="px-3 py-1 bg-stone-100/50 rounded-lg text-[13px] text-stone-500 whitespace-nowrap">
                +{remainingInterests} more
              </span>
            )}
          </div>

          {/* Row 4: Stats */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1.5 text-stone-500 text-[14px]">
              <BookOpen size={16} />
              <span>{user.stats.courses}</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-500 text-[14px]">
              <Pin size={16} />
              <span>{user.stats.pins}</span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-500 text-[14px]">
              <MessageCircle size={16} />
              <span>{user.stats.questions}</span>
            </div>
          </div>

          {/* Row 5: Recommendation Reasons (Optional) */}
          {showRecommendation && user.recommendationReasons && user.recommendationReasons.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {user.recommendationReasons.map((reason, i) => (
                <div key={i} className="px-2.5 py-1 bg-amber-100/80 text-amber-900 rounded-[8px] text-[13px] flex items-center gap-1">
                  <Check size={14} className="text-amber-700" />
                  {reason}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
      
      {/* Row 6: Follow Button (Bottom Right) */}
      <div className="flex justify-end mt-auto pt-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsFollowing(!isFollowing);
          }}
          className={`
            h-10 px-5 rounded-2xl text-[14px] font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 flex items-center gap-1.5
            ${isFollowing 
              ? 'bg-transparent text-teal-700 border border-teal-700/30 hover:bg-teal-50' 
              : 'bg-teal-700 text-white premium-shadow hover:bg-teal-800'
            }
          `}
        >
          {isFollowing ? (
            <>
              Following <Check size={16} />
            </>
          ) : (
            '+ Follow'
          )}
        </button>
      </div>

    </div>
  );
};

export default UserCard;
