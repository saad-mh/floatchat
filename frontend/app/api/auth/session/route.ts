import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { findUserById } from '@/lib/supabase-db';

export async function GET(request: NextRequest) {
    try {
        const session = await getSessionFromRequest(request);

        if (!session) {
            return NextResponse.json({ user: null, authenticated: false });
        }

        // Get updated user data from database
        const user = await findUserById(session.userId);

        if (!user) {
            // Session exists but user doesn't - clear invalid session
            const response = NextResponse.json({ user: null, authenticated: false });
            response.cookies.delete('session_token');
            return response;
        }

        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            user: userWithoutPassword,
            authenticated: true
        });

    } catch (error) {
        console.error('Session check error:', error);
        return NextResponse.json({ user: null, authenticated: false });
    }
}