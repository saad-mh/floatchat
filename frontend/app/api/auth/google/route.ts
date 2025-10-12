import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { getBaseUrl } from '@/lib/environment';

export async function GET(request: NextRequest) {
    try {
        // Generate state parameter for security
        const state = crypto.randomBytes(32).toString('hex');

        // Store state in cookie for verification
        const cookieStore = await cookies();
        cookieStore.set('oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600 // 10 minutes
        });

        // Get dynamic base URL
        const baseUrl = getBaseUrl(request);

        // Google OAuth 2.0 authorization URL
        const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
        googleAuthUrl.searchParams.set('redirect_uri', `${baseUrl}/api/auth/google/callback`);
        googleAuthUrl.searchParams.set('response_type', 'code');
        googleAuthUrl.searchParams.set('scope', 'openid email profile');
        googleAuthUrl.searchParams.set('state', state);
        googleAuthUrl.searchParams.set('access_type', 'offline');
        googleAuthUrl.searchParams.set('prompt', 'consent'); return NextResponse.redirect(googleAuthUrl.toString());

    } catch (error) {
        console.error('Google OAuth initiation error:', error);
        return NextResponse.json(
            { error: 'Failed to initiate Google OAuth' },
            { status: 500 }
        );
    }
}