import { create } from 'zustand';
import { Ticket, mockTickets } from '@/features/ticketing/models/ticket.schema';

interface TicketingState {
  tickets: Ticket[];
  selectedTicketId: string | null;
  currentTenantId: string | null;
  setTenantId: (tenantId: string | null) => void;
  selectTicket: (ticketId: string) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  getTicketsForTenant: (tenantId: string | null) => Ticket[];
}

export const useTicketingStore = create<TicketingState>((set, get) => ({
  tickets: mockTickets,
  selectedTicketId: '1',
  currentTenantId: null,

  setTenantId: (tenantId) => set({ currentTenantId: tenantId }),

  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

  updateTicket: (ticketId, updates) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, ...updates, updatedAt: new Date() }
          : ticket
      ),
    })),

  getTicketsForTenant: (tenantId) => {
    const state = get();
    if (!tenantId) {
      // For localhost, return all tickets
      return state.tickets;
    }
    // Filter tickets by tenant ID
    return state.tickets.filter((ticket) => ticket.tenantId === tenantId);
  },
}));
