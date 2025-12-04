# Agentic Knowledge Workspace - Implementation Plan

## Overview

Multi-tenant SaaS for document ingestion, RAG-powered Q&A, and AI agent actions (email drafting, Jira tickets, reports).

---

## Phase 1: Project Foundation

### 1.1 Project Initialization

- [x] Create root folder structure: `frontend/`, `backend/`, `infrastructure/`
- [ ] Set up `.gitignore`, `README.md`, `.env.example`
- [ ] Initialize version control and add `.cursorrules` for AI-assisted development

### 1.2 Frontend Setup (Next.js 14)

**Location:** `frontend/`

- [ ] Run `npx create-next-app@latest frontend --typescript --tailwind --app`
- [ ] Configure TypeScript (`tsconfig.json`) and TailwindCSS (`tailwind.config.ts`)
- [ ] Set up project structure:
  - `app/` - App Router pages
  - `components/` - Reusable UI components
  - `lib/` - API client, utilities, types
  - `hooks/` - Custom React hooks
- [ ] Create base layout with sidebar/topbar (`app/layout.tsx`)
- [ ] Add routes:
  - `app/login/page.tsx` - Auth page
  - `app/(dashboard)/layout.tsx` - Dashboard shell
  - `app/(dashboard)/documents/page.tsx` - Document management
  - `app/(dashboard)/chat/page.tsx` - RAG chat interface
  - `app/(dashboard)/eval/page.tsx` - Quality metrics dashboard
- [ ] Create API client (`lib/api-client.ts`) pointing to FastAPI backend
- [ ] Add TypeScript types (`lib/types.ts`) for shared models

### 1.3 Backend Setup (FastAPI)

**Location:** `backend/`

- [ ] Create Python virtual environment and install dependencies
- [ ] Initialize FastAPI project structure:
  ```
  backend/
  ├── app/
  │   ├── main.py                 # FastAPI app instance, CORS, middleware
  │   ├── api/
  │   │   └── v1/
  │   │       ├── __init__.py
  │   │       ├── auth.py         # POST /login, /register, /refresh
  │   │       ├── tenants.py      # GET/POST /tenants, tenant switching
  │   │       ├── documents.py    # POST /upload, GET /documents, DELETE /documents/{id}
  │   │       ├── rag.py          # POST /query (SSE streaming)
  │   │       └── agent.py        # POST /actions/email, /actions/jira, /actions/report
  │   ├── core/
  │   │   ├── config.py           # Pydantic Settings (env vars)
  │   │   ├── database.py         # SQLAlchemy async engine, session
  │   │   ├── security.py         # JWT creation/validation, password hashing
  │   │   └── logging.py          # Structured logging setup
  │   ├── models/
  │   │   ├── __init__.py
  │   │   ├── user.py             # User model
  │   │   ├── tenant.py           # Tenant model (org/workspace)
  │   │   ├── document.py         # Document, Chunk models
  │   │   └── evaluation.py       # EvaluationRun, Metric models
  │   ├── schemas/
  │   │   └── ...                 # Pydantic request/response models
  │   └── services/
  │       ├── ingestion.py        # Document parsing, chunking, embedding
  │       ├── retriever.py        # RAG retriever (pgvector queries)
  │       ├── agent.py            # LangChain agent with tools
  │       └── langsmith.py        # Tracing and evaluation wiring
  ├── alembic/                    # Database migrations
  ├── tests/
  ├── requirements.txt
  └── pyproject.toml
  ```
- [ ] Create `app/main.py` with health check endpoint: `GET /health`

---

## Phase 2: Database & Multi-Tenancy ✅ COMPLETED

### 2.1 Database Schema Design

**Location:** `backend/app/models/`

- [x] Set up SQLAlchemy async engine with PostgreSQL connection
- [x] Define models:
  - **users**: id, email, hashed_password, created_at
  - **tenants**: id, name, slug, created_at
  - **user_tenants**: user_id, tenant_id, role (owner/admin/member)
  - **documents**: id, tenant_id, user_id, filename, file_type, status, s3_key, created_at
  - **chunks**: id, document_id, content, metadata (jsonb), embedding (vector(1536))
  - **evaluation_runs**: id, tenant_id, query, response, metrics (jsonb), created_at
- [x] Add pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- [x] Create indexes: tenant_id, user_id, embedding (HNSW index for fast similarity search)

### 2.2 Migrations Setup

**Location:** `backend/alembic/`

