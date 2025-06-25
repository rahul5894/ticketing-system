/**
 * Modern Supabase Client Configuration - 2025 Pattern
 *
 * Minimal, optimized client setup with persistent connections and automatic reconnection
 * Follows latest Supabase best practices for connection management
 */

'use client';

import { useMemo, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function useSupabaseClient() {
  const { getToken, isSignedIn } = useAuth();
  const [isRealtimeReady, setIsRealtimeReady] = useState(false);

  const client = useMemo(() => {
    if (supabaseInstance) {
      return supabaseInstance;
    }

    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          fetch: async (url, options = {}) => {
            if (!isSignedIn) {
              return fetch(url, options);
            }
            try {
              const token = await getToken({ template: 'supabase' });
              if (token) {
                const headers = new Headers(options.headers);
                headers.set('Authorization', `Bearer ${token}`);
                return fetch(url, { ...options, headers });
              }
            } catch {
              // Silent error handling for production stability
            }
            return fetch(url, options);
          },
        },
        realtime: {
          params: {
            eventsPerSecond: 20,
          },
          timeout: 30000,
          heartbeatIntervalMs: 30000,
        },
      }
    );
    return supabaseInstance;
  }, [getToken, isSignedIn]);

  useEffect(() => {
    const setupRealtimeAuth = async () => {
      if (client && isSignedIn) {
        try {
          const token = await getToken({ template: 'supabase' });
          if (token) {
            client.realtime.setAuth(token);
            setIsRealtimeReady(true);
          } else {
            setIsRealtimeReady(false);
          }
        } catch {
          setIsRealtimeReady(false);
        }
      } else {
        setIsRealtimeReady(false);
      }
    };

    setupRealtimeAuth();
  }, [client, getToken, isSignedIn]);

  return { client, isRealtimeReady };
}

/**
 * Legacy export for backward compatibility
 * Use useSupabaseClient hook for new implementations
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

