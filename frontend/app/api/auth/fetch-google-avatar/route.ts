import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Method 1: Gravatar (works for many Gmail users who have set up Gravatar)
        const crypto = require('crypto');
        const emailHash = crypto.createHash('md5').update(email.toLowerCase().trim()).digest('hex');

        try {
            // Check if Gravatar exists for this email
            const gravatarCheckUrl = `https://www.gravatar.com/avatar/${emailHash}?s=200&d=404`;
            const gravatarResponse = await fetch(gravatarCheckUrl, { method: 'HEAD' });

            if (gravatarResponse.ok) {
                return NextResponse.json({
                    success: true,
                    profilePicture: `https://www.gravatar.com/avatar/${emailHash}?s=200&d=mp`,
                    method: 'gravatar'
                });
            }
        } catch (error) {
            console.log('Gravatar check failed, trying alternative...');
        }

        // Method 2: For Gmail users, try to construct Google profile image URL
        if (email.endsWith('@gmail.com')) {
            try {
                // Google Photos API approach (works for public profiles)
                const googleImageUrl = `https://lh3.googleusercontent.com/a-/default-user`;

                // Alternative: Use Google's internal avatar API (sometimes works)
                const username = email.replace('@gmail.com', '');
                const googleAvatarUrl = `https://profiles.google.com/s2/photos/profile/${username}`;

                // We'll return a placeholder that can be checked client-side
                return NextResponse.json({
                    success: true,
                    profilePicture: `https://lh3.googleusercontent.com/a/default-user=s200-c`,
                    fallbackPicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.charAt(0).toUpperCase())}&size=200&background=0ea5e9&color=fff&format=png`,
                    method: 'google_attempt'
                });
            } catch (error) {
                console.log('Google method failed...');
            }
        }

        // Method 3: Generate a beautiful avatar based on email
        const firstLetter = email.charAt(0).toUpperCase();
        const colors = [
            '0ea5e9', '8b5cf6', 'ef4444', 'f59e0b',
            '10b981', 'f97316', '6366f1', 'ec4899'
        ];
        const colorIndex = email.charCodeAt(0) % colors.length;
        const backgroundColor = colors[colorIndex];

        return NextResponse.json({
            success: true,
            profilePicture: `https://ui-avatars.com/api/?name=${firstLetter}&size=200&background=${backgroundColor}&color=fff&format=png&bold=true`,
            method: 'generated'
        });

    } catch (error) {
        console.error('Error fetching profile picture:', error);
        return NextResponse.json(
            { error: 'Failed to fetch profile picture' },
            { status: 500 }
        );
    }
}