"""Add Knowledge Pins, Reactions, and SavedItems tables

Revision ID: 0008_social_pins_and_reactions
Revises: 0007_change_embed_dim_1024
Create Date: 2026-08-01

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision: str = "0008_social_pins_and_reactions"
down_revision: Union[str, None] = "0007_change_embed_dim_1024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create Enums
    pintype_enum = postgresql.ENUM(
        "MEMORY_TRICK",
        "EXPLANATION",
        "EXAM_TIP",
        "WARNING",
        "COMMON_MISTAKE",
        "IMPLEMENTATION_TIP",
        "FORMULA_TIP",
        "OTHER",
        name="pintype",
    )
    pintype_enum.create(op.get_bind(), checkfirst=True)

    visibility_enum = postgresql.ENUM(
        "PUBLIC", "FOLLOWERS_ONLY", "PRIVATE", name="visibility"
    )
    visibility_enum.create(op.get_bind(), checkfirst=True)

    targettype_enum = postgresql.ENUM(
        "PIN", "QUESTION", "REPLY", "COURSE", "USER", "TOPIC", name="targettype"
    )
    targettype_enum.create(op.get_bind(), checkfirst=True)

    locationtargettype_enum = postgresql.ENUM(
        "SENTENCE",
        "PARAGRAPH",
        "HEADING",
        "DIAGRAM",
        "IMAGE",
        "EXAM_QUESTION",
        "PAGE",
        name="locationtargettype",
    )
    locationtargettype_enum.create(op.get_bind(), checkfirst=True)

    reactiontype_enum = postgresql.ENUM(
        "LIKE", "HELPFUL", "INSIGHTFUL", name="reactiontype"
    )
    reactiontype_enum.create(op.get_bind(), checkfirst=True)

    # 2. Create knowledge_pins table
    op.create_table(
        "knowledge_pins",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("document_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column(
            "target_type",
            postgresql.ENUM(name="locationtargettype", create_type=False),
            nullable=False,
            server_default="PARAGRAPH",
        ),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("selection_start_offset", sa.Integer(), nullable=True),
        sa.Column("selection_end_offset", sa.Integer(), nullable=True),
        sa.Column("selected_text_snapshot", sa.Text(), nullable=True),
        sa.Column(
            "location_metadata_json",
            postgresql.JSON(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "pin_type",
            postgresql.ENUM(name="pintype", create_type=False),
            nullable=False,
            server_default="EXPLANATION",
        ),
        sa.Column(
            "visibility",
            postgresql.ENUM(name="visibility", create_type=False),
            nullable=False,
            server_default="PUBLIC",
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("likes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("saves_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reports_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_knowledge_pins_id", "knowledge_pins", ["id"])
    op.create_index("ix_knowledge_pins_author_id", "knowledge_pins", ["author_id"])
    op.create_index("ix_knowledge_pins_document_id", "knowledge_pins", ["document_id"])
    op.create_index(
        "ix_knowledge_pins_document_version", "knowledge_pins", ["document_version"]
    )
    op.create_index("ix_knowledge_pins_page_number", "knowledge_pins", ["page_number"])
    op.create_index("ix_knowledge_pins_target_id", "knowledge_pins", ["target_id"])
    op.create_index("ix_knowledge_pins_pin_type", "knowledge_pins", ["pin_type"])
    op.create_index("ix_knowledge_pins_visibility", "knowledge_pins", ["visibility"])
    op.create_index("ix_knowledge_pins_created_at", "knowledge_pins", ["created_at"])

    # 3. Create reactions table
    op.create_table(
        "reactions",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("target_type", postgresql.ENUM(name="targettype", create_type=False), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "reaction_type",
            postgresql.ENUM(name="reactiontype", create_type=False),
            nullable=False,
            server_default="LIKE"
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_reactions_id", "reactions", ["id"])
    op.create_index("ix_reactions_user_id", "reactions", ["user_id"])
    op.create_index("ix_reactions_target_type", "reactions", ["target_type"])
    op.create_index("ix_reactions_target_id", "reactions", ["target_id"])
    op.create_unique_constraint(
        "uq_reactions_user_target_type_id",
        "reactions",
        ["user_id", "target_type", "target_id", "reaction_type"],
    )

    # 4. Create saved_items table
    op.create_table(
        "saved_items",
        sa.Column(
            "id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("target_type", postgresql.ENUM(name="targettype", create_type=False), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_saved_items_id", "saved_items", ["id"])
    op.create_index("ix_saved_items_user_id", "saved_items", ["user_id"])
    op.create_index("ix_saved_items_target_type", "saved_items", ["target_type"])
    op.create_index("ix_saved_items_target_id", "saved_items", ["target_id"])
    op.create_unique_constraint(
        "uq_saved_items_user_target",
        "saved_items",
        ["user_id", "target_type", "target_id"],
    )


def downgrade() -> None:
    op.drop_table("saved_items")
    op.drop_table("reactions")
    op.drop_table("knowledge_pins")

    op.execute("DROP TYPE IF EXISTS reactiontype;")
    op.execute("DROP TYPE IF EXISTS locationtargettype;")
    op.execute("DROP TYPE IF EXISTS targettype;")
    op.execute("DROP TYPE IF EXISTS visibility;")
    op.execute("DROP TYPE IF EXISTS pintype;")
