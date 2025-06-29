import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { ClerkSupabaseSync } from '@/services/clerk-supabase-sync';

export async function POST(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = await getToken();
  if (!token)
    return NextResponse.json(
      { error: 'No authentication token available' },
      { status: 401 }
    );

  const { tenantId } = await request.json();
  if (!tenantId)
    return NextResponse.json(
      { error: 'tenantId is required' },
      { status: 400 }
    );

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  if (!clerkUser)
    return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const organizationMemberships =
    await clerk.users.getOrganizationMembershipList({ userId: clerkUser.id });
  if (organizationMemberships.data.length === 0) {
    return NextResponse.json(
      { error: 'User is not a member of any organization' },
      { status: 400 }
    );
  }

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

  const syncService = new ClerkSupabaseSync(token);
  const syncStatus = await syncService.checkSyncStatus(
    clerkUser.id,
    organization.slug
  );

  const syncResult = syncStatus.needsSync
    ? await syncService.ensureSync(
        {
          id: clerkUser.id,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          fullName: clerkUser.fullName,
          primaryEmailAddress: clerkUser.primaryEmailAddress,
          imageUrl: clerkUser.imageUrl,
          createdAt: clerkUser.createdAt,
          publicMetadata: {
            ...clerkUser.publicMetadata,
            role: membership.role,
          },
        },
        {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          imageUrl: organization.imageUrl,
          createdAt: organization.createdAt,
          membersCount: organization.membersCount,
        }
      )
    : {
        success: true,
        message: 'Data already synchronized',
        tenant: { id: organization.slug },
        user: { id: clerkUser.id },
      };

  if (!syncResult.success) {
    return NextResponse.json(
      { error: 'error' in syncResult ? syncResult.error : 'Sync failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
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
  });
}

export async function GET(request: NextRequest) {
  const { userId, getToken } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const token = await getToken();
  if (!token)
    return NextResponse.json(
      { error: 'No authentication token available' },
      { status: 401 }
    );

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');
  if (!tenantId)
    return NextResponse.json(
      { error: 'tenant_id is required' },
      { status: 400 }
    );

  const syncService = new ClerkSupabaseSync(token);
  const syncStatus = await syncService.checkSyncStatus(userId, tenantId);

  return NextResponse.json({ success: true, syncStatus });
}
