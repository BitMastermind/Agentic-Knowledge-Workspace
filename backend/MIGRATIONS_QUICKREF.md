# Database Migrations Quick Reference

## Setup (First Time)

```bash
# 1. Ensure PostgreSQL is running with pgvector
docker-compose up -d postgres
# or use local PostgreSQL

# 2. Initialize database (test connection, enable pgvector)
python scripts/init_db.py

# 3. Apply all migrations
alembic upgrade head

# 4. (Optional) Create demo data
python scripts/seed_data.py
```

## Common Commands

### Apply Migrations

```bash
# Apply all pending migrations
alembic upgrade head

# Apply next migration only
alembic upgrade +1

# Apply to specific revision
alembic upgrade abc123
```

### Create New Migration

```bash
# Auto-generate from model changes (recommended)
alembic revision --autogenerate -m "Add user avatar field"

# Create empty migration (for custom SQL)
alembic revision -m "Add custom index"
```

### Rollback

```bash
# Rollback one migration
alembic downgrade -1

# Rollback to specific revision
alembic downgrade abc123

# Rollback all (DANGER!)
alembic downgrade base
```

### View Status

```bash
# Show current revision
alembic current

# Show migration history
alembic history

# Show detailed history
alembic history --verbose
```

## Development Workflow

### Adding a New Field

1. **Update model** in `app/models/`:
   ```python
   # app/models/user.py
   avatar_url = Column(String, nullable=True)
   ```

2. **Generate migration**:
   ```bash
   alembic revision --autogenerate -m "Add user avatar"
   ```

3. **Review generated migration** in `alembic/versions/`
   - Check upgrade() and downgrade() functions
   - Ensure indexes are created if needed

4. **Test migration**:
   ```bash
   # Apply
   alembic upgrade head
   
   # Test rollback
   alembic downgrade -1
   
   # Re-apply
   alembic upgrade head
   ```

### Adding a New Table

1. **Create model** in `app/models/`:
   ```python
   # app/models/notification.py
   class Notification(Base):
       __tablename__ = "notifications"
       id = Column(Integer, primary_key=True)
       # ... other columns
   ```

2. **Import in** `app/models/__init__.py`:
   ```python
   from app.models.notification import Notification
   __all__ = [..., "Notification"]
   ```

3. **Generate migration**:
   ```bash
   alembic revision --autogenerate -m "Add notifications table"
   ```

4. **Review and apply**

### Custom SQL Migration

For operations that can't be auto-generated:

```bash
# Create empty migration
alembic revision -m "Add custom function"
```

Edit the generated file:
```python
def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION custom_function()
        RETURNS void AS $$
        BEGIN
            -- Your SQL here
        END;
        $$ LANGUAGE plpgsql;
    """)

def downgrade() -> None:
    op.execute("DROP FUNCTION IF EXISTS custom_function()")
```

## Troubleshooting

### Migration Not Detected

```bash
# Check if model is imported in __init__.py
# Check if Base is imported from app.core.database
# Try: alembic revision --autogenerate -m "test" --verbose
```

### Merge Conflicts in Migrations

```bash
# List all heads
alembic heads

# Merge multiple heads
alembic merge head1 head2 -m "Merge migrations"
```

### Reset Database (Dev Only)

```bash
# Drop all tables
alembic downgrade base

# Or drop database
dropdb agentic_workspace
createdb agentic_workspace
psql agentic_workspace -c "CREATE EXTENSION vector;"

# Reapply all migrations
alembic upgrade head
```

### Check Migration SQL Without Applying

```bash
# Generate SQL for next migration
alembic upgrade head --sql

# Generate SQL for rollback
alembic downgrade -1 --sql
```

## Production Deployment

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migrations on staging
alembic upgrade head --sql | less  # Review SQL
alembic upgrade head

# 3. If successful, apply to production
# Consider using --sql flag and applying manually for critical systems
```

## Tips

- **Always review auto-generated migrations** - They may not handle all edge cases
- **Test rollbacks** - Ensure downgrade() works before deploying
- **Use descriptive names** - Makes history easier to navigate
- **Commit migrations with code changes** - Keep them in sync
- **Don't edit applied migrations** - Create new migration instead
- **Backup before major migrations** - Especially for data migrations

## Environment Variables

Ensure `.env` contains:
```env
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/dbname
```

Alembic will read this from `app.core.config.settings`.