- [x] Initialize Alembic: configured with async SQLAlchemy support
- [x] Configure `alembic.ini` and `env.py` for async SQLAlchemy
- [x] Create initial migration: `alembic/versions/20241204_initial_schema.py`
- [x] Document migration commands in `backend/DATABASE_SETUP.md`

### 2.3 Multi-Tenant Middleware

**Location:** `backend/app/core/`

- [x] Database models include tenant_id for data isolation
- [x] Indexes on tenant_id for query performance
- [ ] Create middleware to extract tenant context from JWT or header (Phase 3)
- [ ] Add tenant_id filtering to all queries (automatic via dependency injection) (Phase 3)
- [ ] Implement tenant isolation tests (Phase 10)

**Files Created:**

- `backend/alembic.ini` - Alembic configuration
- `backend/alembic/env.py` - Async migration environment
- `backend/alembic/versions/20241204_initial_schema.py` - Initial schema migration
- `backend/scripts/init_db.py` - Database initialization script
- `backend/scripts/seed_data.py` - Demo data seeding script
- `backend/DATABASE_SETUP.md` - Comprehensive database setup guide
- `infrastructure/init-db.sql` - Docker initialization script

---

## Phase 3: Authentication & RBAC ✅ COMPLETED

### 3.1 Auth System

**Location:** `backend/app/api/v1/auth.py`

- [x] POST `/auth/register` - Create user + default tenant
- [x] POST `/auth/login` - Return JWT access + refresh tokens
- [x] POST `/auth/refresh` - Refresh access token
- [x] GET `/auth/me` - Get current user info
- [x] Implement password hashing (bcrypt) in `core/security.py`
- [x] JWT creation/validation using `python-jose`

### 3.2 RBAC Implementation

**Location:** `backend/app/core/security.py`

- [x] Define roles: `owner`, `admin`, `member`, `viewer`
- [x] Create permission decorators: `@require_role("admin")`
- [x] Add role checks to protected routes (documents, agent actions)
- [x] Implement tenant context in JWT tokens
- [x] Add `require_tenant_access` dependency

### 3.3 Frontend Auth Flow

**Location:** `frontend/app/login/`

- [x] Login form with email/password (existing)
- [x] Store JWT in localStorage
- [x] Auth context provider (`lib/auth-context.tsx`) - fully wired
- [x] Fetch user data on login/mount
- [x] Auto-redirect on successful auth

**Files Modified:**

- `backend/app/api/v1/auth.py` - Complete auth implementation
- `backend/app/api/v1/tenants.py` - Tenant listing and creation
- `backend/app/api/v1/documents.py` - RBAC protection added
- `backend/app/core/security.py` - Enhanced with RBAC helpers
- `frontend/lib/auth-context.tsx` - Full auth flow wired

---

## Phase 4: Document Ingestion Pipeline ✅ COMPLETED

### 4.1 Upload Endpoints

**Location:** `backend/app/api/v1/documents.py`

- [x] POST `/documents/upload` - Accept multipart file upload
- [x] Validate file types: PDF, CSV, MD, TXT, DOCX
- [x] Store files in local storage (S3 ready for future)
- [x] Create document record with status: `pending`
- [x] GET `/documents/{id}/stats` - Get document statistics

### 4.2 Processing Workers

**Location:** `backend/app/services/ingestion.py`

- [x] Implement FastAPI BackgroundTasks for async processing
- [x] Parse documents:
  - PDF: PyPDF2 ✓
  - CSV: pandas ✓
  - Markdown/TXT: direct read ✓
  - DOCX: python-docx ✓
- [x] Chunk documents (LangChain RecursiveCharacterTextSplitter, 1000 chars, 200 overlap)
- [x] Generate embeddings (OpenAI `text-embedding-3-small`)
- [x] Store chunks + embeddings in `chunks` table
- [x] Update document status: `completed` or `failed`
- [x] Error handling with detailed logging

### 4.3 Frontend Upload UI

**Location:** `frontend/app/(dashboard)/documents/`

- [x] File upload component (click to upload)
- [x] Upload progress indicator
- [x] Document list with status badges (pending/processing/completed/failed)
- [x] Delete document button (working)
- [x] Auto-polling for status updates (5-second intervals)

**New Services:**

- `backend/app/services/storage.py` - File storage abstraction
- `backend/test_upload.py` - Integration tests for pipeline
- `backend/EMBEDDINGS_SETUP.md` - Embeddings configuration guide

---

