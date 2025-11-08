"""
LLM Query Engine for FloatChat
Converts natural language queries to SQL using Mistral 7B
Fetches data from Supabase and prepares visualization data
"""

import os
import json
import re
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client
from upstash_vector import Index
import numpy as np
import pandas as pd

# LangChain imports
try:
    from langchain_huggingface import HuggingFaceEndpoint
except ImportError:
    from langchain_community.llms import HuggingFaceHub as HuggingFaceEndpoint

try:
    from langchain_core.prompts import PromptTemplate
    from langchain_core.output_parsers import BaseOutputParser
except ImportError:
    from langchain.prompts import PromptTemplate
    from langchain.schema import BaseOutputParser

try:
    from langchain.chains import LLMChain
except ImportError:
    # For newer versions, chains might be in a different location
    from langchain_core.runnables import RunnableSequence as LLMChain

load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Initialize Upstash Vector
UPSTASH_VECTOR_REST_URL = os.getenv("UPSTASH_VECTOR_REST_URL")
UPSTASH_VECTOR_REST_TOKEN = os.getenv("UPSTASH_VECTOR_REST_TOKEN")
vector_index = Index(url=UPSTASH_VECTOR_REST_URL, token=UPSTASH_VECTOR_REST_TOKEN)

# Geographic knowledge base for location queries
GEOGRAPHIC_LOCATIONS = {
    "equator": {"lat_range": (-5, 5), "lon_range": (-180, 180), "description": "Near equator (±5°)"},
    "india": {"lat_range": (8, 35), "lon_range": (68, 97), "description": "Indian region"},
    "indian ocean": {"lat_range": (-40, 25), "lon_range": (40, 120), "description": "Indian Ocean"},
    "arabian sea": {"lat_range": (10, 25), "lon_range": (60, 75), "description": "Arabian Sea"},
    "bay of bengal": {"lat_range": (5, 22), "lon_range": (80, 95), "description": "Bay of Bengal"},
    "africa": {"lat_range": (-35, 37), "lon_range": (-18, 52), "description": "African coast"},
    "atlantic": {"lat_range": (-60, 70), "lon_range": (-80, 20), "description": "Atlantic Ocean"},
    "pacific": {"lat_range": (-60, 60), "lon_range": (120, -70), "description": "Pacific Ocean"},
    "southern ocean": {"lat_range": (-90, -60), "lon_range": (-180, 180), "description": "Southern Ocean"},
    "arctic": {"lat_range": (66, 90), "lon_range": (-180, 180), "description": "Arctic region"},
    "mediterranean": {"lat_range": (30, 46), "lon_range": (-6, 37), "description": "Mediterranean Sea"},
    "north atlantic": {"lat_range": (0, 70), "lon_range": (-80, 20), "description": "North Atlantic"},
    "south atlantic": {"lat_range": (-60, 0), "lon_range": (-70, 20), "description": "South Atlantic"},
}

# Month name to number mapping
MONTH_NAMES = {
    "january": 1, "jan": 1,
    "february": 2, "feb": 2,
    "march": 3, "mar": 3,
    "april": 4, "apr": 4,
    "may": 5,
    "june": 6, "jun": 6,
    "july": 7, "jul": 7,
    "august": 8, "aug": 8,
    "september": 9, "sep": 9, "sept": 9,
    "october": 10, "oct": 10,
    "november": 11, "nov": 11,
    "december": 12, "dec": 12,
}

# Database schema for context
DATABASE_SCHEMA = """
Database Schema:

1. floats
   - float_id (TEXT, PRIMARY KEY)
   - meta (JSONB) - contains metadata like deployment date, project info
   - created_at (TIMESTAMP)

2. float_profiles
   - float_id (TEXT, FOREIGN KEY)
   - cycle_number (TEXT)
   - data_mode (TEXT)
   - date_creation (TEXT)
   - date_update (TEXT)
   - platform_number (TEXT)
   - project_name (TEXT)
   - pi_name (TEXT)
   - direction (TEXT)
   - PRIMARY KEY (float_id, cycle_number)

3. float_measurements
   - measurement_id (TEXT, PRIMARY KEY)
   - float_id (TEXT, FOREIGN KEY)
   - cycle_number (TEXT)
   - pres_adjusted (DOUBLE PRECISION) - pressure in decibars
   - temp_adjusted (DOUBLE PRECISION) - temperature in Celsius
   - psal_adjusted (DOUBLE PRECISION) - practical salinity

4. float_locations
   - measurement_id (TEXT, PRIMARY KEY)
   - float_id (TEXT, FOREIGN KEY)
   - cycle_number (TEXT)
   - juld (DOUBLE PRECISION) - Julian date (days since 1950-01-01)
   - latitude (DOUBLE PRECISION)
   - longitude (DOUBLE PRECISION)

Notes:
- Use psal_adjusted for salinity queries
- Use temp_adjusted for temperature queries
- Use pres_adjusted for pressure/depth queries (1 dbar ≈ 1 meter)
- Join tables using float_id and cycle_number
- Dates are stored as Julian dates in juld column (days since 1950-01-01 00:00:00 UTC)
- To convert Julian date to year/month: extract(year from to_timestamp((juld - 2433282.5) * 86400))
"""


