"""
RAG (Retrieval-Augmented Generation) Engine for FloatChat
Uses Upstash Vector for semantic search and context retrieval
"""

import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from upstash_vector import Index
from sentence_transformers import SentenceTransformer
import json

load_dotenv()

class RAGEngine:
    """RAG engine for context-aware query processing"""
    
    def __init__(self):
        """Initialize RAG engine with vector database and embedder"""
        self.vector_index = Index(
            url=os.getenv("UPSTASH_VECTOR_REST_URL"),
            token=os.getenv("UPSTASH_VECTOR_REST_TOKEN")
        )
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        
    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for text"""
        return self.embedder.encode(text).tolist()
    
    def store_query_result(
        self,
        query: str,
        sql: str,
        result_summary: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Store query and result in vector database for future retrieval
        
        Args:
            query: Natural language query
            sql: Generated SQL
            result_summary: Summary of results
            metadata: Additional metadata
            
        Returns:
            Document ID
        """
        # Create document text
        doc_text = f"""
        Query: {query}
        SQL: {sql}
        Result: {result_summary}
        """
        
        # Generate embedding
        embedding = self.embed_text(doc_text)
        
        # Prepare metadata
        meta = metadata or {}
        meta.update({
            "query": query,
            "sql": sql,
            "result_summary": result_summary,
            "type": "query_result"
        })
        
        # Generate unique ID
        doc_id = f"query_{hash(query)}_{hash(sql)}"
        
        # Store in vector database
        self.vector_index.upsert(
            vectors=[{
                "id": doc_id,
                "vector": embedding,
                "metadata": meta
            }]
        )
        
        return doc_id
    
    def retrieve_similar_queries(
        self,
        query: str,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Retrieve similar past queries for context
        
        Args:
            query: Current query
            top_k: Number of similar queries to retrieve
            
        Returns:
            List of similar query results
        """
        # Generate embedding for current query
        query_embedding = self.embed_text(query)
        
        # Search vector database
        results = self.vector_index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        
        similar_queries = []
        for result in results:
            if result.get("metadata"):
                similar_queries.append({
                    "query": result["metadata"].get("query"),
                    "sql": result["metadata"].get("sql"),
                    "result_summary": result["metadata"].get("result_summary"),
                    "score": result.get("score", 0)
                })
        
        return similar_queries
    
    def retrieve_float_metadata(
        self,
        query: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant float metadata based on query
        
        Args:
            query: Natural language query
            top_k: Number of metadata entries to retrieve
            
        Returns:
            List of relevant float metadata
        """
        query_embedding = self.embed_text(query)
        
        results = self.vector_index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter="type = 'float_metadata'"
        )
        
        metadata_list = []
        for result in results:
            if result.get("metadata"):
                metadata_list.append({
                    "float_id": result["metadata"].get("float_id"),
                    "metadata": result["metadata"],
                    "score": result.get("score", 0)
                })
        
        return metadata_list
    
    def build_context(
        self,
        query: str,
        include_similar_queries: bool = True,
        include_metadata: bool = True
    ) -> str:
        """
        Build context for LLM from retrieved information
        
        Args:
            query: Current query
            include_similar_queries: Include similar past queries
            include_metadata: Include relevant float metadata
            
        Returns:
            Context string for LLM
        """
        context_parts = []
        
        if include_similar_queries:
            similar = self.retrieve_similar_queries(query, top_k=2)
            if similar:
                context_parts.append("Similar past queries:")
                for i, sq in enumerate(similar, 1):
                    context_parts.append(
                        f"{i}. Query: {sq['query']}\n"
                        f"   SQL: {sq['sql']}\n"
                        f"   Result: {sq['result_summary']}"
                    )
        
        if include_metadata:
            metadata = self.retrieve_float_metadata(query, top_k=3)
            if metadata:
                context_parts.append("\nRelevant float information:")
                for i, meta in enumerate(metadata, 1):
                    context_parts.append(
                        f"{i}. Float {meta['float_id']}: "
                        f"{json.dumps(meta['metadata'], indent=2)}"
                    )
        
        return "\n\n".join(context_parts) if context_parts else ""
    
    def store_float_metadata(
        self,
        float_id: str,
        metadata: Dict[str, Any]
    ) -> str:
        """
        Store float metadata in vector database
        
        Args:
            float_id: Float identifier
            metadata: Float metadata
            
        Returns:
            Document ID
        """
        # Create searchable text from metadata
        meta_text = f"Float {float_id}: " + " ".join(
            f"{k}: {v}" for k, v in metadata.items() if v
        )
        
        # Generate embedding
        embedding = self.embed_text(meta_text)
        
        # Store in vector database
        doc_id = f"float_meta_{float_id}"
        self.vector_index.upsert(
            vectors=[{
                "id": doc_id,
                "vector": embedding,
                "metadata": {
                    "float_id": float_id,
                    "type": "float_metadata",
                    **metadata
                }
            }]
        )
        
        return doc_id


class ConversationManager:
    """Manage multi-turn conversations with context"""
    
    def __init__(self):
        """Initialize conversation manager"""
        self.conversations: Dict[str, List[Dict[str, Any]]] = {}
        self.rag_engine = RAGEngine()
    
    def create_conversation(self, conversation_id: str) -> None:
        """Create a new conversation"""
        self.conversations[conversation_id] = []
    
    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Add message to conversation
        
        Args:
            conversation_id: Conversation identifier
            role: Message role (user/assistant)
            content: Message content
            metadata: Additional metadata (SQL, results, etc.)
        """
        if conversation_id not in self.conversations:
            self.create_conversation(conversation_id)
        
        message = {
            "role": role,
            "content": content,
            "metadata": metadata or {},
            "timestamp": None  # Add timestamp if needed
        }
        
        self.conversations[conversation_id].append(message)
    
    def get_conversation_history(
        self,
        conversation_id: str,
        max_messages: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get conversation history
        
        Args:
            conversation_id: Conversation identifier
            max_messages: Maximum number of messages to return
            
        Returns:
            List of messages
        """
        if conversation_id not in self.conversations:
            return []
        
        return self.conversations[conversation_id][-max_messages:]
    
    def build_conversation_context(
        self,
        conversation_id: str,
        current_query: str
    ) -> str:
        """
        Build context from conversation history
        
        Args:
            conversation_id: Conversation identifier
            current_query: Current user query
            
        Returns:
            Context string for LLM
        """
        history = self.get_conversation_history(conversation_id, max_messages=5)
        
        if not history:
            return ""
        
        context_parts = ["Previous conversation:"]
        for msg in history:
            role = "User" if msg["role"] == "user" else "Assistant"
            context_parts.append(f"{role}: {msg['content']}")
            
            # Include SQL if available
            if msg["metadata"].get("sql"):
                context_parts.append(f"  SQL: {msg['metadata']['sql']}")
        
        return "\n".join(context_parts)
    
    def clear_conversation(self, conversation_id: str) -> None:
        """Clear conversation history"""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]


# Convenience functions
def get_rag_engine() -> RAGEngine:
    """Get singleton RAG engine instance"""
    if not hasattr(get_rag_engine, "_instance"):
        get_rag_engine._instance = RAGEngine()
    return get_rag_engine._instance


def get_conversation_manager() -> ConversationManager:
    """Get singleton conversation manager instance"""
    if not hasattr(get_conversation_manager, "_instance"):
        get_conversation_manager._instance = ConversationManager()
    return get_conversation_manager._instance
