/**
 * Route helpers.
 *
 * Another student's profile is a dedicated page, never the own-profile surface.
 * `/community/users/:userId` is the canonical public link; `/profile/:userId`
 * remains as a backwards-compatible alias handled by the router.
 */
export function publicProfilePath(userId?: string | null): string | null {
  return userId ? `/community/users/${userId}` : null;
}
