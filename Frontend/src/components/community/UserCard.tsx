import React from 'react';
import { BookOpen, Check, Users } from 'lucide-react';

import FollowUserButton from './FollowUserButton';
import { initialsFor } from '../../utils/initials';

export interface SharedCourse {
  id: string;
  title: string;
  code?: string | null;
}

/**
 * A student returned by the people-recommendations endpoint.
 *
 * The context fields are optional because the follow-list endpoint returns the
 * same person without them. The card must not invent a reason or a course, so
 * each block is simply omitted when the API did not supply it.
 */
export interface RecommendedStudent {
  id: string;
  full_name?: string | null;
  picture?: string | null;
  department?: string | null;
  is_following: boolean;
  follower_count: number;
  same_department?: boolean;
  shared_courses?: SharedCourse[];
  recommendation_reasons?: string[];
}

interface UserCardProps {
  user: RecommendedStudent;
  onOpenProfile: (userId: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, onOpenProfile }) => {
  const displayName = user.full_name?.trim() || 'Unnamed student';
  const reasons = (user.recommendation_reasons ?? []).filter(Boolean);
  const courses = user.shared_courses ?? [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenProfile(user.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenProfile(user.id);
        }
      }}
      className="bg-white rounded-2xl p-5 border border-stone-200/40 premium-shadow transition-all duration-300 ease-in-out hover:-translate-y-1 hover:premium-shadow-hover cursor-pointer group flex flex-col h-full"
    >
      <div className="flex items-start gap-4 flex-1">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white font-semibold text-lg premium-shadow overflow-hidden">
          {user.picture ? (
            <img src={user.picture} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            initialsFor(user.full_name)
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="mb-3">
            <h3 className="text-[18px] font-semibold text-stone-800 truncate leading-tight group-hover:text-teal-700 transition-colors">
              {displayName}
            </h3>
            <p className="text-[14px] text-stone-500 truncate mt-0.5">
              {user.department || 'Department not set'}
            </p>
          </div>

          {courses.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {courses.slice(0, 3).map((course) => (
                <span
                  key={course.id}
                  className="px-3 py-1 bg-stone-100/50 rounded-lg text-[13px] text-stone-500 whitespace-nowrap max-w-[180px] truncate"
                >
                  {course.title}
                </span>
              ))}
              {courses.length > 3 && (
                <span className="px-3 py-1 bg-stone-100/50 rounded-lg text-[13px] text-stone-500 whitespace-nowrap">
                  +{courses.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 mb-4">
            {courses.length > 0 && (
              <div className="flex items-center gap-1.5 text-stone-500 text-[14px]">
                <BookOpen size={16} />
                <span>{courses.length}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-stone-500 text-[14px]">
              <Users size={16} />
              <span>{user.follower_count}</span>
            </div>
          </div>

          {reasons.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {reasons.map((reason) => (
                <div
                  key={reason}
                  className="px-2.5 py-1 bg-amber-100/80 text-amber-900 rounded-[8px] text-[13px] flex items-center gap-1"
                >
                  <Check size={14} className="text-amber-700" />
                  {reason}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end mt-auto pt-2">
        <FollowUserButton
          userId={user.id}
          displayName={displayName}
          seed={{ isFollowing: user.is_following, followersCount: user.follower_count }}
        />
      </div>
    </div>
  );
};

export default UserCard;