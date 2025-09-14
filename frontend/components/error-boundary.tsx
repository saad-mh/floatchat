"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("Error caught by ErrorBoundary:", error, errorInfo);
    if (
      error.message.includes("_scrollZoom") ||
      error.message.includes("plotly")
    ) {
      console.warn("Plotly error suppressed:", error.message);
      return;
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} retry={this.retry} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error; retry: () => void }> = ({
  error,
  retry,
}) => (
  <div className="flex items-center justify-center h-full w-full bg-muted/20 rounded-lg border border-border">
    <div className="text-center p-4">
      <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
      <p className="text-sm text-muted-foreground mb-2">
        Component temporarily unavailable
      </p>
      <button
        onClick={retry}
        className="text-xs text-primary hover:text-primary/80 underline"
      >
        Try again
      </button>
    </div>
  </div>
);

export default ErrorBoundary;
