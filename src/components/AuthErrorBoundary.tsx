// This file will be moved to features/shared/components/AuthErrorBoundary.tsx
'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Modern 2025 Authentication Error Boundary
 *
 * Catches and handles authentication-related errors gracefully
 * without disrupting the user experience
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log authentication errors but don't show them to users
    console.warn('🚨 Auth Error Boundary caught error:', error);
    console.warn('🚨 Error Info:', errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  override render() {
    if (this.state.hasError) {
      // Render fallback UI or nothing to maintain seamless experience
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // In development, show error details
      if (process.env.NODE_ENV === 'development') {
        return (
          <div className='p-4 border border-red-200 bg-red-50 rounded-md'>
            <h3 className='text-red-800 font-medium'>
              Authentication Error (Development)
            </h3>
            <details className='mt-2'>
              <summary className='text-red-700 cursor-pointer'>
                Error Details
              </summary>
              <pre className='mt-2 text-xs text-red-600 overflow-auto'>
                {this.state.error?.toString()}
              </pre>
              {this.state.errorInfo && (
                <pre className='mt-2 text-xs text-red-600 overflow-auto'>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </details>
            <button
              onClick={() =>
                this.setState({ hasError: false, error: null, errorInfo: null })
              }
              className='mt-2 px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200'
            >
              Retry
            </button>
          </div>
        );
      }

      // In production, render nothing to maintain seamless experience
      return null;
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with auth error boundary
 */
export function withAuthErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <AuthErrorBoundary fallback={fallback}>
        <Component {...props} />
      </AuthErrorBoundary>
    );
  };
}

