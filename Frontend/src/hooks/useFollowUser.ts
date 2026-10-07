import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import {
  followUser as followUserRequest,
  unfollowUser as unfollowUserRequest,
  type FollowUserResponse,
} from '../services/socialService';

export interface FollowEntry {
  isFollowing: boolean;
  followersCount: number;
  isSelf: boolean;
}

/**
 * Follow state is per-user global state: a follow made from a Knowledge Pin, a
 * recommendation card or a profile must be visible everywhere else immediately.
 * A tiny external store keeps that consistent without invalidating every
 * workspace query (which hold pin/question payloads).
 */
const entries = new Map<string, FollowEntry>();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ReadonlyMap<string, FollowEntry> {
  return entries;
}

/** Seeds state from a server payload without clobbering newer local state. */
export function seedFollowState(
  userId: string,
  seed: Partial<FollowEntry> | undefined | null,
): void {
  if (!userId || !seed) return;
  if (entries.has(userId)) return;
  entries.set(userId, {
    isFollowing: seed.isFollowing ?? false,
    followersCount: seed.followersCount ?? 0,
    isSelf: seed.isSelf ?? false,
  });
  emit();
}

function setFollowState(userId: string, entry: FollowEntry): void {
  entries.set(userId, entry);
  emit();
}

export function getFollowState(userId: string): FollowEntry | undefined {
  return entries.get(userId);
}

/**
 * Reads live follow state for `userId`, falling back to the server-provided
 * relationship while the very first value is still being seeded.
 */
export function useFollowState(
  userId: string | null | undefined,
  seed?: Partial<FollowEntry> | null,
): FollowEntry {
  seedFollowState(userId ?? '', seed);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return useMemo(() => {
    if (!userId) {
      return { isFollowing: false, followersCount: 0, isSelf: true };
    }
    return (
      snapshot.get(userId) ?? {
        isFollowing: seed?.isFollowing ?? false,
        followersCount: seed?.followersCount ?? 0,
        isSelf: seed?.isSelf ?? false,
      }
    );
  }, [snapshot, userId, seed?.isFollowing, seed?.followersCount, seed?.isSelf]);
}

interface FollowVariables {
  userId: string;
  nextIsFollowing: boolean;
}

interface FollowOptions {
  /** Used in the success toast, e.g. the student's name. */
  displayName?: string;
  onSuccess?: (result: FollowUserResponse) => void;
}

function displayLabel(displayName?: string): string {
  return displayName?.trim() || 'this student';
}

/** Follows/unfollows a student (one-way, no approval state) and syncs the store. */
export function useFollowUser(options: FollowOptions = {}) {
  const mutation = useMutation({
    mutationFn: ({ userId, nextIsFollowing }: FollowVariables): Promise<FollowUserResponse> =>
      nextIsFollowing ? followUserRequest(userId) : unfollowUserRequest(userId),

    onMutate: ({ userId, nextIsFollowing }) => {
      const previous = getFollowState(userId);
      if (previous) {
        setFollowState(userId, { ...previous, isFollowing: nextIsFollowing });
      }
      return { previous };
    },

    onError: (error, variables, context) => {
      if (context?.previous) {
        setFollowState(variables.userId, context.previous);
      }
      toast.error(error instanceof Error ? error.message : 'Could not update follow');
    },

    onSuccess: (result, variables) => {
      setFollowState(variables.userId, {
        isFollowing: result.is_following,
        followersCount: result.followers_count,
        isSelf: getFollowState(variables.userId)?.isSelf ?? false,
      });
      options.onSuccess?.(result);
      toast.success(
        result.is_following
          ? `Following ${displayLabel(options.displayName)}`
          : `Unfollowed ${displayLabel(options.displayName)}`,
      );
    },
  });

  const toggle = useCallback(
    (userId: string, currentlyFollowing: boolean) => {
      mutation.mutate({ userId, nextIsFollowing: !currentlyFollowing });
    },
    [mutation],
  );

  return {
    toggleFollow: toggle,
    follow: useCallback((userId: string) => mutation.mutate({ userId, nextIsFollowing: true }), [mutation]),
    unfollow: useCallback((userId: string) => mutation.mutate({ userId, nextIsFollowing: false }), [mutation]),
    isPending: mutation.isPending,
  };
}