class SQLOutputParser(BaseOutputParser):
    """Parse SQL query from LLM output"""
    
    def parse(self, text: str) -> str:
        # Extract SQL from markdown code blocks or plain text
        sql_pattern = r"```sql\n(.*?)\n```"
        match = re.search(sql_pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        
        # Try to find SELECT statement
        select_pattern = r"(SELECT.*?;)"
        match = re.search(select_pattern, text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        
        return text.strip()


class LLMQueryEngine:
    """Main query engine for natural language to SQL conversion"""
    
    def __init__(self, model_name: str = "mistralai/Mistral-7B-Instruct-v0.1"):
        """Initialize the LLM query engine"""
        self.huggingface_token = os.getenv("HUGGINGFACE_API_TOKEN")
        if not self.huggingface_token:
            raise ValueError("HUGGINGFACE_API_TOKEN not found in environment")
        
        # Initialize LLM and prompt template
        self._init_llm(model_name)
    
    def _parse_location_from_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Extract geographic location from query"""
        query_lower = query.lower()
        
        for location_name, coords in GEOGRAPHIC_LOCATIONS.items():
            if location_name in query_lower:
                print(f"📍 Detected location: {location_name} -> {coords['description']}")
                return coords
        
        # Check for explicit coordinates like "15°N, 70°E" or "15N 70E"
        coord_pattern = r'(\d+(?:\.\d+)?)\s*[°]?\s*([NS])\s*,?\s*(\d+(?:\.\d+)?)\s*[°]?\s*([EW])'
        match = re.search(coord_pattern, query, re.IGNORECASE)
        if match:
            lat = float(match.group(1))
            if match.group(2).upper() == 'S':
                lat = -lat
            lon = float(match.group(3))
            if match.group(4).upper() == 'W':
                lon = -lon
            
            # Create a range around the point (±5 degrees)
            print(f"📍 Detected coordinates: {lat}°, {lon}°")
            return {
                "lat_range": (lat - 5, lat + 5),
                "lon_range": (lon - 5, lon + 5),
                "description": f"Near {lat}°, {lon}°"
            }
        
        return None
    
    def _parse_date_from_query(self, query: str) -> Optional[Dict[str, Any]]:
        """Extract date/time period from query"""
        query_lower = query.lower()
        
        # Extract year
        year_match = re.search(r'\b(20\d{2})\b', query)
        year = int(year_match.group(1)) if year_match else None
        
        # Extract month
        month = None
        for month_name, month_num in MONTH_NAMES.items():
            if month_name in query_lower:
                month = month_num
                break
        
        if year or month:
            result = {}
            if year:
                result['year'] = year
                print(f"📅 Detected year: {year}")
            if month:
                result['month'] = month
                print(f"📅 Detected month: {month}")
            return result
        
        return None
    
    def _date_to_julian(self, year: int, month: int = 1, day: int = 1) -> float:
        """Convert date to astronomical Julian date"""
        from datetime import datetime
        # Astronomical Julian Date: JD 2440588 = 1970-01-01 00:00:00 UTC
        unix_epoch_jd = 2440588.0
        target_date = datetime(year, month, day)
        unix_epoch = datetime(1970, 1, 1)
        days_from_epoch = (target_date - unix_epoch).days
        return unix_epoch_jd + days_from_epoch
    
    def _generate_intelligent_sql(self, query: str, location_info: Optional[Dict] = None, date_info: Optional[Dict] = None) -> str:
        """Generate SQL with location and date awareness"""
        query_lower = query.lower()
        
        # Build WHERE clauses
        where_clauses = []
        where_clauses.append("fl.latitude IS NOT NULL")
        where_clauses.append("fl.longitude IS NOT NULL")
        
        # Add location filter
        if location_info:
            lat_min, lat_max = location_info['lat_range']
            lon_min, lon_max = location_info['lon_range']
            where_clauses.append(f"fl.latitude BETWEEN {lat_min} AND {lat_max}")
            where_clauses.append(f"fl.longitude BETWEEN {lon_min} AND {lon_max}")
            print(f"🌍 Adding location filter: lat [{lat_min}, {lat_max}], lon [{lon_min}, {lon_max}]")
        
        # Add date filter
        if date_info:
            if 'year' in date_info and 'month' in date_info:
                # Specific month and year
                year = date_info['year']
                month = date_info['month']
                start_julian = self._date_to_julian(year, month, 1)
                # Last day of month
                if month == 12:
                    end_julian = self._date_to_julian(year + 1, 1, 1)
                else:
                    end_julian = self._date_to_julian(year, month + 1, 1)
                where_clauses.append(f"fl.juld BETWEEN {start_julian} AND {end_julian}")
                print(f"📅 Adding date filter: {year}-{month:02d} (Julian: {start_julian} to {end_julian})")
            elif 'year' in date_info:
                # Entire year
                year = date_info['year']
                start_julian = self._date_to_julian(year, 1, 1)
                end_julian = self._date_to_julian(year + 1, 1, 1)
                where_clauses.append(f"fl.juld BETWEEN {start_julian} AND {end_julian}")
                print(f"📅 Adding date filter: {year} (Julian: {start_julian} to {end_julian})")
        
        # Determine query type and build SQL (NO LIMIT - get all data)
        if "salinity" in query_lower or "psal" in query_lower:
            where_clauses.append("fm.psal_adjusted IS NOT NULL")
            sql = f"""SELECT fm.float_id, fm.cycle_number, fm.pres_adjusted, fm.psal_adjusted, 
                    fl.latitude, fl.longitude, fl.juld
                    FROM float_measurements fm 
                    JOIN float_locations fl ON fm.float_id = fl.float_id AND fm.cycle_number = fl.cycle_number
                    WHERE {' AND '.join(where_clauses)}
                    ORDER BY fm.float_id, fm.cycle_number, fm.pres_adjusted;"""
        
        elif "temperature" in query_lower or "temp" in query_lower:
            where_clauses.append("fm.temp_adjusted IS NOT NULL")
            sql = f"""SELECT fm.float_id, fm.cycle_number, fm.pres_adjusted, fm.temp_adjusted,
                    fl.latitude, fl.longitude, fl.juld
                    FROM float_measurements fm 
                    JOIN float_locations fl ON fm.float_id = fl.float_id AND fm.cycle_number = fl.cycle_number
                    WHERE {' AND '.join(where_clauses)}
                    ORDER BY fm.float_id, fm.cycle_number, fm.pres_adjusted;"""
        
        elif "profile" in query_lower or "depth" in query_lower:
            where_clauses.append("fm.pres_adjusted IS NOT NULL")
            sql = f"""SELECT fm.float_id, fm.cycle_number, fm.pres_adjusted, 
                    fm.temp_adjusted, fm.psal_adjusted,
                    fl.latitude, fl.longitude, fl.juld
                    FROM float_measurements fm 
                    JOIN float_locations fl ON fm.float_id = fl.float_id AND fm.cycle_number = fl.cycle_number
                    WHERE {' AND '.join(where_clauses)}
                    ORDER BY fm.float_id, fm.cycle_number, fm.pres_adjusted;"""
        
        else:
            # Default: get measurements with locations (NO LIMIT)
            sql = f"""SELECT fm.float_id, fm.cycle_number, fm.pres_adjusted, 
                    fm.temp_adjusted, fm.psal_adjusted,
                    fl.latitude, fl.longitude, fl.juld
                    FROM float_measurements fm 
                    JOIN float_locations fl ON fm.float_id = fl.float_id AND fm.cycle_number = fl.cycle_number
                    WHERE {' AND '.join(where_clauses)}
                    ORDER BY fm.float_id, fm.cycle_number;"""
        
        print(f"✅ Generated intelligent SQL with filters")
        return sql
    
    def _init_llm(self, model_name: str):
        """Initialize LLM and prompt template"""
        # Initialize LLM - use HuggingFace Inference API directly
        try:
            from huggingface_hub import InferenceClient
            self.hf_client = InferenceClient(token=self.huggingface_token)
            self.model_name = model_name
            
            # Store reference to self for use in wrapper
            engine_self = self
            
            # Create a simple wrapper for LangChain compatibility
            class HFWrapper:
                def __init__(self, client, model, engine):
                    self.client = client
                    self.model = model
                    self.engine = engine
                
                def invoke(self, prompt):
                    try:
                        response = self.client.text_generation(
                            prompt,
                            model=self.model,
                            max_new_tokens=512,
                            temperature=0.1,
                            return_full_text=False
                        )
                        return response
                    except Exception as e:
                        print(f"⚠️ HF API Error: {e}")
                        print("🔄 Using intelligent fallback based on query...")
                        
                        # This is a placeholder - we'll call the actual method
                        return "FALLBACK_NEEDED"
            
            self.llm = HFWrapper(self.hf_client, model_name, self)
            print(f"✅ Using HuggingFace Inference API with {model_name}")
            
        except Exception as e:
            print(f"Error initializing HuggingFace: {e}")
            raise
        
        # Create prompt template
        self.prompt_template = PromptTemplate(
            input_variables=["schema", "query"],
            template="""You are an expert SQL query generator for oceanographic data.

{schema}

User Query: {query}

Generate a PostgreSQL query to answer this question. Follow these rules:
1. Use ONLY the tables and columns from the schema above
2. For salinity, use psal_adjusted column
3. For temperature, use temp_adjusted column
4. For depth/pressure, use pres_adjusted column (1 dbar ≈ 1 meter)
5. For location queries, use latitude and longitude from float_locations table
6. Join tables using float_id and cycle_number when needed
7. Return ONLY the SQL query, no explanations
8. End the query with a semicolon

SQL Query:"""
        )
        
        # Simple chain - just use the LLM directly
        self.chain = self.llm
    
    def generate_sql(self, natural_query: str) -> str:
        """Convert natural language query to SQL"""
        try:
            print(f"🔍 Processing query: {natural_query}")
            
            # Parse location and date from query
            location_info = self._parse_location_from_query(natural_query)
            date_info = self._parse_date_from_query(natural_query)
            
            # Build the full prompt
            full_prompt = self.prompt_template.format(
                schema=DATABASE_SCHEMA,
                query=natural_query
            )
            
            # Call the LLM
            print("📡 Calling LLM...")
            sql_query = self.chain.invoke(full_prompt)
            print(f"🤖 LLM Response: {sql_query}")
            
            # If LLM failed, use intelligent fallback
            if sql_query == "FALLBACK_NEEDED" or not sql_query or len(sql_query) < 20:
                print("🔄 Generating intelligent fallback SQL...")
                sql_query = self._generate_intelligent_sql(natural_query, location_info, date_info)
            
            # Clean up the response
            if isinstance(sql_query, str):
                sql_query = sql_query.strip()
                # Extract SQL if wrapped in markdown
                if "```sql" in sql_query:
                    sql_query = sql_query.split("```sql")[1].split("```")[0].strip()
                elif "```" in sql_query:
                    sql_query = sql_query.split("```")[1].split("```")[0].strip()
            
            print(f"Generated SQL: {sql_query}")
            return sql_query
        except Exception as e:
            print(f"❌ Error generating SQL: {e}")
            import traceback
            traceback.print_exc()
            
            # Use intelligent fallback even on error
            print("🔄 Using intelligent fallback due to error...")
            location_info = self._parse_location_from_query(natural_query)
            date_info = self._parse_date_from_query(natural_query)
            return self._generate_intelligent_sql(natural_query, location_info, date_info)
    
    def execute_query(self, sql_query: str) -> List[Dict[str, Any]]:
        """Execute SQL query on Supabase"""
        try:
            # Parse and execute using Supabase client
            return self._execute_with_client(sql_query)
        except Exception as e:
            print(f"Error executing query: {e}")
            return []
    
    def _execute_with_client(self, sql_query: str) -> List[Dict[str, Any]]:
        """Execute query using Supabase - handles JOINs by querying separately and merging"""
        try:
            print(f"🔄 Executing SQL query...")
            print(f"SQL: {sql_query[:200]}...")
            
            # Check if this is a JOIN query
            if 'JOIN' in sql_query.upper():
                print("🔗 Detected JOIN query - using smart execution...")
                return self._execute_join_query(sql_query)
            
            # Simple query without JOIN
            from_match = re.search(r'FROM\s+(\w+)', sql_query, re.IGNORECASE)
            if not from_match:
                print("❌ Could not extract table name")
                return []
            
            table_name = from_match.group(1)
            print(f"📊 Querying table: {table_name}")
            
            # Build query using Supabase client
            query = supabase.table(table_name).select("*")
            
            # Extract LIMIT
            limit_match = re.search(r'LIMIT\s+(\d+)', sql_query, re.IGNORECASE)
            limit = int(limit_match.group(1)) if limit_match else 100
            query = query.limit(limit)
            
            # Execute query
            result = query.execute()
            
            if hasattr(result, 'data') and result.data:
                print(f"✅ Query returned {len(result.data)} rows")
                return result.data
            else:
                print("⚠️ Query returned no data")
                return []
                
        except Exception as e:
            print(f"❌ Error in query execution: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def _execute_join_query(self, sql_query: str) -> List[Dict[str, Any]]:
        """Execute JOIN query by fetching data separately and merging in Python"""
        try:
            # Parse the query to extract filters
            # Extract date range from Julian date filter
            juld_match = re.search(r'fl\.juld\s+BETWEEN\s+(\d+)\s+AND\s+(\d+)', sql_query, re.IGNORECASE)
            juld_min = int(juld_match.group(1)) if juld_match else None
            juld_max = int(juld_match.group(2)) if juld_match else None
            
            # Extract lat/lon ranges
            lat_match = re.search(r'fl\.latitude\s+BETWEEN\s+([-\d.]+)\s+AND\s+([-\d.]+)', sql_query, re.IGNORECASE)
            lat_min = float(lat_match.group(1)) if lat_match else -90
            lat_max = float(lat_match.group(2)) if lat_match else 90
            
            lon_match = re.search(r'fl\.longitude\s+BETWEEN\s+([-\d.]+)\s+AND\s+([-\d.]+)', sql_query, re.IGNORECASE)
            lon_min = float(lon_match.group(1)) if lon_match else -180
            lon_max = float(lon_match.group(2)) if lon_match else 180
            
            # No limit - get all data that matches filters
            
            print(f"🔍 Filters: lat [{lat_min}, {lat_max}], lon [{lon_min}, {lon_max}]")
            if juld_min and juld_max:
                print(f"📅 Date filter: Julian [{juld_min}, {juld_max}]")
            
            # Check what parameter we need
            need_salinity = 'psal_adjusted' in sql_query.lower()
            need_temperature = 'temp_adjusted' in sql_query.lower()
            
            # Step 1: Query float_locations with filters FIRST (this is the key!)
            print("📍 Step 1: Querying float_locations with geographic/date filters...")
            loc_query = supabase.table('float_locations').select('float_id, cycle_number, latitude, longitude, juld')
            loc_query = loc_query.gte('latitude', lat_min).lte('latitude', lat_max)
            loc_query = loc_query.gte('longitude', lon_min).lte('longitude', lon_max)
            loc_query = loc_query.not_.is_('latitude', 'null').not_.is_('longitude', 'null')
            
            if juld_min and juld_max:
                loc_query = loc_query.gte('juld', juld_min).lte('juld', juld_max)
            
            # No limit - get all locations that match filters
            loc_result = loc_query.execute()
            
            if not loc_result.data:
                print("⚠️ No locations found matching filters")
                return []
            
            print(f"✅ Found {len(loc_result.data)} locations matching filters")
            
            # Step 2: Create lookup dict by (float_id, cycle_number)
            loc_dict = {}
            float_cycles = set()
            for loc in loc_result.data:
                float_id = loc.get('float_id')
                cycle_number = loc.get('cycle_number')
                if float_id and cycle_number:
                    key = (float_id, cycle_number)
                    loc_dict[key] = {
                        'latitude': loc.get('latitude'),
                        'longitude': loc.get('longitude'),
                        'juld': loc.get('juld')
                    }
                    float_cycles.add(key)
            
            print(f"🔢 Found {len(float_cycles)} unique float/cycle combinations")
            
            # Step 3: Query float_measurements for these specific float/cycle combinations
            print("📊 Step 2: Querying float_measurements for matching float/cycles...")
            
            measurements = []
            # Get unique float_ids
            unique_floats = set(fc[0] for fc in float_cycles)
            print(f"🎯 Querying {len(unique_floats)} unique floats...")
            
            for float_id in unique_floats:
                # Get all cycles for this float that we have locations for
                relevant_cycles = [fc[1] for fc in float_cycles if fc[0] == float_id]
                
                # Query all measurements for this float
                meas_query = supabase.table('float_measurements').select('*')
                meas_query = meas_query.eq('float_id', float_id)
                
                if need_salinity:
                    meas_query = meas_query.not_.is_('psal_adjusted', 'null')
                if need_temperature:
                    meas_query = meas_query.not_.is_('temp_adjusted', 'null')
                
                # No limit - get all measurements for this float
                meas_result = meas_query.execute()
                
                if meas_result.data:
                    # Filter to only include cycles we have locations for
                    for meas in meas_result.data:
                        cycle_num = meas.get('cycle_number')
                        if cycle_num in relevant_cycles:
                            measurements.append(meas)
            
            print(f"✅ Found {len(measurements)} measurements for matching float/cycles")
            
            # Step 4: Merge measurements with locations
            print("🔗 Step 3: Merging measurements with location data...")
            merged_data = []
            
            for meas in measurements:
                float_id = meas.get('float_id')
                cycle_number = meas.get('cycle_number')
                key = (float_id, cycle_number)
                
                if key in loc_dict:
                    # Add location data to measurement
                    merged = {**meas}
                    merged['latitude'] = loc_dict[key]['latitude']
                    merged['longitude'] = loc_dict[key]['longitude']
                    merged['juld'] = loc_dict[key]['juld']
                    merged_data.append(merged)
            
            print(f"✅ Merged {len(merged_data)} records with location data")
            
            # Don't limit results - we want all data for multiple floats
            # Commenting out to get all floats and their profiles
            # if len(merged_data) > limit:
            #     merged_data = merged_data[:limit]
            #     print(f"📊 Limited to {limit} records")
            
            print(f"📊 Returning {len(merged_data)} total records")
            return merged_data
            
        except Exception as e:
            print(f"❌ Error in JOIN query execution: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def process_query(self, natural_query: str) -> Dict[str, Any]:
        """
        Main method to process natural language query
        Returns structured data for visualization
        """
        try:
            # Generate SQL
            sql_query = self.generate_sql(natural_query)
            
            # Execute query
            raw_data = self.execute_query(sql_query)
            
            # Process data for visualizations
            processed_data = self._process_data_for_viz(raw_data, natural_query)
            
            return {
                "success": True,
                "sql_query": sql_query,
                "raw_data": raw_data,
                "processed_data": processed_data,
                "query": natural_query
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "query": natural_query
            }
    
    def _process_data_for_viz(self, data: List[Dict], query: str) -> Dict[str, Any]:
        """Process raw data into visualization-ready format"""
        if not data:
            return {
                "summary": "No data found for your query.",
                "explanation": "Try a different query or check if the data exists in the database."
            }
        
        df = pd.DataFrame(data)
        
        viz_data = {
            "map_data": self._prepare_map_data(df),
            "chart_data": self._prepare_chart_data(df),
            "table_data": self._prepare_table_data(df),
            "summary": self._generate_summary(df, query),
            "explanation": self._generate_explanation(df, query)
        }
        
        return viz_data
    
    def _prepare_map_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Prepare data for map visualization with deduplication"""
        print(f"📍 Preparing map data from {len(df)} rows...")
        print(f"Columns available: {df.columns.tolist()}")
        
        if 'latitude' not in df.columns or 'longitude' not in df.columns:
            print("⚠️ No latitude/longitude columns found")
            return {"markers": []}
        
        # Group by float_id and get average location (or first valid location)
        markers = []
        
        if 'float_id' in df.columns:
            for float_id in df['float_id'].unique():
                float_df = df[df['float_id'] == float_id]
                
                # Get first valid location
                valid_locs = float_df[float_df['latitude'].notna() & float_df['longitude'].notna()]
                if len(valid_locs) == 0:
                    continue
                
                first_loc = valid_locs.iloc[0]
                lat = first_loc['latitude']
                lon = first_loc['longitude']
                
                # Build popup with aggregated data
                popup_parts = [f"Float: {float_id}"]
                
                if 'cycle_number' in float_df.columns:
                    cycles = float_df['cycle_number'].nunique()
                    popup_parts.append(f"Cycles: {cycles}")
                
                if 'psal_adjusted' in float_df.columns:
                    sal_data = float_df['psal_adjusted'].dropna()
                    if len(sal_data) > 0:
                        popup_parts.append(f"Salinity: {sal_data.mean():.2f} PSU (avg)")
                
                if 'temp_adjusted' in float_df.columns:
                    temp_data = float_df['temp_adjusted'].dropna()
                    if len(temp_data) > 0:
                        popup_parts.append(f"Temp: {temp_data.mean():.2f} °C (avg)")
                
                markers.append({
                    "lat": float(lat),
                    "lon": float(lon),
                    "label": str(float_id),
                    "popup": "<br>".join(popup_parts),
                    "id": str(float_id)
                })
        else:
            # No float_id, just show unique locations
            unique_locs = df[['latitude', 'longitude']].drop_duplicates()
            for idx, row in unique_locs.iterrows():
                if pd.notna(row['latitude']) and pd.notna(row['longitude']):
                    markers.append({
                        "lat": float(row['latitude']),
                        "lon": float(row['longitude']),
                        "label": f"Location {idx}",
                        "popup": f"Lat: {row['latitude']:.2f}, Lon: {row['longitude']:.2f}",
                        "id": str(idx)
                    })
        
        print(f"✅ Created {len(markers)} unique map markers")
        return {"markers": markers}
    
    def _prepare_chart_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Prepare data for chart visualization with smart variable detection"""
        chart_data = {}
        
        print(f"📊 Preparing chart data from {len(df)} rows...")
        print(f"Columns: {df.columns.tolist()}")
        
        # Check for profile data (depth vs parameter)
        if 'pres_adjusted' not in df.columns:
            print("⚠️ No pressure/depth data found")
            return chart_data
        
        if 'float_id' not in df.columns:
            print("⚠️ No float_id column found")
            return chart_data
        
        # Determine which variables to plot based on available data
        has_salinity = 'psal_adjusted' in df.columns and df['psal_adjusted'].notna().any()
        has_temperature = 'temp_adjusted' in df.columns and df['temp_adjusted'].notna().any()
        
        print(f"Has salinity: {has_salinity}, Has temperature: {has_temperature}")
        
        traces = []
        unique_floats = df['float_id'].unique()
        
        # Limit to reasonable number of floats for visualization (max 50)
        if len(unique_floats) > 50:
            print(f"⚠️ Too many floats ({len(unique_floats)}), limiting to 50")
            unique_floats = unique_floats[:50]
        
        for float_id in unique_floats:
            float_df = df[df['float_id'] == float_id].copy()
            
            # Remove duplicates - keep one measurement per depth
            float_df = float_df.drop_duplicates(subset=['pres_adjusted'], keep='first')
            
            # Sort by depth
            float_df = float_df.sort_values('pres_adjusted')
            
            # Remove NaN values
            float_df = float_df[float_df['pres_adjusted'].notna()]
            
            if len(float_df) == 0:
                continue
            
            # Create traces based on available data
            if has_salinity:
                sal_data = float_df[float_df['psal_adjusted'].notna()]
                if len(sal_data) > 0:
                    # Convert to list and replace any remaining NaN/Inf
                    depths = sal_data['pres_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    values = sal_data['psal_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    
                    # Filter out None values
                    clean_data = [(d, v) for d, v in zip(depths, values) if d is not None and v is not None]
                    if clean_data:
                        depths, values = zip(*clean_data)
                        trace = {
                            "id": f"{float_id}_salinity",
                            "float": str(float_id),
                            "variable": "Salinity",
                            "depths": list(depths),
                            "values": list(values),
                            "units": "PSU"
                        }
                        traces.append(trace)
            
            if has_temperature:
                temp_data = float_df[float_df['temp_adjusted'].notna()]
                if len(temp_data) > 0:
                    # Convert to list and replace any remaining NaN/Inf
                    depths = temp_data['pres_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    values = temp_data['temp_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    
                    # Filter out None values
                    clean_data = [(d, v) for d, v in zip(depths, values) if d is not None and v is not None]
                    if clean_data:
                        depths, values = zip(*clean_data)
                        trace = {
                            "id": f"{float_id}_temperature",
                            "float": str(float_id),
                            "variable": "Temperature",
                            "depths": list(depths),
                            "values": list(values),
                            "units": "°C"
                        }
                        traces.append(trace)
        
        if traces:
            chart_data["traces"] = traces
            # Set primary variable based on what's available
            if has_salinity and has_temperature:
                chart_data["variable"] = "Multiple"
                chart_data["units"] = "Mixed"
            elif has_salinity:
                chart_data["variable"] = "Salinity"
                chart_data["units"] = "PSU"
            elif has_temperature:
                chart_data["variable"] = "Temperature"
                chart_data["units"] = "°C"
            
            print(f"✅ Created {len(traces)} chart traces")
        else:
            print("⚠️ No valid chart data created")
        
        return chart_data
    
    def _prepare_table_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Prepare data for table visualization"""
        # Replace NaN/Inf with None for JSON compatibility
        df_clean = df.replace([np.inf, -np.inf], None)
        df_clean = df_clean.where(pd.notna(df_clean), None)
        
        # Return ALL rows - no limit
        return {
            "columns": df_clean.columns.tolist(),
            "rows": df_clean.to_dict(orient='records'),
            "total_rows": len(df_clean)
        }
    
    def _generate_summary(self, df: pd.DataFrame, query: str) -> str:
        """Generate a text summary of the results"""
        summary_parts = []
        
        # Count statistics
        summary_parts.append(f"Found {len(df)} records")
        
        if 'float_id' in df.columns:
            unique_floats = df['float_id'].nunique()
            summary_parts.append(f"from {unique_floats} float(s)")
        
        # Parameter ranges
        if 'psal_adjusted' in df.columns:
            sal_min = df['psal_adjusted'].min()
            sal_max = df['psal_adjusted'].max()
            summary_parts.append(f"Salinity range: {sal_min:.2f} to {sal_max:.2f} PSU")
        
        if 'temp_adjusted' in df.columns:
            temp_min = df['temp_adjusted'].min()
            temp_max = df['temp_adjusted'].max()
            summary_parts.append(f"Temperature range: {temp_min:.2f} to {temp_max:.2f} °C")
        
        return ". ".join(summary_parts) + "."
    
    def _generate_explanation(self, df: pd.DataFrame, query: str) -> str:
        """Generate detailed explanation of the results"""
        explanations = []
        
        # Analyze what data we have
        if 'latitude' in df.columns and 'longitude' in df.columns:
            explanations.append("📍 **Geographic Distribution**: The data includes location information, which you can view on the interactive maps (2D and 3D globe views).")
        
        if 'psal_adjusted' in df.columns or 'temp_adjusted' in df.columns:
            explanations.append("📊 **Oceanographic Parameters**: The dataset contains measurements that can be visualized as depth profiles and charts.")
        
        if 'float_id' in df.columns:
            unique_floats = df['float_id'].nunique()
            explanations.append(f"🎯 **Float Coverage**: Data from {unique_floats} autonomous Argo floats, which continuously monitor ocean conditions.")
        
        if 'pres_adjusted' in df.columns:
            max_depth = df['pres_adjusted'].max() if not df['pres_adjusted'].isna().all() else 0
            if max_depth > 0:
                explanations.append(f"🌊 **Depth Range**: Measurements extend to approximately {max_depth:.0f} meters depth.")
        
        # Add context based on query
        if "salinity" in query.lower():
            explanations.append("💧 **About Salinity**: Salinity (measured in PSU - Practical Salinity Units) indicates the salt content of seawater, crucial for understanding ocean circulation and climate patterns.")
        
        if "temperature" in query.lower():
            explanations.append("🌡️ **About Temperature**: Ocean temperature profiles reveal thermal structure, mixing processes, and climate change impacts.")
        
        if not explanations:
            explanations.append("📋 **Data Overview**: The results show Argo float data. Use the visualizations panel to explore maps, charts, and detailed tables.")
        
        return "\n\n".join(explanations)


# Convenience function
def query_floatchat(natural_query: str) -> Dict[str, Any]:
    """
    Main entry point for querying FloatChat
    
    Args:
        natural_query: Natural language query from user
    
    Returns:
        Dictionary with SQL query, data, and visualization-ready formats
    """
    engine = LLMQueryEngine()
    return engine.process_query(natural_query)


if __name__ == "__main__":
    # Test the engine
    test_query = "Show me salinity profiles near the equator in March 2023"
    result = query_floatchat(test_query)
    print(json.dumps(result, indent=2, default=str))
