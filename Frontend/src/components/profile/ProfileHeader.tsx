import React from 'react';
import { Share2, Users } from 'lucide-react';

import FollowUserButton from '../community/FollowUserButton';
import { initialsFor } from '../../utils/initials';

export interface UserProfileData {
  id: string;
  name: string;
  picture?: string | null;
  department?: string | null;
  email?: string | null;
  isFollowing: boolean;
  isSelf: boolean;
  followersCount: number;
  followingCount: number;
}

interface ProfileHeaderProps {
  user: UserProfileData;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-stone-200/40 premium-shadow animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
        <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white font-bold text-2xl premium-shadow overflow-hidden">
          {user.picture ? (
            <img src={user.picture} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            initialsFor(user.name)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-800 leading-tight">{user.name}</h1>
              <p className="text-[15px] text-stone-500 font-medium mt-1">
                {user.department || 'Department not set'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-[14px] text-stone-500">
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  {user.followersCount} follower{user.followersCount === 1 ? '' : 's'}
                </span>
                <span>Following {user.followingCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(window.location.href);
                }}
                className="h-10 px-4 rounded-2xl bg-transparent border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors flex items-center gap-2 text-[14px] font-bold"
              >
                <Share2 size={16} />
                Share
              </button>
              <FollowUserButton
                userId={user.id}
                displayName={user.name}
                seed={{
                  isFollowing: user.isFollowing,
                  followersCount: user.followersCount,
                  isSelf: user.isSelf,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;