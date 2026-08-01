import logging
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.db.models.exam import Topic, TopicAnalytics, TopicYearAnalytics, PastExamQuestion, Exam

logger = logging.getLogger(__name__)

class AnalyticsService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def update_course_analytics(self, course_id: uuid.UUID) -> None:
        """
        Recomputes TopicAnalytics and TopicYearAnalytics for a given course.
        """
        logger.info(f"Updating analytics for course {course_id}")
        
        # 1. Update TopicAnalytics (total questions per topic in the course)
        # We find all topics for the course
        topics_stmt = select(Topic).where(Topic.course_id == course_id)
        topics = (await self.session.execute(topics_stmt)).scalars().all()
        
        for topic in topics:
            # Count questions
            q_count_stmt = select(func.count(PastExamQuestion.id)).where(PastExamQuestion.topic_id == topic.id)
            total_q = (await self.session.execute(q_count_stmt)).scalar() or 0
            
            # Upsert TopicAnalytics
            ta_stmt = select(TopicAnalytics).where(TopicAnalytics.topic_id == topic.id)
            ta = (await self.session.execute(ta_stmt)).scalar_one_or_none()
            if not ta:
                ta = TopicAnalytics(topic_id=topic.id, course_id=course_id, total_questions=total_q)
                self.session.add(ta)
            else:
                ta.total_questions = total_q
            
            # 2. Update TopicYearAnalytics (questions per topic per year)
            # Group by year
            year_count_stmt = (
                select(Exam.academic_year, func.count(PastExamQuestion.id))
                .join(PastExamQuestion, Exam.id == PastExamQuestion.exam_id)
                .where(PastExamQuestion.topic_id == topic.id)
                .where(Exam.academic_year != None)
                .group_by(Exam.academic_year)
            )
            year_counts = (await self.session.execute(year_count_stmt)).all()
            
            # Upsert TopicYearAnalytics
            for year, count in year_counts:
                tya_stmt = select(TopicYearAnalytics).where(
                    TopicYearAnalytics.topic_id == topic.id,
                    TopicYearAnalytics.academic_year == year
                )
                tya = (await self.session.execute(tya_stmt)).scalar_one_or_none()
                if not tya:
                    tya = TopicYearAnalytics(topic_id=topic.id, academic_year=year, question_count=count)
                    self.session.add(tya)
                else:
                    tya.question_count = count
                    
        await self.session.commit()
        logger.info(f"Finished updating analytics for course {course_id}")
