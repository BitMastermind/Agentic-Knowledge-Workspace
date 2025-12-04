# Continuing Work on Agentic Knowledge Workspace

## 📋 Quick Start After Cloning

This guide helps you continue working on the project from any machine (home, office, etc.).

---

## 🔄 First Time Setup (New Machine)

### 1. Clone Repository

```bash
git clone https://github.com/BitMastermind/Agentic-Knowledge-Workspace.git
cd Agentic-Knowledge-Workspace
```

### 2. Install Prerequisites

**Required:**
- Python 3.11+
- Node.js 20+
- PostgreSQL 16+ (or Docker)
- Git

**Check versions:**
```bash
python --version  # or py --version
node --version
psql --version  # or docker --version
```

### 3. Setup Backend Environment

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt
# or: py -m pip install -r requirements.txt (Windows)

# Create .env file
cp .env.example .env
# Windows: copy .env.example .env
```

**Edit `backend/.env` and add:**
```env
# Your Gemini API Key (REQUIRED)
GOOGLE_API_KEY=AIzaSyC2f_Fljw-lJD91bot8yXQvUe2QwDlAb8E

# Database (adjust if needed)
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/agentic_workspace

# Security (generate new secret for production)
JWT_SECRET_KEY=your-secret-key-change-for-production

# LLM Configuration (already optimal)
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
EMBEDDING_PROVIDER=gemini
EMBEDDING_MODEL=models/embedding-001
```

### 4. Setup Database

**Option A: Docker (Recommended)**
```bash
cd infrastructure
docker-compose up -d postgres

# Verify it's running
docker-compose ps
```

**Option B: Local PostgreSQL**
```bash
# Create database
createdb agentic_workspace

# Enable pgvector
psql agentic_workspace -c "CREATE EXTENSION vector;"
```

### 5. Run Database Migrations

```bash
cd backend

# Apply all migrations
alembic upgrade head

# (Optional) Create demo user
py scripts/seed_data.py
# Demo login: demo@example.com / demo123
```

### 6. Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# (Optional) Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

### 7. Start Services

**Terminal 1 - Database (if using Docker):**
```bash
cd infrastructure
docker-compose up -d postgres
```

**Terminal 2 - Backend:**
```bash
cd backend
py -m uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### 8. Verify Everything Works

- ✅ Backend: http://localhost:8000/health
- ✅ API Docs: http://localhost:8000/api/v1/docs
- ✅ Frontend: http://localhost:3000
- ✅ Login: demo@example.com / demo123

---

## 🔄 Daily Workflow (After Initial Setup)

### Start Working

```bash
# 1. Pull latest changes
git pull origin main

# 2. Check for new dependencies
cd backend && pip install -r requirements.txt
cd frontend && npm install

# 3. Run any new migrations
cd backend && alembic upgrade head

# 4. Start services (3 terminals)
# Terminal 1: cd infrastructure && docker-compose up -d postgres
# Terminal 2: cd backend && py -m uvicorn app.main:app --reload
# Terminal 3: cd frontend && npm run dev
```

### Stop Working

```bash
# Stop servers: Ctrl+C in terminals

# Stop database
cd infrastructure
docker-compose down

# Commit your changes
git add .
git commit -m "Description of changes"
git push origin main
```

---

## 🛠️ Common Development Tasks

### Database Operations

**View current migration:**
```bash
cd backend
alembic current
```

**Create new migration:**
```bash
alembic revision --autogenerate -m "Add new field"
```

**Rollback migration:**
```bash
alembic downgrade -1
```

**Connect to database:**
```bash
psql postgresql://postgres:password@localhost:5432/agentic_workspace

# Inside psql:
\dt                    # List tables
\d chunks              # View chunks table
SELECT COUNT(*) FROM documents;
```

### Backend Development

**Add new endpoint:**
1. Edit file in `backend/app/api/v1/`
2. Server auto-reloads
3. Test at http://localhost:8000/api/v1/docs

**Add new service:**
1. Create file in `backend/app/services/`
2. Import in endpoint
3. Use in route handlers

**View logs:**
- Backend logs show in terminal
- Structured logging with context

### Frontend Development

**Add new page:**
1. Create in `frontend/app/(dashboard)/app/`
2. Auto-reloads on save
3. Access at http://localhost:3000/app/pagename

**Update API calls:**
1. Edit `frontend/lib/api-client.ts`
2. Add new methods
3. Use in components

