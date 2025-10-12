import { NextRequest, NextResponse } from 'next/server';
import argon2 from 'argon2';
import { findUserById, updateUser, logEmailNotification, verifyOTP } from '@/lib/supabase-db';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function PUT(request: NextRequest) {
    try {
        const { userId, currentPassword, newPassword, otpCode } = await request.json();

        if (!userId || !currentPassword || !newPassword || !otpCode) {
            return NextResponse.json(
                { error: 'User ID, current password, new password, and OTP code are required' },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'New password must be at least 8 characters long' },
                { status: 400 }
            );
        }

        // Find user and verify current password
        const user = await findUserById(userId);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if user has a password (not a Google OAuth user)
        if (!user.password) {
            return NextResponse.json(
                { error: 'This account was created with Google OAuth and does not have a password. Please use Google to sign in.' },
                { status: 400 }
            );
        }

        // Verify current password
        const validPassword = await argon2.verify(user.password, currentPassword);
        if (!validPassword) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            );
        }

        // Verify OTP for password change
        const otpValid = await verifyOTP(userId, otpCode, 'password_change');
        if (!otpValid) {
            return NextResponse.json(
                { error: 'Invalid or expired OTP code. Please request a new OTP.' },
                { status: 401 }
            );
        }

        // Hash new password
        const hashedNewPassword = await argon2.hash(newPassword);

        // Update password
        // Update password
        const result = await updateUser(userId, { password: hashedNewPassword });

        if (!result) {
            return NextResponse.json(
                { error: 'Failed to update password' },
                { status: 500 }
            );
        }

        // Send password change notification email
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

            console.log(`Password change notification sent to ${user.email}`);
        } catch (emailError) {
            console.error('Failed to send password change notification:', emailError);

            // Log failed email but don't fail the password change
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
            message: 'Password changed successfully. A confirmation email has been sent.'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}