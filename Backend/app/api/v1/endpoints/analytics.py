import uuid
from typing import List, Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_db, get_current_user
from app.db.models.user import User
from app.db.models.course import Course
from app.db.models.exam import TopicAnalytics, TopicYearAnalytics, Topic

router = APIRouter(prefix="/courses/{course_id}/analytics", tags=["analytics"])

@router.get("/topics", response_model=List[Dict[str, Any]])
async def get_course_topic_analytics(
    course_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get aggregated analytics for topics in a course.
    """
    # Verify course exists
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    stmt = (
        select(TopicAnalytics, Topic)
        .join(Topic, TopicAnalytics.topic_id == Topic.id)
        .where(TopicAnalytics.course_id == course_id)
        .order_by(TopicAnalytics.total_questions.desc())
    )
    results = await db.execute(stmt)
    
    analytics_data = []
    for ta, topic in results:
        analytics_data.append({
            "topic_id": topic.id,
            "topic_name": topic.name,
            "normalized_name": topic.normalized_name,
            "total_questions": ta.total_questions
        })
        
    return analytics_data


@router.get("/topics/{topic_id}/years", response_model=List[Dict[str, Any]])
async def get_topic_year_analytics(
    course_id: uuid.UUID,
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get year-by-year frequency analytics for a specific topic in a course.
    """
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
        
    topic = await db.get(Topic, topic_id)
    if not topic or topic.course_id != course_id:
        raise HTTPException(status_code=404, detail="Topic not found in this course")

    stmt = (
        select(TopicYearAnalytics)
        .where(TopicYearAnalytics.topic_id == topic_id)
        .order_by(TopicYearAnalytics.academic_year.desc())
    )
    results = await db.execute(stmt)
    
    return [
        {
            "academic_year": tya.academic_year,
            "question_count": tya.question_count
        }
        for tya in results.scalars().all()
    ]
