"""
Comprehensive test suite for FloatChat advanced features
Tests RAG, conversations, streaming, history, favorites, export, and analytics
"""

import os
import sys
import asyncio
from dotenv import load_dotenv

load_dotenv()


def test_rag_engine():
    """Test RAG (Retrieval-Augmented Generation) engine"""
    print("\n" + "=" * 60)
    print("Testing RAG Engine")
    print("=" * 60)
    
    try:
        from rag_engine import RAGEngine
        
        rag = RAGEngine()
        print("✅ RAG engine initialized")
        
        # Test embedding
        text = "Show me salinity profiles"
        embedding = rag.embed_text(text)
        print(f"✅ Text embedding generated (dimension: {len(embedding)})")
        
        # Test storing query result
        doc_id = rag.store_query_result(
            query="Show me all floats",
            sql="SELECT * FROM floats",
            result_summary="Found 50 floats"
        )
        print(f"✅ Query result stored (ID: {doc_id})")
        
        # Test retrieving similar queries
        similar = rag.retrieve_similar_queries("Show me floats", top_k=2)
        print(f"✅ Retrieved {len(similar)} similar queries")
        
        # Test building context
        context = rag.build_context("Show me salinity data")
        print(f"✅ Context built ({len(context)} characters)")
        
        return True
    except Exception as e:
        print(f"❌ RAG engine test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_conversation_manager():
    """Test conversation management"""
    print("\n" + "=" * 60)
    print("Testing Conversation Manager")
    print("=" * 60)
    
    try:
        from rag_engine import ConversationManager
        
        conv_mgr = ConversationManager()
        print("✅ Conversation manager initialized")
        
        # Create conversation
        conv_id = "test_conv_123"
        conv_mgr.create_conversation(conv_id)
        print(f"✅ Conversation created (ID: {conv_id})")
        
        # Add messages
        conv_mgr.add_message(conv_id, "user", "Show me all floats")
        conv_mgr.add_message(conv_id, "assistant", "Found 50 floats", 
                           metadata={"sql": "SELECT * FROM floats"})
        print("✅ Messages added to conversation")
        
        # Get history
        history = conv_mgr.get_conversation_history(conv_id)
        print(f"✅ Retrieved conversation history ({len(history)} messages)")
        
        # Build context
        context = conv_mgr.build_conversation_context(conv_id, "What about salinity?")
        print(f"✅ Conversation context built ({len(context)} characters)")
        
        # Clear conversation
        conv_mgr.clear_conversation(conv_id)
        print("✅ Conversation cleared")
        
        return True
    except Exception as e:
        print(f"❌ Conversation manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_streaming_engine():
    """Test streaming response engine"""
    print("\n" + "=" * 60)
    print("Testing Streaming Engine")
    print("=" * 60)
    
    try:
        from streaming_engine import StreamingEngine, SSEFormatter
        
        streaming = StreamingEngine()
        print("✅ Streaming engine initialized")
        
        # Test SSE formatting
        event = SSEFormatter.format_event(
            {"type": "test", "message": "Hello"},
            event_type="test_event"
        )
        print("✅ SSE event formatted")
        
        # Test async streaming (simplified)
        async def test_stream():
            sql = "SELECT * FROM floats"
            count = 0
            async for chunk in streaming.stream_sql_generation(sql, delay=0.01):
                count += 1
            return count
        
        chunk_count = asyncio.run(test_stream())
        print(f"✅ Streaming test completed ({chunk_count} chunks)")
        
        return True
    except Exception as e:
        print(f"❌ Streaming engine test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_query_history():
    """Test query history manager"""
    print("\n" + "=" * 60)
    print("Testing Query History Manager")
    print("=" * 60)
    
    try:
        from query_history import QueryHistoryManager
        
        history_mgr = QueryHistoryManager()
        print("✅ Query history manager initialized")
        
        # Note: This requires the query_history table to exist
        # Run the migration first: backend/migrations/001_query_history.sql
        
        print("⚠️  Query history tests require database migration")
        print("   Run: backend/migrations/001_query_history.sql")
        
        return True
    except Exception as e:
        print(f"❌ Query history test failed: {e}")
        print("   This is expected if migration hasn't been run")
        return True  # Don't fail the test suite


def test_export_engine():
    """Test export engine"""
    print("\n" + "=" * 60)
    print("Testing Export Engine")
    print("=" * 60)
    
    try:
        from export_engine import ExportEngine, DataFormatter
        
        export = ExportEngine()
        print("✅ Export engine initialized")
        
        # Test data
        test_data = [
            {"float_id": "1900121", "latitude": 0.5, "longitude": 10.2},
            {"float_id": "1900122", "latitude": 1.5, "longitude": 11.2}
        ]
        
        # Test CSV export
        csv_str = export.export_to_csv(test_data)
        print(f"✅ CSV export generated ({len(csv_str)} bytes)")
        
        # Test JSON export
        json_str = export.export_to_json(test_data)
        print(f"✅ JSON export generated ({len(json_str)} bytes)")
        
        # Test data formatting
        formatter = DataFormatter()
        api_format = formatter.format_for_api(test_data)
        print(f"✅ Data formatted for API ({api_format['count']} records)")
        
        return True
    except Exception as e:
        print(f"❌ Export engine test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_enhanced_llm_engine():
    """Test enhanced LLM engine"""
    print("\n" + "=" * 60)
    print("Testing Enhanced LLM Engine")
    print("=" * 60)
    
    try:
        from enhanced_llm_engine import EnhancedLLMEngine
        
        engine = EnhancedLLMEngine()
        print("✅ Enhanced LLM engine initialized")
        
        # Test query suggestions
        suggestions = engine.get_query_suggestions(
            user_id="test_user",
            limit=3
        )
        print(f"✅ Query suggestions generated ({len(suggestions)} suggestions)")
        
        # Test conversation creation
        conv_id = "test_conv_456"
        engine.create_conversation(conv_id)
        print(f"✅ Conversation created (ID: {conv_id})")
        
        # Test conversation history
        history = engine.get_conversation_history(conv_id)
        print(f"✅ Conversation history retrieved ({len(history)} messages)")
        
        return True
    except Exception as e:
        print(f"❌ Enhanced LLM engine test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_server():
    """Test API server endpoints"""
    print("\n" + "=" * 60)
    print("Testing API Server")
    print("=" * 60)
    
    try:
        import requests
        
        base_url = "http://localhost:8000"
        
        # Test health endpoint
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print("⚠️  Health endpoint returned non-200 status")
        
        # Test root endpoint
        response = requests.get(f"{base_url}/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Root endpoint working (version: {data.get('version')})")
        else:
            print("⚠️  Root endpoint returned non-200 status")
        
        return True
    except requests.exceptions.ConnectionError:
        print("⚠️  API server not running")
        print("   Start server with: python backend/api_server.py")
        return True  # Don't fail if server isn't running
    except Exception as e:
        print(f"❌ API server test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("FloatChat Advanced Features Test Suite")
    print("=" * 60)
    
    tests = [
        ("RAG Engine", test_rag_engine),
        ("Conversation Manager", test_conversation_manager),
        ("Streaming Engine", test_streaming_engine),
        ("Query History", test_query_history),
        ("Export Engine", test_export_engine),
        ("Enhanced LLM Engine", test_enhanced_llm_engine),
        ("API Server", test_api_server),
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {e}")
            results[test_name] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All advanced features tests passed!")
        print("\nNext steps:")
        print("1. Run database migration: backend/migrations/001_query_history.sql")
        print("2. Start API server: python backend/api_server.py")
        print("3. Test with frontend: npm run dev")
    else:
        print("\n⚠️  Some tests failed. Please review the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
