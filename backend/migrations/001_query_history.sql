-- Migration: Add query history table
-- Description: Stores user query history with favorites and analytics
-- Date: 2025-11-03

-- Create query_history table
CREATE TABLE IF NOT EXISTS query_history (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    query TEXT NOT NULL,
    sql TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    execution_time DOUBLE PRECISION DEFAULT 0,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_query_history_user_id ON query_history(user_id);
CREATE INDEX IF NOT EXISTS idx_query_history_created_at ON query_history(created_at);
CREATE INDEX IF NOT EXISTS idx_query_history_is_favorite ON query_history(is_favorite);
CREATE INDEX IF NOT EXISTS idx_query_history_success ON query_history(success);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_query_history_query_fts 
    ON query_history USING gin(to_tsvector('english', query));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_query_history_updated_at 
    BEFORE UPDATE ON query_history 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE query_history IS 'Stores user query history with execution details';
COMMENT ON COLUMN query_history.user_id IS 'User identifier';
COMMENT ON COLUMN query_history.query IS 'Natural language query';
COMMENT ON COLUMN query_history.sql IS 'Generated SQL query';
COMMENT ON COLUMN query_history.result_count IS 'Number of results returned';
COMMENT ON COLUMN query_history.execution_time IS 'Query execution time in seconds';
COMMENT ON COLUMN query_history.success IS 'Whether query succeeded';
COMMENT ON COLUMN query_history.error_message IS 'Error message if query failed';
COMMENT ON COLUMN query_history.metadata IS 'Additional metadata (JSON)';
COMMENT ON COLUMN query_history.is_favorite IS 'Whether query is marked as favorite';

-- Verify table creation
SELECT 'Query history table created successfully' AS status;
