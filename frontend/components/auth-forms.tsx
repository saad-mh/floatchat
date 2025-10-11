"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/icons/google-icon";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/components/auth-provider";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    agreeToTerms: z.boolean().refine((val) => val === true, {
        message: "You must agree to the terms and conditions",
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface AuthFormsProps {
    mode: "login" | "signup";
    onModeChange: (mode: "login" | "signup") => void;
    onSuccess: () => void;
}

export function AuthForms({ mode, onModeChange, onSuccess }: AuthFormsProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login, signup, loginWithGoogle, isLoading } = useAuth();

    const loginForm = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const signupForm = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: "",
            email: "",
            password: "",
            confirmPassword: "",
            agreeToTerms: false,
        },
    });

    const handleLogin = async (data: LoginFormData) => {
        setError(null);

        try {
            await login(data.email, data.password);
            onSuccess();
        } catch (err) {
            setError("Invalid email or password. Please try again.");
        }
    };

    const handleSignup = async (data: SignupFormData) => {
        setError(null);

        try {
            await signup(data.name, data.email, data.password);
            onSuccess();
        } catch (err) {
            setError("Failed to create account. Please try again.");
        }
    };

    const handleGoogleAuth = async () => {
        try {
            await loginWithGoogle();
            onSuccess();
        } catch (err) {
            setError("Failed to authenticate with Google. Please try again.");
        }
    };

    const formVariants = {
        hidden: { opacity: 0, x: mode === "login" ? -20 : 20 },
        visible: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: mode === "login" ? 20 : -20 },
    };

    return (
        <div className="space-y-6">
            {/* Google Auth Button */}
            <Button
                onClick={handleGoogleAuth}
                disabled={isLoading}
                variant="outline"
                size="lg"
                className="w-full h-12 text-base font-medium border-2"
            >
                {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <GoogleIcon className="mr-2" size={20} />
                )}
                Continue with Google
            </Button>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                </div>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <motion.div
                key={mode}
                variants={formVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.3 }}
            >
                {mode === "login" ? (
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                {...loginForm.register("email")}
                                className={loginForm.formState.errors.email ? "border-destructive" : ""}
                            />
                            {loginForm.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                    {loginForm.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    {...loginForm.register("password")}
                                    className={loginForm.formState.errors.password ? "border-destructive pr-10" : "pr-10"}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                            {loginForm.formState.errors.password && (
                                <p className="text-sm text-destructive">
                                    {loginForm.formState.errors.password.message}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <Link
                                href="/forgot-password"
                                className="text-primary hover:underline"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            size="lg"
                            className="w-full h-12 text-base font-medium"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter your full name"
                                {...signupForm.register("name")}
                                className={signupForm.formState.errors.name ? "border-destructive" : ""}
                            />
                            {signupForm.formState.errors.name && (
                                <p className="text-sm text-destructive">
                                    {signupForm.formState.errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                {...signupForm.register("email")}
                                className={signupForm.formState.errors.email ? "border-destructive" : ""}
                            />
                            {signupForm.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                    {signupForm.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a password"
                                    {...signupForm.register("password")}
                                    className={signupForm.formState.errors.password ? "border-destructive pr-10" : "pr-10"}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                            {signupForm.formState.errors.password && (
                                <p className="text-sm text-destructive">
                                    {signupForm.formState.errors.password.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Confirm your password"
                                    {...signupForm.register("confirmPassword")}
                                    className={signupForm.formState.errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </Button>
                            </div>
                            {signupForm.formState.errors.confirmPassword && (
                                <p className="text-sm text-destructive">
                                    {signupForm.formState.errors.confirmPassword.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-start space-x-2">
                                <input
                                    id="agreeToTerms"
                                    type="checkbox"
                                    {...signupForm.register("agreeToTerms")}
                                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <Label htmlFor="agreeToTerms" className="text-sm leading-5">
                                    I agree to the{" "}
                                    <a href="/terms" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                                        Terms of Service
                                    </a>{" "}
                                    and{" "}
                                    <a href="/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                                        Privacy Policy
                                    </a>
                                </Label>
                            </div>
                            {signupForm.formState.errors.agreeToTerms && (
                                <p className="text-sm text-destructive">
                                    {signupForm.formState.errors.agreeToTerms.message}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            size="lg"
                            className="w-full h-12 text-base font-medium"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </Button>
                    </form>
                )}
            </motion.div>

            <div className="text-center">
                <p className="text-sm text-muted-foreground">
                    {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                        onClick={() => onModeChange(mode === "login" ? "signup" : "login")}
                        className="text-primary hover:underline font-medium"
                    >
                        {mode === "login" ? "Sign up" : "Sign in"}
                    </button>
                </p>
            </div>
        </div>
    );
}