import { NextRequest, NextResponse } from 'next/server';
import * as argon2 from 'argon2';
import { findUserById, changePassword, logEmailNotification } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function PUT(request: NextRequest) {
    try {
        const { userId, currentPassword, newPassword } = await request.json();

        if (!userId || !currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'User ID, current password, and new password are required' },
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

        // Verify current password
        const validPassword = await argon2.verify(user.password, currentPassword);
        if (!validPassword) {
            return NextResponse.json(
                { error: 'Current password is incorrect' },
                { status: 401 }
            );
        }

        // Hash new password
        const hashedNewPassword = await argon2.hash(newPassword);

        // Update password
        const result = await changePassword(userId, hashedNewPassword);

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
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}