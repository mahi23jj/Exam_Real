import uuid
from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.question import (
    QuestionInitialRead,
    AnswerSubmitRequest,
    AnswerFeedbackResponse,
    ExplainDifferentlyRequest,
    FollowUpQuestionRequest,
    FollowUpQuestionResponse,
    SimilarQuestionResponse,
)
from app.services.question_service import QuestionService

router = APIRouter(tags=["Question Flow & RAG AI Tutor"])


@router.get(
    "/exams/{exam_id}/questions",
    response_model=List[QuestionInitialRead],
    status_code=status.HTTP_200_OK,
    summary="Get all questions for a past exam (without revealing correct choices)"
)
async def get_exam_questions(
    exam_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
) -> List[QuestionInitialRead]:
    """Retrieves all questions and choices for an exam prior to student submission."""
    service = QuestionService(db)
    return await service.get_exam_questions(exam_id)


@router.post(
    "/questions/{question_id}/submit",
    response_model=AnswerFeedbackResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit student answer, confidence, and reasoning to unlock correct answer and RAG AI explanation"
)
async def submit_answer(
    question_id: uuid.UUID,
    req: AnswerSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AnswerFeedbackResponse:
    """Evaluates student submission and returns correct choice, RAG note references with page numbers, and AI tutor explanation."""
    service = QuestionService(db)
    return await service.submit_answer(question_id=question_id, req=req, current_user=current_user)


@router.post(
    "/answers/{answer_id}/explain-differently",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Request alternative AI explanation using a specific style or analogy"
)
async def explain_differently(
    answer_id: uuid.UUID,
    req: ExplainDifferentlyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """Generates an alternative explanation for the question."""
    service = QuestionService(db)
    explanation = await service.explain_differently(
        answer_id=answer_id,
        preferred_style=req.preferred_style or "analogies",
        current_user=current_user
    )
    return {"explanation": explanation}


@router.post(
    "/answers/{answer_id}/similar-question",
    response_model=SimilarQuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a new similar practice question testing the same concept"
)
async def generate_similar_question(
    answer_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SimilarQuestionResponse:
    """Generates a variation practice question with multiple choice options."""
    service = QuestionService(db)
    return await service.generate_similar_question(answer_id=answer_id, current_user=current_user)


@router.post(
    "/answers/{answer_id}/followup",
    response_model=FollowUpQuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask a follow-up question to the RAG AI Tutor"
)
async def ask_followup(
    answer_id: uuid.UUID,
    req: FollowUpQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> FollowUpQuestionResponse:
    """Interactively answer student follow-up questions regarding the exam concept."""
    service = QuestionService(db)
    ans_text = await service.ask_followup(
        answer_id=answer_id,
        user_question=req.user_question,
        current_user=current_user
    )
    return FollowUpQuestionResponse(answer_text=ans_text)
