// Feed-specific TypeScript interfaces

import type { PinType, Comment } from '../../types/workspace';
import type { ContentSourceRead } from '../../services/socialService';

export type FeedItemType = 'pin' | 'question';

/**
 * The backend does not yet compute a recommendation score, so cards must not
 * claim a reason. Promote this to a real enum once ranking exists.
 */

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
  // Source reference for "Study in Context"
  documentId: string;
  sectionId: string;
  /** Server-resolved origin. Absent or `can_open: false` means no deep link. */
  source?: ContentSourceRead | null;
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
  // Source reference for "Study in Context"
  documentId: string;
  sectionId: string;
  /** Server-resolved origin. Absent or `can_open: false` means no deep link. */
  source?: ContentSourceRead | null;
}

export type FeedItem = FeedPin | FeedQuestion;
