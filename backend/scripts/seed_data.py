"""Seed database with initial data for development/testing.

Creates:
- A demo user (demo@example.com)
- A demo tenant (Demo Workspace)
- Links user to tenant with owner role
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.core.logging import get_logger
from app.models.user import User
from app.models.tenant import Tenant, UserTenant, RoleEnum

logger = get_logger(__name__)


async def seed_demo_data():
    """Create demo user and tenant."""
    async with AsyncSessionLocal() as session:
        try:
            # Check if demo user already exists
            result = await session.execute(
                select(User).where(User.email == "demo@example.com")
            )
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                logger.info("demo_user_already_exists")
                return
            
            # Create demo user
            demo_user = User(
                email="demo@example.com",
                hashed_password=hash_password("demo123"),
                full_name="Demo User",
                is_active=True,
                is_superuser=False,
            )
            session.add(demo_user)
            await session.flush()
            
            # Create demo tenant
            demo_tenant = Tenant(
                name="Demo Workspace",
                slug="demo-workspace",
            )
            session.add(demo_tenant)
            await session.flush()
            
            # Link user to tenant with owner role
            user_tenant = UserTenant(
                user_id=demo_user.id,
                tenant_id=demo_tenant.id,
                role=RoleEnum.OWNER,
            )
            session.add(user_tenant)
            
            await session.commit()
            
            logger.info(
                "demo_data_created",
                user_email="demo@example.com",
                tenant_slug="demo-workspace",
            )
            print("\n✅ Demo data created successfully!")
            print(f"   Email: demo@example.com")
            print(f"   Password: demo123")
            print(f"   Tenant: Demo Workspace (demo-workspace)")
            
        except Exception as e:
            await session.rollback()
            logger.error("failed_to_create_demo_data", error=str(e))
            print(f"\n❌ Failed to create demo data: {e}")
            raise


async def main():
    """Run seed data creation."""
    logger.info("starting_database_seeding")
    await seed_demo_data()
    logger.info("database_seeding_complete")


if __name__ == "__main__":
    asyncio.run(main())

