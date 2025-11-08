#!/usr/bin/env python3
"""
Test location and date parsing
"""

from llm_query_engine import LLMQueryEngine

def test_parsing():
    engine = LLMQueryEngine()
    
    test_queries = [
        "Show me salinity profiles near the equator in March 2023",
        "Find floats in the Indian Ocean",
        "Show temperature data in the Arabian Sea",
        "Get data near 15°N, 70°E",
        "Show floats in India in 2022",
        "Temperature profiles in Bay of Bengal in June 2023",
        "Salinity near Africa",
    ]
    
    print("\n" + "="*60)
    print("Testing Location and Date Parsing")
    print("="*60)
    
    for query in test_queries:
        print(f"\n📝 Query: {query}")
        print("-" * 60)
        
        # Parse location
        location = engine._parse_location_from_query(query)
        if location:
            print(f"📍 Location: {location['description']}")
            print(f"   Lat range: {location['lat_range']}")
            print(f"   Lon range: {location['lon_range']}")
        else:
            print("📍 No location detected")
        
        # Parse date
        date = engine._parse_date_from_query(query)
        if date:
            print(f"📅 Date: {date}")
            if 'year' in date and 'month' in date:
                julian_start = engine._date_to_julian(date['year'], date['month'], 1)
                print(f"   Julian date: {julian_start}")
        else:
            print("📅 No date detected")
        
        # Generate SQL
        print("\n🔧 Generating SQL...")
        sql = engine._generate_intelligent_sql(query, location, date)
        print(f"SQL Preview:\n{sql[:200]}...")
    
    print("\n" + "="*60)
    print("✅ Testing complete!")
    print("="*60)

if __name__ == "__main__":
    test_parsing()
