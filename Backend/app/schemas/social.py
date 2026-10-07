import uuid
import enum
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.db.models.social import (
    PinType,
    Visibility,
    TargetType,
    LocationTargetType,
    ReactionType,
    ActivityType,
)


class UserSummary(BaseModel):
    """Compact author identity for community payloads.

    Email is intentionally absent: student emails must never be exposed to
    peers. Authenticated callers read their own address from ``/auth/me``.

    ``full_name`` never degrades to a placeholder: a blank stored name falls
    back to the account's email local part so cards always show a real label.
    """

    id: uuid.UUID
    full_name: Optional[str] = None
    picture: Optional[str] = None
    department: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def fill_display_name(cls, data: Any) -> Any:
        if not isinstance(data, dict) and hasattr(data, "id"):
            data = {
                "id": getattr(data, "id", None),
                "full_name": getattr(data, "full_name", None),
                "picture": getattr(data, "picture", None),
                "department": getattr(data, "department", None),
                # used only to derive a display name, never serialised
                "email": getattr(data, "email", None),
            }
        if isinstance(data, dict):
            name = data.get("full_name")
            if isinstance(name, str) and name.strip():
                data = {**data, "full_name": name.strip()}
            else:
                email = data.get("email") if isinstance(data.get("email"), str) else None
                local_part = email.split("@", 1)[0].strip() if email else ""
                data = {**data, "full_name": local_part or "ExamReal Student"}
        return data


class AuthorRelationshipRead(BaseModel):
    """Current viewer's relationship with a content author."""

    is_following: bool = False
    is_self: bool = False


class SharedCourseRead(BaseModel):
    """Course shared between two students, used to explain recommendations."""

    id: uuid.UUID
    title: str
    code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ProfileCourseRead(BaseModel):
    """Course shown on a student profile."""

    id: uuid.UUID
    title: str
    code: Optional[str] = None
    category: Optional[str] = None
    open_url: str

    model_config = ConfigDict(from_attributes=True)


class RecommendedUserRead(BaseModel):
    """A student suggested for discovery, with the reason why."""

    id: uuid.UUID
    full_name: Optional[str] = None
    picture: Optional[str] = None
    department: Optional[str] = None
    same_department: bool = False
    shared_courses: List[SharedCourseRead] = Field(default_factory=list)
    recommendation_reasons: List[str] = Field(default_factory=list)
    is_following: bool = False
    follower_count: int = 0


class RecommendedUserListResponse(BaseModel):
    items: List[RecommendedUserRead]
    total: int
    page: int
    size: int


class ContentSourceRead(BaseModel):
    """Real, resolvable origin of a piece of community content.

    Every field except ``document_id`` is optional because a document may be
    deleted or its course unlinked later. When ``can_open`` is ``False`` the UI
    must hide the "Open in course" affordance rather than linking somewhere
    that no longer exists.
    """

    document_id: uuid.UUID
    document_title: Optional[str] = None
    document_version: Optional[int] = None
    course_id: Optional[uuid.UUID] = None
    course_title: Optional[str] = None
    course_code: Optional[str] = None
    page_number: Optional[int] = None
    target_type: Optional[LocationTargetType] = None
    target_id: Optional[uuid.UUID] = None
    selection_start_offset: Optional[int] = None
    selection_end_offset: Optional[int] = None
    selected_text_snapshot: Optional[str] = None
    # True only when we have a course to route to, i.e. a real deep link exists.
    can_open: bool = False
    open_url: Optional[str] = None

    @model_validator(mode="after")
    def _reconcile_open_url(self) -> "ContentSourceRead":
        # can_open is decided by the server-side resolver, never by the client.
        # This validator only guarantees the two never disagree: a source that
        # claims to be openable must carry a real URL, and a source that cannot
        # be opened must not advertise one.
        if not self.can_open:
            object.__setattr__(self, "open_url", None)
        elif not self.open_url or not self.course_id:
            object.__setattr__(self, "can_open", False)
            object.__setattr__(self, "open_url", None)
        return self


class KnowledgePinBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str
    pin_type: PinType = PinType.EXPLANATION
    visibility: Visibility = Visibility.PUBLIC
    page_number: int = Field(..., ge=1)
    target_type: LocationTargetType = LocationTargetType.PARAGRAPH
    target_id: Optional[uuid.UUID] = None
    selection_start_offset: Optional[int] = None
    selection_end_offset: Optional[int] = None
    selected_text_snapshot: Optional[str] = None
    location_metadata_json: Dict[str, Any] = Field(default_factory=dict)


class KnowledgePinCreate(KnowledgePinBase):
    document_id: uuid.UUID
    document_version: int = Field(default=1, ge=1)


class KnowledgePinUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None
    pin_type: Optional[PinType] = None
    visibility: Optional[Visibility] = None
    selection_start_offset: Optional[int] = None
    selection_end_offset: Optional[int] = None
    selected_text_snapshot: Optional[str] = None
    location_metadata_json: Optional[Dict[str, Any]] = None


class KnowledgePinRead(KnowledgePinBase):
    id: uuid.UUID
    author_id: uuid.UUID
    document_id: uuid.UUID
    document_version: int
    likes_count: int
    saves_count: int
    reports_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    author: Optional[UserSummary] = None
    relationship: Optional[AuthorRelationshipRead] = None
    is_liked_by_me: bool = False
    is_saved_by_me: bool = False
    source: Optional[ContentSourceRead] = None

    model_config = ConfigDict(from_attributes=True)


class KnowledgePinListResponse(BaseModel):
    items: List[KnowledgePinRead]
    total: int
    page: int
    size: int


class ReactionToggleRequest(BaseModel):
    target_type: TargetType
    target_id: uuid.UUID
    reaction_type: ReactionType = ReactionType.LIKE


class ReactionToggleResponse(BaseModel):
    is_reacted: bool
    reaction_type: ReactionType
    new_count: int


class SavedItemToggleResponse(BaseModel):
    is_saved: bool
    new_count: int


# =========================================================
# LEARNING QUESTION & UNLIMITED NESTED REPLIES SCHEMAS
# =========================================================

class LearningQuestionBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str
    visibility: Visibility = Visibility.PUBLIC
    page_number: int = Field(..., ge=1)
    target_type: LocationTargetType = LocationTargetType.PARAGRAPH
    target_id: Optional[uuid.UUID] = None
    selection_start_offset: Optional[int] = None
    selection_end_offset: Optional[int] = None
    selected_text_snapshot: Optional[str] = None
    location_metadata_json: Dict[str, Any] = Field(default_factory=dict)


class LearningQuestionCreate(LearningQuestionBase):
    document_id: uuid.UUID
    document_version: int = Field(default=1, ge=1)


class LearningQuestionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    content: Optional[str] = None
    visibility: Optional[Visibility] = None
    status: Optional[str] = None
    selection_start_offset: Optional[int] = None
    selection_end_offset: Optional[int] = None
    selected_text_snapshot: Optional[str] = None
    location_metadata_json: Optional[Dict[str, Any]] = None


class LearningQuestionRead(LearningQuestionBase):
    id: uuid.UUID
    author_id: uuid.UUID
    document_id: uuid.UUID
    document_version: int
    status: str
    answers_count: int
    views_count: int
    likes_count: int
    saves_count: int
    reports_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    author: Optional[UserSummary] = None
    relationship: Optional[AuthorRelationshipRead] = None
    is_liked_by_me: bool = False
    is_saved_by_me: bool = False
    source: Optional[ContentSourceRead] = None

    model_config = ConfigDict(from_attributes=True)


class LearningQuestionListResponse(BaseModel):
    items: List[LearningQuestionRead]
    total: int
    page: int
    size: int


class QuestionReplyCreate(BaseModel):
    content: str
    parent_reply_id: Optional[uuid.UUID] = None


class QuestionReplyUpdate(BaseModel):
    content: str


class QuestionReplyRead(BaseModel):
    id: uuid.UUID
    question_id: uuid.UUID
    parent_reply_id: Optional[uuid.UUID] = None
    author_id: uuid.UUID
    content: str
    is_accepted_answer: bool
    likes_count: int
    reports_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    author: Optional[UserSummary] = None
    is_liked_by_me: bool = False
    children: List["QuestionReplyRead"] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class QuestionReplyTreeResponse(BaseModel):
    question_id: uuid.UUID
    total_replies: int
    tree: List[QuestionReplyRead]


