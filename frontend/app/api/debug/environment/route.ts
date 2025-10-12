import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl, isLocalhost, isDevelopment } from '@/lib/environment';

export async function GET(request: NextRequest) {
    const baseUrl = getBaseUrl(request);
    const isLocal = isLocalhost();
    const isDev = isDevelopment();

    return NextResponse.json({
        environment: {
            baseUrl,
            isLocalhost: isLocal,
            isDevelopment: isDev,
            nodeEnv: process.env.NODE_ENV,
            nextAuthUrl: process.env.NEXTAUTH_URL,
            vercelUrl: process.env.VERCEL_URL,
            host: request.headers.get('host'),
            protocol: request.headers.get('x-forwarded-proto') || 'http',
        },
        oauth: {
            googleClientId: process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Not Set',
            googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Not Set',
            redirectUri: `${baseUrl}/api/auth/google/callback`
        },
        timestamp: new Date().toISOString()
    });
}