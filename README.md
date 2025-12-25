# Agentic Knowledge Workspace

A production-ready, multi-tenant SaaS application for intelligent document management with RAG-powered Q&A, AI agents, and enterprise integrations. This platform enables organizations to ingest, search, and query documents using advanced AI techniques while maintaining strict tenant isolation and security.

## 🎯 Overview

Agentic Knowledge Workspace is a comprehensive document intelligence platform that combines:

- **Document Management**: Upload, process, and manage documents (PDF, DOCX, CSV, Markdown, TXT)
- **RAG (Retrieval-Augmented Generation)**: Advanced document Q&A with semantic search and professional answer formatting
- **AI Agents**: Autonomous agents capable of email generation, Jira ticket creation, and report generation
- **Multi-Tenancy**: Complete tenant isolation with role-based access control (RBAC)
- **Enterprise Integrations**: Native Jira and email integration with secure credential management

## ✨ Key Features

### 📄 Document Management

- **Multi-format Support**: PDF, DOCX, CSV, Markdown, and plain text
- **Async Processing**: Background document ingestion and chunking
- **Vector Storage**: pgvector-powered semantic embeddings using local models (no API costs)
- **Document Metadata**: Full indexing with status tracking, timestamps, and tenant isolation

### 🔍 Advanced RAG System

- **Hybrid Search**: Combines vector similarity (semantic) with BM25 (keyword) matching
- **Query Expansion**: Multi-query generation for comprehensive retrieval
- **Re-ranking**: Cross-encoder re-ranking for optimal relevance
- **Professional Answers**: Google/Perplexity-style formatted responses with inline citations
- **LaTeX Support**: Full mathematical equation rendering in responses
- **Conversational Queries**: Intelligent handling of follow-up and conversational questions

### 🤖 AI Agents

- **Email Draft Generation**: Context-aware email composition with customizable tone
- **Jira Integration**: Direct ticket creation from natural language
- **Report Generation**: Automated document analysis and report creation
- **Tool-based Architecture**: LangChain-powered agent system with structured tools

### 🏢 Enterprise Features

- **Multi-Tenancy**: Complete data isolation per tenant
- **Role-Based Access Control**: Admin, Member roles with granular permissions
- **Secure Credential Management**: Encrypted storage of tenant-specific API credentials (Jira, email)
- **Audit Logging**: Comprehensive structured logging with tenant context

### 🔐 Security & Compliance

- **JWT Authentication**: Secure token-based authentication with refresh tokens
- **Password Hashing**: bcrypt for secure password storage
- **Input Validation**: Pydantic models for all API requests
- **Tenant Filtering**: Automatic tenant_id filtering on all queries
- **Encrypted Credentials**: AES-256 encryption for sensitive tenant credentials

## 🏗️ Architecture

### Backend (FastAPI)

```
backend/
├── app/
│   ├── api/v1/          # API endpoints (RESTful)
│   │   ├── auth.py      # Authentication & authorization
│   │   ├── tenants.py   # Tenant management
│   │   ├── documents.py # Document CRUD & upload
│   │   ├── rag.py       # RAG query endpoint
│   │   ├── agent.py     # AI agent actions
│   │   └── credentials.py # Credential management
│   ├── core/            # Core functionality
│   │   ├── config.py    # Application settings
│   │   ├── database.py  # Async SQLAlchemy setup
│   │   ├── security.py  # JWT & RBAC
│   │   ├── encryption.py # Credential encryption
│   │   └── logging.py   # Structured logging
│   ├── models/          # SQLAlchemy models
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   │   ├── ingestion.py    # Document processing
│   │   ├── retriever.py    # Hybrid RAG retrieval
│   │   ├── answer_engine.py # Answer generation
│   │   ├── agent.py        # Agent orchestration
│   │   ├── storage.py      # File storage (local/S3)
│   │   └── credentials.py  # Credential management
│   └── integrations/    # External integrations
│       ├── jira_client.py
│       └── email_client.py
└── alembic/             # Database migrations
```

### Frontend (Next.js 14)

```
frontend/
├── app/
│   ├── (dashboard)/     # Protected routes
│   │   ├── app/
│   │   │   ├── chat/    # RAG Q&A interface
│   │   │   ├── documents/ # Document management
│   │   │   └── eval/    # Evaluation tools
│   │   └── layout.tsx   # Dashboard layout
│   └── login/          # Authentication
└── components/         # Reusable components
    └── MarkdownWithLatex.tsx # Math rendering
```

## 🛠️ Tech Stack

### Backend

- **Framework**: FastAPI (async/await throughout)
- **Database**: PostgreSQL 16 with pgvector extension
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **AI/ML**:
  - LangChain (agent orchestration)
  - Sentence Transformers (local embeddings - FREE)
  - rank-bm25 (keyword search)
  - Cross-encoder (re-ranking)
  - OpenAI/Anthropic/Gemini (LLM providers)
- **Security**: python-jose (JWT), passlib/bcrypt (hashing), cryptography (AES)
- **Storage**: Local filesystem or AWS S3
- **Logging**: structlog (structured logging)
- **Testing**: pytest, pytest-asyncio

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS
- **Markdown**: react-markdown with KaTeX for math
- **Testing**: Jest, React Testing Library

