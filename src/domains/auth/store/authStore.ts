import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: 'user' | 'admin' | 'support';
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  lastSyncTime: number | null;
  sessionExpiry: number | null;
  isSessionValid: boolean;
}

interface ClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  fullName?: string | null;
  firstName?: string | null;
  imageUrl?: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  syncUserToSupabase: (clerkUser: ClerkUser) => Promise<void>;
  signOut: () => void;
  clearError: () => void;
  checkSessionValidity: () => boolean;
  refreshSession: () => Promise<void>;
  setSessionExpiry: (expiry: number) => void;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      isLoading: false,
      error: null,
      lastSyncTime: null,
      sessionExpiry: null,
      isSessionValid: true,

      // Actions
      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      syncUserToSupabase: async (clerkUser) => {
        try {
          set({ isLoading: true, error: null });

          // Create user object from Clerk data (works without Supabase)
          const userData: User = {
            id: clerkUser.id, // Use Clerk ID as fallback
            clerkId: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            name: clerkUser.fullName || clerkUser.firstName || 'Unknown',
            ...(clerkUser.imageUrl && { avatarUrl: clerkUser.imageUrl }),
            role: 'user', // Default role
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set({
            user: userData,
            isLoading: false,
            lastSyncTime: Date.now(),
            sessionExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            isSessionValid: true,
          });

          // TODO: Implement Supabase sync when database is ready
          // For now, we just use Clerk data which is sufficient for authentication
        } catch (error) {
          console.error('Error syncing user:', error);
          set({
            error:
              error instanceof Error ? error.message : 'Failed to sync user',
            isLoading: false,
          });
        }
      },

      signOut: () => {
        set({
          user: null,
          error: null,
          lastSyncTime: null,
          sessionExpiry: null,
          isSessionValid: false,
        });
      },

      checkSessionValidity: () => {
        const state = get();
        if (!state.sessionExpiry) return false;
        const isValid = Date.now() < state.sessionExpiry;
        if (!isValid) {
          set({ isSessionValid: false });
        }
        return isValid;
      },

      refreshSession: async () => {
        set({
          lastSyncTime: Date.now(),
          sessionExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
          isSessionValid: true,
        });
      },

      setSessionExpiry: (expiry: number) => {
        set({ sessionExpiry: expiry, isSessionValid: Date.now() < expiry });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

