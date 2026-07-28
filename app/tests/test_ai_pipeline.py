import pytest
from app.ai.llm.factory import get_llm_provider
from app.ai.llm.openai_provider import OpenAIProvider
from app.ai.document_processing.chunker import SemanticChunker


@pytest.mark.asyncio
async def test_llm_factory_default():
    provider = get_llm_provider("openai")
    assert isinstance(provider, OpenAIProvider)


def test_semantic_chunker():
    chunker = SemanticChunker(target_chunk_size=100)
    pages = [
        {"page_number": 1, "text": "This is page one text. It contains foundational concepts about study loops."},
        {"page_number": 2, "text": "This is page two text. It covers retrieval augmented generation with pgvector."}
    ]
    chunks = chunker.chunk_document_pages(pages)
    assert len(chunks) >= 2
    assert chunks[0]["page_number"] == 1
    assert chunks[0]["block_order"] == 1
    assert "content" in chunks[0]
