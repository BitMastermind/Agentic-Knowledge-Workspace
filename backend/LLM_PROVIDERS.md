# LLM Provider Configuration

## Overview

The Agentic Knowledge Workspace supports multiple LLM providers:
- **Google Gemini** (Default) - Fast, cost-effective, great performance
- **OpenAI** - GPT-4, GPT-3.5-turbo
- **Anthropic** - Claude models

## Current Configuration

**Provider**: Gemini  
**Model**: gemini-1.5-flash  
**Embeddings**: OpenAI text-embedding-3-small (requires OpenAI key)

## Quick Setup

### 1. Set Your Provider

Edit `backend/.env`:

```env
# Choose your provider
LLM_PROVIDER=gemini  # or "openai" or "anthropic"

# Set the model
LLM_MODEL=gemini-1.5-flash  # or your preferred model

# Add your API key
GOOGLE_API_KEY=your-key-here
```

### 2. Available Models

**Gemini:**
- `gemini-1.5-flash` - Fast, cost-effective (Recommended)
- `gemini-1.5-pro` - More capable, higher quality
- `gemini-1.0-pro` - Older version

**OpenAI:**
- `gpt-4o` - Latest GPT-4 Omni
- `gpt-4o-mini` - Smaller, faster GPT-4
- `gpt-4-turbo` - GPT-4 Turbo
- `gpt-3.5-turbo` - Fast and cheap

**Anthropic:**
- `claude-3-5-sonnet-20241022` - Latest Claude 3.5
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced
- `claude-3-haiku-20240307` - Fast and cheap

## Switching Providers

### Switch to Gemini (Current)

```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
GOOGLE_API_KEY=AIzaSyC2f_Fljw-lJD91bot8yXQvUe2QwDlAb8E
```

**Get API Key**: https://aistudio.google.com/app/apikey

### Switch to OpenAI

```env
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-your-key-here
```

**Get API Key**: https://platform.openai.com/api-keys

### Switch to Anthropic

```env
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

**Get API Key**: https://console.anthropic.com/settings/keys

## Embeddings

Currently using **OpenAI** for embeddings:
- Model: `text-embedding-3-small` (1536 dimensions)
- Requires: `OPENAI_API_KEY`

**Note**: Even if using Gemini/Anthropic for LLM, you need OpenAI key for embeddings (or switch to Gemini embeddings in Phase 4).

### Future: Gemini Embeddings

To use Gemini embeddings (coming in Phase 4):

```python
# In ingestion.py and retriever.py
from langchain_google_genai import GoogleGenerativeAIEmbeddings

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=settings.GOOGLE_API_KEY
)
```

## Cost Comparison

### Gemini (Current) ⭐ Best Value

**gemini-1.5-flash:**
- Input: $0.075 / 1M tokens
- Output: $0.30 / 1M tokens
- 1M context window
- Very fast

**gemini-1.5-pro:**
- Input: $1.25 / 1M tokens
- Output: $5.00 / 1M tokens
- 2M context window

### OpenAI

**gpt-4o-mini:**
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens
- 128k context

**gpt-4o:**
- Input: $2.50 / 1M tokens
- Output: $10.00 / 1M tokens
- 128k context

### Anthropic

**claude-3-haiku:**
- Input: $0.25 / 1M tokens
- Output: $1.25 / 1M tokens
- 200k context

**claude-3-5-sonnet:**
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens
- 200k context

## Performance Recommendations

### For Development
**Gemini 1.5 Flash** - Fast, cheap, good quality
```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
```

### For Production (High Volume)
**Gemini 1.5 Flash** - Best cost/performance ratio
```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
```

### For Maximum Quality
**Claude 3.5 Sonnet** or **Gemini 1.5 Pro**
```env
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
```

### For Long Context (>100k tokens)
**Gemini 1.5 Pro** - 2M context window
```env
LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-pro
```

## Testing Different Providers

You can test different providers without changing code:

```bash
# Test with Gemini
export LLM_PROVIDER=gemini
export LLM_MODEL=gemini-1.5-flash
python test_script.py

# Test with OpenAI
export LLM_PROVIDER=openai
export LLM_MODEL=gpt-4o-mini
python test_script.py

# Test with Anthropic
export LLM_PROVIDER=anthropic
export LLM_MODEL=claude-3-5-sonnet-20241022
python test_script.py
```

## Implementation Details

The LLM provider selection is handled in:
- `app/services/agent.py` - Agent service with tools
- `app/services/retriever.py` - RAG queries (Phase 5)

The system automatically selects the correct LangChain class based on `LLM_PROVIDER`:

```python
if settings.LLM_PROVIDER == "gemini":
    llm = ChatGoogleGenerativeAI(
        model=settings.LLM_MODEL,
        google_api_key=settings.GOOGLE_API_KEY,
        temperature=0.7,
    )
elif settings.LLM_PROVIDER == "anthropic":
    llm = ChatAnthropic(...)
else:  # openai
    llm = ChatOpenAI(...)
```

## Troubleshooting

### Gemini API Key Not Working

```bash
# Test your API key
curl -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY"
```

### OpenAI Rate Limits

If you hit rate limits, switch to Gemini:
```env
LLM_PROVIDER=gemini
```

### Anthropic Errors

Ensure your API key starts with `sk-ant-`:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Environment Variables Reference

```env
# Required
LLM_PROVIDER=gemini           # "gemini", "openai", or "anthropic"
LLM_MODEL=gemini-1.5-flash    # Model name

# API Keys (only need one based on provider)
GOOGLE_API_KEY=your-key       # For Gemini
OPENAI_API_KEY=your-key       # For OpenAI (also needed for embeddings)
ANTHROPIC_API_KEY=your-key    # For Anthropic

# Embeddings (currently requires OpenAI)
EMBEDDING_MODEL=text-embedding-3-small
```

## Next Steps

- **Phase 4**: Implement document ingestion with embeddings
- **Phase 5**: Implement RAG queries with your chosen LLM
- **Future**: Add support for Gemini embeddings to remove OpenAI dependency

---

**Current Setup**: ✅ Gemini 1.5 Flash configured and ready to use!

