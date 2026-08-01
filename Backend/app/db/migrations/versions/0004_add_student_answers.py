"""Add student_answers table for interactive question flow

Revision ID: 0004_add_student_answers
Revises: 0003_add_ai_tables
Create Date: 2026-07-25 14:48:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = "0004_add_student_answers"
down_revision: Union[str, None] = "0003_add_ai_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "student_answers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("student_id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("selected_choice_id", sa.UUID(), nullable=True),
        sa.Column("confidence", sa.Enum("CONFIDENT", "UNSURE", "GUESS", name="confidencelevel"), nullable=False),
        sa.Column("reasoning_text", sa.String(), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("ai_generated_explanation", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["selected_choice_id"], ["choices.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id")
    )
    op.create_index(op.f("ix_student_answers_id"), "student_answers", ["id"], unique=False)
    op.create_index(op.f("ix_student_answers_student_id"), "student_answers", ["student_id"], unique=False)
    op.create_index(op.f("ix_student_answers_question_id"), "student_answers", ["question_id"], unique=False)


def downgrade() -> None:
    op.drop_table("student_answers")
    op.execute("DROP TYPE IF EXISTS confidencelevel;")
