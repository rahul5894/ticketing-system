import Dexie, { Table } from 'dexie';
import { Ticket } from '@/features/ticketing/models/ticket.schema';

// Cache interfaces for tenant-scoped data
export interface CachedTicket extends Ticket {
  tenant_id: string;
  cached_at: number;
  version: number;
}

export interface CachedResponse {
  id: string;
  tenant_id: string;
  ticket_id: string;
  author_id: string;
  content: string;
  message_type: 'reply' | 'note' | 'status_change';
  is_internal: boolean;
  created_at: string;
  cached_at: number;
  version: number;
}

export interface CachedUser {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  cached_at: number;
  version: number;
}

export interface CacheMetadata {
  id: string;
  tenant_id: string;
  table_name: string;
  last_sync: number;
  version: number;
}

// Dexie database class with tenant isolation
export class TicketingCacheDB extends Dexie {
  tickets!: Table<CachedTicket>;
  responses!: Table<CachedResponse>;
  users!: Table<CachedUser>;
  metadata!: Table<CacheMetadata>;

  constructor() {
    super('TicketingCache');

    this.version(1).stores({
      tickets:
        '++id, tenant_id, status, priority, created_by, assigned_to, created_at, cached_at',
      responses: '++id, tenant_id, ticket_id, author_id, created_at, cached_at',
      users: '++id, tenant_id, email, role, status, cached_at',
      metadata: '++id, tenant_id, table_name, last_sync',
    });
  }

  // Tenant-scoped operations
  async getTicketsForTenant(tenantId: string): Promise<CachedTicket[]> {
    return this.tickets
      .where('tenant_id')
      .equals(tenantId)
      .reverse()
      .sortBy('created_at');
  }

  async getResponsesForTicket(
    tenantId: string,
    ticketId: string
  ): Promise<CachedResponse[]> {
    return this.responses
      .where(['tenant_id', 'ticket_id'])
      .equals([tenantId, ticketId])
      .sortBy('created_at');
  }

  async getUsersForTenant(tenantId: string): Promise<CachedUser[]> {
    return this.users.where('tenant_id').equals(tenantId).toArray();
  }

  // Cache management
  async clearTenantCache(tenantId: string): Promise<void> {
    await Promise.all([
      this.tickets.where('tenant_id').equals(tenantId).delete(),
      this.responses.where('tenant_id').equals(tenantId).delete(),
      this.users.where('tenant_id').equals(tenantId).delete(),
      this.metadata.where('tenant_id').equals(tenantId).delete(),
    ]);
  }

  async getLastSync(tenantId: string, tableName: string): Promise<number> {
    const metadata = await this.metadata
      .where(['tenant_id', 'table_name'])
      .equals([tenantId, tableName])
      .first();

    return metadata?.last_sync || 0;
  }

  async updateLastSync(
    tenantId: string,
    tableName: string,
    timestamp: number
  ): Promise<void> {
    await this.metadata.put({
      id: `${tenantId}-${tableName}`,
      tenant_id: tenantId,
      table_name: tableName,
      last_sync: timestamp,
      version: 1,
    });
  }
}

// Singleton instance
export const cacheDB = new TicketingCacheDB();

