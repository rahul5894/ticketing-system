import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Ticket, mockTickets } from '@/features/ticketing/models/ticket.schema';
import { cacheService } from '@/lib/cache/cache-service';

interface TicketingState {
  tickets: Ticket[];
  selectedTicketId: string | null;
  currentTenantId: string | null;
  useMockData: boolean;
  isLoading: boolean;
  isCacheLoaded: boolean;
  lastCacheSync: number;
  optimisticUpdates: Record<string, Partial<Ticket>>;
}

interface TicketingActions {
  setTenantId: (tenantId: string | null) => void;
  selectTicket: (ticketId: string) => void;
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void;
  updateTicketOptimistic: (ticketId: string, updates: Partial<Ticket>) => void;
  addTicket: (ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => string;
  addTicketOptimistic: (ticket: Ticket) => void;
  getTicketsForTenant: (tenantId: string | null) => Ticket[];
  setUseMockData: (useMockData: boolean) => void;
  getMockTickets: () => Ticket[];
  loadTicketsFromAPI: (tenantId: string) => Promise<void>;
  loadTicketsFromCache: (tenantId: string) => Promise<void>;
  syncWithCache: (tenantId: string) => Promise<void>;
  clearOptimisticUpdate: (ticketId: string) => void;
  setTickets: (tickets: Ticket[]) => void;
  clearCacheForTenant: (tenantId: string) => Promise<void>;
}

export const useTicketingStore = create<TicketingState & TicketingActions>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        tickets: [], // Start with empty tickets array, will be populated from cache/Supabase
        selectedTicketId: null,
        currentTenantId: null,
        useMockData: false, // Default to false, hiding mock data
        isLoading: false,
        isCacheLoaded: false,
        lastCacheSync: 0,
        optimisticUpdates: {},

        // Actions
        setTenantId: (tenantId) => {
          set({ currentTenantId: tenantId });
          // Load cache when tenant changes
          if (tenantId) {
            get().loadTicketsFromCache(tenantId);
          }
        },

        selectTicket: (ticketId) => set({ selectedTicketId: ticketId }),

        updateTicket: (ticketId, updates) =>
          set((state) => ({
            tickets: state.tickets.map((ticket) =>
              ticket.id === ticketId
                ? { ...ticket, ...updates, updatedAt: new Date() }
                : ticket
            ),
          })),

        updateTicketOptimistic: (ticketId, updates) => {
          // Apply optimistic update immediately
          set((state) => ({
            tickets: state.tickets.map((ticket) =>
              ticket.id === ticketId
                ? { ...ticket, ...updates, updatedAt: new Date() }
                : ticket
            ),
            optimisticUpdates: {
              ...state.optimisticUpdates,
              [ticketId]: { ...state.optimisticUpdates[ticketId], ...updates },
            },
          }));

          // Update cache
          const { currentTenantId } = get();
          if (currentTenantId) {
            cacheService.updateTicketInCache(
              currentTenantId,
              ticketId,
              updates
            );
          }
        },

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

        addTicketOptimistic: (ticket) => {
          // Add ticket optimistically
          set((state) => ({
            tickets: [ticket, ...state.tickets],
          }));

          // Add to cache
          const { currentTenantId } = get();
          if (currentTenantId) {
            cacheService.addTicketToCache(currentTenantId, ticket);
          }
        },

        loadTicketsFromCache: async (tenantId) => {
          try {
            set({ isLoading: true });
            const cachedTickets = await cacheService.getCachedTickets(tenantId);

            if (cachedTickets.length > 0) {
              set({
                tickets: cachedTickets,
                isCacheLoaded: true,
                isLoading: false,
              });
            } else {
              set({ isLoading: false });
            }
          } catch (error) {
            console.error('Failed to load tickets from cache:', error);
            set({ isLoading: false });
          }
        },

        syncWithCache: async (tenantId) => {
          try {
            // Perform delta sync
            await cacheService.performDeltaSync(tenantId);

            // Reload from cache
            const cachedTickets = await cacheService.getCachedTickets(tenantId);
            set({
              tickets: cachedTickets,
              lastCacheSync: Date.now(),
            });
          } catch (error) {
            console.error('Cache sync failed:', error);
          }
        },

        clearOptimisticUpdate: (ticketId) => {
          set((state) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { [ticketId]: _removed, ...remaining } =
              state.optimisticUpdates;
            return { optimisticUpdates: remaining };
          });
        },

        clearCacheForTenant: async (tenantId) => {
          await cacheService.clearCache(tenantId);
          set({
            tickets: [],
            isCacheLoaded: false,
            lastCacheSync: 0,
            optimisticUpdates: {},
          });
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

          // Apply optimistic updates to tickets
          const ticketsWithOptimistic = state.tickets.map((ticket) => {
            const optimisticUpdate = state.optimisticUpdates[ticket.id];
            return optimisticUpdate
              ? { ...ticket, ...optimisticUpdate }
              : ticket;
          });

          // Otherwise return real tickets from cache/Supabase
          if (!tenantId) {
            // For localhost, return all tickets
            return ticketsWithOptimistic;
          }
          // Filter tickets by tenant ID
          return ticketsWithOptimistic.filter(
            (ticket) => ticket.tenantId === tenantId
          );
        },

        setUseMockData: (useMockData) => set({ useMockData }),

        getMockTickets: () => mockTickets,

        setTickets: (tickets) => {
          set({ tickets });
          // Cache the tickets
          const { currentTenantId } = get();
          if (currentTenantId) {
            cacheService.cacheTickets(currentTenantId, tickets);
          }
        },

        loadTicketsFromAPI: async (tenantId) => {
          set({ isLoading: true });

          try {
            await new Promise((resolve) => setTimeout(resolve, 200));

            const response = await fetch(
              `/api/tickets?tenant_id=${encodeURIComponent(tenantId)}`,
              {
                signal: AbortSignal.timeout(8000),
                headers: { 'Content-Type': 'application/json' },
              }
            );

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                `Failed to fetch tickets: ${
                  errorData.error || response.statusText
                }`
              );
            }

            const tickets = await response.json();
            set({ tickets, isLoading: false });

            // Cache the fetched tickets
            await cacheService.cacheTickets(tenantId, tickets);
          } catch (error) {
            set({ isLoading: false });
            throw error;
          }
        },
      }),
      {
        name: 'ticketing-store',
        partialize: (state) => ({
          currentTenantId: state.currentTenantId,
          useMockData: state.useMockData,
          lastCacheSync: state.lastCacheSync,
          // Don't persist tickets, responses, or optimistic updates - they come from cache
        }),
      }
    ),
    {
      name: 'ticketing-store-devtools',
    }
  )
);
