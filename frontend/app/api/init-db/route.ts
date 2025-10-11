import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        await initDatabase();

        return NextResponse.json({
            message: 'Database initialized successfully'
        });
    } catch (error) {
        console.error('Database initialization error:', error);
        return NextResponse.json(
            { error: 'Failed to initialize database' },
            { status: 500 }
        );
    }
}