# =========================================================
# FOLLOW SYSTEM & COMMUNITY PROFILE SCHEMAS
# =========================================================

class FollowToggleRequest(BaseModel):
    target_type: TargetType
    target_id: uuid.UUID


class FollowToggleResponse(BaseModel):
    is_following: bool
    followers_count: int


class FollowUserResponse(BaseModel):
    """Result of an explicit follow / unfollow request on a user."""

    is_following: bool
    followers_count: int
    following_count: int = 0


class FollowStateRead(BaseModel):
    """Read-only relationship snapshot between the viewer and a user."""

    is_following: bool = False
    is_self: bool = False
    followers_count: int = 0
    following_count: int = 0


class FollowUserSummary(BaseModel):
    """One person in a followers / following list."""

    id: uuid.UUID
    full_name: str
    picture: Optional[str] = None
    department: Optional[str] = None
    is_self: bool = False
    is_following: bool = False
    followers_count: int = 0
    following_count: int = 0
    followed_at: Optional[datetime] = None


class FollowUserListResponse(BaseModel):
    items: List[FollowUserSummary]
    total: int
    page: int
    size: int


class CommunityStatsRead(BaseModel):
    total_pins: int = 0
    total_questions: int = 0
    total_answers: int = 0
    total_helpful_contributions: int = 0
    followers_count: int = 0
    following_users_count: int = 0
    following_courses_count: int = 0
    following_count: int = 0


class CommunityProfileRead(BaseModel):
    user: UserSummary
    stats: CommunityStatsRead
    public_pins: List[KnowledgePinRead] = Field(default_factory=list)
    public_questions: List[LearningQuestionRead] = Field(default_factory=list)
    is_following_user: bool = False
    relationship: AuthorRelationshipRead = Field(default_factory=AuthorRelationshipRead)
    courses: List[ProfileCourseRead] = Field(default_factory=list)
    pins_total: int = 0
    questions_total: int = 0
    page: int = 1
    size: int = 10


# =========================================================
# ACTIVITY & FEED SCHEMAS
# =========================================================

class UserActivityRead(BaseModel):
    id: uuid.UUID
    user: UserSummary
    activity_type: ActivityType
    target_type: Optional[TargetType] = None
    target_id: Optional[uuid.UUID] = None
    context_data: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FeedResponse(BaseModel):
    """Legacy activity-event feed. Kept for backwards compatibility."""

    activities: List[UserActivityRead]
    total: int


# =========================================================
# UNIFIED COMMUNITY FEED
# =========================================================


class FeedScope(str, enum.Enum):
    EVERYONE = "everyone"
    FOLLOWING = "following"


class FeedContentType(str, enum.Enum):
    ALL = "all"
    QUESTIONS = "questions"
    PINS = "pins"


class FeedItemRead(BaseModel):
    """One entry in the unified feed: either a question or a pin."""

    content_type: FeedContentType
    id: uuid.UUID
    author: Optional[UserSummary] = None
    relationship: Optional[AuthorRelationshipRead] = None
    created_at: datetime

    pin: Optional[KnowledgePinRead] = None
    question: Optional[LearningQuestionRead] = None

    # Reply counts are computed per page (one grouped query) rather than stored
    # on the question row, so they cannot drift.
    reply_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class FeedPageResponse(BaseModel):
    items: List[FeedItemRead]
    total: int
    page: int
    size: int
    has_more: bool
    scope: FeedScope
    content_type: FeedContentType


# =========================================================
# COMMUNITY CONTEXT SCHEMAS
# =========================================================

class CommunityContextRequest(BaseModel):
    document_id: uuid.UUID
    document_version: int
    target_type: LocationTargetType
    selection_start_offset: Optional[int] = None
    selection_end_offset: Optional[int] = None


class CommunityContextResponse(BaseModel):
    related_pins: List[KnowledgePinRead] = Field(default_factory=list)
    related_questions: List[LearningQuestionRead] = Field(default_factory=list)
    top_contributors: List[UserSummary] = Field(default_factory=list)
