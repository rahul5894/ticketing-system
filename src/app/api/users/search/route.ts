import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const roles = searchParams.getAll('role');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

  // Use service client for user lookup to bypass RLS
  const serviceClient = createServiceSupabaseClient();
  const { data: currentUserData, error: userError } = await serviceClient
    .from('users')
    .select('tenant_id')
    .eq('clerk_id', userId);

  if (userError || !currentUserData || currentUserData.length === 0) {
    return NextResponse.json(
      { error: 'User not found in database' },
      { status: 404 }
    );
  }

  const currentUser = currentUserData[0];
  if (!currentUser) {
    return NextResponse.json(
      { error: 'User not found in database' },
      { status: 404 }
    );
  }

  // Use service client for user search to bypass RLS
  let usersQuery = serviceClient
    .from('users')
    .select('id, email, first_name, last_name, role, status')
    .eq('tenant_id', currentUser.tenant_id)
    .eq('status', 'active')
    .limit(limit);

  if (query.trim()) {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        query
      );
    usersQuery = isUUID
      ? usersQuery.eq('id', query)
      : usersQuery.or(
          `email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`
        );
  }

  if (roles.length > 0) {
    const validRoles = ['user', 'agent', 'admin', 'super_admin'];
    const invalidRoles = roles.filter((role) => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      return NextResponse.json(
        { error: `Invalid roles: ${invalidRoles.join(', ')}` },
        { status: 400 }
      );
    }
    usersQuery =
      roles.length === 1
        ? usersQuery.eq('role', roles[0]!)
        : usersQuery.in('role', roles);
  }

  const { data: users, error } = await usersQuery.order('email');

  if (error)
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      name:
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.email,
      role: user.role,
      status: user.status,
    })),
    total: users.length,
    query,
    roles: roles.length > 0 ? roles : null,
  });
}
