import { createClient } from '@/utils/supabase/server';
import * as argon2 from 'argon2';

// Types
interface User {
    id: number;
    name: string;
    email: string;
    password?: string;
    profile_picture?: string;
    provider?: string;
    provider_id?: string;
    email_verified?: boolean;
    created_at?: string;
    updated_at?: string;
}

interface LoginAttempt {
    user_id?: number;
    email: string;
    ip_address: string;
    user_agent: string;
    success: boolean;
    failure_reason?: string;
}

interface EmailNotification {
    user_id: number;
    email: string;
    type: string;
    subject: string;
    success: boolean;
    error_message?: string;
}

// Initialize database tables
export async function initDatabase() {
    const supabase = await createClient(true); // Use service role

    try {
        // For now, we'll assume tables are already created in Supabase
        // You need to run the SQL from supabase-setup.sql in your Supabase SQL editor
        console.log('Database tables should be created via Supabase SQL editor');
        console.log('Please run the SQL from supabase-setup.sql file');

        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

// User operations
export async function findUserByEmail(email: string): Promise<User | null> {
    const supabase = await createClient(true); // Use service role

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No rows returned
            return null;
        }
        throw error;
    }

    return data;
}

export async function findUserById(id: number): Promise<User | null> {
    const supabase = await createClient(true); // Use service role

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw error;
    }

    return data;
}

export async function createUser(name: string, email: string, hashedPassword: string): Promise<User> {
    const supabase = await createClient(true); // Use service role

    const profilePicture = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.charAt(0))}&size=200&background=10b981&color=fff&format=png&bold=true`;

    const { data, error } = await supabase
        .from('users')
        .insert({
            name,
            email,
            password: hashedPassword,
            profile_picture: profilePicture,
            provider: 'local',
            email_verified: false
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User> {
    const supabase = await createClient(true); // Use service role

    const { data, error } = await supabase
        .from('users')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function deleteUser(id: number): Promise<void> {
    const supabase = await createClient(true); // Use service role

    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

    if (error) {
        throw error;
    }
}

// Login attempts logging
export async function logLoginAttempt(
    userId: number | null,
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
): Promise<void> {
    const supabase = await createClient(true); // Use service role

    const { error } = await supabase
        .from('login_attempts')
        .insert({
            user_id: userId,
            email,
            ip_address: ipAddress,
            user_agent: userAgent,
            success,
            failure_reason: failureReason,
            created_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error logging login attempt:', error);
    }
}

// Email notifications logging
export async function logEmailNotification(
    userId: number,
    email: string,
    type: string,
    subject: string,
    success: boolean,
    errorMessage?: string
): Promise<void> {
    const supabase = await createClient(true); // Use service role

    const { error } = await supabase
        .from('email_notifications')
        .insert({
            user_id: userId,
            email,
            type,
            subject,
            success,
            error_message: errorMessage,
            created_at: new Date().toISOString()
        });

    if (error) {
        console.error('Error logging email notification:', error);
    }
}

// Login history
export async function getLoginHistory(userId: number, limit: number = 10): Promise<any[]> {
    const supabase = await createClient(true); // Use service role

    const { data, error } = await supabase
        .from('login_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        throw error;
    }

    return data || [];
}

// OTP operations
export async function storeOTP(userId: number, otpCode: string, type: string, expiresAt: Date): Promise<void> {
    const supabase = await createClient(true); // Use service role

    const { error } = await supabase
        .from('otps')
        .insert({
            user_id: userId,
            otp_code: otpCode,
            type,
            expires_at: expiresAt.toISOString(),
            used: false,
            created_at: new Date().toISOString()
        });

    if (error) {
        throw error;
    }
}

export async function verifyOTP(userId: number, otpCode: string, type: string): Promise<boolean> {
    const supabase = await createClient(true); // Use service role

    const { data, error } = await supabase
        .from('otps')
        .select('*')
        .eq('user_id', userId)
        .eq('otp_code', otpCode)
        .eq('type', type)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !data) {
        return false;
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
        .from('otps')
        .update({ used: true })
        .eq('id', data.id);

    if (updateError) {
        console.error('Error marking OTP as used:', updateError);
    }

    return true;
}

// Password reset tokens
export async function createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<void> {
    const supabase = await createClient(true); // Use service role

    const { error } = await supabase
        .from('password_reset_tokens')
        .insert({
            user_id: userId,
            token,
            expires_at: expiresAt.toISOString(),
            used: false,
            created_at: new Date().toISOString()
        });

    if (error) {
        throw error;
    }
}

export async function verifyPasswordResetToken(token: string): Promise<number | null> {
    const supabase = await createClient(true); // Use service role

    const { data, error } = await supabase
        .from('password_reset_tokens')
        .select('user_id')
        .eq('token', token)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !data) {
        return null;
    }

    // Mark token as used
    const { error: updateError } = await supabase
        .from('password_reset_tokens')
        .update({ used: true })
        .eq('token', token);

    if (updateError) {
        console.error('Error marking reset token as used:', updateError);
    }

    return data.user_id;
}