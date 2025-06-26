'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useRef, useState, useCallback } from 'react';

export interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  isTransitioning: boolean;
  error: string | null;
}

export interface AuthStateManager {
  authState: AuthState;
  abortController: React.RefObject<AbortController | null>;
  cancelAllRequests: () => void;
  createRequestSignal: () => AbortSignal;
  isAuthReady: boolean;
}

/**
 * Modern 2025 Authentication State Manager
 *
 * Provides:
 * - Proper authentication state management
 * - Request cancellation with AbortController
 * - Race condition prevention
 * - Smooth auth transitions
 */
export function useAuthStateManager(): AuthStateManager {
  const { isLoaded, isSignedIn, userId } = useAuth();

  // AbortController for request cancellation
  const abortController = useRef<AbortController | null>(null);

  // Track authentication transitions
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Previous auth state for transition detection
  const prevAuthState = useRef<{
    isLoaded: boolean;
    isSignedIn: boolean | undefined;
    userId: string | null | undefined;
  }>({
    isLoaded: false,
    isSignedIn: false,
    userId: null,
  });

  // Cancel all ongoing requests
  const cancelAllRequests = useCallback(() => {
    if (abortController.current) {
      console.log('🚫 Cancelling all ongoing requests');
      abortController.current.abort('Authentication state changed');
    }

    // Create new AbortController for future requests
    abortController.current = new AbortController();
  }, []);

  // Create a signal for new requests
  const createRequestSignal = useCallback((): AbortSignal => {
    if (!abortController.current) {
      abortController.current = new AbortController();
    }
    return abortController.current.signal;
  }, []);

  // Detect authentication state transitions
  useEffect(() => {
    const current = { isLoaded, isSignedIn, userId };
    const previous = prevAuthState.current;

    // Detect if auth state is transitioning
    const isStateChanging =
      previous.isLoaded !== current.isLoaded ||
      previous.isSignedIn !== current.isSignedIn ||
      previous.userId !== current.userId;

    if (isStateChanging) {
      console.log('🔄 Auth state transition detected:', {
        from: previous,
        to: current,
      });

      // Cancel all ongoing requests during transition
      cancelAllRequests();

      // Set transitioning state
      setIsTransitioning(true);
      setError(null);

      // Clear transitioning state after auth settles
      const transitionTimeout = setTimeout(() => {
        setIsTransitioning(false);
        console.log('✅ Auth state transition completed');
      }, 1000); // Allow 1 second for auth to settle

      // Update previous state
      prevAuthState.current = current;

      return () => clearTimeout(transitionTimeout);
    }

    // No cleanup needed if no state change
    return undefined;
  }, [isLoaded, isSignedIn, userId, cancelAllRequests]);

  // Initialize AbortController on mount
  useEffect(() => {
    abortController.current = new AbortController();

    return () => {
      if (abortController.current) {
        abortController.current.abort('Component unmounting');
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllRequests();
    };
  }, [cancelAllRequests]);

  // Determine if auth is ready for operations
  const isAuthReady = isLoaded && !isTransitioning;

  const authState: AuthState = {
    isLoaded,
    isSignedIn: isSignedIn ?? false,
    userId: userId ?? null,
    isTransitioning,
    error,
  };

  return {
    authState,
    abortController,
    cancelAllRequests,
    createRequestSignal,
    isAuthReady,
  };
}

