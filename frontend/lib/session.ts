import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export interface SessionData {
    userId: number;
    email: string;
    name: string;
    provider: string;
}

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';

export async function createSession(userData: SessionData): Promise<string> {
    // Create JWT token
    const token = jwt.sign(
        {
            userId: userData.userId,
            email: userData.email,
            name: userData.name,
            provider: userData.provider,
        },
        JWT_SECRET,
        {
            expiresIn: '7d',
            issuer: 'floatchat',
            audience: 'floatchat-app'
        }
    );

    return token;
}

export async function setSessionCookie(response: NextResponse, sessionToken: string): Promise<void> {
    response.cookies.set('session_token', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
    });
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
    try {
        const sessionToken = request.cookies.get('session_token')?.value;

        if (!sessionToken) {
            return null;
        }

        const decoded = jwt.verify(sessionToken, JWT_SECRET, {
            issuer: 'floatchat',
            audience: 'floatchat-app'
        }) as any;

        return {
            userId: decoded.userId,
            email: decoded.email,
            name: decoded.name,
            provider: decoded.provider
        };
    } catch (error) {
        console.error('Session verification error:', error);
        return null;
    }
}

export async function clearSession(response: NextResponse): Promise<void> {
    response.cookies.delete('session_token');
}

export async function generateCSRFToken(): Promise<string> {
    const crypto = await import('crypto');
    return crypto.randomBytes(32).toString('hex');
}

export async function setCSRFCookie(response: NextResponse, token: string): Promise<void> {
    response.cookies.set('csrf_token', token, {
        httpOnly: false, // Needs to be accessible to frontend
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60, // 1 hour
        path: '/'
    });
}

export async function verifyCSRFToken(request: NextRequest, submittedToken: string): Promise<boolean> {
    const cookieToken = request.cookies.get('csrf_token')?.value;
    return cookieToken === submittedToken && cookieToken !== undefined;
}