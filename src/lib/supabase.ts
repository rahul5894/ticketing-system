import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Define types for ticket operations
interface TicketData {
  id?: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  department: string;
  userId: string;
  userName: string;
  userEmail: string;
  tenant_id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TicketUpdate {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  department?: string;
  updatedAt?: Date;
}

// Legacy Supabase client for basic operations
// For real-time functionality, use useSupabaseClient hook from @/lib/supabase-client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Tenant-aware Supabase client wrapper
 * Automatically filters queries by tenant_id to ensure data isolation
 * Note: For real-time subscriptions, use useSupabaseClient hook instead
 */
export class TenantSupabaseClient {
  private client: SupabaseClient;
  private tenantId: string;

  constructor(tenantId: string, client: SupabaseClient = supabase) {
    this.client = client;
    this.tenantId = tenantId;
  }

  /**
   * Get tickets for the current tenant
   */
  async getTickets() {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new ticket for the current tenant
   */
  async createTicket(ticket: TicketData) {
    const ticketWithTenant = {
      ...ticket,
      tenant_id: this.tenantId,
    };

    const { data, error } = await this.client
      .from('tickets')
      .insert(ticketWithTenant)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create ticket: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a ticket (only if it belongs to the current tenant)
   */
  async updateTicket(ticketId: string, updates: TicketUpdate) {
    const { data, error } = await this.client
      .from('tickets')
      .update(updates)
      .eq('id', ticketId)
      .eq('tenant_id', this.tenantId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ticket: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a ticket (only if it belongs to the current tenant)
   */
  async deleteTicket(ticketId: string) {
    const { error } = await this.client
      .from('tickets')
      .delete()
      .eq('id', ticketId)
      .eq('tenant_id', this.tenantId);

    if (error) {
      throw new Error(`Failed to delete ticket: ${error.message}`);
    }
  }

  /**
   * Get a specific ticket (only if it belongs to the current tenant)
   */
  async getTicket(ticketId: string) {
    const { data, error } = await this.client
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('tenant_id', this.tenantId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch ticket: ${error.message}`);
    }

    return data;
  }

  /**
   * Get the underlying Supabase client for advanced operations
   * Note: Use with caution - ensure tenant filtering is applied manually
   */
  getClient() {
    return this.client;
  }

  /**
   * Get the current tenant ID
   */
  getTenantId() {
    return this.tenantId;
  }
}

/**
 * Create a tenant-aware Supabase client
 */
export function createTenantClient(tenantId: string): TenantSupabaseClient {
  return new TenantSupabaseClient(tenantId);
}
