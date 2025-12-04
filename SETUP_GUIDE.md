# Agentic Knowledge Workspace - Setup Guide

## 🎉 Project Successfully Scaffolded!

Your Agentic Knowledge Workspace SaaS application has been fully scaffolded with a comprehensive structure for both frontend and backend.

## 📁 Project Structure

```
Agentic Workspace/
├── PROJECT_PLAN.md              # Detailed implementation roadmap
├── README.md                    # Project documentation
├── .gitignore                   # Git ignore rules
├── .cursorrules                 # AI coding assistant rules
│
├── frontend/                    # Next.js 14 Application
│   ├── app/
│   │   ├── layout.tsx          # Root layout with AuthProvider
│   │   ├── page.tsx            # Home page (redirects to login)
│   │   ├── login/
│   │   │   └── page.tsx        # Login/Register page
│   │   └── (dashboard)/
│   │       ├── layout.tsx      # Dashboard shell with sidebar
│   │       └── app/
│   │           ├── documents/  # Document management
│   │           ├── chat/       # RAG chat interface
│   │           └── eval/       # Evaluation dashboard
│   ├── lib/
│   │   ├── types.ts            # TypeScript type definitions
│   │   ├── api-client.ts       # API client for backend
│   │   └── auth-context.tsx    # Authentication context
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                     # FastAPI Application
│   ├── app/
│   │   ├── main.py             # FastAPI app instance
│   │   ├── api/v1/
│   │   │   ├── auth.py         # Authentication endpoints
│   │   │   ├── tenants.py      # Tenant management
│   │   │   ├── documents.py    # Document upload/management
│   │   │   ├── rag.py          # RAG query (with SSE)
│   │   │   └── agent.py        # Agent actions
│   │   ├── core/
│   │   │   ├── config.py       # Settings (Pydantic)
│   │   │   ├── database.py     # SQLAlchemy async setup
│   │   │   ├── security.py     # JWT & auth utilities
│   │   │   └── logging.py      # Structured logging
│   │   ├── models/
│   │   │   ├── user.py         # User model
│   │   │   ├── tenant.py       # Tenant & UserTenant
│   │   │   ├── document.py     # Document & Chunk (pgvector)
│   │   │   └── evaluation.py   # EvaluationRun
│   │   ├── schemas/            # Pydantic request/response models
│   │   └── services/
│   │       ├── ingestion.py    # Document parsing & chunking
│   │       ├── retriever.py    # RAG retriever (pgvector)
│   │       ├── agent.py        # LangChain agent with tools
│   │       └── langsmith.py    # Tracing & evaluation
│   ├── alembic/                # Database migrations
│   ├── tests/
│   ├── requirements.txt
│   ├── pyproject.toml
│   └── .env.example
│
└── infrastructure/
    ├── docker/
    │   ├── Dockerfile.backend
    │   └── Dockerfile.frontend
    ├── docker-compose.yml       # Full-stack local dev setup
    ├── init-db.sql              # PostgreSQL initialization
    └── deploy/                  # Deployment configs (future)
```

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

1. **Set up environment variables**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your API keys (OPENAI_API_KEY, etc.)
   ```

2. **Start all services**
   ```bash
   cd infrastructure
   docker-compose up -d
   ```

   This starts:
   - PostgreSQL with pgvector (port 5432)
   - Redis (port 6379)
   - Backend API (port 8000)
   - Frontend (port 3000)

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API docs: http://localhost:8000/api/v1/docs
   - Health check: http://localhost:8000/health

### Option 2: Local Development

**Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up .env file
cp .env.example .env
# Edit .env with your configuration

# Run database migrations (requires PostgreSQL with pgvector)
alembic upgrade head

# Start server
python -m app.main
# Or: uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start dev server
npm run dev
```

## 📋 Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **PostgreSQL 16+** with pgvector extension
- **Docker** & **Docker Compose** (for containerized setup)
- **API Keys:**
  - OpenAI API key (required)
  - Anthropic API key (optional)
  - LangSmith API key (optional, for tracing)

## 🔑 Environment Variables

Key environment variables to configure in `backend/.env`:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/agentic_workspace

