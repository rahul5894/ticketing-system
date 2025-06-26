'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface AuthLoadingStateProps {
  isLoading?: boolean;
  isTransitioning?: boolean;
  message?: string;
  children: React.ReactNode;
}

/**
 * Modern 2025 Authentication Loading State Component
 * 
 * Provides smooth loading states during authentication transitions
 * to prevent race conditions and improve user experience
 */
export function AuthLoadingState({
  isLoading = false,
  isTransitioning = false,
  message,
  children,
}: AuthLoadingStateProps) {
  // Show loading state during auth transitions
  if (isLoading || isTransitioning) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <div className="text-center">
            <p className="text-gray-600">
              {message || (isTransitioning ? 'Authenticating...' : 'Loading...')}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Please wait while we set up your session
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Inline loading indicator for smaller components
 */
export function InlineAuthLoading({
  isLoading = false,
  message = 'Loading...',
}: {
  isLoading?: boolean;
  message?: string;
}) {
  if (!isLoading) return null;

  return (
    <div className="flex items-center space-x-2 text-gray-600">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

/**
 * Overlay loading state for preventing interactions during auth transitions
 */
export function AuthLoadingOverlay({
  isVisible = false,
  message = 'Authenticating...',
}: {
  isVisible?: boolean;
  message?: string;
}) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-lg flex flex-col items-center space-y-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-gray-700">{message}</p>
      </div>
    </div>
  );
}
