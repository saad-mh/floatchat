"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getBaseUrl } from "@/lib/environment";

interface User {
    id: string | number; // Allow both string and number for compatibility
    name: string;
    email: string;
    profilePicture?: string;
    profile_picture?: string; // Support both naming conventions
    created_at?: string; // Add created_at timestamp
    provider?: string; // 'local', 'google', etc.
    email_verified?: boolean; // Email verification status
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    isGuest: boolean;
    isLogoutRequested: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => void;
    continueAsGuest: () => void;
    updateUser: (userData: Partial<User>) => void;
    clearLogoutRequest: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGuest, setIsGuest] = useState(false);
    const [isLogoutRequested, setIsLogoutRequested] = useState(false);

    useEffect(() => {
        // Check if user is logged in on app start
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        setIsLoading(true);
        try {
            // Check server session instead of localStorage
            const response = await fetch('/api/auth/session', {
                credentials: 'include' // Include cookies
            });

            if (response.ok) {
                const data = await response.json();
                if (data.authenticated && data.user) {
                    setUser(data.user);
                    setIsGuest(false);
                } else {
                    // Check localStorage for guest mode
                    const guestMode = localStorage.getItem("floatchat_guest_mode");
                    if (guestMode === "true") {
                        setIsGuest(true);
                    }
                }
            } else {
                // Check localStorage for guest mode
                const guestMode = localStorage.getItem("floatchat_guest_mode");
                if (guestMode === "true") {
                    setIsGuest(true);
                }
            }
        } catch (error) {
            console.error("Auth status check failed:", error);
            // Fallback to localStorage check for guest mode
            const guestMode = localStorage.getItem("floatchat_guest_mode");
            if (guestMode === "true") {
                setIsGuest(true);
            }
        } finally {
            setIsLoading(false);
        }
    }; const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include' // Include cookies
            });

            const userData = await response.json();

            if (!response.ok) {
                throw new Error(userData.error || "Login failed");
            }

            setUser(userData.user);
            setIsGuest(false);
            // Remove localStorage usage - session is now handled server-side

        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (name: string, email: string, password: string) => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, email, password }),
                credentials: 'include' // Include cookies
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Signup failed");
            }

            const userData = await response.json();
            setUser(userData.user);
            setIsGuest(false);
            // Remove localStorage usage - session is now handled server-side
        } catch (error) {
            console.error("Signup error:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const loginWithGoogle = async () => {
        setIsLoading(true);
        try {
            // Get the current base URL dynamically
            const baseUrl = getBaseUrl();
            window.location.href = `${baseUrl}/api/auth/google`;
        } catch (error) {
            console.error("Google login error:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLogoutRequested(true);
        try {
            // Call logout API to clear server session
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout API call failed:', error);
        }

        setUser(null);
        setIsGuest(false);
        localStorage.removeItem("floatchat_user_session");
        localStorage.removeItem("floatchat_guest_mode");
        // Don't automatically redirect - let the calling code handle it
    };

    const continueAsGuest = () => {
        setIsGuest(true);
        localStorage.setItem("floatchat_guest_mode", "true");
        localStorage.removeItem("floatchat_user_session");
    };

    const updateUser = (userData: Partial<User>) => {
        if (user) {
            const updatedUser = { ...user, ...userData };
            setUser(updatedUser);
            localStorage.setItem("floatchat_user_session", JSON.stringify(updatedUser));
        }
    };

    const clearLogoutRequest = () => {
        setIsLogoutRequested(false);
    };

    const isAuthenticated = !!user || isGuest;

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated,
            isGuest,
            isLogoutRequested,
            login,
            signup,
            loginWithGoogle,
            logout,
            continueAsGuest,
            updateUser,
            clearLogoutRequest,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}