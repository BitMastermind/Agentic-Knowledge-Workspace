-- Initialize database with pgvector extension
-- This script runs automatically when the PostgreSQL container first starts

CREATE EXTENSION IF NOT EXISTS vector;

-- Log extension creation
DO $$ 
BEGIN 
    RAISE NOTICE 'pgvector extension created successfully';
END $$;

