import uuid
from typing import Optional, List
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.exam import Exam, PastExamQuestion, Choice
from app.db.models.student_answer import StudentAnswer
from app.repositories.base import BaseRepository


class PastExamQuestionRepository(BaseRepository[PastExamQuestion]):
    def __init__(self, session: AsyncSession):
        super().__init__(PastExamQuestion, session)

    async def get_by_id_with_choices(self, question_id: uuid.UUID) -> Optional[PastExamQuestion]:
        statement = (
            select(PastExamQuestion)
            .options(selectinload(PastExamQuestion.choices))
            .where(PastExamQuestion.id == question_id)
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_exam_questions(self, exam_id: uuid.UUID) -> List[PastExamQuestion]:
        statement = (
            select(PastExamQuestion)
            .options(selectinload(PastExamQuestion.choices))
            .where(PastExamQuestion.exam_id == exam_id)
            .order_by(PastExamQuestion.question_number.asc())
        )
        result = await self.session.execute(statement)
        return list(result.scalars().all())


class StudentAnswerRepository(BaseRepository[StudentAnswer]):
    def __init__(self, session: AsyncSession):
        super().__init__(StudentAnswer, session)

    async def get_by_id_with_details(self, answer_id: uuid.UUID) -> Optional[StudentAnswer]:
        statement = (
            select(StudentAnswer)
            .options(
                selectinload(StudentAnswer.question).selectinload(PastExamQuestion.choices),
                selectinload(StudentAnswer.selected_choice)
            )
            .where(StudentAnswer.id == answer_id)
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()