## Phase 5: RAG Query Pipeline ✅ COMPLETED

### 5.1 Retriever Service

**Location:** `backend/app/services/retriever.py`

- [x] Implement semantic search:
  - Embed user query with Gemini embeddings (FREE!)
  - Query pgvector: `SELECT * FROM chunks ORDER BY embedding <=> query_embedding LIMIT 10`
- [x] Add metadata filters (document_id, tenant_id)
- [x] Return chunks with source citations (document name, chunk content)
- [x] Score calculation (similarity scores)

### 5.2 RAG Endpoint with Citations

**Location:** `backend/app/api/v1/rag.py`

- [x] POST `/rag/query` - Accept query, return response + sources
- [x] Build context from retrieved chunks
- [x] Call Gemini LLM with structured prompt
- [x] Citation system with [1], [2], etc.
- [x] Return structured response: `{ answer: string, sources: [{id, document_name, snippet, metadata}] }`
- [x] Performance logging (latency tracking)

### 5.3 Streaming with SSE

**Location:** `backend/app/api/v1/rag.py`

- [x] POST `/rag/query-stream` - Return `text/event-stream`
- [x] Stream Gemini tokens using LangChain streaming
- [x] Send sources at the end of stream
- [x] Handle errors gracefully (send error event + DONE)
- [x] Real-time token-by-token streaming

### 5.4 Frontend Chat UI

**Location:** `frontend/app/(dashboard)/chat/`

- [x] Chat interface with message history (existing)
- [x] SSE client with fetch streaming (existing)
- [x] Display streaming responses token-by-token (existing)
- [x] Show source citations as expandable cards (existing)
- [x] Error handling in stream (enhanced)

**Enhancements:**

- [x] Error message cleanup on failure
- [x] Better error event handling
- [x] Proper stream termination

**All features now WORKING with FREE Gemini!**

---

## Phase 6: Agent Actions

### 6.1 Agent Architecture

**Location:** `backend/app/services/agent.py`

- [ ] Set up LangChain agent with tools:
  - `EmailDraftTool` - Generate email drafts
  - `JiraTicketTool` - Create Jira tickets via API
  - `ReportGenerationTool` - Generate formatted reports (PDF/HTML)
- [ ] Implement function calling with OpenAI or Anthropic
- [ ] Add tool execution logging

### 6.2 Action Endpoints

**Location:** `backend/app/api/v1/agent.py`

- [ ] POST `/agent/email-draft` - Generate email from context
- [ ] POST `/agent/jira-ticket` - Create Jira ticket with project/issue type
- [ ] POST `/agent/generate-report` - Generate report from selected documents
- [ ] Return action results + execution logs

### 6.3 Integrations

**Location:** `backend/app/integrations/`

- [ ] `jira_client.py` - Jira API wrapper (use `jira` library)
- [ ] `email_client.py` - SMTP or SendGrid for email sending
- [ ] Store integration credentials per tenant (encrypted in DB)

### 6.4 Frontend Action UI

**Location:** `frontend/app/(dashboard)/chat/`

- [ ] Add action buttons in chat (email, Jira, report)
- [ ] Modal forms for action parameters (Jira project, email recipients)
- [ ] Display action results with success/error states
- [ ] Allow users to edit drafts before sending

---

## Phase 7: Quality & Evaluation Dashboard

### 7.1 Evaluation Metrics

**Location:** `backend/app/services/langsmith.py`

- [ ] Integrate LangSmith tracing for all LLM calls
- [ ] Log queries, responses, latency, token usage
- [ ] Implement evaluation metrics:
  - Response quality (LLM-as-judge)
  - Retrieval accuracy (MRR, NDCG if ground truth available)
  - Latency, token usage
- [ ] Store evaluation results in `evaluation_runs` table

### 7.2 Dashboard Endpoints

**Location:** `backend/app/api/v1/eval.py`

- [ ] GET `/eval/metrics` - Aggregate metrics (avg latency, token usage, quality score)
- [ ] GET `/eval/runs` - Paginated list of evaluation runs
- [ ] GET `/eval/runs/{id}` - Detailed run data
- [ ] POST `/eval/feedback` - User thumbs up/down on responses

### 7.3 Frontend Dashboard

**Location:** `frontend/app/(dashboard)/eval/`

- [ ] Display key metrics: avg response time, total queries, quality score
- [ ] Chart: queries over time, latency distribution
- [ ] Table: recent evaluation runs with filtering
- [ ] Feedback collection UI in chat

