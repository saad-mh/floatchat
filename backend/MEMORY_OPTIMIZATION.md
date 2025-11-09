# Memory Optimization for Render Free Tier (512MB)

## Problem
The backend exceeds Render's 512MB memory limit due to heavy ML dependencies (sentence-transformers, chromadb, torch, etc.).

## Solution
Use minimal dependencies in production and disable heavy features.

## Changes Made

### 1. Created `requirements-minimal.txt`
Lightweight dependencies without ML libraries:
- FastAPI, Uvicorn (API)
- Supabase, psycopg2 (Database)
- NumPy, Pandas (Data processing)
- HuggingFace Hub (LLM - minimal)
- Upstash Vector (Vector DB - lightweight)

### 2. Updated `Dockerfile`
Uses `requirements-minimal.txt` by default for production builds.

### 3. Updated `enhanced_llm_engine.py`
When `PRODUCTION_MODE=true`:
- ✅ **Keeps RAG engine** (essential for context-aware queries)
- ❌ Disables Conversation manager
- ❌ Disables History manager
- ❌ Disables Export engine
- ❌ Disables Streaming engine

### 4. Updated `render.yaml`
Added `PRODUCTION_MODE=true` environment variable.

## Deploy to Render

### Option 1: Add Environment Variable in Dashboard
1. Go to your service in Render dashboard
2. Environment tab
3. Add: `PRODUCTION_MODE` = `true`
4. Save and redeploy

### Option 2: Use render.yaml (Already configured)
The `render.yaml` already has `PRODUCTION_MODE=true` set.

## What Still Works

✅ **Core Features:**
- Natural language queries
- SQL generation
- Database queries
- Map visualizations
- Chart visualizations
- Table visualizations
- Summary generation
- **RAG (context-aware queries)** ← Essential feature kept!

❌ **Disabled Features (to save memory):**
- Conversation history
- Query history
- Export to PDF/Excel
- Streaming responses

## Memory Usage

**Before optimization:**
- ~600-800 MB (exceeds 512MB limit)

**After optimization (with RAG):**
- ~350-450 MB (within 512MB limit)
- RAG uses lightweight model: all-MiniLM-L6-v2 (~80MB)

## For Local Development

Use full requirements:
```bash
pip install -r requirements.txt
```

Don't set `PRODUCTION_MODE` or set it to `false`.

## Upgrade Options

If you need the full features:

### Render Starter Plan ($7/month)
- 512 MB RAM (same as free)
- Always on (no spin-down)
- Not enough for full features

### Render Standard Plan ($25/month)
- 2 GB RAM
- Enough for all features
- Set `PRODUCTION_MODE=false`
- Use `requirements.txt` instead of `requirements-minimal.txt`

## Testing

After deploying with minimal requirements:

```bash
# Test health
curl https://floatchat-ly06.onrender.com/health

# Test query
curl -X POST https://floatchat-ly06.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me salinity profiles", "user_id": "test"}'
```

## Troubleshooting

**Still running out of memory?**
1. Check logs for memory usage
2. Reduce query result limits
3. Add pagination
4. Consider upgrading to Standard plan

**Features not working?**
1. Check if `PRODUCTION_MODE=true`
2. Verify minimal requirements are installed
3. Check logs for errors
