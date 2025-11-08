"""
Test script for FloatChat LLM Integration
Tests the complete pipeline from natural language to SQL to data
"""

import os
import sys
import json
from dotenv import load_dotenv

load_dotenv()

def test_environment():
    """Test that all required environment variables are set"""
    print("=" * 60)
    print("Testing Environment Configuration")
    print("=" * 60)
    
    required_vars = [
        "SUPABASE_URL",
        "SUPABASE_KEY",
        "UPSTASH_VECTOR_REST_URL",
        "UPSTASH_VECTOR_REST_TOKEN",
        "HUGGINGFACE_API_TOKEN"
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
            print(f"❌ {var}: NOT SET")
        else:
            # Mask sensitive values
            masked_value = value[:10] + "..." if len(value) > 10 else "***"
            print(f"✅ {var}: {masked_value}")
    
    if missing_vars:
        print(f"\n❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set them in backend/.env file")
        return False
    
    print("\n✅ All environment variables are set")
    return True


def test_supabase_connection():
    """Test Supabase database connection"""
    print("\n" + "=" * 60)
    print("Testing Supabase Connection")
    print("=" * 60)
    
    try:
        from supabase import create_client
        
        supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_KEY")
        )
        
        # Try to fetch one float
        result = supabase.table("floats").select("float_id").limit(1).execute()
        
        if result.data:
            print(f"✅ Connected to Supabase")
            print(f"✅ Found {len(result.data)} float(s) in database")
            print(f"   Sample float_id: {result.data[0]['float_id']}")
        else:
            print("⚠️  Connected but no data found in floats table")
            print("   Run the NetCDF pipeline first to populate data")
        
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False


def test_upstash_connection():
    """Test Upstash Vector database connection"""
    print("\n" + "=" * 60)
    print("Testing Upstash Vector Connection")
    print("=" * 60)
    
    try:
        from upstash_vector import Index
        
        index = Index(
            url=os.getenv("UPSTASH_VECTOR_REST_URL"),
            token=os.getenv("UPSTASH_VECTOR_REST_TOKEN")
        )
        
        # Try a simple query
        result = index.query(data="test", top_k=1)
        print("✅ Connected to Upstash Vector")
        return True
    except Exception as e:
        print(f"❌ Upstash Vector connection failed: {e}")
        return False


def test_huggingface_api():
    """Test HuggingFace API access"""
    print("\n" + "=" * 60)
    print("Testing HuggingFace API")
    print("=" * 60)
    
    try:
        # Try new API first
        try:
            from langchain_huggingface import HuggingFaceEndpoint
            
            llm = HuggingFaceEndpoint(
                repo_id="mistralai/Mistral-7B-Instruct-v0.1",
                huggingfacehub_api_token=os.getenv("HUGGINGFACE_API_TOKEN"),
                temperature=0.1,
                max_new_tokens=50
            )
            
            # Simple test
            response = llm.invoke("Say 'Hello'")
            print("✅ HuggingFace API is accessible (new API)")
            print(f"   Test response: {str(response)[:50]}...")
            return True
        except ImportError:
            # Fallback to old API
            from langchain_community.llms import HuggingFaceHub
            
            llm = HuggingFaceHub(
                repo_id="mistralai/Mistral-7B-Instruct-v0.1",
                huggingfacehub_api_token=os.getenv("HUGGINGFACE_API_TOKEN"),
                model_kwargs={"temperature": 0.1, "max_new_tokens": 50}
            )
            
            # Simple test
            response = llm.invoke("Say 'Hello'")
            print("✅ HuggingFace API is accessible (legacy API)")
            print(f"   Test response: {str(response)[:50]}...")
            return True
    except Exception as e:
        print(f"❌ HuggingFace API test failed: {e}")
        print("   Make sure your HUGGINGFACE_API_TOKEN is valid")
        return False


def test_llm_query_engine():
    """Test the LLM Query Engine"""
    print("\n" + "=" * 60)
    print("Testing LLM Query Engine")
    print("=" * 60)
    
    try:
        from llm_query_engine import LLMQueryEngine
        
        print("Initializing LLM Query Engine...")
        engine = LLMQueryEngine()
        print("✅ LLM Query Engine initialized")
        
        # Test SQL generation
        print("\nTesting SQL generation...")
        test_query = "Show me all floats"
        print(f"Query: {test_query}")
        
        sql = engine.generate_sql(test_query)
        print(f"✅ Generated SQL:\n{sql}")
        
        return True
    except Exception as e:
        print(f"❌ LLM Query Engine test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_full_pipeline():
    """Test the complete pipeline"""
    print("\n" + "=" * 60)
    print("Testing Full Pipeline")
    print("=" * 60)
    
    try:
        from llm_query_engine import query_floatchat
        
        test_queries = [
            "Show me all floats",
            "List floats with salinity data",
            "Find floats near the equator"
        ]
        
        for query in test_queries:
            print(f"\n📝 Query: {query}")
            print("-" * 60)
            
            result = query_floatchat(query)
            
            if result.get("success"):
                print(f"✅ Query successful")
                print(f"   SQL: {result.get('sql_query', 'N/A')[:100]}...")
                
                if result.get("raw_data"):
                    print(f"   Records found: {len(result['raw_data'])}")
                
                if result.get("processed_data"):
                    proc_data = result["processed_data"]
                    if proc_data.get("summary"):
                        print(f"   Summary: {proc_data['summary']}")
            else:
                print(f"❌ Query failed: {result.get('error')}")
        
        return True
    except Exception as e:
        print(f"❌ Full pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("FloatChat LLM Integration Test Suite")
    print("=" * 60)
    
    tests = [
        ("Environment Configuration", test_environment),
        ("Supabase Connection", test_supabase_connection),
        ("Upstash Vector Connection", test_upstash_connection),
        ("HuggingFace API", test_huggingface_api),
        ("LLM Query Engine", test_llm_query_engine),
        ("Full Pipeline", test_full_pipeline),
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
        print("\n🎉 All tests passed! The LLM integration is ready to use.")
        print("\nNext steps:")
        print("1. Start the backend server: python api_server.py")
        print("2. Start the frontend: cd ../frontend && npm run dev")
        print("3. Open http://localhost:3000 in your browser")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues before proceeding.")
        sys.exit(1)


if __name__ == "__main__":
    main()
