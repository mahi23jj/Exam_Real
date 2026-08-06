// Feed-specific TypeScript interfaces

import type { PinType, Author, Comment } from '../../types/workspace';

export type FeedItemType = 'pin' | 'question';

export type RecommendationReason =
  | 'recommended_from_course'
  | 'popular_this_week'
  | 'same_topic'
  | 'from_someone_you_follow';

export const recommendationLabels: Record<RecommendationReason, string> = {
  recommended_from_course: 'Recommended from a course you follow',
  popular_this_week: 'Popular this week',
  same_topic: 'Same topic you studied recently',
  from_someone_you_follow: 'From someone you follow',
};

export interface FeedAuthor {
  id: string;
  name: string;
  initials: string;
  department?: string;
}

export interface FeedPin {
  id: string;
  type: 'pin';
  pinType: PinType;
  course: string;
  courseId: string;
  topic: string;
  anchorText: string;
  content: string;
  author: FeedAuthor;
  postedAt: string;
  likes: number;
  saved: boolean;
  liked: boolean;
  recommendation: RecommendationReason;
  // Source reference for "Study in Context"
  documentId: string;
  sectionId: string;
}

export interface FeedQuestion {
  id: string;
  type: 'question';
  course: string;
  courseId: string;
  topic: string;
  anchorText: string;
  content: string;
  author: FeedAuthor;
  postedAt: string;
  likes: number;
  liked: boolean;
  saved: boolean;
  replies: Comment[];
  replyCount: number;
  recommendation: RecommendationReason;
  // Source reference for "Study in Context"
  documentId: string;
  sectionId: string;
}

export type FeedItem = FeedPin | FeedQuestion;
