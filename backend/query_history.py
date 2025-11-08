"""
Query History Manager for FloatChat
Stores and manages user query history with favorites and analytics
"""

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Initialize Supabase - Use separate history database if available
HISTORY_SUPABASE_URL = os.getenv("HISTORY_SUPABASE_URL") or os.getenv("SUPABASE_URL")
HISTORY_SUPABASE_KEY = os.getenv("HISTORY_SUPABASE_KEY") or os.getenv("SUPABASE_KEY")
supabase: Client = create_client(HISTORY_SUPABASE_URL, HISTORY_SUPABASE_KEY)


class QueryHistoryManager:
    """Manage query history and favorites"""
    
    def __init__(self):
        """Initialize query history manager"""
        self.supabase = supabase
        self._ensure_tables()
    
    def _ensure_tables(self):
        """Ensure query history tables exist"""
        # This would be run once to create tables
        # In production, use migrations
        pass
    
    def save_query(
        self,
        user_id: str,
        query: str,
        sql: str,
        result_count: int,
        execution_time: float,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Save query to history
        
        Args:
            user_id: User identifier
            query: Natural language query
            sql: Generated SQL
            result_count: Number of results
            execution_time: Query execution time in seconds
            success: Whether query succeeded
            error_message: Error message if failed
            metadata: Additional metadata
            
        Returns:
            Query ID
        """
        query_data = {
            "user_id": user_id,
            "query": query,
            "sql": sql,
            "result_count": result_count,
            "execution_time": execution_time,
            "success": success,
            "error_message": error_message,
            "metadata": metadata or {},
            "created_at": datetime.utcnow().isoformat(),
            "is_favorite": False
        }
        
        try:
            result = self.supabase.table("query_history").insert(query_data).execute()
            # Handle the result properly
            if hasattr(result, 'data') and result.data:
                if isinstance(result.data, list) and len(result.data) > 0:
                    return result.data[0].get("id") if isinstance(result.data[0], dict) else None
            return None
        except Exception as e:
            print(f"Error saving query: {e}")
            return None
    
    def get_user_history(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        include_failed: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get user's query history
        
        Args:
            user_id: User identifier
            limit: Maximum number of queries to return
            offset: Offset for pagination
            include_failed: Include failed queries
            
        Returns:
            List of queries
        """
        try:
            query = self.supabase.table("query_history").select("*").eq("user_id", user_id)
            
            if not include_failed:
                query = query.eq("success", True)
            
            result = query.order("created_at", desc=True).limit(limit).offset(offset).execute()
            return result.data
        except Exception as e:
            print(f"Error fetching history: {e}")
            return []
    
    def get_favorites(
        self,
        user_id: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get user's favorite queries
        
        Args:
            user_id: User identifier
            limit: Maximum number to return
            
        Returns:
            List of favorite queries
        """
        try:
            result = self.supabase.table("query_history")\
                .select("*")\
                .eq("user_id", user_id)\
                .eq("is_favorite", True)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            return result.data
        except Exception as e:
            print(f"Error fetching favorites: {e}")
            return []
    
    def toggle_favorite(
        self,
        query_id: str,
        user_id: str
    ) -> bool:
        """
        Toggle favorite status of a query
        
        Args:
            query_id: Query identifier
            user_id: User identifier
            
        Returns:
            New favorite status
        """
        try:
            # Get current status
            result = self.supabase.table("query_history")\
                .select("is_favorite")\
                .eq("id", query_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                return False
            
            current_status = result.data[0]["is_favorite"]
            new_status = not current_status
            
            # Update status
            self.supabase.table("query_history")\
                .update({"is_favorite": new_status})\
                .eq("id", query_id)\
                .eq("user_id", user_id)\
                .execute()
            
            return new_status
        except Exception as e:
            print(f"Error toggling favorite: {e}")
            return False
    
    def search_history(
        self,
        user_id: str,
        search_term: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search query history
        
        Args:
            user_id: User identifier
            search_term: Search term
            limit: Maximum results
            
        Returns:
            Matching queries
        """
        try:
            result = self.supabase.table("query_history")\
                .select("*")\
                .eq("user_id", user_id)\
                .ilike("query", f"%{search_term}%")\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            return result.data
        except Exception as e:
            print(f"Error searching history: {e}")
            return []
    
    def get_query_analytics(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get query analytics for user
        
        Args:
            user_id: User identifier
            days: Number of days to analyze
            
        Returns:
            Analytics data
        """
        try:
            since_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
            
            result = self.supabase.table("query_history")\
                .select("*")\
                .eq("user_id", user_id)\
                .gte("created_at", since_date)\
                .execute()
            
            queries = result.data
            
            if not queries:
                return {
                    "total_queries": 0,
                    "successful_queries": 0,
                    "failed_queries": 0,
                    "avg_execution_time": 0,
                    "total_results": 0,
                    "most_common_terms": []
                }
            
            successful = [q for q in queries if q["success"]]
            failed = [q for q in queries if not q["success"]]
            
            avg_time = sum(q["execution_time"] for q in successful) / len(successful) if successful else 0
            total_results = sum(q["result_count"] for q in successful)
            
            # Extract common terms (simple word frequency)
            all_queries = " ".join(q["query"].lower() for q in queries)
            words = all_queries.split()
            word_freq = {}
            for word in words:
                if len(word) > 3:  # Ignore short words
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            most_common = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
            
            return {
                "total_queries": len(queries),
                "successful_queries": len(successful),
                "failed_queries": len(failed),
                "success_rate": (len(successful) / len(queries)) * 100,
                "avg_execution_time": avg_time,
                "total_results": total_results,
                "most_common_terms": [{"term": term, "count": count} for term, count in most_common],
                "queries_by_day": self._group_by_day(queries)
            }
        except Exception as e:
            print(f"Error getting analytics: {e}")
            return {}
    
    def _group_by_day(self, queries: List[Dict[str, Any]]) -> Dict[str, int]:
        """Group queries by day"""
        by_day = {}
        for query in queries:
            date = query["created_at"][:10]  # Get YYYY-MM-DD
            by_day[date] = by_day.get(date, 0) + 1
        return by_day
    
    def delete_query(
        self,
        query_id: str,
        user_id: str
    ) -> bool:
        """
        Delete a query from history
        
        Args:
            query_id: Query identifier
            user_id: User identifier
            
        Returns:
            Success status
        """
        try:
            self.supabase.table("query_history")\
                .delete()\
                .eq("id", query_id)\
                .eq("user_id", user_id)\
                .execute()
            return True
        except Exception as e:
            print(f"Error deleting query: {e}")
            return False
    
    def clear_history(
        self,
        user_id: str,
        keep_favorites: bool = True
    ) -> bool:
        """
        Clear user's query history
        
        Args:
            user_id: User identifier
            keep_favorites: Keep favorite queries
            
        Returns:
            Success status
        """
        try:
            query = self.supabase.table("query_history").delete().eq("user_id", user_id)
            
            if keep_favorites:
                query = query.eq("is_favorite", False)
            
            query.execute()
            return True
        except Exception as e:
            print(f"Error clearing history: {e}")
            return False
    
    def export_history(
        self,
        user_id: str,
        format: str = "json"
    ) -> str:
        """
        Export user's query history
        
        Args:
            user_id: User identifier
            format: Export format (json, csv)
            
        Returns:
            Exported data as string
        """
        queries = self.get_user_history(user_id, limit=1000)
        
        if format == "json":
            return json.dumps(queries, indent=2)
        elif format == "csv":
            if not queries:
                return ""
            
            # Simple CSV export
            headers = ["created_at", "query", "sql", "result_count", "execution_time", "success"]
            lines = [",".join(headers)]
            
            for q in queries:
                row = [
                    q.get("created_at", ""),
                    f'"{q.get("query", "")}"',
                    f'"{q.get("sql", "")}"',
                    str(q.get("result_count", 0)),
                    str(q.get("execution_time", 0)),
                    str(q.get("success", False))
                ]
                lines.append(",".join(row))
            
            return "\n".join(lines)
        
        return ""


# SQL for creating query_history table (run once)
CREATE_QUERY_HISTORY_TABLE = """
CREATE TABLE IF NOT EXISTS query_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    sql TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    execution_time DOUBLE PRECISION DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_query_history_user_id ON query_history(user_id);
CREATE INDEX idx_query_history_created_at ON query_history(created_at);
CREATE INDEX idx_query_history_is_favorite ON query_history(is_favorite);
CREATE INDEX idx_query_history_query ON query_history USING gin(to_tsvector('english', query));
"""


# Convenience function
def get_query_history_manager() -> QueryHistoryManager:
    """Get singleton query history manager"""
    if not hasattr(get_query_history_manager, "_instance"):
        get_query_history_manager._instance = QueryHistoryManager()
    return get_query_history_manager._instance
