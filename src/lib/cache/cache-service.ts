import { cacheDB, CachedTicket, CachedResponse, CachedUser } from './dexie-db';
import { Ticket } from '@/features/ticketing/models/ticket.schema';

// Type definitions for API responses
interface ResponseData {
  id: string;
  author_id: string;
  content: string;
  message_type?: 'reply' | 'note' | 'status_change';
  is_internal?: boolean;
  created_at: string;
}

interface UserData {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: string;
  status: string;
}

export class CacheService {
  private static instance: CacheService;
  private supabase: unknown = null;

  private constructor() {}

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Initialize with Supabase client
  initialize(supabaseClient: unknown) {
    this.supabase = supabaseClient;
  }

  // Ticket operations
  async cacheTickets(tenantId: string, tickets: Ticket[]): Promise<void> {
    const cachedTickets: CachedTicket[] = tickets.map((ticket) => ({
      ...ticket,
      tenant_id: tenantId,
      cached_at: Date.now(),
      version: 1,
    }));

    await cacheDB.tickets.bulkPut(cachedTickets);
    await cacheDB.updateLastSync(tenantId, 'tickets', Date.now());
  }

  async getCachedTickets(tenantId: string): Promise<CachedTicket[]> {
    return cacheDB.getTicketsForTenant(tenantId);
  }

  async addTicketToCache(tenantId: string, ticket: Ticket): Promise<void> {
    const cachedTicket: CachedTicket = {
      ...ticket,
      tenant_id: tenantId,
      cached_at: Date.now(),
      version: 1,
    };

    await cacheDB.tickets.put(cachedTicket);
  }

  async updateTicketInCache(
    tenantId: string,
    ticketId: string,
    updates: Partial<Ticket>
  ): Promise<void> {
    const existingTicket = await cacheDB.tickets
      .where(['tenant_id', 'id'])
      .equals([tenantId, ticketId])
      .first();

    if (existingTicket) {
      const updatedTicket: CachedTicket = {
        ...existingTicket,
        ...updates,
        cached_at: Date.now(),
        version: existingTicket.version + 1,
      };

      await cacheDB.tickets.put(updatedTicket);
    }
  }

  // Response operations
  async cacheResponses(
    tenantId: string,
    ticketId: string,
    responses: ResponseData[]
  ): Promise<void> {
    const cachedResponses: CachedResponse[] = responses.map((response) => ({
      id: response.id,
      tenant_id: tenantId,
      ticket_id: ticketId,
      author_id: response.author_id,
      content: response.content,
      message_type: response.message_type || 'reply',
      is_internal: response.is_internal || false,
      created_at: response.created_at,
      cached_at: Date.now(),
      version: 1,
    }));

    await cacheDB.responses.bulkPut(cachedResponses);
    await cacheDB.updateLastSync(tenantId, 'responses', Date.now());
  }

  async getCachedResponses(
    tenantId: string,
    ticketId: string
  ): Promise<CachedResponse[]> {
    return cacheDB.getResponsesForTicket(tenantId, ticketId);
  }

  // User operations
  async cacheUsers(tenantId: string, users: UserData[]): Promise<void> {
    const cachedUsers: CachedUser[] = users.map((user) => ({
      id: user.id,
      tenant_id: tenantId,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      status: user.status,
      cached_at: Date.now(),
      version: 1,
    }));

    await cacheDB.users.bulkPut(cachedUsers);
    await cacheDB.updateLastSync(tenantId, 'users', Date.now());
  }

  async getCachedUsers(tenantId: string): Promise<CachedUser[]> {
    return cacheDB.getUsersForTenant(tenantId);
  }

  // Delta sync operations
  async performDeltaSync(tenantId: string): Promise<void> {
    if (!this.supabase) {
      console.warn('Supabase client not initialized for cache service');
      return;
    }

    try {
      // Get last sync timestamps
      const ticketsLastSync = await cacheDB.getLastSync(tenantId, 'tickets');
      const usersLastSync = await cacheDB.getLastSync(tenantId, 'users');

      // Sync tickets
      if (ticketsLastSync > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updatedTickets } = await (this.supabase as any)
          .from('tickets')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('updated_at', new Date(ticketsLastSync).toISOString());

        if (updatedTickets && updatedTickets.length > 0) {
          await this.cacheTickets(
            tenantId,
            updatedTickets as unknown as Ticket[]
          );
        }
      }

      // Sync users
      if (usersLastSync > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updatedUsers } = await (this.supabase as any)
          .from('users')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('updated_at', new Date(usersLastSync).toISOString());

        if (updatedUsers && updatedUsers.length > 0) {
          await this.cacheUsers(
            tenantId,
            updatedUsers as unknown as UserData[]
          );
        }
      }
    } catch (error) {
      console.error('Delta sync failed:', error);
    }
  }

  // Cache management
  async clearCache(tenantId: string): Promise<void> {
    await cacheDB.clearTenantCache(tenantId);
  }

  async getCacheStats(tenantId: string): Promise<{
    tickets: number;
    responses: number;
    users: number;
    lastSync: Record<string, number>;
  }> {
    const [tickets, responses, users] = await Promise.all([
      cacheDB.tickets.where('tenant_id').equals(tenantId).count(),
      cacheDB.responses.where('tenant_id').equals(tenantId).count(),
      cacheDB.users.where('tenant_id').equals(tenantId).count(),
    ]);

    const lastSync = {
      tickets: await cacheDB.getLastSync(tenantId, 'tickets'),
      responses: await cacheDB.getLastSync(tenantId, 'responses'),
      users: await cacheDB.getLastSync(tenantId, 'users'),
    };

    return { tickets, responses, users, lastSync };
  }
}

export const cacheService = CacheService.getInstance();

