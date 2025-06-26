import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

    // Parse the request body
    const body = await request.json();
    const { title, description, priority, department, tenant_id } = body;

    // Validate required fields
    if (!title || !description || !priority || !department || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Supabase client with Clerk authentication
    const supabase = createServerSupabaseClient(token);

    // Resolve tenant slug to UUID if needed
    let tenant_uuid: string;

    // Check if the parameter is already a UUID (contains hyphens) or a slug
    if (tenant_id.includes('-') && tenant_id.length === 36) {
      // Already a UUID
      tenant_uuid = tenant_id;
    } else {
      // It's a slug, need to resolve to UUID
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', tenant_id)
        .single();

      if (tenantError || !tenant) {
        console.error('Tenant not found:', tenantError);
        return NextResponse.json(
          { error: `Tenant not found for subdomain: ${tenant_id}` },
          { status: 404 }
        );
      }

      tenant_uuid = tenant.id;
    }

    // Insert the ticket into Supabase
    const { data, error } = await supabase
      .from('tickets')
      .insert({
        title,
        description,
        priority,
        department,
        tenant_id: tenant_uuid,
        created_by: userId,
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎫 Tickets API GET called');

    // Get the authenticated user from Clerk
    const { userId, getToken } = await auth();

    if (!userId) {
      console.error('🚨 Tickets API: No user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', userId);

    // Get the Clerk session token for Supabase
    const token = await getToken();

    if (!token) {
      console.error('🚨 Tickets API: No authentication token available');
      return NextResponse.json(
        { error: 'No authentication token available' },
        { status: 401 }
      );
    }

    console.log('✅ Token obtained successfully');

    // Get tenant_id from query parameters
    const { searchParams } = new URL(request.url);
    const tenant_param = searchParams.get('tenant_id');

    if (!tenant_param) {
      console.error('🚨 Tickets API: No tenant_id provided');
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      );
    }

    console.log('✅ Tenant parameter:', tenant_param);

    // Create Supabase client with Clerk authentication
    console.log('🔧 Creating Supabase client...');
    const supabase = createServerSupabaseClient(token);

    // First, resolve tenant slug to UUID if needed
    let tenant_uuid: string;

    // Check if the parameter is already a UUID (contains hyphens) or a slug
    if (tenant_param.includes('-') && tenant_param.length === 36) {
      // Already a UUID
      tenant_uuid = tenant_param;
      console.log('✅ Using provided UUID:', tenant_uuid);
    } else {
      // It's a slug, need to resolve to UUID
      console.log('🔍 Resolving tenant slug to UUID:', tenant_param);

      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('id')
        .eq('subdomain', tenant_param)
        .single();

      if (tenantError || !tenant) {
        console.error('🚨 Tenant not found:', tenantError);
        return NextResponse.json(
          { error: `Tenant not found for subdomain: ${tenant_param}` },
          { status: 404 }
        );
      }

      tenant_uuid = tenant.id;
      console.log('✅ Resolved tenant UUID:', tenant_uuid);
    }

    // Fetch tickets for the tenant using UUID
    console.log('📊 Fetching tickets for tenant UUID:', tenant_uuid);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('tenant_id', tenant_uuid)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🚨 Supabase error:', error);
      return NextResponse.json(
        { error: `Failed to fetch tickets: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(
      '✅ Tickets fetched successfully:',
      data?.length || 0,
      'tickets'
    );
    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    console.error('❌ Tickets API error:', error);
    return NextResponse.json(
      {
        error: `Internal server error: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
      { status: 500 }
    );
  }
}

