"""Dialect-portable helpers for conflict-tolerant writes.

The social tables carry unique constraints (one like per user per target, one
save per user per target). Toggling therefore has to be safe under concurrent
requests: a plain check-then-insert both duplicates rows and drifts the
denormalised counters. These helpers use the dialect's native
"insert ... on conflict do nothing" so the decision is made by the database.
"""

from typing import Any, Optional

from sqlmodel import func, select
from sqlalchemy import Table
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession


def _dialect_name(session: AsyncSession) -> Optional[str]:
    """Best-effort dialect lookup that never triggers lazy IO.

    ``AsyncSession.get_bind()`` is a coroutine, so calling it from synchronous
    code would raise ``MissingGreenlet``. The bind is always configured in this
    project (both the app and the tests use bound session factories), so the
    engine can be read straight off the session.
    """
    candidates = (
        getattr(session, "bind", None),
        getattr(getattr(session, "sync_session", None), "bind", None),
    )
    for candidate in candidates:
        if candidate is None:
            continue
        dialect = getattr(candidate, "dialect", None)
        if dialect is None:
            engine = getattr(candidate, "sync_engine", None) or getattr(
                getattr(candidate, "engine", None), "dialect", None
            )
            dialect = engine
        name = getattr(dialect, "name", None)
        if name:
            return name
    return None


def _dialect_insert(session: AsyncSession, table: Table):
    """Insert construct for the active dialect, defaulting to Postgres.

    Postgres is the production database; SQLite is used by the test suite. Both
    support ``ON CONFLICT DO NOTHING`` with identical semantics.
    """
    name = _dialect_name(session)
    if name == "sqlite":
        return sqlite_insert(table)
    return pg_insert(table)


async def insert_ignoring_conflicts(
    session: AsyncSession,
    table: Table,
    values: dict[str, Any],
) -> bool:
    """Inserts one row, returning ``False`` if a unique constraint rejected it."""
    statement = _dialect_insert(session, table).on_conflict_do_nothing().values(**values)
    result = await session.execute(statement)
    rowcount = result.rowcount
    return rowcount is None or rowcount > 0


async def delete_matching(
    session: AsyncSession,
    table: Table,
    conditions: list[Any],
) -> int:
    """Deletes matching rows and returns how many were removed."""
    result = await session.execute(table.delete().where(*conditions))
    rowcount = result.rowcount
    return rowcount if rowcount is not None else 0


async def count_matching(
    session: AsyncSession,
    table: Table,
    conditions: Optional[list[Any]] = None,
) -> int:
    statement = select(func.count()).select_from(table)
    if conditions:
        statement = statement.where(*conditions)
    result = await session.execute(statement)
    return result.scalar_one() or 0