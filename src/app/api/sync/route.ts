import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ClerkSupabaseSync } from '@/services/clerk-supabase-sync';

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user from Clerk
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the Clerk session token for Supabase
    const token = await getToken();

    if (!token) {
      return NextResponse.json(
        { error: 'No authentication token available' },
        { status: 401 }
      );
    }

    // Get tenantId from request body
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'tenantId is required' },
        { status: 400 }
      );
    }

    // Get user and organization data from Clerk
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);

    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's organization memberships
    const organizationMemberships =
      await clerk.users.getOrganizationMembershipList({
        userId: clerkUser.id,
      });

    if (organizationMemberships.data.length === 0) {
      return NextResponse.json(
        { error: 'User is not a member of any organization' },
        { status: 400 }
      );
    }

    // Find the organization that matches the tenantId (slug)
    const membership = organizationMemberships.data.find(
      (m) => m.organization.slug === tenantId
    );
    if (!membership) {
      return NextResponse.json(
        { error: `User is not a member of organization: ${tenantId}` },
        { status: 403 }
      );
    }

    const organization = await clerk.organizations.getOrganization({
      organizationId: membership.organization.id,
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Create sync service instance
    const syncService = new ClerkSupabaseSync(token);

    // Check if sync is needed
    const syncStatus = await syncService.checkSyncStatus(
      clerkUser.id,
      organization.slug
    );

    console.log('Sync status:', syncStatus);

    // Perform sync if needed
    let syncResult;
    if (syncStatus.needsSync) {
      console.log('Sync needed, performing sync...');

      // Prepare organization data
      const orgData = {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        imageUrl: organization.imageUrl,
        createdAt: organization.createdAt,
        membersCount: organization.membersCount,
      };

      // Prepare user data with role from membership
      const userData = {
        id: clerkUser.id,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        fullName: clerkUser.fullName,
        primaryEmailAddress: clerkUser.primaryEmailAddress,
        imageUrl: clerkUser.imageUrl,
        createdAt: clerkUser.createdAt,
        publicMetadata: {
          ...clerkUser.publicMetadata,
          role: membership.role, // Use role from organization membership
        },
      };

      syncResult = await syncService.ensureSync(userData, orgData);
    } else {
      console.log('Sync not needed, data already exists');
      syncResult = {
        success: true,
        message: 'Data already synchronized',
        tenant: { id: organization.slug },
        user: { id: clerkUser.id },
      };
    }

    if (!syncResult.success) {
      return NextResponse.json({ error: syncResult.error }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Synchronization completed successfully',
        data: {
          tenant: syncResult.tenant,
          user: syncResult.user,
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
          },
          syncStatus,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/sync called');

    // Get the authenticated user from Clerk
    const { userId, getToken } = await auth();

    console.log('Auth result:', { userId: userId ? 'present' : 'missing' });

    if (!userId) {
      console.log('No userId found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the Clerk session token for Supabase
    const token = await getToken();

    if (!token) {
      console.log('No token found, returning 401');
      return NextResponse.json(
        { error: 'No authentication token available' },
        { status: 401 }
      );
    }

    // Get tenant_id from query parameters
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenant_id');

    console.log('Tenant ID from query:', tenantId);

    if (!tenantId) {
      console.log('No tenant_id provided, returning 400');
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      );
    }

    // Create sync service instance
    console.log('Creating sync service instance...');
    const syncService = new ClerkSupabaseSync(token);

    // Check sync status
    console.log('Checking sync status...');
    const syncStatus = await syncService.checkSyncStatus(userId, tenantId);
    console.log('Sync status result:', syncStatus);

    return NextResponse.json(
      {
        success: true,
        syncStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Sync status API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

