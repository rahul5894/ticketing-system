import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { title, description, priority, department, tenant_id, assigned_to } =
    await request.json();

  if (!title || !description || !priority || !department || !tenant_id) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  // Resolve tenant if needed
  const tenant_uuid =
    tenant_id.includes('-') && tenant_id.length === 36
      ? tenant_id
      : (
          await supabase
            .from('tenants')
            .select('id')
            .eq('subdomain', tenant_id)
            .single()
        ).data?.id;

  if (!tenant_uuid) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

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
      ...(assigned_to?.[0] && { assigned_to: assigned_to[0] }),
    })
    .select()
    .single();

  if (error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tenant_param = searchParams.get('tenant_id');

  if (!tenant_param) {
    return NextResponse.json(
      { error: 'tenant_id is required' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient();

  // Resolve tenant if needed
  const tenant_uuid =
    tenant_param.includes('-') && tenant_param.length === 36
      ? tenant_param
      : (
          await supabase
            .from('tenants')
            .select('id')
            .eq('subdomain', tenant_param)
            .single()
        ).data?.id;

  if (!tenant_uuid) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('tenant_id', tenant_uuid)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

