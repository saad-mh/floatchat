import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // App password for Gmail
  },
});

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"FloatChat" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

// Email templates
export const emailTemplates = {
  welcome: (name: string, email: string) => ({
    subject: 'Welcome to FloatChat! 🌊',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to FloatChat</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <h2>Welcome aboard, ${name}! 🎉</h2>
            <p>Thank you for joining FloatChat! We're excited to have you explore the world of oceanographic data and marine insights.</p>
            <p>Here's what you can do with your new account:</p>
            <ul>
              <li>🌊 Explore oceanographic data visualizations</li>
              <li>💬 Chat with our AI about marine science</li>
              <li>📊 Generate custom reports and charts</li>
              <li>🗺️ Discover global ocean patterns</li>
            </ul>
            <a href="${process.env.APP_URL || process.env.NEXTAUTH_URL}" class="button">Start Exploring</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy exploring!<br>The FloatChat Team</p>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
            <p>This email was sent to ${email} because you signed up for a FloatChat account.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  loginAlert: (name: string, loginInfo: { ip: string; userAgent: string; location?: string; timestamp: Date }) => ({
    subject: 'New Login to Your FloatChat Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Alert</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .alert-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <h2>New Login Detected</h2>
            <p>Hello ${name},</p>
            <p>We detected a new login to your FloatChat account. Here are the details:</p>
            <div class="alert-box">
              <strong>Login Details:</strong><br>
              📅 Time: ${loginInfo.timestamp.toLocaleString()}<br>
              🌍 IP Address: ${loginInfo.ip}<br>
              💻 Device: ${loginInfo.userAgent}<br>
              ${loginInfo.location ? `📍 Location: ${loginInfo.location}<br>` : ''}
            </div>
            <p>If this was you, you can safely ignore this email.</p>
            <p><strong>If this wasn't you:</strong></p>
            <ul>
              <li>Change your password immediately</li>
              <li>Review your account activity</li>
              <li>Contact our support team</li>
            </ul>
            <a href="${process.env.APP_URL || process.env.NEXTAUTH_URL}/settings" class="button">Secure My Account</a>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
            <p>This is an automated security alert.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  passwordReset: (name: string, resetToken: string) => ({
    subject: 'Reset Your FloatChat Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0; color: #856404; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello ${name},</p>
            <p>You requested to reset your password for your FloatChat account. Click the button below to create a new password:</p>
            <a href="${process.env.APP_URL || process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}" class="button">Reset Password</a>
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This link will expire in 1 hour</li>
                <li>You can only use this link once</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace;">
              ${process.env.APP_URL || process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}
            </p>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
            <p>This email was sent because a password reset was requested for this account.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  accountDeleted: (name: string) => ({
    subject: `Farewell, ${name} 💙 We'll Miss You! - FloatChat`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Deleted</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <h2>💙 Farewell from the FloatChat Family</h2>
            <p>Dear ${name},</p>
            <p>It's with a heavy heart that we confirm your FloatChat account has been permanently deleted as you requested. 🌊💔</p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
              <h3 style="margin: 0; color: white;">Thank You for the Journey! 🐠</h3>
              <p style="margin: 15px 0 0 0; opacity: 0.9;">Every conversation, every insight, every moment you spent exploring the ocean's mysteries with us has been truly special.</p>
            </div>

            <p><strong>What we'll miss about you:</strong></p>
            <ul>
              <li>🌊 Your curiosity about oceanographic data</li>
              <li>💭 The thoughtful questions you asked</li>
              <li>🔍 Your passion for marine science exploration</li>
              <li>✨ Being part of our growing community</li>
            </ul>

            <p><strong>Your data is now safely removed:</strong></p>
            <ul>
              <li>All personal information has been deleted</li>
              <li>Your conversations are no longer stored</li>
              <li>This action cannot be undone</li>
            </ul>

            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0; color: #856404;">
              <strong>🚪 The Ocean Door is Always Open</strong><br>
              If you ever feel the call of the ocean again, we'd be absolutely thrilled to welcome you back! The marine world is constantly evolving, and there's always something new to discover. 
            </div>

            <p>If you deleted your account by mistake or just want to say hello, please reach out to our support team within 30 days. We're always here to help! 🤗</p>

            <p style="margin-top: 30px;">Until the tides bring us together again... 🌊</p>
            <p><strong>With warm wishes and ocean waves,<br>The FloatChat Team 🐙💙</strong></p>

            <p style="font-style: italic; color: #666; margin-top: 25px;">"The sea, once it casts its spell, holds one in its net of wonder forever." - Jacques Cousteau</p>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  emailVerification: (name: string, otp: string) => ({
    subject: 'Verify Your Email Address - FloatChat',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .otp-box { background: #f8f9fa; border: 2px solid #0066cc; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #0066cc; letter-spacing: 8px; font-family: monospace; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hello ${name},</p>
            <p>Please enter the following verification code to confirm your email address:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">This code expires in 10 minutes</p>
            </div>
            <p><strong>Why verify your email?</strong></p>
            <ul>
              <li>Secure your account</li>
              <li>Receive important notifications</li>
              <li>Enable password recovery</li>
            </ul>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
            <p>This verification code was requested for your FloatChat account.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  passwordChangeOTP: (name: string, otp: string) => ({
    subject: 'Password Change Verification - FloatChat',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Change Verification</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .otp-box { background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #856404; letter-spacing: 8px; font-family: monospace; }
          .warning-box { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 15px; margin: 20px 0; color: #721c24; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <h2>🔒 Password Change Verification</h2>
            <p>Hello ${name},</p>
            <p>We received a request to change your password. Please enter the following verification code to confirm this change:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <p style="margin: 10px 0 0 0; color: #856404; font-size: 14px;">This code expires in 10 minutes</p>
            </div>
            <div class="warning-box">
              <strong>⚠️ Security Notice:</strong> If you didn't request this password change, please ignore this email and consider securing your account.
            </div>
            <p><strong>After entering this code:</strong></p>
            <ul>
              <li>Your password will be updated immediately</li>
              <li>You'll receive a confirmation email</li>
              <li>All active sessions will remain valid</li>
            </ul>
            <p>This verification helps ensure that only you can change your password.</p>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
            <p>This verification code was requested for your FloatChat account password change.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  passwordChanged: (name: string) => ({
    subject: 'Password Changed Successfully - FloatChat',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .success-box { background: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 15px; margin: 20px 0; color: #155724; }
          .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <h2>Password Changed Successfully</h2>
            <p>Hello ${name},</p>
            <div class="success-box">
              ✅ Your password has been successfully changed at ${new Date().toLocaleString()}.
            </div>
            <p>Your account is now secured with your new password.</p>
            <p><strong>If you didn't make this change:</strong></p>
            <ul>
              <li>Someone may have unauthorized access to your account</li>
              <li>Contact our support team immediately</li>
              <li>Review your recent account activity</li>
            </ul>
            <a href="${process.env.APP_URL || process.env.NEXTAUTH_URL}/settings" class="button">Review Account Security</a>
            <p>For your security, we recommend:</p>
            <ul>
              <li>Using a unique, strong password</li>
              <li>Enabling two-factor authentication</li>
              <li>Regularly monitoring your account activity</li>
            </ul>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
            <p>This is an automated security notification.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  profileUpdated: (name: string, changes: string[]) => ({
    subject: 'Profile Updated - FloatChat',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Profile Updated</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .info-box { background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 15px; margin: 20px 0; color: #0c5460; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <h2>Profile Updated</h2>
            <p>Hello ${name},</p>
            <p>Your FloatChat profile has been successfully updated at ${new Date().toLocaleString()}.</p>
            <div class="info-box">
              <strong>Changes made:</strong>
              <ul>
                ${changes.map(change => `<li>${change}</li>`).join('')}
              </ul>
            </div>
            <p>If you didn't make these changes, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
            <p>This is an automated notification.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  logoutNotification: (name: string, logoutInfo: { ip: string; userAgent: string; timestamp: Date }) => ({
    subject: `Until Next Time, ${name}! 👋 - FloatChat`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Logout Confirmation</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .info-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <h2>👋 Until We Meet Again, ${name}!</h2>
            <p>You've successfully logged out of your FloatChat account, and we wanted to take a moment to say thank you for spending time with us today! 🌊💙</p>
            
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 25px; text-align: center; margin: 25px 0;">
              <h3 style="margin: 0; color: white;">Thanks for the Ocean Adventure! 🐠</h3>
              <p style="margin: 15px 0 0 0; opacity: 0.9;">Every question you asked and every insight you discovered makes the marine world a little brighter.</p>
            </div>

            <div class="info-box">
              <strong>Session Summary:</strong><br>
              📅 Logout Time: ${logoutInfo.timestamp.toLocaleString()}<br>
              🌍 IP Address: ${logoutInfo.ip}<br>
              💻 Device: ${logoutInfo.userAgent}
            </div>
            
            <p>✅ <strong>Your account is safe and sound:</strong></p>
            <ul>
              <li>🔒 All active sessions have been securely ended</li>
              <li>🛡️ Your data remains protected and private</li>
              <li>💤 Your conversations are safely stored for your return</li>
            </ul>

            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 25px 0; color: #155724;">
              <strong>🌊 The Ocean Awaits Your Return!</strong><br>
              Whether you're back in a few minutes or a few days, we'll be here with fresh data, new insights, and endless marine mysteries to explore together. Your next discovery is just a login away! 
            </div>

            <p><strong>When you're ready to dive back in:</strong></p>
            <ul>
              <li>🔍 Explore the latest oceanographic data</li>
              <li>💬 Continue your fascinating conversations</li>
              <li>📊 Create new visualizations and reports</li>
              <li>🌏 Discover patterns across the global ocean</li>
            </ul>

            <a href="${process.env.APP_URL || process.env.NEXTAUTH_URL}" class="button">Jump Back In! 🌊</a>
            
            <p style="margin-top: 30px;">Thanks for making our ocean data community more vibrant. We can't wait to see what you'll discover next! 🐙</p>
            <p><strong>Wishing you calm seas and following winds,<br>The FloatChat Team 💙🌊</strong></p>

            <p style="font-size: 12px; color: #888; margin-top: 20px;">If you didn't log out or notice any suspicious activity, please contact our support team immediately.</p>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
            <p>This is an automated security notification.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  welcomeBack: (name: string, loginInfo: { ip: string; lastLogin?: Date; sessionCount?: number }) => ({
    subject: 'Welcome Back to FloatChat! 🌊',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome Back</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #eee; }
          .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
          .content { padding: 30px 0; }
          .welcome-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0; }
          .stats-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px 0; border-top: 1px solid #eee; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">FloatChat 🌊</div>
          </div>
          <div class="content">
            <div class="welcome-box">
              <h2 style="margin: 0; color: white;">Welcome Back, ${name}! 🎉</h2>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Great to see you diving back into ocean data!</p>
            </div>
            <p>We're excited to have you back exploring the depths of oceanographic insights. Here's what's been happening:</p>
            <div class="stats-box">
              <strong>Your Session Info:</strong><br>
              ${loginInfo.lastLogin ? `🕒 Last Login: ${loginInfo.lastLogin.toLocaleDateString()}<br>` : ''}
              ${loginInfo.sessionCount ? `📊 Total Sessions: ${loginInfo.sessionCount}<br>` : ''}
              🌍 Current IP: ${loginInfo.ip}
            </div>
            <p>🌊 <strong>Ready to explore?</strong></p>
            <ul>
              <li>Check out the latest oceanographic data</li>
              <li>Continue your previous conversations</li>
              <li>Discover new marine insights</li>
              <li>Generate fresh data visualizations</li>
            </ul>
            <a href="${process.env.APP_URL || process.env.NEXTAUTH_URL}" class="button">Start Exploring</a>
            <p>Happy data diving!<br>The FloatChat Team 🐠</p>
          </div>
          <div class="footer">
            <p>© 2025 FloatChat. All rights reserved.</p>
            <p>This welcome message was sent because you logged into your FloatChat account.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};