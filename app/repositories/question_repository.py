import uuid
from typing import Optional, List
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.exam import Exam, Question, Choice
from app.db.models.student_answer import StudentAnswer
from app.repositories.base import BaseRepository


class QuestionRepository(BaseRepository[Question]):
    def __init__(self, session: AsyncSession):
        super().__init__(Question, session)

    async def get_by_id_with_choices(self, question_id: uuid.UUID) -> Optional[Question]:
        statement = (
            select(Question)
            .options(selectinload(Question.choices))
            .where(Question.id == question_id)
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()

    async def list_exam_questions(self, exam_id: uuid.UUID) -> List[Question]:
        statement = (
            select(Question)
            .options(selectinload(Question.choices))
            .where(Question.exam_id == exam_id)
            .order_by(Question.question_number.asc())
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
                selectinload(StudentAnswer.question).selectinload(Question.choices),
                selectinload(StudentAnswer.selected_choice)
            )
            .where(StudentAnswer.id == answer_id)
        )
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()
