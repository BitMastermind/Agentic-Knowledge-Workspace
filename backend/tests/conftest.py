"""Pytest configuration and shared fixtures."""

import asyncio
import os
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from fastapi.testclient import TestClient
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.models.user import User
from app.models.tenant import Tenant, UserTenant
from app.core.config import settings

# Use test database URL or in-memory SQLite for testing
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///:memory:"
)

# Create test engine with SQLite (in-memory for speed)
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in TEST_DATABASE_URL else {},
    poolclass=StaticPool if "sqlite" in TEST_DATABASE_URL else None,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a fresh database session for each test."""
    # Create all tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()
    
    # Drop all tables after test
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def test_client(db_session: AsyncSession):
    """Create a test client with dependency overrides."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password=hash_password("testpassword123"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_tenant(db_session: AsyncSession) -> Tenant:
    """Create a test tenant."""
    tenant = Tenant(name="Test Tenant", slug="test-tenant")
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest_asyncio.fixture
async def test_user_with_tenant(db_session: AsyncSession, test_user: User, test_tenant: Tenant):
    """Create a user with tenant relationship."""
    from app.models.tenant import RoleEnum
    user_tenant = UserTenant(
        user_id=test_user.id,
        tenant_id=test_tenant.id,
        role=RoleEnum.OWNER,
    )
    db_session.add(user_tenant)
    await db_session.commit()
    return test_user, test_tenant, user_tenant


@pytest_asyncio.fixture
async def test_token(test_user_with_tenant):
    """Create a test JWT token."""
    user, tenant, user_tenant = test_user_with_tenant
    return create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "tenant_id": tenant.id,
            "user_id": user.id,
            "role": user_tenant.role.value if hasattr(user_tenant.role, 'value') else str(user_tenant.role),
        }
    )


@pytest_asyncio.fixture
async def auth_headers(test_token):
    """Get authorization headers for authenticated requests."""
    token = test_token
    return {"Authorization": f"Bearer {token}"}

