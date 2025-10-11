import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, findUserById, logEmailNotification } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { userId, purpose } = await request.json();

        if (!userId || !purpose) {
            return NextResponse.json(
                { error: 'User ID and purpose are required' },
                { status: 400 }
            );
        }

        // Validate purpose
        const validPurposes = ['email_verification', 'profile_change', 'account_security'];
        if (!validPurposes.includes(purpose)) {
            return NextResponse.json(
                { error: 'Invalid OTP purpose' },
                { status: 400 }
            );
        }

        // Get user details
        const user = await findUserById(userId);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Generate OTP
        const otpCode = await generateOTP(userId, user.email, purpose);

        // Send OTP email
        try {
            const template = emailTemplates.emailVerification(user.name, otpCode);
            await sendEmail({
                to: user.email,
                subject: template.subject,
                html: template.html,
            });

            // Log successful email
            await logEmailNotification(
                user.id,
                user.email,
                'otp_verification',
                template.subject,
                true
            );

            console.log(`OTP email sent to ${user.email} for purpose: ${purpose}`);
        } catch (emailError) {
            console.error('Failed to send OTP email:', emailError);

            // Log failed email
            await logEmailNotification(
                user.id,
                user.email,
                'otp_verification',
                'Email Verification Code',
                false,
                emailError instanceof Error ? emailError.message : 'Unknown error'
            );

            return NextResponse.json(
                { error: 'Failed to send OTP email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'OTP has been sent to your email address',
            expiresIn: '10 minutes'
        });

    } catch (error) {
        console.error('OTP generation error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}