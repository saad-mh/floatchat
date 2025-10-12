import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, updateUser, findUserById } from '@/lib/supabase-db';

export async function POST(request: NextRequest) {
    try {
        const { email, userId } = await request.json();

        if (!email && !userId) {
            return NextResponse.json({ error: 'Email or userId is required' }, { status: 400 });
        }

        let user;
        if (email && !userId) {
            // Find user by email first
            user = await findUserByEmail(email);
            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
        }

        const targetUserId = userId || user?.id;
        const targetEmail = email || user?.email;

        if (!targetUserId || !targetEmail) {
            return NextResponse.json({ error: 'Unable to identify user' }, { status: 400 });
        }

        // Get current user data
        const currentUser = await findUserById(targetUserId);
        if (!currentUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Generate new profile picture URL based on name
        const profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name.charAt(0))}&size=200&background=10b981&color=fff&format=png&bold=true&seed=${Date.now()}`;

        // Update the profile picture
        const updatedUser = await updateUser(targetUserId, { profile_picture: profilePicture });

        if (updatedUser) {
            return NextResponse.json({
                success: true,
                message: 'Profile picture updated successfully',
                user: updatedUser
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'No profile picture found or no update needed'
            });
        }

    } catch (error) {
        console.error('Error refreshing profile picture:', error);
        return NextResponse.json(
            { error: 'Failed to refresh profile picture' },
            { status: 500 }
        );
    }
}