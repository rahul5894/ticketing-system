import { createTenantClient } from '@/lib/supabase';
import { Ticket } from '@/features/ticketing/models/ticket.schema';

/**
 * Get tickets for a specific tenant
 */
export const getTickets = async (tenantId: string): Promise<Ticket[]> => {
  const tenantClient = createTenantClient(tenantId);

  try {
    return await tenantClient.getTickets();
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return [];
  }
};

/**
 * Update a ticket (tenant-scoped)
 */
export const updateTicket = async (
  tenantId: string,
  ticketId: string,
  updates: Partial<Ticket>
): Promise<Ticket | null> => {
  const tenantClient = createTenantClient(tenantId);

  try {
    return await tenantClient.updateTicket(ticketId, updates);
  } catch (error) {
    console.error('Error updating ticket:', error);
    return null;
  }
};

/**
 * Create a new ticket (tenant-scoped)
 */
export const createTicket = async (
  tenantId: string,
  ticket: Omit<Ticket, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<Ticket | null> => {
  const tenantClient = createTenantClient(tenantId);

  try {
    return await tenantClient.createTicket(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    return null;
  }
};

/**
 * Get a specific ticket (tenant-scoped)
 */
export const getTicket = async (
  tenantId: string,
  ticketId: string
): Promise<Ticket | null> => {
  const tenantClient = createTenantClient(tenantId);

  try {
    return await tenantClient.getTicket(ticketId);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return null;
  }
};

/**
 * Delete a ticket (tenant-scoped)
 */
export const deleteTicket = async (
  tenantId: string,
  ticketId: string
): Promise<boolean> => {
  const tenantClient = createTenantClient(tenantId);

  try {
    await tenantClient.deleteTicket(ticketId);
    return true;
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return false;
  }
};
