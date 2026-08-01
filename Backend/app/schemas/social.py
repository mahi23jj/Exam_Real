import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

from app.db.models.social import (
    PinType,
    Visibility,
    TargetType,
    LocationTargetType,
    ReactionType,
    ActivityType,
)


class UserSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


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
    is_liked_by_me: bool = False
    is_saved_by_me: bool = False

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
    is_liked_by_me: bool = False
    is_saved_by_me: bool = False

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


class CommunityStatsRead(BaseModel):
    total_pins: int = 0
    total_questions: int = 0
    total_answers: int = 0
    total_helpful_contributions: int = 0
    followers_count: int = 0
    following_users_count: int = 0
    following_courses_count: int = 0


class CommunityProfileRead(BaseModel):
    user: UserSummary
    stats: CommunityStatsRead
    public_pins: List[KnowledgePinRead] = Field(default_factory=list)
    public_questions: List[LearningQuestionRead] = Field(default_factory=list)
    is_following_user: bool = False


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
    activities: List[UserActivityRead]
    total: int


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
