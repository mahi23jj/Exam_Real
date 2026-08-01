import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict

from app.db.models.social import Visibility
from app.db.models.study_history import StudyItemType


class CourseBase(BaseModel):
    code: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    visibility: Visibility = Visibility.PUBLIC


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    visibility: Optional[Visibility] = None
    is_active: Optional[bool] = None


class CourseRead(CourseBase):
    id: uuid.UUID
    created_by_user_id: uuid.UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseListResponse(BaseModel):
    items: List[CourseRead]
    total: int
    page: int
    size: int


# ── Card Data Contracts ────────────────────────────────────────────────────────

class CourseCardStats(BaseModel):
    followers_count: int = 0
    materials_count: int = 0
    past_exams_count: int = 0


class CourseCreatorRead(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class ExploreCourseCardRead(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    visibility: Visibility
    creator: CourseCreatorRead
    stats: CourseCardStats
    is_following: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExploreCourseListResponse(BaseModel):
    items: List[ExploreCourseCardRead]
    total: int
    page: int
    size: int


class LatestUpdateRead(BaseModel):
    type: str
    title: str
    updated_at: datetime


class FollowingCourseCardRead(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    creator: CourseCreatorRead
    latest_update: Optional[LatestUpdateRead] = None
    open_url: str

    model_config = ConfigDict(from_attributes=True)


class FollowingCourseListResponse(BaseModel):
    items: List[FollowingCourseCardRead]
    total: int
    page: int
    size: int


class MyCourseCardRead(BaseModel):
    id: uuid.UUID
    code: str
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    visibility: Visibility
    creator_role: str
    stats: CourseCardStats
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MyCourseListResponse(BaseModel):
    items: List[MyCourseCardRead]
    total: int
    page: int
    size: int


# ── Continue Section Contracts ─────────────────────────────────────────────────

class ContinueItemRead(BaseModel):
    id: uuid.UUID
    type: StudyItemType
    title: str
    subtitle: Optional[str] = None
    last_opened_at: datetime
    continue_url: str

    model_config = ConfigDict(from_attributes=True)


class ContinueItemListResponse(BaseModel):
    items: List[ContinueItemRead]


class TrackStudyItemRequest(BaseModel):
    item_type: StudyItemType
    item_id: uuid.UUID
    title: str
    subtitle: Optional[str] = None
    continue_url: str