**Test changes:**
- Hot reload in browser
- Check browser console for errors

---

## 📦 Managing Dependencies

### Add Backend Package

```bash
cd backend
pip install package-name
pip freeze > requirements.txt  # Update requirements
```

### Add Frontend Package

```bash
cd frontend
npm install package-name
# package.json auto-updates
```

### Update Dependencies

```bash
# Backend
pip install -r requirements.txt --upgrade

# Frontend
npm update
```

---

## 🔧 Configuration Files

### Files You Need to Configure

**`backend/.env`** (NOT in git - create manually)
```env
GOOGLE_API_KEY=your-key-here
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/agentic_workspace
JWT_SECRET_KEY=your-secret-key
```

**`frontend/.env.local`** (Optional - defaults work)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Files Already Configured

- ✅ `backend/.env.example` - Template with all vars
- ✅ `backend/requirements.txt` - Python packages
- ✅ `frontend/package.json` - Node packages
- ✅ `infrastructure/docker-compose.yml` - Docker setup
- ✅ `.gitignore` - Ignore rules

---

## 🚨 Troubleshooting

### "Module not found" errors

```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### "Database connection failed"

```bash
# Check if PostgreSQL is running
docker-compose ps

# Or: psql -c "SELECT 1;"

# Verify DATABASE_URL in backend/.env
```

### "Migration errors"

```bash
# Check current state
alembic current

# Reset if needed (development only!)
alembic downgrade base
alembic upgrade head
```

### "Port already in use"

```bash
# Backend (port 8000)
# Windows: netstat -ano | findstr :8000
# Linux/Mac: lsof -i :8000

