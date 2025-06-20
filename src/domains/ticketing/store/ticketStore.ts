import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '@/lib/supabase';
import { Ticket, TicketStatus } from '../models/ticket.schema';

// Types for Supabase query results
interface SupabaseUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface SupabaseAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  created_at: string;
}

interface SupabaseMessage {
  id: string;
  content: string;
  created_at: string;
  author?: SupabaseUser;
  attachments?: SupabaseAttachment[];
}

interface SupabaseTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  department: 'sales' | 'support' | 'marketing' | 'technical';
  user_id: string;
  created_at: string;
  updated_at: string;
  user?: SupabaseUser;
  assigned_user?: SupabaseUser;
  messages?: SupabaseMessage[];
  attachments?: SupabaseAttachment[];
}

interface TicketState {
  tickets: Ticket[];
  selectedTicketId: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  statusFilter: TicketStatus | 'all';
}

interface TicketActions {
  // Ticket CRUD
  fetchTickets: () => Promise<void>;
  createTicket: (
    ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<string>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;

  // UI State
  setSelectedTicket: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: TicketStatus | 'all') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Computed getters
  getSelectedTicket: () => Ticket | null;
  getFilteredTickets: () => Ticket[];
  getTicketsByStatus: (status: TicketStatus) => Ticket[];
}

export const useTicketStore = create<TicketState & TicketActions>()(
  immer((set, get) => ({
    // State
    tickets: [],
    selectedTicketId: null,
    isLoading: false,
    error: null,
    searchQuery: '',
    statusFilter: 'all',

    // Actions
    fetchTickets: async () => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        const { data: ticketsData, error } = await supabase
          .from('tickets')
          .select(
            `
            *,
            user:users!tickets_user_id_fkey(id, name, email, avatar_url),
            assigned_user:users!tickets_assigned_to_fkey(id, name, email, avatar_url),
            messages:ticket_messages(
              id,
              content,
              created_at,
              author:users!ticket_messages_author_id_fkey(id, name, avatar_url),
              attachments(id, name, type, size, url, created_at)
            ),
            attachments(id, name, type, size, url, created_at)
          `
          )
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform data to match our Ticket schema
        const tickets: Ticket[] =
          ticketsData?.map((ticket: SupabaseTicket) => ({
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            department: ticket.department,
            createdAt: new Date(ticket.created_at),
            updatedAt: new Date(ticket.updated_at),
            userId: ticket.user_id,
            userName: ticket.user?.name || 'Unknown',
            userEmail: ticket.user?.email || '',
            userAvatar: ticket.user?.avatar_url,
            messages:
              ticket.messages?.map((msg: SupabaseMessage) => ({
                id: msg.id,
                content: msg.content,
                authorId: msg.author?.id || '',
                authorName: msg.author?.name || 'Unknown',
                authorAvatar: msg.author?.avatar_url,
                createdAt: new Date(msg.created_at),
                attachments:
                  msg.attachments?.map((att: SupabaseAttachment) => ({
                    id: att.id,
                    name: att.name,
                    type: att.type,
                    size: att.size,
                    url: att.url,
                    uploadedAt: new Date(att.created_at),
                  })) || [],
              })) || [],
            attachments:
              ticket.attachments?.map((att: SupabaseAttachment) => ({
                id: att.id,
                name: att.name,
                type: att.type,
                size: att.size,
                url: att.url,
                uploadedAt: new Date(att.created_at),
              })) || [],
          })) || [];

        set((state) => {
          state.tickets = tickets;
          state.isLoading = false;
        });
      } catch (error) {
        console.error('Error fetching tickets:', error);
        set((state) => {
          state.error =
            error instanceof Error ? error.message : 'Failed to fetch tickets';
          state.isLoading = false;
        });
      }
    },

    createTicket: async (ticketData) => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        const { data, error } = await supabase
          .from('tickets')
          .insert({
            title: ticketData.title,
            description: ticketData.description,
            status: ticketData.status || 'open',
            priority: ticketData.priority || 'medium',
            department: ticketData.department || 'support',
            user_id: ticketData.userId,
          })
          .select()
          .single();

        if (error) throw error;

        // Refresh tickets after creation
        await get().fetchTickets();

        set((state) => {
          state.isLoading = false;
        });

        return data.id;
      } catch (error) {
        console.error('Error creating ticket:', error);
        set((state) => {
          state.error =
            error instanceof Error ? error.message : 'Failed to create ticket';
          state.isLoading = false;
        });
        throw error;
      }
    },

    updateTicket: async (id, updates) => {
      try {
        set((state) => {
          state.error = null;
        });

        const { error } = await supabase
          .from('tickets')
          .update({
            title: updates.title,
            description: updates.description,
            status: updates.status,
            priority: updates.priority,
            department: updates.department,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;

        // Update local state optimistically
        set((state) => {
          const ticketIndex = state.tickets.findIndex(
            (t: Ticket) => t.id === id
          );
          if (ticketIndex !== -1) {
            Object.assign(state.tickets[ticketIndex], updates, {
              updatedAt: new Date(),
            });
          }
        });
      } catch (error) {
        console.error('Error updating ticket:', error);
        set((state) => {
          state.error =
            error instanceof Error ? error.message : 'Failed to update ticket';
        });
        throw error;
      }
    },

    deleteTicket: async (id) => {
      try {
        set((state) => {
          state.error = null;
        });

        const { error } = await supabase.from('tickets').delete().eq('id', id);

        if (error) throw error;

        set((state) => {
          state.tickets = state.tickets.filter((t: Ticket) => t.id !== id);
          if (state.selectedTicketId === id) {
            state.selectedTicketId = null;
          }
        });
      } catch (error) {
        console.error('Error deleting ticket:', error);
        set((state) => {
          state.error =
            error instanceof Error ? error.message : 'Failed to delete ticket';
        });
        throw error;
      }
    },

    // UI State actions
    setSelectedTicket: (id) =>
      set((state) => {
        state.selectedTicketId = id;
      }),
    setSearchQuery: (query) =>
      set((state) => {
        state.searchQuery = query;
      }),
    setStatusFilter: (status) =>
      set((state) => {
        state.statusFilter = status;
      }),
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),
    setError: (error) =>
      set((state) => {
        state.error = error;
      }),
    clearError: () =>
      set((state) => {
        state.error = null;
      }),

    // Computed getters
    getSelectedTicket: () => {
      const { tickets, selectedTicketId } = get();
      return tickets.find((t: Ticket) => t.id === selectedTicketId) || null;
    },

    getFilteredTickets: () => {
      const { tickets, searchQuery, statusFilter } = get();
      return tickets.filter((ticket) => {
        const matchesSearch =
          searchQuery === '' ||
          ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          ticket.userName.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === 'all' || ticket.status === statusFilter;

        return matchesSearch && matchesStatus;
      });
    },

    getTicketsByStatus: (status) => {
      const { tickets } = get();
      return tickets.filter((ticket: Ticket) => ticket.status === status);
    },
  }))
);

