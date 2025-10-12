import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, updateUser, findUserById, logEmailNotification } from '@/lib/supabase-db';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function PUT(request: NextRequest) {
    try {
        const { userId, name, email } = await request.json();

        if (!userId || !name || !email) {
            return NextResponse.json(
                { error: 'User ID, name, and email are required' },
                { status: 400 }
            );
        }

        // Check if email is already taken by another user
        const existingUser = await findUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
            return NextResponse.json(
                { error: 'Email is already taken by another user' },
                { status: 409 }
            );
        }

        // Get current user data to compare changes
        const currentUser = await findUserById(userId);
        if (!currentUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Track what changed
        const changes: string[] = [];
        if (currentUser.name !== name) changes.push(`Name changed from "${currentUser.name}" to "${name}"`);
        if (currentUser.email !== email) changes.push(`Email changed from "${currentUser.email}" to "${email}"`);

        // Update user profile
        const updatedUser = await updateUser(userId, { name, email });

        if (!updatedUser) {
            return NextResponse.json(
                { error: 'Failed to update profile' },
                { status: 500 }
            );
        }

        // Send profile update notification email if there were changes
        if (changes.length > 0) {
            try {
                const template = emailTemplates.profileUpdated(name, changes);
                await sendEmail({
                    to: email, // Send to new email if changed
                    subject: template.subject,
                    html: template.html,
                });

                // Log successful email
                await logEmailNotification(
                    userId,
                    email,
                    'profile_updated',
                    template.subject,
                    true
                );

                console.log(`Profile update notification sent to ${email}`);
            } catch (emailError) {
                console.error('Failed to send profile update notification:', emailError);

                // Log failed email but don't fail the profile update
                await logEmailNotification(
                    userId,
                    email,
                    'profile_updated',
                    'Profile Updated',
                    false,
                    emailError instanceof Error ? emailError.message : 'Unknown error'
                );
            }
        }

        return NextResponse.json({
            user: updatedUser,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}