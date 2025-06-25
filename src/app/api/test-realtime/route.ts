import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create service role client for admin operations
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const {
      title,
      description,
      priority,
      department,
      userId,
      userEmail,
      userName,
    } = await request.json();

    // Get tenant data
    const { data: tenant, error: tenantError } = await serviceSupabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'quantumnest')
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found');
    }

    // Get the actual user record from the database using Clerk ID
    const { data: user, error: userError } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('clerk_id', userId)
      .eq('tenant_id', tenant.id)
      .single();

    if (userError || !user) {
      throw new Error('User not found in database');
    }

    // Create a test ticket
    const { data: ticket, error: ticketError } = await serviceSupabase
      .from('tickets')
      .insert({
        title: title || 'Test Ticket from API',
        description:
          description ||
          'This is a test ticket created via API to test real-time functionality.',
        status: 'open',
        priority: priority || 'medium',
        department: department || 'technical',
        created_by: user.id, // Use the actual user UUID from the users table
        tenant_id: tenant.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (ticketError) {
      throw new Error(`Failed to create ticket: ${ticketError.message}`);
    }

    return NextResponse.json({
      success: true,
      ticket,
      message: 'Ticket created successfully',
    });
  } catch (error) {
    console.error('Failed to create test ticket:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

