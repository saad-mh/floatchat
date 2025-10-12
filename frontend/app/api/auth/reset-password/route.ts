import { NextRequest, NextResponse } from 'next/server';
import { verifyPasswordResetToken, updateUser, findUserById, logEmailNotification } from '@/lib/supabase-db';
import { sendEmail, emailTemplates } from '@/lib/email';
import argon2 from 'argon2';

export async function POST(request: NextRequest) {
    try {
        const { token, newPassword } = await request.json();

        if (!token || !newPassword) {
            return NextResponse.json(
                { error: 'Token and new password are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters long' },
                { status: 400 }
            );
        }

        // Verify the reset token
        const userId = await verifyPasswordResetToken(token);

        if (!userId) {
            return NextResponse.json(
                { error: 'Invalid or expired reset token' },
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

        // Hash the new password
        const hashedPassword = await argon2.hash(newPassword);

        // Update the password
        await updateUser(userId, { password: hashedPassword });

        // Token is already marked as used by verifyPasswordResetToken

        // Send password change confirmation email
        try {
            const template = emailTemplates.passwordChanged(user.name);
            await sendEmail({
                to: user.email,
                subject: template.subject,
                html: template.html,
            });

            // Log successful email
            await logEmailNotification(
                user.id,
                user.email,
                'password_changed',
                template.subject,
                true
            );

            console.log(`Password change confirmation sent to ${user.email}`);
        } catch (emailError) {
            console.error('Failed to send password change confirmation:', emailError);

            // Log failed email but don't fail the password reset
            await logEmailNotification(
                user.id,
                user.email,
                'password_changed',
                'Password Changed Successfully',
                false,
                emailError instanceof Error ? emailError.message : 'Unknown error'
            );
        }

        return NextResponse.json({
            message: 'Password has been reset successfully'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}