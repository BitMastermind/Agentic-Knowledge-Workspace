# Agentic Knowledge Workspace

A multi-tenant SaaS platform for document ingestion, RAG-powered Q&A, and AI agent actions.

## Features

- 📄 **Document Management**: Upload PDFs, CSVs, Markdown, and more
- 🔍 **RAG-Powered Search**: Semantic search with citations using pgvector
- 🤖 **AI Agent Actions**: Email drafting, Jira ticket creation, report generation
- 🔐 **Multi-Tenant Auth**: Role-based access control (RBAC)
- 📊 **Evaluation Dashboard**: Quality metrics and LangSmith tracing
- ⚡ **Streaming Responses**: Real-time SSE streaming from backend to frontend

## Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**

### Backend
- **FastAPI** (async)
- **PostgreSQL** with **pgvector**
- **SQLAlchemy** (async ORM)
- **LangChain** for AI orchestration
- **OpenAI** / **Anthropic** APIs

### Infrastructure
- **Docker** & **Docker Compose**
- **Alembic** for migrations
- **Redis** for task queue

## Getting Started

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **Docker** & **Docker Compose** (recommended)
- **PostgreSQL 16+** with pgvector (if not using Docker)

### Environment Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd "Agentic Workspace"
```

2. **Set up environment variables**

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env and add your API keys
```

3. **Run with Docker Compose (Recommended)**

```bash
cd infrastructure
docker-compose up -d
```

This will start:
- PostgreSQL with pgvector (port 5432)
- Redis (port 6379)
- FastAPI backend (port 8000)
- Next.js frontend (port 3000)

4. **Or run locally**

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
python -m app.main
# Or: uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Database Setup

**See [backend/DATABASE_SETUP.md](backend/DATABASE_SETUP.md) for comprehensive database setup guide.**

**Quick start with Docker:**

```bash
# Start PostgreSQL with pgvector
cd infrastructure
docker-compose up -d postgres

# Run migrations
cd ../backend
alembic upgrade head

# (Optional) Create demo user and tenant
python scripts/seed_data.py
```

**Local PostgreSQL:**

```bash
# Ensure pgvector extension is installed
# Then create database and enable extension
createdb agentic_workspace
psql agentic_workspace -c "CREATE EXTENSION vector;"

# Set DATABASE_URL in backend/.env
# Run migrations
cd backend
alembic upgrade head
```

## Project Structure

```
Agentic Workspace/
├── frontend/                 # Next.js 14 app
│   ├── app/                 # App Router pages
│   ├── components/          # React components
│   ├── lib/                 # API client, utilities
│   └── ...
├── backend/                 # FastAPI app
│   ├── app/
│   │   ├── api/v1/         # API routers
│   │   ├── core/           # Config, database, security
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   └── tests/
├── infrastructure/          # Docker, deployment
│   ├── docker/
│   └── deploy/
├── PROJECT_PLAN.md         # Implementation roadmap
└── README.md
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc

## Development Workflow

1. **Backend Development**
   - Add new routes in `backend/app/api/v1/`
   - Add business logic in `backend/app/services/`
   - Create migrations: `alembic revision --autogenerate -m "description"`
   - Run migrations: `alembic upgrade head`

2. **Frontend Development**
   - Add pages in `frontend/app/`
   - Create components in `frontend/components/`
   - Update API client in `frontend/lib/api-client.ts`

3. **Testing**
   - Backend: `pytest`
   - Frontend: `npm test`

## Deployment

See `PROJECT_PLAN.md` for detailed deployment instructions.

**Quick deploy options:**
- **Frontend**: Vercel
- **Backend**: Railway, Render, or Fly.io
- **Database**: Supabase or managed PostgreSQL

## Configuration

All configuration is managed through environment variables. See `backend/.env.example` for all available options.

**Key variables:**
- `LLM_PROVIDER`: AI provider ("gemini", "openai", or "anthropic")
- `GOOGLE_API_KEY`: Gemini API key (default provider)
- `OPENAI_API_KEY`: OpenAI API key (optional)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: Secret for JWT signing
- `LANGSMITH_API_KEY`: LangSmith tracing (optional)

**See [backend/GEMINI_SETUP.md](backend/GEMINI_SETUP.md) for LLM configuration.**

## Contributing

See `PROJECT_PLAN.md` for the implementation roadmap and next steps.

## License

MIT

