import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP, updateUser } from '@/lib/supabase-db';

export async function POST(request: NextRequest) {
    try {
        const { userId, otpCode, purpose } = await request.json();

        if (!userId || !otpCode || !purpose) {
            return NextResponse.json(
                { error: 'User ID, OTP code, and purpose are required' },
                { status: 400 }
            );
        }

        // Verify OTP
        const isValid = await verifyOTP(userId, otpCode, purpose);

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid or expired OTP code' },
                { status: 400 }
            );
        }

        // If this is email verification, update the user's email_verified status
        if (purpose === 'email_verification') {
            try {
                await updateUser(userId, { email_verified: true });
                console.log(`Email verification completed for user ${userId}`);
            } catch (updateError) {
                console.error('Failed to update email verification status:', updateError);
                // Don't fail the request if verification was successful
            }
        }

        return NextResponse.json({
            message: 'OTP verified successfully',
            verified: true
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}