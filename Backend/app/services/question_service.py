"""Question service with hybrid retrieval, confidence-based prompting, and explanation caching."""
import logging
import uuid
from typing import List, Optional

from fastapi import HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embeddings.bge_m3_provider import BGEM3EmbeddingProvider
from app.ai.llm.factory import get_llm_provider
from app.ai.retrieval.hybrid_retriever import HybridRetriever
from app.ai.retrieval.confidence_evaluator import RetrievalConfidenceEvaluator, ConfidenceLevel
from app.db.models.document import Document
from app.db.models.exam import Exam, PastExamQuestion, Choice
from app.db.models.student_answer import StudentAnswer, ConfidenceLevel as StudentConfidenceLevel
from app.db.models.user import User
from app.repositories.question_repository import PastExamQuestionRepository, StudentAnswerRepository
from app.schemas.question import (
    ChoiceInitialRead,
    QuestionInitialRead,
    AnswerSubmitRequest,
    AnswerFeedbackResponse,
    AnswerHistoryItem,
    RelevantNoteBlock,
    SimilarQuestionResponse,
    ExplanationSource,
)
from app.services.cache_service import ExplanationCacheService

logger = logging.getLogger(__name__)


class QuestionService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.question_repo = PastExamQuestionRepository(session)
        self.answer_repo = StudentAnswerRepository(session)
        self.embedding_provider = BGEM3EmbeddingProvider()
        self.hybrid_retriever = HybridRetriever(session)
        self.confidence_evaluator = RetrievalConfidenceEvaluator()
        self.cache_service = ExplanationCacheService()
        self.llm = get_llm_provider("groq")

    def _map_question_read(self, q: PastExamQuestion) -> QuestionInitialRead:
        """Maps a PastExamQuestion to its read schema, preserving PDF location data."""
        choice_reads = [ChoiceInitialRead.model_validate(c) for c in q.choices]
        return QuestionInitialRead(
            id=q.id,
            exam_id=q.exam_id,
            question_number=q.question_number,
            question_text=q.question_text,
            question_image_url=q.question_image_url,
            page_number=q.page_number,
            location_json=q.location_json or {},
            subtopic=q.subtopic,
            difficulty=q.difficulty.value if q.difficulty else None,
            question_type=q.question_type.value if q.question_type else None,
            choices=choice_reads
        )

    async def get_exam_questions(self, exam_id: uuid.UUID) -> List[QuestionInitialRead]:
        """Retrieves questions for an exam with choices (without revealing correct answers)."""
        questions = await self.question_repo.list_exam_questions(exam_id)
        return [self._map_question_read(q) for q in questions]

    async def get_document_questions(self, document_id: uuid.UUID) -> List[QuestionInitialRead]:
        """Retrieves questions for the past exam attached to a PAST_EXAM document."""
        exam = (
            await self.session.execute(
                select(Exam).where(Exam.document_id == document_id)
            )
        ).scalar_one_or_none()
        if not exam:
            raise HTTPException(
                status_code=404,
                detail="No past exam found for this document (or it is still processing)."
            )
        questions = await self.question_repo.list_document_questions(document_id)
        return [self._map_question_read(q) for q in questions]

    async def get_answer_history(
        self,
        document_id: uuid.UUID,
        current_user: User
    ) -> List[AnswerHistoryItem]:
        """Returns the current student's practice attempts for a past-exam document."""
        answers = await self.answer_repo.list_for_document(current_user.id, document_id)
        result: List[AnswerHistoryItem] = []
        for ans in answers:
            question = ans.question
            if not question:
                continue
            correct_choice = next(
                (c for c in question.choices if c.is_correct),
                None
            )
            result.append(
                AnswerHistoryItem(
                    answer_id=ans.id,
                    question_id=question.id,
                    question_number=question.question_number,
                    question_text=question.question_text,
                    selected_choice_label=ans.selected_choice.choice_label if ans.selected_choice else None,
                    selected_choice_text=ans.selected_choice.choice_text if ans.selected_choice else None,
                    is_correct=ans.is_correct,
                    correct_choice_label=correct_choice.choice_label if correct_choice else None,
                    correct_choice_text=correct_choice.choice_text if correct_choice else None,
                    ai_explanation=ans.ai_generated_explanation,
                    confidence=ans.confidence.value if ans.confidence else None,
                    answered_at=ans.created_at
                )
            )
        return result

    async def submit_answer(
        self,
        question_id: uuid.UUID,
        req: AnswerSubmitRequest,
        current_user: User
    ) -> AnswerFeedbackResponse:
        """
        Validates student answer, runs hybrid RAG retrieval, evaluates confidence,
        generates pedagogically appropriate AI explanation (with caching), and saves result.
        """
        question = await self.question_repo.get_by_id_with_choices(question_id)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found.")

        selected_choice = next(
            (c for c in question.choices if c.id == req.selected_choice_id), None
        )
        if not selected_choice:
            raise HTTPException(status_code=400, detail="Invalid choice selected for this question.")

        correct_choice = next(
            (c for c in question.choices if c.is_correct),
            question.choices[0] if question.choices else None
        )
        is_correct = (selected_choice.id == correct_choice.id) if correct_choice else False

        # ── Fetch course_id and doc version via single JOIN ───────────────────
        stmt = (
            select(Document.course_id, Document.version)
            .join(Exam, Exam.document_id == Document.id)
            .where(Exam.id == question.exam_id)
        )
        res = await self.session.execute(stmt)
        row = res.first()
        course_id = row[0] if row else uuid.uuid4()
        doc_version = row[1] if row else 1

        # ── Cache Check ───────────────────────────────────────────────────────
        cached_explanation = await self.cache_service.get(
            question_id=str(question_id),
            selected_choice_id=str(selected_choice.id),
            doc_version=doc_version
        )
        if cached_explanation:
            logger.info(f"Cache hit for question {question_id}")
            relevant_note_blocks = []
            ai_explanation = cached_explanation
            explanation_source = ExplanationSource.GENERAL_KNOWLEDGE  # cached; source unknown, safe default
        else:
            # ── Hybrid Retrieval ──────────────────────────────────────────────
            relevant_note_blocks, ai_explanation, explanation_source = await self._retrieve_and_explain(
                question=question,
                selected_choice=selected_choice,
                correct_choice=correct_choice,
                course_id=course_id,
                is_correct=is_correct,
                req=req
            )
            # Cache the freshly generated explanation
            await self.cache_service.set(
                question_id=str(question_id),
                selected_choice_id=str(selected_choice.id),
                doc_version=doc_version,
                explanation=ai_explanation
            )

        # ── Save StudentAnswer ────────────────────────────────────────────────
        student_answer = StudentAnswer(
            student_id=current_user.id,
            question_id=question_id,
            selected_choice_id=selected_choice.id,
            confidence=req.confidence,
            reasoning_text=req.reasoning_text,
            is_correct=is_correct,
            ai_generated_explanation=ai_explanation
        )
        saved_answer = await self.answer_repo.create(student_answer)

        return AnswerFeedbackResponse(
            student_answer_id=saved_answer.id,
            question_id=question_id,
            selected_choice_id=selected_choice.id,
            is_correct=is_correct,
            correct_choice_label=correct_choice.choice_label if correct_choice else "A",
            correct_choice_text=correct_choice.choice_text if correct_choice else "",
            ai_explanation=ai_explanation,
            explanation_source=explanation_source,
            relevant_notes=relevant_note_blocks
        )

    async def _retrieve_and_explain(
        self,
        question,
        selected_choice,
        correct_choice,
        course_id: uuid.UUID,
        is_correct: bool,
        req: AnswerSubmitRequest
    ):
        """Runs hybrid retrieval, evaluates confidence, and generates a pedagogical explanation."""
        relevant_note_blocks = []
        confidence = ConfidenceLevel.LOW
        reranked_results = []

        try:
            q_vector = await self.embedding_provider.embed_text(question.question_text)
            reranked_results = await self.hybrid_retriever.search(
                query_text=question.question_text,
                query_vector=q_vector,
                course_id=course_id,
                semantic_top_k=20,
                fts_top_k=20,
                rerank_top_k=5
            )
            confidence = self.confidence_evaluator.evaluate(reranked_results)
        except Exception as e:
            logger.warning(f"Hybrid retrieval failed for question {question.id}: {e}")

        # Build relevant note blocks for response
        doc_ids = {block.document_id for block, _ in reranked_results}
        doc_map = {}
        if doc_ids:
            docs_stmt = select(Document).where(Document.id.in_(doc_ids))
            docs_res = await self.session.execute(docs_stmt)
            doc_map = {d.id: d.title for d in docs_res.scalars().all()}

        for block, score in reranked_results:
            block_meta = block.metadata_json or {}
            relevant_note_blocks.append(
                RelevantNoteBlock(
                    content_block_id=block.id,
                    document_id=block.document_id,
                    document_title=doc_map.get(block.document_id, "Course Note"),
                    page_number=block.page_number,
                    content_snippet=block.content[:250] + ("..." if len(block.content) > 250 else ""),
                    similarity_score=round(score, 4),
                    location_json=block_meta.get("location", {}),
                )
            )

        notes_text = "\n".join(
            [f"- [Source: {b.document_title}, Page {b.page_number}]: {b.content_snippet}"
             for b in relevant_note_blocks]
        )

        # Determine explanation source BEFORE building prompt
        if confidence == ConfidenceLevel.LOW:
            explanation_source = ExplanationSource.GENERAL_KNOWLEDGE
            # Clear notes so the response never includes irrelevant/weak citations
            relevant_note_blocks = []
            notes_text = ""
        else:
            explanation_source = ExplanationSource.COURSE_NOTES

        prompt = self._build_pedagogical_prompt(
            question=question,
            selected_choice=selected_choice,
            correct_choice=correct_choice,
            is_correct=is_correct,
            confidence=confidence,
            notes_text=notes_text,
            req=req
        )
        system_prompt = self._get_system_prompt(confidence)
        ai_explanation = await self.llm.generate_response(
            prompt=prompt, system_prompt=system_prompt
        )

        return relevant_note_blocks, ai_explanation, explanation_source

    def _build_pedagogical_prompt(
        self,
        question,
        selected_choice,
        correct_choice,
        is_correct: bool,
        confidence: ConfidenceLevel,
        notes_text: str,
        req: AnswerSubmitRequest
    ) -> str:
        """
        Constructs a pedagogically appropriate prompt based on:
          - Whether the student was correct
          - Retrieval confidence (HIGH/MEDIUM/LOW)
          - Student's own reasoning and confidence level
        """
        base_context = (
            f"Question: {question.question_text}\n"
            f"Student Selected: {selected_choice.choice_label}) {selected_choice.choice_text}\n"
            f"Correct Answer: {correct_choice.choice_label}) {correct_choice.choice_text}\n"
            f"Student Confidence: {req.confidence.value}\n"
            f"Student Reasoning: {req.reasoning_text or 'None provided'}\n\n"
        )

        wrong_answer_guidance = ""
        if not is_correct:
            wrong_answer_guidance = (
                f"IMPORTANT PEDAGOGICAL REQUIREMENT:\n"
                f"The student selected: {selected_choice.choice_label}) {selected_choice.choice_text}\n"
                f"You MUST:\n"
                f"1. Explain WHY option {selected_choice.choice_label} looks attractive "
                f"(what makes it seem plausible).\n"
                f"2. Explain specifically WHY it is incorrect.\n"
                f"3. Then explain WHY option {correct_choice.choice_label} is the correct answer.\n"
                f"Do NOT simply explain the correct answer without addressing the wrong choice.\n\n"
            )

        if confidence == ConfidenceLevel.HIGH:
            notes_section = (
                f"Relevant Course Notes (HIGH confidence — base your answer STRICTLY on these):\n"
                f"{notes_text}\n\n"
                "Use ONLY the course notes above. Do not add external information. "
                "Cite the specific source and page number for each claim."
            )
        elif confidence == ConfidenceLevel.MEDIUM:
            notes_section = (
                f"Relevant Course Notes (MEDIUM confidence — supplement with general knowledge if needed):\n"
                f"{notes_text}\n\n"
                "Use the course notes as your primary source. If they are insufficient, "
                "supplement with general academic knowledge but clearly label it as "
                "[General Knowledge] vs [Course Notes: <source>]."
            )
        else:  # LOW — no usable notes, explain from general knowledge
            notes_section = (
                "Course Notes: NONE FOUND for this topic.\n\n"
                "Provide a complete educational explanation using your general knowledge. You MUST:\n"
                "1. Acknowledge briefly that this topic was not found in the course notes.\n"
                "2. Explain why the student's chosen answer is correct or incorrect.\n"
                "3. Explain clearly why the correct answer is correct.\n"
                "4. Explain the underlying concept with any useful context or example.\n"
                "5. End with a concise key takeaway.\n"
                "Do NOT refuse. Do NOT cite course notes. Provide a full, high-quality explanation."
            )

        return base_context + wrong_answer_guidance + notes_section

    def _get_system_prompt(self, confidence: ConfidenceLevel) -> str:
        if confidence == ConfidenceLevel.HIGH:
            return (
                "You are a precise academic tutor. Answer ONLY from course notes. "
                "Cite sources explicitly. Never speculate beyond provided notes."
            )
        elif confidence == ConfidenceLevel.MEDIUM:
            return (
                "You are an academic tutor. Prioritize course notes. "
                "Clearly distinguish between course material and general knowledge."
            )
        else:
            return (
                "You are a helpful academic tutor. The student's uploaded course notes do not adequately cover "
                "this topic. You MUST still provide a complete, high-quality educational explanation. "
                "Begin your response with a short notice that this topic was not found in the course notes "
                "(e.g. '⚠️ Not covered in your course notes'). "
                "Then give a thorough explanation using your general knowledge: explain why the chosen answer "
                "is correct or incorrect, why the correct answer is correct, the underlying concept, "
                "and a key takeaway. "
                "Never claim the explanation came from the course notes. Never refuse to answer."
            )

    async def explain_differently(
        self,
        answer_id: uuid.UUID,
        preferred_style: str,
        current_user: User
    ) -> str:
        """Generates an alternative explanation tailored to student preference."""
        answer = await self.answer_repo.get_by_id_with_details(answer_id)
        if not answer or not answer.question:
            raise HTTPException(status_code=404, detail="Answer session not found.")

        prompt = (
            f"Question: {answer.question.question_text}\n"
            f"Previous Explanation: {answer.ai_generated_explanation or ''}\n\n"
            f"Please explain this concept again using {preferred_style}. "
            "Focus on making it intuitive and memorable."
        )
        return await self.llm.generate_response(
            prompt=prompt, system_prompt="You are a creative academic tutor."
        )

    async def generate_similar_question(
        self,
        answer_id: uuid.UUID,
        current_user: User
    ) -> SimilarQuestionResponse:
        """Generates a similar practice question testing the same underlying concepts."""
        answer = await self.answer_repo.get_by_id_with_details(answer_id)
        if not answer or not answer.question:
            raise HTTPException(status_code=404, detail="Answer session not found.")

        prompt = (
            f"Base Question: {answer.question.question_text}\n\n"
            "Generate a brand-new practice question testing the exact same conceptual principle, "
            "with 4 multiple choice options (A, B, C, D), clearly marked correct choice, and a brief solution."
        )
        return await self.llm.generate_structured(
            prompt=prompt,
            response_schema=SimilarQuestionResponse,
            system_prompt="Generate a new multiple choice question conforming to the schema."
        )

    async def ask_followup(
        self,
        answer_id: uuid.UUID,
        user_question: str,
        current_user: User
    ) -> str:
        """Answers student follow-up question regarding the question context."""
        answer = await self.answer_repo.get_by_id_with_details(answer_id)
        if not answer or not answer.question:
            raise HTTPException(status_code=404, detail="Answer session not found.")

        prompt = (
            f"Question: {answer.question.question_text}\n"
            f"Explanation given: {answer.ai_generated_explanation}\n\n"
            f"Student asks follow-up: {user_question}\n\n"
            "Provide a direct, clear answer addressing the student's question."
        )
        return await self.llm.generate_response(
            prompt=prompt, system_prompt="You are an interactive AI tutor."
        )