# Frontend (port 3000)
# Windows: netstat -ano | findstr :3000
# Linux/Mac: lsof -i :3000
```

### "GOOGLE_API_KEY not set"

- Check `backend/.env` exists
- Verify key is copied correctly
- No quotes around the key value

---

## 📊 Project Structure Reference

```
Agentic-Knowledge-Workspace/
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/v1/   # API endpoints
│   │   ├── core/     # Config, database, security
│   │   ├── models/   # Database models
│   │   ├── services/ # Business logic
│   │   └── main.py   # FastAPI app
│   ├── alembic/      # Database migrations
│   ├── scripts/      # Utility scripts
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/         # Next.js application
│   ├── app/          # Pages (App Router)
│   ├── lib/          # API client, types
│   ├── package.json
│   └── .env.local (optional)
│
├── infrastructure/   # Docker configs
│   └── docker-compose.yml
│
└── Documentation/    # All .md files
```

---

## 🔐 Security Notes

### Never Commit

- ❌ `backend/.env` (gitignored)
- ❌ `frontend/.env.local` (gitignored)
- ❌ `backend/storage/*` (gitignored)
- ❌ API keys in code

### Always Safe to Commit

- ✅ `.env.example` (templates)
- ✅ Source code
- ✅ Migrations
- ✅ Documentation
- ✅ Config files

---

## 🎯 What's Already Implemented

When you clone, you get:

### ✅ Working Features

1. **Authentication**
   - Register new users
   - Login with JWT
   - Multi-tenant support

2. **Document Management**
   - Upload PDF, CSV, MD, TXT, DOCX
   - Automatic processing
   - Status tracking
   - Delete documents

3. **RAG Chat**
   - Ask questions about documents
   - Get AI answers with citations
   - Real-time streaming
   - Source attribution

4. **Multi-Tenancy**
   - Separate workspaces
   - Role-based access
   - Data isolation

### ⬜ To Be Implemented

- Phase 6: Agent Actions (email, Jira, reports)
- Phase 7: Evaluation Dashboard
- Phase 8: LangSmith Tracing
- Phase 9: Production Deployment
- Phase 10: Testing Suite

---

## 🚀 Continue Development

### Working on New Features

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... code ...

# 3. Test locally
# Visit http://localhost:3000

# 4. Commit and push
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# 5. Create Pull Request on GitHub
```

### Syncing Between Machines

**From Work:**
```bash
git add .
git commit -m "Work in progress"
git push origin main
```

**At Home:**
```bash
git pull origin main
# Continue where you left off
```

---

## 📦 Data Migration (Optional)

### Transfer Data Between Machines

**Export database:**
```bash
# On current machine
pg_dump postgresql://postgres:password@localhost:5432/agentic_workspace > backup.sql
```

**Import on new machine:**
```bash
# After setting up database
psql postgresql://postgres:password@localhost:5432/agentic_workspace < backup.sql
```

**Copy uploaded files:**
```bash
# Copy backend/storage/ folder
# Contains all uploaded documents
```

---

## 🎓 Learning & Extending

### Documentation in Repo

- `PROJECT_PLAN.md` - Full implementation roadmap
- `backend/PHASE*_COMPLETION.md` - Detailed phase guides
- `backend/DATABASE_SETUP.md` - Database reference
- `backend/FREE_EMBEDDINGS.md` - Embeddings guide

### API Documentation

When backend is running:
- Interactive docs: http://localhost:8000/api/v1/docs
- Alternative: http://localhost:8000/api/v1/redoc

### Next Features to Build

See `PROJECT_PLAN.md` for:
- Phase 6: Agent Actions
- Phase 7: Evaluation Dashboard
- Phase 8: Observability
- Phase 9: Deployment
- Phase 10: Testing

---

## 💰 Costs

**Development:** $0.00 (Gemini free tier)

**Production:** 
- Gemini: ~$5-10/month (low-medium traffic)
- Database: Free (self-hosted) or $7-15/month (managed)
- Hosting: Free (Vercel/Railway) or $5-20/month

**Total:** Can run for FREE or very cheap!

---

## 🆘 Getting Help

### In the Repo

1. Check `README.md`
2. Read phase completion docs
3. Review setup guides

### Issues

- Check GitHub Issues
- Review error logs
- Test with demo data

### Community

- Create GitHub issue
- Share error logs
- Describe what you tried

---

## ✅ Checklist for New Machine

- [ ] Clone repository
- [ ] Install Python 3.11+
- [ ] Install Node.js 20+
- [ ] Install/Start PostgreSQL
- [ ] Create `backend/.env` with GOOGLE_API_KEY
- [ ] Install backend: `pip install -r requirements.txt`
- [ ] Install frontend: `npm install`
- [ ] Run migrations: `alembic upgrade head`
- [ ] Seed demo data: `py scripts/seed_data.py`
- [ ] Start backend: `py -m uvicorn app.main:app --reload`
- [ ] Start frontend: `npm run dev`
- [ ] Test login: demo@example.com / demo123
- [ ] Upload a document
- [ ] Test chat

---

## 🎯 Quick Commands Reference

### Start Everything

```bash
# 1. Database
cd infrastructure && docker-compose up -d postgres

# 2. Backend (new terminal)
cd backend && py -m uvicorn app.main:app --reload

# 3. Frontend (new terminal)
cd frontend && npm run dev
```

### Stop Everything

```bash
# Ctrl+C in backend and frontend terminals

# Stop database
cd infrastructure && docker-compose down
```

### Check Status

```bash
# Backend
curl http://localhost:8000/health

# Database
docker-compose ps
# or: psql -c "SELECT 1;"

# Migrations
cd backend && alembic current
```

---

## 📝 Important Notes

### Your API Key

**Keep this secure:**
```
GOOGLE_API_KEY=AIzaSyC2f_Fljw-lJD91bot8yXQvUe2QwDlAb8E
```

- Don't commit to git (already in .gitignore)
- Don't share publicly
- Use same key on all machines

### Database State

- Migrations are committed (tracked in git)
- Data is NOT committed (local only)
- To transfer data: Use pg_dump/pg_restore
- To start fresh: Just run migrations

### Node Modules

- NOT in git (too large)
- Run `npm install` on each machine
- May take 2-3 minutes first time

---

## 🔄 Typical Work Session

### Starting

```bash
# 1. Pull latest
git pull origin main

# 2. Start database
cd infrastructure && docker-compose up -d

# 3. Start backend
cd backend && py -m uvicorn app.main:app --reload

# 4. Start frontend  
cd frontend && npm run dev

# 5. Open http://localhost:3000
```

### During Work

- Make changes in code
- Auto-reload handles updates
- Test in browser
- Check logs for errors

### Ending

```bash
# 1. Save changes
git add .
git commit -m "Descriptive message"
git push origin main

# 2. Stop services
# Ctrl+C in terminals

# 3. Stop database
cd infrastructure && docker-compose down
```

---

## 🐛 Common Issues & Solutions

### "Can't connect to database"

**Solution:**
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart if needed
docker-compose restart postgres

# Verify connection
psql postgresql://postgres:password@localhost:5432/agentic_workspace -c "SELECT 1;"
```

### "Migrations out of sync"

**Solution:**
```bash
cd backend

# Check current version
alembic current

# Check history
alembic history

# Upgrade to latest
alembic upgrade head
```

### "Module not found" (Python)

**Solution:**
```bash
cd backend
pip install -r requirements.txt

# Or install specific package
pip install package-name
```

### "Module not found" (Node)

**Solution:**
```bash
cd frontend
npm install

# Or install specific package
npm install package-name
```

### "Port 8000 already in use"

**Solution:**
```bash
# Find process using port
# Windows: netstat -ano | findstr :8000
# Linux/Mac: lsof -i :8000

# Kill the process or change port in backend
```

### "Can't access frontend lib files"

**Note:** `frontend/lib/` might be gitignored in some setups.

**Solution:**
```bash
# Force add if needed
git add -f frontend/lib/*.ts frontend/lib/*.tsx
```

---

## 📚 Documentation Reference

### Setup Guides

- `README.md` - Project overview & quick start
- `SETUP_GUIDE.md` - Detailed setup instructions
- `CONTINUING_WORK.md` - This file (workflow guide)

### Technical Docs

- `backend/DATABASE_SETUP.md` - Database operations
- `backend/MIGRATIONS_QUICKREF.md` - Migration commands
- `backend/FREE_EMBEDDINGS.md` - Embeddings setup
- `backend/GEMINI_SETUP.md` - Gemini configuration

### Implementation Docs

- `PROJECT_PLAN.md` - Full roadmap (10 phases)
- `backend/PHASE2_COMPLETION.md` - Database phase
- `backend/PHASE3_COMPLETION.md` - Auth phase
- `backend/PHASE4_COMPLETION.md` - Ingestion phase
- `backend/PHASE5_COMPLETION.md` - RAG phase

### Quick References

- `PHASE4_FINAL_SUMMARY.md` - Document ingestion
- `PHASE5_SUMMARY.md` - RAG queries

---

## 🎯 Next Steps (Phase 6+)

See `PROJECT_PLAN.md` for remaining phases:

### Phase 6: Agent Actions
- Email draft generation
- Jira ticket creation
- Report generation

### Phase 7: Evaluation Dashboard
- Quality metrics
- LangSmith integration
- User feedback tracking

### Phase 8: Observability
- Enhanced logging
- Monitoring
- Error tracking

### Phase 9: Deployment
- Production configuration
- CI/CD pipeline
- Scaling setup

### Phase 10: Testing
- Unit tests
- Integration tests
- E2E tests

---

## 💡 Tips for Success

### 1. Keep Documentation Updated

When you add features:
```bash
# Update relevant docs
- PROJECT_PLAN.md (mark as complete)
- Create PHASE*_COMPLETION.md
- Update README if needed
```

### 2. Test Before Committing

```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test

# Manual testing
# - Upload document
# - Test chat
# - Check auth
```

### 3. Use Branches

```bash
# For big features
git checkout -b feature/big-change

# When done and tested
git checkout main
git merge feature/big-change
git push origin main
```

### 4. Keep .env Secure

- Never commit `.env`
- Use strong secrets in production
- Rotate keys periodically

### 5. Regular Backups

```bash
# Database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Files
tar -czf storage-backup.tar.gz backend/storage/
```

---

## 🔄 Syncing Work Between Machines

### Machine 1 (Current)

```bash
# Before leaving
git add .
git commit -m "End of day - working on feature X"
git push origin main
```

### Machine 2 (Home)

```bash
# When starting
git pull origin main

# Continue working
# ... make changes ...

# When done
git add .
git commit -m "Continued feature X - added Y"
git push origin main
```

### Back to Machine 1

```bash
# Next day
git pull origin main

# Continue from where you left off
```

---

## ✅ Summary

**Yes, you can continue work anywhere!**

**Just need:**
1. ✅ Git clone
2. ✅ Python + Node.js installed
3. ✅ PostgreSQL running
4. ✅ Add your GOOGLE_API_KEY to `.env`
5. ✅ Run setup commands

**Everything else is in the repo!**

---

## 🚀 Ready to Go!

Clone the repo at home and run:

```bash
git clone https://github.com/BitMastermind/Agentic-Knowledge-Workspace.git
cd Agentic-Knowledge-Workspace
# Follow this guide!
```

**All your work is safely on GitHub!** 🎊

For questions, check the documentation or create a GitHub issue.

---

**Happy Coding!** 💻

