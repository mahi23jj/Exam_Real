# ExamReal — Community + Feed + User Profile Implementation Report

## 1. Files changed

### Backend
- `Backend/app/api/v1/endpoints/community.py` — `GET /api/v1/community/feed-items` accepts optional `author_id` (UUID) query param.
- `Backend/app/services/social_service.py` — `FeedService.get_feed(..., author_id)` passes the person filter through; batched decoration (likes/saves/reply counts) retained.
- `Backend/app/repositories/feed_repository.py` — `list_feed(..., author_id)`; filter applied in both `_pin_branch` and `_question_branch` of the UNION ALL query.
- `Backend/app/auth/auth_service.py` — fill-only Auth0 sync: `_display_name()` fallback (email local part → "ExamReal Student") used on create and for blank-name repair only when the profile is not `profile_locked`. Locally edited name/department are never overwritten by Auth0 claims.
- `Backend/app/services/profile_service.py` — own-profile update; blank/null `full_name` and `department` rejected (422); picture may be null; `profile_locked` set on first edit.
- `Backend/app/api/v1/endpoints/users.py` — `GET /api/v1/users/me/profile`, `PATCH /api/v1/users/me/profile`.
- `Backend/app/api/v1/endpoints/auth.py` — `RegisterRequest` requires `full_name` and `department` (min 2 chars, stripped).
- `Backend/app/repositories/course_repository.py` — added missing `list_courses` (fixed `GET /courses` 500); creator `full_name` uses `display_name()` instead of "Unknown".
- `Backend/app/repositories/social_repository.py` — added `get_by_location` for pins and questions (was called but missing → 500); `ReactionRepository.add_reaction_if_absent` / `count_reactions` used by tests and unique-constraint-safe likes.
- `Backend/app/services/source_resolver.py` — deep-link builder; `can_open`/`open_url` invariant (`/workspace/{course_id}?document=...&page=...&target_type=...&target_id=...&selection_start=...`).
- `Backend/app/schemas/user.py`, `Backend/app/schemas/social.py` — user summary / feed / profile schemas.
- `Backend/app/db/models/user.py`, `social.py`, `content_block.py` — model adjustments for community foundation.
- Migrations `0010_community_foundation`, `0011_local_profile_authority` (incl. `ck_users_full_name_present` check), `0012_unique_reactions_saves` — already on disk; **no new migrations were needed**.

