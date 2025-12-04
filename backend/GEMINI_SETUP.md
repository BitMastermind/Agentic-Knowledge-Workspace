# Gemini LLM Setup - Quick Start

## ✅ Configuration Complete

Your application is now configured to use **Google Gemini** as the LLM provider!

## Your API Key

Your Gemini API key has been provided:

```
AIzaSyC2f_Fljw-lJD91bot8yXQvUe2QwDlAb8E
```

## Setup Instructions

### 1. Create Your `.env` File

```bash
cd backend
cp .env.example .env
```

### 2. Edit `.env` with Your Settings

Open `backend/.env` and set:

```env
# AI Services - Using Gemini
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash

# Your Gemini API Key
GOOGLE_API_KEY=AIzaSyC2f_Fljw-lJD91bot8yXQvUe2QwDlAb8E

# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/agentic_workspace

# Security
JWT_SECRET_KEY=dev-secret-key-change-in-production

# Other settings...
```

## What Changed

### 1. Configuration (`app/core/config.py`)

- ✅ Added `GOOGLE_API_KEY` setting
- ✅ Added `LLM_PROVIDER` setting (defaults to "gemini")
- ✅ Changed default `LLM_MODEL` to "gemini-1.5-flash"
- ✅ Made `OPENAI_API_KEY` optional

### 2. Dependencies (`requirements.txt`)

- ✅ Added `langchain-google-genai==2.0.5`
- ✅ Added `google-generativeai==0.8.3`

### 3. Agent Service (`app/services/agent.py`)

- ✅ Added support for multiple LLM providers
- ✅ Automatically selects Gemini when `LLM_PROVIDER=gemini`
- ✅ Fallback to OpenAI or Anthropic if configured

### 4. Documentation

- ✅ Created `LLM_PROVIDERS.md` - Comprehensive provider guide
- ✅ Updated `.env.example` - Shows all provider options

## Quick Test

Once you've set up the `.env` file, test the configuration:

```bash
cd backend

# Install dependencies (if not already installed)
pip install -r requirements.txt

# Test import
python -c "from app.core.config import settings; print(f'Provider: {settings.LLM_PROVIDER}, Model: {settings.LLM_MODEL}')"

# Should output:
# Provider: gemini, Model: gemini-1.5-flash
```

## Models Available

### Gemini 1.5 Flash (Recommended) ⭐

- **Cost**: $0.075 / 1M input tokens, $0.30 / 1M output
- **Speed**: Very fast
- **Context**: 1M tokens
- **Use**: Development and production

```env
LLM_MODEL=gemini-1.5-flash
```

### Gemini 1.5 Pro (Premium)

- **Cost**: $1.25 / 1M input tokens, $5.00 / 1M output
- **Speed**: Fast
- **Context**: 2M tokens
- **Use**: Maximum quality, long context

```env
LLM_MODEL=gemini-1.5-pro
```

## Features Supported

With Gemini configured, you can:

- ✅ Generate email drafts (Phase 6)
- ✅ Create Jira tickets (Phase 6)
- ✅ Generate reports (Phase 6)
- ✅ RAG queries with streaming (Phase 5)
- ✅ Chat interface (Phase 5)

## Cost Comparison

**Gemini vs Others** (per 1M tokens):

| Provider             | Input  | Output | Context |
| -------------------- | ------ | ------ | ------- |
| **Gemini 1.5 Flash** | $0.075 | $0.30  | 1M      |
| GPT-4o-mini          | $0.15  | $0.60  | 128k    |
| Claude 3 Haiku       | $0.25  | $1.25  | 200k    |

**Gemini is 2-3x cheaper!** 💰

## Embeddings Note

For document embeddings (Phase 4), we still use OpenAI's `text-embedding-3-small` model.

**Options:**

1. **Keep OpenAI embeddings** (Recommended for now)
   - Set `OPENAI_API_KEY` in `.env`
   - Cost: $0.02 / 1M tokens
2. **Switch to Gemini embeddings** (Future)
   - Will be implemented in Phase 4
   - Model: `models/embedding-001`
   - Only needs `GOOGLE_API_KEY`

## Switching Back to OpenAI/Anthropic

If you want to switch providers later:

```env
# OpenAI
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-your-key

# Anthropic
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sk-ant-your-key
```

No code changes needed - just change the env vars!

## Troubleshooting

### Import Error

```bash
# Install Gemini dependencies
pip install langchain-google-genai google-generativeai
```

### API Key Not Working

Test your key:

```bash
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello, world!"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyC2f_Fljw-lJD91bot8yXQvUe2QwDlAb8E"
```

Should return a JSON response with generated text.

### Configuration Not Loading

Check if `.env` file exists and is in the right location:

```bash
ls -la backend/.env
cat backend/.env | grep LLM_PROVIDER
```

## Next Steps

1. ✅ **Phase 2 Complete** - Database setup done
2. ⬜ **Phase 3** - Implement authentication (uses Gemini for any AI features)
3. ⬜ **Phase 4** - Document ingestion (decide on embeddings)
4. ⬜ **Phase 5** - RAG queries with Gemini streaming
5. ⬜ **Phase 6** - Agent actions with Gemini

## Resources

- **Gemini Documentation**: https://ai.google.dev/docs
- **Get API Key**: https://aistudio.google.com/app/apikey
- **Pricing**: https://ai.google.dev/pricing
- **LangChain Gemini**: https://python.langchain.com/docs/integrations/chat/google_generative_ai

---

**You're all set!** 🚀 Gemini is configured and ready to use.

For more details, see `LLM_PROVIDERS.md`.