# Security
JWT_SECRET_KEY=your-secret-key-change-in-production

# AI Services
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# LangSmith (optional)
LANGSMITH_API_KEY=your-langsmith-key
LANGCHAIN_TRACING_V2=true
```

## 🏗️ Architecture Highlights

### Multi-Tenancy
- Every data model includes `tenant_id` for isolation
- JWT tokens include tenant context
- Middleware enforces tenant-based access control

### RAG Pipeline
1. Document upload → S3/local storage
2. Background processing: parse → chunk → embed
3. Store chunks with embeddings in PostgreSQL (pgvector)
4. Query: embed → similarity search → LLM generation
5. Return response with source citations

### Streaming Responses
- RAG queries support Server-Sent Events (SSE)
- Token-by-token streaming from LLM
- Frontend displays real-time responses

### Agent Actions
- Email drafting
- Jira ticket creation
- Report generation
- Powered by LangChain tools

## 📊 Features Implemented

✅ **Phase 1: Foundation**
- [x] Project structure
- [x] Next.js 14 frontend with TypeScript + TailwindCSS
- [x] FastAPI backend with async support
- [x] Database models (users, tenants, documents, chunks, evaluations)

✅ **Core Infrastructure**
- [x] Authentication scaffolding (JWT-based)
- [x] Multi-tenant architecture
- [x] pgvector integration for embeddings
- [x] Docker setup with docker-compose
- [x] API client and type definitions

✅ **UI Pages**
- [x] Login/Register page
- [x] Document upload & management
- [x] RAG chat interface with streaming
- [x] Evaluation dashboard

✅ **Backend Services**
- [x] Document ingestion service
- [x] RAG retriever service
- [x] LangChain agent service
- [x] LangSmith tracing integration

## 🔜 Next Steps (TODO Implementation)

The following features are scaffolded but need implementation:

### 1. Complete Authentication
- Implement user registration in `backend/app/api/v1/auth.py`
- Add database queries for user CRUD
- Connect frontend auth context to real API

### 2. Document Ingestion Pipeline
- Complete `process_document()` in `ingestion.py`
- Set up background task queue (Celery or FastAPI BackgroundTasks)
- Implement file storage (S3 or local)

### 3. RAG Implementation
- Complete retriever integration in `rag.py`
- Wire up LangChain with OpenAI/Anthropic
- Implement streaming SSE endpoint

### 4. Agent Actions
- Implement Jira API client
- Add email sending (SMTP/SendGrid)
- Build report generation with PDF export

### 5. Database Migrations
- Initialize Alembic: `cd backend && alembic init alembic`
- Create initial migration: `alembic revision --autogenerate -m "Initial schema"`
- Apply migrations: `alembic upgrade head`

### 6. Testing
- Add pytest tests for backend
- Add Jest/React Testing Library tests for frontend
- Integration tests for API endpoints

### 7. Deployment
- Set up CI/CD pipeline
- Deploy frontend to Vercel
- Deploy backend to Railway/Render
- Configure production database (Supabase)

## 📚 Documentation

- **PROJECT_PLAN.md**: Detailed 10-phase implementation plan
- **README.md**: Project overview and setup instructions
- **API Docs**: http://localhost:8000/api/v1/docs (when running)

## 🛠️ Development Commands

**Backend:**
```bash
# Run tests
pytest

# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Format code
black app/
```

**Frontend:**
```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type check
npm run type-check
```

## 🐛 Troubleshooting

**PostgreSQL connection issues:**
- Ensure PostgreSQL is running: `docker-compose ps`
- Check DATABASE_URL in .env
- Verify pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`

**Frontend can't connect to backend:**
- Check NEXT_PUBLIC_API_URL in frontend/.env.local
- Ensure backend is running on port 8000
- Check CORS settings in backend/app/main.py

**Import errors in Python:**
- Activate virtual environment: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt`

## 📞 Support

For issues or questions:
1. Check PROJECT_PLAN.md for implementation details
2. Review API documentation at /api/v1/docs
3. Check logs for error messages

---

**Happy coding! 🚀**

The foundation is solid—now it's time to implement the features step by step according to the PROJECT_PLAN.md roadmap.

