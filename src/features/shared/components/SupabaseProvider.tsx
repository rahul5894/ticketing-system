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
    const initializeAuth = async () => {
      if (!supabase || !isSignedIn) {
        supabase?.realtime.disconnect();
        setIsInitialized(false);
        return;
      }

      try {
        const token = await getToken({ template: 'supabase' });
        if (token) {
          supabase.realtime.setAuth(token);
          setIsInitialized(true);

          // Simple token refresh every 50 minutes
          tokenRefreshTimer.current = setTimeout(
            initializeAuth,
            50 * 60 * 1000
          );
        }
      } catch {
        supabase.realtime.disconnect();
        setIsInitialized(false);
      }
    };

    initializeAuth();

    return () => {
      if (tokenRefreshTimer.current) {
        clearTimeout(tokenRefreshTimer.current);
      }
      supabase?.realtime.disconnect();
    };
  }, [supabase, getToken, isSignedIn]);

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
