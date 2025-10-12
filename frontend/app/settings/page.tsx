'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useSplash } from '@/components/splash-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    Settings,
    Shield,
    Eye,
    EyeOff,
    Trash2,
    AlertTriangle,
    Monitor,
    History,
    Bell,
    Globe,
    Palette
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from 'next-themes';
import Link from 'next/link';

interface LoginEntry {
    ip_address: string;
    user_agent: string;
    location?: string;
    success: boolean;
    failure_reason?: string;
    created_at: string;
}

export default function SettingsPage() {
    const { user, logout, isLoading: authLoading } = useAuth();
    const { showSplash } = useSplash();
    const router = useRouter();
    const { theme, setTheme } = useTheme();

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // OTP state for password change
    const [otpCode, setOtpCode] = useState('');
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [isGeneratingOtp, setIsGeneratingOtp] = useState(false);
    const [otpCooldown, setOtpCooldown] = useState(0);

    // Settings state
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [loginAlerts, setLoginAlerts] = useState(true);
    const [marketingEmails, setMarketingEmails] = useState(false);
    const [language, setLanguage] = useState('en');

    // UI state
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    // Login history state
    const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    // Load login history
    useEffect(() => {
        if (user) {
            loadLoginHistory();
        }
    }, [user]);

    // OTP cooldown effect
    useEffect(() => {
        if (otpCooldown > 0) {
            const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpCooldown]);

    const generateOTP = async () => {
        if (!user) return;

        setIsGeneratingOtp(true);
        setMessage(null);

        try {
            const response = await fetch('/api/auth/generate-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    purpose: 'password_change'
                }),
            });

            if (response.ok) {
                setIsOtpSent(true);
                setOtpCooldown(60); // 60 second cooldown
                setMessage({
                    type: 'success',
                    text: 'OTP sent to your email. Please check your inbox.'
                });
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Failed to send OTP' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to send OTP. Please try again.' });
        } finally {
            setIsGeneratingOtp(false);
        }
    };

    const loadLoginHistory = async () => {
        if (!user) return;

        try {
            const response = await fetch(`/api/auth/login-history?userId=${user.id}&limit=10`);
            if (response.ok) {
                const data = await response.json();
                setLoginHistory(data.loginHistory);
            }
        } catch (error) {
            console.error('Failed to load login history:', error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Password must be at least 8 characters long' });
            return;
        }

        if (!isOtpSent || !otpCode) {
            setMessage({ type: 'error', text: 'Please generate and enter OTP code first' });
            return;
        }

        setMessage(null);
        setIsChangingPassword(true);

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    currentPassword,
                    newPassword,
                    otpCode,
                }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Password changed successfully!' });
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setOtpCode('');
                setIsOtpSent(false);
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Failed to change password' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to change password. Please try again.' });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user || deleteConfirmText !== 'DELETE') return;

        setIsDeletingAccount(true);

        try {
            const response = await fetch('/api/auth/delete-account', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    password: deletePassword,
                }),
            });

            if (response.ok) {
                logout();
                showSplash();
                // No immediate redirect - AppWrapper will handle it after splash
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.error || 'Failed to delete account' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to delete account. Please try again.' });
        } finally {
            setIsDeletingAccount(false);
            setShowDeleteConfirm(false);
        }
    };

    const saveSettings = () => {
        // Save settings to localStorage for now
        const settings = {
            emailNotifications,
            loginAlerts,
            marketingEmails,
            language,
        };
        localStorage.setItem('floatchat-settings', JSON.stringify(settings));
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
    };

    // Load settings on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('floatchat-settings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            setEmailNotifications(settings.emailNotifications ?? true);
            setLoginAlerts(settings.loginAlerts ?? true);
            setMarketingEmails(settings.marketingEmails ?? false);
            setLanguage(settings.language ?? 'en');
        }
    }, []);

    // Handle redirect if user is not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/auth');
        }
    }, [user, authLoading, router]);

    // Show loading while auth is checking or while redirecting
    if (authLoading || (!user && !authLoading)) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    // At this point, we know user exists due to the guard clause above
    if (!user) return null;

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
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                                <p className="text-gray-600 dark:text-gray-400">Manage your account preferences and security</p>
                            </div>
                            <div className="flex gap-2">
                                <Link href="/profile">
                                    <Button variant="outline">← Profile</Button>
                                </Link>
                                <Link href="/">
                                    <Button variant="outline">← Back to Chat</Button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className="mb-6">
                            <AlertDescription>{message.text}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Main Settings */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Appearance Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Palette className="w-5 h-5" />
                                        Appearance
                                    </CardTitle>
                                    <CardDescription>
                                        Customize how FloatChat looks and feels
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Theme</Label>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Choose your preferred color scheme
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={theme === 'light' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setTheme('light')}
                                            >
                                                Light
                                            </Button>
                                            <Button
                                                variant={theme === 'dark' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setTheme('dark')}
                                            >
                                                Dark
                                            </Button>
                                            <Button
                                                variant={theme === 'system' ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setTheme('system')}
                                            >
                                                <Monitor className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notification Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Bell className="w-5 h-5" />
                                        Notifications
                                    </CardTitle>
                                    <CardDescription>
                                        Control what notifications you receive
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Email Notifications</Label>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Receive important account updates via email
                                            </p>
                                        </div>
                                        <Switch
                                            checked={emailNotifications}
                                            onCheckedChange={setEmailNotifications}
                                        />
                                    </div>

                                    <Separator />

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Login Alerts</Label>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Get notified when someone logs into your account
                                            </p>
                                        </div>
                                        <Switch
                                            checked={loginAlerts}
                                            onCheckedChange={setLoginAlerts}
                                        />
                                    </div>

                                    <Separator />

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Marketing Emails</Label>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Receive updates about new features and tips
                                            </p>
                                        </div>
                                        <Switch
                                            checked={marketingEmails}
                                            onCheckedChange={setMarketingEmails}
                                        />
                                    </div>

                                    <div className="pt-4">
                                        <Button onClick={saveSettings}>
                                            Save Notification Settings
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Language Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Globe className="w-5 h-5" />
                                        Language & Region
                                    </CardTitle>
                                    <CardDescription>
                                        Set your language and regional preferences
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label>Language</Label>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Choose your preferred language
                                            </p>
                                        </div>
                                        <select
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
                                            className="px-3 py-2 border rounded-md bg-background"
                                        >
                                            <option value="en">English</option>
                                            <option value="es">Español</option>
                                            <option value="fr">Français</option>
                                            <option value="de">Deutsch</option>
                                            <option value="ja">日本語</option>
                                        </select>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Security Settings */}
                            {user.provider !== 'google' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Shield className="w-5 h-5" />
                                            Change Password
                                        </CardTitle>
                                        <CardDescription>
                                            Update your account password
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <form onSubmit={handlePasswordChange} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="currentPassword">Current Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="currentPassword"
                                                        type={showCurrentPassword ? 'text' : 'password'}
                                                        value={currentPassword}
                                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                                        placeholder="Enter current password"
                                                        required
                                                        className="pr-10"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                    >
                                                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="newPassword">New Password</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="newPassword"
                                                            type={showNewPassword ? 'text' : 'password'}
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            placeholder="Enter new password"
                                                            required
                                                            className="pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                        >
                                                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                                    <div className="relative">
                                                        <Input
                                                            id="confirmPassword"
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            placeholder="Confirm new password"
                                                            required
                                                            className="pr-10"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                        >
                                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* OTP Verification */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <Label>Email Verification</Label>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={generateOTP}
                                                        disabled={isGeneratingOtp || otpCooldown > 0}
                                                    >
                                                        {isGeneratingOtp ? 'Sending...' :
                                                            otpCooldown > 0 ? `Resend in ${otpCooldown}s` :
                                                                isOtpSent ? 'Resend OTP' : 'Send OTP'}
                                                    </Button>
                                                </div>

                                                {isOtpSent && (
                                                    <div>
                                                        <Label htmlFor="otpCode">Enter OTP Code</Label>
                                                        <Input
                                                            id="otpCode"
                                                            type="text"
                                                            value={otpCode}
                                                            onChange={(e) => setOtpCode(e.target.value)}
                                                            placeholder="Enter 6-digit OTP"
                                                            maxLength={6}
                                                            className="mt-1"
                                                        />
                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                            Check your email for the verification code
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            <Button type="submit" disabled={isChangingPassword || !isOtpSent || !otpCode}>
                                                {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Danger Zone */}
                            <Card className="border-red-200 dark:border-red-800">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                                        <AlertTriangle className="w-5 h-5" />
                                        Danger Zone
                                    </CardTitle>
                                    <CardDescription>
                                        Irreversible and destructive actions
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {!showDeleteConfirm ? (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">Delete Account</p>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                                    Permanently delete your account and all associated data
                                                </p>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                onClick={() => setShowDeleteConfirm(true)}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete Account
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <Alert variant="destructive">
                                                <AlertTriangle className="w-4 h-4" />
                                                <AlertDescription>
                                                    This action cannot be undone. This will permanently delete your account and remove all your data.
                                                </AlertDescription>
                                            </Alert>

                                            <div className="space-y-4">
                                                <div>
                                                    <Label>Type "DELETE" to confirm</Label>
                                                    <Input
                                                        value={deleteConfirmText}
                                                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                                                        placeholder="DELETE"
                                                    />
                                                </div>

                                                {user.provider !== 'google' && (
                                                    <div>
                                                        <Label>Enter your password to confirm</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={showDeletePassword ? 'text' : 'password'}
                                                                value={deletePassword}
                                                                onChange={(e) => setDeletePassword(e.target.value)}
                                                                placeholder="Enter your password"
                                                                className="pr-10"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowDeletePassword(!showDeletePassword)}
                                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                            >
                                                                {showDeletePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="destructive"
                                                        onClick={handleDeleteAccount}
                                                        disabled={isDeletingAccount || deleteConfirmText !== 'DELETE' || (user.provider !== 'google' && !deletePassword)}
                                                    >
                                                        {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setShowDeleteConfirm(false);
                                                            setDeleteConfirmText('');
                                                            setDeletePassword('');
                                                        }}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar - Login History */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <History className="w-5 h-5" />
                                        Recent Login Activity
                                    </CardTitle>
                                    <CardDescription>
                                        Your recent login attempts and locations
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isLoadingHistory ? (
                                        <div className="space-y-3">
                                            {[...Array(3)].map((_, i) => (
                                                <div key={i} className="animate-pulse">
                                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {loginHistory.slice(0, 5).map((entry, index) => (
                                                <div key={index} className="border-b last:border-b-0 pb-3 last:pb-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <Badge variant={entry.success ? 'default' : 'destructive'}>
                                                            {entry.success ? 'Success' : 'Failed'}
                                                        </Badge>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(entry.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium">IP: {entry.ip_address}</p>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                                        {entry.user_agent}
                                                    </p>
                                                    {!entry.success && entry.failure_reason && (
                                                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                            {entry.failure_reason}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                            {loginHistory.length === 0 && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">
                                                    No login history available
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}