### Frontend
- `Frontend/App.tsx` — added `/community/users/:userId` route (Profile page); `/profile/:userId` kept as alias.
- `Frontend/src/utils/routes.ts` — new `publicProfilePath(userId)` helper.
- `Frontend/src/pages/Feed.tsx` — dense desktop layout: normal page scrolling, no snap; scope defaults to `following`; `selectedAuthorId` state threads into `listFeed`, load-more deps, motion key; FollowingRail receives person-filter props.
- `Frontend/src/components/feed/FollowingRail.tsx` — rewritten: right-side "Following" rail; "Everyone" button (null) + per-person toggle buttons; ExternalLink icon deep-links to `publicProfilePath(person.id)`; picture/name/department display; empty-state points at Community → Recommended.
- `Frontend/src/components/feed/EmptyFeedState.tsx` — accepts optional `selectedAuthorId`; person-specific empty copy; keeps scope-based copy otherwise.
- `Frontend/src/components/community/ContentCard.tsx` — compact shared card; author name is a `Link` to the public profile (stopPropagation so card click doesn't fire); clicking anywhere on a question card opens the discussion modal; footer controls already stopPropagation.
- `Frontend/src/components/feed/QuestionDetail.tsx`, `KnowledgePinDetail.tsx` — author name links to the public profile inside the modals.
- `Frontend/src/components/community/ReplyThread.tsx` — no "Unknown member": falls back to "ExamReal Student" (backend always supplies a real name).
- `Frontend/src/utils/socialMappers.ts` — removed `'Unknown'` fallbacks in `authorFromApi` / `feedAuthorFromApi` (email-local-part fallback happens server-side; frontend guard is "ExamReal Student").
- `Frontend/src/pages/Community.tsx` — `openProfile` navigates to `publicProfilePath(userId)`; Following/Recommended tabs unchanged.
- `Frontend/src/services/socialService.ts` — `listFeed` sends `author_id` when set.

## 2. Database migrations added
None beyond the three that were already on disk (`0010`, `0011`, `0012`); chain verified: `0001…0009 → 1ce66eb41058 → 005d5a4d70f9 → 0010 → 0011 → 0012`.

## 3. Backend endpoints / services
- `GET/PATCH /api/v1/users/me/profile` (own profile; authentication enforced; cannot edit others).
- `GET /api/v1/community/feed-items?scope=&type=&author_id=` (person filter added).
- Follow/unfollow, following list (paginated + server-side search), public profile, reactions (unique via DB constraint), replies (nested, parent validated), register (name+department required).

## 4. Frontend pages / components
Feed (dense layout + rail + person filter), Community (public-profile navigation), Profile (own via sidebar, others via `/community/users/:userId`), ContentCard, FollowingRail, EmptyFeedState, QuestionDetail, KnowledgePinDetail, ReplyThread.

## 5. Existing functionality reused
Auth0 SPA auth + local User sync; `listMyFollowing` endpoint (rail mirrors Community Following tab); ContentCard shared by Feed/Profile; `StudyInContextButton` + `source_resolver` deep links; `CourseWorkspace.readDeepLinkFromSearch` highlight; react-query pagination; framer-motion; existing sidebar (Courses/Feed/Community/Profile kept separate).

## 6. Tests added / updated
- Rewritten: `test_auth.py` (sync fill-only, blank-name repair, 401/403, own-profile GET/PATCH, RegisterRequest validation, `profile_locked`), `test_courses.py`, `test_documents.py` (StorageService monkeypatched; Cloudinary not hit), `test_question_flow.py`.
- New: `app/tests/_seed.py` (factories), `test_community_follows.py`, `test_feed.py` (empty/chronological/type/person/person+type/pagination-no-repeats/everyone), `test_social_reactions.py` (like/unlike/duplicate-like/per-viewer/404), `test_question_replies.py` (nested tree, cross-question parent 400, author-only delete, 404), `test_public_profile.py` (public content only, no email leak, follow state, 404).

## 7. Results
- Backend: `pytest -q` → **51 passed** (2 deprecation warnings from FastAPI/Starlette, pre-existing).
- Frontend typecheck: `tsc -p tsconfig.app.json --noEmit` → **clean**.
- Frontend lint: `npx eslint` on all files touched by this feature → **clean (0 problems)**. Full `eslint .` reports **17 errors + 3 warnings, all pre-existing in unrelated files** (Courses.tsx, workspace components, AuthContext.tsx, authService.ts — unused imports/vars and hook-deps warnings). Not touched to avoid scope creep; listed in section 8.
- Frontend build: `npm run build` → **success** (57s; chunk-size advisory warnings only, pre-existing).

## 8. Limitations / assumptions
- No recommendation ranking: the feed is chronological newest-first; the backend does not compute a relevance score (per spec).
- Feed person filter requires an authenticated following relationship; "Everyone" scope on the rail shows the combined following feed (default) and can be switched in the header.
- Migration `0011`'s name-backfill check constraint is Postgres-only SQL; on other dialects the app-level fill-only sync covers it.
- Document upload tests mock `StorageService.upload_file` because real Cloudinary credentials in `.env` would make tests network-dependent.
- Frontend has no test runner configured (no vitest/jest in `package.json`), so the spec's "frontend tests" step is satisfied by typecheck + lint + build; the test matrix is enforced backend-side (51 tests).
- Pre-existing full-repo lint errors (17) and build chunk-size warnings were left untouched — they predate this change and fixing them risks unrelated behavior (e.g. `react-hooks/exhaustive-deps` in PDFViewer).
- Registration/login endpoints call live Auth0 and are exercised indirectly; tests use the local `authed_user` dependency-override fixture instead.
