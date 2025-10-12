"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";
import { useSplash } from "@/components/splash-provider";
import { useAuth } from "@/components/auth-provider";

interface AppWrapperProps {
  children: React.ReactNode;
}

export function AppWrapper({ children }: AppWrapperProps) {
  const { isVisible, setIsVisible } = useSplash();
  const { isAuthenticated, isLoading: authLoading, isLogoutRequested, clearLogoutRequest } = useAuth();
  const [showContent, setShowContent] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Ensure we're on the client side
    setIsClient(true);

    // Always show splash screen on every reload
    setIsVisible(true);
  }, [setIsVisible]);

  const handleSplashComplete = () => {
    // Check authentication status after splash
    if (!authLoading) {
      // If logout was requested, redirect to auth page
      if (isLogoutRequested) {
        clearLogoutRequest();
        router.push("/auth");
        return;
      }

      // If user is not authenticated and not in guest mode, redirect to auth
      if (!isAuthenticated) {
        router.push("/auth");
        return;
      }
    }

    // Show content first, then hide splash for seamless transition
    setShowContent(true);
    setTimeout(() => {
      setIsVisible(false);
      // Ensure scroll position is reset after splash completes
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: 'instant' });
        // Additional scroll reset after content has time to render/load
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }, 100);
      }
    }, 50);
  };

  // Show a simple loading state during SSR
  if (!isClient) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      {isVisible && (
        <SplashScreen onComplete={handleSplashComplete} duration={2800} />
      )}

      <div
        className={`transition-opacity duration-500 ${showContent && !isVisible ? "opacity-100" : "opacity-0"
          }`}
        style={{
          pointerEvents: showContent && !isVisible ? "auto" : "none",
          visibility: showContent && !isVisible ? "visible" : "hidden",
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </div>
    </>
  );
}
