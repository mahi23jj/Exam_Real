import enum
import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.student_answer import ConfidenceLevel


class ExplanationSource(str, enum.Enum):
    COURSE_NOTES = "COURSE_NOTES"
    GENERAL_KNOWLEDGE = "GENERAL_KNOWLEDGE"


class ChoiceInitialRead(BaseModel):
    id: uuid.UUID
    choice_label: str
    choice_text: str

    model_config = ConfigDict(from_attributes=True)


class QuestionInitialRead(BaseModel):
    id: uuid.UUID
    exam_id: uuid.UUID
    question_number: int
    question_text: str
    question_image_url: Optional[str] = None
    page_number: Optional[int] = None
    location: Dict[str, Any] = Field(default_factory=dict, validation_alias="location_json")
    subtopic: Optional[str] = None
    difficulty: Optional[str] = None
    question_type: Optional[str] = None
    choices: List[ChoiceInitialRead]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AnswerHistoryItem(BaseModel):
    """A single past practice attempt by the requesting student."""
    answer_id: uuid.UUID
    question_id: uuid.UUID
    question_number: int
    question_text: str
    selected_choice_label: Optional[str] = None
    selected_choice_text: Optional[str] = None
    is_correct: Optional[bool] = None
    correct_choice_label: Optional[str] = None
    correct_choice_text: Optional[str] = None
    ai_explanation: Optional[str] = None
    explanation_source: ExplanationSource = ExplanationSource.GENERAL_KNOWLEDGE
    confidence: Optional[str] = None
    answered_at: datetime


class AnswerSubmitRequest(BaseModel):
    selected_choice_id: uuid.UUID
    confidence: ConfidenceLevel
    reasoning_text: Optional[str] = None


class RelevantNoteBlock(BaseModel):
    content_block_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    page_number: int
    content_snippet: str
    similarity_score: float
    location: Dict[str, Any] = Field(default_factory=dict, validation_alias="location_json")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)



class AnswerFeedbackResponse(BaseModel):
    student_answer_id: uuid.UUID
    question_id: uuid.UUID
    selected_choice_id: uuid.UUID
    is_correct: bool
    correct_choice_label: str
    correct_choice_text: str
    ai_explanation: str
    explanation_source: ExplanationSource = ExplanationSource.GENERAL_KNOWLEDGE
    relevant_notes: List[RelevantNoteBlock]


class ExplainDifferentlyRequest(BaseModel):
    preferred_style: Optional[str] = "simple analogy and visual bullet points"


class FollowUpQuestionRequest(BaseModel):
    user_question: str


class FollowUpQuestionResponse(BaseModel):
    answer_text: str


class SimilarQuestionChoice(BaseModel):
    label: str
    text: str


class SimilarQuestionResponse(BaseModel):
    new_question_text: str
    choices: List[SimilarQuestionChoice]
    correct_choice_label: str
    explanation: str
