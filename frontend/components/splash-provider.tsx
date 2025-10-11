"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface SplashContextType {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
  showSplash: () => void;
}

const SplashContext = createContext<SplashContextType | null>(null);

interface SplashProviderProps {
  children: ReactNode;
  showOnMount?: boolean;
}

export function SplashProvider({
  children,
  showOnMount = true,
}: SplashProviderProps) {
  const [isVisible, setIsVisible] = useState(showOnMount);

  const showSplash = () => setIsVisible(true);

  return (
    <SplashContext.Provider value={{ isVisible, setIsVisible, showSplash }}>
      {children}
    </SplashContext.Provider>
  );
}

export function useSplash() {
  const context = useContext(SplashContext);
  if (!context) {
    throw new Error("useSplash must be used within a SplashProvider");
  }
  return context;
}
