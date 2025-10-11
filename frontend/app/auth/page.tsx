"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthForms } from "@/components/auth-forms";
import { useAuth } from "@/components/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Users, LogIn, UserPlus } from "lucide-react";

export default function AuthPage() {
    const [authMode, setAuthMode] = useState<"welcome" | "login" | "signup">("welcome");
    const { continueAsGuest } = useAuth();
    const router = useRouter();

    const handleContinueAsGuest = () => {
        continueAsGuest();
        router.push("/");
    };

    const handleAuthSuccess = () => {
        router.push("/");
    };

    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        },
        exit: {
            opacity: 0,
            y: -20,
            transition: { duration: 0.3 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-4 relative">
            {/* Theme toggle in top-right corner */}
            <div className="absolute top-4 right-4">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md">
                <AnimatePresence mode="wait">
                    {authMode === "welcome" && (
                        <motion.div
                            key="welcome"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="space-y-6"
                        >
                            <motion.div variants={itemVariants} className="text-center space-y-4">
                                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <img
                                        src="/logo.svg"
                                        alt="FloatChat Logo"
                                        className="w-12 h-12"
                                    />
                                </div>
                                <h1 className="text-3xl font-bold text-foreground">Welcome to FloatChat</h1>
                                <p className="text-muted-foreground text-lg">
                                    Access oceanographic data through natural conversation
                                </p>
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-3">
                                <Button
                                    onClick={handleContinueAsGuest}
                                    variant="outline"
                                    size="lg"
                                    className="w-full h-12 text-base font-medium"
                                >
                                    <Users className="mr-2 h-5 w-5" />
                                    Continue as Guest
                                </Button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={() => setAuthMode("login")}
                                    variant="default"
                                    size="lg"
                                    className="w-full h-12 text-base font-medium"
                                >
                                    <LogIn className="mr-2 h-5 w-5" />
                                    Log In
                                </Button>

                                <Button
                                    onClick={() => setAuthMode("signup")}
                                    variant="secondary"
                                    size="lg"
                                    className="w-full h-12 text-base font-medium"
                                >
                                    <UserPlus className="mr-2 h-5 w-5" />
                                    Sign Up
                                </Button>
                            </motion.div>

                            <motion.div variants={itemVariants} className="text-center">
                                <p className="text-xs text-muted-foreground">
                                    By continuing, you agree to our{" "}
                                    <a href="/terms" className="text-primary hover:underline">
                                        Terms of Service
                                    </a>{" "}
                                    and{" "}
                                    <a href="/privacy" className="text-primary hover:underline">
                                        Privacy Policy
                                    </a>
                                </p>
                            </motion.div>
                        </motion.div>
                    )}

                    {(authMode === "login" || authMode === "signup") && (
                        <motion.div
                            key="auth-forms"
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                        >
                            <Card className="shadow-xl border-0">
                                <CardHeader className="text-center space-y-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setAuthMode("welcome")}
                                        className="absolute left-4 top-4"
                                    >
                                        ← Back
                                    </Button>
                                    <CardTitle className="text-2xl font-bold">
                                        {authMode === "login" ? "Welcome back" : "Create account"}
                                    </CardTitle>
                                    <CardDescription>
                                        {authMode === "login"
                                            ? "Sign in to your FloatChat account"
                                            : "Get started with FloatChat today"
                                        }
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <AuthForms
                                        mode={authMode}
                                        onModeChange={setAuthMode}
                                        onSuccess={handleAuthSuccess}
                                    />
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}