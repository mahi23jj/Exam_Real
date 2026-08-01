"""Document Processing Pipeline — orchestrates AI ingestion with vision and local embeddings."""
import logging
import uuid
from typing import List, Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.db.models.document import Document, FileType, DocumentType, JobStatus
from app.db.models.job import DocumentProcessingJob
from app.db.models.content_block import ContentBlock, Embedding
from app.db.models.exam import Exam, PastExamQuestion, Choice, QuestionContentBlockLink, AnswerSource, Topic

from app.ai.document_processing.pdf_parser import PDFParser
from app.ai.document_processing.ppt_parser import PPTParser
from app.ai.ocr.ocr_engine import OCREngine
from app.ai.document_processing.chunker import SemanticChunker
from app.ai.document_processing.exam_extractor import ExamExtractor
from app.ai.document_processing.layout_matcher import LayoutMatcher
from app.ai.embeddings.bge_m3_provider import BGEM3EmbeddingProvider
from app.ai.vision.florence_provider import FlorenceVisionProvider
from app.services.storage_service import StorageService
from app.services.analytics_service import AnalyticsService
from app.ai.retrieval.vector_store import VectorStoreRetriever

logger = logging.getLogger(__name__)


class DocumentProcessingPipeline:
    """
    Orchestrates the full AI document ingestion process:
      1. Parse (PDF/PPT/OCR)
      2. Vision description for image-heavy pages (Florence-2)
      3. Semantic chunking
      4. Store ContentBlocks
      5. Embed with BGE-M3 (local, no API cost)
      6. Extract structured exam questions (LLM, if PAST_EXAM)
      7. Link questions to ContentBlocks for analytics
    """

    def __init__(self, session: AsyncSession):
        self.session = session
        self.storage_service = StorageService()
        self.vision_provider = FlorenceVisionProvider()
        self.embedding_provider = BGEM3EmbeddingProvider()

    async def run_pipeline(self, document_id_str: str, job_id_str: str) -> Dict[str, Any]:
        doc_uuid = uuid.UUID(document_id_str)
        job_uuid = uuid.UUID(job_id_str)

        doc_stmt = select(Document).where(Document.id == doc_uuid)
        document = (await self.session.execute(doc_stmt)).scalar_one_or_none()

        job_stmt = select(DocumentProcessingJob).where(DocumentProcessingJob.id == job_uuid)
        job = (await self.session.execute(job_stmt)).scalar_one_or_none()

        if not document or not job:
            raise ValueError(f"Document {document_id_str} or Job {job_id_str} not found.")

        await self._update_status(job, document, JobStatus.PROCESSING, "PARSING_DOCUMENT")

        try:
            # ── Step 1: Download & Parse ─────────────────────────────────────
            file_bytes = await self.storage_service.get_document_bytes(document.cloudinary_secure_url)
            pages: List[Dict[str, Any]] = self._parse_document(document, file_bytes)

            # ── Step 2: Vision enrichment for image-heavy pages ──────────────
            await self._update_status(job, document, JobStatus.PROCESSING, "VISION_ENRICHMENT")
            pages = await self._enrich_pages_with_vision(document, file_bytes, pages)

            # ── Step 3: Semantic Chunking ────────────────────────────────────
            await self._update_status(job, document, JobStatus.PROCESSING, "CHUNKING_CONTENT")
            chunker = SemanticChunker(target_chunk_size=500, overlap=50)
            blocks_data = chunker.chunk_document_pages(pages)

            # ── Step 4: Save ContentBlocks (bulk insert) ─────────────────────
            db_content_blocks = [
                ContentBlock(
                    document_id=document.id,
                    page_number=b["page_number"],
                    block_order=b["block_order"],
                    content=b["content"],
                    metadata_json=b.get("metadata_json", {})
                )
                for b in blocks_data
            ]
            self.session.add_all(db_content_blocks)
            await self.session.commit()
            for cb in db_content_blocks:
                await self.session.refresh(cb)

            # ── Step 5: Generate Embeddings (BGE-M3, batched) ────────────────
            await self._update_status(job, document, JobStatus.PROCESSING, "GENERATING_EMBEDDINGS")
            texts = [cb.content for cb in db_content_blocks]

            if texts:
                vectors = await self.embedding_provider.embed_batch(texts)
                embeddings = [
                    Embedding(
                        content_block_id=cb.id,
                        vector=vector,
                        model_name="BAAI/bge-m3"
                    )
                    for cb, vector in zip(db_content_blocks, vectors)
                ]
                self.session.add_all(embeddings)
                await self.session.commit()

            # ── Step 6: Exam Extraction (if PAST_EXAM) ───────────────────────
            if document.doc_type == DocumentType.PAST_EXAM:
                await self._extract_and_save_exam(document, job, pages, db_content_blocks)
                
                # ── Step 6.5: Analytics Update ───────────────────────────────────
                await self._update_status(job, document, JobStatus.PROCESSING, "UPDATING_ANALYTICS")
                analytics_service = AnalyticsService(self.session)
                await analytics_service.update_course_analytics(document.course_id)

            # ── Step 7: Mark Complete ────────────────────────────────────────
            await self._update_status(job, document, JobStatus.COMPLETED, "COMPLETED")

            return {
                "status": "COMPLETED",
                "document_id": document_id_str,
                "job_id": job_id_str,
                "total_blocks": len(db_content_blocks)
            }

        except Exception as exc:
            logger.error(f"Pipeline error for document {document_id_str}: {exc}", exc_info=True)
            job.status = JobStatus.FAILED
            job.current_step = "FAILED"
            job.error_message = str(exc)
            document.status = JobStatus.FAILED
            self.session.add(job)
            self.session.add(document)
            await self.session.commit()
            raise

    def _parse_document(self, document: Document, file_bytes: bytes) -> List[Dict[str, Any]]:
        """Dispatches to the correct parser based on file type."""
        if document.file_type == FileType.PDF:
            pages = PDFParser.parse_pdf_bytes(file_bytes)
        elif document.file_type in [FileType.PPT, FileType.PPTX]:
            pages = PPTParser.parse_ppt_bytes(file_bytes)
        elif document.file_type == FileType.IMAGE:
            ocr_text = OCREngine.extract_text_from_image_bytes(file_bytes)
            pages = [{"page_number": 1, "text": ocr_text or document.title}]
        else:
            pages = [{"page_number": 1, "text": document.title}]

        return pages if pages else [{"page_number": 1, "text": document.title}]

    async def _enrich_pages_with_vision(
        self,
        document: Document,
        file_bytes: bytes,
        pages: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        For PDF pages where extracted text is very short (image-heavy),
        extract the page as an image and run Florence-2 to get a description.
        The description is merged with the existing (potentially empty) OCR text.
        """
        # Only applicable to PDFs and images (PPT slides are harder to re-render per-page)
        if document.file_type not in [FileType.PDF, FileType.IMAGE]:
            return pages

        enriched_pages = []
        for page in pages:
            text = page.get("text", "")
            if FlorenceVisionProvider.is_image_heavy(text):
                try:
                    page_image_bytes = self._extract_page_image(
                        file_bytes, document.file_type, page["page_number"]
                    )
                    if page_image_bytes:
                        description = await self.vision_provider.describe_image(page_image_bytes)
                        if description:
                            merged = (
                                f"{text}\n\n[Image Description]: {description}".strip()
                                if text.strip() else f"[Image Description]: {description}"
                            )
                            page = {**page, "text": merged}
                            logger.debug(
                                f"Vision enriched page {page['page_number']} "
                                f"(+{len(description)} chars)"
                            )
                except Exception as e:
                    logger.warning(
                        f"Vision enrichment failed for page {page.get('page_number')}: {e}"
                    )
            enriched_pages.append(page)
        return enriched_pages

    def _extract_page_image(
        self,
        file_bytes: bytes,
        file_type: FileType,
        page_number: int
    ) -> Optional[bytes]:
        """Renders a single PDF page as PNG bytes for vision processing."""
        if file_type != FileType.PDF:
            return None
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            page_idx = page_number - 1
            if page_idx < 0 or page_idx >= len(doc):
                return None
            page = doc.load_page(page_idx)
            mat = fitz.Matrix(2.0, 2.0)  # 2x scale for better OCR/vision quality
            pix = page.get_pixmap(matrix=mat)
            return pix.tobytes("png")
        except Exception as e:
            logger.warning(f"Failed to render PDF page {page_number} as image: {e}")
            return None

    async def _extract_and_save_exam(
        self,
        document: Document,
        job: DocumentProcessingJob,
        pages: List[Dict[str, Any]],
        db_content_blocks: List[ContentBlock]
    ) -> None:
        """Handles exam extraction, topic normalization, question saving, and content block linking."""
        await self._update_status(job, document, JobStatus.PROCESSING, "EXTRACTING_EXAM_QUESTIONS")

        full_raw_text = "\n\n".join([p["text"] for p in pages if p.get("text")])
        extracted_exam = await ExamExtractor.extract_questions_from_text(full_raw_text)

        exam_obj = Exam(
            document_id=document.id,
            title=extracted_exam.exam_title or document.title,
            academic_year=extracted_exam.academic_year,
            term=extracted_exam.term
        )
        self.session.add(exam_obj)
        await self.session.commit()
        await self.session.refresh(exam_obj)

        # Normalize Topics
        await self._update_status(job, document, JobStatus.PROCESSING, "NORMALIZING_TOPICS")
        topic_cache = {}  # Cache by normalized_name

        questions_with_choices = []
        for q_data in extracted_exam.questions:
            # Topic Normalization
            normalized_name = q_data.topic.strip().lower()
            if normalized_name not in topic_cache:
                stmt = select(Topic).where(
                    Topic.course_id == document.course_id,
                    Topic.normalized_name == normalized_name
                )
                existing_topic = (await self.session.execute(stmt)).scalar_one_or_none()
                if not existing_topic:
                    new_topic = Topic(
                        course_id=document.course_id,
                        name=q_data.topic.strip(),
                        normalized_name=normalized_name
                    )
                    self.session.add(new_topic)
                    await self.session.commit()
                    await self.session.refresh(new_topic)
                    topic_cache[normalized_name] = new_topic
                else:
                    topic_cache[normalized_name] = existing_topic

            topic_obj = topic_cache[normalized_name]

            # Match PDF Location
            choice_texts = [c.choice_text for c in q_data.choices]
            page_num, loc_json = LayoutMatcher.match_question_location(
                question_text=q_data.question_text,
                choice_texts=choice_texts,
                pages=pages
            )

            q_obj = PastExamQuestion(
                exam_id=exam_obj.id,
                topic_id=topic_obj.id,
                question_number=q_data.question_number,
                question_text=q_data.question_text,
                explanation=q_data.explanation,
                subtopic=q_data.subtopic,
                difficulty=q_data.difficulty,
                question_type=q_data.question_type,
                confidence=q_data.confidence,
                answer_source=q_data.answer_source,
                page_number=page_num,
                location_json=loc_json,
                metadata_json={}
            )
            questions_with_choices.append((q_obj, q_data.choices))

        # Bulk save all questions
        question_objs = [q for q, _ in questions_with_choices]
        self.session.add_all(question_objs)
        await self.session.commit()
        for q_obj in question_objs:
            await self.session.refresh(q_obj)

        # Bulk save all choices
        choices_to_save = [
            Choice(
                question_id=q_obj.id,
                choice_label=c.choice_label,
                choice_text=c.choice_text,
                is_correct=c.is_correct
            )
            for q_obj, choices in questions_with_choices
            for c in choices
        ]
        self.session.add_all(choices_to_save)
        await self.session.commit()

        # Link questions to their most relevant ContentBlocks (for analytics)
        if db_content_blocks:
            await self._link_questions_to_blocks(
                question_objs, document.course_id
            )

    async def _link_questions_to_blocks(
        self,
        question_objs: List[PastExamQuestion],
        course_id: uuid.UUID
    ) -> None:
        """Semantically links each question to its top 2 ContentBlocks for traceability."""
        retriever = VectorStoreRetriever(self.session)
        links_to_save = []

        for q_obj in question_objs:
            try:
                q_vector = await self.embedding_provider.embed_text(q_obj.question_text)
                matched = await retriever.search_similar_content_blocks(
                    query_vector=q_vector,
                    course_id=course_id,
                    top_k=2
                )
                for matched_block, sim_score in matched:
                    links_to_save.append(QuestionContentBlockLink(
                        question_id=q_obj.id,
                        content_block_id=matched_block.id,
                        similarity_score=sim_score
                    ))
            except Exception as link_err:
                logger.warning(
                    f"Could not link question {q_obj.id} to ContentBlocks: {link_err}"
                )

        if links_to_save:
            self.session.add_all(links_to_save)
            await self.session.commit()

    async def _update_status(
        self,
        job: DocumentProcessingJob,
        document: Document,
        status: JobStatus,
        step: str
    ) -> None:
        """Updates job and document status and commits atomically."""
        job.status = status
        job.current_step = step
        if status in (JobStatus.COMPLETED, JobStatus.FAILED):
            job.error_message = None if status == JobStatus.COMPLETED else job.error_message
        document.status = status
        self.session.add(job)
        self.session.add(document)
        await self.session.commit()
