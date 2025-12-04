"""Database initialization script.

This script:
1. Tests database connection
2. Ensures pgvector extension is installed
3. Runs Alembic migrations
4. Optionally seeds initial data
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import engine
from app.core.logging import get_logger

logger = get_logger(__name__)


async def check_pgvector() -> bool:
    """Check if pgvector extension is available."""
    try:
        async with engine.connect() as conn:
            result = await conn.execute(
                text("SELECT * FROM pg_available_extensions WHERE name = 'vector'")
            )
            row = result.fetchone()
            if row:
                logger.info("pgvector extension is available")
                return True
            else:
                logger.error("pgvector extension is NOT available")
                return False
    except Exception as e:
        logger.error("failed_to_check_pgvector", error=str(e))
        return False


async def test_connection() -> bool:
    """Test database connection."""
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()
            logger.info("database_connection_successful")
            return True
    except Exception as e:
        logger.error("database_connection_failed", error=str(e))
        return False


async def create_extension() -> bool:
    """Create pgvector extension if it doesn't exist."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.commit()
            logger.info("pgvector_extension_created")
            return True
    except Exception as e:
        logger.error("failed_to_create_extension", error=str(e))
        return False


async def main():
    """Run database initialization."""
    logger.info("starting_database_initialization")
    
    # Test connection
    if not await test_connection():
        logger.error("Cannot connect to database. Check your DATABASE_URL.")
        sys.exit(1)
    
    # Check and create pgvector extension
    if not await check_pgvector():
        logger.error("pgvector extension not available. Install it first.")
        sys.exit(1)
    
    await create_extension()
    
    logger.info("database_initialization_complete")
    logger.info("Run 'alembic upgrade head' to apply migrations")
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())

