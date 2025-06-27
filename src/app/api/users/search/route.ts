import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const role = searchParams.get('role'); // Optional role filter
    const limit = parseInt(searchParams.get('limit') || '10');

    // Validate limit
    if (limit > 50) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 50' },
        { status: 400 }
      );
    }

    // Create Supabase client with authentication
    const supabase = createServerSupabaseClient(token);

    // Get current user's tenant_id for isolation
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('clerk_id', userId)
      .single();

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build the query with tenant isolation
    let usersQuery = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, status')
      .eq('tenant_id', currentUser.tenant_id)
      .eq('status', 'active') // Only active users
      .limit(limit);

    // Add search filter if query provided
    if (query.trim()) {
      // Check if query looks like a UUID (for exact ID matches)
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          query
        );

      if (isUUID) {
        // Exact ID match for UUIDs
        usersQuery = usersQuery.eq('id', query);
      } else {
        // Search in email, first_name, and last_name for non-UUID queries
        usersQuery = usersQuery.or(
          `email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`
        );
      }
    }

    // Add role filter if specified
    if (role) {
      // Validate role
      const validRoles = ['user', 'agent', 'admin', 'super_admin'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role filter' },
          { status: 400 }
        );
      }
      usersQuery = usersQuery.eq('role', role);
    }

    // Execute query with ordering
    const { data: users, error } = await usersQuery.order('email', {
      ascending: true,
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      );
    }

    // Format response
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name:
        [user.first_name, user.last_name].filter(Boolean).join(' ') ||
        user.email,
      role: user.role,
      status: user.status,
    }));

    return NextResponse.json({
      users: formattedUsers,
      total: formattedUsers.length,
      query,
      role: role || null,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

