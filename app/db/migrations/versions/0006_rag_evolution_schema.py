"""RAG evolution schema: version, answer_source, FTS tsvector, trigger

Revision ID: 0006_rag_evolution_schema
Revises: 0005_add_hnsw_vector_index
Create Date: 2026-07-27 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '0006_rag_evolution_schema'
down_revision = '0005_add_hnsw_vector_index'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add version column to documents
    op.add_column(
        'documents',
        sa.Column('version', sa.Integer(), nullable=False, server_default='1')
    )

    # 2. Add answer_source enum type and column to questions
    answer_source_enum = postgresql.ENUM(
        'OFFICIAL', 'AI_INFERRED', 'MISSING',
        name='answersource'
    )
    answer_source_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        'questions',
        sa.Column(
            'answer_source',
            sa.Enum('OFFICIAL', 'AI_INFERRED', 'MISSING', name='answersource'),
            nullable=False,
            server_default='MISSING'
        )
    )

    # 3. Add tsvector column to content_blocks for Full Text Search
    op.add_column(
        'content_blocks',
        sa.Column('content_tsv', postgresql.TSVECTOR(), nullable=True)
    )

    # 4. Populate tsvector for all existing content_blocks
    op.execute(
        """
        UPDATE content_blocks
        SET content_tsv = to_tsvector('english', content)
        WHERE content_tsv IS NULL;
        """
    )

    # 5. Create GIN index on tsvector for fast FTS queries
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_content_blocks_content_tsv_gin
        ON content_blocks USING gin(content_tsv);
        """
    )

    # 6. Create a DB trigger to auto-update tsvector on insert/update
    op.execute(
        """
        CREATE OR REPLACE FUNCTION content_blocks_tsv_trigger()
        RETURNS trigger AS $$
        BEGIN
            NEW.content_tsv := to_tsvector('english', NEW.content);
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        DROP TRIGGER IF EXISTS tsvector_update_trigger ON content_blocks;
        CREATE TRIGGER tsvector_update_trigger
        BEFORE INSERT OR UPDATE OF content
        ON content_blocks
        FOR EACH ROW
        EXECUTE FUNCTION content_blocks_tsv_trigger();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS tsvector_update_trigger ON content_blocks;")
    op.execute("DROP FUNCTION IF EXISTS content_blocks_tsv_trigger();")
    op.execute("DROP INDEX IF EXISTS ix_content_blocks_content_tsv_gin;")
    op.drop_column('content_blocks', 'content_tsv')
    op.drop_column('questions', 'answer_source')
    op.execute("DROP TYPE IF EXISTS answersource;")
    op.drop_column('documents', 'version')
