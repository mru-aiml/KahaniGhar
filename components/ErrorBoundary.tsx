"use client";

import { Component, ReactNode } from "react";
import Link from "next/link";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <div className="text-5xl" role="img" aria-label="Error">😔</div>
          <h1 className="mt-4 font-heading text-2xl text-kg-cream">Something went wrong</h1>
          <p className="mt-2 text-kg-cream/70">
            We couldn&apos;t load the story. Please try again or go back to your storybook.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-kg-amber px-5 py-2 text-kg-night"
            >
              Refresh page
            </button>
            <Link href="/library" className="rounded-full border border-white/20 px-5 py-2 text-kg-cream">
              Back to storybook
            </Link>
          </div>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mt-6 text-left text-xs text-kg-cream/50">
              <summary>Error details (development)</summary>
              <pre className="mt-2 p-2 rounded bg-kg-night/50 overflow-auto">{this.state.error.stack}</pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}