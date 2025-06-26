'use client';

import { createClient } from '@supabase/supabase-js';
import { useSession, useUser } from '@clerk/nextjs';
import { useCallback, useMemo } from 'react';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Hook to create a Supabase client with Clerk authentication
 * Uses Clerk's native Supabase integration for secure token management
 */
export function useSupabaseClient() {
  const { session } = useSession();
  const { user } = useUser();

  const supabaseClient = useMemo(() => {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      async accessToken() {
        return session?.getToken() ?? null;
      },
    });
  }, [session]);

  return {
    supabase: supabaseClient,
    user,
    isAuthenticated: !!user,
  };
}

/**
 * Hook for creating tickets with proper authentication and tenant isolation
 */
export function useCreateTicket() {
  const { supabase, user, isAuthenticated } = useSupabaseClient();

  const createTicket = useCallback(
    async (ticketData: {
      title: string;
      description: string;
      priority: string;
      department: string;
      tenant_id: string;
    }) => {
      if (!isAuthenticated || !user) {
        throw new Error('User must be authenticated to create tickets');
      }

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          ...ticketData,
          created_by: user.id,
          status: 'open',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create ticket: ${error.message}`);
      }

      return data;
    },
    [supabase, user, isAuthenticated]
  );

  return { createTicket, isAuthenticated };
}

/**
 * Hook for fetching tickets with proper authentication and tenant isolation
 */
export function useTickets(tenantId: string | null) {
  const { supabase, isAuthenticated } = useSupabaseClient();

  const fetchTickets = useCallback(async () => {
    if (!isAuthenticated || !tenantId) {
      return [];
    }

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    return data || [];
  }, [supabase, tenantId, isAuthenticated]);

  return { fetchTickets, isAuthenticated };
}

/**
 * Hook for updating tickets with proper authentication and tenant isolation
 */
export function useUpdateTicket() {
  const { supabase, user, isAuthenticated } = useSupabaseClient();

  const updateTicket = useCallback(
    async (
      ticketId: string,
      updates: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        department?: string;
      }
    ) => {
      if (!isAuthenticated || !user) {
        throw new Error('User must be authenticated to update tickets');
      }

      const { data, error } = await supabase
        .from('tickets')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update ticket: ${error.message}`);
      }

      return data;
    },
    [supabase, user, isAuthenticated]
  );

  return { updateTicket, isAuthenticated };
}

/**
 * Server-side Supabase client creation utility
 * For use in API routes and server components
 */
export function createServerSupabaseClient(authToken: string | null) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    async accessToken() {
      return authToken;
    },
  });
}

