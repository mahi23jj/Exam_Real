"""Add learning_questions and question_replies tables

Revision ID: 0009_learning_questions_and_replies
Revises: 0008_social_pins_and_reactions
Create Date: 2026-08-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0009_learning_questions_and_replies"
down_revision: Union[str, None] = "0008_social_pins_and_reactions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create QuestionStatus Enum
    questionstatus_enum = postgresql.ENUM(
        'OPEN', 'SOLVED', 'CLOSED',
        name='questionstatus'
    )
    questionstatus_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create learning_questions table
    op.create_table(
        'learning_questions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('documents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('document_version', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('page_number', sa.Integer(), nullable=False),
        sa.Column('target_type', postgresql.ENUM(name='locationtargettype', create_type=False), nullable=False, server_default='PARAGRAPH'),
        sa.Column('target_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('selection_start_offset', sa.Integer(), nullable=True),
        sa.Column('selection_end_offset', sa.Integer(), nullable=True),
        sa.Column('selected_text_snapshot', sa.Text(), nullable=True),
        sa.Column('location_metadata_json', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('visibility', postgresql.ENUM(name='visibility', create_type=False), nullable=False, server_default='PUBLIC'),
        sa.Column('status', questionstatus_enum, nullable=False, server_default='OPEN'),
        sa.Column('answers_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('views_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('likes_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('saves_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reports_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_learning_questions_id', 'learning_questions', ['id'])
    op.create_index('ix_learning_questions_author_id', 'learning_questions', ['author_id'])
    op.create_index('ix_learning_questions_document_id', 'learning_questions', ['document_id'])
    op.create_index('ix_learning_questions_document_version', 'learning_questions', ['document_version'])
    op.create_index('ix_learning_questions_page_number', 'learning_questions', ['page_number'])
    op.create_index('ix_learning_questions_target_id', 'learning_questions', ['target_id'])
    op.create_index('ix_learning_questions_visibility', 'learning_questions', ['visibility'])
    op.create_index('ix_learning_questions_status', 'learning_questions', ['status'])
    op.create_index('ix_learning_questions_created_at', 'learning_questions', ['created_at'])

    # 3. Create question_replies table
    op.create_table(
        'question_replies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('question_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('learning_questions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('parent_reply_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('question_replies.id', ondelete='CASCADE'), nullable=True),
        sa.Column('author_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_accepted_answer', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('likes_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('reports_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('edit_history_json', postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_question_replies_id', 'question_replies', ['id'])
    op.create_index('ix_question_replies_question_id', 'question_replies', ['question_id'])
    op.create_index('ix_question_replies_parent_reply_id', 'question_replies', ['parent_reply_id'])
    op.create_index('ix_question_replies_author_id', 'question_replies', ['author_id'])
    op.create_index('ix_question_replies_is_accepted_answer', 'question_replies', ['is_accepted_answer'])
    op.create_index('ix_question_replies_created_at', 'question_replies', ['created_at'])


def downgrade() -> None:
    op.drop_table('question_replies')
    op.drop_table('learning_questions')
    op.execute("DROP TYPE IF EXISTS questionstatus;")