---

## Phase 8: Observability & Configuration

### 8.1 LangSmith Integration

**Location:** `backend/app/services/langsmith.py`

- [ ] Set up LangSmith project and API key
- [ ] Wrap LangChain calls with tracing decorators
- [ ] Tag traces with tenant_id, user_id, query_type
- [ ] Create evaluation datasets in LangSmith

### 8.2 Logging & Monitoring

**Location:** `backend/app/core/logging.py`

- [ ] Structured JSON logging (use `structlog`)
- [ ] Log levels: INFO for requests, ERROR for exceptions
- [ ] Add request ID middleware for tracing
- [ ] (Future) Integrate with Sentry or Datadog

### 8.3 Configuration Management

**Location:** `backend/app/core/config.py`

- [ ] Use Pydantic Settings for env vars:
  - `DATABASE_URL`
  - `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
  - `LANGSMITH_API_KEY`
  - `JWT_SECRET_KEY`
  - `S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- [ ] Create `.env.example` with all required vars
- [ ] Document secrets in README

---

## Phase 9: Infrastructure & Deployment

### 9.1 Local Development

**Location:** `infrastructure/`

- [ ] Create `docker-compose.yml`:
  - PostgreSQL with pgvector
  - Redis (for task queue)
  - (Optional) LocalStack for S3
- [ ] Add health checks and init scripts
- [ ] Document setup in README: `docker-compose up -d`

### 9.2 Containerization

**Location:** `infrastructure/docker/`

- [ ] `Dockerfile.frontend` - Multi-stage build for Next.js
- [ ] `Dockerfile.backend` - Python image with dependencies
- [ ] Optimize image sizes (slim base images, layer caching)

### 9.3 Deployment

**Location:** `infrastructure/deploy/`

- [ ] (Option 1) Deploy to Vercel (frontend) + Railway/Render (backend)
- [ ] (Option 2) Kubernetes manifests for full-stack deployment
- [ ] Set up environment variables in deployment platform
- [ ] Configure PostgreSQL (Supabase or managed service)
- [ ] Set up CI/CD pipeline (GitHub Actions)

---

## Phase 10: Testing & Documentation

### 10.1 Backend Tests

**Location:** `backend/tests/`

- [ ] Unit tests for services (ingestion, retriever, agent)
- [ ] Integration tests for API endpoints
- [ ] Test fixtures for database and mocks for LLM calls
- [ ] Run with `pytest`

### 10.2 Frontend Tests

**Location:** `frontend/__tests__/`

- [ ] Component tests with React Testing Library
- [ ] E2E tests with Playwright (login, upload, chat flows)

### 10.3 Documentation

- [ ] Update README with:
  - Architecture diagram
  - Setup instructions
  - API documentation (or generate with FastAPI Swagger)
  - Deployment guide
- [ ] Add inline code comments for complex logic
- [ ] Create API reference docs (FastAPI auto-generates)

---

## Implementation Checklist (Ordered)

1. ✅ Create folder structure
2. ✅ Initialize Next.js frontend
3. ✅ Initialize FastAPI backend
4. ✅ Set up database and migrations
5. ✅ Implement auth endpoints and JWT
6. ✅ Create document upload flow
7. ✅ Build ingestion pipeline (with FREE Gemini embeddings!)
8. ✅ Implement RAG retriever
9. ✅ Add RAG query endpoint with SSE
10. ✅ Build chat UI with streaming (already existed, now wired)
11. ⬜ Build chat UI with streaming
12. ⬜ Add agent tools and actions
13. ⬜ Create evaluation dashboard
14. ⬜ Integrate LangSmith tracing
15. ⬜ Set up Docker Compose for local dev
16. ⬜ Write tests and documentation
17. ⬜ Deploy to production

---

## Notes

- **Database**: Start with Supabase for easy setup (auth + DB + storage). Can self-host PostgreSQL later.
- **Vector DB**: pgvector is preferred; abstract with interface to swap to Pinecone if needed.
- **LLM Provider**: Default to OpenAI; add Anthropic as alternative with config flag.
- **Task Queue**: Start with FastAPI BackgroundTasks; migrate to Celery if needed.
- **Storage**: Use Supabase Storage or S3 for file uploads.
- **Frontend State**: Use React Context or Zustand for global state.
- **UI Components**: Consider shadcn/ui for consistent design system.

---

**Next Steps**: Begin with Phase 1 by initializing frontend and backend projects.
