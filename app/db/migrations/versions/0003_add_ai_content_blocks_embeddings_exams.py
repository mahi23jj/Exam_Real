"""Add ContentBlocks, Embeddings (pgvector), Exams, Questions, Choices, and Links tables

Revision ID: 0003_add_ai_tables
Revises: 0002_add_courses_and_documents
Create Date: 2026-07-25 14:46:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel
from pgvector.sqlalchemy import Vector

revision: str = "0003_add_ai_tables"
down_revision: Union[str, None] = "0002_add_courses_and_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Content Blocks Table
    op.create_table(
        "content_blocks",
        sa.Column("id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("document_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("block_order", sa.Integer(), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_content_blocks_id"), "content_blocks", ["id"], unique=False)
    op.create_index(op.f("ix_content_blocks_document_id"), "content_blocks", ["document_id"], unique=False)
    op.create_index(op.f("ix_content_blocks_page_number"), "content_blocks", ["page_number"], unique=False)

    # 2. Embeddings Table with 1536-dimensional Vector
    op.create_table(
        "embeddings",
        sa.Column("id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("content_block_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("vector", Vector(1536), nullable=False),
        sa.Column("model_name", sa.String(), nullable=False, server_default="text-embedding-3-small"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["content_block_id"], ["content_blocks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_embeddings_id"), "embeddings", ["id"], unique=False)
    op.create_index(op.f("ix_embeddings_content_block_id"), "embeddings", ["content_block_id"], unique=True)

    # Create HNSW vector index for fast similarity search
    op.execute("CREATE INDEX IF NOT EXISTS ix_embeddings_vector_hnsw ON embeddings USING hnsw (vector vector_cosine_ops);")

    # 3. Exams Table
    op.create_table(
        "exams",
        sa.Column("id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("document_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("academic_year", sa.String(length=50), nullable=True),
        sa.Column("term", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_exams_id"), "exams", ["id"], unique=False)
    op.create_index(op.f("ix_exams_document_id"), "exams", ["document_id"], unique=True)

    # 4. Questions Table
    op.create_table(
        "questions",
        sa.Column("id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("exam_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("question_number", sa.Integer(), nullable=False),
        sa.Column("question_text", sa.String(), nullable=False),
        sa.Column("question_image_url", sa.String(), nullable=True),
        sa.Column("explanation", sa.String(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_questions_id"), "questions", ["id"], unique=False)
    op.create_index(op.f("ix_questions_exam_id"), "questions", ["exam_id"], unique=False)
    op.create_index(op.f("ix_questions_question_number"), "questions", ["question_number"], unique=False)

    # 5. Choices Table
    op.create_table(
        "choices",
        sa.Column("id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("question_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("choice_label", sa.String(length=10), nullable=False),
        sa.Column("choice_text", sa.String(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_choices_id"), "choices", ["id"], unique=False)
    op.create_index(op.f("ix_choices_question_id"), "choices", ["question_id"], unique=False)

    # 6. Question ContentBlock Link Table
    op.create_table(
        "question_content_block_links",
        sa.Column("id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("question_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("content_block_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("similarity_score", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["content_block_id"], ["content_blocks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_question_content_block_links_id"), "question_content_block_links", ["id"], unique=False)
    op.create_index(op.f("ix_question_content_block_links_question_id"), "question_content_block_links", ["question_id"], unique=False)
    op.create_index(op.f("ix_question_content_block_links_content_block_id"), "question_content_block_links", ["content_block_id"], unique=False)


def downgrade() -> None:
    op.drop_table("question_content_block_links")
    op.drop_table("choices")
    op.drop_table("questions")
    op.drop_table("exams")
    op.execute("DROP INDEX IF EXISTS ix_embeddings_vector_hnsw;")
    op.drop_table("embeddings")
    op.drop_table("content_blocks")
