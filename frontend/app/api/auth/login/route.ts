import { NextRequest, NextResponse } from 'next/server';
import * as argon2 from 'argon2';
import { findUserByEmail, logLoginAttempt, logEmailNotification } from '@/lib/db';
import { sendEmail, emailTemplates } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();

        // Get client info for auditing
        const ipAddress = request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            'unknown';
        const userAgent = request.headers.get('user-agent') || 'unknown';

        if (!email || !password) {
            await logLoginAttempt(null, email || 'unknown', ipAddress, userAgent, false, 'Missing credentials');
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user in database
        const user = await findUserByEmail(email);

        if (!user) {
            await logLoginAttempt(null, email, ipAddress, userAgent, false, 'User not found');
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        if (!user.password) {
            await logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'No password set (OAuth user)');
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        const validPassword = await argon2.verify(user.password, password);

        if (!validPassword) {
            await logLoginAttempt(user.id, email, ipAddress, userAgent, false, 'Invalid password');
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Log successful login
        await logLoginAttempt(user.id, email, ipAddress, userAgent, true);

        // Send login alert email (optional - you might want to make this configurable)
        try {
            const loginInfo = {
                ip: ipAddress,
                userAgent: userAgent,
                timestamp: new Date(),
                // You could add geolocation lookup here using ipAddress
            };

            const template = emailTemplates.loginAlert(user.name, loginInfo);
            await sendEmail({
                to: email,
                subject: template.subject,
                html: template.html,
            });

            // Log successful email
            await logEmailNotification(
                user.id,
                email,
                'login_alert',
                template.subject,
                true
            );

            console.log(`Login alert sent to ${email}`);
        } catch (emailError) {
            console.error('Failed to send login alert:', emailError);

            // Log failed email but don't fail login
            await logEmailNotification(
                user.id,
                email,
                'login_alert',
                'New Login to Your Account',
                false,
                emailError instanceof Error ? emailError.message : 'Unknown error'
            );
        }

        // Return user data (excluding password)
        const { password: _, ...userWithoutPassword } = user;

        return NextResponse.json({
            user: userWithoutPassword,
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}