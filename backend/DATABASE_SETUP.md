# Database Setup Guide

## Overview

This project uses:
- **PostgreSQL 16** with **pgvector** extension for vector embeddings
- **SQLAlchemy** (async) for ORM
- **Alembic** for database migrations

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start PostgreSQL with pgvector
cd infrastructure
docker-compose up -d postgres

# Wait for database to be ready (check health)
docker-compose ps

# Apply migrations
cd ../backend
alembic upgrade head

# (Optional) Seed demo data
python scripts/seed_data.py
```

### Option 2: Local PostgreSQL

**Prerequisites:**
- PostgreSQL 16+ installed
- pgvector extension installed

**Install pgvector:**

```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pgvector

# macOS (Homebrew)
brew install pgvector

# Or build from source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

**Setup:**

```bash
# Create database
createdb agentic_workspace

# Enable pgvector
psql agentic_workspace -c "CREATE EXTENSION vector;"

# Set DATABASE_URL in backend/.env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/agentic_workspace

# Run migrations
cd backend
alembic upgrade head

# (Optional) Seed demo data
python scripts/seed_data.py
```

## Database Schema

### Tables

1. **users** - User accounts for authentication
   - `id` (PK)
   - `email` (unique)
   - `hashed_password`
   - `full_name`
   - `is_active`, `is_superuser`
   - `created_at`, `updated_at`

2. **tenants** - Organizations/Workspaces (multi-tenancy)
   - `id` (PK)
   - `name`
   - `slug` (unique)
   - `created_at`, `updated_at`

3. **user_tenants** - User-Tenant relationships with RBAC
   - `id` (PK)
   - `user_id` (FK → users)
   - `tenant_id` (FK → tenants)
   - `role` (owner, admin, member, viewer)
   - `created_at`
   - **Unique constraint**: (user_id, tenant_id)

4. **documents** - Uploaded files
   - `id` (PK)
   - `tenant_id` (FK → tenants) - Multi-tenant isolation
   - `user_id` (FK → users)
   - `filename`, `file_type`, `file_size`
   - `status` (pending, processing, completed, failed)
   - `storage_key` (S3 key or local path, unique)
   - `error_message`, `metadata` (JSON)
   - `created_at`, `updated_at`

5. **chunks** - Document chunks with vector embeddings
   - `id` (PK)
   - `document_id` (FK → documents, CASCADE delete)
   - `content` (text)
   - `embedding` (vector(1536)) - OpenAI embeddings
   - `metadata` (JSON) - page, section, etc.
   - `created_at`
   - **HNSW index** on embedding for fast similarity search

6. **evaluation_runs** - RAG query quality metrics
   - `id` (PK)
   - `tenant_id` (FK → tenants)
   - `user_id` (FK → users)
   - `query`, `response`
   - `sources` (JSON) - Retrieved chunks
   - `latency_ms`, `token_count`, `quality_score`
   - `user_feedback` (thumbs_up, thumbs_down)
   - `metadata` (JSON)
   - `created_at`

### Indexes

**Performance indexes:**
- All foreign keys (tenant_id, user_id, document_id)
- Status fields for filtering
- Created_at for time-based queries
- Unique constraints (email, slug, storage_key)

**Vector index:**
- HNSW index on chunks.embedding for cosine similarity search
- Configuration: m=16, ef_construction=64 (balanced performance)

## Alembic Commands

### Create a New Migration

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "Add new field to users"

# Create empty migration (manual)
alembic revision -m "Custom migration"
```

### Apply Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Apply specific number of migrations
alembic upgrade +1

# Apply to specific revision
alembic upgrade <revision_id>
```

### Rollback Migrations

```bash
# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade <revision_id>

# Rollback all
alembic downgrade base
```

### View Migration History

```bash
# Show current revision
alembic current

# Show migration history
alembic history

# Show pending migrations
alembic history --verbose
```

## Scripts

### Initialize Database

```bash
cd backend
python scripts/init_db.py
```

This script:
- Tests database connection
- Verifies pgvector extension
- Creates extension if needed

### Seed Demo Data

```bash
cd backend
python scripts/seed_data.py
```

Creates:
- Demo user: `demo@example.com` / `demo123`
- Demo tenant: "Demo Workspace"
- Links user to tenant with owner role

## Troubleshooting

### pgvector extension not found

```bash
# Check if extension is available
psql -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"

# If not, install pgvector (see installation instructions above)
```

### Migration conflicts

```bash
# Check current state
alembic current

# View pending migrations
alembic history

# Force stamp to specific revision (use with caution)
alembic stamp <revision_id>
```

### Connection errors

```bash
# Test connection
psql $DATABASE_URL

# Check if PostgreSQL is running
docker-compose ps postgres
# or
sudo systemctl status postgresql
```

### Reset database (development only)

```bash
# Drop all tables
alembic downgrade base

# Reapply all migrations
alembic upgrade head

# Reseed data
python scripts/seed_data.py
```

## Multi-Tenant Data Isolation

All data-bearing tables include `tenant_id` for multi-tenancy:
- documents
- evaluation_runs

**Best practices:**
1. Always filter by tenant_id in queries
2. Use middleware to inject tenant_id from JWT
3. Add tenant_id to all indexes for performance
4. Test tenant isolation thoroughly

## Vector Search Performance

The chunks table uses HNSW index for fast approximate nearest neighbor search:

```sql
-- Query example (done by retriever service)
SELECT * FROM chunks
WHERE document_id IN (SELECT id FROM documents WHERE tenant_id = :tenant_id)
ORDER BY embedding <=> :query_embedding
LIMIT 10;
```

**Index parameters:**
- `m = 16`: Max connections per layer (higher = better recall, more memory)
- `ef_construction = 64`: Construction quality (higher = better quality, slower build)

For production, consider tuning based on your dataset size and performance needs.

## Connection Pooling

SQLAlchemy async engine is configured with:
- `pool_pre_ping=True` - Test connections before use
- Default pool size: 5 connections
- Max overflow: 10 connections

Adjust in `app/core/database.py` if needed for high traffic.

## Backup & Restore

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql

# Backup with Docker
docker-compose exec postgres pg_dump -U postgres agentic_workspace > backup.sql
```

## Production Considerations

1. **Use connection pooling** - PgBouncer recommended
2. **Enable SSL** - Set `?sslmode=require` in DATABASE_URL
3. **Monitor vector index** - HNSW can be memory-intensive
4. **Regular vacuuming** - Especially for chunks table
5. **Backup strategy** - Regular pg_dump or continuous archiving
6. **Separate read replicas** - For heavy read workloads

## Environment Variables

Required in `.env`:

```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/dbname
DATABASE_ECHO=false  # Set to true for SQL query logging
```

Optional for production:

```env
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=10
DATABASE_POOL_TIMEOUT=30
```

