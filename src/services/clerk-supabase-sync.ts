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
    console.log(
      'Initializing ClerkSupabaseSync with token:',
      authToken ? 'present' : 'missing'
    );
    this.supabase = createServerSupabaseClient(authToken);
    console.log('Supabase client initialized');
  }

  /**
   * Sync Clerk organization to Supabase tenant
   */
  async syncTenant(
    organization: ClerkOrganization
  ): Promise<Database['public']['Tables']['tenants']['Row']> {
    try {
      console.log('Syncing tenant:', organization.slug);

      // Check if tenant already exists (use service client to bypass RLS)
      const serviceClientCheck = createServiceSupabaseClient();
      const { data: existingTenant } = await serviceClientCheck
        .from('tenants')
        .select('*')
        .eq('subdomain', organization.slug)
        .single();

      if (existingTenant) {
        console.log('Tenant already exists:', existingTenant);
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

      console.log('Tenant created successfully:', newTenant);
      return newTenant;
    } catch (error) {
      console.error('Error syncing tenant:', error);
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
      console.log('Syncing user:', user.id, 'to tenant:', tenant.id);

      // Check if user already exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('clerk_id', user.id)
        .single();

      // Map Clerk organization roles to Supabase roles
      const clerkRole = user.publicMetadata?.role as string;
      console.log('Raw Clerk role from metadata:', clerkRole);

      // Clerk role mapping to Supabase roles
      const roleMapping: Record<string, string> = {
        'org:admin': 'super_admin',
        admin: 'admin',
        agent: 'agent',
        member: 'user',
        user: 'user',
      };

      const mappedRole = roleMapping[clerkRole] || 'user';
      const validRoles = ['user', 'agent', 'admin', 'super_admin'];
      const userRole = validRoles.includes(mappedRole) ? mappedRole : 'user';

      console.log('Clerk role:', clerkRole);
      console.log('Mapped role:', mappedRole);
      console.log('Final validated role:', userRole);

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

        console.log('User updated successfully:', updatedUser);
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

        console.log('User created successfully:', newUser);
        return newUser;
      }
    } catch (error) {
      console.error('Error syncing user:', error);
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
        console.log(`Attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Attempt ${attempt} failed:`, lastError.message);

        if (attempt < maxRetries) {
          console.log(`Retrying in ${delay}ms...`);
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
      console.log(
        'Starting sync for user:',
        user.id,
        'organization:',
        organization.slug
      );

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

      console.log('Sync completed successfully');
      return {
        success: true,
        tenant,
        user: syncedUser,
      };
    } catch (error) {
      console.error('Sync failed after all retries:', error);
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
      console.log('Checking sync status in service for:', { userId, tenantId });

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

      console.log('Tenant check result:', tenantResult);
      console.log('User check result:', userResult);

      const tenantExists = !tenantResult.error;
      const userExists = !userResult.error;
      const needsSync = !tenantExists || !userExists;

      const result = {
        needsSync,
        tenantExists,
        userExists,
      };

      console.log('Sync status result:', result);
      return result;
    } catch (error) {
      console.error('Error checking sync status:', error);
      return {
        needsSync: true,
        tenantExists: false,
        userExists: false,
      };
    }
  }
}

