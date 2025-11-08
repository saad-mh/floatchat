"""
LLM Query Engine using OpenAI (more reliable alternative)
"""

import os
import re
from typing import Dict, List, Any
from dotenv import load_dotenv
from supabase import create_client, Client
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import pandas as pd
import numpy as np

load_dotenv()

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Database schema
DATABASE_SCHEMA = """
Database Schema:

1. floats
   - float_id (TEXT, PRIMARY KEY)
   - meta (JSONB)
   - created_at (TIMESTAMP)

2. float_profiles
   - float_id (TEXT, FOREIGN KEY)
   - cycle_number (TEXT)
   - data_mode, date_creation, date_update
   - platform_number, project_name, pi_name
   - PRIMARY KEY (float_id, cycle_number)

3. float_measurements
   - measurement_id (TEXT, PRIMARY KEY)
   - float_id (TEXT, FOREIGN KEY)
   - cycle_number (TEXT)
   - pres_adjusted (DOUBLE PRECISION) - pressure/depth
   - temp_adjusted (DOUBLE PRECISION) - temperature
   - psal_adjusted (DOUBLE PRECISION) - salinity

4. float_locations
   - measurement_id (TEXT, PRIMARY KEY)
   - float_id (TEXT, FOREIGN KEY)
   - cycle_number (TEXT)
   - juld (DOUBLE PRECISION) - Julian date
   - latitude, longitude (DOUBLE PRECISION)
"""


class LLMQueryEngine:
    """LLM Query Engine using OpenAI"""
    
    def __init__(self):
        """Initialize with OpenAI"""
        self.openai_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_key:
            raise ValueError("OPENAI_API_KEY not found")
        
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.1,
            openai_api_key=self.openai_key
        )
        
        self.prompt = PromptTemplate(
            input_variables=["schema", "query"],
            template="""You are an expert SQL query generator for oceanographic data.

{schema}

User Query: {query}

Generate a PostgreSQL query. Rules:
1. Use ONLY tables and columns from the schema
2. For salinity, use psal_adjusted
3. For temperature, use temp_adjusted
4. For depth, use pres_adjusted (1 dbar ≈ 1 meter)
5. Join tables using float_id and cycle_number
6. Return ONLY the SQL query, no explanations
7. End with semicolon

SQL Query:"""
        )
        
        self.chain = self.prompt | self.llm | StrOutputParser()
    
    def generate_sql(self, natural_query: str) -> str:
        """Generate SQL from natural language"""
        try:
            result = self.chain.invoke({
                "schema": DATABASE_SCHEMA,
                "query": natural_query
            })
            
            # Extract SQL
            sql = result.strip()
            if "```sql" in sql:
                sql = sql.split("```sql")[1].split("```")[0].strip()
            elif "```" in sql:
                sql = sql.split("```")[1].split("```")[0].strip()
            
            return sql
        except Exception as e:
            print(f"Error generating SQL: {e}")
            raise
    
    def execute_query(self, sql_query: str) -> List[Dict[str, Any]]:
        """Execute SQL on Supabase"""
        try:
            # Simple execution - extract table name
            table_match = re.search(r'FROM\s+(\w+)', sql_query, re.IGNORECASE)
            if table_match:
                table_name = table_match.group(1)
                result = supabase.table(table_name).select("*").limit(100).execute()
                return result.data
            return []
        except Exception as e:
            print(f"Error executing query: {e}")
            return []
    
    def process_query(self, natural_query: str) -> Dict[str, Any]:
        """Process complete query"""
        try:
            sql = self.generate_sql(natural_query)
            data = self.execute_query(sql)
            
            return {
                "success": True,
                "query": natural_query,
                "sql_query": sql,
                "raw_data": data,
                "processed_data": self._process_data(data, natural_query)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "query": natural_query
            }
    
    def _process_data(self, data: List[Dict], query: str) -> Dict[str, Any]:
        """Process data for visualizations"""
        if not data:
            return {}
        
        df = pd.DataFrame(data)
        
        return {
            "summary": f"Found {len(data)} records",
            "table_data": {
                "columns": df.columns.tolist(),
                "rows": data[:50]
            }
        }


def query_floatchat(natural_query: str) -> Dict[str, Any]:
    """Main entry point"""
    engine = LLMQueryEngine()
    return engine.process_query(natural_query)
