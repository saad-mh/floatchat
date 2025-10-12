import { Pool } from 'pg';
import * as argon2 from 'argon2';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Utility function to set user context for RLS
async function setUserContext(client: any, userId?: number) {
    if (userId) {
        await client.query('SELECT set_current_user_id($1)', [userId]);
    }
}

// Utility function to clear user context
async function clearUserContext(client: any) {
    await client.query("SELECT set_config('app.current_user_id', '', false)");
}

export async function initDatabase() {
    const client = await pool.connect();

    try {
        // Create users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        profile_picture VARCHAR(500),
        provider VARCHAR(50) DEFAULT 'local',
        provider_id VARCHAR(255),
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create sessions table
        await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create OTP verification table
        await client.query(`
      CREATE TABLE IF NOT EXISTS otp_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(6) NOT NULL,
        purpose VARCHAR(50) NOT NULL, -- 'email_verification', 'password_reset', 'profile_change'
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP NULL
      )
    `);

        // Create login audit table
        await client.query(`
      CREATE TABLE IF NOT EXISTS login_audits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        location VARCHAR(255),
        success BOOLEAN NOT NULL,
        failure_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Create password reset tokens table
        await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP NULL
      )
    `);

        // Create email notifications log table
        await client.query(`
      CREATE TABLE IF NOT EXISTS email_notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        notification_type VARCHAR(50) NOT NULL, -- 'welcome', 'login_alert', 'password_reset', etc.
        subject VARCHAR(255),
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN NOT NULL,
        error_message TEXT
      )
    `);

        // Create indices for better performance
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_user_purpose ON otp_verifications(user_id, purpose, used);
      CREATE INDEX IF NOT EXISTS idx_login_audits_user ON login_audits(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token, used);
      CREATE INDEX IF NOT EXISTS idx_email_notifications_user ON email_notifications(user_id, notification_type);
    `);

        console.log('Database initialized successfully');
    } finally {
        client.release();
    }
}

// User management functions
export async function findUserByEmail(email: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, name, email, password, profile_picture, provider, provider_id, email_verified, created_at, updated_at FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error finding user by email:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function createUser(name: string, email: string, hashedPassword: string) {
    const client = await pool.connect();
    try {
        // First, try to fetch profile picture from Google/Gravatar
        let profilePicture = null;
        try {
            const avatarResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/auth/fetch-google-avatar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (avatarResponse.ok) {
                const avatarData = await avatarResponse.json();
                if (avatarData.success) {
                    profilePicture = avatarData.profilePicture;
                }
            }
        } catch (error) {
            console.log('Failed to fetch profile picture during user creation:', error);
        }

        // Create user with profile picture if found
        const result = await client.query(
            'INSERT INTO users (name, email, password, profile_picture) VALUES ($1, $2, $3, $4) RETURNING id, name, email, profile_picture, created_at',
            [name, email, hashedPassword, profilePicture]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function updateUser(id: number, updates: { name?: string; email?: string; profile_picture?: string }) {
    const client = await pool.connect();
    try {
        const setParts = [];
        const values = [];
        let paramCount = 1;

        if (updates.name) {
            setParts.push(`name = $${paramCount}`);
            values.push(updates.name);
            paramCount++;
        }

        if (updates.email) {
            setParts.push(`email = $${paramCount}`);
            values.push(updates.email);
            paramCount++;
        }

        if (updates.profile_picture !== undefined) {
            setParts.push(`profile_picture = $${paramCount}`);
            values.push(updates.profile_picture);
            paramCount++;
        }

        if (setParts.length === 0) {
            throw new Error('No updates provided');
        }

        // Add updated_at timestamp
        setParts.push(`updated_at = CURRENT_TIMESTAMP`);

        values.push(id);
        const query = `
            UPDATE users 
            SET ${setParts.join(', ')} 
            WHERE id = $${paramCount} 
            RETURNING id, name, email, profile_picture, created_at, updated_at
        `;

        const result = await client.query(query, values);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function changePassword(id: number, newHashedPassword: string) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'UPDATE users SET password = $1 WHERE id = $2 RETURNING id',
            [newHashedPassword, id]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error changing password:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function deleteUser(id: number) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'DELETE FROM users WHERE id = $1 RETURNING id',
            [id]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error deleting user:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function refreshUserProfilePicture(userId: number, email: string) {
    const client = await pool.connect();
    try {
        // Fetch new profile picture
        let profilePicture = null;
        try {
            const avatarResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/auth/fetch-google-avatar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            if (avatarResponse.ok) {
                const avatarData = await avatarResponse.json();
                if (avatarData.success) {
                    profilePicture = avatarData.profilePicture;
                }
            }
        } catch (error) {
            console.log('Failed to fetch profile picture:', error);
            return null;
        }

        if (profilePicture) {
            const result = await client.query(
                'UPDATE users SET profile_picture = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, name, email, profile_picture',
                [profilePicture, userId]
            );
            return result.rows[0] || null;
        }

        return null;
    } catch (error) {
        console.error('Error refreshing profile picture:', error);
        throw error;
    } finally {
        client.release();
    }
}

export async function findUserById(id: number) {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT id, name, email, password, profile_picture, provider, provider_id, email_verified, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error finding user by ID:', error);
        throw error;
    } finally {
        client.release();
    }
}

// OTP Verification functions
export async function generateOTP(userId: number, email: string, purpose: string): Promise<string> {
    const client = await pool.connect();

    try {
        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Invalidate any existing OTPs for this user and purpose
        await client.query(
            'UPDATE otp_verifications SET used = TRUE WHERE user_id = $1 AND purpose = $2 AND used = FALSE',
            [userId, purpose]
        );

        // Insert new OTP
        await client.query(
            'INSERT INTO otp_verifications (user_id, email, otp_code, purpose, expires_at) VALUES ($1, $2, $3, $4, $5)',
            [userId, email, otp, purpose, expiresAt]
        );

        return otp;
    } finally {
        client.release();
    }
}

export async function verifyOTP(userId: number, otpCode: string, purpose: string): Promise<boolean> {
    const client = await pool.connect();

    try {
        const result = await client.query(
            'SELECT id FROM otp_verifications WHERE user_id = $1 AND otp_code = $2 AND purpose = $3 AND used = FALSE AND expires_at > NOW()',
            [userId, otpCode, purpose]
        );

        if (result.rows.length === 0) {
            return false;
        }

        // Mark OTP as used
        await client.query(
            'UPDATE otp_verifications SET used = TRUE, used_at = NOW() WHERE id = $1',
            [result.rows[0].id]
        );

        // If email verification, update user email_verified status
        if (purpose === 'email_verification') {
            await client.query(
                'UPDATE users SET email_verified = TRUE WHERE id = $1',
                [userId]
            );
        }

        return true;
    } finally {
        client.release();
    }
}

// Login audit functions
export async function logLoginAttempt(
    userId: number | null,
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string,
    location?: string
): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query(
            'INSERT INTO login_audits (user_id, email, ip_address, user_agent, location, success, failure_reason) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, email, ipAddress, userAgent, location, success, failureReason]
        );
    } finally {
        client.release();
    }
}

export async function getLoginHistory(userId: number, limit: number = 10): Promise<any[]> {
    const client = await pool.connect();

    try {
        // Set user context for RLS
        await setUserContext(client, userId);

        const result = await client.query(
            'SELECT ip_address, user_agent, location, success, failure_reason, created_at FROM login_audits WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
            [userId, limit]
        );
        return result.rows;
    } finally {
        await clearUserContext(client);
        client.release();
    }
}

// Password reset token functions
export async function generatePasswordResetToken(userId: number): Promise<string> {
    const client = await pool.connect();

    try {
        // Generate random token
        const token = require('crypto').randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Invalidate any existing tokens
        await client.query(
            'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
            [userId]
        );

        // Insert new token
        await client.query(
            'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [userId, token, expiresAt]
        );

        return token;
    } finally {
        client.release();
    }
}

export async function verifyPasswordResetToken(token: string): Promise<number | null> {
    const client = await pool.connect();

    try {
        const result = await client.query(
            'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
            [token]
        );

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].user_id;
    } finally {
        client.release();
    }
}

export async function usePasswordResetToken(token: string): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query(
            'UPDATE password_reset_tokens SET used = TRUE, used_at = NOW() WHERE token = $1',
            [token]
        );
    } finally {
        client.release();
    }
}

// Email notification logging
export async function logEmailNotification(
    userId: number | null,
    email: string,
    notificationType: string,
    subject: string,
    success: boolean,
    errorMessage?: string
): Promise<void> {
    const client = await pool.connect();

    try {
        await client.query(
            'INSERT INTO email_notifications (user_id, email, notification_type, subject, success, error_message) VALUES ($1, $2, $3, $4, $5, $6)',
            [userId, email, notificationType, subject, success, errorMessage]
        );
    } finally {
        client.release();
    }
}

export async function cleanupExpiredData(): Promise<void> {
    const client = await pool.connect();

    try {
        // Delete expired OTPs
        await client.query('DELETE FROM otp_verifications WHERE expires_at < NOW()');

        // Delete expired password reset tokens
        await client.query('DELETE FROM password_reset_tokens WHERE expires_at < NOW()');

        // Delete old login audits (keep last 6 months)
        await client.query('DELETE FROM login_audits WHERE created_at < NOW() - INTERVAL \'6 months\'');

        // Delete old email notifications (keep last 3 months)
        await client.query('DELETE FROM email_notifications WHERE sent_at < NOW() - INTERVAL \'3 months\'');

        console.log('Expired data cleaned up successfully');
    } finally {
        client.release();
    }
}

export async function closeDbPool() {
    try {
        await pool.end();
        console.log('Database pool closed successfully');
    } catch (error) {
        console.error('Error closing database pool:', error);
    }
}