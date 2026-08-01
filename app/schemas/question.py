from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.db.models.student_answer import ConfidenceLevel


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


class AnswerFeedbackResponse(BaseModel):
    student_answer_id: uuid.UUID
    question_id: uuid.UUID
    selected_choice_id: uuid.UUID
    is_correct: bool
    correct_choice_label: str
    correct_choice_text: str
    ai_explanation: str
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
