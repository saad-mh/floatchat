import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { findUserByEmail, createUser, updateUser, logEmailNotification } from '@/lib/supabase-db';
import { sendEmail, emailTemplates } from '@/lib/email';
import { createSession, setSessionCookie } from '@/lib/session';
import { getBaseUrl } from '@/lib/environment';

interface GoogleTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    id_token: string;
}

interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture: string;
    email_verified: boolean;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors
        if (error) {
            console.error('Google OAuth error:', error);
            const baseUrl = getBaseUrl(request);
            // Redirect to auth page without exposing error details in URL
            return NextResponse.redirect(`${baseUrl}/auth`);
        }

        if (!code || !state) {
            const baseUrl = getBaseUrl(request);
            // Redirect to auth page without exposing error details in URL
            return NextResponse.redirect(`${baseUrl}/auth`);
        }

        // Verify state parameter
        const cookieStore = await cookies();
        const storedState = cookieStore.get('oauth_state')?.value;

        if (!storedState || storedState !== state) {
            const baseUrl = getBaseUrl(request);
            // Redirect to auth page without exposing error details in URL
            return NextResponse.redirect(`${baseUrl}/auth`);
        }

        // Get dynamic base URL for token exchange
        const baseUrl = getBaseUrl(request);

        // Exchange code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                code,
                grant_type: 'authorization_code',
                redirect_uri: `${baseUrl}/api/auth/google/callback`,
            }),
        });

        if (!tokenResponse.ok) {
            console.error('Token exchange failed:', await tokenResponse.text());
            return NextResponse.redirect(`${baseUrl}/auth`);
        }

        const tokens: GoogleTokenResponse = await tokenResponse.json();

        // Get user info from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        if (!userResponse.ok) {
            console.error('Failed to get user info:', await userResponse.text());
            return NextResponse.redirect(`${baseUrl}/auth`);
        }

        const googleUser: GoogleUserInfo = await userResponse.json();

        // Check if user exists in our database
        let user = await findUserByEmail(googleUser.email);

        if (!user) {
            // Create new user (OAuth users don't have passwords)
            user = await createUser(
                googleUser.name,
                googleUser.email,
                '' // No password for OAuth users
            );

            // Update user with Google-specific information
            await updateUser(user.id, {
                profile_picture: googleUser.picture,
                provider: 'google',
                provider_id: googleUser.id,
                email_verified: googleUser.email_verified
            });

            // Send welcome email
            try {
                const template = emailTemplates.welcome(user.name, user.email);
                await sendEmail({
                    to: user.email,
                    subject: template.subject,
                    html: template.html,
                });

                // Log successful email
                await logEmailNotification(
                    user.id,
                    user.email,
                    'welcome',
                    template.subject,
                    true
                );

                console.log(`Welcome email sent to ${user.email}`);
            } catch (emailError) {
                console.error('Failed to send welcome email:', emailError);

                // Log failed email
                await logEmailNotification(
                    user.id,
                    user.email,
                    'welcome',
                    'Welcome to FloatChat!',
                    false,
                    emailError instanceof Error ? emailError.message : 'Unknown error'
                );
            }
        } else if (user.provider !== 'google') {
            // User exists with different provider - link Google account to existing account
            console.log(`Linking Google account to existing ${user.provider} account for ${user.email}`);

            // Update user to add Google as provider and update profile info
            await updateUser(user.id, {
                provider: 'google',
                profile_picture: googleUser.picture,
                name: googleUser.name
            });

            console.log(`Successfully linked Google account for ${user.email}`);
        }

        // Create session token
        const sessionToken = await createSession({
            userId: user.id,
            email: user.email,
            name: user.name,
            provider: 'google'
        });

        // Redirect to profile page WITHOUT any URL parameters for security
        const response = NextResponse.redirect(`${baseUrl}/profile`);

        // Set session cookie
        await setSessionCookie(response, sessionToken);

        // Clear OAuth state cookie
        response.cookies.delete('oauth_state');

        return response;
    } catch (error) {
        console.error('Google OAuth callback error:', error);
        const baseUrl = getBaseUrl(request);
        return NextResponse.redirect(`${baseUrl}/auth`);
    }
}