import React from 'react';
import { Link } from 'react-router-dom';
import { Check, ExternalLink, Users } from 'lucide-react';

import { listMyFollowing, type FollowUserSummary } from '../../services/socialService';
import { initialsFor } from '../../utils/initials';
import { publicProfilePath } from '../../utils/routes';

interface FollowingRailProps {
  /** Bump this to force a refetch after a follow/unfollow elsewhere. */
  refreshKey?: number;
  /** Currently filtered person, or null for the combined "Everyone" feed. */
  selectedAuthorId?: string | null;
  onSelectAuthor?: (authorId: string | null) => void;
}

/**
 * Right-hand rail listing who the student follows.
 *
 * Backs the "Following" person filter and mirrors the Community "Following"
 * tab, so it reuses the same paginated endpoint. Selecting a person filters the
 * feed; the trailing icon opens that person's public profile instead.
 */
const FollowingRail: React.FC<FollowingRailProps> = ({
  refreshKey = 0,
  selectedAuthorId = null,
  onSelectAuthor,
}) => {
  const [people, setPeople] = React.useState<FollowUserSummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listMyFollowing(1, 20)
      .then((page) => {
        if (!cancelled) setPeople(page.items.filter((p) => !p.is_self));
      })
      .catch(() => {
        if (!cancelled) setPeople([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const selectable = Boolean(onSelectAuthor);

  return (
    <aside className="hidden w-[240px] shrink-0 lg:block">
      <div className="sticky top-6">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Users className="h-3.5 w-3.5 text-teal-700" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
            Following
          </h2>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-11 animate-pulse rounded-2xl border border-stone-100 bg-white/60"
              />
            ))}
          </div>
        ) : people.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-white/50 px-3 py-4">
            <p className="text-[11px] leading-5 text-stone-400">
              No one followed yet. Discover people in Community → Recommended.
            </p>
            <Link
              to="/community"
              className="mt-2 inline-block text-[11px] font-bold text-teal-700 hover:text-teal-800"
            >
              Find people →
            </Link>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {selectable && (
              <li>
                <button
                  type="button"
                  onClick={() => onSelectAuthor?.(null)}
                  aria-pressed={selectedAuthorId === null}
                  className={`flex w-full items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-left transition-colors ${
                    selectedAuthorId === null
                      ? 'border-teal-300 bg-teal-50/70'
                      : 'border-stone-100 bg-white/70 hover:border-teal-200 hover:bg-white'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-700 text-[10px] font-bold text-white">
                    All
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-stone-700">
                      Everyone
                    </span>
                    <span className="block truncate text-[10px] text-stone-400">
                      Combined feed
                    </span>
                  </span>
                  {selectedAuthorId === null && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-teal-700" />
                  )}
                </button>
              </li>
            )}

            {people.map((person) => {
              const profileHref = publicProfilePath(person.id);
              const isSelected = selectedAuthorId === person.id;
              return (
                <li key={person.id}>
                  <div
                    className={`group/rail flex items-center gap-1 rounded-2xl border pl-2.5 pr-1.5 transition-colors ${
                      isSelected
                        ? 'border-teal-300 bg-teal-50/70'
                        : 'border-stone-100 bg-white/70 hover:border-teal-200 hover:bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectAuthor?.(isSelected ? null : person.id)}
                      aria-pressed={isSelected}
                      className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left"
                    >
                      {person.picture ? (
                        <img
                          src={person.picture}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-500">
                          {initialsFor(person.full_name)}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-semibold text-stone-700">
                          {person.full_name}
                        </span>
                        <span className="block truncate text-[10px] text-stone-400">
                          {person.department ?? `${person.followers_count} followers`}
                        </span>
                      </span>
                    </button>

                    {profileHref && (
                      <Link
                        to={profileHref}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Open ${person.full_name}'s profile`}
                        title="View profile"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-300 transition-colors hover:bg-stone-100 hover:text-teal-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}

            <li>
              <Link
                to="/community"
                className="block px-2.5 pt-1 text-[11px] font-bold text-teal-700 hover:text-teal-800"
              >
                See all →
              </Link>
            </li>
          </ul>
        )}
      </div>
    </aside>
  );
};

export default FollowingRail;
