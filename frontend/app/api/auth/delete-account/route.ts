import { NextRequest, NextResponse } from 'next/server';
import * as argon2 from 'argon2';
import { findUserById, deleteUser, logEmailNotification } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await request.json();

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // Get user details before deletion for email
        const user = await findUserById(userId);
        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Send account deletion confirmation email first
        try {
            const template = emailTemplates.accountDeleted(user.name);
            await sendEmail({
                to: user.email,
                subject: template.subject,
                html: template.html,
            });

            // Log successful email
            await logEmailNotification(
                user.id,
                user.email,
                'account_deleted',
                template.subject,
                true
            );

            console.log(`Account deletion confirmation sent to ${user.email}`);
        } catch (emailError) {
            console.error('Failed to send account deletion confirmation:', emailError);

            // Log failed email but continue with deletion
            await logEmailNotification(
                user.id,
                user.email,
                'account_deleted',
                'Account Deleted',
                false,
                emailError instanceof Error ? emailError.message : 'Unknown error'
            );
        }

        // Delete user from database
        const result = await deleteUser(userId);

        if (!result) {
            return NextResponse.json(
                { error: 'Failed to delete account' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            message: 'Account deleted successfully'
        });

    } catch (error) {
        console.error('Delete account error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}