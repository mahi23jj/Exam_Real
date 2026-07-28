"""Add Courses, Documents, and DocumentProcessingJobs tables

Revision ID: 0002_add_courses_and_documents
Revises: 0001_initial_users_and_tokens
Create Date: 2026-07-25 14:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = "0002_add_courses_and_documents"
down_revision: Union[str, None] = "0001_initial_users_and_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Courses Table
    op.create_table(
        "courses",
        sa.Column("id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("created_by_user_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_courses_id"), "courses", ["id"], unique=False)
    op.create_index(op.f("ix_courses_code"), "courses", ["code"], unique=True)
    op.create_index(op.f("ix_courses_created_by_user_id"), "courses", ["created_by_user_id"], unique=False)

    # 2. Documents Table
    op.create_table(
        "documents",
        sa.Column("id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("course_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("uploaded_by_user_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_type", sa.Enum("PDF", "PPT", "PPTX", "IMAGE", name="filetype"), nullable=False),
        sa.Column("doc_type", sa.Enum("NOTE", "PAST_EXAM", name="documenttype"), nullable=False),
        sa.Column("cloudinary_public_id", sa.String(), nullable=False),
        sa.Column("cloudinary_secure_url", sa.String(), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="jobstatus"), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_documents_id"), "documents", ["id"], unique=False)
    op.create_index(op.f("ix_documents_course_id"), "documents", ["course_id"], unique=False)
    op.create_index(op.f("ix_documents_uploaded_by_user_id"), "documents", ["uploaded_by_user_id"], unique=False)

    # 3. Document Processing Jobs Table
    op.create_table(
        "document_processing_jobs",
        sa.Column("id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("document_id", sqlmodel.sql.sqltypes.GUID(), nullable=False),
        sa.Column("status", sa.Enum("PENDING", "PROCESSING", "COMPLETED", "FAILED", name="jobstatus_job"), nullable=False),
        sa.Column("current_step", sa.String(length=100), nullable=False),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_document_processing_jobs_id"), "document_processing_jobs", ["id"], unique=False)
    op.create_index(op.f("ix_document_processing_jobs_document_id"), "document_processing_jobs", ["document_id"], unique=False)
    op.create_index(op.f("ix_document_processing_jobs_status"), "document_processing_jobs", ["status"], unique=False)


def downgrade() -> None:
    op.drop_table("document_processing_jobs")
    op.drop_table("documents")
    op.drop_table("courses")
    op.execute("DROP TYPE IF EXISTS filetype;")
    op.execute("DROP TYPE IF EXISTS documenttype;")
    op.execute("DROP TYPE IF EXISTS jobstatus;")
    op.execute("DROP TYPE IF EXISTS jobstatus_job;")
