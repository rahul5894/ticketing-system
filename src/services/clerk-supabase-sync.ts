import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from '@/lib/supabase-server';
import type { Database } from '@/types/supabase';

type User = Database['public']['Tables']['users']['Insert'];

export interface ClerkOrganization {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  createdAt: number;
  membersCount?: number | undefined;
}

export interface ClerkUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  primaryEmailAddress?: {
    emailAddress: string;
  } | null;
  imageUrl?: string;
  createdAt?: number;
  publicMetadata?: {
    role?: string;
  };
}

export interface SyncResult {
  success: boolean;
  tenant?: Database['public']['Tables']['tenants']['Row'];
  user?: Database['public']['Tables']['users']['Row'];
  error?: string;
}

export class ClerkSupabaseSync {
  private supabase;

  constructor(authToken: string) {
    this.supabase = createServerSupabaseClient(authToken);
  }

  /**
   * Sync Clerk organization to Supabase tenant
   */
  async syncTenant(
    organization: ClerkOrganization
  ): Promise<Database['public']['Tables']['tenants']['Row']> {
    try {
      // Check if tenant already exists (use service client to bypass RLS)
      const serviceClientCheck = createServiceSupabaseClient();
      const { data: existingTenant } = await serviceClientCheck
        .from('tenants')
        .select('*')
        .eq('subdomain', organization.slug)
        .single();

      if (existingTenant) {
        return existingTenant;
      }

      // Create new tenant (let database generate UUID for id)
      const tenantData = {
        name: organization.name,
        subdomain: organization.slug,
        status: 'active' as const,
        settings: {
          features: ['tickets', 'analytics'],
          branding: {
            logo: organization.imageUrl || null,
          },
        },
        created_at: new Date(organization.createdAt).toISOString(),
      };

      // Use service role client for tenant creation (bypasses RLS)
      const serviceClient = createServiceSupabaseClient();
      const { data: newTenant, error } = await serviceClient
        .from('tenants')
        .insert(tenantData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create tenant: ${error.message}`);
      }

      return newTenant;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sync Clerk user to Supabase user
   */
  async syncUser(
    user: ClerkUser,
    tenant: Database['public']['Tables']['tenants']['Row']
  ): Promise<Database['public']['Tables']['users']['Row']> {
    try {
      // Check if user already exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .single();

      // Map Clerk organization roles to Supabase roles
      const clerkRole = user.publicMetadata?.role as string;

      // Comprehensive Clerk role mapping to Supabase roles based on Clerk organization role keys
      const roleMapping: Record<string, string> = {
        // Clerk organization role keys (from Clerk dashboard)
        'org:super_admin': 'super_admin', // Super Admin role key
        'org:admin': 'admin', // Admin role key
        'org:agent': 'agent', // Agent role key
        'org:member': 'user', // User/Member role key

        // Display name mappings (fallback)
        'Super Admin': 'super_admin',
        Admin: 'admin',
        Agent: 'agent',
        User: 'user',
        Member: 'user',

        // Lowercase variants (fallback)
        super_admin: 'super_admin',
        admin: 'admin',
        agent: 'agent',
        member: 'user',
        user: 'user',
      };

      const mappedRole = roleMapping[clerkRole] || 'user';
      const validRoles = ['user', 'agent', 'admin', 'super_admin'];
      const userRole = validRoles.includes(mappedRole) ? mappedRole : 'user';

      const userData: User = {
        clerk_id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        first_name: user.firstName || null,
        last_name: user.lastName || null,
        role: userRole,
        status: 'active',
        tenant_id: tenant.id,
        last_login_at: new Date().toISOString(),
      };

      if (existingUser) {
        // Update existing user
        const { data: updatedUser, error } = await this.supabase
          .from('users')
          .update({
            ...userData,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_id', user.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update user: ${error.message}`);
        }

        return updatedUser;
      } else {
        // Create new user
        userData.created_at = new Date(
          user.createdAt || Date.now()
        ).toISOString();

        // Use service role client for user creation (bypasses RLS)
        const serviceClient = createServiceSupabaseClient();
        const { data: newUser, error } = await serviceClient
          .from('users')
          .insert(userData)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create user: ${error.message}`);
        }

        return newUser;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retry wrapper for async operations
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }

    throw lastError!;
  }

  /**
   * Ensure both tenant and user are synced with retry logic
   */
  async ensureSync(
    user: ClerkUser,
    organization: ClerkOrganization
  ): Promise<SyncResult> {
    try {
      // Sync tenant first with retry
      const tenant = await this.retryOperation(
        () => this.syncTenant(organization),
        3,
        1000
      );

      // Then sync user with retry
      const syncedUser = await this.retryOperation(
        () => this.syncUser(user, tenant),
        3,
        1000
      );

      return {
        success: true,
        tenant,
        user: syncedUser,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      };
    }
  }

  /**
   * Check if sync is needed (user/tenant doesn't exist in Supabase)
   */
  async checkSyncStatus(
    userId: string,
    tenantId: string
  ): Promise<{
    needsSync: boolean;
    tenantExists: boolean;
    userExists: boolean;
  }> {
    try {
      // Use service client to check tenant existence (bypasses RLS)
      const serviceClient = createServiceSupabaseClient();

      const [tenantResult, userResult] = await Promise.all([
        serviceClient
          .from('tenants')
          .select('id')
          .eq('subdomain', tenantId)
          .single(),
        this.supabase
          .from('users')
          .select('id')
          .eq('clerk_id', userId)
          .single(),
      ]);

      const tenantExists = !tenantResult.error;
      const userExists = !userResult.error;
      const needsSync = !tenantExists || !userExists;

      return {
        needsSync,
        tenantExists,
        userExists,
      };
    } catch {
      return {
        needsSync: true,
        tenantExists: false,
        userExists: false,
      };
    }
  }
}
