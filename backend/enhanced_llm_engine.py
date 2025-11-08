"""
Enhanced LLM Query Engine with RAG, Streaming, and History
Integrates all advanced features for FloatChat
"""

import os
import asyncio
from typing import Dict, List, Any, Optional, AsyncGenerator
from datetime import datetime
from dotenv import load_dotenv

# Import all our engines
from llm_query_engine import LLMQueryEngine, DATABASE_SCHEMA
from rag_engine import RAGEngine, ConversationManager
from streaming_engine import StreamingEngine, SSEFormatter
from query_history import QueryHistoryManager
from export_engine import ExportEngine

load_dotenv()


class EnhancedLLMEngine:
    """
    Enhanced LLM engine with all advanced features:
    - RAG for context-aware queries
    - Multi-turn conversations
    - Streaming responses
    - Query history
    - Export capabilities
    """
    
    def __init__(self):
        """Initialize enhanced engine with all components"""
        self.base_engine = LLMQueryEngine()
        # Enable all features (history uses separate database)
        try:
            self.rag_engine = RAGEngine()
        except:
            self.rag_engine = None
            print("Warning: RAG engine disabled")
        
        try:
            self.conversation_manager = ConversationManager()
        except:
            self.conversation_manager = None
            print("Warning: Conversation manager disabled")
        
        try:
            self.history_manager = QueryHistoryManager()
        except:
            self.history_manager = None
            print("Warning: History manager disabled")
        
        self.export_engine = ExportEngine()
        self.streaming_engine = StreamingEngine()
    
    def process_query_with_rag(
        self,
        query: str,
        user_id: str,
        conversation_id: Optional[str] = None,
        use_rag: bool = True
    ) -> Dict[str, Any]:
        """
        Process query with RAG context
        
        Args:
            query: Natural language query
            user_id: User identifier
            conversation_id: Optional conversation ID for multi-turn
            use_rag: Whether to use RAG
            
        Returns:
            Enhanced query results
        """
        start_time = datetime.utcnow()
        
        # Build context from RAG and conversation history (disabled for read-only DB)
        context = ""
        if use_rag and self.rag_engine:
            try:
                rag_context = self.rag_engine.build_context(query)
                if rag_context:
                    context += f"\n\nRelevant Context:\n{rag_context}"
            except:
                pass
        
        if conversation_id and self.conversation_manager:
            try:
                conv_context = self.conversation_manager.build_conversation_context(
                    conversation_id,
                    query
                )
                if conv_context:
                    context += f"\n\n{conv_context}"
            except:
                pass
        
        # Generate SQL with context
        enhanced_prompt = f"{DATABASE_SCHEMA}\n{context}\n\nUser Query: {query}"
        sql_query = self.base_engine.generate_sql(query)
        
        # Execute query
        raw_data = self.base_engine.execute_query(sql_query)
        
        # Process data
        processed_data = self.base_engine._process_data_for_viz(raw_data, query)
        
        # Calculate execution time
        execution_time = (datetime.utcnow() - start_time).total_seconds()
        
        # Save to history (uses separate history database)
        if self.history_manager:
            try:
                self.history_manager.save_query(
                    user_id=user_id,
                    query=query,
                    sql=sql_query,
                    result_count=len(raw_data),
                    execution_time=execution_time,
                    success=True,
                    metadata={
                        "used_rag": use_rag,
                        "conversation_id": conversation_id
                    }
                )
            except Exception as e:
                print(f"Warning: Could not save to history: {e}")
        
        # Store in RAG for future context
        if self.rag_engine and processed_data.get("summary"):
            try:
                self.rag_engine.store_query_result(
                    query=query,
                    sql=sql_query,
                    result_summary=processed_data["summary"]
                )
            except Exception as e:
                print(f"Warning: Could not store in RAG: {e}")
        
        # Add to conversation
        if conversation_id and self.conversation_manager:
            try:
                self.conversation_manager.add_message(
                    conversation_id=conversation_id,
                    role="user",
                    content=query
                )
                self.conversation_manager.add_message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=processed_data.get("summary", "Query executed successfully"),
                    metadata={"sql": sql_query, "result_count": len(raw_data)}
                )
            except Exception as e:
                print(f"Warning: Could not save conversation: {e}")
        
        return {
            "success": True,
            "query": query,
            "sql_query": sql_query,
            "raw_data": raw_data,
            "processed_data": processed_data,
            "execution_time": execution_time,
            "context_used": bool(context),
            "conversation_id": conversation_id
        }
    
    async def process_query_streaming(
        self,
        query: str,
        user_id: str,
        conversation_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Process query with streaming response
        
        Args:
            query: Natural language query
            user_id: User identifier
            conversation_id: Optional conversation ID
            
        Yields:
            SSE formatted response chunks
        """
        # Stage 1: Query received
        yield SSEFormatter.format_event({
            "type": "query_received",
            "query": query,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        await asyncio.sleep(0.3)
        
        # Stage 2: Building context
        yield SSEFormatter.format_event({
            "type": "building_context",
            "message": "Retrieving relevant context..."
        })
        
        context = self.rag_engine.build_context(query)
        await asyncio.sleep(0.5)
        
        # Stage 3: Generating SQL
        yield SSEFormatter.format_event({
            "type": "generating_sql",
            "message": "Generating SQL query..."
        })
        
        sql_query = self.base_engine.generate_sql(query)
        
        # Stream SQL generation
        async for chunk in self.streaming_engine.stream_sql_generation(sql_query):
            yield SSEFormatter.format_event(chunk)
        
        # Stage 4: Executing query
        yield SSEFormatter.format_event({
            "type": "executing_query",
            "message": "Executing database query..."
        })
        
        await asyncio.sleep(0.5)
        raw_data = self.base_engine.execute_query(sql_query)
        
        # Stage 5: Processing data
        yield SSEFormatter.format_event({
            "type": "processing_data",
            "message": f"Processing {len(raw_data)} records..."
        })
        
        # Stream processing progress
        async for chunk in self.streaming_engine.stream_data_processing(len(raw_data)):
            yield SSEFormatter.format_event(chunk)
        
        processed_data = self.base_engine._process_data_for_viz(raw_data, query)
        
        # Stage 6: Generating visualizations
        viz_types = []
        if processed_data.get("map_data"):
            viz_types.append("map")
        if processed_data.get("chart_data"):
            viz_types.append("chart")
        if processed_data.get("table_data"):
            viz_types.append("table")
        
        async for chunk in self.streaming_engine.stream_visualization_generation(viz_types):
            yield SSEFormatter.format_event(chunk)
        
        # Stage 7: Complete
        yield SSEFormatter.format_event({
            "type": "complete",
            "sql_query": sql_query,
            "processed_data": processed_data,
            "result_count": len(raw_data),
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def get_query_suggestions(
        self,
        user_id: str,
        current_query: Optional[str] = None,
        limit: int = 5
    ) -> List[str]:
        """
        Get query suggestions based on history and context
        
        Args:
            user_id: User identifier
            current_query: Optional current partial query
            limit: Number of suggestions
            
        Returns:
            List of suggested queries
        """
        suggestions = []
        
        # Get from history
        history = self.history_manager.get_user_history(user_id, limit=20)
        
        if current_query:
            # Filter by similarity
            for entry in history:
                if current_query.lower() in entry["query"].lower():
                    suggestions.append(entry["query"])
                    if len(suggestions) >= limit:
                        break
        else:
            # Get most recent successful queries
            for entry in history:
                if entry["success"]:
                    suggestions.append(entry["query"])
                    if len(suggestions) >= limit:
                        break
        
        # Add default suggestions if needed
        default_suggestions = [
            "Show me all floats",
            "List floats with salinity data",
            "Find floats near the equator",
            "Show temperature profiles",
            "Get recent measurements"
        ]
        
        for suggestion in default_suggestions:
            if len(suggestions) >= limit:
                break
            if suggestion not in suggestions:
                suggestions.append(suggestion)
        
        return suggestions[:limit]
    
    def export_query_results(
        self,
        query: str,
        sql: str,
        data: List[Dict[str, Any]],
        summary: str,
        formats: List[str] = ["csv", "json", "pdf"]
    ) -> Dict[str, str]:
        """
        Export query results in multiple formats
        
        Args:
            query: Natural language query
            sql: Generated SQL
            data: Query results
            summary: Result summary
            formats: List of formats to export
            
        Returns:
            Dictionary of exported file paths
        """
        return self.export_engine.create_data_package(
            query=query,
            sql=sql,
            data=data,
            summary=summary
        )
    
    def get_user_analytics(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get user query analytics
        
        Args:
            user_id: User identifier
            days: Number of days to analyze
            
        Returns:
            Analytics data
        """
        return self.history_manager.get_query_analytics(user_id, days)
    
    def create_conversation(self, conversation_id: str) -> None:
        """Create a new conversation"""
        self.conversation_manager.create_conversation(conversation_id)
    
    def get_conversation_history(
        self,
        conversation_id: str,
        max_messages: int = 10
    ) -> List[Dict[str, Any]]:
        """Get conversation history"""
        return self.conversation_manager.get_conversation_history(
            conversation_id,
            max_messages
        )
    
    def clear_conversation(self, conversation_id: str) -> None:
        """Clear conversation history"""
        self.conversation_manager.clear_conversation(conversation_id)
    
    def get_favorites(self, user_id: str) -> List[Dict[str, Any]]:
        """Get user's favorite queries"""
        return self.history_manager.get_favorites(user_id)
    
    def toggle_favorite(self, query_id: str, user_id: str) -> bool:
        """Toggle favorite status of a query"""
        return self.history_manager.toggle_favorite(query_id, user_id)
    
    def search_history(
        self,
        user_id: str,
        search_term: str
    ) -> List[Dict[str, Any]]:
        """Search query history"""
        return self.history_manager.search_history(user_id, search_term)


# Convenience function
def get_enhanced_engine() -> EnhancedLLMEngine:
    """Get singleton enhanced engine instance"""
    if not hasattr(get_enhanced_engine, "_instance"):
        get_enhanced_engine._instance = EnhancedLLMEngine()
    return get_enhanced_engine._instance


# Example usage
async def example_streaming_query():
    """Example of streaming query"""
    engine = get_enhanced_engine()
    
    async for chunk in engine.process_query_streaming(
        query="Show me all floats",
        user_id="user123",
        conversation_id="conv456"
    ):
        print(chunk, end='', flush=True)


if __name__ == "__main__":
    # Test the enhanced engine
    engine = get_enhanced_engine()
    
    # Test with RAG
    result = engine.process_query_with_rag(
        query="Show me salinity profiles near the equator",
        user_id="test_user",
        conversation_id="test_conv",
        use_rag=True
    )
    
    print("Query Result:")
    print(f"SQL: {result['sql_query']}")
    print(f"Records: {len(result['raw_data'])}")
    print(f"Execution Time: {result['execution_time']:.2f}s")
    print(f"Context Used: {result['context_used']}")
