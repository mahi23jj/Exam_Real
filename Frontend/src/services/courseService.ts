import { apiGet, apiPost } from './apiClient';

export type Visibility = 'PUBLIC' | 'PRIVATE';

export interface CourseCreator {
  id: string;
  full_name?: string | null;
}

export interface CourseStats {
  followers_count?: number | null;
  materials_count?: number | null;
  past_exams_count?: number | null;
}

export interface LatestUpdate {
  type?: string | null;
  title?: string | null;
  updated_at?: string | null;
}

export interface ExploreCourse {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  visibility?: Visibility | null;
  creator?: CourseCreator | null;
  stats?: CourseStats | null;
  is_following?: boolean | null;
  created_at?: string | null;
  is_active?: boolean | null;
}

export interface FollowingCourse {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  creator?: CourseCreator | null;
  is_active?: boolean | null;
  latest_update?: LatestUpdate | null;
}

export interface MyCourse {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  visibility?: Visibility | null;
  stats?: CourseStats | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export interface CreateCoursePayload {
  title: string;
  description?: string | null;
  category?: string | null;
  visibility: Visibility;
}

export interface CourseRead {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  category?: string | null;
  visibility?: Visibility | null;
  is_active?: boolean | null;
  created_at?: string | null;
}

export interface ContinueItem {
  id: string;
  type?: string | null;
  title?: string | null;
  subtitle?: string | null;
  last_opened_at?: string | null;
}

export interface PageParams {
  page?: number;
  size?: number;
}

/** Backend paginated responses can come back partially empty; normalise them. */
function normalizePage<T>(response: Paginated<T> | null, page: number, size: number): Paginated<T> {
  return {
    items: Array.isArray(response?.items) ? response!.items : [],
    total: response?.total ?? 0,
    page: response?.page || page,
    size: response?.size || size,
  };
}

export async function createCourse(payload: CreateCoursePayload): Promise<CourseRead> {
  return apiPost<CourseRead>('/courses', payload);
}

export async function getCourse(courseId: string): Promise<CourseRead> {
  return apiGet<CourseRead>(`/courses/${courseId}`);
}

export async function fetchExploreCourses({ page = 1, size = 12 }: PageParams = {}) {
  const data = await apiGet<Paginated<ExploreCourse>>('/courses/explore', { page, size });
  return normalizePage(data, page, size);
}

export async function fetchFollowingCourses({ page = 1, size = 12 }: PageParams = {}) {
  const data = await apiGet<Paginated<FollowingCourse>>('/courses/following', { page, size });
  return normalizePage(data, page, size);
}

export async function fetchMyCourses({ page = 1, size = 12 }: PageParams = {}) {
  const data = await apiGet<Paginated<MyCourse>>('/courses/my-courses', { page, size });
  return normalizePage(data, page, size);
}

export async function fetchContinueItems(limit = 10): Promise<ContinueItem[]> {
  const data = await apiGet<{ items: ContinueItem[] }>('/courses/continue', { limit });
  return Array.isArray(data?.items) ? data.items : [];
}

export interface FollowToggleResult {
  is_following: boolean;
  followers_count: number;
}

export async function toggleCourseFollow(courseId: string): Promise<FollowToggleResult> {
  return apiPost<FollowToggleResult>(`/follows/COURSE/${courseId}/toggle`);
}

export async function trackContinueItem(params: {
  itemId: string;
  title: string;
  subtitle?: string | null;
}): Promise<void> {
  await apiPost('/courses/continue/track', {
    item_type: 'COURSE',
    item_id: params.itemId,
    title: params.title,
    subtitle: params.subtitle ?? null,
    continue_url: params.itemId,
  });
}
