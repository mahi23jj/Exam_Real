import asyncio
from typing import AsyncGenerator, Optional
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel, pool

from main import app
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.db.models.user import User
from app.db.session import get_db

# In-Memory Async SQLite for tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=pool.StaticPool,
)

TestingSessionLocal = sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _get_test_db():
        yield db_session

    app.dependency_overrides[get_db] = _get_test_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def authed_user(db_session: AsyncSession) -> User:
    """
    A local user standing in for a verified Auth0 identity.

    Authentication is Auth0-only, so tests override `get_current_user` rather
    than minting a token. This exercises the real authorization logic (ownership,
    visibility, follow state) without needing a live Auth0 tenant.
    """
    user = User(
        email="tester@example.com",
        full_name="Test Student",
        department="Computer Science",
        profile_locked=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    async def _override() -> User:
        return user

    app.dependency_overrides[get_current_user] = _override

    async def _override_optional() -> User:
        return user

    app.dependency_overrides[get_current_user_optional] = _override_optional

    yield user

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_user_optional, None)


@pytest_asyncio.fixture
async def guest_client(client: AsyncClient) -> AsyncClient:
    """A client with no authenticated user."""
    return client
