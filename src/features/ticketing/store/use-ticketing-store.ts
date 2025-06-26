import { create } from 'zustand';
import { Ticket, mockTickets } from '@/features/ticketing/models/ticket.schema';

interface TicketingState {
  tickets: Ticket[];
  selectedTicketId: string | null;
  currentTenantId: string | null;
  useMockData: boolean;
  isLoading: boolean;
  setTenantId: (tenantId: string | null) => void;
  selectTicket: (ticketId: string) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => string;
  getTicketsForTenant: (tenantId: string | null) => Ticket[];
  setUseMockData: (useMockData: boolean) => void;
  getMockTickets: () => Ticket[];
  loadTicketsFromAPI: (tenantId: string) => Promise<void>;
  setTickets: (tickets: Ticket[]) => void;
}

export const useTicketingStore = create<TicketingState>((set, get) => ({
  tickets: [], // Start with empty tickets array, will be populated from Supabase
  selectedTicketId: null,
  currentTenantId: null,
  useMockData: false, // Default to false, hiding mock data
  isLoading: false,

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

  addTicket: (ticketData) => {
    const newTicketId = `ticket_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    const now = new Date();

    const newTicket: Ticket = {
      ...ticketData,
      id: newTicketId,
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      tickets: [newTicket, ...state.tickets],
      selectedTicketId: newTicketId,
    }));

    return newTicketId;
  },

  getTicketsForTenant: (tenantId) => {
    const state = get();

    // If using mock data, return mock tickets
    if (state.useMockData) {
      if (!tenantId) {
        // For localhost, return all mock tickets
        return mockTickets;
      }
      // Filter mock tickets by tenant ID
      return mockTickets.filter((ticket) => ticket.tenantId === tenantId);
    }

    // Otherwise return real tickets from Supabase
    if (!tenantId) {
      // For localhost, return all tickets
      return state.tickets;
    }
    // Filter tickets by tenant ID
    return state.tickets.filter((ticket) => ticket.tenantId === tenantId);
  },

  setUseMockData: (useMockData) => set({ useMockData }),

  getMockTickets: () => mockTickets,

  setTickets: (tickets) => set({ tickets }),

  loadTicketsFromAPI: async (tenantId) => {
    set({ isLoading: true });

    try {
      const response = await fetch(
        `/api/tickets?tenant_id=${encodeURIComponent(tenantId)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const tickets = await response.json();
      set({ tickets, isLoading: false });
    } catch (error) {
      console.error('Failed to load tickets:', error);
      set({ isLoading: false });
      // Keep existing tickets on error
    }
  },
}));
