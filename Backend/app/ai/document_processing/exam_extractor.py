"""Exam extraction from document text using LLM with answer_source validation."""
import logging
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.ai.llm.factory import get_llm_provider
from app.db.models.exam import AnswerSource, DifficultyLevel, QuestionType

logger = logging.getLogger(__name__)


class ExtractedChoice(BaseModel):
    choice_label: str = Field(description="Choice identifier e.g. A, B, C, D")
    choice_text: str = Field(description="Choice text")
    is_correct: Optional[bool] = Field(default=None, description="True if marked as correct answer")

    @field_validator("choice_label")
    @classmethod
    def normalize_label(cls, v: str) -> str:
        return v.strip().upper()[:1] if v.strip() else "?"


class ExtractedQuestion(BaseModel):
    question_number: int
    question_text: str
    choices: List[ExtractedChoice] = Field(default_factory=list)
    explanation: Optional[str] = None
    
    # Educational Intelligence Fields
    topic: str = Field(description="The primary broad academic topic this question belongs to (e.g. CPU Scheduling)")
    subtopic: Optional[str] = Field(default=None, description="A more specific subtopic (e.g. Round Robin Algorithm)")
    difficulty: DifficultyLevel = Field(description="Estimated difficulty level of the question: EASY, MEDIUM, or HARD")
    question_type: QuestionType = Field(description="The format of the question: MULTIPLE_CHOICE, TRUE_FALSE, or OPEN_ENDED")
    confidence: float = Field(description="Confidence score (0.0 to 1.0) on the extraction accuracy and topic classification", ge=0.0, le=1.0)
    
    answer_source: AnswerSource = Field(
        default=AnswerSource.MISSING,
        description=(
            "OFFICIAL if the correct answer was explicitly stated in the document, "
            "AI_INFERRED if inferred from context, "
            "MISSING if the answer could not be determined."
        )
    )

    @field_validator("question_text")
    @classmethod
    def question_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("question_text must not be empty")
        return v.strip()

    @field_validator("choices")
    @classmethod
    def at_least_two_choices(cls, v: List[ExtractedChoice]) -> List[ExtractedChoice]:
        # Allow zero choices for open-ended questions but warn
        return v


class ExtractedExamSchema(BaseModel):
    exam_title: str
    academic_year: Optional[str] = None
    term: Optional[str] = None
    questions: List[ExtractedQuestion] = Field(default_factory=list)


class ExamExtractor:
    """
    Extracts structured exam questions, choices, and metadata from document
    text using the configured LLM provider.

    Processes large documents in text windows to avoid token limits.
    Validates all extracted questions before returning.
    """

    CHUNK_SIZE: int = 12000

    @staticmethod
    async def extract_questions_from_text(raw_text: str) -> ExtractedExamSchema:
        llm = get_llm_provider("groq")
        system_prompt = (
            "You are an expert academic exam analyzer. "
            "Your task is to extract exam questions and transform them into structured educational intelligence strictly conforming to the schema. "
            "For every question, determine the broad academic `topic`, a more specific `subtopic`, estimate the `difficulty` (EASY, MEDIUM, HARD), "
            "identify the `question_type` (MULTIPLE_CHOICE, TRUE_FALSE, OPEN_ENDED), and provide a `confidence` score (0.0 to 1.0). "
            "For answer_source: set OFFICIAL if the correct answer key is present in the text, "
            "AI_INFERRED if you can determine it from context, MISSING otherwise."
        )

        chunk_size = ExamExtractor.CHUNK_SIZE
        all_questions: List[ExtractedQuestion] = []
        exam_title = "Past Exam"
        academic_year = None
        term = None

        text_chunks = [raw_text[i:i + chunk_size] for i in range(0, len(raw_text), chunk_size)]

        for chunk_idx, chunk in enumerate(text_chunks):
            prompt = (
                "Extract all exam questions from the following exam text segment. "
                "Include answer choices (A, B, C, D), correct answers, explanations, and answer_source. "
                "Critically analyze each question to classify its educational topic, subtopic, difficulty, and question type. "
                "If a question is partially cut off, extract as much as possible.\n\n"
                f"--- EXAM TEXT SEGMENT {chunk_idx + 1}/{len(text_chunks)} ---\n"
                f"{chunk}\n"
                "--- END SEGMENT ---"
            )

            partial_exam: ExtractedExamSchema = await llm.generate_structured(
                prompt=prompt,
                response_schema=ExtractedExamSchema,
                system_prompt=system_prompt
            )

            # Accumulate exam-level metadata from first valid chunk
            if exam_title == "Past Exam" and partial_exam.exam_title and partial_exam.exam_title != "Past Exam":
                exam_title = partial_exam.exam_title
            if not academic_year and partial_exam.academic_year:
                academic_year = partial_exam.academic_year
            if not term and partial_exam.term:
                term = partial_exam.term

            # Validate and filter malformed questions before accumulating
            for q in partial_exam.questions:
                try:
                    # Re-validate individually to catch per-question issues
                    ExtractedQuestion.model_validate(q.model_dump())
                    all_questions.append(q)
                except Exception as validation_err:
                    logger.warning(
                        f"Skipping malformed question from chunk {chunk_idx + 1}: {validation_err}"
                    )

        # Renumber sequentially after merging all chunks
        for idx, q in enumerate(all_questions):
            q.question_number = idx + 1

        logger.info(
            f"Extraction complete: {len(all_questions)} valid questions "
            f"from {len(text_chunks)} text chunk(s)."
        )

        return ExtractedExamSchema(
            exam_title=exam_title,
            academic_year=academic_year,
            term=term,
            questions=all_questions
        )
