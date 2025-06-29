'use client';

import { useEffect, useCallback } from 'react';
import { useSupabaseClient } from '@/lib/supabase-clerk';
import { useTicketingStore } from '../store/use-ticketing-store';
import type { Database } from '@/types/supabase';

type TicketRow = Database['public']['Tables']['tickets']['Row'];

// Helper function to transform Supabase row to Ticket format
const transformTicketRow = (payload: TicketRow) => ({
  id: payload.id,
  tenantId: payload.tenant_id,
  title: payload.title,
  description: payload.description || '',
  status: payload.status as 'open' | 'closed' | 'resolved' | 'pending',
  priority: payload.priority as 'low' | 'medium' | 'high' | 'urgent',
  department: payload.department as
    | 'sales'
    | 'support'
    | 'marketing'
    | 'technical',
  userId: payload.created_by,
  userName: 'Unknown User',
  userEmail: '',
  userAvatar: undefined,
  createdAt: new Date(payload.created_at || new Date()),
  updatedAt: new Date(payload.updated_at || new Date()),
  messages: [],
  attachments: [],
});

/**
 * Hook for real-time ticket updates
 * Automatically syncs ticket changes with the Zustand store
 */
export function useTicketRealtime(
  tenantId: string | null,
  enabled: boolean = true
) {
  const { supabase, isAuthenticated } = useSupabaseClient();
  const { setTickets, getTicketsForTenant, useMockData } = useTicketingStore();

  const handleTicketInsert = useCallback(
    (payload: TicketRow) => {
      const newTicket = transformTicketRow(payload);
      const currentTickets = getTicketsForTenant(tenantId);
      setTickets([newTicket, ...currentTickets]);
    },
    [getTicketsForTenant, setTickets, tenantId]
  );

  const handleTicketUpdate = useCallback(
    (payload: TicketRow) => {
      const updatedTicket = transformTicketRow(payload);
      const currentTickets = getTicketsForTenant(tenantId);
      const updatedTickets = currentTickets.map((ticket) =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      );
      setTickets(updatedTickets);
    },
    [getTicketsForTenant, setTickets, tenantId]
  );

  const handleTicketDelete = useCallback(
    (payload: TicketRow) => {
      // Remove from current tickets
      const currentTickets = getTicketsForTenant(tenantId);
      const filteredTickets = currentTickets.filter(
        (ticket) => ticket.id !== payload.id
      );
      setTickets(filteredTickets);
    },
    [getTicketsForTenant, setTickets, tenantId]
  );

  useEffect(() => {
    // Don't subscribe if:
    // - Not enabled
    // - No tenant ID
    // - Not authenticated
    // - Using mock data
    if (!enabled || !tenantId || !isAuthenticated || useMockData) {
      return;
    }

    const channel = supabase
      .channel(`tickets:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => handleTicketInsert(payload.new as TicketRow)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => handleTicketUpdate(payload.new as TicketRow)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'tickets',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => handleTicketDelete(payload.old as TicketRow)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    enabled,
    tenantId,
    isAuthenticated,
    useMockData,
    supabase,
    handleTicketInsert,
    handleTicketUpdate,
    handleTicketDelete,
  ]);

  return {
    isEnabled: enabled && !!tenantId && isAuthenticated && !useMockData,
  };
}
