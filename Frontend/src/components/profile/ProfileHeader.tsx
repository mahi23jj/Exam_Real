import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export interface UserProfileData {
  id: string;
  name: string;
  initials: string;
  department: string;
  university: string;
  bio: string;
  interests: string[];
  isFollowing: boolean;
}

interface ProfileHeaderProps {
  user: UserProfileData;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);

  return (
    <div className="bg-white rounded-2xl p-6 border border-stone-200/40 premium-shadow animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        
        {/* Avatar */}
        <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white font-bold text-2xl premium-shadow">
          {user.initials}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-800 leading-tight">
                {user.name}
              </h1>
              <p className="text-[15px] text-stone-500 font-medium mt-1">
                {user.department} &middot; {user.university}
              </p>
              <p className="text-[14px] text-stone-400 italic mt-2">
                {user.bio}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <button className="h-10 px-4 rounded-2xl bg-transparent border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-2 text-[14px] font-bold">
                <Share2 size={16} />
                Share
              </button>
              <button
                onClick={() => setIsFollowing(!isFollowing)}
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

          {/* Interests */}
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {user.interests.map((interest, i) => (
              <span 
                key={i} 
                className="px-3 py-1.5 bg-stone-100/50 rounded-lg text-[13px] text-stone-500 whitespace-nowrap"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
