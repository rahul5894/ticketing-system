'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export interface SmoothAuthState {
  user: ReturnType<typeof useUser>['user'];
  isLoaded: boolean;
  isSignedIn: boolean;
  isTransitioning: boolean;
}

export interface SmoothAuthActions {
  signOut: () => Promise<void>;
  navigateToTickets: () => void;
  navigateToSignIn: () => void;
  navigateToSignUp: () => void;
}

/**
 * Hook for smooth authentication transitions without page refreshes
 * Follows Next.js 2025 best practices for App Router
 */
export function useSmoothAuth(): SmoothAuthState & SmoothAuthActions {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const signOut = useCallback(async () => {
    setIsTransitioning(true);
    
    try {
      await clerkSignOut();
      // Use replace to prevent back button issues
      router.replace('/sign-in');
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback to window.location only on error
      window.location.href = '/sign-in';
    } finally {
      setIsTransitioning(false);
    }
  }, [clerkSignOut, router]);

  const navigateToTickets = useCallback(() => {
    setIsTransitioning(true);
    router.push('/tickets');
    // Reset transitioning state after navigation
    setTimeout(() => setIsTransitioning(false), 100);
  }, [router]);

  const navigateToSignIn = useCallback(() => {
    setIsTransitioning(true);
    router.push('/sign-in');
    setTimeout(() => setIsTransitioning(false), 100);
  }, [router]);

  const navigateToSignUp = useCallback(() => {
    setIsTransitioning(true);
    router.push('/sign-up');
    setTimeout(() => setIsTransitioning(false), 100);
  }, [router]);

  return {
    user,
    isLoaded,
    isSignedIn: isSignedIn || false,
    isTransitioning,
    signOut,
    navigateToTickets,
    navigateToSignIn,
    navigateToSignUp,
  };
}
