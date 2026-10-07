import React from 'react';
import { Check, Loader2, UserCheck, UserPlus } from 'lucide-react';

import { useFollowState, useFollowUser } from '../../hooks/useFollowUser';

interface FollowUserButtonProps {
  userId: string;
  displayName?: string;
  seed?: {
    isFollowing?: boolean;
    followersCount?: number;
    isSelf?: boolean;
  };
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Follow control for a student. Reads live state from the shared follow store so
 * following from a recommendation card immediately updates profile headers and
 * content author rows elsewhere.
 */
const FollowUserButton: React.FC<FollowUserButtonProps> = ({
  userId,
  displayName,
  seed,
  size = 'md',
  className = '',
}) => {
  const { isFollowing, followersCount, isSelf } = useFollowState(userId, seed);
  const { toggleFollow, isPending } = useFollowUser({ displayName });

  // You cannot follow yourself.
  if (isSelf) return null;

  const dimensions = size === 'sm' ? 'h-8 px-3.5 text-[13px]' : 'h-10 px-5 text-[14px]';

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        toggleFollow(userId, isFollowing);
      }}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? `Unfollow ${displayName ?? 'student'}` : `Follow ${displayName ?? 'student'}`}
      title={followersCount > 0 ? `${followersCount} follower${followersCount === 1 ? '' : 's'}` : undefined}
      className={`
        ${dimensions} rounded-2xl font-bold transition-all duration-200
        active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center gap-1.5 shrink-0
        ${
          isFollowing
            ? 'bg-transparent text-teal-700 border border-teal-700/30 hover:bg-teal-50'
            : 'bg-teal-700 text-white premium-shadow hover:bg-teal-800'
        }
        ${className}
      `}
    >
      {isPending ? (
        <>
          <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
          {isFollowing ? 'Following' : 'Follow'}
        </>
      ) : isFollowing ? (
        <>
          {size === 'sm' ? <UserCheck size={14} /> : <Check size={16} />}
          Following
        </>
      ) : (
        <>
          {size === 'sm' && <UserPlus size={14} />}
          + Follow
        </>
      )}
    </button>
  );
};

export default FollowUserButton;