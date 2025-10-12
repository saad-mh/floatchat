import { NextRequest, NextResponse } from 'next/server';
import { getLoginHistory } from '@/lib/supabase-db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const limit = parseInt(searchParams.get('limit') || '10');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const loginHistory = await getLoginHistory(parseInt(userId), limit);

        return NextResponse.json({
            loginHistory: loginHistory.map(entry => ({
                ...entry,
                created_at: entry.created_at.toISOString(),
            }))
        });

    } catch (error) {
        console.error('Login history error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}