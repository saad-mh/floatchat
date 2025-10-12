"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
            // Check localStorage for session
            const guestMode = localStorage.getItem("floatchat_guest_mode");
            const userSession = localStorage.getItem("floatchat_user_session");

            if (guestMode === "true") {
                setIsGuest(true);
            } else if (userSession) {
                // TODO: Validate session with backend
                const userData = JSON.parse(userSession);
                setUser(userData);
            }
        } catch (error) {
            console.error("Auth check failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            // TODO: Implement actual login API call
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Login failed with status:', response.status);
                console.error('Error details:', errorData);
                throw new Error(errorData.error || "Login failed");
            }

            const userData = await response.json();
            setUser(userData.user); // Extract the user object from the response
            localStorage.setItem("floatchat_user_session", JSON.stringify(userData.user));
            localStorage.removeItem("floatchat_guest_mode");
        } catch (error) {
            console.error("Login error:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const signup = async (name: string, email: string, password: string) => {
        setIsLoading(true);
        try {
            // TODO: Implement actual signup API call
            const response = await fetch("/api/auth/signup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, email, password }),
            });

            if (!response.ok) {
                throw new Error("Signup failed");
            }

            const userData = await response.json();
            setUser(userData.user); // Extract the user object from the response
            localStorage.setItem("floatchat_user_session", JSON.stringify(userData.user));
            localStorage.removeItem("floatchat_guest_mode");
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
            // TODO: Implement Google OAuth
            // This would typically redirect to Google OAuth or open a popup
            window.location.href = "/api/auth/google";
        } catch (error) {
            console.error("Google login error:", error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setIsLogoutRequested(true);
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