### Infrastructure

- **Containerization**: Docker & Docker Compose
- **Database**: pgvector/pgvector:pg16
- **Cache**: Redis (optional, for Celery)
- **Reverse Proxy**: Configured for production

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16 with pgvector extension
- Docker & Docker Compose (optional)

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Agentic-Knowledge-Workspace

# Copy and configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Start all services
cd infrastructure
docker-compose up -d

# Run database migrations
docker-compose exec backend alembic upgrade head

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/api/v1/docs
```

### Option 2: Local Development

#### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings (database, API keys, etc.)

# Initialize database
python -m scripts.init_db

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --port 8000
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment (optional)
# Create .env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start development server
npm run dev
```

### Database Setup

```bash
# Using Docker (automatically sets up pgvector)
docker-compose up -d postgres

# Or manually install PostgreSQL with pgvector
# Then run:
psql -U postgres -c "CREATE EXTENSION vector;"
alembic upgrade head
```

## 📚 API Documentation

Once the backend is running, access interactive API documentation:

- **Swagger UI**: `http://localhost:8000/api/v1/docs`
- **ReDoc**: `http://localhost:8000/api/v1/redoc`

### Key Endpoints

#### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login (JWT tokens)
- `POST /api/v1/auth/refresh` - Refresh access token

#### Documents

- `POST /api/v1/documents/upload` - Upload document
- `GET /api/v1/documents` - List tenant documents
- `GET /api/v1/documents/{id}` - Get document details
- `DELETE /api/v1/documents/{id}` - Delete document

#### RAG Query

- `POST /api/v1/rag/query` - Query documents with RAG
  - Returns: Professional formatted answer with inline citations

#### AI Agents

- `POST /api/v1/agent/email/draft` - Generate email draft
- `POST /api/v1/agent/email/send` - Send email
- `POST /api/v1/agent/jira/create` - Create Jira ticket
- `POST /api/v1/agent/report/generate` - Generate report

#### Credentials

- `POST /api/v1/credentials` - Store encrypted credentials (Jira, email)
- `GET /api/v1/credentials` - List tenant credentials
- `DELETE /api/v1/credentials/{id}` - Delete credentials

## 🔧 Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/agentic_workspace

# Security
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Providers (at least one required for LLM)
OPENAI_API_KEY=optional
ANTHROPIC_API_KEY=optional
GOOGLE_API_KEY=optional

# LLM Configuration
LLM_PROVIDER=gemini  # openai, anthropic, or gemini
LLM_MODEL=gemini-1.5-flash

# Embeddings (FREE - uses local models by default)
EMBEDDING_PROVIDER=local
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Storage
STORAGE_PROVIDER=local  # local or s3
LOCAL_STORAGE_PATH=./storage

# Integrations (optional)
JIRA_URL=https://your-domain.atlassian.net
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
pytest --cov=app tests/  # With coverage
```

### Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
```

## 📊 Key Technical Highlights

### 1. Hybrid RAG Retrieval

- **Vector Search**: Semantic similarity using pgvector
- **BM25 Keyword Search**: Traditional keyword matching
- **Hybrid Scoring**: Weighted combination (70% vector, 30% BM25)
- **Query Expansion**: Generates multiple query variations for completeness
- **Re-ranking**: Cross-encoder model re-ranks top candidates for accuracy

### 2. Professional Answer Engine

- **Google/Perplexity Style**: Clean paragraph-based responses
- **Inline Citations**: `[1]`, `[2]` style citations (not filenames)
- **LaTeX Math**: Full mathematical equation support
- **Context-Aware**: Handles conversational and follow-up queries
- **Multi-source**: Aggregates information from multiple documents

### 3. Multi-Tenant Architecture

- **Data Isolation**: Every query automatically filters by tenant_id
- **Encrypted Credentials**: Tenant-specific API keys stored with AES-256
- **Role-Based Access**: Admin and Member roles with appropriate permissions
- **Scalable**: Designed for horizontal scaling

### 4. Async-First Design

- **Full Async**: All I/O operations use async/await
- **Background Processing**: Document ingestion doesn't block API responses
- **Efficient**: Non-blocking database operations with asyncpg

### 5. Production-Ready Features

- **Structured Logging**: JSON logs with tenant context
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Input Validation**: Pydantic schemas for all endpoints
- **Database Migrations**: Alembic for schema versioning
- **Health Checks**: `/health` endpoint for monitoring

## 📁 Project Structure Highlights

- **Separation of Concerns**: Clear separation between API, services, models, and schemas
- **Type Safety**: Full type hints in Python, strict TypeScript
- **Dependency Injection**: FastAPI Depends for clean dependency management
- **Service Layer**: Business logic separated from API routes
- **Integration Layer**: Abstracted external service clients (Jira, Email)

## 🔄 Development Workflow

1. **Schema Changes**: Create Alembic migration → Test locally → Review
2. **Feature Development**: Create feature branch → Implement with tests → PR
3. **API Changes**: Update Pydantic schemas → Update API docs → Test endpoints
4. **Code Quality**: Type hints required, linting with ESLint/Black

**Built with ❤️ using FastAPI, Next.js, and LangChain**
