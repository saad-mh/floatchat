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
        """Prepare SEPARATE datasets for salinity, temperature, and pressure"""
        chart_data = {
            "salinity": {"traces": [], "available": False},
            "temperature": {"traces": [], "available": False},
            "pressure": {"traces": [], "available": False}
        }
        
        print(f"📊 Preparing chart data from {len(df)} rows...")
        print(f"Columns: {df.columns.tolist()}")
        
        # Check for profile data (depth vs parameter)
        if 'pres_adjusted' not in df.columns:
            print("⚠️ No pressure/depth data found")
            return chart_data
        
        if 'float_id' not in df.columns:
            print("⚠️ No float_id column found")
            return chart_data
        
        # Check which variables are available
        has_salinity = 'psal_adjusted' in df.columns and df['psal_adjusted'].notna().any()
        has_temperature = 'temp_adjusted' in df.columns and df['temp_adjusted'].notna().any()
        has_pressure = 'pres_adjusted' in df.columns and df['pres_adjusted'].notna().any()
        
        print(f"Available: Salinity={has_salinity}, Temperature={has_temperature}, Pressure={has_pressure}")
        
        unique_floats = df['float_id'].unique()
        
        # Limit to reasonable number of floats (max 100 since they'll be hidden by default)
        if len(unique_floats) > 100:
            print(f"⚠️ Too many floats ({len(unique_floats)}), limiting to 100")
            unique_floats = unique_floats[:100]
        
        for float_id in unique_floats:
            float_df = df[df['float_id'] == float_id].copy()
            
            # Remove duplicates - keep one measurement per depth
            float_df = float_df.drop_duplicates(subset=['pres_adjusted'], keep='first')
            
            # Sort by depth
            float_df = float_df.sort_values('pres_adjusted')
            
            # Remove NaN values from depth
            float_df = float_df[float_df['pres_adjusted'].notna()]
            
            if len(float_df) == 0:
                continue
            
            # SALINITY traces (Salinity vs Depth)
            if has_salinity:
                sal_data = float_df[float_df['psal_adjusted'].notna()]
                if len(sal_data) > 0:
                    depths = sal_data['pres_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    values = sal_data['psal_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    
                    clean_data = [(d, v) for d, v in zip(depths, values) if d is not None and v is not None]
                    if clean_data:
                        depths, values = zip(*clean_data)
                        chart_data["salinity"]["traces"].append({
                            "id": f"{float_id}_salinity",
                            "float": str(float_id),
                            "depths": list(depths),
                            "values": list(values),
                            "visible": False  # Hidden by default
                        })
            
            # TEMPERATURE traces (Temperature vs Depth)
            if has_temperature:
                temp_data = float_df[float_df['temp_adjusted'].notna()]
                if len(temp_data) > 0:
                    depths = temp_data['pres_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    values = temp_data['temp_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    
                    clean_data = [(d, v) for d, v in zip(depths, values) if d is not None and v is not None]
                    if clean_data:
                        depths, values = zip(*clean_data)
                        chart_data["temperature"]["traces"].append({
                            "id": f"{float_id}_temperature",
                            "float": str(float_id),
                            "depths": list(depths),
                            "values": list(values),
                            "visible": False  # Hidden by default
                        })
            
            # PRESSURE traces (Pressure vs Depth - same format as salinity/temperature)
            if has_pressure:
                pres_data = float_df[float_df['pres_adjusted'].notna()]
                if len(pres_data) > 0:
                    # For pressure, we plot pressure values vs depth (which is also pressure in dbar)
                    # This shows the pressure profile at different depths
                    depths = pres_data['pres_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    values = pres_data['pres_adjusted'].replace([np.inf, -np.inf], None).tolist()
                    
                    clean_data = [(d, v) for d, v in zip(depths, values) if d is not None and v is not None]
                    if clean_data:
                        depths, values = zip(*clean_data)
                        chart_data["pressure"]["traces"].append({
                            "id": f"{float_id}_pressure",
                            "float": str(float_id),
                            "depths": list(depths),
                            "values": list(values),
                            "visible": False  # Hidden by default
                        })
        
        # Mark which datasets are available
        chart_data["salinity"]["available"] = len(chart_data["salinity"]["traces"]) > 0
        chart_data["temperature"]["available"] = len(chart_data["temperature"]["traces"]) > 0
        chart_data["pressure"]["available"] = len(chart_data["pressure"]["traces"]) > 0
        
        # Add metadata
        chart_data["salinity"]["variable"] = "Salinity"
        chart_data["salinity"]["units"] = "PSU"
        chart_data["salinity"]["xLabel"] = "Salinity (PSU)"
        chart_data["salinity"]["yLabel"] = "Depth (m)"
        
        chart_data["temperature"]["variable"] = "Temperature"
        chart_data["temperature"]["units"] = "°C"
        chart_data["temperature"]["xLabel"] = "Temperature (°C)"
        chart_data["temperature"]["yLabel"] = "Depth (m)"
        
        chart_data["pressure"]["variable"] = "Pressure"
        chart_data["pressure"]["units"] = "dbar"
        chart_data["pressure"]["xLabel"] = "Pressure (dbar)"
        chart_data["pressure"]["yLabel"] = "Depth (m)"
        
        print(f"✅ Created chart data:")
        print(f"   - Salinity: {len(chart_data['salinity']['traces'])} traces")
        print(f"   - Temperature: {len(chart_data['temperature']['traces'])} traces")
        print(f"   - Pressure: {len(chart_data['pressure']['traces'])} traces")
        
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
        """Generate a detailed, contextual summary of the results"""
        summary_parts = []
        
        # Count statistics
        num_records = len(df)
        summary_parts.append(f"Found **{num_records:,} records**")
        
        if 'float_id' in df.columns:
            unique_floats = df['float_id'].nunique()
            summary_parts.append(f"from **{unique_floats} float(s)**")
        
        # Geographic context
        if 'latitude' in df.columns and 'longitude' in df.columns:
            lat_range = (df['latitude'].min(), df['latitude'].max())
            lon_range = (df['longitude'].min(), df['longitude'].max())
            
            # Determine region
            region = self._identify_region(lat_range, lon_range)
            if region:
                summary_parts.append(f"in the **{region}**")
        
        # Parameter ranges with context
        if 'psal_adjusted' in df.columns and df['psal_adjusted'].notna().any():
            sal_min = df['psal_adjusted'].min()
            sal_max = df['psal_adjusted'].max()
            sal_mean = df['psal_adjusted'].mean()
            summary_parts.append(f"\n\n🌊 **Salinity**: {sal_min:.2f} to {sal_max:.2f} PSU (avg: {sal_mean:.2f} PSU)")
            
            # Add context about salinity values
            if sal_mean < 34:
                summary_parts.append("- Lower than typical ocean salinity, indicating freshwater influence or high precipitation")
            elif sal_mean > 36:
                summary_parts.append("- Higher than typical ocean salinity, indicating high evaporation or limited freshwater input")
        
        if 'temp_adjusted' in df.columns and df['temp_adjusted'].notna().any():
            temp_min = df['temp_adjusted'].min()
            temp_max = df['temp_adjusted'].max()
            temp_mean = df['temp_adjusted'].mean()
            summary_parts.append(f"\n\n🌡️ **Temperature**: {temp_min:.2f} to {temp_max:.2f} °C (avg: {temp_mean:.2f} °C)")
            
            # Add context about temperature
            if temp_mean > 25:
                summary_parts.append("- Warm tropical/subtropical waters")
            elif temp_mean < 10:
                summary_parts.append("- Cold waters, typical of deep ocean or polar regions")
        
        # Depth range
        if 'pres_adjusted' in df.columns and df['pres_adjusted'].notna().any():
            max_depth = df['pres_adjusted'].max()
            summary_parts.append(f"\n\n🌊 **Depth Range**: Surface to {max_depth:.0f} meters")
            
            if max_depth > 2000:
                summary_parts.append("- Deep ocean measurements capturing full water column structure")
            elif max_depth > 1000:
                summary_parts.append("- Measurements extend into intermediate depths")
        
        # Time context if available
        if 'juld' in df.columns and df['juld'].notna().any():
            # Julian date conversion (simplified)
            date_range_days = df['juld'].max() - df['juld'].min()
            if date_range_days > 365:
                years = date_range_days / 365
                summary_parts.append(f"\n\n📅 **Time Span**: Approximately {years:.1f} years of data")
            elif date_range_days > 30:
                months = date_range_days / 30
                summary_parts.append(f"\n\n📅 **Time Span**: Approximately {months:.1f} months of data")
        
        return "".join(summary_parts)
    
    def _identify_region(self, lat_range: tuple, lon_range: tuple) -> str:
        """Identify geographic region from lat/lon ranges"""
        lat_min, lat_max = lat_range
        lon_min, lon_max = lon_range
        lat_center = (lat_min + lat_max) / 2
        lon_center = (lon_min + lon_max) / 2
        
        # Arabian Sea
        if 10 <= lat_center <= 25 and 60 <= lon_center <= 75:
            return "Arabian Sea"
        # Bay of Bengal
        elif 5 <= lat_center <= 22 and 80 <= lon_center <= 95:
            return "Bay of Bengal"
        # Indian Ocean (general)
        elif -40 <= lat_center <= 30 and 40 <= lon_center <= 120:
            return "Indian Ocean"
        # Equatorial region
        elif -5 <= lat_center <= 5:
            return "Equatorial Region"
        # Tropical
        elif -23.5 <= lat_center <= 23.5:
            return "Tropical Region"
        # Subtropical
        elif 23.5 <= lat_center <= 40 or -40 <= lat_center <= -23.5:
            return "Subtropical Region"
        
        return None
    
    def _generate_explanation(self, df: pd.DataFrame, query: str) -> str:
        """Generate detailed, educational explanation of the results"""
        explanations = []
        
        # Header
        explanations.append("## 🔍 Detailed Analysis & Context\n")
        
        # Geographic context
        if 'latitude' in df.columns and 'longitude' in df.columns:
            unique_locs = df[['latitude', 'longitude']].drop_duplicates()
            explanations.append(f"📍 **Geographic Distribution**: The data includes {len(unique_locs)} unique locations, which you can view on the interactive maps (2D and 3D globe views).")
        
        # Oceanographic parameters
        if 'psal_adjusted' in df.columns or 'temp_adjusted' in df.columns:
            params = []
            if 'psal_adjusted' in df.columns and df['psal_adjusted'].notna().any():
                params.append("salinity")
            if 'temp_adjusted' in df.columns and df['temp_adjusted'].notna().any():
                params.append("temperature")
            
            if params:
                param_str = " and ".join(params)
                explanations.append(f"\n📊 **Oceanographic Parameters**: The dataset contains {param_str} measurements that can be visualized as depth profiles and charts.")
        
        # Float coverage
        if 'float_id' in df.columns:
            unique_floats = df['float_id'].nunique()
            explanations.append(f"\n🎯 **Float Coverage**: Data from {unique_floats} autonomous Argo floats, which continuously monitor ocean conditions.")
            
            if unique_floats > 1:
                explanations.append(f"Each float provides vertical profiles of the water column, allowing us to understand ocean structure and variability.")
        
        # Depth range with context
        if 'pres_adjusted' in df.columns:
            max_depth = df['pres_adjusted'].max() if not df['pres_adjusted'].isna().all() else 0
            if max_depth > 0:
                explanations.append(f"\n🌊 **Depth Range**: Measurements extend to approximately {max_depth:.0f} meters depth.")
                
                if max_depth > 2000:
                    explanations.append("This captures the full water column including deep ocean layers, revealing stratification, thermocline structure, and deep water properties.")
                elif max_depth > 1000:
                    explanations.append("This captures surface, intermediate, and some deep layers, showing the main thermocline and halocline structures.")
                else:
                    explanations.append("This focuses on the upper ocean layers where most biological activity and air-sea interaction occurs.")
        
        # Query-specific context
        query_lower = query.lower()
        
        if "salinity" in query_lower:
            explanations.append("\n\n💧 **About Salinity**:")
            explanations.append("- Measured in PSU (Practical Salinity Units)")
            explanations.append("- Typical ocean salinity: 34-36 PSU")
            explanations.append("- Affects ocean density, circulation, and mixing")
            explanations.append("- Key indicator of evaporation, precipitation, and freshwater input")
            explanations.append("- Critical for understanding thermohaline circulation and climate")
        
        if "temperature" in query_lower:
            explanations.append("\n\n🌡️ **About Temperature**:")
            explanations.append("- Measured in degrees Celsius (°C)")
            explanations.append("- Surface temperatures vary from -2°C (polar) to 30°C (tropical)")
            explanations.append("- Reveals thermal structure and stratification")
            explanations.append("- Indicates mixing processes and water mass origins")
            explanations.append("- Essential for understanding heat transport and climate change")
        
        if "arabian sea" in query_lower or "bay of bengal" in query_lower:
            explanations.append("\n\n🌏 **Regional Context**:")
            explanations.append("- This region is influenced by monsoon systems")
            explanations.append("- Shows strong seasonal variability in temperature and salinity")
            explanations.append("- Important for understanding Indian Ocean circulation")
            explanations.append("- Affects regional climate and marine ecosystems")
        
        if "equator" in query_lower:
            explanations.append("\n\n🌍 **Equatorial Context**:")
            explanations.append("- Equatorial regions show minimal seasonal temperature variation")
            explanations.append("- Strong upwelling can bring cold, nutrient-rich water to surface")
            explanations.append("- Important for El Niño/La Niña dynamics")
            explanations.append("- High biological productivity zones")
        
        # Data usage tips
        explanations.append("\n\n💡 **How to Use This Data**:")
        explanations.append("- **Maps**: Click markers to see float details and locations")
        explanations.append("- **Charts**: Toggle individual float profiles on/off for comparison")
        explanations.append("- **Table**: Sort and filter to find specific measurements")
        explanations.append("- **Export**: Download data for further analysis")
        
        return "\n".join(explanations)


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
