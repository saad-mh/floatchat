import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, createPasswordResetToken, logEmailNotification } from '@/lib/supabase-db';
import { sendEmail, emailTemplates } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Find user by email
        const user = await findUserByEmail(email);

        if (!user) {
            // Don't reveal if email exists or not for security
            return NextResponse.json({
                message: 'If this email exists in our system, you will receive a password reset link shortly.'
            });
        }

        // Generate password reset token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        await createPasswordResetToken(user.id, token, expiresAt);

        // Send password reset email
        try {
            const template = emailTemplates.passwordReset(user.name, token);
            await sendEmail({
                to: email,
                subject: template.subject,
                html: template.html,
            });

            // Log successful email
            await logEmailNotification(
                user.id,
                email,
                'password_reset',
                template.subject,
                true
            );

            console.log(`Password reset email sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);

            // Log failed email
            await logEmailNotification(
                user.id,
                email,
                'password_reset',
                'Password Reset Request',
                false,
                emailError instanceof Error ? emailError.message : 'Unknown error'
            );

            return NextResponse.json(
                { error: 'Failed to send password reset email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'If this email exists in our system, you will receive a password reset link shortly.'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}