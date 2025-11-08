#!/usr/bin/env python3
"""
Quick test script to verify API fixes
"""

import requests
import json

API_URL = "http://localhost:8000/api/chat"

test_queries = [
    "Show me salinity data",
    "Show temperature profiles",
    "Where are the floats?",
    "Show me floats near the equator",
    "hello"  # Generic query
]

def test_query(query):
    print(f"\n{'='*60}")
    print(f"Testing query: {query}")
    print(f"{'='*60}")
    
    try:
        response = requests.post(
            API_URL,
            json={
                "query": query,
                "user_id": "test_user",
                "use_rag": True
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success!")
            print(f"SQL Query: {data.get('sql_query', 'N/A')[:100]}...")
            
            if 'processed_data' in data:
                proc_data = data['processed_data']
                
                # Check map data
                if 'map_data' in proc_data:
                    markers = proc_data['map_data'].get('markers', [])
                    print(f"🗺️  Map markers: {len(markers)}")
                    if markers:
                        print(f"   First marker: {markers[0]}")
                else:
                    print(f"⚠️  No map_data in response")
                
                # Check chart data
                if 'chart_data' in proc_data:
                    traces = proc_data['chart_data'].get('traces', [])
                    print(f"📊 Chart traces: {len(traces)}")
                
                # Check table data
                if 'table_data' in proc_data:
                    rows = proc_data['table_data'].get('rows', [])
                    print(f"📋 Table rows: {len(rows)}")
                
                # Check summary
                if 'summary' in proc_data:
                    print(f"📝 Summary: {proc_data['summary'][:80]}...")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")
    
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection Error: Is the backend running?")
        print(f"   Start it with: cd backend && python api_server.py")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("\n🧪 Testing FloatChat API")
    print("="*60)
    
    for query in test_queries:
        test_query(query)
    
    print(f"\n{'='*60}")
    print("✅ Testing complete!")
    print("="*60)
