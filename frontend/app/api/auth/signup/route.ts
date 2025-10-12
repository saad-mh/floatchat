import { NextRequest, NextResponse } from 'next/server';
import argon2 from 'argon2';
import { createUser, findUserByEmail, logEmailNotification } from '@/lib/supabase-db';
import { sendEmail, emailTemplates } from '@/lib/email';
import { createSession, setSessionCookie } from '@/lib/session';

export async function POST(request: NextRequest) {
    try {
        const { name, email, password } = await request.json();

        // Validation
        if (!name || !email || !password) {
            return NextResponse.json(
                { error: 'Name, email, and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters long' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return NextResponse.json(
                { error: 'User with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await argon2.hash(password);

        // Create user
        const user = await createUser(name, email, hashedPassword);

        // Send welcome email
        try {
            const template = emailTemplates.welcome(name, email);
            await sendEmail({
                to: email,
                subject: template.subject,
                html: template.html,
            });

            // Log successful email
            await logEmailNotification(
                user.id,
                email,
                'welcome',
                template.subject,
                true
            );

            console.log(`Welcome email sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);

            // Log failed email but don't fail signup
            await logEmailNotification(
                user.id,
                email,
                'welcome',
                'Welcome to FloatChat',
                false,
                emailError instanceof Error ? emailError.message : 'Unknown error'
            );
        }

        // Return user data (excluding password)
        const { password: _, ...userWithoutPassword } = user;

        // Create session for immediate login
        const sessionToken = await createSession({
            userId: user.id,
            email: user.email,
            name: user.name,
            provider: 'local'
        });

        const response = NextResponse.json({
            user: userWithoutPassword,
            message: 'User created successfully'
        }, { status: 201 });

        // Set session cookie
        await setSessionCookie(response, sessionToken);

        return response;

    } catch (error) {
        console.error('Signup error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}