import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant ID from subdomain
    const url = new URL(request.url);
    const hostname = url.hostname;
    console.log('Hostname:', hostname);

    let tenantSlug: string;

    if (hostname.includes('localhost')) {
      // For localhost development, extract subdomain
      const parts = hostname.split('.');
      console.log('Hostname parts:', parts);
      if (
        parts.length >= 2 &&
        parts[0] &&
        parts[0] !== 'localhost' &&
        parts[0] !== '127'
      ) {
        tenantSlug = parts[0];
      } else {
        return NextResponse.json(
          {
            error: `No tenant specified in subdomain. Hostname: ${hostname}, Parts: ${parts.join(
              ','
            )}`,
          },
          { status: 400 }
        );
      }
    } else {
      // For production, extract subdomain
      const parts = hostname.split('.');
      if (parts.length > 2 && parts[0]) {
        tenantSlug = parts[0];
      } else {
        return NextResponse.json(
          { error: 'No tenant specified' },
          { status: 400 }
        );
      }
    }

    console.log('Tenant slug:', tenantSlug);

    // Create Supabase client
    const supabase = createServerSupabaseClient();

    // Get user data from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get tenant data
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', user.tenant_id)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        clerk_id: user.clerk_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        status: user.status,
        tenant_id: user.tenant_id,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      },
      tenant: tenant
        ? {
            id: tenant.id,
            name: tenant.name,
            subdomain: tenant.subdomain,
            status: tenant.status,
          }
        : null,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

