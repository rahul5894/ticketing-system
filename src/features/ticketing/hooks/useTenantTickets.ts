'use client';

import { useEffect, useState } from 'react';
import { useTenant } from '@/features/tenant/context/TenantContext';
import { useTicketingStore } from '../store/use-ticketing-store';
import { getTickets, updateTicket as updateTicketAPI } from '../api';
import { Ticket } from '../models/ticket.schema';

export function useTenantTickets() {
  const { tenantId } = useTenant();
  const {
    getTicketsForTenant,
    updateTicket: updateTicketStore,
    setTenantId,
  } = useTicketingStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update store tenant ID when tenant changes
  useEffect(() => {
    setTenantId(tenantId);
  }, [tenantId, setTenantId]);

  // Get tickets for current tenant
  const tickets = getTicketsForTenant(tenantId);

  // Fetch tickets from API (in a real app)
  const fetchTickets = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    setError(null);

    try {
      await getTickets(tenantId);
      // In a real app, you would update the store with fetched tickets
      // For now, we're using mock data from the store
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  // Update ticket
  const updateTicket = async (ticketId: string, updates: Partial<Ticket>) => {
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    try {
      // Update in API (in a real app)
      const updatedTicket = await updateTicketAPI(tenantId, ticketId, updates);

      // Update in store
      updateTicketStore(ticketId, updates);

      return updatedTicket;
    } catch (err) {
      throw new Error(
        err instanceof Error ? err.message : 'Failed to update ticket'
      );
    }
  };

  return {
    tickets,
    isLoading,
    error,
    fetchTickets,
    updateTicket,
    tenantId,
  };
}

/**
 * Hook for managing a specific ticket
 */
export function useTenantTicket(ticketId: string) {
  const { tickets, updateTicket, tenantId } = useTenantTickets();
  const ticket = tickets.find((t) => t.id === ticketId);

  const updateCurrentTicket = async (updates: Partial<Ticket>) => {
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return updateTicket(ticketId, updates);
  };

  return {
    ticket,
    updateTicket: updateCurrentTicket,
    tenantId,
    exists: !!ticket,
  };
}

/**
 * Hook for creating new tickets
 */
export function useCreateTicket() {
  const { tenantId } = useTenant();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTicket = async (
    ticketData: Omit<Ticket, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!tenantId) {
      throw new Error('No tenant ID available');
    }

    setIsCreating(true);
    setError(null);

    try {
      // In a real app, this would call the API
      // const newTicket = await createTicketAPI(tenantId, ticketData);

      // For now, we'll create a mock ticket
      const newTicket: Ticket = {
        ...ticketData,
        id: `ticket-${Date.now()}`,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return newTicket;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create ticket';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    createTicket,
    isCreating,
    error,
    tenantId,
  };
}

/**
 * Hook for ticket statistics
 */
export function useTicketStats() {
  const { tickets, tenantId } = useTenantTickets();

  const stats = {
    total: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    closed: tickets.filter((t) => t.status === 'closed').length,
    byPriority: {
      urgent: tickets.filter((t) => t.priority === 'urgent').length,
      high: tickets.filter((t) => t.priority === 'high').length,
      medium: tickets.filter((t) => t.priority === 'medium').length,
      low: tickets.filter((t) => t.priority === 'low').length,
    },
    byDepartment: {
      sales: tickets.filter((t) => t.department === 'sales').length,
      support: tickets.filter((t) => t.department === 'support').length,
      marketing: tickets.filter((t) => t.department === 'marketing').length,
      technical: tickets.filter((t) => t.department === 'technical').length,
    },
  };

  return {
    stats,
    tickets,
    tenantId,
  };
}

