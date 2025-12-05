# Home Setup Guide - Agentic Knowledge Workspace

This guide will help you set up the project on your home machine to continue development.

## Prerequisites

Before starting, ensure you have the following installed:

- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 20+** - [Download](https://nodejs.org/)
- **PostgreSQL 16+** with pgvector extension
- **Git** - [Download](https://git-scm.com/downloads)

## Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd "Agentic Workspace"
```

## Step 2: Backend Setup

### 2.1 Create Virtual Environment

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 2.2 Install Dependencies

```bash
pip install -r requirements.txt
```

**Note:** The first time you install `sentence-transformers`, it will download models (~500MB). This is normal and only happens once.

### 2.3 Set Up Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Copy from example (if exists) or create new
cp .env.example .env  # If example exists
# Or create .env manually
```

**Required Environment Variables:**

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/agentic_workspace

# Security
JWT_SECRET_KEY=your-secret-key-here-change-this-in-production

# AI Services (at least one required)
GOOGLE_API_KEY=your-google-api-key  # For Gemini (FREE tier available)
# OR
OPENAI_API_KEY=your-openai-api-key  # Optional, if using OpenAI

# LLM Configuration
LLM_PROVIDER=gemini  # or "openai"
LLM_MODEL=gemini-1.5-flash  # or "gpt-4", "gpt-3.5-turbo"

# Embeddings (FREE, LOCAL - No API needed!)
EMBEDDING_PROVIDER=local  # Uses sentence-transformers (FREE!)
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# CORS (for frontend)
BACKEND_CORS_ORIGINS=http://localhost:3000

# Storage
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage

# Optional: Integrations
JIRA_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

### 2.4 Database Setup

**Option A: Using Docker (Recommended)**

```bash
cd ../infrastructure
docker-compose up -d postgres
```

**Option B: Local PostgreSQL**

1. Install PostgreSQL 16+ with pgvector extension
2. Create database:
```bash
createdb agentic_workspace
psql agentic_workspace -c "CREATE EXTENSION vector;"
```

### 2.5 Run Database Migrations

```bash
cd backend
alembic upgrade head
```

### 2.6 (Optional) Seed Demo Data

```bash
python scripts/seed_data.py
```

This creates a demo user:
- Email: `demo@example.com`
- Password: `demo123`

### 2.7 Start Backend Server

```bash
# From backend directory
python -m app.main
# Or:
uvicorn app.main:app --reload
```

Backend will run on `http://localhost:8000`

## Step 3: Frontend Setup

### 3.1 Install Dependencies

```bash
cd frontend
npm install
```

### 3.2 Set Up Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3.3 Start Frontend Development Server

```bash
npm run dev
```

Frontend will run on `http://localhost:3000`

## Step 4: Verify Installation

1. **Backend Health Check:**
   - Visit: http://localhost:8000/health
   - Should return: `{"status": "healthy", ...}`

2. **API Documentation:**
   - Swagger UI: http://localhost:8000/api/v1/docs
   - ReDoc: http://localhost:8000/api/v1/redoc

3. **Frontend:**
   - Visit: http://localhost:3000
   - Should show login page

4. **Test Login:**
   - Use demo credentials: `demo@example.com` / `demo123`
   - Or register a new account

## Step 5: Development Workflow

### Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Making Changes

1. **Backend Changes:**
   - Code changes auto-reload (with `--reload` flag)
   - Database changes require migrations:
     ```bash
     alembic revision --autogenerate -m "description"
     alembic upgrade head
     ```

2. **Frontend Changes:**
   - Next.js hot-reloads automatically
   - Check browser console for errors

### Common Commands

```bash
# Backend
cd backend
alembic upgrade head          # Apply migrations
alembic revision --autogenerate -m "msg"  # Create migration
pytest                         # Run tests (when implemented)

# Frontend
cd frontend
npm run dev                    # Development server
npm run build                  # Production build
npm run lint                   # Lint code
```

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Find and kill process on port 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F
# macOS/Linux:
lsof -ti:8000 | xargs kill
```

**Database connection errors:**
- Check `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Verify database exists: `psql -l | grep agentic_workspace`

**Import errors:**
- Ensure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`

### Frontend Issues

**Port already in use:**
- Change port: `npm run dev -- -p 3001`

**API connection errors:**
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Ensure backend is running on correct port
- Check CORS settings in backend

**Module not found:**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

### Embedding Model Issues

**First-time download:**
- Models download automatically on first use (~500MB)
- Ensure stable internet connection
- Models are cached in `~/.cache/huggingface/`

## Current Project Status

### ✅ Completed Features

- Phase 1: Project Foundation
- Phase 2: Database & Multi-Tenancy
- Phase 3: Authentication & RBAC
- Phase 4: Document Ingestion Pipeline
- Phase 5: RAG Query Pipeline (with FREE Gemini embeddings!)
- Phase 6: Agent Actions (Email, Jira, Reports)

### 🔄 Recent Improvements

- **Conversational Query Detection**: Handles greetings and generic queries without forcing document citations
- **Relevance Threshold**: Only uses retrieved chunks if they're actually relevant
- **Report Generation**: Enhanced with metadata (document names, report type)
- **Report Viewer**: Modal-based viewer with authentication

### 📋 Next Steps (See PROJECT_PLAN.md)

- Phase 7: Quality & Evaluation Dashboard
- Phase 8: Observability & Configuration
- Phase 9: Infrastructure & Deployment
- Phase 10: Testing & Documentation

## Important Notes

1. **FREE Embeddings**: The project uses local sentence-transformers for embeddings (no API costs!)
2. **Gemini API**: Free tier available - get key from [Google AI Studio](https://makersuite.google.com/app/apikey)
3. **Database**: Ensure pgvector extension is installed for vector search
4. **Storage**: Reports and documents stored locally in `backend/storage/` directory

## Getting Help

- Check `README.md` for general information
- Check `PROJECT_PLAN.md` for implementation roadmap
- Check `backend/DATABASE_SETUP.md` for database details
- Check `LOCAL_EMBEDDINGS_SETUP.md` for embeddings configuration

## Quick Reference

```bash
# Full setup from scratch
git clone <repo-url>
cd "Agentic Workspace"

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Create .env file with required variables
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
# Create .env.local with NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Happy coding! 🚀

