"""
Enhanced FastAPI server for FloatChat with all advanced features
Provides REST API endpoints with RAG, streaming, history, and export
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
import os
from dotenv import load_dotenv

# Import enhanced engine with RAG
from enhanced_llm_engine import EnhancedLLMEngine

load_dotenv()

app = FastAPI(
    title="FloatChat Enhanced API",
    description="Advanced natural language interface for Argo float oceanographic data with RAG, streaming, and more",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request/Response Models
class QueryRequest(BaseModel):
    query: str
    user_id: str = "anonymous"
    conversation_id: Optional[str] = None
    use_rag: bool = True
    include_raw_data: bool = False


class StreamingQueryRequest(BaseModel):
    query: str
    user_id: str = "anonymous"
    conversation_id: Optional[str] = None


class ExportRequest(BaseModel):
    query: str
    sql: str
    data: List[Dict[str, Any]]
    summary: str
    formats: List[str] = ["csv", "json", "pdf"]


class FavoriteRequest(BaseModel):
    query_id: str
    user_id: str


# Root and Health Endpoints
@app.get("/")
async def root():
    """API information"""
    return {
        "status": "online",
        "service": "FloatChat Enhanced API",
        "version": "2.0.0",
        "features": [
            "RAG (Retrieval-Augmented Generation)",
            "Multi-turn conversations",
            "Streaming responses",
            "Query history",
            "Export capabilities",
            "Favorites",
            "Analytics"
        ]
    }


@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_KEY")
        )
        supabase.table("floats").select("float_id").limit(1).execute()
        
        return {
            "status": "healthy",
            "database": "connected",
            "llm": "ready",
            "rag": "enabled",
            "streaming": "enabled"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# Initialize engine (singleton)
_engine = None

def get_engine():
    global _engine
    if _engine is None:
        _engine = EnhancedLLMEngine()
    return _engine


# Query Endpoints
@app.post("/query")
@app.post("/api/chat")  # Add alias for frontend compatibility
async def process_query(request: QueryRequest):
    """
    Process natural language query with RAG
    """
    try:
        print(f"\n{'='*60}")
        print(f"📨 Received query: {request.query}")
        print(f"👤 User ID: {request.user_id}")
        print(f"🔍 Use RAG: {request.use_rag}")
        print(f"{'='*60}\n")
        
        engine = get_engine()
        result = engine.process_query_with_rag(
            query=request.query,
            user_id=request.user_id,
            conversation_id=request.conversation_id,
            use_rag=request.use_rag
        )
        
        print(f"\n✅ Query processed successfully")
        print(f"📊 Result keys: {list(result.keys())}")
        if 'processed_data' in result and result['processed_data']:
            if 'map_data' in result['processed_data']:
                markers = result['processed_data']['map_data'].get('markers', [])
                print(f"🗺️  Map markers: {len(markers)}")
        print(f"{'='*60}\n")
        
        if not request.include_raw_data:
            result.pop("raw_data", None)
        
        return result
    except Exception as e:
        print(f"\n❌ Error processing query: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query/stream")
async def process_query_streaming(request: StreamingQueryRequest):
    """
    Process query with streaming response
    Note: Returns regular response for now (streaming in progress)
    """
    try:
        engine = get_engine()
        result = engine.process_query_with_rag(
            query=request.query,
            user_id=request.user_id,
            conversation_id=request.conversation_id,
            use_rag=True
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/query/suggestions")
async def get_suggestions(
    user_id: str,
    current_query: Optional[str] = None,
    limit: int = 5
):
    """Get query suggestions based on history"""
    try:
        engine = get_engine()
        suggestions = engine.get_query_suggestions(
            user_id=user_id,
            current_query=current_query,
            limit=limit
        )
        return {
            "suggestions": suggestions
        }
    except Exception as e:
        # Fallback to default suggestions
        suggestions = [
            "Show me all floats",
            "List floats with salinity data",
            "Find floats near the equator",
            "Show temperature profiles",
            "Get recent measurements"
        ]
        return {
            "suggestions": suggestions[:limit]
        }


# History Endpoints
@app.get("/history/{user_id}")
async def get_history(
    user_id: str,
    limit: int = 50,
    offset: int = 0
):
    """Get user's query history"""
    try:
        engine = get_enhanced_engine()
        history = engine.history_manager.get_user_history(
            user_id=user_id,
            limit=limit,
            offset=offset
        )
        return {
            "history": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/history/{user_id}/search")
async def search_history(
    user_id: str,
    q: str,
    limit: int = 20
):
    """Search query history"""
    try:
        engine = get_enhanced_engine()
        results = engine.search_history(user_id=user_id, search_term=q)
        return {
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/history/{user_id}")
async def clear_history(
    user_id: str,
    keep_favorites: bool = True
):
    """Clear user's query history"""
    try:
        engine = get_enhanced_engine()
        success = engine.history_manager.clear_history(
            user_id=user_id,
            keep_favorites=keep_favorites
        )
        return {
            "success": success,
            "message": "History cleared successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Favorites Endpoints
@app.get("/favorites/{user_id}")
async def get_favorites(user_id: str):
    """Get user's favorite queries"""
    try:
        engine = get_enhanced_engine()
        favorites = engine.get_favorites(user_id=user_id)
        return {
            "favorites": favorites,
            "count": len(favorites)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/favorites/toggle")
async def toggle_favorite(request: FavoriteRequest):
    """Toggle favorite status of a query"""
    try:
        engine = get_enhanced_engine()
        new_status = engine.toggle_favorite(
            query_id=request.query_id,
            user_id=request.user_id
        )
        return {
            "success": True,
            "is_favorite": new_status
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Conversation Endpoints
@app.post("/conversation/{conversation_id}")
async def create_conversation(conversation_id: str):
    """Create a new conversation"""
    try:
        engine = get_enhanced_engine()
        engine.create_conversation(conversation_id)
        return {
            "success": True,
            "conversation_id": conversation_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/conversation/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    max_messages: int = 10
):
    """Get conversation history"""
    try:
        engine = get_enhanced_engine()
        history = engine.get_conversation_history(
            conversation_id=conversation_id,
            max_messages=max_messages
        )
        return {
            "conversation_id": conversation_id,
            "messages": history,
            "count": len(history)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/conversation/{conversation_id}")
async def clear_conversation(conversation_id: str):
    """Clear conversation history"""
    try:
        engine = get_enhanced_engine()
        engine.clear_conversation(conversation_id)
        return {
            "success": True,
            "message": "Conversation cleared"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Export Endpoints
@app.post("/export")
async def export_results(request: ExportRequest):
    """Export query results in multiple formats"""
    try:
        engine = get_enhanced_engine()
        exported_files = engine.export_query_results(
            query=request.query,
            sql=request.sql,
            data=request.data,
            summary=request.summary,
            formats=request.formats
        )
        return {
            "success": True,
            "files": exported_files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/export/download/{filename}")
async def download_export(filename: str):
    """Download exported file"""
    try:
        file_path = f"export/{filename}"
        if os.path.exists(file_path):
            return FileResponse(
                file_path,
                filename=filename,
                media_type="application/octet-stream"
            )
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Analytics Endpoints
@app.get("/analytics/{user_id}")
async def get_analytics(
    user_id: str,
    days: int = 30
):
    """Get user query analytics"""
    try:
        engine = get_enhanced_engine()
        analytics = engine.get_user_analytics(user_id=user_id, days=days)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Database Endpoints
@app.get("/schema")
async def get_schema():
    """Get database schema information"""
    from llm_query_engine import DATABASE_SCHEMA
    return {
        "schema": DATABASE_SCHEMA
    }


@app.get("/floats")
async def list_floats(limit: int = 10):
    """List available floats"""
    try:
        from supabase import create_client
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_KEY")
        )
        result = supabase.table("floats").select("*").limit(limit).execute()
        return {
            "success": True,
            "floats": result.data,
            "count": len(result.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )
