"""
Streaming Response Engine for FloatChat
Provides real-time streaming of LLM responses and query results
"""

import asyncio
import json
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime


class StreamingEngine:
    """Engine for streaming responses to frontend"""
    
    @staticmethod
    async def stream_llm_response(
        query: str,
        llm_generator: AsyncGenerator[str, None]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream LLM response token by token
        
        Args:
            query: User query
            llm_generator: Async generator from LLM
            
        Yields:
            Streaming response chunks
        """
        yield {
            "type": "start",
            "timestamp": datetime.utcnow().isoformat(),
            "query": query
        }
        
        accumulated_text = ""
        async for token in llm_generator:
            accumulated_text += token
            yield {
                "type": "token",
                "content": token,
                "accumulated": accumulated_text
            }
        
        yield {
            "type": "complete",
            "content": accumulated_text,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    async def stream_sql_generation(
        sql_query: str,
        delay: float = 0.05
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream SQL query generation character by character
        
        Args:
            sql_query: Generated SQL query
            delay: Delay between characters (seconds)
            
        Yields:
            SQL generation chunks
        """
        yield {
            "type": "sql_start",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        accumulated = ""
        for char in sql_query:
            accumulated += char
            yield {
                "type": "sql_token",
                "content": char,
                "accumulated": accumulated
            }
            await asyncio.sleep(delay)
        
        yield {
            "type": "sql_complete",
            "content": sql_query,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    async def stream_data_processing(
        total_records: int,
        batch_size: int = 10
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream data processing progress
        
        Args:
            total_records: Total number of records to process
            batch_size: Records per batch
            
        Yields:
            Progress updates
        """
        yield {
            "type": "processing_start",
            "total_records": total_records,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        processed = 0
        while processed < total_records:
            batch = min(batch_size, total_records - processed)
            processed += batch
            
            yield {
                "type": "processing_progress",
                "processed": processed,
                "total": total_records,
                "percentage": (processed / total_records) * 100
            }
            
            await asyncio.sleep(0.1)
        
        yield {
            "type": "processing_complete",
            "total_records": total_records,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    async def stream_visualization_generation(
        viz_types: list
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream visualization generation progress
        
        Args:
            viz_types: List of visualization types to generate
            
        Yields:
            Visualization generation updates
        """
        yield {
            "type": "viz_start",
            "visualizations": viz_types,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        for viz_type in viz_types:
            yield {
                "type": "viz_generating",
                "visualization": viz_type,
                "status": "generating"
            }
            
            await asyncio.sleep(0.5)
            
            yield {
                "type": "viz_complete",
                "visualization": viz_type,
                "status": "complete"
            }
        
        yield {
            "type": "viz_all_complete",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    @staticmethod
    async def stream_complete_query(
        query: str,
        sql: str,
        data: Any,
        visualizations: list
    ) -> AsyncGenerator[str, None]:
        """
        Stream complete query processing with all stages
        
        Args:
            query: User query
            sql: Generated SQL
            data: Query results
            visualizations: List of visualizations
            
        Yields:
            SSE formatted strings
        """
        # Stage 1: Query received
        yield f"data: {json.dumps({'type': 'query_received', 'query': query})}\n\n"
        await asyncio.sleep(0.5)
        
        # Stage 2: SQL generation
        yield f"data: {json.dumps({'type': 'sql_generating'})}\n\n"
        await asyncio.sleep(1)
        
        async for chunk in StreamingEngine.stream_sql_generation(sql):
            yield f"data: {json.dumps(chunk)}\n\n"
        
        # Stage 3: Query execution
        yield f"data: {json.dumps({'type': 'query_executing'})}\n\n"
        await asyncio.sleep(0.5)
        
        # Stage 4: Data processing
        if isinstance(data, list):
            async for chunk in StreamingEngine.stream_data_processing(len(data)):
                yield f"data: {json.dumps(chunk)}\n\n"
        
        # Stage 5: Visualization generation
        async for chunk in StreamingEngine.stream_visualization_generation(visualizations):
            yield f"data: {json.dumps(chunk)}\n\n"
        
        # Stage 6: Complete
        yield f"data: {json.dumps({'type': 'complete', 'timestamp': datetime.utcnow().isoformat()})}\n\n"


class ProgressTracker:
    """Track and report progress of long-running operations"""
    
    def __init__(self):
        self.stages = []
        self.current_stage = None
        self.start_time = None
    
    def start(self, total_stages: int):
        """Start progress tracking"""
        self.start_time = datetime.utcnow()
        self.stages = [{"status": "pending"} for _ in range(total_stages)]
    
    def update_stage(self, stage_index: int, status: str, message: str = ""):
        """Update stage status"""
        if 0 <= stage_index < len(self.stages):
            self.stages[stage_index] = {
                "status": status,
                "message": message,
                "timestamp": datetime.utcnow().isoformat()
            }
            self.current_stage = stage_index
    
    def get_progress(self) -> Dict[str, Any]:
        """Get current progress"""
        completed = sum(1 for s in self.stages if s["status"] == "complete")
        return {
            "total_stages": len(self.stages),
            "completed_stages": completed,
            "current_stage": self.current_stage,
            "percentage": (completed / len(self.stages)) * 100 if self.stages else 0,
            "stages": self.stages,
            "elapsed_time": (datetime.utcnow() - self.start_time).total_seconds() if self.start_time else 0
        }


# Server-Sent Events (SSE) utilities
class SSEFormatter:
    """Format data for Server-Sent Events"""
    
    @staticmethod
    def format_event(
        data: Dict[str, Any],
        event_type: Optional[str] = None,
        event_id: Optional[str] = None
    ) -> str:
        """
        Format data as SSE event
        
        Args:
            data: Event data
            event_type: Optional event type
            event_id: Optional event ID
            
        Returns:
            SSE formatted string
        """
        lines = []
        
        if event_id:
            lines.append(f"id: {event_id}")
        
        if event_type:
            lines.append(f"event: {event_type}")
        
        lines.append(f"data: {json.dumps(data)}")
        lines.append("")  # Empty line to end event
        
        return "\n".join(lines) + "\n"
    
    @staticmethod
    def format_comment(comment: str) -> str:
        """Format comment for SSE"""
        return f": {comment}\n\n"
    
    @staticmethod
    def format_retry(milliseconds: int) -> str:
        """Format retry directive"""
        return f"retry: {milliseconds}\n\n"


# Async utilities
async def async_batch_processor(
    items: list,
    batch_size: int,
    processor_func
) -> AsyncGenerator[Any, None]:
    """
    Process items in batches asynchronously
    
    Args:
        items: Items to process
        batch_size: Size of each batch
        processor_func: Async function to process each batch
        
    Yields:
        Processed results
    """
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        result = await processor_func(batch)
        yield result
        await asyncio.sleep(0.01)  # Prevent blocking
