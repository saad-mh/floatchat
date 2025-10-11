'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Shield, Calendar, LogOut, UserCheck } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';

export default function ProfilePage() {
  const { user, updateUser, logout } = useAuth();
  const router = useRouter();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const sendOtp = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/auth/generate-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          purpose: 'email_verification',
        }),
      });

      if (response.ok) {
        setOtpSent(true);
        setMessage({ type: 'success', text: 'OTP sent to your email address!' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to send OTP' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send OTP. Please try again.' });
    }
  };

  const verifyOtp = async () => {
    if (!user || !otpCode) return;

    setIsVerifyingOtp(true);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          otpCode,
          purpose: 'email_verification',
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Email verified successfully!' });
        setShowOtpDialog(false);
        setOtpCode('');
        setOtpSent(false);
        // Update user context to reflect email verification
        if (updateUser) {
          updateUser({ ...user });
        }
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Invalid OTP code' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to verify OTP. Please try again.' });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          name,
          email,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (updateUser) {
          updateUser(data.user);
        }
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  if (!user) {
    router.push('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Profile</h1>
                <p className="text-gray-600 dark:text-gray-400">Manage your account information</p>
              </div>
              <Link href="/">
                <Button variant="outline">← Back to Chat</Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Profile Info Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and account information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user.profile_picture || ''} alt={user.name} />
                    <AvatarFallback className="text-lg">
                      {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{user.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {user.provider === 'google' ? (
                        <Badge variant="secondary">Google Account</Badge>
                      ) : (
                        <Badge variant="outline">Local Account</Badge>
                      )}
                      <Badge variant={user.email_verified ? 'default' : 'destructive'}>
                        {user.email_verified ? '✓ Verified' : '✗ Unverified'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {message && (
                  <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-4">
                    <AlertDescription>{message.text}</AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
                    {isLoading ? 'Updating...' : 'Update Profile'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Account Security Card */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Account Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Verification</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.email_verified ? 'Your email is verified' : 'Verify your email address'}
                      </p>
                    </div>
                    {!user.email_verified && (
                      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <UserCheck className="w-4 h-4 mr-2" />
                            Verify
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Verify Your Email</DialogTitle>
                            <DialogDescription>
                              We'll send a verification code to your email address.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {!otpSent ? (
                              <Button onClick={sendOtp} className="w-full">
                                Send Verification Code
                              </Button>
                            ) : (
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="otp">Verification Code</Label>
                                  <Input
                                    id="otp"
                                    type="text"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    maxLength={6}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={verifyOtp}
                                    disabled={isVerifyingOtp || !otpCode}
                                    className="flex-1"
                                  >
                                    {isVerifyingOtp ? 'Verifying...' : 'Verify Code'}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={sendOtp}
                                    className="flex-1"
                                  >
                                    Resend Code
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.provider === 'google' ? 'Managed by Google' : 'Change your password'}
                      </p>
                    </div>
                    {user.provider !== 'google' && (
                      <Link href="/settings">
                        <Button variant="outline" size="sm">
                          Change
                        </Button>
                      </Link>
                    )}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Account Created</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/settings">
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="w-4 h-4 mr-2" />
                      Account Settings
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}