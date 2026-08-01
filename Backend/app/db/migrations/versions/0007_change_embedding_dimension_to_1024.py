"""Change embedding dimension from 1536 to 1024

Revision ID: 0007_change_embed_dim_1024
Revises: 0006_rag_evolution_schema
Create Date: 2026-07-29

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector

# revision identifiers
revision: str = "0007_change_embed_dim_1024"
down_revision: Union[str, None] = "0006_rag_evolution_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Remove the old vector index
    op.execute("""
        DROP INDEX IF EXISTS ix_embeddings_vector_hnsw;
    """)

    # Remove old vector column
    op.drop_column("embeddings", "vector")

    # Create new vector column
    op.add_column(
        "embeddings",
        sa.Column(
            "vector",
            Vector(1024),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("embeddings", "vector")

    op.add_column(
        "embeddings",
        sa.Column(
            "vector",
            Vector(1536),
            nullable=False,
        ),
    )