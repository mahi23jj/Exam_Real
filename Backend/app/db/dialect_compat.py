"""Cross-dialect type shims.

Postgres-only column types (full-text search vectors, pgvector embeddings) are
declared with `variant` so the same metadata can create tables on SQLite. Tests
and local SQLite runs therefore exercise the real schema instead of needing a
live Postgres instance.
"""

from pgvector.sqlalchemy import Vector
from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.ext.compiler import compiles


class SqliteTextVector(Text):
    """SQLite stand-in for ``pgvector.Vector``.

    Stored as JSON text so values still round-trip; distance maths is not
    expected off Postgres.
    """


@compiles(SqliteTextVector, "sqlite")
def _compile_sqlite_text_vector(element, compiler, **kw):
    return "TEXT"


@compiles(Vector, "sqlite")
def _compile_sqlite_vector(element, compiler, **kw):
    return "TEXT"


@compiles(TSVECTOR, "sqlite")
def _compile_sqlite_tsvvector(element, compiler, **kw):
    return "TEXT"


__all__ = ["SqliteTextVector"]