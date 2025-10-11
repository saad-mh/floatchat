import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    // This would typically redirect to Google OAuth
    // For now, we'll return a message indicating this needs to be implemented

    const redirectUrl = `${process.env.NEXTAUTH_URL}/auth`;

    return NextResponse.json({
        message: 'Google OAuth not yet implemented',
        redirectUrl,
        instructions: 'This endpoint will be implemented with NextAuth.js Google provider'
    });
}