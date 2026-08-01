import asyncio
import logging

from app.workers.celery import celery_app
from app.db.session import AsyncSessionLocal
from app.services.document_processing_service import DocumentProcessingPipeline

logger = logging.getLogger(__name__)

async def run_pipeline_wrapper(document_id: str, job_id: str):
    async with AsyncSessionLocal() as session:
        pipeline = DocumentProcessingPipeline(session)
        return await pipeline.run_pipeline(document_id, job_id)

@celery_app.task(name="process_document_task", bind=True, max_retries=3)
def process_document_task(self, document_id: str, job_id: str):
    """Celery task entry point for asynchronous AI document processing pipeline."""
    logger.info(f"Starting Celery background job {job_id} for document {document_id}")
    try:
        result = asyncio.run(run_pipeline_wrapper(document_id, job_id))
        return result
    except Exception as exc:
        logger.error(f"Error processing document {document_id}: {exc}")
        self.retry(exc=exc, countdown=10)
