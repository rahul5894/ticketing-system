'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import { Database } from '@/lib/database.types';

interface SupabaseContextType {
  supabase: SupabaseClient<Database> | null;
  isInitialized: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

// --- Centralized Supabase Client Instance ---
// This ensures that there is only one instance of the Supabase client throughout the app.
let supabaseInstance: SupabaseClient<Database> | null = null;

export const SupabaseProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { getToken, isSignedIn } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const tokenRefreshTimer = useRef<NodeJS.Timeout | null>(null);

  const supabase = useMemo(() => {
    if (supabaseInstance) {
      return supabaseInstance;
    }

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      throw new Error(
        'Supabase URL or Anon Key is not defined in environment variables.'
      );
    }

    supabaseInstance = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          fetch: async (url, options = {}) => {
            const token = await getToken({ template: 'supabase' });
            const headers = new Headers(options.headers);
            if (token) {
              headers.set('Authorization', `Bearer ${token}`);
            }
            return fetch(url, { ...options, headers });
          },
        },
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
        },
      }
    );

    return supabaseInstance;
  }, [getToken]);

  useEffect(() => {
    const manageRealtimeAuth = async () => {
      if (!supabase || !isSignedIn) {
        if (supabase?.realtime.isConnected()) {
          supabase.realtime.disconnect();
        }
        setIsInitialized(false);
        return;
      }

      const scheduleTokenRefresh = (token: string) => {
        if (tokenRefreshTimer.current) {
          clearTimeout(tokenRefreshTimer.current);
        }

        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3 && tokenParts[1]) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const exp = payload.exp * 1000;
            const now = Date.now();
            const expiresIn = exp - now;
            // Refresh 5 minutes before the token expires, or at least in 1 second.
            const refreshIn = Math.max(expiresIn - 5 * 60 * 1000, 1000);
            tokenRefreshTimer.current = setTimeout(
              manageRealtimeAuth,
              refreshIn
            );
          } else {
            throw new Error('Invalid JWT structure');
          }
        } catch {
          // Fallback to a 50-minute interval if token parsing fails
          tokenRefreshTimer.current = setTimeout(
            manageRealtimeAuth,
            50 * 60 * 1000
          );
        }
      };

      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) {
          throw new Error('Failed to get Supabase token from Clerk.');
        }

        supabase.realtime.setAuth(token);
        scheduleTokenRefresh(token);

        if (!isInitialized) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('Error setting Supabase auth:', error);
        if (supabase.realtime.isConnected()) {
          supabase.realtime.disconnect();
        }
        setIsInitialized(false);
      }
    };

    manageRealtimeAuth();

    return () => {
      if (tokenRefreshTimer.current) {
        clearTimeout(tokenRefreshTimer.current);
      }
      if (supabase?.realtime.isConnected()) {
        supabase.realtime.disconnect();
      }
    };
  }, [supabase, getToken, isSignedIn, isInitialized]);

  return (
    <SupabaseContext.Provider value={{ supabase, isInitialized }}>
      {children}
    </SupabaseContext.Provider>
  );
};

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};
