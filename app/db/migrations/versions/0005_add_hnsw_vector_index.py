"""Add HNSW index for vector column

Revision ID: 0005_add_hnsw_vector_index
Revises: 0004_add_student_answers
Create Date: 2026-07-27 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0005_add_hnsw_vector_index'
down_revision = '0004_add_student_answers'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Creating an HNSW index on the embeddings.vector column for cosine similarity
    # Note: Requires pgvector extension to be enabled
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_embeddings_vector_hnsw 
        ON embeddings 
        USING hnsw (vector vector_cosine_ops) 
        WITH (m = 16, ef_construction = 64);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_embeddings_vector_hnsw;")
