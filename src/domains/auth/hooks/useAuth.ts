import { useEffect, useCallback } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { isSignedIn, signOut: clerkSignOut } = useClerkAuth();
  const {
    user,
    isLoading,
    error,
    syncUserToSupabase,
    signOut: storeSignOut,
    clearError,
    checkSessionValidity,
    refreshSession,
    isSessionValid,
  } = useAuthStore();

  const signOut = useCallback(async () => {
    try {
      await clerkSignOut();
      storeSignOut();
      router.push('/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [clerkSignOut, storeSignOut, router]);

  // Session validation effect
  useEffect(() => {
    if (user && !checkSessionValidity()) {
      console.warn('Session expired, signing out...');
      signOut();
    }
  }, [user, checkSessionValidity, signOut]);

  // Periodic session refresh
  useEffect(() => {
    if (user && isSessionValid) {
      const interval = setInterval(() => {
        refreshSession();
      }, 15 * 60 * 1000); // Refresh every 15 minutes

      return () => clearInterval(interval);
    }
    return undefined;
  }, [user, isSessionValid, refreshSession]);

  // Sync Clerk user to Supabase when user signs in
  useEffect(() => {
    if (isClerkLoaded && isSignedIn && clerkUser && !user) {
      syncUserToSupabase(clerkUser);
    } else if (isClerkLoaded && !isSignedIn && user) {
      storeSignOut();
    }
  }, [
    isClerkLoaded,
    isSignedIn,
    clerkUser,
    user,
    syncUserToSupabase,
    storeSignOut,
  ]);

  return {
    // User data
    user,
    clerkUser,
    isSignedIn: isSignedIn && !!user && isSessionValid,

    // Loading states
    isLoading: !isClerkLoaded || isLoading,
    isClerkLoaded,

    // Session management
    isSessionValid,
    checkSessionValidity,
    refreshSession,

    // Error handling
    error,
    clearError,

    // Actions
    signOut,

    // Role checks
    isAdmin: user?.role === 'admin',
    isSupport: user?.role === 'support' || user?.role === 'admin',
    isUser: user?.role === 'user',
  };
}

