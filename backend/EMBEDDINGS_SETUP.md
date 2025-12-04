# Embeddings Configuration

## Current Setup

**LLM**: Google Gemini (for chat, agent actions)  
**Embeddings**: OpenAI text-embedding-3-small (for document search)

## Why Two Providers?

- **Gemini** - Great for text generation (cheaper, faster)
- **OpenAI Embeddings** - Industry standard for RAG, well-tested, 1536 dimensions

This is a common pattern: use different providers for different capabilities.

## Quick Setup

### Get OpenAI API Key (for embeddings only)

1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Add to `backend/.env`:

```env
# For embeddings (required for document search)
OPENAI_API_KEY=sk-your-openai-key-here
EMBEDDING_MODEL=text-embedding-3-small

# For LLM (already configured)
LLM_PROVIDER=gemini
GOOGLE_API_KEY=AIzaSyC2f_Fljw-lJD91bot8yXQvUe2QwDlAb8E
```

## Cost

**OpenAI Embeddings**: $0.02 per 1M tokens (~400 pages)

Very affordable for most use cases. Example costs:
- 100 documents (~5000 chunks): ~$0.10
- 1000 documents (~50000 chunks): ~$1.00

## Alternative: Gemini Embeddings (Future)

Can switch to Gemini embeddings to use only one provider:

```python
# In ingestion.py and retriever.py
from langchain_google_genai import GoogleGenerativeAIEmbeddings

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=settings.GOOGLE_API_KEY
)
```

**Pros**: Single provider, potentially cheaper  
**Cons**: Different dimensions (768 vs 1536), requires schema change

## For Now

**Recommended**: Use OpenAI for embeddings + Gemini for LLM

This is the most tested and reliable setup.

## Testing Embeddings

```bash
cd backend
py test_upload.py
```

Should show:
```
Embeddings           [PASS]
```

## Without OpenAI Key

Document upload will work, but documents will stay in "processing" state because embedding generation will fail.

To test without embeddings:
- Upload works ✓
- File storage works ✓
- Parsing works ✓
- Chunking works ✓
- Embedding fails ✗

## Production Setup

```env
# backend/.env
OPENAI_API_KEY=sk-proj-your-production-key
EMBEDDING_MODEL=text-embedding-3-small
```

Monitor usage at: https://platform.openai.com/usage

