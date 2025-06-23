import { create } from 'zustand';
import { Ticket, mockTickets } from '@/features/ticketing/models/ticket.schema';

interface TicketingState {
  tickets: Ticket[];
  selectedTicketId: string | null;
  selectTicket: (ticketId: string) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
}

export const useTicketingStore = create<TicketingState>((set) => ({
  tickets: mockTickets,
  selectedTicketId: '1',
  selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),
  updateTicket: (ticketId, updates) =>
    set((state) => ({
      tickets: state.tickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, ...updates, updatedAt: new Date() }
          : ticket
      ),
    })),
}));
