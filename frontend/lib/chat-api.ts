/**
 * Chat API utilities for FloatChat
 * Handles communication with the LLM backend
 */

export interface ChatQueryRequest {
    query: string;
    include_raw_data?: boolean;
}

export interface MapData {
    markers: Array<{
        lat: number;
        lon: number;
        label: string;
        popup: string;
    }>;
}

export interface ChartData {
    traces: Array<{
        id: string;
        float: string;
        depths: number[];
        values: number[];
    }>;
    variable: string;
    units: string;
}

export interface TableData {
    columns: string[];
    rows: Array<Record<string, any>>;
}

export interface ProcessedData {
    map_data?: MapData;
    chart_data?: ChartData;
    table_data?: TableData;
    summary?: string;
}

export interface ChatQueryResponse {
    success: boolean;
    query: string;
    sql_query?: string;
    processed_data?: ProcessedData;
    raw_data?: any;
    error?: string;
}

/**
 * Send a natural language query to the FloatChat backend
 */
export async function sendChatQuery(
    query: string,
    includeRawData: boolean = false
): Promise<ChatQueryResponse> {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                include_raw_data: includeRawData,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to process query');
        }

        const data: ChatQueryResponse = await response.json();
        return data;
    } catch (error) {
        console.error('Error sending chat query:', error);
        throw error;
    }
}

/**
 * Check if the backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
    try {
        const response = await fetch('/api/chat', {
            method: 'GET',
        });
        return response.ok;
    } catch (error) {
        console.error('Backend health check failed:', error);
        return false;
    }
}

/**
 * Format SQL query for display
 */
export function formatSQLQuery(sql: string): string {
    return sql
        .replace(/SELECT/gi, 'SELECT\n  ')
        .replace(/FROM/gi, '\nFROM\n  ')
        .replace(/WHERE/gi, '\nWHERE\n  ')
        .replace(/AND/gi, '\n  AND ')
        .replace(/OR/gi, '\n  OR ')
        .replace(/ORDER BY/gi, '\nORDER BY\n  ')
        .replace(/GROUP BY/gi, '\nGROUP BY\n  ')
        .replace(/LIMIT/gi, '\nLIMIT ')
        .trim();
}

/**
 * Convert processed data to visualization format
 */
export function prepareVisualizationData(processedData: ProcessedData) {
    const visualizations: any[] = [];

    // Add map visualization if available
    if (processedData.map_data && processedData.map_data.markers.length > 0) {
        visualizations.push({
            type: 'map',
            data: processedData.map_data,
        });
    }

    // Add chart visualization if available
    if (processedData.chart_data && processedData.chart_data.traces.length > 0) {
        visualizations.push({
            type: 'chart',
            data: processedData.chart_data,
        });
    }

    // Add table visualization if available
    if (processedData.table_data && processedData.table_data.rows.length > 0) {
        visualizations.push({
            type: 'table',
            data: processedData.table_data,
        });
    }

    return visualizations;
}
